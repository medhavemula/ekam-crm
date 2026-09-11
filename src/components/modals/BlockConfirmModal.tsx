import React from "react";
import GradientContainer from "../common/GradientContainer";

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerName?: string;
  mode?: "block" | "unblock"; // ✅ NEW: controls the text only
}

export const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode = "block",
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const isBlock = mode === "block";

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <GradientContainer className="max-w-md w-full mx-auto">
          <div className="p-6 md:p-8 rounded-2xl">
            {/* Icon block unchanged */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-700 border-2 border-[#1a2332] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 🔤 Only the text changes */}
            <h2 className="text-2xl font-semibold text-white text-center mb-8">
              {isBlock ? "You sure you want to block?" : "You sure you want to unblock?"}
            </h2>

            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 px-6 rounded-lg border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium transition-colors"
              >
                {isBlock ? "Yes, Block" : "Yes, Unblock"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-12 px-6 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </>
  );
};

export default BlockConfirmModal;