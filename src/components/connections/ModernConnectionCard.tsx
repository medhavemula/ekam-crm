import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface ModernConnectionCardProps {
  id: string | number;
  name: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  status?: 'connected' | 'sent' | 'received';
  connectionCount?: number;
  subcategory?: string;
  onViewProfile?: (id: string | number) => void;
  onSendMessage?: (id: string | number) => void;
  onConnect?: (id: string | number) => void;
  onAccept?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onRemove?: (id: string | number) => void;
  connectDisabled?: boolean;
  showButtonText?: boolean;
  buttonText?: string;
  isAdmin?: boolean;
}

/**
 * ModernConnectionCard Component
 * 
 * A modern, clean design for displaying connection suggestions with a simple connect button.
 * Features a profile image, name, title, and a prominent connect button.
 */
export const ModernConnectionCard: React.FC<ModernConnectionCardProps> = ({
  id,
  name,
  company,
  role,
  avatarUrl,
  status,
  connectionCount = 0,
  onViewProfile,
  onSendMessage,
  showButtonText = true,
  buttonText = 'Message',
  isAdmin = false,
  onAccept,
  onReject,
  onRemove
}) => {
  return (
    <GradientContainer className="h-full">
      <div
        className="relative rounded-xl p-3 overflow-hidden group cursor-pointer h-full min-h-[88px]"
        onClick={() => onViewProfile?.(id)}
      >

        <div className="relative z-10 flex items-start gap-4 h-full">
          {/* Profile Image */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0 w-full h-full flex flex-col">
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-start w-full gap-2">
                <div className="flex items-center gap-2 max-w-[calc(100%-80px)]">
                  <h3 className="text-sm font-bold text-white mb-0.5 break-words truncate leading-tight flex-1 min-w-0">
                    {name}
                  </h3>
                  {isAdmin && (
                    <span className="text-xs font-medium text-orange-500 flex-shrink-0">
                      Admin
                    </span>
                  )}
                </div>

                {/* Message Button (Top Right) - Only shown when showButtonText is true */}
                {showButtonText && status === 'connected' && onSendMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendMessage?.(id);
                    }}
                    className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-white border border-orange-500 rounded-full hover:bg-[#D85D27] hover:text-orange-500 transition-colors duration-200 flex items-center gap-1"
                    aria-label="Send message"
                  >
                    <span>{buttonText || 'Message'}</span>
                  </button>
                )}
              </div>

              <div className="w-full">
                {company && (
                  <p className="text-sm text-gray-300 mb-0.5 break-words truncate leading-snug">
                    {company}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {role && (!company || role.trim().toLowerCase() !== company.trim().toLowerCase()) && (
                    <p className="text-xs text-gray-500 break-words truncate leading-snug">
                      {role}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Count */}
            {connectionCount > 0 && (
              <div className="mt-auto text-xs text-gray-500 flex items-center">
                <span className="font-medium">{connectionCount}</span>
                <span className="ml-1">connection{connectionCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {status === 'connected' && onRemove && (
              <div className="mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(id);
                  }}
                  className="w-full px-2 py-1 text-xs font-medium text-red-100 border border-red-500/70 rounded-full hover:bg-red-500/15 transition-colors"
                >
                  Remove Connection
                </button>
              </div>
            )}
            {status === 'received' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept?.(id);
                  }}
                  className="flex-1 px-2 py-1 text-xs font-medium text-white border border-orange-500 rounded-full hover:bg-[#D85D27] transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject?.(id);
                  }}
                  className="flex-1 px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded-full hover:bg-gray-600 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default ModernConnectionCard;
