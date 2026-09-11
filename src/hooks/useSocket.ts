import { useEffect, useRef, useState } from "react";
import { socketService } from "../services/socketService";
import type { Socket } from "socket.io-client";

export const useSocket = (token: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      if (isInitializedRef.current) {
        socketService.disconnect();
        isInitializedRef.current = false;
      }
      setIsConnected(false);
      socketRef.current = null;
      return;
    }

    // Setup connection listeners
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: unknown) => {
      const err = error as Error;
      setConnectionError(err.message);
      setIsConnected(false);
    };

    // Register listeners before connecting
    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("connect_error", handleConnectError);

    // Connect socket (will reuse existing connection if available)
    const socket = socketService.connect(token);
    socketRef.current = socket;
    isInitializedRef.current = true;

    // Set initial state
    setIsConnected(socketService.isConnected());

    // Cleanup
    return () => {
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("connect_error", handleConnectError);

      // Decrement ref count, only disconnects if no more consumers
      socketService.disconnect();
      isInitializedRef.current = false;
    };
  }, [token]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
  };
};
