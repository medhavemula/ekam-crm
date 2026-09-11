import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, XCircle } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export type ToastOptions = {
  title: string;
  description?: string;
  kind?: ToastKind;
  durationMs?: number; // auto dismiss; default 4000
};

export type ToastItem = ToastOptions & { id: string; createdAt: number };

type ToastContextValue = {
  showToast: (opts: ToastOptions) => string; // returns id
  closeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number | undefined>>({});

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current[id];
    if (tm) {
      window.clearTimeout(tm);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastItem = {
      id,
      title: opts.title,
      description: opts.description,
      kind: opts.kind ?? "success",
      durationMs: opts.durationMs ?? 4000,
      createdAt: Date.now(),
    };
    setToasts((prev) => [toast, ...prev].slice(0, 5));
    // setup auto-dismiss
    timers.current[id] = window.setTimeout(() => closeToast(id), toast.durationMs);
    return id;
  }, [closeToast]);

  // Clear timers on unmount
  useEffect(() => () => {
    Object.values(timers.current).forEach((tm) => tm && window.clearTimeout(tm));
    timers.current = {};
  }, []);

  const value = useMemo(() => ({ showToast, closeToast }), [showToast, closeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <ToastContainer toasts={toasts} onClose={closeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[1000] flex w-full max-w-[420px] flex-col gap-2.5">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const isSuccess = toast.kind === "success";
  const isError = toast.kind === "error";

  return (
    <div className="pointer-events-auto overflow-hidden rounded shadow-xl backdrop-blur supports-[backdrop-filter]:bg-black/60 bg-neutral-900/90 text-white">
      <div className="flex">
        <div className={`${isSuccess ? "bg-emerald-600" : isError ? "bg-rose-600" : "bg-sky-600"} flex items-center justify-center px-3 py-4`}>
          {isSuccess ? (
            <Check size={22} className="text-white" />
          ) : isError ? (
            <XCircle size={22} className="text-white" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-base font-semibold leading-6">{toast.title}</div>
              {toast.description ? (
                <div className="mt-0.5 text-xs/6 text-neutral-200">{toast.description}</div>
              ) : null}
            </div>
            <button
              aria-label="Close notification"
              onClick={onClose}
              className="-mr-0.5 -mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
