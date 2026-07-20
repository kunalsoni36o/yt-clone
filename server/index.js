import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import subscriptionroutes from "./routes/subscription.js";
import { initWatchParty } from "./socket/watchparty.js";

dotenv.config();
const app = express();
import path from "path";

const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";
app.use(cors({
  origin: clientOrigin,
  credentials: true
}));
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));

app.get("/", (req, res) => {
  res.send("You tube backend is working");
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/subscription", subscriptionroutes);

// Wrap express with an http.Server so socket.io can attach
const httpServer = createServer(app);

// Attach socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
});

initWatchParty(io);

const PORT = process.env.PORT || 5000;
const DBURL = process.env.DB_URL;

const startServer = async () => {
  if (!DBURL) {
    throw new Error("DB_URL is missing. Add it to server/.env");
  }

  await mongoose.connect(DBURL, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("MongoDB connected");

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
