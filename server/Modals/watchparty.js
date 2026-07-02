import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
    userName: { type: String, required: true, maxlength: 80 },
    userId: { type: String, default: "anonymous" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const watchPartySchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    videoId: { type: String, default: "" },
    hostUserId: { type: String, default: "anonymous" },
    videoState: {
      playing: { type: Boolean, default: false },
      currentTime: { type: Number, default: 0, min: 0 },
    },
    chatMessages: { type: [chatMessageSchema], default: [] },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("watchparties", watchPartySchema);
