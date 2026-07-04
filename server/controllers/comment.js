import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const { userid, videoid, commentbody, usercommented } = req.body;
  
  if (!userid || !videoid || !commentbody?.trim() || !usercommented) {
    return res.status(400).json({ message: "Missing required comment parameters" });
  }

  const postcomment = new comment({
    userid,
    videoid,
    commentbody: commentbody.trim(),
    usercommented
  });

  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body; // Expect userId in body for ownership check
  
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }
    if (existingComment.userid.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, userId } = req.body; // Expect userId in body for ownership check
  
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!commentbody?.trim()) {
    return res.status(400).json({ message: "Comment body cannot be empty" });
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }
    if (existingComment.userid.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
