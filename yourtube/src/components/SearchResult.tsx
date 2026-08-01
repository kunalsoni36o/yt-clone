import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";

const SearchResult = ({ query }: any) => {
  // ── Hooks must come before any early return (Rules of Hooks) ──────────────
  const [video, setvideos] = useState<any[] | null>(null);

  useEffect(() => {
    if (!query?.trim()) {
      setvideos([]);
      return;
    }
    const fetchAndFilterVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVideos = Array.isArray(res.data) ? res.data : [];
        const results = allVideos.filter(
          (vid: any) =>
            vid.videotitle.toLowerCase().includes(query.toLowerCase()) ||
            vid.videochanel.toLowerCase().includes(query.toLowerCase())
        );
        setvideos(results);
      } catch (error) {
        console.error("Error searching videos:", error);
        setvideos([]);
      }
    };
    fetchAndFilterVideos();
  }, [query]);

  // ── Guards after hooks ────────────────────────────────────────────────────
  if (!query?.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Searching…</p>
      </div>
    );
  }

  if (video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Results */}
      <div className="space-y-4">
        {video.map((vid: any) => (
          <div key={vid._id} className="flex gap-4 group">
            <Link href={`/watch/${vid._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={vid.filepath?.startsWith("http") ? vid.filepath : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${vid.filepath}`}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${vid._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {vid.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{vid.views.toLocaleString()} views</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(vid.createdAt))} ago
                </span>
              </div>

              <Link
                href={`/channel/${vid.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {vid.videochanel[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  {vid.videochanel}
                </span>
              </Link>

              {vid.description ? (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {vid.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600">
          Showing {video.length} result{video.length !== 1 ? "s" : ""} for &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;
