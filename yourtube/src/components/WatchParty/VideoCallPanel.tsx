import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface Participant {
  socketId: string;
  name: string;
  userId: string;
  isHost: boolean;
}

interface VideoCallPanelProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: Map<string, MediaStream>;
  remoteNames: Map<string, string>;
  participants: Participant[];
  mySocketId: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

const RemoteVideoCard = ({
  stream,
  name,
  isHost,
}: {
  stream: MediaStream;
  name: string;
  isHost: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-xs text-white flex items-center gap-1.5">
        <span className="truncate max-w-[120px]">{name}</span>
        {isHost && <span className="text-yellow-400">👑</span>}
      </div>
    </div>
  );
};

export default function VideoCallPanel({
  localVideoRef,
  remoteStreams,
  remoteNames,
  participants,
  mySocketId,
  isMuted,
  isVideoOff,
}: VideoCallPanelProps) {
  const myName = participants.find((p) => p.socketId === mySocketId)?.name || "You";
  const myIsHost = participants.find((p) => p.socketId === mySocketId)?.isHost || false;

  return (
    <div className="space-y-3">
      {/* Own Video Feed */}
      <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
        />
        {isVideoOff && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-lg bg-gray-700 text-white">
                {myName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-xs text-white flex items-center gap-1.5">
          <span className="truncate max-w-[120px]">{myName} (You)</span>
          {myIsHost && <span className="text-yellow-400">👑</span>}
          {isMuted && <span className="text-red-400 text-[10px]">🎙️ Muted</span>}
        </div>
      </div>

      {/* Remote Video Feeds */}
      {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
        const pName = remoteNames.get(socketId) || "Guest";
        const isParticipantHost = participants.find((p) => p.socketId === socketId)?.isHost || false;

        return (
          <RemoteVideoCard
            key={socketId}
            stream={stream}
            name={pName}
            isHost={isParticipantHost}
          />
        );
      })}
    </div>
  );
}
