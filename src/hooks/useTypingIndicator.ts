import { useEffect, useState, useCallback, useRef } from "react";
import { socketService } from "../services/socketService";
import type { TypingIndicator } from "../types/chat.types";

export const useTypingIndicator = (threadId: string | null, currentUserId: string) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for typing events
  useEffect(() => {
    if (!threadId) return;

    const handleTyping = (data: unknown) => {
      const typingData = data as TypingIndicator;
      if (typingData.threadId === threadId && typingData.userId !== currentUserId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (typingData.isTyping) {
            next.add(typingData.userId);
          } else {
            next.delete(typingData.userId);
          }
          return next;
        });
      }
    };

    socketService.on("chat:typing", handleTyping);

    return () => {
      socketService.off("chat:typing", handleTyping);
    };
  }, [threadId, currentUserId]);

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!threadId) return;

      socketService.sendTyping(threadId, isTyping);

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          socketService.sendTyping(threadId, false);
        }, 3000);
      }
    },
    [threadId],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers: Array.from(typingUsers),
    sendTyping,
  };
};
