import React from "react";
import Button from "./Button";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative p-[2px] rounded-[16px] bg-gradient-to-br from-[rgba(255,255,255,0.25)] via-[rgba(92,92,92,0.15)] to-[rgba(255,255,255,0)] w-full max-w-2xl mx-4">
        <div className="h-full rounded-[14px] bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
          {title && <div className="px-4 py-3 border-b border-gray-700 text-lg font-semibold text-white">{title}</div>}
          <div className="px-4 py-3 text-white">{children}</div>
          <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
            {footer ?? (
              <>
                <Button variant="secondary" onClick={onClose}>Close</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
