import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { PageHeader } from "../../components/common/PageHeader";
import { useChatThreads } from "../../hooks/useChatThreads";
import { useChatMessages } from "../../hooks/useChatMessages";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { useMeQuery, useUsersMeQuery } from "../../services/authApi";
import { useProfessionalConnectionsListQuery } from "../../services/professional/professionalConnectionsApi";
import { useConnectionsListQuery } from "../../services/connectionsApi";
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
import { Navbar } from "../../components/navigation";
import { ADMIN_THEME } from "../../theme/themeScope";

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

function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams<{ userId?: string; threadId?: string }>();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messageText, setMessageText] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingReportMessageId, setPendingReportMessageId] = useState<string | null>(null);
  const [isReportingMessage, setIsReportingMessage] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get current user - try both endpoints
  const { data: userData } = useMeQuery();
  const { data: usersMeData, error: userError } = useUsersMeQuery();

  // Try to get user ID from different possible locations
  const currentUserId =
    userData?.data?._id ||
    (userData?.data as { id?: string })?.id ||
    usersMeData?.data?._id ||
    (usersMeData?.data as { id?: string })?.id ||
    "";

  const userLoading = !userData && !usersMeData;
  const { showToast } = useToast();
  // Why the conversation this page was opened for could not be opened.
  const [openFailure, setOpenFailure] = useState<string | null>(null);

  // Setup socket and load threads
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    setToken(accessToken);

    // Show error toast if user data fails to load
    if (userError) {
      console.error('Failed to load user data:', userError);
      // You can add a toast notification here if you have a toast system
      // Example: toast.error('Failed to load user data. Some features may be limited.');
    }
  }, [userError]);

  // Connect socket when token is available (to receive thread updates)
  const { isConnected, connectionError } = useSocket(token);
  const {
    threads,
    isLoading: threadsLoading,
    hasLoaded: threadsLoaded,
    addThread,
    clearUnreadCount,
  } = useChatThreads(selectedThread?._id);

  // Show error toast if connection fails
  useEffect(() => {
    if (connectionError) {
      console.error('Connection error:', connectionError);
      // Example: toast.error('Connection error. Please reload the page to reconnect.');
    }
  }, [connectionError]);

  // Show toast when connection is established
  useEffect(() => {
    if (isConnected) {
      // Example: toast.success('Connected to chat');
    }
  }, [isConnected]);

  // Show toast if no conversations found
  useEffect(() => {
    if (!threadsLoading && threads.length === 0) {
      // Example: toast.info('No conversations yet. Start a new chat!');
    }
  }, [threads, threadsLoading]);

  // Load messages for selected thread
  const handleSendError = useCallback(
    (message: string) => {
      showToast({ title: "Message not sent", description: message, kind: "error" });
    },
    [showToast],
  );
  const { messages, sendMessage, isLoading: messagesLoading } = useChatMessages(
    selectedThread?._id || null,
    currentUserId,
    handleSendError,
  );
  const peerUserId =
    selectedThread?.peer?.id ||
    selectedThread?.participants?.find((p) => p.userId !== currentUserId)?.userId ||
    null;
  const latestPeerMessage = [...messages]
    .reverse()
    .find((message) => String(message.senderId) !== String(currentUserId));

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(selectedThread?._id || null, currentUserId);

  // Get connections list
  // This page is shared by the Business and Professional modules, but it only ever
  // asked the professional endpoint for the people you can message. A business-only
  // member gets 403 NO_PROFESSIONAL_ACCESS there, so the list came back empty and
  // every search answered "No connections found" for people they were connected to.
  // Ask whichever module the member actually holds, and ask neither until we know
  // which that is - guessing wrong just trades one module's 403 for the other's.
  const moduleAccess = (usersMeData?.data as { moduleAccess?: Record<string, boolean> } | undefined)
    ?.moduleAccess;
  const accessKnown = !!moduleAccess;
  const preferProfessional = moduleAccess?.professional === true;

  const { data: proConnections, isLoading: proConnectionsLoading } =
    useProfessionalConnectionsListQuery(
      { type: "my", limit: 100 },
      { skip: !accessKnown || !preferProfessional },
    );
  const { data: businessConnections, isLoading: businessConnectionsLoading } =
    useConnectionsListQuery(
      { type: "my", limit: 100 },
      { skip: !accessKnown || preferProfessional },
    );

  const connectionsData = (preferProfessional ? proConnections : businessConnections) as
    | {
        data?: Array<{
          id: string;
          user: {
            id: string;
            name: string;
            headline?: string;
            avatarUrl?: string;
            chapter?: string;
          };
        }>;
      }
    | undefined;
  const isLoadingConnections =
    !accessKnown || (preferProfessional ? proConnectionsLoading : businessConnectionsLoading);

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

  // Auto-open conversation when navigated with threadId or peerId
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;

    const search = new URLSearchParams(location.search);
    const qsThreadId = search.get("threadId") || undefined;
    const qsPeerId = search.get("peerId") || undefined;
    const navState = (location.state || {}) as { threadId?: string; peerId?: string; shouldOpenThread?: boolean };
    const stThreadId = navState.threadId;
    const stPeerId = navState.peerId;
    const desiredThreadId = routeParams.threadId || qsThreadId || stThreadId;
    const desiredPeerId = routeParams.userId || qsPeerId || stPeerId;

    // If we have neither id and threads are still loading, wait
    if (!desiredThreadId && !desiredPeerId && threadsLoading) {
      return;
    }

    // If threadId provided, try to open that thread
    if (desiredThreadId || stThreadId) {
      const targetThreadId = desiredThreadId || stThreadId!;
      const foundByThread = threads.find((t) => t._id === targetThreadId);
      if (foundByThread) {
        setSelectedThread({
          ...foundByThread,
          unreadCount: 0,
        });

        clearUnreadCount(foundByThread._id);

        initializedRef.current = true;
        return;
      }
      // Not found in current list yet: open a minimal placeholder so messages can load by threadId
      setSelectedThread({
        _id: targetThreadId,
        type: "DIRECT",
        participants: [],
        updatedAt: new Date().toISOString(),
      } as any);
      initializedRef.current = true;
      return;
    }

    // If peerId provided, open existing thread with that peer or create one
    if (desiredPeerId) {
      // Wait for the list first. This used to run with threads still empty, so
      // arriving from "Send message" always took the create path — asking the
      // server to start a conversation that usually already existed, and, when
      // the server refused, reporting a failure for a conversation that then
      // opened by itself a moment later.
      if (!threadsLoaded) return;

      const foundByPeer = threads.find(
        (t) => t.peer?.id === desiredPeerId || t.participants.some((p) => p.userId === desiredPeerId)
      );
      if (foundByPeer) {
        setSelectedThread({
          ...foundByPeer,
          unreadCount: 0,
        });
        setOpenFailure(null);

        clearUnreadCount(foundByPeer._id);

        initializedRef.current = true;
        return;
      }

      // Create if not found. Claimed before the call rather than after it, so
      // a re-render cannot start a second one.
      initializedRef.current = true;
      (async () => {
        try {
          const result = await createDirectThread({ peerId: desiredPeerId }).unwrap();
          if (result?.success && result?.data) {
            addThread(result.data);
            setSelectedThread(result.data);
            setOpenFailure(null);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Failed to create direct thread from navigation", e);
          const message =
            (e as { data?: { message?: string } })?.data?.message ||
            "This conversation could not be opened.";
          setOpenFailure(message);
          showToast({
            title: "Couldn't open the conversation",
            description: message,
            kind: "error",
          });
        }
      })();
      return;
    }

    // Nothing to auto-open from ids; if caller requested open, default to first available thread
    if (navState.shouldOpenThread && threads.length > 0) {
      setSelectedThread({
        ...threads[0],
        unreadCount: 0,
      });

      clearUnreadCount(threads[0]._id);

      initializedRef.current = true;
      return;
    }

    // Nothing to auto-open
    initializedRef.current = true;
  }, [threadsLoading, threadsLoaded, threads, location.search, routeParams.threadId, routeParams.userId, createDirectThread, addThread, clearUnreadCount, showToast]);

  // When full thread list arrives, replace placeholder with real thread data if available
  useEffect(() => {
    if (!selectedThread) return;
    const full = threads.find((t) => t._id === selectedThread._id);
    if (full && full !== selectedThread) {
      setSelectedThread(full);
    }
  }, [threads, selectedThread?._id]);

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

  // Show loading state while user data is loading
  if (userLoading && !userData && !usersMeData) {
    return (
      <div className={`${ADMIN_THEME} h-screen flex flex-col overflow-hidden`}>
        <PageHeader breadcrumbs={[
          { label: "Business", onClick: () => navigate('/dashboard') },
          { label: "My Feed", onClick: () => navigate('/business/my-feed') },
          { label: "chat" }
        ]} />
        <div className="flex-1 flex flex-col px-4 md:px-8 lg:px-12 py-6 overflow-hidden">
          <div className="flex h-full bg-[var(--ov-trough)] rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-[var(--ov-trough)] flex flex-col">data...</div>
          </div>
        </div>
      </div>
    );
  }

  // If no user ID after loading, show error
  if (!currentUserId) {
    return (
      <div className={`${ADMIN_THEME} h-screen flex flex-col overflow-hidden`}>
        <div className="p-6">
          <PageHeader breadcrumbs={[
            { label: "Business", onClick: () => navigate('/dashboard') },
            { label: "My Feed", onClick: () => navigate('/business/my-feed') },
            { label: "Chat" }
          ]} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-400">Unable to load user data. Please refresh the page.</div>
        </div>
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
    const otherParticipant = peerInfo || thread.participants?.find((p) => p.userId !== currentUserId);
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
        peerInfo?.photoUrlDecrypted || peerInfo?.photoUrl ||
        (otherParticipant && "avatar" in otherParticipant ? otherParticipant.avatar : undefined),
      online: peerInfo?.online || false,
      unreadCount: thread.unreadCount || 0,
      thread: thread,
    };
  });

  const handleSendMessage = async () => {
    const trimmedText = messageText.trim();
    if ((!trimmedText && selectedFiles.length === 0) || !selectedThread) return;

    setIsUploading(true);
    try {
      // Upload media files if any
      const uploadedMedia = await uploadMediaFiles();
      if (selectedFiles.length > 0 && uploadedMedia.length === 0) {
        throw new Error("Attachment upload failed");
      }

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
        text: trimmedText || undefined,
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

      // Immediately scroll to end to show the latest outgoing message area
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 50);

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
    setSelectedThread({
      ...conversation.thread,
      unreadCount: 0,
    });

    clearUnreadCount(conversation.thread._id);
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
        setSelectedThread(result.data);
        setSearchQuery("");
        setShowSearchResults(false);
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
        // Get presigned URL
        const presignResult = await getPresignedUrl({
          mime: file.type,
          size: file.size,
          kind: file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : "FILE",
        }).unwrap();

        if (presignResult.success && presignResult.data) {
          // Upload to S3
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
        // Show user-friendly error for AWS credentials issue
        const err = error as { data?: { message?: string } };
        if (err?.data?.message?.includes("credentials")) {
          alert("Media upload is not configured. Please contact support.");
        }
      }
    }

    return uploadedMedia;
  };

  const handleBackToList = () => {
    setSelectedThread(null);
    navigate('/business/my-feed/chat');
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

  // Get user display name and avatar
  const displayName = userData?.data?.name || usersMeData?.data?.name || 'User';
  const profileAvatar = usersMeData?.data?.photoUrl || '';

  return (
    <div className={`${ADMIN_THEME} min-h-screen flex flex-col overflow-hidden`}>
      <Navbar userName={displayName} userAvatar={profileAvatar} />
      <div className="flex-1 flex flex-col px-4 md:px-8 lg:px-12 py-6 overflow-hidden">
        <div className="h-full bg-[var(--ov-trough)] rounded-lg overflow-hidden flex flex-col">
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
          <div className="px-6 pt-3 pb-2">
            <PageHeader
              breadcrumbs={
                selectedThread
                  ? [
                    { label: "Business", onClick: () => navigate("/dashboard") },
                    { label: "My Feed", onClick: () => navigate('/business/my-feed') },
                    { label: "Chat", onClick: handleBackToList },
                    {
                      label:
                        selectedThread.peer?.name ||
                        selectedThread.participants?.find((p) => p.userId !== currentUserId)?.name ||
                        "Unknown",
                    },
                  ]
                  : [
                    { label: "Business", onClick: () => navigate("/dashboard") },
                    { label: "My Feed", onClick: () => navigate('/business/my-feed') },
                    { label: "Chat" }
                  ]
              }
            />
          </div>
          <div className="flex flex-col overflow-hidden h-[calc(100vh-220px)]">
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="h-full rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-panel)] overflow-hidden">
                <div className="h-full flex flex-col md:flex-row">
                  {/* Left: Conversations */}
                  <div
                    className={`${selectedThread ? "hidden md:flex" : "flex"} md:w-[360px] md:min-w-[360px] flex-col border-b md:border-b-0 md:border-r border-[color:var(--ov-line)] overflow-hidden`}
                  >
                    <div className="h-[72px] px-4 border-b border-[color:var(--ov-line)] shrink-0 flex items-center" ref={searchRef}>
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ov-ink-4)]"
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
                          className="w-full rounded-xl bg-[var(--field-bg)] border border-[color:var(--field-border)] pl-10 pr-3 py-2.5 text-sm text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors"
                        />

                        {showSearchResults && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-lg shadow-lg max-h-80 overflow-y-auto z-50 custom-scrollbar">
                            {isLoadingConnections ? (
                              <div className="p-4 text-center text-[var(--ov-ink-4)] text-sm">Loading connections...</div>
                            ) : filteredConnections.length > 0 ? (
                              <>
                                {filteredConnections.map((connection) => (
                                  <button
                                    key={connection.id}
                                    onClick={() => handleStartChat(connection.user.id)}
                                    disabled={isCreatingThread}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-[var(--ov-fill-subtle)] transition-colors border-b border-[color:var(--ov-line)] last:border-b-0 text-left cursor-pointer"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] flex items-center justify-center shrink-0">
                                      {connection.user.avatarUrl ? (
                                        <img
                                          src={connection.user.avatarUrl}
                                          alt={connection.user.name}
                                          className="w-full h-full object-cover rounded-full"
                                        />
                                      ) : (
                                        <span className="text-sm font-bold text-[var(--ov-ink)]">{connection.user.name.charAt(0)}</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[var(--ov-ink)] text-sm font-medium truncate">{connection.user.name}</p>
                                      {connection.user.headline && (
                                        <p className="text-[var(--ov-ink-4)] text-xs truncate">{connection.user.headline}</p>
                                      )}
                                      {connection.user.chapter && (
                                        <p className="text-[var(--ov-ink-5)] text-xs truncate">{connection.user.chapter}</p>
                                      )}
                                    </div>
                                    <div className="text-xs text-orange-500 shrink-0">Start Chat</div>
                                  </button>
                                ))}
                              </>
                            ) : searchQuery.trim().length > 0 ? (
                              <div className="p-4 text-center text-[var(--ov-ink-4)] text-sm">No connections found matching "{searchQuery}"</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                      {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-[var(--ov-ink-4)] p-4 text-center">
                          <span>No conversations yet</span>
                          <span className="text-sm text-[var(--ov-ink-5)] mt-1">Start a new chat by searching above</span>
                        </div>
                      ) : (
                        conversations.map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() => handleConversationClick(conversation)}
                            className={`w-full p-4 flex items-start gap-3 hover:bg-[var(--ov-fill-subtle)] transition-colors border-b border-[color:var(--ov-line)] ${selectedThread?._id === conversation.id ? "bg-[var(--ov-trough)]" : ""
                              }`}
                          >
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] flex items-center justify-center">
                                {conversation.avatar ? (
                                  <img
                                    src={conversation.avatar}
                                    alt={conversation.name}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <span className="text-base font-bold text-[var(--ov-ink)]">{(conversation.name || "?").charAt(0)}</span>
                                )}
                              </div>
                              {conversation.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161b22]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[var(--ov-ink)] text-sm font-medium">{conversation.name}</span>
                                <span className="text-[var(--ov-ink-5)] text-xs">{conversation.time}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[var(--ov-ink-4)] text-xs truncate flex-1 pr-2">{conversation.lastMessage}</p>
                                {conversation.unreadCount > 0 && (
                                  <div className="min-w-[18px] h-[18px] bg-[var(--ov-ember-fill)] rounded-full flex items-center justify-center flex-shrink-0 px-1">
                                    <span className="text-[10px] font-bold text-[var(--ov-on-ember)] leading-none">
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
                  <div className={`${selectedThread ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden`}>
                    {selectedThread ? (
                      <>
                        {/* Chat Header */}
                        <div className="h-[72px] px-4 border-b border-[color:var(--ov-line)] flex items-center gap-3 shrink-0">
                          {/* Back button for mobile */}
                          <button onClick={handleBackToList} className="md:hidden text-[var(--ov-ink-4)] hover:text-[var(--ov-ink)] mr-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] flex items-center justify-center">
                              {selectedThread.peer?.photoUrlDecrypted ||
                                selectedThread.peer?.photoUrl ||
                                selectedThread.participants?.find((p) => p.userId !== currentUserId)?.avatar ? (
                                <img
                                  src={
                                    selectedThread.peer?.photoUrlDecrypted ||
                                    selectedThread.peer?.photoUrl ||
                                    selectedThread.participants?.find((p) => p.userId !== currentUserId)?.avatar ||
                                    ""
                                  }
                                  alt={selectedThread.peer?.name || "User"}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    if (img.src !== selectedThread.peer?.photoUrl) {
                                      img.src = selectedThread.peer?.photoUrl || '';
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-sm font-bold text-[var(--ov-ink)]">
                                  {(
                                    selectedThread.peer?.name ||
                                    selectedThread.participants?.find((p) => p.userId !== currentUserId)?.name ||
                                    "?"
                                  ).charAt(0)}
                                </span>
                              )}
                            </div>
                            {selectedThread.peer?.online && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#161b22]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[var(--ov-ink)] text-base font-semibold">
                              {selectedThread.peer?.name ||
                                selectedThread.participants?.find((p) => p.userId !== currentUserId)?.name ||
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
                              <p className="text-[var(--ov-ink-5)] text-xs">{formatPresenceTime(selectedThread.peer?.lastSeenAt)}</p>
                            )}
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={handleReportConversation}
                              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--ov-ink-4)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)]"
                            >
                              Report
                            </button>
                            <button
                              type="button"
                              onClick={handleBlockConversation}
                              disabled={isBlockingThread || isBlockingUser}
                              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--ov-ink-4)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] disabled:opacity-60"
                            >
                              Block
                            </button>
                          </div>
                        </div>

                        {/* Messages */}
                        <div
                          ref={messagesContainerRef}
                          className="relative flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0 [overflow-anchor:none]"
                        >
                          {messagesLoading && (
                            <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
                              <div className="mt-1 flex items-center gap-2 rounded-full border border-[color:var(--ov-line)] bg-[var(--ov-panel)]/90 px-3 py-1.5 text-xs text-[var(--ov-ink-2)] shadow">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--ov-line-strong)] border-t-[color:var(--ov-ember)]" />
                                <span>Loading messages...</span>
                              </div>
                            </div>
                          )}
                          {messagesLoading ? (
                            <div className="flex items-center justify-center h-full text-[var(--ov-ink-4)]">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--ov-line-strong)] border-t-[color:var(--ov-ember)]" />
                                <span>Loading messages...</span>
                              </div>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-[var(--ov-ink-4)]">
                              <p>No messages yet. Start the conversation!</p>
                            </div>
                          ) : (
                            messages.map((message, msgIndex) => {
                              const showDateHeader =
                                msgIndex === 0 || !isSameDay(message.createdAt, messages[msgIndex - 1]?.createdAt);
                              const isOwn = message.senderId === currentUserId;
                              const senderName = isOwn
                                ? userData?.data?.name || "You"
                                : selectedThread.peer?.name ||
                                selectedThread.participants?.find((p) => p.userId === message.senderId)?.name ||
                                "Unknown";

                              return (
                                <div key={message._id}>
                                  {showDateHeader && (
                                    <div className="my-4 flex items-center gap-3">
                                      <div className="h-px flex-1 bg-[var(--ov-line)]" />
                                      <span className="rounded-full border border-[color:var(--ov-line)] bg-[var(--ov-trough)] px-3 py-1 text-xs font-medium text-[var(--ov-ink-4)]">
                                        {formatDateHeader(message.createdAt)}
                                      </span>
                                      <div className="h-px flex-1 bg-[var(--ov-line)]" />
                                    </div>
                                  )}

                                  <div
                                    className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                                    data-message-incoming={!isOwn}
                                  >
                                    <div className="w-8 h-8 rounded-full bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] flex items-center justify-center shrink-0 overflow-hidden">
                                      {(() => {
                                        const ownAvatar = usersMeData?.data?.photoUrl || (userData as any)?.data?.photoUrl;
                                        const peerAvatar =
                                          selectedThread.peer?.photoUrlDecrypted ||
                                          selectedThread.peer?.photoUrl ||
                                          selectedThread.participants?.find((p) => p.userId === message.senderId)?.avatar ||
                                          selectedThread.participants?.find((p) => p.userId !== currentUserId)?.avatar ||
                                          undefined;
                                        const src = isOwn ? ownAvatar : peerAvatar;
                                        if (src) {
                                          return (
                                            <img
                                              src={src}
                                              alt={senderName}
                                              className="w-full h-full object-cover rounded-full"
                                              onError={(e) => {
                                                // fallback: clear src to show initials
                                                (e.target as HTMLImageElement).src = "";
                                              }}
                                            />
                                          );
                                        }
                                        return (
                                          <span className="text-xs font-bold text-[var(--ov-ink)]">{(senderName || "?").charAt(0)}</span>
                                        );
                                      })()}
                                    </div>
                                    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[var(--ov-ink)] text-sm font-medium">{senderName}</span>
                                        <span className="text-[var(--ov-ink-5)] text-xs">{formatClockTime(message.createdAt)}</span>
                                        <span className="text-[var(--ov-ink-5)] text-xs">· {formatTime(message.createdAt)}</span>
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
                                        className={`rounded-2xl overflow-hidden ${isOwn
                                          ? "bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] rounded-br-md"
                                          : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] border border-[color:var(--ov-line)] rounded-bl-md"
                                          }`}
                                      >
                                        {/* Media Content */}
                                        {message.media && message.media.url && (
                                          <div className={message.text ? "p-2 pb-0" : "p-2"}>
                                            {message.type === "IMAGE" && (
                                              <img
                                                src={message.media.url}
                                                alt="Shared image"
                                                className="max-w-[min(20rem,70vw)] max-h-72 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                loading="lazy"
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
                                                className="flex items-center gap-3 min-w-56 max-w-[min(20rem,70vw)] p-3 bg-[var(--ov-fill-subtle)] rounded-lg hover:bg-[var(--ov-fill-hover)] transition-colors"
                                              >
                                                <svg className="w-8 h-8 text-[var(--ov-ink-4)]" fill="currentColor" viewBox="0 0 20 20">
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium">Download File</p>
                                                  <p className="text-xs text-[var(--ov-ink-4)]">
                                                    {message.media.size
                                                      ? `${(message.media.size / 1024).toFixed(1)} KB`
                                                      : "File"}
                                                  </p>
                                                </div>
                                                <svg
                                                  className="w-4 h-4 text-[var(--ov-ink-4)]"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                  />
                                                </svg>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {/* Text Content */}
                                        {message.text && <p className="px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>}
                                      </div>
                                      {message.status && isOwn && (
                                        <span className="text-xs text-[var(--ov-ink-4)] mt-1 flex items-center gap-1">
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
                            })
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-[color:var(--ov-line)] shrink-0">
                          {/* File Previews */}
                          {selectedFiles.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {selectedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="relative bg-[var(--ov-trough)] border border-[color:var(--ov-line)] rounded-lg p-2 flex items-center gap-2"
                                >
                                  {file.type.startsWith("image/") ? (
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-[var(--ov-fill-subtle)] rounded flex items-center justify-center">
                                      <svg className="w-6 h-6 text-[var(--ov-ink-4)]" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                  <span className="text-xs text-[var(--ov-ink-2)] max-w-[100px] truncate">{file.name}</span>
                                  <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="absolute -top-2 -right-2 bg-[var(--ov-danger)] text-[var(--ov-on-ember)] rounded-full w-5 h-5 flex items-center justify-center"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-3 items-end">
                            <textarea
                              placeholder={selectedFiles.length > 0 ? "Add a caption" : "Write a message"}
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
                              className="flex-1 resize-none overflow-y-auto rounded-xl bg-[var(--field-bg)] border border-[color:var(--field-border)] px-4 py-2.5 text-sm text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors disabled:opacity-50 min-h-[42px] max-h-32"
                            ></textarea>
                            <button
                              onClick={handleSendMessage}
                              disabled={isUploading || (!messageText.trim() && selectedFiles.length === 0)}
                              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="mt-3 text-[var(--ov-ink-4)] text-xs flex items-center gap-2 hover:text-[var(--ov-ink-2)] transition-colors disabled:opacity-50"
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
                      <div className="flex-1 flex items-center justify-center p-6 text-[var(--ov-ink-4)]">
                        <div className="max-w-sm text-center">
                          <span
                            aria-hidden="true"
                            className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${
                              openFailure
                                ? "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
                                : "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]"
                            }`}
                          >
                            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </span>
                          {openFailure ? (
                            <>
                              <p className="text-[15px] font-semibold text-[var(--ov-ink)]">
                                Couldn&apos;t open that conversation
                              </p>
                              <p className="mt-1.5 text-[13px] leading-5">{openFailure}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[15px] font-semibold text-[var(--ov-ink)]">
                                No conversation open
                              </p>
                              <p className="mt-1.5 text-[13px] leading-5">
                                Pick someone from the list, or search above to start a new one.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

export default ChatPage;
