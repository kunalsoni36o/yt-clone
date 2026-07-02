import dynamic from "next/dynamic";
import { useRouter } from "next/router";

// Load the layout client-side only (WebRTC + socket.io require browser APIs)
const WatchPartyLayout = dynamic(
  () => import("@/components/WatchParty/WatchPartyLayout"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Setting up your Watch Party…</p>
      </div>
    ),
  }
);

export default function WatchPartyPage() {
  const router = useRouter();
  const { roomId } = router.query;

  if (!roomId || typeof roomId !== "string") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <WatchPartyLayout roomId={roomId} />;
}
