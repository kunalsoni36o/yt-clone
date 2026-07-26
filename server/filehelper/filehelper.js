"use strict";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "yourtube/videos",
    resource_type: "video",
    public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
    format: "mp4",
  }),
});

const filefilter = (req, file, cb) => {
  const allowedExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) && file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files (" + allowedExtensions.join(", ") + ") are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter: filefilter });
export default upload;
export { cloudinary };
