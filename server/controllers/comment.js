import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// List of profane / abusive words to filter
const BAD_WORDS = [
  "fuck", "shit", "bitch", "bastard", "asshole", "idiot", "stupid",
  "dumb", "hate", "abuse", "slut", "whore", "dick", "cunt", "nigger", "retard"
];

// Spam phrases & pattern detection
const SPAM_PATTERNS = [
  /https?:\/\/[^\s]+/i, // URLs
  /www\.[^\s]+/i,       // www links
  /bit\.ly\/[^\s]+/i,
  /free\s*money/i,
  /click\s*here/i,
  /earn\s*\$+/i,
  /crypto\s*profit/i,
  /telegram\s*@/i,
  /whatsapp\s*\+?/i,
  /sub4sub/i,
  /subscribe\s*back/i,
];

// Content moderation check
const validateCommentText = (text) => {
  const lower = text.toLowerCase();

  // 1. Abusive / profane words check
  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      return { valid: false, message: `Comment blocked: contains prohibited or abusive words.` };
    }
  }

  // 2. Spam links / promotional phrases check
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(lower)) {
      return { valid: false, message: `Comment blocked: promotional links or spam patterns are not allowed.` };
    }
  }

  // 3. Repeated special characters check (e.g. "!!!!!!", "??????", "$$$$$", "#####")
  const repeatedSpecialCharRegex = /([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])\1{3,}/;
  if (repeatedSpecialCharRegex.test(text)) {
    return { valid: false, message: `Comment blocked: excessive repeated special characters detected.` };
  }

  return { valid: true };
};

export const postcomment = async (req, res) => {
  const { userid, videoid, commentbody, usercommented, location, showLocation } = req.body;

  if (!userid || !videoid || !commentbody?.trim() || !usercommented) {
    return res.status(400).json({ message: "Missing required comment parameters" });
  }

  // Moderation check
  const modResult = validateCommentText(commentbody.trim());
  if (!modResult.valid) {
    return res.status(400).json({ message: modResult.message });
  }

  const postcomment = new comment({
    userid,
    videoid,
    commentbody: commentbody.trim(),
    usercommented,
    location: showLocation ? (location || null) : null,
    showLocation: Boolean(showLocation),
  });

  try {
    const saved = await postcomment.save();
    return res.status(200).json({ comment: true, data: saved });
  } catch (error) {
    console.error("Post comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .sort({ commentedon: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("Comment unavailable");
    }
    if (existingComment.userid.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }
  if (!commentbody?.trim()) {
    return res.status(400).json({ message: "Comment body cannot be empty" });
  }

  // Moderation check
  const modResult = validateCommentText(commentbody.trim());
  if (!modResult.valid) {
    return res.status(400).json({ message: modResult.message });
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("Comment unavailable");
    }
    if (existingComment.userid.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    return res.status(200).json(updatecomment);
  } catch (error) {
    console.error("Edit comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id) || !userId) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const hasLiked = targetComment.likes.includes(userId);
    const hasDisliked = targetComment.dislikes.includes(userId);

    if (hasLiked) {
      targetComment.likes = targetComment.likes.filter((id) => id.toString() !== userId);
    } else {
      targetComment.likes.push(userId);
      if (hasDisliked) {
        targetComment.dislikes = targetComment.dislikes.filter((id) => id.toString() !== userId);
      }
    }

    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("Like comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id) || !userId) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const hasLiked = targetComment.likes.includes(userId);
    const hasDisliked = targetComment.dislikes.includes(userId);

    if (hasDisliked) {
      targetComment.dislikes = targetComment.dislikes.filter((id) => id.toString() !== userId);
    } else {
      targetComment.dislikes.push(userId);
      if (hasLiked) {
        targetComment.likes = targetComment.likes.filter((id) => id.toString() !== userId);
      }
    }

    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("Dislike comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reportcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid comment ID" });
  }

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    // Append report without deleting comment
    targetComment.reports.push({
      userid: userId || "Anonymous",
      reason: reason || "Inappropriate content",
      reportedAt: new Date(),
    });
    targetComment.isFlagged = true; // Mark as flagged for moderator review

    await targetComment.save();
    return res.status(200).json({ message: "Comment reported and flagged for review", data: targetComment });
  } catch (error) {
    console.error("Report comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
