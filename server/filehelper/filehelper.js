"use strict";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});
import path from "path";

const filefilter = (req, file, cb) => {
  const allowedExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov"];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext) && file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files (" + allowedExtensions.join(", ") + ") are allowed!"), false);
  }
};
const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;
