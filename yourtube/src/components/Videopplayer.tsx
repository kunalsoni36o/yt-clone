"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { Button } from "./ui/button";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    isPremium?: boolean;
  };
}

interface PlanAccess {
  plan: string;
  planConfig: {
    premiumWatchSeconds: number | "unlimited";
    adFree: boolean;
    premiumAccess: boolean;
    badges: boolean;
  };
  isPremiumVideo: boolean;
  hasPremiumAccess: boolean;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [access, setAccess] = useState<PlanAccess | null>(null);
  const [watchLimitReached, setWatchLimitReached] = useState(false);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    if (!user?._id) {
      setAccess({
        plan: "free",
        planConfig: {
          premiumWatchSeconds: 300,
          adFree: false,
          premiumAccess: false,
          badges: false,
        },
        isPremiumVideo: video.isPremium || false,
        hasPremiumAccess: !video.isPremium,
      });
      return;
    }

    axiosInstance
      .get(`/subscription/access/${user._id}?videoId=${video._id}`)
      .then((res) => setAccess(res.data))
      .catch(() => {
        setAccess({
          plan: user.plan || "free",
          planConfig: {
            premiumWatchSeconds: 300,
            adFree: false,
            premiumAccess: false,
            badges: false,
          },
          isPremiumVideo: video.isPremium || false,
          hasPremiumAccess: !video.isPremium,
        });
      });
  }, [user?._id, video._id, video.isPremium, user?.plan]);

  const checkWatchLimit = useCallback(() => {
    if (!access || !videoRef.current) return;

    const limit = access.planConfig.premiumWatchSeconds;
    if (typeof limit !== "number" || !Number.isFinite(limit)) return;

    if (access.isPremiumVideo && !access.hasPremiumAccess) {
      if (videoRef.current.currentTime >= limit) {
        videoRef.current.pause();
        setWatchLimitReached(true);
      }
    }
  }, [access]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.addEventListener("timeupdate", checkWatchLimit);
    return () => el.removeEventListener("timeupdate", checkWatchLimit);
  }, [checkWatchLimit]);

  useEffect(() => {
    if (!access || access.planConfig.adFree) return;

    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowAd(true);
        videoRef.current.pause();
        setTimeout(() => {
          setShowAd(false);
          videoRef.current?.play();
        }, 5000);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [access]);

  const blocked =
    access?.isPremiumVideo && !access?.hasPremiumAccess && !user;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {video.isPremium && (
        <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
          <Crown className="w-3 h-3" /> Premium
        </div>
      )}

      {blocked ? (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Lock className="w-12 h-12 mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2">Premium video</h3>
          <p className="text-gray-300 mb-4">Sign in and upgrade to watch this video.</p>
          <Link href="/plans">
            <Button className="bg-red-600 hover:bg-red-700">View plans</Button>
          </Link>
        </div>
      ) : null}

      {watchLimitReached && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Crown className="w-12 h-12 mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2">Preview limit reached</h3>
          <p className="text-gray-300 mb-4">
            Free users can watch 5 minutes of premium content. Upgrade for full access.
          </p>
          <Link href="/plans">
            <Button className="bg-red-600 hover:bg-red-700">Upgrade now</Button>
          </Link>
        </div>
      )}

      {showAd && (
        <div className="absolute inset-0 z-30 bg-gray-900 flex flex-col items-center justify-center text-white">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Advertisement</p>
          <p className="text-lg font-semibold">Upgrade for ad-free viewing</p>
          <p className="text-sm text-gray-400 mt-2">Resuming in a few seconds...</p>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
