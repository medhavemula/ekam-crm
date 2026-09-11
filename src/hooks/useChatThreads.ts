import { useEffect, useState, useCallback } from "react";
import { socketService } from "../services/socketService";
import { useLazyGetThreadsQuery } from "../services/professional/professionalMessagesApi";
import type { Thread, ThreadUpdatedEvent } from "../types/chat.types";

export const useChatThreads = (currentThreadId?: string | null) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [fetchThreads, { isLoading }] = useLazyGetThreadsQuery();

  // Expose method to add a new thread
  const addThread = useCallback((newThread: Thread) => {
    setThreads((prev) => {
      // Check if thread already exists
      const exists = prev.some((t) => t._id === newThread._id);
      if (exists) {
        // Update existing thread and move to top
        return [newThread, ...prev.filter((t) => t._id !== newThread._id)];
      }
      // Add new thread to top
      return [newThread, ...prev];
    });
  }, []);

  // Load initial threads
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const result = await fetchThreads({ limit: 20 }).unwrap();
        if (result.success && result.data) {
          setThreads(result.data);
          setHasMore(result.data.length === 20);
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
      } finally {
        setHasLoaded(true);
      }
    };

    loadThreads();

    // Refresh threads when socket connects to get updated online status
    const handleConnect = () => {
      loadThreads();
    };

    socketService.on("connect", handleConnect);

    return () => {
      socketService.off("connect", handleConnect);
    };
  }, [fetchThreads]);

  // Load more threads (pagination)
  const loadMoreThreads = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const oldestThread = threads[threads.length - 1];
      if (!oldestThread) return;

      const result = await fetchThreads({
        before: oldestThread._id,
        limit: 20,
      }).unwrap();

      if (result.success && result.data) {
        setThreads((prev) => [...prev, ...result.data]);
        setHasMore(result.data.length === 20);
      }
    } catch (error) {
      console.error("Failed to load more threads:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [threads, hasMore, isLoadingMore, fetchThreads]);

  // Handle presence updates
  useEffect(() => {
    const handleUserOnline = (data: unknown) => {
      const { userId, lastSeenAt } = data as { userId: string; lastSeenAt?: string };
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.peer?.id === userId) {
            return { ...thread, peer: { ...thread.peer, online: true, lastSeenAt } };
          }
          return thread;
        }),
      );
    };

    const handleUserOffline = (data: unknown) => {
      const { userId, lastSeenAt } = data as { userId: string; lastSeenAt?: string };
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.peer?.id === userId) {
            return { ...thread, peer: { ...thread.peer, online: false, lastSeenAt } };
          }
          return thread;
        }),
      );
    };

    socketService.on("user:online", handleUserOnline);
    socketService.on("user:offline", handleUserOffline);

    return () => {
      socketService.off("user:online", handleUserOnline);
      socketService.off("user:offline", handleUserOffline);
    };
  }, []); // Empty deps - handlers use functional updates

  // Handle thread updates from socket
  useEffect(() => {
    const handleThreadUpdated = (data: unknown) => {
      const threadUpdate = data as ThreadUpdatedEvent;
      setThreads((prev) => {
        const existingIndex = prev.findIndex((t) => t._id === threadUpdate.threadId);

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const isIncomingUpdate = threadUpdate.actorUserId === existing.peer?.id;
          // Update existing thread and move to top
          const updated = {
            ...existing,
            lastMessage: threadUpdate.lastMessage,
            unreadCount:
              threadUpdate.unreadCount ??
              (threadUpdate.threadId === currentThreadId
                ? 0
                : isIncomingUpdate
                  ? (existing.unreadCount || 0) + 1
                  : existing.unreadCount),
            updatedAt: new Date().toISOString(),
          };
          return [updated, ...prev.filter((t) => t._id !== threadUpdate.threadId)];
        }

        // Thread not in list, could fetch it or ignore
        return prev;
      });
    };

    const handleNewMessage = (data: unknown) => {
      const message = data as {
        _id: string;
        threadId: string;
        type: string;
        text?: string;
        createdAt: string;
        senderId: string;
      };
      // Update thread with new message
      // Only increment unread if this thread is not currently open
      setThreads((prev) =>
        prev.reduce<Thread[]>((acc, thread) => {
          if (thread._id !== message.threadId) {
            acc.push(thread);
            return acc;
          }

          const isIncomingMessage = message.senderId === thread.peer?.id;
          const isCurrentOpenThread = thread._id === currentThreadId;

          const shouldIncrementUnread = isIncomingMessage && !isCurrentOpenThread;

          const updatedThread: Thread = {
            ...thread,
            unreadCount: shouldIncrementUnread ? (thread.unreadCount || 0) + 1 : 0,
            lastMessage: {
              _id: message._id,
              type: message.type as "TEXT" | "IMAGE" | "VIDEO" | "FILE",
              text: message.text,
              sentAt: message.createdAt,
              senderId: message.senderId,
            },
            updatedAt: message.createdAt,
          };

          acc.unshift(updatedThread);
          return acc;
        }, []),
      );
    };

    socketService.on("chat:thread:updated", handleThreadUpdated);
    socketService.on("chat:new", handleNewMessage);

    return () => {
      socketService.off("chat:thread:updated", handleThreadUpdated);
      socketService.off("chat:new", handleNewMessage);
    };
  }, [currentThreadId]);

  // Clear unread count for a thread
  const clearUnreadCount = useCallback((threadId: string) => {
    setThreads((prev) => prev.map((thread) => (thread._id === threadId ? { ...thread, unreadCount: 0 } : thread)));
  }, []);

  return {
    threads,
    isLoading,
    hasLoaded,
    hasMore,
    isLoadingMore,
    loadMoreThreads,
    clearUnreadCount,
    addThread,
  };
};
