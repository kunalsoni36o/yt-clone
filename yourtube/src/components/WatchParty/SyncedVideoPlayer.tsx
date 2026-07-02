import React, { useRef, useEffect } from "react";

interface VideoSyncState {
  playing: boolean;
  currentTime: number;
}

interface SyncedVideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  videoSyncState: VideoSyncState;
  canControl: boolean;
  onSync: (state: VideoSyncState) => void;
}

export default function SyncedVideoPlayer({
  video,
  videoSyncState,
  canControl,
  onSync,
}: SyncedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Flag to suppress echo: when we apply an incoming sync, we don't re-emit it
  const isSyncing = useRef(false);

  // Apply incoming sync state from remote participants
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    isSyncing.current = true;

    const applySync = async () => {
      // Only seek if drift is more than 1 second
      if (Math.abs(v.currentTime - videoSyncState.currentTime) > 1) {
        v.currentTime = videoSyncState.currentTime;
      }
      if (videoSyncState.playing && v.paused) {
        try { await v.play(); } catch {}
      } else if (!videoSyncState.playing && !v.paused) {
        v.pause();
      }
      setTimeout(() => { isSyncing.current = false; }, 350);
    };

    applySync();
  }, [videoSyncState]);

  const emitSync = (playing: boolean) => {
    if (!canControl || isSyncing.current || !videoRef.current) return;
    onSync({ playing, currentTime: videoRef.current.currentTime });
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={{ maxHeight: "calc(100vh - 300px)" }}
        controls={canControl}
        onPlay={() => emitSync(true)}
        onPause={() => emitSync(false)}
        onSeeked={() => {
          if (isSyncing.current || !videoRef.current) return;
          onSync({ playing: !videoRef.current.paused, currentTime: videoRef.current.currentTime });
        }}
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
