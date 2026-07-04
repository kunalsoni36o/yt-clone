import { io } from "socket.io-client";

let socket = null;

/**
 * Returns a singleton socket.io-client instance.
 * Safe to call multiple times — always returns the same socket.
 * Returns null during SSR (server-side rendering).
 */
export const getSocket = () => {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
