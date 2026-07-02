import React, { useRef, useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  message: string;
  userName: string;
  userId: string;
  socketId: string;
  timestamp: string;
  isSystem?: boolean;
}

interface PartyChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
}

export default function PartyChat({
  messages,
  onSendMessage,
  currentUserId,
}: PartyChatProps) {
  const [typedMessage, setTypedMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    onSendMessage(typedMessage.trim());
    setTypedMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-b border-gray-800">
      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-[11px] bg-gray-850 text-gray-400 px-3 py-1 rounded-full border border-gray-800 inline-block font-medium">
                  {msg.message}
                </span>
              </div>
            );
          }

          const isMe = msg.userId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                isMe ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <span className="text-[10px] text-gray-500 mb-0.5 px-1 font-semibold">
                {isMe ? "You" : msg.userName}
              </span>
              <div
                className={`px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-red-600 text-white rounded-tr-none"
                    : "bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700"
                }`}
              >
                <p className="break-words whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-gray-900 border-t border-gray-800 flex items-center gap-2 shrink-0"
      >
        <Input
          type="text"
          placeholder="Send a message to the party..."
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 rounded-full focus-visible:ring-red-500 h-9"
        />
        <Button
          type="submit"
          disabled={!typedMessage.trim()}
          size="icon"
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white rounded-full shrink-0 w-9 h-9"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
