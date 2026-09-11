import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface Group {
  id: string;
  name: string;
  description: string;
  date: string;
  avatar?: string;
  memberCount?: number;
}

export interface GroupsSidebarProps {
  groups: Group[];
  onGroupClick?: (groupId: string) => void;
  onViewMore?: () => void;
  showViewMore?: boolean;
}

/**
 * GroupsSidebar Component
 * 
 * Reusable groups sidebar for displaying user's groups.
 */
export const GroupsSidebar: React.FC<GroupsSidebarProps> = ({
  groups,
  onGroupClick,
  onViewMore,
  showViewMore = false,
}) => {
  return (
    <GradientContainer>
    <div className='rounded-2xl p-4 md:p-6'>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">My Groups</h3>
        {showViewMore && groups.length > 0 && (
          <button
            onClick={onViewMore}
            className="text-sm text-[#D85D27] hover:text-[#C24F20] font-medium transition-colors"
          >
            View All
          </button>
        )}
      </div>
      <div className="space-y-4">
        {groups.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No groups</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupClick?.(group.id)}
              className="p-3 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors"
            >
              {/* Group Header */}
              <div className="flex items-start gap-3 mb-2">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {group.avatar ? (
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-orange-500 mb-1 truncate">
                    {group.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{group.date}</span>
                    {group.memberCount && (
                      <>
                        <span>•</span>
                        <span>{group.memberCount} members</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Description */}
              <p className="text-xs text-gray-400 line-clamp-2">{group.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
    </GradientContainer>
  );
};

export default GroupsSidebar;
