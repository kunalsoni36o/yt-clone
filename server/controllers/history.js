import video from "../Modals/video.js";
import history from "../Modals/history.js";

import mongoose from "mongoose";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid user ID or video ID" });
  }

  try {
    await history.create({ viewer: userId, videoid: videoId });
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const handleview = async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteHistory = async (req, res) => {
  const { historyId } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(historyId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }
  try {
    const item = await history.findById(historyId);
    if (!item) {
      return res.status(404).json({ message: "History item not found" });
    }
    if (item.viewer.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await history.findByIdAndDelete(historyId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
