# Chat API Integration Guide

Complete guide for implementing real-time chat messaging with Socket.IO and REST API.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [API Endpoints](#api-endpoints)
4. [Socket Events](#socket-events)
5. [Implementation Guide](#implementation-guide)
6. [Usage Examples](#usage-examples)

---

## Architecture Overview

The chat system uses a **hybrid approach**:

- **REST API** for fetching threads, messages, and media uploads
- **Socket.IO** for real-time messaging, typing indicators, and presence

### Key Features

- ✅ Real-time messaging with Socket.IO
- ✅ Direct (1-on-1) threads
- ✅ Message types: TEXT, IMAGE, VIDEO, FILE
- ✅ Typing indicators
- ✅ Online/offline presence
- ✅ Read receipts and delivery status
- ✅ Media upload with presigned URLs
- ✅ Pagination for threads and messages
- ✅ Optimistic UI updates

---

## Core Components

### 1. Socket Service (`src/services/socketService.ts`)

Singleton service managing WebSocket connection and events.

**Key Methods:**

```typescript
// Connection
connect(token: string): Socket
disconnect(): void
isConnected(): boolean

// Thread operations
joinThread(threadId: string): void
leaveThread(threadId: string): void

// Messaging
sendMessage(payload: SendMessagePayload, callback?: Function): void
markAsRead(threadId: string, lastMessageId?: string): void
sendTyping(threadId: string, isTyping: boolean): void

// Event listeners
on(event: string, callback: Function): void
off(event: string, callback: Function): void
```

**Features:**

- Auto-reconnection with exponential backoff
- Heartbeat every 30 seconds
- Event listener management
- Connection state tracking

---

### 2. Custom Hooks

#### `useChatThreads(currentThreadId?)`

Manages chat thread list with real-time updates.

**Returns:**

```typescript
{
  threads: Thread[],           // List of threads
  isLoading: boolean,          // Initial load state
  hasMore: boolean,            // More threads available
  isLoadingMore: boolean,      // Pagination load state
  loadMoreThreads: () => void, // Load next page
  clearUnreadCount: (id) => void // Clear unread for thread
}
```

**Features:**

- Loads threads with pagination (20 per page)
- Real-time thread updates
- Online/offline presence updates
- Unread count management

---

#### `useChatMessages(threadId, currentUserId)`

Manages messages for a specific thread.

**Returns:**

```typescript
{
  messages: Message[],          // List of messages
  isLoading: boolean,           // Initial load state
  hasMore: boolean,             // More messages available
  isLoadingMore: boolean,       // Pagination load state
  loadMoreMessages: () => void, // Load older messages
  sendMessage: (payload) => void // Send new message
}
```

**Features:**

- Loads messages with pagination (30 per page)
- Optimistic UI updates
- Auto-joins/leaves thread
- Handles delivery and read receipts
- Deduplicates messages

---

#### `useTypingIndicator(threadId, currentUserId)`

Manages typing indicators.

**Returns:**

```typescript
{
  typingUsers: string[],        // Array of user IDs typing
  sendTyping: (isTyping) => void // Send typing status
}
```

**Features:**

- Auto-stops typing after 3 seconds
- Filters out current user
- Real-time updates

---

#### `useSocket(token)`

Manages socket connection lifecycle.

**Returns:**

```typescript
{
  socket: Socket | null,        // Socket instance
  isConnected: boolean,         // Connection state
  connectionError: string | null // Error message
}
```

---

### 3. RTK Query API (`src/services/professional/professionalMessagesApi.ts`)

REST API endpoints using Redux Toolkit Query.

**Endpoints:**

```typescript
// Threads
getThreads({ before?, limit? })
createDirectThread({ peerId })

// Messages
getMessages({ threadId, before?, limit? })
sendMessage({ threadId, clientId, type, text? })
markAsRead({ threadId, lastMessageId? })

// Media
getPresignedUrl({ mime, size, kind })

// Thread actions
deleteMessage({ threadId, messageId })
blockThread({ threadId })
unblockThread({ threadId })
```

---

## API Endpoints

### REST API Base URL

```
/chat
```

### Endpoints

#### 1. Get Threads

```http
GET /chat/threads?before={threadId}&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "thread123",
      "type": "DIRECT",
      "participants": [...],
      "peer": {
        "id": "user456",
        "name": "John Doe",
        "photoUrl": "https://...",
        "online": true
      },
      "lastMessage": {
        "_id": "msg789",
        "type": "TEXT",
        "text": "Hello!",
        "sentAt": "2024-01-01T12:00:00Z",
        "senderId": "user456"
      },
      "unreadCount": 2,
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

#### 2. Create Direct Thread

```http
POST /chat/threads/direct
Content-Type: application/json

{
  "peerId": "user456"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    /* Thread object */
  }
}
```

---

#### 3. Get Messages

```http
GET /chat/threads/{threadId}/messages?before={messageId}&limit=30
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "msg123",
      "threadId": "thread456",
      "senderId": "user789",
      "type": "TEXT",
      "text": "Hello!",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

#### 4. Get Presigned URL (Media Upload)

```http
POST /chat/media/presign
Content-Type: application/json

{
  "mime": "image/jpeg",
  "size": 1024000,
  "kind": "IMAGE"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "key": "media/abc123.jpg",
    "uploadUrl": "https://s3.../upload",
    "viewUrl": "https://cdn.../view"
  }
}
```

**Upload Flow:**

1. Get presigned URL from API
2. Upload file to S3 using `uploadUrl` (PUT request)
3. Use `key` when sending message
4. Use `viewUrl` to display media

---

#### 5. Mark as Read

```http
POST /chat/threads/{threadId}/read
Content-Type: application/json

{
  "lastMessageId": "msg123"
}
```

---

## Socket Events

### WebSocket URL

```
ws://localhost:4000/ws/chat
```

### Authentication

```javascript
io(wsUrl, {
  auth: { token: "your-jwt-token" },
});
```

---

### Client → Server Events

#### 1. Join Thread

```javascript
socket.emit("chat:join", { threadId: "thread123" });
```

#### 2. Leave Thread

```javascript
socket.emit("chat:leave", { threadId: "thread123" });
```

#### 3. Send Message

```javascript
socket.emit("chat:send", {
  threadId: "thread123",
  clientId: "msg-client-456",
  type: "TEXT",
  text: "Hello!",
  mediaKey?: "media/abc.jpg",
  mediaMeta?: {
    key: "media/abc.jpg",
    mime: "image/jpeg",
    size: 1024000
  }
}, (response) => {
  if (response.ok) {
    console.log("Message sent:", response.messageId);
  } else {
    console.error("Failed:", response.error);
  }
});
```

#### 4. Mark as Read

```javascript
socket.emit("chat:read", {
  threadId: "thread123",
  lastMessageId: "msg789",
});
```

#### 5. Typing Indicator

```javascript
socket.emit("chat:typing", {
  threadId: "thread123",
  isTyping: true,
});
```

#### 6. Heartbeat

```javascript
socket.emit("chat:heartbeat");
```

---

### Server → Client Events

#### 1. New Message

```javascript
socket.on("chat:new", (message) => {
  // message: Message object
  console.log("New message:", message);
});
```

#### 2. Message Delivered

```javascript
socket.on("chat:delivered", (data) => {
  // data: { threadId, messageId, to, at }
});
```

#### 3. Message Read

```javascript
socket.on("chat:read", (data) => {
  // data: { threadId, userId, at, lastMessageId? }
});
```

#### 4. Thread Updated

```javascript
socket.on("chat:thread:updated", (data) => {
  // data: { threadId, lastMessage }
});
```

#### 5. Typing Indicator

```javascript
socket.on("chat:typing", (data) => {
  // data: { threadId, userId, isTyping }
});
```

#### 6. User Online

```javascript
socket.on("user:online", (data) => {
  // data: { userId }
});
```

#### 7. User Offline

```javascript
socket.on("user:offline", (data) => {
  // data: { userId }
});
```

#### 8. Connection Events

```javascript
socket.on("connect", () => {});
socket.on("disconnect", (reason) => {});
socket.on("connect_error", (error) => {});
```

---

## Implementation Guide

### Step 1: Setup Socket Connection

```typescript
import { useSocket } from "./hooks/useSocket";

function App() {
  const token = localStorage.getItem("accessToken");
  const { isConnected, connectionError } = useSocket(token);

  return (
    <div>
      {!isConnected && <div>Connecting...</div>}
      {connectionError && <div>Error: {connectionError}</div>}
    </div>
  );
}
```

---

### Step 2: Load Threads

```typescript
import { useChatThreads } from "./hooks/useChatThreads";

function ThreadList() {
  const { threads, isLoading, loadMoreThreads } = useChatThreads();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {threads.map(thread => (
        <ThreadItem key={thread._id} thread={thread} />
      ))}
      <button onClick={loadMoreThreads}>Load More</button>
    </div>
  );
}
```

---

### Step 3: Display Messages

```typescript
import { useChatMessages } from "./hooks/useChatMessages";

function ChatWindow({ threadId, currentUserId }) {
  const { messages, sendMessage } = useChatMessages(threadId, currentUserId);

  const handleSend = () => {
    sendMessage({
      clientId: `msg-${Date.now()}`,
      type: "TEXT",
      text: "Hello!"
    });
  };

  return (
    <div>
      {messages.map(msg => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

---

### Step 4: Add Typing Indicator

```typescript
import { useTypingIndicator } from "./hooks/useTypingIndicator";

function ChatInput({ threadId, currentUserId }) {
  const { typingUsers, sendTyping } = useTypingIndicator(threadId, currentUserId);
  const [text, setText] = useState("");

  const handleChange = (e) => {
    setText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  return (
    <div>
      {typingUsers.length > 0 && <div>Someone is typing...</div>}
      <input value={text} onChange={handleChange} />
    </div>
  );
}
```

---

### Step 5: Upload Media

```typescript
import { useGetPresignedUrlMutation } from "./services/professionalMessagesApi";

async function uploadMedia(file: File) {
  const [getPresignedUrl] = useGetPresignedUrlMutation();

  // 1. Get presigned URL
  const result = await getPresignedUrl({
    mime: file.type,
    size: file.size,
    kind: file.type.startsWith("image/") ? "IMAGE" : "FILE",
  }).unwrap();

  // 2. Upload to S3
  await fetch(result.data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  // 3. Send message with media
  sendMessage({
    clientId: `msg-${Date.now()}`,
    type: "IMAGE",
    text: "Check this out!",
    mediaKey: result.data.key,
    mediaMeta: {
      key: result.data.key,
      mime: file.type,
      size: file.size,
    },
  });
}
```

---

## Usage Examples

### Complete Chat Component

```typescript
import { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { useChatThreads } from "./hooks/useChatThreads";
import { useChatMessages } from "./hooks/useChatMessages";
import { useTypingIndicator } from "./hooks/useTypingIndicator";

function ChatApp() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [messageText, setMessageText] = useState("");

  const token = localStorage.getItem("accessToken");
  const currentUserId = "user123";

  // Socket connection
  const { isConnected } = useSocket(token);

  // Threads
  const { threads } = useChatThreads(selectedThread?._id);

  // Messages
  const { messages, sendMessage } = useChatMessages(
    selectedThread?._id,
    currentUserId
  );

  // Typing
  const { typingUsers, sendTyping } = useTypingIndicator(
    selectedThread?._id,
    currentUserId
  );

  const handleSend = () => {
    if (!messageText.trim()) return;

    sendMessage({
      clientId: `msg-${Date.now()}`,
      type: "TEXT",
      text: messageText
    });

    setMessageText("");
    sendTyping(false);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  return (
    <div className="chat-app">
      {/* Connection Status */}
      {!isConnected && <div>Connecting...</div>}

      {/* Thread List */}
      <div className="threads">
        {threads.map(thread => (
          <div
            key={thread._id}
            onClick={() => setSelectedThread(thread)}
          >
            {thread.peer?.name}
            {thread.unreadCount > 0 && (
              <span>{thread.unreadCount}</span>
            )}
          </div>
        ))}
      </div>

      {/* Chat Window */}
      {selectedThread && (
        <div className="chat">
          {/* Messages */}
          <div className="messages">
            {messages.map(msg => (
              <div key={msg._id}>
                {msg.text}
                {msg.status && <span>{msg.status}</span>}
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div>typing...</div>
          )}

          {/* Input */}
          <div className="input">
            <input
              value={messageText}
              onChange={handleTyping}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Type Definitions

### Core Types

```typescript
type MessageType = "TEXT" | "IMAGE" | "FILE" | "VIDEO";
type MessageStatus = "sending" | "delivered" | "seen" | "failed";

interface Thread {
  _id: string;
  type: string;
  participants: ThreadParticipant[];
  peer?: PeerInfo;
  lastMessage?: LastMessage;
  unreadCount?: number;
  updatedAt: string;
}

interface Message {
  _id: string;
  threadId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  media?: MediaMeta;
  createdAt: string;
  clientId?: string;
  status?: MessageStatus;
}

interface PeerInfo {
  id: string;
  name: string;
  photoUrl?: string;
  online: boolean;
}

interface MediaMeta {
  key: string;
  url: string;
  mime: string;
  size: number;
}
```

---

## Best Practices

### 1. Connection Management

- Connect socket only when user is authenticated
- Disconnect on logout
- Handle reconnection gracefully

### 2. Message Handling

- Use `clientId` for optimistic updates
- Deduplicate messages by `_id` and `clientId`
- Handle failed messages with retry option

### 3. Performance

- Paginate threads and messages
- Lazy load media
- Debounce typing indicators

### 4. Error Handling

- Show connection errors to user
- Retry failed messages
- Fallback to REST API if socket fails

### 5. Security

- Always authenticate socket connections
- Validate user permissions on server
- Sanitize message content

---

## Troubleshooting

### Socket Not Connecting

- Check `VITE_WS_URL` environment variable
- Verify JWT token is valid
- Check CORS settings on server

### Messages Not Appearing

- Ensure `joinThread()` is called
- Check socket connection status
- Verify thread ID is correct

### Media Upload Failing

- Check file size limits
- Verify MIME type is supported
- Ensure AWS credentials are configured

### Typing Indicator Not Working

- Verify socket is connected
- Check thread ID matches
- Ensure `sendTyping()` is called on input change

---

## Environment Variables

```env
VITE_WS_URL=ws://localhost:4000/ws/chat
VITE_API_URL=http://localhost:4000/api
```

---

## Summary

This chat system provides a complete real-time messaging solution with:

- ✅ Real-time bidirectional communication
- ✅ Optimistic UI updates
- ✅ Media upload support
- ✅ Typing indicators and presence
- ✅ Read receipts and delivery status
- ✅ Pagination and infinite scroll
- ✅ Error handling and reconnection

All components are modular, reusable, and follow React best practices.
