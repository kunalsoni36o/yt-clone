import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  Languages,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: string[];
  dislikes?: string[];
  isFlagged?: boolean;
  location?: string | null;
  showLocation?: boolean;
}

// Client translation dictionary / fallback simulator for instant translation demo
const TRANSLATION_MAP: Record<string, string> = {
  "hello": "Hello (English)",
  "namaste": "Hello (Hindi)",
  "hola": "Hello (Spanish)",
  "bonjour": "Hello (French)",
  "dankeschön": "Thank you very much (German)",
  "arigato": "Thank you (Japanese)",
};

const translateText = async (text: string, targetLang = "en"): Promise<string> => {
  const lower = text.trim().toLowerCase();
  if (TRANSLATION_MAP[lower]) return TRANSLATION_MAP[lower];

  try {
    // Attempt free client translation API
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.error("Translation API error:", err);
  }
  return `[Translated to ${targetLang.toUpperCase()}]: ${text}`;
};

const Comments = ({ videoId }: { videoId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("India");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  
  // Report modal state
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
    detectLocation();
  }, [videoId]);

  const detectLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.city && data.country_name) {
          setUserLocation(`${data.city}, ${data.country_name}`);
        } else if (data.country_name) {
          setUserLocation(data.country_name);
        }
      }
    } catch {
      setUserLocation("India");
    }
  };

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name || "Anonymous User",
        showLocation,
        location: showLocation ? userLocation : null,
      });

      if (res.data.comment) {
        toast.success("Comment posted successfully!");
        setNewComment("");
        setShowLocation(false);
        loadComments();
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
      const msg = error.response?.data?.message || "Failed to post comment";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.patch(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText, userId: user?._id }
      );
      if (res.data) {
        toast.success("Comment updated!");
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      console.error("Edit error:", error);
      const msg = error.response?.data?.message || "Failed to update comment";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`, {
        data: { userId: user?._id },
      });
      if (res.data.comment) {
        toast.success("Comment deleted");
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error: any) {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }
    try {
      const res = await axiosInstance.patch(`/comment/like/${commentId}`, {
        userId: user._id,
      });
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
      );
    } catch (err) {
      console.error("Like comment error:", err);
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments");
      return;
    }
    try {
      const res = await axiosInstance.patch(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
      );
    } catch (err) {
      console.error("Dislike comment error:", err);
    }
  };

  const handleTranslate = async (commentId: string, text: string) => {
    if (translations[commentId]) {
      // Toggle off translation if already present
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      return;
    }

    setTranslatingId(commentId);
    const translated = await translateText(text, "en");
    setTranslations((prev) => ({ ...prev, [commentId]: translated }));
    setTranslatingId(null);
  };

  const submitReport = async () => {
    if (!reportingCommentId) return;
    setIsReporting(true);
    try {
      await axiosInstance.post(`/comment/report/${reportingCommentId}`, {
        userId: user?._id,
        reason: reportReason || "Inappropriate content",
      });
      toast.success("Comment reported and flagged for review");
      setComments((prev) =>
        prev.map((c) => (c._id === reportingCommentId ? { ...c, isFlagged: true } : c))
      );
      setReportingCommentId(null);
      setReportReason("");
    } catch (err) {
      console.error("Report error:", err);
      toast.error("Failed to report comment");
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-4 font-medium">Loading comments...</div>;
  }

  return (
    <div className="space-y-6 mt-6">
      <h2 className="text-xl font-bold">{comments.length} Comments</h2>

      {user ? (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 border">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a comment... (Supports all languages & auto-moderated)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-b-2 rounded-lg focus-visible:ring-1"
            />

            {/* Optional Location Privacy Toggle */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLocation}
                  onChange={(e) => setShowLocation(e.target.checked)}
                  className="rounded accent-red-600 cursor-pointer"
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Include my location ({userLocation})</span>
              </label>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewComment("")}
                  disabled={!newComment.trim()}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">Sign in to leave a comment.</p>
      )}

      {/* Comment List */}
      <div className="space-y-5">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-2">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const likeCount = comment.likes?.length || 0;
            const dislikeCount = comment.dislikes?.length || 0;
            const hasLiked = user?._id && comment.likes?.includes(user._id);
            const hasDisliked = user?._id && comment.dislikes?.includes(user._id);
            const isTranslated = !!translations[comment._id];

            return (
              <div key={comment._id} className="flex gap-3.5 group">
                <Avatar className="w-10 h-10 border shrink-0">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">
                      {comment.usercommented}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>

                    {/* Optional Location badge */}
                    {comment.showLocation && comment.location && (
                      <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1 border">
                        <MapPin className="w-3 h-3 text-red-500" />
                        {comment.location}
                      </span>
                    )}

                    {/* Flagged status badge */}
                    {comment.isFlagged && (
                      <span className="text-[11px] text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-amber-300 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Flagged for review
                      </span>
                    )}
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2 my-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleUpdateComment} disabled={!editText.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Comment text / Translation */}
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {isTranslated ? translations[comment._id] : comment.commentbody}
                      </p>

                      {/* Translation notice */}
                      {isTranslated && (
                        <p className="text-xs text-blue-500 mt-1 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Translated
                        </p>
                      )}

                      {/* Actions row: Like, Dislike, Translate, Report, Edit, Delete */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {/* Like */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1 hover:text-red-600 transition-colors ${
                            hasLiked ? "text-red-600 font-bold" : ""
                          }`}
                          aria-label="Like comment"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {likeCount > 0 && <span>{likeCount}</span>}
                        </button>

                        {/* Dislike */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1 hover:text-gray-800 dark:hover:text-white transition-colors ${
                            hasDisliked ? "text-gray-900 dark:text-white font-bold" : ""
                          }`}
                          aria-label="Dislike comment"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          {dislikeCount > 0 && <span>{dislikeCount}</span>}
                        </button>

                        {/* Translate button */}
                        <button
                          onClick={() => handleTranslate(comment._id, comment.commentbody)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          {translatingId === comment._id
                            ? "Translating..."
                            : isTranslated
                            ? "Show Original"
                            : "Translate"}
                        </button>

                        {/* Report button */}
                        <button
                          onClick={() => setReportingCommentId(comment._id)}
                          className="flex items-center gap-1 hover:text-amber-600 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          Report
                        </button>

                        {/* Edit & Delete for author */}
                        {comment.userid === user?._id && (
                          <>
                            <button
                              onClick={() => handleEdit(comment)}
                              className="hover:text-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      <Dialog open={!!reportingCommentId} onOpenChange={() => setReportingCommentId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-500" />
              Report Comment
            </DialogTitle>
            <DialogDescription>
              Help maintain a safe community. Reported comments are flagged for review by moderators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reason">Reason for reporting</Label>
            <Input
              id="reason"
              placeholder="e.g. Spam, harassment, abusive language"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReportingCommentId(null)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={isReporting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isReporting ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Comments;
