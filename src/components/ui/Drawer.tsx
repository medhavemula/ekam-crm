import React from "react";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children?: React.ReactNode;
};

export default function Drawer({ open, onClose, side = "right", title, children }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative ml-auto h-full w-full max-w-md bg-white shadow-lg ${side==='left'?'ml-0 mr-auto':'ml-auto'}`}>
        {title && <div className="px-4 py-3 border-b text-lg font-semibold">{title}</div>}
        <div className="p-4 overflow-auto h-full">{children}</div>
      </div>
    </div>
  );
}
