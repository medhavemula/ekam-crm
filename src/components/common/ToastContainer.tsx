import { Toast } from "./Toast";
import type { ToastType } from "./Toast";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
  position?: "top-right" | "bottom-right";
}

export function ToastContainer({ toasts, onRemove, position = "top-right" }: ToastContainerProps) {
  const posClass = position === "bottom-right" ? "fixed bottom-4 right-4" : "fixed top-4 right-4";
  return (
    <div className={`${posClass} z-50 flex flex-col gap-2`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}
