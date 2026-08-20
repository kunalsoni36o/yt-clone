import mongoose from "mongoose";
import Download from "../Modals/download.js";
import Video from "../Modals/video.js";
import User from "../Modals/Auth.js";

import { getDownloadLimit } from "../config/plans.js";

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

    let plan = user.plan || "free";
    if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date() && plan !== "free") {
      await User.findByIdAndUpdate(userId, { $set: { plan: "free", planExpiresAt: null } });
      plan = "free";
    }

    if (video.isPremium && plan === "free") {
      return res.status(403).json({
        message: "Premium video downloads require a paid plan. Upgrade to download this video.",
        premiumRequired: true,
        plan,
      });
    }

    const limit = getDownloadLimit(plan);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Check if user already downloaded this specific video today
    const existingDownloadToday = await Download.findOne({
      userId,
      videoId,
      downloadDate: { $gte: startOfToday },
    });

    if (existingDownloadToday) {
      const downloadsTodayCount = await Download.countDocuments({
        userId,
        downloadDate: { $gte: startOfToday },
      });
      return res.status(200).json({
        message: "Already downloaded today (free re-download)",
        download: existingDownloadToday,
        remaining: limit === Infinity ? "Unlimited" : Math.max(0, limit - downloadsTodayCount),
      });
    }

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
      remaining: limit === Infinity ? "Unlimited" : Math.max(0, limit - downloadsToday - 1),
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

export const getDownloadSummary = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let plan = user.plan || "free";
    if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date() && plan !== "free") {
      await User.findByIdAndUpdate(userId, { $set: { plan: "free", planExpiresAt: null } });
      plan = "free";
    }

    const limit = getDownloadLimit(plan);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const downloadsToday = await Download.countDocuments({
      userId,
      downloadDate: { $gte: startOfToday },
    });

    return res.status(200).json({
      plan,
      downloadLimit: limit === Infinity ? "Unlimited" : limit,
      downloadsToday,
      remainingToday: limit === Infinity ? "Unlimited" : Math.max(0, limit - downloadsToday),
    });
  } catch (error) {
    console.error("Error fetching download summary:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteDownload = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid download ID" });
  }

  try {
    const deleted = await Download.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Download record not found" });
    }

    return res.status(200).json({ message: "Download record deleted successfully", id });
  } catch (error) {
    console.error("Error deleting download record:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
