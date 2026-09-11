import { useContext } from "react";
import { SocketContext } from "../contexts/SocketContext";

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }
  return context;
}
