import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import User from "../Modals/Auth.js";
import Payment from "../Modals/Payment.js";
import {
  PLANS,
  PAID_PLANS,
  ALLOWED_PLANS,
  getPlanConfig,
  serializePlanConfig,
} from "../config/plans.js";
import { sendSubscriptionConfirmation } from "../services/email.js";

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const generateInvoiceNumber = () =>
  `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const addOneMonth = (fromDate = new Date()) => {
  const expires = new Date(fromDate);
  expires.setMonth(expires.getMonth() + 1);
  return expires;
};

export const getPlans = async (_req, res) => {
  const plans = ALLOWED_PLANS.map((key) => ({
    id: key,
    name: PLANS[key].name,
    priceInPaise: PLANS[key].priceInPaise,
    ...serializePlanConfig(PLANS[key]),
    priceDisplay:
      PLANS[key].priceInPaise === 0
        ? "Free"
        : `₹${(PLANS[key].priceInPaise / 100).toFixed(0)} / month`,
  }));
  return res.status(200).json(plans);
};

export const createOrder = async (req, res) => {
  const { userId, plan } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const planKey = plan?.toLowerCase();
  if (!PAID_PLANS.includes(planKey)) {
    return res.status(400).json({ message: "Invalid paid plan selected" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const planConfig = getPlanConfig(planKey);
    const razorpay = getRazorpay();
    const invoiceNumber = generateInvoiceNumber();

    const order = await razorpay.orders.create({
      amount: planConfig.priceInPaise,
      currency: "INR",
      receipt: invoiceNumber,
      notes: {
        userId: userId.toString(),
        plan: planKey,
        email: user.email,
      },
    });

    await Payment.create({
      userId,
      plan: planKey,
      amount: planConfig.priceInPaise,
      currency: "INR",
      razorpayOrderId: order.id,
      invoiceNumber,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: planKey,
      planName: planConfig.name,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create payment order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return res.status(400).json({ message: "Missing payment verification fields" });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status === "paid") {
      const user = await User.findById(userId);
      return res.status(200).json({
        message: "Payment already verified",
        user,
        payment,
      });
    }

    if (payment.userId.toString() !== userId) {
      return res.status(403).json({ message: "Payment does not belong to this user" });
    }

    const planExpiresAt = addOneMonth();
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          plan: payment.plan,
          planExpiresAt,
        },
      },
      { new: true }
    );

    const updatedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      },
      { new: true }
    );

    const planConfig = getPlanConfig(payment.plan);

    try {
      const emailResult = await sendSubscriptionConfirmation({
        to: updatedUser.email,
        userName: updatedUser.name,
        planName: planConfig.name,
        amount: payment.amount,
        currency: payment.currency,
        invoiceNumber: payment.invoiceNumber,
        paymentId: razorpay_payment_id,
        validUntil: planExpiresAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
      updatedPayment.emailSent = Boolean(emailResult.sent);
      updatedPayment.emailLogged = Boolean(emailResult.logged);
      await updatedPayment.save();
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
    }

    return res.status(200).json({
      message: "Payment verified and plan upgraded",
      user: updatedUser,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

export const getSubscriptionHistory = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payments = await Payment.find({ userId, status: "paid" }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      currentPlan: user.plan,
      planExpiresAt: user.planExpiresAt,
      payments,
    });
  } catch (error) {
    console.error("Subscription history error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const checkPremiumAccess = async (req, res) => {
  const { userId } = req.params;
  const { videoId } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let plan = user.plan || "free";
    if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date() && plan !== "free") {
      await User.findByIdAndUpdate(userId, { $set: { plan: "free", planExpiresAt: null } });
      plan = "free";
    }

    const planConfig = getPlanConfig(plan);

    let isPremiumVideo = false;
    if (videoId && mongoose.Types.ObjectId.isValid(videoId)) {
      const Video = (await import("../Modals/video.js")).default;
      const video = await Video.findById(videoId);
      isPremiumVideo = video?.isPremium || false;
    }

    const hasPremiumAccess = !isPremiumVideo || planConfig.premiumAccess;

    return res.status(200).json({
      plan,
      planConfig: serializePlanConfig(planConfig),
      isPremiumVideo,
      hasPremiumAccess,
      planExpiresAt: user.planExpiresAt,
    });
  } catch (error) {
    console.error("Premium access check error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
