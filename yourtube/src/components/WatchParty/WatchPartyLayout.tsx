import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { getSocket, disconnectSocket } from "@/lib/socket";
import SyncedVideoPlayer from "./SyncedVideoPlayer";
import VideoCallPanel from "./VideoCallPanel";
import CallControls from "./CallControls";
import PartyChat from "./PartyChat";
import axiosInstance from "@/lib/axiosinstance";
import { Copy, Crown, Wifi, WifiOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Participant {
  socketId: string;
  name: string;
  userId: string;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  message: string;
  userName: string;
  userId: string;
  socketId: string;
  timestamp: string;
  isSystem?: boolean;
}

const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
};

export default function WatchPartyLayout({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user } = useUser();

  // ─── Refs (not re-render sensitive) ────────────────────────────────────────
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, any>>(new Map());
  const SimplePeerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [mySocketId, setMySocketId] = useState<string>("");
  const [videoId, setVideoId] = useState<string>("");
  const [videoData, setVideoData] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteNames, setRemoteNames] = useState<Map<string, string>>(new Map());

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [videoSyncState, setVideoSyncState] = useState<{ playing: boolean; currentTime: number }>({
    playing: false,
    currentTime: 0,
  });

  // ─── Peer creation ──────────────────────────────────────────────────────────
  const createPeer = useCallback(
    (targetSocketId: string, isInitiator: boolean, stream: MediaStream | null) => {
      const Peer = SimplePeerRef.current;
      if (!Peer) return null;

      const peer = new Peer({
        initiator: isInitiator,
        stream: stream || undefined,
        trickle: true,
        config: {
          iceServers: getIceServers(),
        },
      });

      peer.on("signal", (signal: any) => {
        socketRef.current?.emit("webrtc-signal", {
          roomId,
          to: targetSocketId,
          signal,
          from: socketRef.current?.id,
        });
      });

      peer.on("stream", (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(targetSocketId, remoteStream);
          return next;
        });
      });

      peer.on("error", (err: any) => {
        console.error(`[Peer] Error with ${targetSocketId}:`, err.message);
      });

      peer.on("close", () => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(targetSocketId);
          return next;
        });
        peersRef.current.delete(targetSocketId);
      });

      return peer;
    },
    [roomId]
  );

  // ─── System message helper ──────────────────────────────────────────────────
  const addSystemMessage = (message: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        message,
        userName: "System",
        userId: "system",
        socketId: "system",
        timestamp: new Date().toISOString(),
        isSystem: true,
      },
    ]);
  };

  // ─── Main init effect ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Load simple-peer (browser only)
      const SPModule = await import("simple-peer");
      SimplePeerRef.current = (SPModule as any).default ?? SPModule;

      // 2. Acquire local camera + mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        toast.error("Camera / mic unavailable — you can still watch.");
      }

      // 3. Get singleton socket
      const socket = getSocket();
      if (!socket || !mounted) return;
      socketRef.current = socket;

      // 4. Register listeners
      socket.on("connect", () => {
        setIsConnected(true);
        setMySocketId(socket.id);
      });
      socket.on("disconnect", () => setIsConnected(false));

      socket.on(
        "room-joined",
        ({
          videoId: vid,
          videoState,
          participants: parts,
          chatMessages: history,
          hostSocketId,
          isHost: iAm,
        }: any) => {
          if (!mounted) return;
          setVideoId(vid);
          setVideoSyncState(videoState);
          setParticipants(parts);
          setChatMessages(history || []);
          setIsHost(iAm);
          if (vid) {
            axiosInstance.get(`/video/${vid}`).then((res) => {
              if (res.data && mounted) setVideoData(res.data);
            }).catch(err => console.error("Error loading watch party video metadata:", err));
          }
          // Create non-initiator peers for existing participants
          parts.forEach((p: Participant) => {
            if (p.socketId !== socket.id && !peersRef.current.has(p.socketId)) {
              const peer = createPeer(p.socketId, false, localStreamRef.current);
              if (peer) {
                peersRef.current.set(p.socketId, peer);
                setRemoteNames((prev) => new Map(prev).set(p.socketId, p.name));
              }
            }
          });
          addSystemMessage("You joined the watch party! 🎬");
        }
      );

      socket.on("user-joined", ({ socketId, name, participants: parts }: any) => {
        if (!mounted) return;
        setParticipants(parts);
        setRemoteNames((prev) => new Map(prev).set(socketId, name));
        if (!peersRef.current.has(socketId)) {
          const peer = createPeer(socketId, true, localStreamRef.current);
          if (peer) peersRef.current.set(socketId, peer);
        }
        addSystemMessage(`${name} joined the party 🎉`);
        toast(`${name} joined the party!`);
      });

      socket.on("user-left", ({ socketId, name, participants: parts }: any) => {
        if (!mounted) return;
        setParticipants(parts);
        const peer = peersRef.current.get(socketId);
        if (peer) {
          try { peer.destroy(); } catch {}
          peersRef.current.delete(socketId);
        }
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
        addSystemMessage(`${name} left the party`);
      });

      socket.on("host-changed", ({ newHostSocketId }: any) => {
        if (!mounted) return;
        setIsHost(newHostSocketId === socket.id);
        setParticipants((prev) =>
          prev.map((p) => ({ ...p, isHost: p.socketId === newHostSocketId }))
        );
        if (newHostSocketId === socket.id) {
          toast("You are now the host 👑");
          addSystemMessage("You are now the host!");
        }
      });

      socket.on("video-sync", ({ state }: any) => {
        if (mounted) setVideoSyncState(state);
      });

      socket.on("chat-message", (msg: ChatMessage) => {
        if (mounted) setChatMessages((prev) => [...prev, msg]);
      });

      socket.on("webrtc-signal", ({ signal, from }: any) => {
        if (!mounted) return;
        let peer = peersRef.current.get(from);
        if (!peer) {
          peer = createPeer(from, false, localStreamRef.current);
          if (peer) peersRef.current.set(from, peer);
        }
        if (peer) {
          try { peer.signal(signal); } catch (e) { console.error("signal err:", e); }
        }
      });

      socket.on("party-error", ({ message }: any) => {
        toast.error(message || "Watch party error");
      });

      // 5. Connect and join
      if (!socket.connected) socket.connect();
      socket.emit("join-room", {
        roomId,
        videoId: (router.query.videoId as string) || "",
        userId: user?._id || "anonymous",
        userName: user?.name || "Guest",
      });
    };

    init();

    return () => {
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave-room", { roomId });
        socket.off("connect");
        socket.off("disconnect");
        socket.off("room-joined");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("host-changed");
        socket.off("video-sync");
        socket.off("chat-message");
        socket.off("webrtc-signal");
        socket.off("party-error");
        disconnectSocket();
      }
      peersRef.current.forEach((peer) => { try { peer.destroy(); } catch {} });
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ─── Media controls ─────────────────────────────────────────────────────────
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  };

  const replaceVideoTrack = (track: MediaStreamTrack) => {
    peersRef.current.forEach((peer: any) => {
      const pc = peer._pc as RTCPeerConnection | undefined;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(track).catch(() => {});
      }
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) replaceVideoTrack(camTrack);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        replaceVideoTrack(screenTrack);
        screenTrack.onended = () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack) replaceVideoTrack(camTrack);
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch {
        toast.error("Could not start screen sharing.");
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!isHost) return;
      const cameraStream = localStreamRef.current;
      if (!cameraStream) { toast.error("No media stream to record."); return; }
      const stream = new MediaStream([
        ...(screenStreamRef.current?.getVideoTracks() || cameraStream.getVideoTracks()),
        ...cameraStream.getAudioTracks(),
      ]);
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `watch-party-${roomId}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        toast.success("Recording saved!");
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast("🔴 Recording started");
    }
  };

  const handleLeave = () => router.push("/");

  const handleSendMessage = (message: string) => {
    socketRef.current?.emit("chat-message", {
      roomId,
      message,
      userName: user?.name || "Guest",
      userId: user?._id || "anonymous",
    });
  };

  const handleVideoSync = (state: { playing: boolean; currentTime: number }) => {
    if (!isHost) return;
    socketRef.current?.emit("video-sync", { roomId, state });
  };

  const copyInviteLink = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/watch-party/${roomId}${videoId ? `?videoId=${videoId}` : ""}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied!"));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold tracking-wide">Watch Party</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-gray-800 rounded px-3 py-1 text-sm text-gray-300 font-mono">
            #{roomId}
          </div>
          {isHost && (
            <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            {participants.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyInviteLink}
            className="text-blue-400 hover:text-blue-300 hover:bg-gray-800 gap-1.5 text-sm"
          >
            <Copy className="w-4 h-4" />
            Invite
          </Button>
          <span
            className={`flex items-center gap-1 text-xs ${
              isConnected ? "text-green-400" : "text-red-400"
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: video + controls + chat */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Synced video player */}
          <div className="flex-1 bg-black min-h-0">
            {videoData ? (
              <SyncedVideoPlayer
                video={videoData}
                videoSyncState={videoSyncState}
                canControl={isHost}
                onSync={handleVideoSync}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-gray-600 gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-3xl">🎬</div>
                <p>{videoId ? "Loading video…" : "No video in this room"}</p>
              </div>
            )}
          </div>

          {/* Call controls */}
          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            isHost={isHost}
            participants={participants}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreen={toggleScreenShare}
            onToggleRecord={toggleRecording}
            onLeave={handleLeave}
          />

          {/* Chat */}
          <div className="h-60 border-t border-gray-800 shrink-0">
            <PartyChat
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              currentUserId={user?._id || "anonymous"}
            />
          </div>
        </div>

        {/* Right: participant cameras */}
        <div className="w-72 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 text-sm font-medium text-gray-400 shrink-0">
            Participants · {participants.length}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <VideoCallPanel
              localVideoRef={localVideoRef}
              remoteStreams={remoteStreams}
              remoteNames={remoteNames}
              participants={participants}
              mySocketId={mySocketId}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
