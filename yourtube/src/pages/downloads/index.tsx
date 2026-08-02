import { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { Play, Download, Video, Trash2, ArrowUpCircle, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface DownloadSummary {
  plan: string;
  downloadLimit: number | string;
  downloadsToday: number;
  remainingToday: number | string;
}

export default function DownloadsPage() {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [summary, setSummary] = useState<DownloadSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDownloadsAndSummary = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    try {
      const [resDownloads, resSummary] = await Promise.all([
        axiosInstance.get(`/download/user/${user._id}`),
        axiosInstance.get(`/download/summary/${user._id}`),
      ]);
      setDownloads(resDownloads.data);
      setSummary(resSummary.data);
    } catch (error) {
      console.error("Failed to load downloads data:", error);
      toast.error("Failed to fetch downloaded videos list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloadsAndSummary();
  }, [user?._id]);

  const handleDownloadFile = async (downloadItem: any) => {
    try {
      toast.loading("Starting file download...", { id: "redownload" });
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const filepath = downloadItem.videoDetails?.filepath || "";
      const videoUrl = filepath.startsWith("http")
        ? filepath
        : `${backendUrl}/${filepath}`;

      const fileRes = await fetch(videoUrl);
      if (!fileRes.ok) {
        throw new Error(`HTTP ${fileRes.status}`);
      }

      const blob = await fileRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadItem.videoDetails?.videotitle || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Download completed!", { id: "redownload" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download file.", { id: "redownload" });
    }
  };

  const handleDeleteDownload = async (id: string) => {
    try {
      await axiosInstance.delete(`/download/${id}`);
      setDownloads((prev) => prev.filter((d) => d._id !== id));
      toast.success("Removed from downloads list.");
    } catch (error) {
      console.error("Failed to delete download:", error);
      toast.error("Failed to remove video from downloads.");
    }
  };

  if (!user) {
    return (
      <main className="flex-1 p-6 bg-background min-h-screen flex flex-col items-center justify-center">
        <div className="text-center p-8 bg-card border border-border rounded-xl shadow-sm max-w-md">
          <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in to view downloads</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Keep track of your downloaded videos, daily download limits, and offline content.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 bg-background text-foreground min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <HardDriveDownload className="w-8 h-8 text-red-600" />
              Your Downloads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your downloaded videos and check your plan's daily quota.
            </p>
          </div>

          <Link href="/plans">
            <Button variant="outline" className="flex items-center gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10">
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade Plan
            </Button>
          </Link>
        </div>

        {/* Quota Summary Banner */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Current Plan</span>
              <span className="text-lg font-bold capitalize text-red-600">{summary.plan}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Daily Limit</span>
              <span className="text-lg font-bold">{summary.downloadLimit} {typeof summary.downloadLimit === "number" ? "vids/day" : ""}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Downloaded Today</span>
              <span className="text-lg font-bold">{summary.downloadsToday}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Remaining Today</span>
              <span className="text-lg font-bold text-emerald-500">{summary.remainingToday}</span>
            </div>
          </div>
        )}

        {/* Downloads list */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading downloads list...</div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-xs">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No downloads yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Start downloading videos from watch pages.</p>
            <Link href="/">
              <Button variant="secondary">Browse Videos</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <ul className="divide-y divide-border">
              {downloads.map((item) => (
                <li key={item._id} className="p-4 sm:p-5 hover:bg-muted/40 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-600/10 text-red-600 rounded-lg shrink-0 mt-1 sm:mt-0">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <Link href={`/watch/${item.videoId}`} className="font-semibold text-foreground hover:text-red-600 transition">
                          {item.videoDetails?.videotitle || "Untitled Video"}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Channel: <span className="font-medium text-foreground">{item.videoDetails?.videochanel || "Unknown"}</span>
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          <span>Downloaded {formatDistanceToNow(new Date(item.downloadDate))} ago</span>
                          <span>•</span>
                          <span>Plan used: <strong className="capitalize text-foreground">{item.userPlan}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link href={`/watch/${item.videoId}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                          <Play className="w-4 h-4" /> Play
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadFile(item)}
                        className="flex items-center gap-1"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDownload(item._id)}
                        className="text-muted-foreground hover:text-red-600"
                        title="Remove download"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
