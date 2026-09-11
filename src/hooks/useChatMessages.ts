import { useEffect, useState, useCallback, useRef } from "react";
import { socketService } from "../services/socketService";
import { useLazyGetMessagesQuery, useMarkAsReadMutation } from "../services/professional/professionalMessagesApi";
import type { Message, SendMessagePayload } from "../types/chat.types";

export const useChatMessages = (
  threadId: string | null,
  currentUserId: string,
  onSendError?: (message: string) => void,
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const lastReadMessageIdRef = useRef<string | null>(null);

  const [fetchMessages, { isLoading }] = useLazyGetMessagesQuery();
  const [markAsRead] = useMarkAsReadMutation();

  // Keep ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const emitReadReceipt = useCallback(
    (messageId: string) => {
      if (!threadId || !messageId) return;
      socketService.markAsRead(threadId, messageId, (response) => {
        if (!response.ok) {
          markAsRead({ threadId, lastMessageId: messageId }).catch((error) => {
            console.error("Failed to mark messages as read:", error);
          });
        }
      });
    },
    [markAsRead, threadId],
  );

  const refreshLatestMessages = useCallback(async () => {
    if (!threadId || !currentUserId) return;

    try {
      const result = await fetchMessages({ threadId, limit: 30 }).unwrap();

      if (result.success && result.data) {
        const orderedMessages = [...result.data].reverse();

        setMessages(orderedMessages);
        setHasMore(result.data.length === 30);

        const latestIncomingMessage = orderedMessages
          .filter((msg) => msg.senderId !== currentUserId)
          .at(-1);

        if (
          latestIncomingMessage?._id &&
          lastReadMessageIdRef.current !== latestIncomingMessage._id
        ) {
          lastReadMessageIdRef.current = latestIncomingMessage._id;
          emitReadReceipt(latestIncomingMessage._id);
        }
      }
    } catch (error) {
      console.error("Failed to refresh messages:", error);
    }
  }, [fetchMessages, threadId, currentUserId, emitReadReceipt]);

  // Load initial messages
  useEffect(() => {
    lastReadMessageIdRef.current = null;

    if (!threadId) {
      setMessages([]);
      setHasMore(true);
      return;
    }

    refreshLatestMessages();

    socketService.joinThread(threadId);

    return () => {
      socketService.leaveThread(threadId);
    };
  }, [threadId, refreshLatestMessages]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!threadId || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messagesRef.current[0];
      if (!oldestMessage) return;

      const result = await fetchMessages({
        threadId,
        before: oldestMessage._id,
        limit: 30,
      }).unwrap();

      if (result.success && result.data) {
        // Create a new array before reversing (RTK Query returns read-only array)
        const newMessages = [...result.data].reverse();
        setMessages((prev) => [...newMessages, ...prev]);
        setHasMore(result.data.length === 30);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [threadId, hasMore, isLoadingMore, fetchMessages]);

  // Handle new message from socket
  useEffect(() => {
    const handleNewMessage = (data: unknown) => {
      const message = data as Message;
      console.log("Received chat:new message:", {
        _id: message._id,
        clientId: message.clientId,
        type: message.type,
        senderId: message.senderId,
        hasMedia: !!message.media,
        hasMediaUrl: !!message.media?.url,
      });
      if (message.threadId === threadId) {
        setMessages((prev) => {
          console.log("Current messages count:", prev.length);

          // Check if message already exists (by _id or clientId)
          const existsByIdIndex = prev.findIndex((m) => m._id === message._id);
          const existsByClientIdIndex = message.clientId ? prev.findIndex((m) => m.clientId === message.clientId) : -1;

          console.log("Match results - byId:", existsByIdIndex, "byClientId:", existsByClientIdIndex);

          if (existsByIdIndex >= 0) {
            // Message already exists by ID, replace with full server data (including media)
            console.log("Updating existing message by _id with server data");
            return prev.map((m, idx) => (idx === existsByIdIndex ? { ...message, status: "delivered" as const } : m));
          }

          if (existsByClientIdIndex >= 0) {
            // Message exists by clientId (our optimistic message), replace with server data
            console.log("Replacing optimistic message by clientId with server data");
            return prev.map((m, idx) =>
              idx === existsByClientIdIndex ? { ...message, status: "delivered" as const } : m,
            );
          }

          // Add new message (it's either from someone else, or our own message that wasn't optimistically added)
          console.log("Adding new message from:", message.senderId === currentUserId ? "self" : "other");
          return [...prev, message];
        });

        // Mark as read if message is from someone else
        if (message.senderId !== currentUserId) {
          emitReadReceipt(message._id);
        }
      }
    };

    const handleDelivered = (data: unknown) => {
      const deliveredData = data as { threadId: string; messageId: string };
      if (deliveredData.threadId === threadId) {
        setMessages((prev) =>
          prev.map((m) => (m._id === deliveredData.messageId ? { ...m, status: "delivered" as const } : m)),
        );
      }
    };

    const handleRead = (data: unknown) => {
      const readData = data as { threadId: string; userId: string; lastMessageId?: string };
      if (readData.threadId === threadId && readData.userId !== currentUserId) {
        // Mark our messages as "seen" when the other user reads them
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUserId && m.status === "delivered" ? { ...m, status: "seen" as const } : m,
          ),
        );
      }
    };

    socketService.on("chat:new", handleNewMessage);
    socketService.on("chat:delivered", handleDelivered);
    socketService.on("chat:read", handleRead);

    return () => {
      socketService.off("chat:new", handleNewMessage);
      socketService.off("chat:delivered", handleDelivered);
      socketService.off("chat:read", handleRead);
    };
  }, [threadId, currentUserId, emitReadReceipt]);

  // Send message
  const sendMessage = useCallback(
    (payload: Omit<SendMessagePayload, "threadId"> & { mediaUrl?: string }) => {
      if (!threadId) return;

      const { mediaUrl, ...socketPayload } = payload;
      const fullPayload: SendMessagePayload = {
        ...socketPayload,
        threadId,
      };

      if (payload.type === "TEXT" || payload.mediaMeta) {
        const optimisticMessage: Message = {
          _id: payload.clientId,
          threadId,
          senderId: currentUserId,
          type: payload.type,
          text: payload.text,
          media:
            payload.mediaMeta && mediaUrl
              ? {
                ...payload.mediaMeta,
                url: mediaUrl,
              }
              : undefined,
          createdAt: new Date().toISOString(),
          clientId: payload.clientId,
          status: "sending",
        };
        setMessages((prev) => [...prev, optimisticMessage]);
      }

      // Send via socket
      socketService.sendMessage(fullPayload, (response) => {
        console.log("Send message acknowledgment:", response);
        if (response.ok && response.messageId) {
          // If server message already exists (chat:new arrived first), drop the optimistic one by clientId
          setMessages((prev) => {
            const alreadyHasServer = prev.some((m) => m._id === response.messageId);
            if (alreadyHasServer) {
              return prev.filter((m) => m.clientId !== payload.clientId);
            }
            // Otherwise, update the optimistic TEXT message with the real server _id so chat:new will replace it
            return prev.map((m) =>
              m.clientId === payload.clientId ? { ...m, _id: response.messageId!, status: "delivered" as const } : m,
            );
          });
          refreshLatestMessages();
        } else if (!response.ok) {
          // Mark as failed only if the send failed
          setMessages((prev) =>
            prev.map((m) => (m.clientId === payload.clientId ? { ...m, status: "failed" as const } : m)),
          );
          console.error("Failed to send message:", response.error, response.message);
          onSendError?.(response.message || response.error || "The message could not be sent.");
        }
      });
    },
    [threadId, currentUserId, refreshLatestMessages, onSendError],
  );

  return {
    messages,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMoreMessages,
    sendMessage,
  };
};
