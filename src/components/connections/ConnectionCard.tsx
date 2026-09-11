import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface ConnectionCardProps {
  id: string | number;
  name: string;
  title: string;
  company: string;
  avatarUrl?: string;
  status?: "connected" | "sent" | "received";
  onViewProfile?: (id: string | number) => void;
  onSendMessage?: (id: string | number) => void;
  onConnect?: (id: string | number) => void;
  onAccept?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onWithdraw?: (id: string | number) => void;
  /** Set when a notification linked straight to this record (WEB-BUS-28). */
  highlighted?: boolean;
  onRemove?: (id: string | number) => void;
  note?: string;
  connectDisabled?: boolean;
}

/**
 * ConnectionCard Component
 *
 * Reusable card component for displaying connection information.
 * Supports different states: connected, sent request, received request, or new connection.
 */
export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  id,
  name,
  title,
  company,
  avatarUrl,
  status,
  onViewProfile,
  onSendMessage,
  onConnect,
  onAccept,
  onReject,
  onWithdraw,
  highlighted = false,
  onRemove,
  note,
  connectDisabled,
}) => {
  // Bring the record a notification pointed at into view, once, on mount.
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!highlighted || !rootRef.current) return;
    rootRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlighted]);

  return (
    <GradientContainer>
      <div
        ref={rootRef}
        className={
          highlighted
            ? "rounded-xl p-3 ring-2 ring-[#D85D27] transition-colors"
            : "rounded-xl p-3 hover:border-orange-500/50 transition-colors"
        }
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Info & Actions */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="mb-2">
              <h3 className="text-base font-bold text-white mb-1 truncate">{name}</h3>
              <p className="text-xs text-gray-300 mb-0.5 truncate">{title}</p>
              <p className="text-xs text-[#D85D27] font-medium truncate">{company}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {status === "connected" && (
                <>
                  <button
                    onClick={() => onViewProfile?.(id)}
                    className="flex-1 px-3 py-1.5 bg-transparent border border-[#D85D27] hover:bg-[#D85D27] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => onSendMessage?.(id)}
                    className="flex-1 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Send Message
                  </button>
                  <button
                    onClick={() => onRemove?.(id)}
                    className="flex-1 px-3 py-1.5 bg-transparent border border-red-500/70 hover:bg-red-500/15 text-red-100 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Remove
                  </button>
                </>
              )}

              {status === "sent" && (
                <>
                  <button
                    onClick={() => onViewProfile?.(id)}
                    className="flex-1 px-3 py-1.5 bg-transparent border border-[#D85D27] hover:bg-[#D85D27] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    View Profile
                  </button>
                  <button
                    disabled
                    className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg cursor-not-allowed"
                  >
                    Sent
                  </button>
                  <button
                    onClick={() => onWithdraw?.(id)}
                    className="flex-1 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Withdraw
                  </button>
                </>
              )}

              {status === "received" && (
                <>
                  <button
                    onClick={() => onViewProfile?.(id)}
                    className="flex-1 px-3 py-1.5 bg-transparent border border-[#D85D27] hover:bg-[#D85D27] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => onAccept?.(id)}
                    className="flex-1 px-3 py-1.5 bg-transparent border border-[#D85D27] hover:bg-[#D85D27] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onReject?.(id)}
                    className="flex-1 px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}

              {!status && (
                <>
                  {onViewProfile && (
                    <button
                      onClick={() => onViewProfile?.(id)}
                      className="flex-1 px-3 py-1.5 bg-transparent border border-[#D85D27] hover:bg-[#D85D27] text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      View Profile
                    </button>
                  )}
                  <button
                    onClick={() => onConnect?.(id)}
                    disabled={!!connectDisabled}
                    className={`flex-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${connectDisabled ? "bg-gray-600 cursor-not-allowed" : "bg-[#374151] hover:bg-[#4B5563]"}`}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>

            {note && <div className="mt-1 text-xs text-gray-400 line-clamp-2">{note}</div>}
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default ConnectionCard;
