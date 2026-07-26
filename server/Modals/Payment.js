import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    invoiceNumber: { type: String, required: true, unique: true },
    emailSent: { type: Boolean, default: false },
    emailLogged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("payment", paymentSchema);
