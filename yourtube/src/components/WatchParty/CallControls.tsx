import React from "react";
import { Button } from "../ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Radio,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Participant {
  socketId: string;
  name: string;
  userId: string;
  isHost: boolean;
}

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHost: boolean;
  participants: Participant[];
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onToggleRecord: () => void;
  onLeave: () => void;
}

export default function CallControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isRecording,
  isHost,
  participants,
  onToggleMute,
  onToggleVideo,
  onToggleScreen,
  onToggleRecord,
  onLeave,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800 shrink-0">
      <div className="flex items-center gap-2">
        {/* Participants list trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-850 gap-1.5">
              <Users className="w-4 h-4" />
              <span>Participants ({participants.length})</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-gray-900 border-gray-800 text-white" align="start">
            <DropdownMenuLabel>Party Members</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            {participants.map((p) => (
              <DropdownMenuItem key={p.socketId} className="flex items-center justify-between hover:bg-gray-800 focus:bg-gray-800">
                <span className="truncate pr-2">{p.name}</span>
                {p.isHost && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5">
                    Host
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Call controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          onClick={onToggleMute}
          className="rounded-full w-10 h-10"
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="icon"
          onClick={onToggleVideo}
          className="rounded-full w-10 h-10"
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          onClick={onToggleScreen}
          className={`rounded-full w-10 h-10 ${isScreenSharing ? "bg-green-600 hover:bg-green-700" : ""}`}
          title="Share Screen"
        >
          <Monitor className="w-5 h-5" />
        </Button>

        {isHost && (
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="icon"
            onClick={onToggleRecord}
            className={`rounded-full w-10 h-10 ${isRecording ? "animate-pulse" : ""}`}
            title={isRecording ? "Stop Recording" : "Record Session"}
          >
            <Radio className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex items-center">
        <Button
          variant="destructive"
          onClick={onLeave}
          className="bg-red-600 hover:bg-red-700 gap-1.5 px-4 rounded-full text-xs font-semibold uppercase tracking-wider"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Leave</span>
        </Button>
      </div>
    </div>
  );
}
