import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { sendOtpEmail } from "../services/email.js";

const getCalculatedTheme = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // Indian Standard Time is UTC + 5:30
  const ist = new Date(utc + (3600000 * 5.5));
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  // Between 10:00 AM and 12:00 PM IST (inclusive of 10:00:00 to 12:00:00)
  const isBetween10And12 = (hours === 10 || hours === 11) || (hours === 12 && minutes === 0);
  return isBetween10And12 ? "light" : "dark";
};

export const login = async (req, res) => {
  const { email, name, image, device, city, state } = req.body;

  try {
    let user = await users.findOne({ email });
    const calculatedTheme = getCalculatedTheme();

    if (!user) {
      // Brand new user
      const initialLogin = {
        device: device || "Unknown Device",
        city: city || "Unknown City",
        state: state || "Unknown State",
        date: new Date()
      };
      user = await users.create({
        email,
        name,
        image,
        theme: calculatedTheme,
        lastLogins: [initialLogin]
      });
      return res.status(201).json({ result: user });
    }

    // Check if new device, city, or state
    const currentDevice = device || "Unknown Device";
    const currentCity = city || "Unknown City";
    const currentState = state || "Unknown State";

    const hasLogins = user.lastLogins && user.lastLogins.length > 0;
    const isNewDevice = hasLogins && !user.lastLogins.some(l => l.device === currentDevice);
    const isNewCity = hasLogins && !user.lastLogins.some(l => l.city === currentCity);
    const isNewState = hasLogins && !user.lastLogins.some(l => l.state === currentState);

    const isNewParam = hasLogins && (isNewDevice || isNewCity || isNewState);

    if (isNewParam) {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.tempOtp = otpCode;
      user.tempOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await user.save();

      // Try to send email but never block — OTP is always returned in response
      try {
        await sendOtpEmail({ to: email, userName: user.name, otpCode });
      } catch (_) {
        // Email failed silently — user sees the code on screen
      }

      return res.status(200).json({
        otpRequired: true,
        email: email,
        otpCode,
        message: "Security verification required.",
      });
    }

    // Normal login (or first login on this security tracking version)
    user.theme = calculatedTheme;
    
    // Add current login if it doesn't already exist as a complete match
    const alreadyApproved = user.lastLogins.some(
      l => l.device === currentDevice && l.city === currentCity && l.state === currentState
    );
    if (!alreadyApproved) {
      user.lastLogins.push({
        device: currentDevice,
        city: currentCity,
        state: currentState,
        date: new Date()
      });
    }

    await user.save();
    return res.status(200).json({ result: user });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.tempOtp = otpCode;
    user.tempOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Try email silently — OTP always returned in response
    try {
      await sendOtpEmail({ to: email, userName: user.name, otpCode });
    } catch (_) {}

    return res.status(200).json({
      message: "A new verification code has been generated.",
      otpCode,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otpCode, device, city, state } = req.body;

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.tempOtp || !user.tempOtpExpiresAt) {
      return res.status(400).json({ message: "No active verification request" });
    }

    if (user.tempOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    if (user.tempOtp !== otpCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // OTP Verified! Clear temp variables and save new parameters
    user.tempOtp = null;
    user.tempOtpExpiresAt = null;

    const currentDevice = device || "Unknown Device";
    const currentCity = city || "Unknown City";
    const currentState = state || "Unknown State";

    user.lastLogins.push({
      device: currentDevice,
      city: currentCity,
      state: currentState,
      date: new Date()
    });

    // Auto-apply current timezone theme upon verification success
    user.theme = getCalculatedTheme();

    await user.save();
    return res.status(200).json({ result: user });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateplan = async (req, res) => {
  const { id: _id } = req.params;
  const { plan } = req.body;
  const ALLOWED_PLANS = ["free", "bronze", "silver", "gold"];
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID..." });
  }
  if (!plan || !ALLOWED_PLANS.includes(plan.toLowerCase())) {
    return res.status(400).json({ message: `Invalid plan. Must be one of: ${ALLOWED_PLANS.join(", ")}` });
  }
  if (plan.toLowerCase() !== "free") {
    return res.status(403).json({
      message: "Paid plans require payment. Use the subscription checkout flow.",
    });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          plan: "free",
          planExpiresAt: null,
        },
      },
      { new: true }
    );
    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateTheme = async (req, res) => {
  const { id: _id } = req.params;
  const { theme } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (theme !== "light" && theme !== "dark") {
    return res.status(400).json({ message: "Theme must be light or dark" });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      _id,
      { $set: { theme } },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update theme error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
