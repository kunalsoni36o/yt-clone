import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const categoryKeywords: { [key: string]: string[] } = {
  Music: ["music", "song", "audio", "sing", "concert", "singer", "band", "beat", "melody"],
  Gaming: ["game", "gaming", "play", "gameplay", "walkthrough", "stream", "xbox", "ps5", "nintendo", "pubg", "minecraft"],
  Movies: ["movie", "film", "cinema", "trailer", "teaser", "show", "series"],
  News: ["news", "report", "update", "politics", "world", "today", "breaking"],
  Sports: ["sport", "football", "soccer", "cricket", "match", "game", "league", "cup", "player", "athlete", "tennis"],
  Technology: ["tech", "technology", "phone", "review", "tutorial", "code", "dev", "ai", "hardware", "software"],
  Comedy: ["comedy", "funny", "joke", "prank", "laugh", "meme"],
  Education: ["education", "tutorial", "learn", "how to", "course", "class", "study"],
  Science: ["science", "physics", "chemistry", "space", "lab", "research", "experiment"],
  Travel: ["travel", "vlog", "trip", "tour", "explore", "world", "flight"],
  Food: ["food", "cook", "cooking", "recipe", "kitchen", "chef", "eat", "restaurant"],
  Fashion: ["fashion", "style", "wear", "makeup", "dress", "outfit"],
};

interface VideogridProps {
  activeCategory: string;
}

const Videogrid = ({ activeCategory }: VideogridProps) => {
  const [videos, setvideo] = useState<any[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setvideo(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  useEffect(() => {
    if (activeCategory === "All") {
      setFilteredVideos(videos);
      return;
    }

    const keywords = categoryKeywords[activeCategory] || [];
    const filtered = videos.filter((video) => {
      const title = (video.videotitle || "").toLowerCase();
      const desc = (video.description || "").toLowerCase();
      const channel = (video.videochanel || "").toLowerCase();
      return keywords.some(
        (kw) => title.includes(kw) || desc.includes(kw) || channel.includes(kw)
      );
    });
    setFilteredVideos(filtered);
  }, [activeCategory, videos]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <>Loading..</>
      ) : filteredVideos.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          No videos available in this category.
        </div>
      ) : (
        filteredVideos.map((video: any) => <Videocard key={video._id} video={video} />)
      )}
    </div>
  );
};

export default Videogrid;
