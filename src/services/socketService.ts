import { io, Socket } from "socket.io-client";
import type {
  Message,
  SendMessagePayload,
  SocketAckResponse,
  TypingIndicator,
  ThreadUpdatedEvent,
  ReadEvent,
  DeliveredEvent,
} from "../types/chat.types";

type SocketEventCallback = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<string, Set<SocketEventCallback>> = new Map();
  private joinedThreads: Set<string> = new Set();
  private currentToken: string | null = null;
  private refCount = 0; // Track number of active consumers
  private isConnecting = false; // Prevent race conditions
  private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(token: string): Socket {
    this.refCount++;

    // Cancel any pending disconnect
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    // If socket exists and is connected with same token, reuse it
    if (this.socket && this.currentToken === token) {
      if (this.socket.connected) {
        return this.socket;
      }
      // Socket exists but disconnected, try to reconnect
      if (!this.socket.connected && !this.isConnecting) {
        this.socket.connect();
        return this.socket;
      }
    }

    // Token changed, disconnect old socket and create new one
    if (this.socket && this.currentToken !== token) {
      this.forceDisconnect();
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      // Wait for current connection attempt
      return this.socket!;
    }

    // Only create new socket if none exists
    if (!this.socket) {
      this.isConnecting = true;
      this.currentToken = token;
      const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:4000/ws/chat";

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      this.isConnecting = false;
    }

    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.joinedThreads.forEach((threadId) => {
        this.socket?.emit("chat:join", { threadId });
      });
      this.notifyListeners("connect");
    });

    this.socket.on("disconnect", (reason) => {
      this.notifyListeners("disconnect", reason);
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      this.notifyListeners("connect_error", error);
    });

    // Chat events
    this.socket.on("chat:new", (message: Message) => {
      this.notifyListeners("chat:new", message);
    });

    this.socket.on("chat:delivered", (data: DeliveredEvent) => {
      this.notifyListeners("chat:delivered", data);
    });

    this.socket.on("chat:thread:updated", (data: ThreadUpdatedEvent) => {
      this.notifyListeners("chat:thread:updated", data);
    });

    this.socket.on("chat:read", (data: ReadEvent) => {
      this.notifyListeners("chat:read", data);
    });

    this.socket.on("chat:typing", (data: TypingIndicator) => {
      this.notifyListeners("chat:typing", data);
    });

    // Presence events
    this.socket.on("user:online", (data: { userId: string }) => {
      this.notifyListeners("user:online", data);
    });

    this.socket.on("user:offline", (data: { userId: string }) => {
      this.notifyListeners("user:offline", data);
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("chat:heartbeat");
      }
    }, 30000);
  }

  disconnect(): void {
    this.refCount = Math.max(0, this.refCount - 1);

    // Disconnect after a delay if no more consumers
    // This prevents rapid connect/disconnect when navigating between pages
    if (this.refCount === 0) {
      // Cancel any existing timeout
      if (this.disconnectTimeout) {
        clearTimeout(this.disconnectTimeout);
      }

      // Disconnect after 500ms if still no consumers
      this.disconnectTimeout = setTimeout(() => {
        if (this.refCount === 0) {
          this.forceDisconnect();
        }
      }, 500);
    }
  }

  private forceDisconnect(): void {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.currentToken = null;
    this.isConnecting = false;
    // Don't clear event listeners - they're managed by components
    this.refCount = 0;
  }

  // Force disconnect without ref counting (for logout, etc.)
  forceDisconnectAll(): void {
    this.refCount = 0;
    this.forceDisconnect();
    this.eventListeners.clear(); // Clear all listeners on logout
  }

  // Update token and reconnect (for token refresh)
  updateToken(newToken: string): void {
    if (this.currentToken === newToken) return;

    const wasConnected = this.isConnected();
    this.currentToken = newToken;

    if (wasConnected && this.socket) {
      // Reconnect with new token
      this.socket.auth = { token: newToken };
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Event listener management
  on(event: string, callback: SocketEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: SocketEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      // Clean up empty listener sets to prevent memory leaks
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  // Get listener count for debugging
  getListenerCount(event?: string): number {
    if (event) {
      return this.eventListeners.get(event)?.size || 0;
    }
    let total = 0;
    this.eventListeners.forEach((listeners) => {
      total += listeners.size;
    });
    return total;
  }

  private notifyListeners(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(...args));
    }
  }

  // Chat operations
  joinThread(threadId: string): void {
    this.joinedThreads.add(threadId);
    if (this.socket?.connected) {
      this.socket.emit("chat:join", { threadId });
    }
  }

  leaveThread(threadId: string): void {
    this.joinedThreads.delete(threadId);
    if (this.socket?.connected) {
      this.socket.emit("chat:leave", { threadId });
    }
  }

  sendMessage(payload: SendMessagePayload, callback?: (response: SocketAckResponse) => void): void {
    if (this.socket?.connected) {
      this.socket.emit("chat:send", payload, callback);
    } else {
      callback?.({ ok: false, error: "NOT_CONNECTED", message: "Socket not connected" });
    }
  }

  markAsRead(threadId: string, lastMessageId?: string, callback?: (response: SocketAckResponse) => void): void {
    if (this.socket?.connected) {
      this.socket.emit("chat:read", { threadId, lastMessageId }, callback);
    } else {
      callback?.({ ok: false, error: "NOT_CONNECTED", message: "Socket not connected" });
    }
  }

  sendTyping(threadId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit("chat:typing", { threadId, isTyping });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getRefCount(): number {
    return this.refCount;
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected(),
      refCount: this.refCount,
      hasSocket: !!this.socket,
      socketId: this.socket?.id,
      currentToken: this.currentToken ? "***" + this.currentToken.slice(-8) : null,
      isConnecting: this.isConnecting,
      listenerCount: this.getListenerCount(),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export const socketService = new SocketService();
