# Socket Connection Pooling & Management

## Problem Solved

Previously, the app was creating multiple socket connections for the same user, exceeding the backend's `MAX_CONNECTIONS_EXCEEDED` limit (default: 5 connections per user).

## Solution Implemented

### 1. Connection Reuse

- `socketService` now tracks a reference count (`refCount`) of active consumers
- Existing connections are reused when the same token is provided
- Only disconnects when all consumers have cleaned up

### 2. Proper Cleanup

- `useSocket` hook properly decrements ref count on unmount
- Listeners are properly removed to prevent memory leaks
- Socket only disconnects when `refCount` reaches 0

### 3. Token Management

- Tracks current token to detect token changes
- Forces disconnect and reconnect when token changes (e.g., user logout/login)

## Usage

### Option 1: Using the Hook (Current Implementation)

```tsx
import { useSocket } from "../hooks/useSocket";

function MyComponent() {
  const token = localStorage.getItem("accessToken");
  const { socket, isConnected, connectionError } = useSocket(token);

  // Socket is automatically managed
}
```

### Option 2: Using Context Provider (Recommended for App-Wide)

```tsx
// In your App.tsx or main layout
import { SocketProvider } from "./contexts/SocketContext";

function App() {
  const token = localStorage.getItem("accessToken");

  return (
    <SocketProvider token={token}>
      <YourApp />
    </SocketProvider>
  );
}

// In any child component
import { useSocketContext } from "./hooks/useSocketContext";

function MyComponent() {
  const { socket, isConnected, connectionError } = useSocketContext();
}
```

## Debugging

In development mode, you can access debug utilities in the browser console:

```javascript
// Check connection info
window.socketDebug.logConnectionInfo();

// Get ref count
window.socketService.getConnectionInfo();

// Force disconnect all
window.socketService.forceDisconnectAll();
```

## Key Methods

### socketService.connect(token)

- Increments ref count
- Reuses existing connection if token matches
- Creates new connection if needed

### socketService.disconnect()

- Decrements ref count
- Only disconnects when ref count reaches 0

### socketService.forceDisconnectAll()

- Immediately disconnects regardless of ref count
- Use for logout or critical cleanup

## Benefits

- ✅ No more MAX_CONNECTIONS_EXCEEDED errors
- ✅ Reduced server load
- ✅ Faster reconnections (reuses existing socket)
- ✅ Proper cleanup prevents memory leaks
- ✅ Better handling of multiple components using socket
