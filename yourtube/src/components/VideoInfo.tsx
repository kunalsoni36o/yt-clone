import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import { toast } from "sonner";

const VideoInfo = ({ video }: any) => {
  const router = useRouter();
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos.");
      return;
    }

    try {
      toast.loading("Processing download request...", { id: "download" });

      // Step 1: Ask backend to authorise download and record it
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user._id,
      });

      const { userPlan, _id: downloadId } = res.data.download;
      const remaining = res.data.remaining;

      toast.success(
        `Download approved! Plan: ${userPlan}. Remaining today: ${remaining}`,
        { id: "download" }
      );

      // Step 2: Trigger browser file download
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const videoUrl = `${backendUrl}/${video.filepath}`;

      let fileRes: Response;
      try {
        fileRes = await fetch(videoUrl);
      } catch {
        toast.error("Could not reach the server to fetch the video file.", { id: "download" });
        return;
      }

      if (!fileRes.ok) {
        toast.error(`Failed to download: server returned ${fileRes.status}`, { id: "download" });
        return;
      }

      const blob = await fileRes.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = video.videotitle || "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to process download.";
      if (error.response?.data?.premiumRequired) {
        toast.error(msg, {
          id: "download",
          action: {
            label: "Upgrade",
            onClick: () => router.push("/plans"),
          },
        });
        return;
      }
      toast.error(msg, { id: "download" });
    }
  };


  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  const viewRecorded = useRef(false);
  const historyRecorded = useRef<string | null>(null);

  useEffect(() => {
    viewRecorded.current = false;
    historyRecorded.current = null;
  }, [video._id]);

  useEffect(() => {
    const recordViewAndHistory = async () => {
      if (!video?._id) return;
      
      // 1. Record view count exactly once
      if (!viewRecorded.current) {
        viewRecorded.current = true;
        try {
          await axiosInstance.post(`/history/views/${video._id}`);
        } catch (error) {
          console.error("Error recording view:", error);
        }
      }

      // 2. Record history if user is logged in
      if (user?._id && historyRecorded.current !== video._id) {
        historyRecorded.current = video._id;
        try {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user._id,
          });
        } catch (error) {
          console.error("Error saving to history:", error);
        }
      }
    };
    recordViewAndHistory();
  }, [video._id, user?._id]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        setlikes((prev: any) => prev + 1);
        setIsLiked(true);
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        }
      } else {
        setlikes((prev: any) => prev - 1);
        setIsLiked(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    if (!user) {
      return; // BUG-019: Add guest guard
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(true);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      // If liked, click dislike to undo the like first
      if (isLiked) {
        const res = await axiosInstance.post(`/like/${video._id}`, {
          userId: user?._id,
        });
        if (!res.data.liked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        }
      }
      if (isDisliked) {
        setDislikes((prev: any) => prev - 1);
        setIsDisliked(false);
      } else {
        setDislikes((prev: any) => prev + 1);
        setIsDisliked(true);
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-foreground">{video.videochanel}</h3>
            <p className="text-sm text-muted-foreground">
              Subscriber details unavailable
            </p>
          </div>
          <Button className="ml-4 bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-red-600 text-red-600" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-red-600 text-red-600" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
            onClick={() => {
              const secureRoomId = Array.from(window.crypto.getRandomValues(new Uint8Array(8)))
                .map((b) => (b % 36).toString(36))
                .join("");
              router.push(`/watch-party/${secureRoomId}?videoId=${video._id}`);
            }}
          >
            <Users className="w-5 h-5 mr-2" />
            Watch Party
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <div className="flex gap-4 text-sm font-medium mb-2 text-foreground">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm text-muted-foreground ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            {video.description || "No description provided."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium text-foreground hover:underline"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
