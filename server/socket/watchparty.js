import WatchParty from "../Modals/watchparty.js";

const rooms = new Map();
const MAX_PARTICIPANTS = 12;
const MAX_CHAT_HISTORY = 100;
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{3,80}$/;

const cleanText = (value, maxLength) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);

const buildParticipantList = (room) =>
  Array.from(room.participants.entries()).map(([socketId, info]) => ({
    socketId,
    name: info.name,
    userId: info.userId,
    isHost: socketId === room.host,
  }));

const sendError = (socket, message) => socket.emit("party-error", { message });

export const initWatchParty = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", async ({ roomId, videoId, userId, userName } = {}) => {
      try {
        roomId = cleanText(roomId, 80);
        if (!ROOM_ID_PATTERN.test(roomId)) return sendError(socket, "Invalid room ID.");
        if (socket.data.roomId) return sendError(socket, "You already joined a room.");

        let room = rooms.get(roomId);
        let storedRoom = await WatchParty.findOne({ roomId }).lean();

        if (!room) {
          room = {
            videoId: cleanText(storedRoom?.videoId || videoId, 100),
            host: socket.id,
            hostUserId: cleanText(storedRoom?.hostUserId || userId || "anonymous", 100),
            participants: new Map(),
            videoState: storedRoom?.videoState || { playing: false, currentTime: 0 },
          };
          rooms.set(roomId, room);
        }

        if (room.participants.size >= MAX_PARTICIPANTS) {
          return sendError(socket, "This watch party is full.");
        }

        const participant = {
          name: cleanText(userName || "Guest", 80) || "Guest",
          userId: cleanText(userId || "anonymous", 100) || "anonymous",
        };
        room.participants.set(socket.id, participant);
        socket.data.roomId = roomId;
        socket.join(roomId);

        if (!storedRoom) {
          storedRoom = await WatchParty.create({
            roomId,
            videoId: room.videoId,
            hostUserId: room.hostUserId,
            videoState: room.videoState,
          });
        } else {
          await WatchParty.updateOne({ roomId }, { $set: { lastActiveAt: new Date() } });
        }

        const participants = buildParticipantList(room);
        socket.emit("room-joined", {
          roomId,
          videoId: room.videoId,
          videoState: room.videoState,
          participants,
          chatMessages: storedRoom.chatMessages?.slice(-MAX_CHAT_HISTORY) || [],
          hostSocketId: room.host,
          isHost: room.host === socket.id,
        });
        socket.to(roomId).emit("user-joined", {
          socketId: socket.id,
          ...participant,
          participants,
        });
      } catch (error) {
        console.error("[WatchParty] Join failed:", error.message);
        sendError(socket, "Could not join the watch party.");
      }
    });

    socket.on("video-sync", async ({ roomId, state } = {}) => {
      const room = rooms.get(roomId);
      if (!room || room.host !== socket.id) return sendError(socket, "Only the host can control playback.");

      const currentTime = Number(state?.currentTime);
      if (!Number.isFinite(currentTime) || currentTime < 0) return;
      room.videoState = { playing: Boolean(state?.playing), currentTime };
      socket.to(roomId).emit("video-sync", { state: room.videoState, from: socket.id });
      await WatchParty.updateOne(
        { roomId },
        { $set: { videoState: room.videoState, lastActiveAt: new Date() } }
      ).catch((error) => console.error("[WatchParty] Sync persistence failed:", error.message));
    });

    socket.on("chat-message", async ({ roomId, message } = {}) => {
      const room = rooms.get(roomId);
      const participant = room?.participants.get(socket.id);
      message = cleanText(message, 1000);
      if (!room || !participant || !message) return;
      const now = Date.now();
      if (now - (socket.data.lastChatAt || 0) < 500) {
        return sendError(socket, "Please wait before sending another message.");
      }
      socket.data.lastChatAt = now;

      const chatMessage = {
        id: `${now}-${Math.random().toString(36).slice(2)}`,
        message,
        userName: participant.name,
        userId: participant.userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      };
      io.to(roomId).emit("chat-message", chatMessage);
      await WatchParty.updateOne(
        { roomId },
        {
          $push: { chatMessages: { $each: [chatMessage], $slice: -MAX_CHAT_HISTORY } },
          $set: { lastActiveAt: new Date() },
        }
      ).catch((error) => console.error("[WatchParty] Chat persistence failed:", error.message));
    });

    socket.on("webrtc-signal", ({ roomId, to, signal } = {}) => {
      const room = rooms.get(roomId);
      if (
        !room ||
        !room.participants.has(socket.id) ||
        !room.participants.has(to) ||
        !signal ||
        to === socket.id
      ) return;
      io.to(to).emit("webrtc-signal", { signal, from: socket.id });
    });

    socket.on("leave-room", ({ roomId } = {}) => handleLeave(socket, roomId, io));
    socket.on("disconnect", () => handleLeave(socket, socket.data.roomId, io));
  });
};

function handleLeave(socket, roomId, io) {
  const room = rooms.get(roomId);
  if (!room?.participants.has(socket.id)) return;

  const leavingUser = room.participants.get(socket.id);
  room.participants.delete(socket.id);
  socket.data.roomId = undefined;
  socket.leave(roomId);

  if (room.participants.size === 0) {
    rooms.delete(roomId);
    return;
  }

  if (room.host === socket.id) {
    room.host = room.participants.keys().next().value;
    room.hostUserId = room.participants.get(room.host)?.userId || "anonymous";
    io.to(roomId).emit("host-changed", { newHostSocketId: room.host });
    WatchParty.updateOne(
      { roomId },
      { $set: { hostUserId: room.hostUserId, lastActiveAt: new Date() } }
    ).catch((error) => console.error("[WatchParty] Host persistence failed:", error.message));
  }

  io.to(roomId).emit("user-left", {
    socketId: socket.id,
    name: leavingUser.name,
    participants: buildParticipantList(room),
  });
}
