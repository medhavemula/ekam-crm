import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface CreatePostInputProps {
  userName: string;
  userAvatar?: string;
  onClick: () => void;
  placeholder?: string;
}

/**
 * CreatePostInput Component
 * 
 * Reusable input button for creating posts.
 */
export const CreatePostInput: React.FC<CreatePostInputProps> = ({
  userName,
  userAvatar,
  onClick,
  placeholder = "Create a Post",
}) => {
  const [showAvatar, setShowAvatar] = React.useState(true);
  return (
    <GradientContainer>
    <div className='rounded-2xl p-4 md:p-6'>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
          {userAvatar && showAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-full h-full object-cover"
              onError={() => setShowAvatar(false)}
            />
          ) : (
            <span className="text-lg font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Input Button */}
        <button
          onClick={onClick}
          className="flex-1 px-4 py-3 bg-[#2a3442] hover:bg-[#323d4d] text-left text-gray-400 rounded-lg transition-colors"
        >
          {placeholder}
        </button>
      </div>
    </div>
    </GradientContainer>
  );
};

export default CreatePostInput;
