import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { socketService } from "../services/socketService";
import type { Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  token: string | null;
}

export function SocketProvider({ children, token }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      // Only force disconnect if we actually have a socket
      if (socketService.getSocket()) {
        socketService.forceDisconnectAll();
      }
      setIsConnected(false);
      setSocket(null);
      return;
    }

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

    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("connect_error", handleConnectError);

    const socketInstance = socketService.connect(token);
    setSocket(socketInstance);
    setIsConnected(socketService.isConnected());

    return () => {
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("connect_error", handleConnectError);
      socketService.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={{ socket, isConnected, connectionError }}>{children}</SocketContext.Provider>;
}

// Export hook separately to avoid Fast Refresh issues
export { SocketContext };
