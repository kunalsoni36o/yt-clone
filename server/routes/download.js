import express from "express";
import {
  requestDownload,
  getUserDownloads,
  getDownloadSummary,
  deleteDownload,
} from "../controllers/download.js";

const router = express.Router();

// Static routes before dynamic routes
router.get("/user/:userId", getUserDownloads);
router.get("/summary/:userId", getDownloadSummary);
router.delete("/:id", deleteDownload);
router.post("/:videoId", requestDownload);

export default router;
