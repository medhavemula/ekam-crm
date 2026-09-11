import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface MemberCardProps {
  name: string;
  role: string;
  location: string;
  avatarColor: string;
  avatarInitial: string;
  onEdit?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  name,
  role,
  location,
  avatarColor,
  avatarInitial,
  onEdit,
}) => {
  return (
    <GradientContainer className="h-full">
      <div className="p-5 md:p-6 rounded-2xl h-full flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {avatarInitial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{name}</h3>
          <p className="text-gray-400 text-sm truncate">{role}</p>
          <p className="text-gray-500 text-xs truncate">{location}</p>
        </div>

        {/* Edit Button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="h-9 px-4 rounded-md border-2 border-[#D85D27] text-white text-sm font-medium transition-colors hover:bg-[#D85D27]/10 shrink-0 self-start"
          >
            Edit
          </button>
        )}
      </div>
    </GradientContainer>
  );
};

export default MemberCard;
