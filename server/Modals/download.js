import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    downloadDate: {
      type: Date,
      default: Date.now,
    },
    userPlan: {
      type: String,
      required: true,
    },
    videoDetails: {
      videotitle: { type: String, required: true },
      filepath: { type: String, required: true },
      videochanel: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("download", downloadSchema);
