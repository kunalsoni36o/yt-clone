import express from "express";
import { requestDownload, getUserDownloads } from "../controllers/download.js";

const router = express.Router();

// IMPORTANT: static /user/:userId MUST come before dynamic /:videoId
router.get("/user/:userId", getUserDownloads);
router.post("/:videoId", requestDownload);

export default router;
