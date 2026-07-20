import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, default: "free" },
  planExpiresAt: { type: Date, default: null },
  theme: { type: String, default: "dark" },
  lastLogins: {
    type: [{
      device: String,
      city: String,
      state: String,
      date: { type: Date, default: Date.now }
    }],
    default: []
  },
  tempOtp: { type: String, default: null },
  tempOtpExpiresAt: { type: Date, default: null },
});

export default mongoose.model("user", userschema);
