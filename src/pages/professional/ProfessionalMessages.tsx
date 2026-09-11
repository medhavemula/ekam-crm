import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProfessionalLayout } from "../../components/professional/ProfessionalLayout";
import GradientContainer from "../../components/common/GradientContainer";
import { socketService } from "../../services/socketService";
import { useChatThreads } from "../../hooks/useChatThreads";
import { useChatMessages } from "../../hooks/useChatMessages";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { useMeQuery, useUsersMeQuery } from "../../services/authApi";
import { useProfessionalConnectionsListQuery } from "../../services/professional/professionalConnectionsApi";
import {
  useBlockThreadMutation,
  useCreateDirectThreadMutation,
  useGetPresignedUrlMutation,
} from "../../services/professional/professionalMessagesApi";
import { useBlockUserMutation, useReportContentMutation } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";
import type { ModerationReason } from "../../services/moderationApi";
import { useToast } from "../../components/toast/ToastProvider";
import type { Thread } from "../../types/chat.types";

const formatPresenceTime = (value?: string | Date | null) => {
  if (!value) return "Offline";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Offline";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  return `Last seen ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

function ProfessionalMessages() {
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId: string }>();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMessagesSettling, setIsMessagesSettling] = useState(false);
  const [pendingReportMessageId, setPendingReportMessageId] = useState<string | null>(null);
  const [isReportingMessage, setIsReportingMessage] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoStick, setAutoStick] = useState(true); // whether to keep auto-scrolling to bottom

  // Get current user - try both endpoints
  const { data: userData, isLoading: userLoading } = useMeQuery();
  const { data: usersMeData } = useUsersMeQuery();

  // Try to get user ID from different possible locations
  const currentUserId =
    userData?.data?._id ||
    (userData?.data as { id?: string })?.id ||
    usersMeData?.data?._id ||
    (usersMeData?.data as { id?: string })?.id ||
    "";
  const { showToast } = useToast();

  // Initialize socket connection when component mounts
  // Disconnect when component unmounts
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setConnectionError("No authentication token found");
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (...args: unknown[]) => {
      const reason = args[0] as string;
      setIsConnected(false);

      // Only show error for unexpected disconnects
      if (reason !== "io client disconnect") {
        setConnectionError(`Disconnected: ${reason}`);
      }
    };

    const handleConnectError = (...args: unknown[]) => {
      const error = args[0];
      const err = error as Error;
      setIsConnected(false);

      // Provide user-friendly error messages
      if (err.message === "MAX_CONNECTIONS_EXCEEDED") {
        setConnectionError("Too many connections. Please close other tabs or wait a moment.");
      } else if (err.message?.includes("unauthorized") || err.message?.includes("authentication")) {
        setConnectionError("Authentication failed. Please refresh the page.");
      } else {
        setConnectionError(`Connection error: ${err.message || "Unknown error"}`);
      }
    };

    // Register event listeners
    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("connect_error", handleConnectError);

    // Connect socket
    socketService.connect(token);
    setIsConnected(socketService.isConnected());

    // Cleanup: remove listeners and disconnect
    return () => {
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("connect_error", handleConnectError);

      // Disconnect socket (with delay to handle rapid navigation)
      socketService.disconnect();
    };
  }, []);

  const { threads, isLoading: threadsLoading, addThread, clearUnreadCount } = useChatThreads(selectedThread?._id);

  // Load messages for selected thread
  const { messages, hasMore, isLoadingMore, loadMoreMessages, sendMessage } = useChatMessages(
    selectedThread?._id || null,
    currentUserId,
  );
  const latestMessageId = messages[messages.length - 1]?._id;
  const peerUserId =
    selectedThread?.peer?.id ||
    selectedThread?.participants.find((p) => p.userId !== currentUserId)?.userId ||
    null;
  const latestPeerMessage = [...messages]
    .reverse()
    .find((message) => String(message.senderId) !== String(currentUserId));

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(selectedThread?._id || null, currentUserId);

  // Get connections list
  const { data: connectionsData, isLoading: isLoadingConnections } = useProfessionalConnectionsListQuery({
    type: "my",
    limit: 100,
  });

  // Create direct thread
  const [createDirectThread, { isLoading: isCreatingThread }] = useCreateDirectThreadMutation();
  const [blockThread, { isLoading: isBlockingThread }] = useBlockThreadMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [reportContent] = useReportContentMutation();

  // Get presigned URL for media upload
  const [getPresignedUrl] = useGetPresignedUrlMutation();

  // Filter connections based on search query
  const filteredConnections =
    connectionsData?.data?.filter((connection) =>
      connection.user.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  // Handle search visibility
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle token refresh - reconnect socket with new token
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" && e.newValue && e.newValue !== e.oldValue) {
        // Token was refreshed, update socket connection
        socketService.updateToken(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Helper: scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const c = messagesContainerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior });
  };

  // Opening/reopening a thread should always land on the latest message.
  // Repeat briefly so media loads and layout shifts cannot leave the view in the middle.
  useEffect(() => {
    if (!selectedThread?._id) return;

    setAutoStick(true);
    scrollToBottom("auto");
    setIsMessagesSettling(true);
    const timers = [
      setTimeout(() => scrollToBottom("auto"), 0),
      setTimeout(() => scrollToBottom("auto"), 80),
      setTimeout(() => scrollToBottom("auto"), 260),
      setTimeout(() => scrollToBottom("auto"), 600),
      setTimeout(() => scrollToBottom("auto"), 1000),
      setTimeout(() => scrollToBottom("smooth"), 1600),
      setTimeout(() => setIsMessagesSettling(false), 1900),
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [latestMessageId, selectedThread?._id]);

  // When images/videos load (height changes), keep pinned if autoStick
  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    if (!autoStick) return;
    const imgs = Array.from(c.querySelectorAll("img, video"));
    const onLoad = () => scrollToBottom("auto");
    imgs.forEach((el) => {
      // @ts-ignore
      el.addEventListener("load", onLoad, { once: true });
      // @ts-ignore
      el.addEventListener("loadeddata", onLoad, { once: true });
    });
    return () => {
      imgs.forEach((el) => {
        // @ts-ignore
        el.removeEventListener("load", onLoad);
        // @ts-ignore
        el.removeEventListener("loadeddata", onLoad);
      });
    };
  }, [messages, autoStick]);

  // Handle scroll (toggle autoStick and infinite scroll on top)
  const handleMessagesScroll = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - (c.scrollTop + c.clientHeight) < 120;
    setAutoStick(nearBottom);
    if (c.scrollTop <= 40 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  // Select thread based on URL parameter
  useEffect(() => {
    if (threadId && threads.length > 0) {
      const thread = threads.find((t) => t._id === threadId);
      if (thread) {
        setSelectedThread(thread);
      }
    }
  }, [threadId, threads]);

  // Show loading state while user data is loading
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex flex-col">
        <ProfessionalLayout breadcrumbs={[{ label: "Professional" }, { label: "Messages" }]}>
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-gray-400">Loading user data...</div>
          </div>
        </ProfessionalLayout>
      </div>
    );
  }

  // If no user ID after loading, show error
  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex flex-col">
        <ProfessionalLayout breadcrumbs={[{ label: "Professional" }, { label: "Messages" }]}>
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-red-400">Unable to load user data. Please refresh the page.</div>
          </div>
        </ProfessionalLayout>
      </div>
    );
  }

  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatClockTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const isSameDay = (date1: string, date2?: string) => {
    if (!date2) return false;
    return new Date(date1).toDateString() === new Date(date2).toDateString();
  };

  // Convert threads to conversation format
  const conversations = threads.map((thread) => {
    // Use peer object if available (for direct threads), otherwise find participant
    const peerInfo = thread.peer;
    const otherParticipant = peerInfo || thread.participants.find((p) => p.userId !== currentUserId);
    const lastMessage = thread.lastMessage;

    const getMessagePreview = () => {
      if (!lastMessage) return "No messages yet";
      const text = lastMessage.text?.trim();
      switch (lastMessage.type) {
        case "TEXT":
          return text || "";
        case "IMAGE":
          return text ? `Photo: ${text}` : "Photo";
        case "FILE":
          return text ? `File: ${text}` : "File";
        case "VIDEO":
          return text ? `Video: ${text}` : "Video";
        default:
          return text || "Message";
      }
    };

    return {
      id: thread._id,
      name: peerInfo?.name || otherParticipant?.name || "Unknown",
      lastMessage: getMessagePreview(),
      time: lastMessage ? formatTime(lastMessage.sentAt) : "",
      avatar:
        peerInfo?.photoUrlDecrypted ||
        peerInfo?.photoUrl ||
        (otherParticipant && "avatar" in otherParticipant ? otherParticipant.avatar : undefined),
      online: peerInfo?.online || false,
      unreadCount: thread.unreadCount || 0,
      thread: thread,
    };
  });

  const handleSendMessage = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || !selectedThread) return;

    setIsUploading(true);
    try {
      // Upload media files if any
      const uploadedMedia = await uploadMediaFiles();

      const clientId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine message type
      let messageType: "TEXT" | "IMAGE" | "VIDEO" | "FILE" = "TEXT";
      if (uploadedMedia.length > 0) {
        const firstMedia = uploadedMedia[0];
        if (firstMedia.mime.startsWith("image/")) messageType = "IMAGE";
        else if (firstMedia.mime.startsWith("video/")) messageType = "VIDEO";
        else messageType = "FILE";
      }

      sendMessage({
        clientId,
        type: messageType,
        text: messageText.trim() || undefined,
        mediaKey: uploadedMedia[0]?.key,
        mediaMeta: uploadedMedia[0]
          ? {
              key: uploadedMedia[0].key,
              mime: uploadedMedia[0].mime,
              size: uploadedMedia[0].size,
            }
          : undefined,
        mediaUrl: uploadedMedia[0]?.url,
      });

      setMessageText("");
      setSelectedFiles([]);
      sendTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConversationClick = (conversation: (typeof conversations)[0]) => {
    setSelectedThread({ ...conversation.thread, unreadCount: 0 });
    clearUnreadCount(conversation.thread._id);
    navigate(`/professional/messages/${conversation.thread._id}`);
  };

  const handleBackToList = () => {
    setSelectedThread(null);
    navigate("/professional/messages");
  };

  const handleReportConversation = () => {
    if (!latestPeerMessage?._id) {
      showToast({
        title: "No message to report",
        description: "Please report after the member has sent a message.",
        kind: "error",
      });
      return;
    }
    setPendingReportMessageId(latestPeerMessage._id);
  };

  const confirmReportConversation = async (reason: ModerationReason, details: string) => {
    if (!pendingReportMessageId) return;
    setIsReportingMessage(true);
    try {
      await reportContent({
        contentType: "CHAT_MESSAGE",
        contentId: pendingReportMessageId,
        targetUserId: peerUserId || undefined,
        contextId: selectedThread?._id,
        reason,
        details: details || undefined,
      }).unwrap();
      setPendingReportMessageId(null);
      showToast({
        title: "Report submitted",
        description: "This message is hidden for you while admin reviews it.",
        kind: "success",
      });
    } catch (error: any) {
      console.error("Failed to report message:", error);
      const serverMsg = error?.data?.message;
      if (error?.status === 409) {
        setPendingReportMessageId(null);
        showToast({
          title: "Already reported",
          description:
            serverMsg ||
            "You've already reported this member. Please wait until the review is complete before reporting again.",
          kind: "info",
        });
      } else {
        showToast({
          title: "Report failed",
          description: serverMsg || "Unable to submit the report. Please try again.",
          kind: "error",
        });
      }
    } finally {
      setIsReportingMessage(false);
    }
  };

  const handleBlockConversation = async () => {
    if (!selectedThread?._id || !peerUserId) return;
    try {
      await blockThread({ threadId: selectedThread._id }).unwrap();
      await blockUser({
        userId: peerUserId,
        reason: "HARASSMENT",
        sourceContentType: latestPeerMessage?._id ? "CHAT_MESSAGE" : undefined,
        sourceContentId: latestPeerMessage?._id,
      }).unwrap();
      showToast({
        title: "Member blocked",
        description: "Their messages are removed from your view and admin has been notified.",
        kind: "success",
      });
      handleBackToList();
    } catch (error) {
      console.error("Failed to block member:", error);
      showToast({
        title: "Block failed",
        description: "Unable to block this member. Please try again.",
        kind: "error",
      });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      sendTyping(true);
    } else {
      sendTyping(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const result = await createDirectThread({ peerId: userId }).unwrap();
      if (result.success && result.data) {
        // Add the new thread to the list immediately
        addThread(result.data);
        setSelectedThread(result.data);
        setSearchQuery("");
        setShowSearchResults(false);
        // Navigate to the thread URL
        navigate(`/professional/messages/${result.data._id}`);
      }
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSelectedFiles([file]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMediaFiles = async () => {
    if (selectedFiles.length === 0) return [];

    const uploadedMedia: Array<{ key: string; url: string; mime: string; size: number }> = [];

    for (const file of selectedFiles) {
      try {
        const presignResult = await getPresignedUrl({
          mime: file.type,
          size: file.size,
          kind: file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : "FILE",
        }).unwrap();

        if (presignResult.success && presignResult.data) {
          await fetch(presignResult.data.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          uploadedMedia.push({
            key: presignResult.data.key,
            url: presignResult.data.viewUrl,
            mime: file.type,
            size: file.size,
          });
        }
      } catch (error) {
        console.error("Failed to upload file:", file.name, error);
        const err = error as { data?: { message?: string } };
        if (err?.data?.message?.includes("credentials")) {
          alert("Media upload is not configured. Please contact support.");
        }
      }
    }

    return uploadedMedia;
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
      <ProfessionalLayout
        breadcrumbs={
          selectedThread
            ? [
                { label: "Professional", onClick: () => navigate("/professional/feed") },
                { label: "Messages", onClick: handleBackToList },
                {
                  label:
                    selectedThread.peer?.name ||
                    selectedThread.participants.find((p) => p.userId !== currentUserId)?.name ||
                    "Unknown",
                },
              ]
            : [{ label: "Professional", onClick: () => navigate("/professional/feed") }, { label: "Messages" }]
        }
      >
        <div className="flex flex-col lg:pr-1">
          {connectionError && (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-2 rounded-lg mb-4 text-sm flex items-start justify-between">
              <div className="flex-1">
                <span className="font-semibold">Connection issue:</span> {connectionError}
                {connectionError.includes("MAX_CONNECTIONS") && (
                  <div className="mt-2 text-xs">
                    This usually happens when you have multiple tabs open. Close other tabs and wait a moment, or
                    refresh this page.
                  </div>
                )}
                {connectionError.includes("Authentication") && (
                  <div className="mt-2 text-xs">Your session may have expired. Try refreshing the page.</div>
                )}
              </div>
              <button
                onClick={() => {
                  const token = localStorage.getItem("accessToken");
                  if (token) {
                    setConnectionError(null);
                    socketService.connect(token);
                  }
                }}
                className="ml-4 px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {!isConnected && !connectionError && (
            <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-2 rounded-lg mb-4 text-sm">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Connecting to chat server...</span>
              </div>
            </div>
          )}

          <div className="h-[calc(100vh-220px)]">
            <GradientContainer className="w-full h-full">
              <div className="bg-[#161b22] rounded-xl border border-gray-700 overflow-hidden h-full flex">
                {/* Left: Conversations */}
                <div
                  className={`${
                    selectedThread ? "hidden md:flex" : "flex"
                  } w-full md:w-4/12 flex-col border-r border-gray-700`}
                >
                  <div className="h-[72px] px-4 border-b border-gray-700 shrink-0 flex items-center" ref={searchRef}>
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search people to chat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0f1419] border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />

                      {showSearchResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#161b22] border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                          {isLoadingConnections ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Loading connections...</div>
                          ) : filteredConnections.length > 0 ? (
                            <>
                              {filteredConnections.map((connection) => (
                                <button
                                  key={connection.id}
                                  onClick={() => handleStartChat(connection.user.id)}
                                  disabled={isCreatingThread}
                                  className="w-full p-3 flex items-center gap-3 hover:bg-[#0f1419] transition-colors border-b border-gray-700 last:border-b-0 text-left cursor-pointer"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                    {connection.user.avatarUrl ? (
                                      <img
                                        src={connection.user.avatarUrl}
                                        alt={connection.user.name}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <span className="text-sm font-semibold text-gray-300">
                                        {connection.user.name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{connection.user.name}</p>
                                    {connection.user.headline && (
                                      <p className="text-gray-400 text-xs truncate">{connection.user.headline}</p>
                                    )}
                                    {connection.user.chapter && (
                                      <p className="text-gray-500 text-xs truncate">{connection.user.chapter}</p>
                                    )}
                                  </div>
                                  <div className="text-xs text-orange-500 shrink-0">Start Chat</div>
                                </button>
                              ))}
                            </>
                          ) : searchQuery.trim().length > 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                              No connections found matching "{searchQuery}"
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    {threadsLoading && conversations.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
                    ) : conversations.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-400">No conversations yet</div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => handleConversationClick(conversation)}
                          className={`w-full p-4 flex items-start gap-3 hover:bg-[#0f1419] transition-colors border-b border-gray-700 ${
                            selectedThread?._id === conversation.id ? "bg-[#0f1419]" : ""
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                              {conversation.avatar ? (
                                <img
                                  src={conversation.avatar}
                                  alt={conversation.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <span className="text-base font-semibold text-gray-300">
                                  {(conversation.name || "?").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {conversation.online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161b22]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white text-sm font-medium">{conversation.name}</span>
                              <span className="text-gray-500 text-xs">{conversation.time}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-gray-400 text-xs truncate flex-1 pr-2">{conversation.lastMessage}</p>
                              {conversation.unreadCount > 0 && (
                                <div className="min-w-[18px] h-[18px] bg-[#D85D27] rounded-full flex items-center justify-center flex-shrink-0 px-1">
                                  <span className="text-[10px] font-bold text-white leading-none">
                                    {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Chat */}
                <div
                  className={`${
                    selectedThread ? "flex" : "hidden md:flex"
                  } w-full md:w-8/12 flex-col`}
                >
                  {selectedThread ? (
                    <>
                      <div className="h-[72px] px-4 border-b border-gray-700 flex items-center gap-3">
                        <button onClick={handleBackToList} className="md:hidden text-gray-400 hover:text-white mr-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            {selectedThread.peer?.photoUrlDecrypted ||
                            selectedThread.peer?.photoUrl ||
                            selectedThread.participants.find((p) => p.userId !== currentUserId)?.avatar ? (
                              <img
                                src={
                                  selectedThread.peer?.photoUrlDecrypted ||
                                  selectedThread.peer?.photoUrl ||
                                  selectedThread.participants.find((p) => p.userId !== currentUserId)?.avatar ||
                                  ""
                                }
                                alt={selectedThread.peer?.name || "User"}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-gray-300">
                                {(
                                  selectedThread.peer?.name ||
                                  selectedThread.participants.find((p) => p.userId !== currentUserId)?.name ||
                                  "?"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          {selectedThread.peer?.online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#161b22]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white text-base font-semibold">
                            {selectedThread.peer?.name ||
                              selectedThread.participants.find((p) => p.userId !== currentUserId)?.name ||
                              "Unknown"}
                          </h3>
                          {typingUsers.length > 0 ? (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                              <span>typing</span>
                              <span className="flex items-center gap-0.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500" />
                              </span>
                            </div>
                          ) : selectedThread.peer?.online ? (
                            <p className="text-green-500 text-xs">Online</p>
                          ) : (
                            <p className="text-gray-500 text-xs">{formatPresenceTime(selectedThread.peer?.lastSeenAt)}</p>
                          )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={handleReportConversation}
                            className="rounded border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10"
                          >
                            Report
                          </button>
                          <button
                            type="button"
                            onClick={handleBlockConversation}
                            disabled={isBlockingThread || isBlockingUser}
                            className="rounded border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-60"
                          >
                            Block
                          </button>
                        </div>
                      </div>

                      <div
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        className="relative flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 [overflow-anchor:none]"
                      >
                        {(isMessagesSettling) && (
                          <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
                            <div className="mt-1 flex items-center gap-2 rounded-full border border-gray-700 bg-[#0f1419]/90 px-3 py-1.5 text-xs text-gray-300 shadow">
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-600 border-t-orange-500" />
                              <span>Jumping to latest...</span>
                            </div>
                          </div>
                        )}
                        {messages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          <>
                            {messages.map((message, msgIndex) => {
                              const showDateHeader =
                                msgIndex === 0 || !isSameDay(message.createdAt, messages[msgIndex - 1]?.createdAt);
                              const isOwn = message.senderId === currentUserId;
                              const senderName = isOwn
                                ? userData?.data?.name || "You"
                                : selectedThread.peer?.name ||
                                  selectedThread.participants.find((p) => p.userId === message.senderId)?.name ||
                                  "Unknown";

                              return (
                                <div key={message._id}>
                                  {showDateHeader && (
                                    <div className="my-4 flex items-center gap-3">
                                      <div className="h-px flex-1 bg-gray-700/80" />
                                      <span className="rounded-full border border-gray-700 bg-[#0f1419] px-3 py-1 text-xs font-medium text-gray-400">
                                        {formatDateHeader(message.createdAt)}
                                      </span>
                                      <div className="h-px flex-1 bg-gray-700/80" />
                                    </div>
                                  )}
                                  <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0 overflow-hidden">
                                      <span className="text-xs font-bold text-white">
                                        {(senderName || "?").charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white text-sm font-medium">{senderName}</span>
                                        <span className="text-gray-500 text-xs">{formatClockTime(message.createdAt)}</span>
                                        <span className="text-gray-600 text-xs">· {formatTime(message.createdAt)}</span>
                                        {!isOwn && (
                                          <button
                                            type="button"
                                            onClick={() => setPendingReportMessageId(message._id)}
                                            className="rounded border border-red-500/40 px-2 py-0.5 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
                                          >
                                            Report
                                          </button>
                                        )}
                                      </div>
                                      <div
                                        className={`rounded-2xl overflow-hidden ${
                                          isOwn
                                            ? "bg-gradient-to-r from-[#D85D27] to-[#E67E22] text-white rounded-br-md"
                                            : "bg-[#1f2937] text-gray-100 border border-gray-600 rounded-bl-md"
                                        }`}
                                      >
                                        {message.media && message.media.url && (
                                          <div className={message.text ? "p-2 pb-0" : "p-2"}>
                                            {message.type === "IMAGE" && (
                                              <img
                                                src={message.media.url}
                                                alt="Shared image"
                                                className="max-w-[min(20rem,70vw)] max-h-72 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                loading="lazy"
                                                onLoad={() => scrollToBottom("auto")}
                                                onClick={() => window.open(message.media?.url, "_blank")}
                                                onError={(e) => {
                                                  console.error("Failed to load image:", message.media?.url);
                                                  (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                              />
                                            )}
                                            {message.type === "VIDEO" && (
                                              <video
                                                controls
                                                className="max-w-[min(20rem,70vw)] max-h-72 rounded-lg"
                                                onLoadedData={() => scrollToBottom("auto")}
                                              >
                                                <source src={message.media.url} type={message.media.mime} />
                                                Your browser does not support the video tag.
                                              </video>
                                            )}
                                            {message.type === "FILE" && (
                                              <a
                                                href={message.media.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 min-w-56 max-w-[min(20rem,70vw)] p-3 bg-[#0f1419]/60 rounded-lg hover:bg-[#0f1419]/80 transition-colors"
                                              >
                                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium">Download File</p>
                                                  <p className="text-xs text-gray-400">
                                                    {message.media.size
                                                      ? `${(message.media.size / 1024).toFixed(1)} KB`
                                                      : "File"}
                                                  </p>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {message.text && <p className="px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>}
                                      </div>
                                      {message.status && isOwn && (
                                        <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                          {message.status === "sending" && "Sending..."}
                                          {message.status === "delivered" && "✓ Delivered"}
                                          {message.status === "seen" && <span className="text-blue-400">✓ Seen</span>}
                                          {message.status === "failed" && <span className="text-red-400">Failed</span>}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>

                      {!autoStick && (
                        <div className="absolute bottom-24 right-6 z-10">
                          <button
                            onClick={() => scrollToBottom("smooth")}
                            className="px-3 py-1.5 bg-[#0f1419]/80 border border-gray-700 text-gray-200 text-xs rounded-full shadow hover:bg-[#0f1419] transition-colors"
                          >
                            Jump to latest
                          </button>
                        </div>
                      )}

                      <div className="p-4 border-t border-gray-700">
                        {selectedFiles.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="relative bg-[#0f1419] border border-gray-700 rounded-lg p-2 flex items-center gap-2"
                              >
                                {file.type.startsWith("image/") ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                )}
                                <span className="text-xs text-gray-300 max-w-[100px] truncate">{file.name}</span>
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 items-end">
                          <textarea
                            placeholder="Write a message"
                            value={messageText}
                            onChange={(e) => {
                              handleTyping(e);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                                (e.target as HTMLTextAreaElement).style.height = "auto";
                              }
                            }}
                            disabled={isUploading}
                            rows={1}
                            className="flex-1 bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 resize-none min-h-[42px] max-h-32 overflow-y-auto"
                          ></textarea>
                          <button
                            onClick={handleSendMessage}
                            disabled={isUploading || (!messageText.trim() && selectedFiles.length === 0)}
                            className="px-6 py-2.5 bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? "Uploading..." : "Send"}
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 2L11 13" />
                              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*,.pdf,.doc,.docx"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="mt-3 text-gray-400 text-xs flex items-center gap-2 hover:text-gray-300 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                          Add Image/Video/File
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg
                          className="w-16 h-16 mx-auto mb-4 text-gray-600"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-sm">Select a conversation to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GradientContainer>
          </div>
        </div>
      </ProfessionalLayout>
      <ReportDialog
        isOpen={pendingReportMessageId !== null}
        onClose={() => setPendingReportMessageId(null)}
        onConfirm={confirmReportConversation}
        isSubmitting={isReportingMessage}
        contentLabel="message"
      />
    </div>
  );
}

export default ProfessionalMessages;
