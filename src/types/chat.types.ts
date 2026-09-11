export type MessageType = "TEXT" | "IMAGE" | "FILE" | "VIDEO";
export type MessageStatus = "sending" | "delivered" | "seen" | "failed";

export interface ThreadParticipant {
  userId: string;
  name?: string;
  avatar?: string;
  lastReadAt?: string;
  blocked?: boolean;
}

export interface PeerInfo {
  id: string;
  name: string;
  photoUrl?: string;
  photoUrlDecrypted?: string;
  online: boolean;
  lastSeenAt?: string;
}

export interface LastMessage {
  _id: string;
  type: MessageType;
  text?: string;
  sentAt: string;
  senderId: string;
}

export interface Thread {
  _id: string;
  type: string;
  participants: ThreadParticipant[];
  peer?: PeerInfo; // Backend returns this for direct threads
  lastMessage?: LastMessage;
  unreadCount?: number;
  createdAt?: string;
  updatedAt: string;
  nextCursor?: string;
}

export interface MediaMeta {
  key: string;
  url: string;
  mime: string;
  size: number;
}

export interface DeliveryReceipt {
  userId: string;
  at: string;
}

export interface ReadReceipt {
  userId: string;
  at: string;
}

export interface Message {
  _id: string;
  threadId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  media?: MediaMeta;
  deliveredTo?: DeliveryReceipt[];
  readBy?: ReadReceipt[];
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
}

export interface SendMessagePayload {
  threadId: string;
  clientId: string;
  type: MessageType;
  text?: string;
  mediaKey?: string;
  mediaMeta?: Omit<MediaMeta, "url">;
}

export interface PresignRequest {
  mime: string;
  size: number;
  kind: "IMAGE" | "FILE" | "VIDEO";
}

export interface PresignResponse {
  key: string;
  uploadUrl: string;
  viewUrl: string;
}

export interface SocketAckResponse {
  ok: boolean;
  messageId?: string;
  error?: string;
  message?: string;
}

export interface TypingIndicator {
  threadId: string;
  userId: string;
  isTyping: boolean;
}

export interface ThreadUpdatedEvent {
  threadId: string;
  lastMessage: LastMessage;
  unreadCount?: number;
  actorUserId?: string;
}

export interface ReadEvent {
  threadId: string;
  userId: string;
  at: string;
  lastMessageId?: string;
}

export interface DeliveredEvent {
  threadId: string;
  messageId: string;
  to: string;
  at: string;
}
