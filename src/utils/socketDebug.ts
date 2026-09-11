import { socketService } from "../services/socketService";

export const socketDebug = {
  getConnectionInfo: () => {
    const socket = socketService.getSocket();
    return {
      isConnected: socketService.isConnected(),
      socketId: socket?.id,
      transport: socket?.io.engine.transport.name,
    };
  },

  logConnectionInfo: () => {
    const info = socketDebug.getConnectionInfo();
    console.log("[Socket Debug]", info);
    return info;
  },
};

// Expose to window for debugging in development
if (import.meta.env.DEV) {
  (window as unknown as { socketDebug: typeof socketDebug }).socketDebug = socketDebug;
  (window as unknown as { socketService: typeof socketService }).socketService = socketService;
}
