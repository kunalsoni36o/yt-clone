"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import Link from "next/link";
import { useRouter } from "next/router";
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
  const router = useRouter();
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
  const [nextVideoCountdown, setNextVideoCountdown] = useState<number | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<{ side: "left" | "right"; amount: number } | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

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
    const onLoadedMetadata = () => {
      setDuration(el.duration);
      setIsLoading(false);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (nextVideo) {
        setShowNextVideo(true);
        setNextVideoCountdown(5);
      }
    };

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

  const videoSrcUrl = video?.filepath?.startsWith("http")
    ? video.filepath
    : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video?.filepath}`;

  useEffect(() => {
    if (videoRef.current && videoSrcUrl) {
      videoRef.current.load();
    }
  }, [videoSrcUrl]);

  // Auto-play next video countdown timer
  useEffect(() => {
    if (nextVideoCountdown === null) return;
    if (nextVideoCountdown <= 0) {
      if (nextVideo?._id) {
        router.push(`/watch/${nextVideo._id}`);
      }
      return;
    }
    const timer = setTimeout(() => {
      setNextVideoCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextVideoCountdown, nextVideo, router]);

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
    }, 3500);
  }, []);

  // ───── Core Actions ─────
  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  const seek = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + seconds));
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
    if (isMuted) {
      el.muted = false;
      el.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      el.muted = true;
      setIsMuted(true);
    }
    resetControlsTimer();
  }, [isMuted, volume, resetControlsTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  // ───── Progress Bar Drag & Hover ─────
  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pos * el.duration;
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleSeekBarMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * el.duration);
  }, []);

  const handleSeekBarMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  // ───── Double-tap / Mobile Gesture Controls ─────
  const showGestureFeedback = useCallback((side: "left" | "right", amount: number) => {
    setSeekFeedback({ side, amount });
    if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
    doubleTapTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 800);
  }, []);

  const processTap = useCallback((clientX: number, target: HTMLDivElement) => {
    const now = Date.now();
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const isLeft = x < rect.width / 2;
    const delta = now - lastTapRef.current.time;

    if (delta < 300) {
      if (isLeft) {
        seek(-10);
        showGestureFeedback("left", 10);
      } else {
        seek(10);
        showGestureFeedback("right", 10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 290) {
          togglePlay();
        }
      }, 300);
    }
  }, [seek, showGestureFeedback, togglePlay]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    processTap(e.clientX, e.currentTarget);
  }, [processTap]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      processTap(touch.clientX, e.currentTarget);
    }
  }, [processTap]);

  // ───── Keyboard Shortcuts ─────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space" || e.code === "KeyK") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft" || e.code === "KeyJ") {
        e.preventDefault();
        seek(-10);
        showGestureFeedback("left", 10);
      } else if (e.code === "ArrowRight" || e.code === "KeyL") {
        e.preventDefault();
        seek(10);
        showGestureFeedback("right", 10);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seek, toggleMute, toggleFullscreen, showGestureFeedback]);

  // ───── Derived State ─────
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const blocked = access?.isPremiumVideo && !access?.hasPremiumAccess && !user;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden select-none group/player focus:outline-none"
      tabIndex={0}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }}
    >
      {/* Premium badge */}
      {video.isPremium && (
        <div className="absolute top-3 left-3 z-20 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md pointer-events-none">
          <Crown className="w-3.5 h-3.5" /> Premium
        </div>
      )}

      {/* ── Overlays ── */}
      {blocked && (
        <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Lock className="w-12 h-12 mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2">Premium video</h3>
          <p className="text-gray-300 mb-4 max-w-md">Sign in and upgrade your plan to watch this exclusive premium video.</p>
          <Link href="/plans"><Button className="bg-red-600 hover:bg-red-700 font-semibold px-6 py-2">View plans</Button></Link>
        </div>
      )}

      {watchLimitReached && (
        <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Crown className="w-12 h-12 mb-4 text-amber-400 animate-bounce" />
          <h3 className="text-xl font-bold mb-2">Preview limit reached</h3>
          <p className="text-gray-300 mb-4 max-w-md">Free preview limit reached. Upgrade to Unlimited plan for full access.</p>
          <Link href="/plans"><Button className="bg-red-600 hover:bg-red-700 font-semibold px-6 py-2">Upgrade now</Button></Link>
        </div>
      )}

      {showAd && (
        <div className="absolute inset-0 z-30 bg-gray-950 flex flex-col items-center justify-center text-white p-6">
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">Advertisement</p>
          <p className="text-xl font-semibold">Upgrade for ad-free experience</p>
          <p className="text-sm text-gray-400 mt-2">Resuming video in a few seconds...</p>
        </div>
      )}

      {/* Loading spinner state */}
      {isLoading && !blocked && !watchLimitReached && !showAd && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-2" />
          <span className="text-xs text-white/80 font-medium">Loading video...</span>
        </div>
      )}

      {/* Next video card overlay */}
      {showNextVideo && nextVideo && !watchLimitReached && !blocked && (
        <div className="absolute bottom-20 right-4 z-20 bg-black/90 border border-white/15 backdrop-blur-md rounded-xl p-3.5 flex items-center gap-3 w-72 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500">Up Next</span>
              {nextVideoCountdown !== null && (
                <span className="text-[11px] font-mono text-gray-400">Playing in {nextVideoCountdown}s</span>
              )}
            </div>
            <p className="text-white text-sm font-semibold truncate leading-snug">{nextVideo.videotitle}</p>
          </div>
          <Link href={`/watch/${nextVideo._id}`}>
            <button
              onClick={() => setNextVideoCountdown(null)}
              className="shrink-0 bg-red-600 hover:bg-red-700 transition-colors text-white font-medium rounded-lg p-2.5 flex items-center gap-1 text-xs shadow"
              aria-label="Play next video"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* Seek gesture feedback animation */}
      {seekFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none transition-all duration-300 animate-in zoom-in-75 ${
            seekFeedback.side === "left" ? "left-12" : "right-12"
          }`}
        >
          <div className="bg-black/70 backdrop-blur-md rounded-full p-4 border border-white/20 shadow-xl">
            {seekFeedback.side === "left" ? (
              <RotateCcw className="w-8 h-8 text-white animate-spin-reverse" />
            ) : (
              <RotateCw className="w-8 h-8 text-white" />
            )}
          </div>
          <span className="text-white text-xs font-extrabold tracking-wide uppercase bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10 shadow">
            {seekFeedback.side === "left" ? "-10 sec" : "+10 sec"}
          </span>
        </div>
      )}

      {/* Tap & Touch gesture area */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        onTouchEnd={handleTouchEnd}
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrcUrl}
        className="w-full h-full object-contain"
        poster={`/placeholder.svg?height=480&width=854`}
        playsInline
        crossOrigin="anonymous"
      >
        Your browser does not support the video tag.
      </video>

      {/* ─── Custom Controls Bar ─── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}
      >
        {/* Progress / Seek bar */}
        <div className="px-3 pt-4 pb-1">
          <div
            className="group/bar relative h-1.5 hover:h-2.5 transition-all duration-150 rounded-full bg-white/20 cursor-pointer flex items-center"
            onClick={handleSeekBarClick}
            onMouseMove={handleSeekBarMouseMove}
            onMouseLeave={handleSeekBarMouseLeave}
          >
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-8 -translate-x-1/2 bg-black/90 border border-white/20 text-white text-[11px] font-mono px-2 py-0.5 rounded shadow pointer-events-none z-30"
                style={{ left: `${hoverPosition}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Played progress */}
            <div
              className="absolute inset-y-0 left-0 bg-red-600 rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-red-600 shadow-md pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity -translate-x-1/2"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Play/Pause */}
          <button
            id="video-play-pause"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="text-white/90 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          {/* Rewind 10s */}
          <button
            id="video-rewind"
            onClick={() => {
              seek(-10);
              showGestureFeedback("left", 10);
            }}
            aria-label="Rewind 10 seconds"
            title="Rewind 10s (Left Arrow)"
            className="text-white/90 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Skip Forward 10s */}
          <button
            id="video-forward"
            onClick={() => {
              seek(10);
              showGestureFeedback("right", 10);
            }}
            aria-label="Skip forward 10 seconds"
            title="Skip 10s (Right Arrow)"
            className="text-white/90 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Volume group */}
          <div className="group/vol flex items-center gap-1.5">
            <button
              id="video-mute"
              onClick={toggleMute}
              aria-label="Toggle mute"
              title="Mute (M)"
              className="text-white/90 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10"
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
              aria-label="Volume slider"
              className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 accent-red-600 cursor-pointer h-1.5 rounded-lg"
            />
          </div>

          {/* Time display */}
          <div className="text-white/90 text-xs font-mono select-none pl-2 flex-1 flex items-center gap-1">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{formatTime(duration)}</span>
          </div>

          {/* Next Video Quick Button */}
          {nextVideo && (
            <Link href={`/watch/${nextVideo._id}`}>
              <button
                id="video-next"
                aria-label="Next video"
                title="Next Video"
                className="text-white/80 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10 hidden sm:block"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </Link>
          )}

          {/* Fullscreen */}
          <button
            id="video-fullscreen"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title="Fullscreen (F)"
            className="text-white/90 hover:text-white hover:scale-110 transition-all focus:outline-none p-1.5 rounded-lg hover:bg-white/10"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
