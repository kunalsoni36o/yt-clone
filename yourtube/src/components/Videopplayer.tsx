"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import Link from "next/link";
import {
  Crown,
  Lock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    isPremium?: boolean;
  };
  nextVideo?: {
    _id: string;
    videotitle: string;
    thumbnail?: string;
  } | null;
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

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ video, nextVideo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const { user } = useUser();
  const [access, setAccess] = useState<PlanAccess | null>(null);
  const [watchLimitReached, setWatchLimitReached] = useState(false);
  const [showAd, setShowAd] = useState(false);

  // Player UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNextVideo, setShowNextVideo] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ side: "left" | "right"; amount: number } | null>(null);
  const [doubleTapCount, setDoubleTapCount] = useState(0);

  // ───── Access control ─────
  useEffect(() => {
    if (!user?._id) {
      setAccess({
        plan: "free",
        planConfig: { premiumWatchSeconds: 300, adFree: false, premiumAccess: false, badges: false },
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
          planConfig: { premiumWatchSeconds: 300, adFree: false, premiumAccess: false, badges: false },
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

  // ───── Video element events ─────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      checkWatchLimit();
      if (el.duration && el.currentTime >= el.duration - 10 && nextVideo) {
        setShowNextVideo(true);
      }
    };
    const onLoadedMetadata = () => { setDuration(el.duration); setIsLoading(false); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => { setIsPlaying(false); if (nextVideo) setShowNextVideo(true); };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [checkWatchLimit, nextVideo]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ───── Controls auto-hide ─────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // ───── Actions ─────
  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play(); else el.pause();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const seek = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + seconds));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleVolumeChange = useCallback((val: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = val;
    el.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isMuted) { el.muted = false; el.volume = volume || 0.5; setIsMuted(false); }
    else { el.muted = true; setIsMuted(true); }
    resetControlsTimer();
  }, [isMuted, volume, resetControlsTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration;
    resetControlsTimer();
  }, [resetControlsTimer]);

  // ───── Double-tap gesture ─────
  const showGestureFeedback = useCallback((side: "left" | "right", amount: number) => {
    setDoubleTapCount((prev) => {
      const next = prev + 1;
      setSeekFeedback({ side, amount: next * Math.abs(amount) });
      return next;
    });
    if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
    doubleTapTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
      setDoubleTapCount(0);
    }, 900);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    const delta = now - lastTapRef.current.time;

    if (delta < 300) {
      if (isLeft) { seek(-10); showGestureFeedback("left", 10); }
      else { seek(10); showGestureFeedback("right", 10); }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 290) togglePlay();
      }, 300);
    }
  }, [seek, showGestureFeedback, togglePlay]);

  // ───── Derived ─────
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const blocked = access?.isPremiumVideo && !access?.hasPremiumAccess && !user;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }}
    >
      {/* Premium badge */}
      {video.isPremium && (
        <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 pointer-events-none">
          <Crown className="w-3 h-3" /> Premium
        </div>
      )}

      {/* ── Overlays ── */}
      {blocked && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Lock className="w-12 h-12 mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2">Premium video</h3>
          <p className="text-gray-300 mb-4">Sign in and upgrade to watch this video.</p>
          <Link href="/plans"><Button className="bg-red-600 hover:bg-red-700">View plans</Button></Link>
        </div>
      )}

      {watchLimitReached && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Crown className="w-12 h-12 mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2">Preview limit reached</h3>
          <p className="text-gray-300 mb-4">Free users can watch 5 minutes of premium content. Upgrade for full access.</p>
          <Link href="/plans"><Button className="bg-red-600 hover:bg-red-700">Upgrade now</Button></Link>
        </div>
      )}

      {showAd && (
        <div className="absolute inset-0 z-30 bg-gray-900 flex flex-col items-center justify-center text-white">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Advertisement</p>
          <p className="text-lg font-semibold">Upgrade for ad-free viewing</p>
          <p className="text-sm text-gray-400 mt-2">Resuming in a few seconds...</p>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && !blocked && !watchLimitReached && !showAd && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-14 h-14 text-white/80 animate-spin" />
        </div>
      )}

      {/* Next video card */}
      {showNextVideo && nextVideo && !watchLimitReached && !blocked && (
        <div className="absolute bottom-20 right-4 z-20 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3 w-64 shadow-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Up next</p>
            <p className="text-white text-sm font-semibold truncate">{nextVideo.videotitle}</p>
          </div>
          <Link href={`/video/${nextVideo._id}`}>
            <button className="shrink-0 bg-red-600 hover:bg-red-700 transition-colors text-white rounded-lg p-2">
              <SkipForward className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* Seek gesture feedback */}
      {seekFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none transition-opacity ${
            seekFeedback.side === "left" ? "left-10" : "right-10"
          }`}
        >
          <div className="bg-black/55 rounded-full p-4">
            {seekFeedback.side === "left"
              ? <RotateCcw className="w-8 h-8 text-white" />
              : <RotateCw className="w-8 h-8 text-white" />}
          </div>
          <span className="text-white text-sm font-bold drop-shadow">
            {seekFeedback.side === "left" ? "-" : "+"}{seekFeedback.amount}s
          </span>
        </div>
      )}

      {/* Tap area for single/double tap */}
      <div className="absolute inset-0 z-10" onClick={handleTap} />

      {/* Actual <video> */}
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={
            video?.filepath?.startsWith("http")
              ? video.filepath
              : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video?.filepath}`
          }
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* ─── Custom Controls Bar ─── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)" }}
      >
        {/* Progress / Seek bar */}
        <div
          className="group/bar mx-3 mb-3 mt-8 relative h-1.5 hover:h-2.5 transition-all duration-150 rounded-full bg-white/25 cursor-pointer"
          onClick={handleSeekBarClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-red-500 rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Play/Pause */}
          <button
            id="video-play-pause"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="text-white hover:text-red-400 transition-colors focus:outline-none p-1"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          {/* Rewind 10s */}
          <button
            id="video-rewind"
            onClick={() => seek(-10)}
            aria-label="Rewind 10 seconds"
            className="text-white hover:text-red-400 transition-colors focus:outline-none p-1"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Forward 10s */}
          <button
            id="video-forward"
            onClick={() => seek(10)}
            aria-label="Skip forward 10 seconds"
            className="text-white hover:text-red-400 transition-colors focus:outline-none p-1"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* Volume group */}
          <div className="group/vol flex items-center gap-1">
            <button
              id="video-mute"
              onClick={toggleMute}
              aria-label="Toggle mute"
              className="text-white hover:text-red-400 transition-colors focus:outline-none p-1"
            >
              <VolumeIcon className="w-5 h-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 accent-red-500 cursor-pointer"
            />
          </div>

          {/* Time display */}
          <span className="text-white/90 text-xs font-mono flex-1 select-none pl-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Fullscreen */}
          <button
            id="video-fullscreen"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="text-white hover:text-red-400 transition-colors focus:outline-none p-1"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
