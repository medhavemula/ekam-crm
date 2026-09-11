
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "accept" | "reject";
  title?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isAccept = type === "accept";
  const defaultTitle = isAccept
    ? "You sure you want to accept event?"
    : "You sure you want to reject event?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a2332] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {isAccept ? (
            // Accept icon - calendar with checkmark
            <svg
              className="w-16 h-16 text-[#D85D27]"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="8" y="12" width="48" height="44" rx="4" />
              <line x1="8" y1="24" x2="56" y2="24" />
              <line x1="20" y1="8" x2="20" y2="16" />
              <line x1="44" y1="8" x2="44" y2="16" />
              <polyline points="24,38 30,44 42,32" strokeWidth="3" />
            </svg>
          ) : (
            // Reject icon - calendar with X
            <svg
              className="w-16 h-16 text-[#D85D27]"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="8" y="12" width="48" height="44" rx="4" />
              <line x1="8" y1="24" x2="56" y2="24" />
              <line x1="20" y1="8" x2="20" y2="16" />
              <line x1="44" y1="8" x2="44" y2="16" />
              <line x1="26" y1="34" x2="38" y2="46" strokeWidth="3" />
              <line x1="38" y1="34" x2="26" y2="46" strokeWidth="3" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2 className="text-white text-xl text-center mb-8">
          {title || defaultTitle}
        </h2>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onConfirm}
            className="px-8 py-3 rounded-lg border border-[#D85D27] text-white hover:bg-[#D85D27]/10 transition-colors min-w-[140px]"
          >
            {isAccept ? "Yes, Accept" : "Yes, Reject"}
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors min-w-[140px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
