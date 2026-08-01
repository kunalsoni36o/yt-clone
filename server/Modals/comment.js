import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String, required: true },
    usercommented: { type: String, required: true },
    commentedon: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],
    reports: [
      {
        userid: { type: String },
        reason: { type: String },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    isFlagged: { type: Boolean, default: false },
    location: { type: String, default: null },
    showLocation: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
