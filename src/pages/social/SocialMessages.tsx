import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../app/store";
import { SocialLayout } from "../../components/social";
import { socketService } from "../../services/socketService";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { useMeQuery, useUsersMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";
import { ReportDialog } from "../../components/common/ReportDialog";
import type { ModerationReason } from "../../services/moderationApi";
import { useBlockUserMutation, useReportContentMutation } from "../../services/moderationApi";
import {
  socialMessagesApi,
  useGetSocialThreadsQuery,
  useGetSocialThreadQuery,
  useReplyToSocialThreadMutation,
  useGetUserSocialConnectionsQuery,
  useGetOrCreateSocialThreadMutation,
  useGetSocialPresignedUrlMutation,
} from "../../services/social";
import type { SocialMessage, SocialMessageThread } from "../../services/social/socialMessagesApi";

const SOCIAL_MEDIA_BODY_PREFIX = "__EKAM_SOCIAL_MEDIA__";
const S3_BASE_URL = "https://ekam-develop.s3.ap-south-2.amazonaws.com";

type MessageMedia = NonNullable<SocialMessage["media"]>;

const getMessageText = (body?: string | null) => {
  if (!body) return "";
  return body.startsWith(SOCIAL_MEDIA_BODY_PREFIX) ? "" : body;
};

const getMediaUrl = (media: Partial<MessageMedia>) => {
  if (media.url) return media.url;
  if (!media.key) return "";
  return media.key.startsWith("http") ? media.key : `${S3_BASE_URL}/${media.key}`;
};

const getMessageMedia = (message: SocialMessage): Partial<MessageMedia> | null => {
  if (message.media) return message.media;
  if (!message.body?.startsWith(SOCIAL_MEDIA_BODY_PREFIX)) return null;

  try {
    const payload = JSON.parse(message.body.slice(SOCIAL_MEDIA_BODY_PREFIX.length));
    return payload?.media || null;
  } catch (error) {
    console.error("Failed to parse social message media payload:", error);
    return null;
  }
};

const getMessageType = (message: SocialMessage, media: Partial<MessageMedia> | null) => {
  if (message.type && message.type !== "TEXT") return message.type;
  if (media?.mime?.startsWith("image/")) return "IMAGE";
  if (media?.mime?.startsWith("video/")) return "VIDEO";
  return media ? "FILE" : "TEXT";
};

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

function SocialMessages() {
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId: string }>();
  const { showToast } = useToast();
  const [selectedThread, setSelectedThread] = useState<SocialMessageThread | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [selectedAttachmentPreviewUrl, setSelectedAttachmentPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMessagesSettling, setIsMessagesSettling] = useState(false);
  const [pendingReportMessageId, setPendingReportMessageId] = useState<string | null>(null);
  const [isReportingMessage, setIsReportingMessage] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const { data: userData, isLoading: userLoading } = useMeQuery();
  const { data: usersMeData } = useUsersMeQuery();

  const currentUserId =
    userData?.data?._id ||
    (userData?.data as { id?: string })?.id ||
    usersMeData?.data?._id ||
    (usersMeData?.data as { id?: string })?.id ||
    "";

  const dispatch = useDispatch<AppDispatch>();

  const { data: threadsData, isLoading: threadsLoading, refetch: refetchThreads } = useGetSocialThreadsQuery({
    page: 1,
    limit: 50,
  });

  const { data: threadData, isLoading: messagesLoading, refetch: refetchMessages } = useGetSocialThreadQuery(
    { threadId: threadId || "", page: 1, limit: 50 },
    { skip: !threadId },
  );

  const { data: connectionsData, isLoading: isLoadingConnections } = useGetUserSocialConnectionsQuery({
    tab: "connections",
    page: 1,
    limit: 12,
  });

  const [replyToThread] = useReplyToSocialThreadMutation();
  const [getOrCreateThread] = useGetOrCreateSocialThreadMutation();
  const [getSocialPresignedUrl] = useGetSocialPresignedUrlMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [reportContent] = useReportContentMutation();
  const { typingUsers, sendTyping } = useTypingIndicator(selectedThread?.id || null, currentUserId);

  const threadsForSearch = threadsData?.data?.items || [];

  const threads = threadsData?.data?.items || [];
  const messages = useMemo(() => {
    const raw = threadData?.data?.messages || [];
    return [...raw].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [threadData?.data?.messages]);
  const latestMessageId = messages[messages.length - 1]?.id;
  const latestPeerMessage = [...messages]
    .reverse()
    .find((message) => String(message.senderId) !== String(currentUserId));

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const filteredThreads =
    threadsForSearch.filter((thread) =>
      (thread.participant?.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const filteredConnections =
    connectionsData?.data?.items?.filter((connection) =>
      (connection.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const threadsToShow = searchQuery.trim().length > 0 ? filteredThreads : threads;

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
      if (reason !== "io client disconnect") {
        setConnectionError(`Disconnected: ${reason}`);
      }
    };

    const handleConnectError = (...args: unknown[]) => {
      const error = args[0] as Error;
      setIsConnected(false);
      setConnectionError(`Connection error: ${error.message || "Unknown error"}`);
    };

    const handleNewMessage = () => {
      refetchThreads();
      if (selectedThread?.id) {
        refetchMessages();
      }
    };

    const handleUserOnline = (data: unknown) => {
      const { userId, lastSeenAt } = data as { userId: string; lastSeenAt?: string };
      setSelectedThread((prev) => {
        if (!prev || prev.participant.id !== userId) return prev;
        return { ...prev, participant: { ...prev.participant, online: true, lastSeenAt } };
      });
    };

    const handleUserOffline = (data: unknown) => {
      const { userId, lastSeenAt } = data as { userId: string; lastSeenAt?: string };
      setSelectedThread((prev) => {
        if (!prev || prev.participant.id !== userId) return prev;
        return { ...prev, participant: { ...prev.participant, online: false, lastSeenAt } };
      });
    };

    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("connect_error", handleConnectError);
    socketService.on("chat:new", handleNewMessage);
    socketService.on("user:online", handleUserOnline);
    socketService.on("user:offline", handleUserOffline);

    socketService.connect(token);
    setIsConnected(socketService.isConnected());

    return () => {
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("connect_error", handleConnectError);
      socketService.off("chat:new", handleNewMessage);
      socketService.off("user:online", handleUserOnline);
      socketService.off("user:offline", handleUserOffline);
      socketService.disconnect();
    };
  }, [selectedThread?.id, refetchThreads, refetchMessages]);

  useEffect(() => {
    if (!threadId || !isConnected) return;
    socketService.joinThread(threadId);
    return () => {
      socketService.leaveThread(threadId);
    };
  }, [threadId, isConnected]);

  useEffect(() => {
    setShowSearchResults(searchQuery.trim().length > 0);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!threadId) {
      setSelectedThread(null);
      return;
    }
    
    // First try to find thread in cached list
    const thread = threadsData?.data?.items?.find((t) => t.id === threadId);
    if (thread) {
      setSelectedThread(thread);
      return;
    }
    
    // If not in list but we have threadData, construct from it
    if (threadData?.data?.thread) {
      const { thread: threadInfo } = threadData.data;
      const lastMsg = threadData.data.messages?.[threadData.data.messages.length - 1];
      setSelectedThread({
        id: threadInfo.id,
        participant: threadInfo.participant,
        lastMessage: lastMsg ? {
          body: lastMsg.body,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt,
        } : null,
        lastMessageAt: lastMsg?.createdAt || new Date().toISOString(),
      });
    }
  }, [threadId, threadsData, threadData]);

  useEffect(() => {
    if (!threadId) return;

    scrollToLatest("auto");
    setIsMessagesSettling(true);
    const timers = [
      setTimeout(() => scrollToLatest("auto"), 0),
      setTimeout(() => scrollToLatest("auto"), 80),
      setTimeout(() => scrollToLatest("auto"), 260),
      setTimeout(() => scrollToLatest("auto"), 600),
      setTimeout(() => scrollToLatest("auto"), 1000),
      setTimeout(() => scrollToLatest("smooth"), 1600),
      setTimeout(() => setIsMessagesSettling(false), 1900),
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [latestMessageId, threadId, scrollToLatest]);

  useEffect(() => {
    if (
      !selectedAttachment ||
      (!selectedAttachment.type.startsWith("image/") && !selectedAttachment.type.startsWith("video/"))
    ) {
      setSelectedAttachmentPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedAttachment);
    setSelectedAttachmentPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedAttachment]);

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
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
  };

  const isSameDay = (date1: string, date2: string) => {
    return new Date(date1).toDateString() === new Date(date2).toDateString();
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedAttachment) || !threadId) return;

    setIsUploading(true);
    try {
      let mediaPayload:
        | {
            mediaKey: string;
            mediaMeta: {
              key: string;
              mime: string;
              size: number;
            };
          }
        | undefined;

      if (selectedAttachment) {
        const kind = selectedAttachment.type.startsWith("image/")
          ? "IMAGE"
          : selectedAttachment.type.startsWith("video/")
            ? "VIDEO"
            : "FILE";
        const presign = await getSocialPresignedUrl({
          mime: selectedAttachment.type || "application/octet-stream",
          size: selectedAttachment.size,
          kind,
        }).unwrap();

        const uploadResponse = await fetch(presign.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedAttachment.type || "application/octet-stream" },
          body: selectedAttachment,
        });
        if (!uploadResponse.ok) {
          throw new Error("Attachment upload failed");
        }

        mediaPayload = {
          mediaKey: presign.data.key,
          mediaMeta: {
            key: presign.data.key,
            mime: selectedAttachment.type || "application/octet-stream",
            size: selectedAttachment.size,
          },
        };
      }

      await replyToThread({ threadId, body: messageText.trim() || undefined, ...mediaPayload }).unwrap();
      setMessageText("");
      setSelectedAttachment(null);
      sendTyping(false);
      refetchMessages();
      refetchThreads();
    } catch (error) {
      console.error("Failed to send message:", error);
      showToast({
        title: "Message failed",
        description: "Unable to send your message. Please try again.",
        kind: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickAttachment = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so selecting the same file again triggers onChange
    e.target.value = "";

    if (!file) return;

    setSelectedAttachment(file);
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
      const result = await getOrCreateThread({ userId }).unwrap();
      if (result.success && result.data?.thread?.id) {
        setSearchQuery("");
        setShowSearchResults(false);
        refetchThreads();
        navigate(`/social/messages/${result.data.thread.id}`);
      }
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleConversationClick = (thread: SocialMessageThread) => {
    setSelectedThread({ ...thread, unreadCount: 0 });
    // Optimistically clear unread badge in the cached thread list
    dispatch(
      socialMessagesApi.util.updateQueryData("getSocialThreads", { page: 1, limit: 50 }, (draft) => {
        const t = draft.data?.items?.find((item) => item.id === thread.id);
        if (t) t.unreadCount = 0;
      }),
    );
    navigate(`/social/messages/${thread.id}`);
  };

  const handleBackToList = () => {
    setSelectedThread(null);
    navigate("/social/messages");
  };

  const handleReportConversation = () => {
    if (!latestPeerMessage?.id) {
      showToast({
        title: "No message to report",
        description: "Please report after the member has sent a message.",
        kind: "error",
      });
      return;
    }
    setPendingReportMessageId(latestPeerMessage.id);
  };

  const confirmReportConversation = async (reason: ModerationReason, details: string) => {
    if (!pendingReportMessageId) return;
    setIsReportingMessage(true);
    try {
      await reportContent({
        contentType: "CHAT_MESSAGE",
        contentId: pendingReportMessageId,
        targetUserId: selectedThread?.participant.id || undefined,
        contextId: selectedThread?.id,
        reason,
        details: details || undefined,
      }).unwrap();
      setPendingReportMessageId(null);
      showToast({
        title: "Report submitted",
        description: "This message is hidden for you while admin reviews it.",
        kind: "success",
      });
      refetchMessages();
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
    const userId = selectedThread?.participant.id;
    if (!userId) return;
    try {
      await blockUser({
        userId,
        reason: "HARASSMENT",
        sourceContentType: latestPeerMessage?.id ? "CHAT_MESSAGE" : undefined,
        sourceContentId: latestPeerMessage?.id,
      }).unwrap();
      showToast({
        title: "Member blocked",
        description: "Their messages are removed from your view and admin has been notified.",
        kind: "success",
      });
      refetchThreads();
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

  if (userLoading) {
    return (
      <div className="h-screen bg-[#0f1419] flex flex-col overflow-hidden">
        <SocialLayout>
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-gray-400">Loading...</div>
          </div>
        </SocialLayout>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="h-screen bg-[#0f1419] flex flex-col overflow-hidden">
        <SocialLayout>
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-red-400">Unable to load user data. Please refresh the page.</div>
          </div>
        </SocialLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col overflow-hidden">
      <style>{`
        /* Custom scrollbar styles */
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
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
      <SocialLayout>
        {connectionError && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {connectionError}
          </div>
        )}
        {!isConnected && !connectionError && (
          <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-2 rounded-lg mb-4 text-sm">
            Connecting to chat server...
          </div>
        )}
        <div className="flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          <div className="flex-1 overflow-hidden min-h-0">
            <div className="h-full rounded-xl border border-gray-700 bg-[#161b22] overflow-hidden">
              <div className="h-full flex flex-col md:flex-row">
                {/* Left: Conversations */}
                <div
                  className={`${selectedThread ? "hidden md:flex" : "flex"} md:w-[360px] md:min-w-[360px] flex-col border-b md:border-b-0 md:border-r border-gray-700 overflow-hidden`}
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
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#161b22] border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50 custom-scrollbar">
                          {filteredThreads.length > 0 && (
                            <div className="py-2">
                              <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Conversations</div>
                              {filteredThreads.map((thread) => (
                                <button
                                  key={thread.id}
                                  onClick={() => handleConversationClick(thread)}
                                  className="w-full p-3 flex items-center gap-3 hover:bg-[#0f1419] transition-colors border-b border-gray-700 last:border-b-0"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                                    {thread.participant.avatarUrl ? (
                                      <img
                                        src={thread.participant.avatarUrl}
                                        alt={thread.participant.name}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <span className="text-sm font-bold text-white">{thread.participant.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-white text-sm font-medium truncate">{thread.participant.name}</p>
                                      <span className="text-gray-500 text-xs">
                                        {thread.lastMessage ? formatTime(thread.lastMessage.createdAt) : ""}
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-xs truncate">{thread.lastMessage?.body || "No messages yet"}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="py-2">
                            <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Start new chat</div>
                            {isLoadingConnections ? (
                              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
                            ) : filteredConnections.length > 0 ? (
                              filteredConnections.map((connection) => (
                                <button
                                  key={connection.id}
                                  onClick={() => handleStartChat(connection.user.id)}
                                  className="w-full p-3 flex items-center gap-3 hover:bg-[#0f1419] transition-colors border-b border-gray-700 last:border-b-0"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                    {connection.user.avatarUrl ? (
                                      <img
                                        src={connection.user.avatarUrl}
                                        alt={connection.user.name}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <span className="text-sm font-semibold text-gray-300">{connection.user.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-white text-sm font-medium">{connection.user.name}</p>
                                    {connection.user.role && <p className="text-gray-400 text-xs">{connection.user.role}</p>}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-sm">No connections found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    {threadsLoading ? (
                      <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
                    ) : threadsToShow.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-400">
                        {searchQuery.trim().length > 0 ? "No conversations found" : "No conversations yet"}
                      </div>
                    ) : (
                      threadsToShow.map((thread) => (
                        <button
                          key={thread.id}
                          onClick={() => handleConversationClick(thread)}
                          className={`w-full p-4 flex items-start gap-3 hover:bg-[#0f1419] transition-colors border-b border-gray-700 ${
                            selectedThread?.id === thread.id ? "bg-[#0f1419]" : ""
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                            {thread.participant.avatarUrl ? (
                              <img
                                src={thread.participant.avatarUrl}
                                alt={thread.participant.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-base font-bold text-white">{thread.participant.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white text-sm font-medium">{thread.participant.name}</span>
                              <span className="text-gray-500 text-xs">
                                {thread.lastMessage ? formatTime(thread.lastMessage.createdAt) : ""}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-gray-400 text-xs truncate flex-1 pr-2">{thread.lastMessage?.body || "No messages yet"}</p>
                              {(thread.unreadCount ?? 0) > 0 && (
                                <div className="min-w-[18px] h-[18px] bg-[#D85D27] rounded-full flex items-center justify-center flex-shrink-0 px-1">
                                  <span className="text-[10px] font-bold text-white leading-none">
                                    {thread.unreadCount! > 99 ? "99+" : thread.unreadCount}
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
                <div className={`${selectedThread ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden`}>
                  {selectedThread ? (
                    <>
                      <div className="h-[72px] px-4 border-b border-gray-700 flex items-center gap-3 shrink-0">
                        <button onClick={handleBackToList} className="md:hidden text-gray-400 hover:text-white mr-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                            {selectedThread.participant.avatarUrl ? (
                              <img
                                src={selectedThread.participant.avatarUrl}
                                alt={selectedThread.participant.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-bold text-white">{selectedThread.participant.name.charAt(0)}</span>
                            )}
                          </div>
                          {selectedThread.participant.online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#161b22]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white text-base font-semibold">{selectedThread.participant.name}</h3>
                          {typingUsers.length > 0 ? (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                              <span>typing</span>
                              <span className="flex items-center gap-0.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500" />
                              </span>
                            </div>
                          ) : selectedThread.participant.online ? (
                            <p className="text-green-500 text-xs">Online</p>
                          ) : (
                            <p className="text-gray-500 text-xs">{formatPresenceTime(selectedThread.participant.lastSeenAt)}</p>
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
                            disabled={isBlockingUser}
                            className="rounded border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-60"
                          >
                            Block
                          </button>
                        </div>
                      </div>

                      <div
                        ref={messagesContainerRef}
                        className="relative flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 [overflow-anchor:none]"
                      >
                        {(messagesLoading || isMessagesSettling) && (
                          <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
                            <div className="mt-1 flex items-center gap-2 rounded-full border border-gray-700 bg-[#0f1419]/90 px-3 py-1.5 text-xs text-gray-300 shadow">
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-600 border-t-orange-500" />
                              <span>{messagesLoading ? "Loading messages..." : "Jumping to latest..."}</span>
                            </div>
                          </div>
                        )}
                        {messagesLoading ? (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-orange-500" />
                              <span>Loading messages...</span>
                            </div>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          <>
                            {messages.map((message, msgIndex) => {
                              const showDateHeader =
                                msgIndex === 0 || !isSameDay(message.createdAt, messages[msgIndex - 1]?.createdAt);
                              const messageTextContent = getMessageText(message.body);
                              const messageMedia = getMessageMedia(message);
                              const messageMediaUrl = messageMedia ? getMediaUrl(messageMedia) : "";
                              const messageType = getMessageType(message, messageMedia);

                              return (
                                <div key={message.id}>
                                  {showDateHeader && (
                                    <div className="my-4 flex items-center gap-3">
                                      <div className="h-px flex-1 bg-gray-700/80" />
                                      <span className="rounded-full border border-gray-700 bg-[#0f1419] px-3 py-1 text-xs font-medium text-gray-400">
                                        {formatDateHeader(message.createdAt)}
                                      </span>
                                      <div className="h-px flex-1 bg-gray-700/80" />
                                    </div>
                                  )}

                                  <div className={`flex gap-3 ${message.isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                                      {message.isMe ? (
                                        <span className="text-xs font-bold text-white">You</span>
                                      ) : selectedThread.participant.avatarUrl ? (
                                        <img
                                          src={selectedThread.participant.avatarUrl}
                                          alt={selectedThread.participant.name}
                                          className="w-full h-full object-cover rounded-full"
                                        />
                                      ) : (
                                        <span className="text-xs font-bold text-white">
                                          {selectedThread.participant.name.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                    <div className={`flex flex-col ${message.isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white text-sm font-medium">
                                          {message.isMe ? "You" : selectedThread.participant.name}
                                        </span>
                                        <span className="text-gray-500 text-xs">{formatClockTime(message.createdAt)}</span>
                                        <span className="text-gray-600 text-xs">· {formatTime(message.createdAt)}</span>
                                        {!message.isMe && (
                                          <button
                                            type="button"
                                            onClick={() => setPendingReportMessageId(message.id)}
                                            className="rounded border border-red-500/40 px-2 py-0.5 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
                                          >
                                            Report
                                          </button>
                                        )}
                                      </div>
                                      <div
                                        className={`rounded-2xl overflow-hidden ${
                                          message.isMe
                                            ? "bg-gradient-to-r from-[#D85D27] to-[#E67E22] text-white rounded-br-md"
                                            : "bg-[#1f2937] text-gray-100 border border-gray-600 rounded-bl-md"
                                        }`}
                                      >
                                        {messageMedia && messageMediaUrl && (
                                          <div className={messageTextContent ? "p-2 pb-0" : "p-2"}>
                                            {messageType === "IMAGE" && (
                                              <img
                                                src={messageMediaUrl}
                                                alt="Shared image"
                                                className="max-w-[min(20rem,70vw)] max-h-72 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                loading="lazy"
                                                onLoad={() => scrollToLatest("auto")}
                                                onClick={() => window.open(messageMediaUrl, "_blank")}
                                                onError={(e) => {
                                                  console.error("Failed to load image:", messageMediaUrl);
                                                  (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                              />
                                            )}
                                            {messageType === "VIDEO" && (
                                              <video
                                                controls
                                                className="max-w-[min(20rem,70vw)] max-h-72 rounded-lg"
                                                onLoadedData={() => scrollToLatest("auto")}
                                              >
                                                <source src={messageMediaUrl} type={messageMedia.mime} />
                                                Your browser does not support the video tag.
                                              </video>
                                            )}
                                            {messageType === "FILE" && (
                                              <a
                                                href={messageMediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 min-w-56 max-w-[min(20rem,70vw)] p-3 bg-[#0f1419]/60 rounded-lg hover:bg-[#0f1419]/80 transition-colors"
                                              >
                                                <svg className="w-7 h-7 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium truncate">Open attachment</p>
                                                  <p className="text-xs text-gray-400">
                                                    {messageMedia.size ? `${(messageMedia.size / 1024).toFixed(1)} KB` : "File"}
                                                  </p>
                                                </div>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {messageTextContent && (
                                          <p className="px-4 py-2 text-sm leading-relaxed break-words">{messageTextContent}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="p-4 border-t border-gray-700 shrink-0">
                        {selectedAttachment && (
                          <div className="mb-3 rounded-lg border border-gray-700 bg-[#0f1419] p-3 text-sm text-gray-300">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-gray-200">{selectedAttachment.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(selectedAttachment.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAttachment(null)}
                                disabled={isUploading}
                                className="text-gray-500 hover:text-gray-200 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>

                            {selectedAttachmentPreviewUrl && selectedAttachment.type.startsWith("image/") && (
                              <div className="relative mt-3 overflow-hidden rounded-lg border border-gray-700 bg-black/20 min-h-[10rem]">
                                <img
                                  src={selectedAttachmentPreviewUrl}
                                  alt="Selected preview"
                                  className="max-h-56 w-full object-contain"
                                />
                                {isUploading && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[1px]">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    <span className="text-xs font-medium text-white">Uploading image...</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedAttachmentPreviewUrl && selectedAttachment.type.startsWith("video/") && (
                              <div className="relative mt-3 overflow-hidden rounded-lg border border-gray-700 bg-black/20 p-2 min-h-[10rem]">
                                <video controls className="max-h-56 w-full rounded-lg">
                                  <source src={selectedAttachmentPreviewUrl} type={selectedAttachment.type} />
                                </video>
                                {isUploading && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[1px]">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    <span className="text-xs font-medium text-white">Uploading video...</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!selectedAttachmentPreviewUrl && !selectedAttachment.type.startsWith("video/") && (
                              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-700 bg-[#111827] p-3 text-gray-300">
                                <svg className="h-6 w-6 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                  <span className="truncate text-sm">{isUploading ? "Uploading attachment..." : "Attachment ready to send"}</span>
                                  {isUploading && (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white shrink-0" />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-3 items-end">
                          <textarea
                            placeholder="Type a message..."
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
                            className="flex-1 bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none min-h-[42px] max-h-32 overflow-y-auto"
                            rows={1}
                            disabled={isUploading}
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={isUploading || (!messageText.trim() && !selectedAttachment)}
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
                          ref={attachmentInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                          onChange={handleAttachmentSelected}
                        />
                        <button
                          onClick={handlePickAttachment}
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
            </div>
          </div>
        </div>
      </SocialLayout>
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

export default SocialMessages;
