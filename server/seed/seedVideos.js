/**
 * seedVideos.js — Run once: node seed/seedVideos.js
 * Downloads royalty-free sample MP4s, uploads them to Cloudinary,
 * then inserts Video documents into MongoDB.
 */

import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import Video from "../Modals/video.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Publicly accessible sample videos (no auth, no geo-restriction)
const DEMO_VIDEOS = [
  {
    videotitle:  "Big Buck Bunny",
    videochanel: "Blender Foundation",
    description: "A large and lovable rabbit deals with three tiny bullies. The world's most beloved open-source animated short film.",
    isPremium:   false,
    url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  },
  {
    videotitle:  "Sample Nature Video",
    videochanel: "Nature Channel",
    description: "Breathtaking nature footage showcasing the beauty of our planet. Relax and enjoy the serene landscapes.",
    isPremium:   false,
    url: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
  },
  {
    videotitle:  "Tech Conference Talk",
    videochanel: "TechTalks Premium",
    description: "An exclusive premium recording from a top industry conference. Deep insights on the future of technology.",
    isPremium:   true,
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    videotitle:  "Adventure Documentary",
    videochanel: "Adventure Network",
    description: "A premium behind-the-scenes look at adventurers pushing the limits. Shot in stunning 4K quality.",
    isPremium:   true,
    url: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
  },
  {
    videotitle:  "Music Visualizer Demo",
    videochanel: "Visual Arts Studio",
    description: "A stunning audio-visual experience. Watch music come to life through beautiful motion graphics.",
    isPremium:   false,
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
];

function downloadFile(url, dest) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
        redirect: "follow",
      });
      if (!res.ok) { reject(new Error(`HTTP ${res.status}`)); return; }
      const fileStream = createWriteStream(dest);
      const reader = res.body.getReader();
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) { fileStream.end(); resolve(dest); return; }
        fileStream.write(Buffer.from(value));
        await pump();
      };
      await pump();
    } catch (e) { reject(e); }
  });
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.DB_URL, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected.\n");

  const existing = await Video.countDocuments({ uploader: "seed-script" });
  if (existing > 0) {
    console.log(`${existing} seed videos already exist. Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const tmpDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  for (const demo of DEMO_VIDEOS) {
    const tmpPath = path.join(tmpDir, `${Date.now()}.mp4`);
    try {
      console.log(`Downloading "${demo.videotitle}"...`);
      await downloadFile(demo.url, tmpPath);
      const size = fs.statSync(tmpPath).size;
      console.log(`  Downloaded ${(size / 1024).toFixed(0)} KB`);

      console.log(`  Uploading to Cloudinary...`);
      const result = await cloudinary.uploader.upload(tmpPath, {
        folder:        "yourtube/videos",
        resource_type: "video",
        public_id:     `${Date.now()}-${demo.videotitle.replace(/\s+/g, "_")}`,
      });
      console.log(`  ✔ Cloudinary URL: ${result.secure_url}`);

      await Video.create({
        videotitle:  demo.videotitle,
        filename:    demo.videotitle.replace(/\s+/g, "_") + ".mp4",
        filepath:    result.secure_url,
        filetype:    "video/mp4",
        filesize:    result.bytes || size,
        videochanel: demo.videochanel,
        description: demo.description,
        isPremium:   demo.isPremium,
        uploader:    "seed-script",
        views:       Math.floor(Math.random() * 80000) + 500,
        Like:        Math.floor(Math.random() * 8000) + 50,
      });
      console.log(`  ✔ Saved to MongoDB.\n`);
    } catch (err) {
      console.error(`  ✖ ERROR with "${demo.videotitle}": ${err.message}\n`);
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  try { fs.rmdirSync(tmpDir); } catch (_) {}

  console.log("Seeding complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
