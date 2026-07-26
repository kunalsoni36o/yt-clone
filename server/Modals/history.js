import mongoose from "mongoose";
const historyschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    watchedOn: { type: Date, default: Date.now }, // BUG-007: renamed from likedon
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("history", historyschema);
