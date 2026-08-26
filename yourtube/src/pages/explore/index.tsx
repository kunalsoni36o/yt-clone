import React, { useEffect, useState } from "react";
import { TrendingUp, Music, Gamepad2, Film, Newspaper, Trophy, Compass } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import VideoCard from "@/components/videocard";
import { Button } from "@/components/ui/button";

const exploreCategories = [
  { id: "trending", name: "Trending", icon: TrendingUp, keywords: [] },
  { id: "music", name: "Music", icon: Music, keywords: ["music", "song", "audio", "sing", "concert", "singer", "band", "beat", "melody"] },
  { id: "gaming", name: "Gaming", icon: Gamepad2, keywords: ["game", "gaming", "play", "gameplay", "walkthrough", "stream", "xbox", "ps5", "nintendo", "pubg", "minecraft"] },
  { id: "movies", name: "Movies", icon: Film, keywords: ["movie", "film", "cinema", "trailer", "teaser", "show", "series"] },
  { id: "news", name: "News", icon: Newspaper, keywords: ["news", "report", "update", "politics", "world", "today", "breaking"] },
  { id: "sports", name: "Sports", icon: Trophy, keywords: ["sport", "football", "soccer", "cricket", "match", "game", "league", "cup", "player", "athlete", "tennis"] },
];

export default function ExplorePage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("trending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVideos = Array.isArray(res.data) ? res.data : [];
        // Default sort by views descending (Trending)
        const sortedVideos = [...allVideos].sort((a, b) => (b.views || 0) - (a.views || 0));
        setVideos(sortedVideos);
        setFilteredVideos(sortedVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  useEffect(() => {
    if (activeCategory === "trending") {
      setFilteredVideos([...videos].sort((a, b) => (b.views || 0) - (a.views || 0)));
      return;
    }

    const category = exploreCategories.find((c) => c.id === activeCategory);
    if (!category) return;

    const filtered = videos.filter((video) => {
      const title = (video.videotitle || "").toLowerCase();
      const desc = (video.description || "").toLowerCase();
      const channel = (video.videochanel || "").toLowerCase();
      return category.keywords.some(
        (kw) => title.includes(kw) || desc.includes(kw) || channel.includes(kw)
      );
    });

    setFilteredVideos(filtered);
  }, [activeCategory, videos]);

  return (
    <main className="flex-1 p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Compass className="w-8 h-8 text-red-500" />
            Explore
          </h1>
          <p className="text-muted-foreground mt-1">Discover trending and categorized content</p>
        </div>

        {/* Explore Categories Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {exploreCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                className={`h-20 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md scale-102"
                    : "hover:bg-accent hover:text-accent-foreground border-border"
                }`}
                onClick={() => setActiveCategory(category.id)}
              >
                <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold">{category.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Videos Grid Section */}
        <div className="pt-4 border-t border-border">
          <h2 className="text-xl font-semibold mb-6 capitalize text-foreground">
            {activeCategory === "trending" ? "Trending Videos" : `${activeCategory} Videos`}
          </h2>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading explore feed...</div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16 bg-accent/20 rounded-xl border border-dashed border-border">
              <Compass className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No videos found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                There are no videos matching the {activeCategory} category keywords right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
