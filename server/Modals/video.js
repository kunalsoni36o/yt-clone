import mongoose from "mongoose";
const videochema = mongoose.Schema(
  {
    videotitle:  { type: String, required: true },
    filename:    { type: String, required: true },  // BUG-001: removed duplicate
    filetype:    { type: String, required: true },
    filepath:    { type: String, required: true },
    filesize:    { type: Number, required: true },  // BUG-009: Number not String
    videochanel: { type: String, required: true },
    description: { type: String, default: "" },     // BUG-030: add description field
    Like:        { type: Number, default: 0 },
    views:       { type: Number, default: 0 },
    uploader:    { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("videofiles", videochema);
