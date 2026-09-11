import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLazyGetThreadsQuery } from "../../services/professional/professionalMessagesApi";
import type { Thread } from "../../types/chat.types";
import GradientContainer from "../common/GradientContainer";

export function RecentMessages() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [fetchThreads, { isLoading }] = useLazyGetThreadsQuery();

  useEffect(() => {
    const loadThreads = async () => {
      try {
        const result = await fetchThreads({ limit: 5 }).unwrap();
        if (result.success && result.data) {
          setThreads(result.data.slice(0, 5)); // Only show 5 recent messages
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
      }
    };

    loadThreads();
  }, [fetchThreads]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMessagePreview = (thread: Thread) => {
    const lastMessage = thread.lastMessage;
    if (!lastMessage) return "No messages yet";
    switch (lastMessage.type) {
      case "TEXT":
        return lastMessage.text || "";
      case "IMAGE":
        return "📷 Photo";
      case "FILE":
        return "📎 File";
      case "VIDEO":
        return "🎥 Video";
      default:
        return "Message";
    }
  };

  if (isLoading) {
    return (
      <GradientContainer>
        <div className="rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Messages</h3>
          </div>
          <div className="text-gray-400 text-sm text-center py-4">Loading...</div>
        </div>
      </GradientContainer>
    );
  }

  return (
    <GradientContainer>
      <div className="rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Messages</h3>
          <button
            onClick={() => navigate("/professional/messages")}
            className="text-[#D85D27] hover:text-[#C24F20] text-sm font-medium transition-colors"
          >
            View all
          </button>
        </div>

        {threads.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => {
              const peerInfo = thread.peer;
              const lastMessage = thread.lastMessage;

              return (
                <button
                  key={thread._id}
                  onClick={() => navigate(`/professional/messages/${thread._id}`)}
                  className="w-full flex items-start gap-3 p-2 hover:bg-[#0f1419] rounded-lg transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                      {peerInfo?.photoUrlDecrypted || peerInfo?.photoUrl ? (
                        <img
                          src={peerInfo.photoUrlDecrypted || peerInfo.photoUrl}
                          alt={peerInfo.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {(peerInfo?.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {peerInfo?.online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#161b22]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white text-sm font-medium truncate">{peerInfo?.name || "Unknown"}</span>
                      <span className="text-gray-500 text-xs shrink-0 ml-2">
                        {lastMessage ? formatTime(lastMessage.sentAt) : ""}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs truncate">{getMessagePreview(thread)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GradientContainer>
  );
}
