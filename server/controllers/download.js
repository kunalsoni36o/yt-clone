import mongoose from "mongoose";
import Download from "../Modals/download.js";
import Video from "../Modals/video.js";
import User from "../Modals/Auth.js";

const PLAN_LIMITS = {
  free: 1,
  bronze: 5,
  gold: 10,
  unlimited: Infinity,
};

export const requestDownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid video ID or user ID" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const plan = user.plan || "free";
    const limit = PLAN_LIMITS[plan.toLowerCase()] !== undefined ? PLAN_LIMITS[plan.toLowerCase()] : 1;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const downloadsToday = await Download.countDocuments({
      userId,
      downloadDate: { $gte: startOfToday },
    });

    if (downloadsToday >= limit) {
      return res.status(403).json({
        message: `Download limit reached for your plan (${plan}). Limit is ${limit === Infinity ? "Unlimited" : limit} per day.`,
        limitReached: true,
        plan,
        limit,
      });
    }

    // Save download track
    const newDownload = await Download.create({
      userId,
      videoId,
      userPlan: plan,
      videoDetails: {
        videotitle: video.videotitle,
        filepath: video.filepath,
        videochanel: video.videochanel,
      },
    });

    return res.status(200).json({
      message: "Download approved",
      download: newDownload,
      remaining: limit === Infinity ? "Unlimited" : limit - downloadsToday - 1,
    });
  } catch (error) {
    console.error("Error checking/creating download:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const downloads = await Download.find({ userId }).sort({ downloadDate: -1 });
    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Error retrieving user downloads:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
