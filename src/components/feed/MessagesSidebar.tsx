import GradientContainer from "../common/GradientContainer";

export interface Message {
  id: string | number;
  senderName: string;
  senderAvatar?: string;
  message: string;
  time: string;
  isUnread?: boolean;
  unreadCount?: number;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface MessagesSidebarProps {
  messages: Message[];
  onMessageClick?: (messageId: string | number) => void;
  onViewMore?: () => void;
  isLoading?: boolean;
  showViewMore?: boolean;
}

/**
 * MessagesSidebar Component
 *
 * Reusable messages sidebar for displaying recent messages.
 */
export const MessagesSidebar = ({ 
  messages, 
  onMessageClick, 
  onViewMore,
  isLoading = false,
  showViewMore = false
}: MessagesSidebarProps) => {
  return (
    <GradientContainer>
      <div className="rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Messages</h3>
          {showViewMore && messages.length > 0 && (
            <button
              onClick={onViewMore}
              className="text-sm text-[#D85D27] hover:text-[#C24F20] font-medium transition-colors"
            >
              View All
            </button>
          )}
        </div>
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`loading-${index}`} className="flex items-start gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-800 rounded w-full animate-pulse"></div>
                </div>
              </div>
            ))
          ) : messages.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
          ) : (
            messages.map((message: Message) => (
              <div
                key={message.id}
                onClick={() => onMessageClick?.(message.id)}
                className="flex items-start gap-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors group"
              >
                {/* Avatar with online status */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {message.senderAvatar ? (
                      <img 
                        src={message.senderAvatar} 
                        alt={message.senderName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {message.senderName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {message.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {message.senderName}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {message.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate pr-2">
                      {message.message}
                    </p>
                    {(message.unreadCount ?? 0) > 0 ? (
                      <div className="min-w-[18px] h-[18px] bg-[#D85D27] rounded-full flex items-center justify-center flex-shrink-0 px-1">
                        <span className="text-[10px] font-bold text-white leading-none">
                          {message.unreadCount! > 99 ? "99+" : message.unreadCount}
                        </span>
                      </div>
                    ) : message.isUnread ? (
                      <div className="w-2 h-2 bg-[#D85D27] rounded-full flex-shrink-0"></div>
                    ) : null}
                  </div>
                  
                  {/* {message.lastSeen && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {message.isOnline ? 'Online' : `Last seen ${message.lastSeen}`}
                    </p>
                  )} */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default MessagesSidebar;
