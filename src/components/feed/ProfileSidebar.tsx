import React from "react";
import GradientContainer from "../common/GradientContainer";
import AllfeedsIcon from "../../assets/icons/Allfeeds.svg";
import MyfeedIcon from "../../assets/icons/Myfeed.svg";
import SavedIcon from "../../assets/icons/Savedposts.svg";
import MessagesIcon from "../../assets/icons/commnets.svg";
import ProfileBG from "../../assets/icons/profilebg.svg";

export interface NavMenuItem {
  icon: string | React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export interface ProfileSidebarProps {
  userName: string;
  userAvatar?: string;
  company?: string;
  role?: string;
  postsCount: string;
  connectionsCount: string;
  coverImageUrl?: string;
  activeTab?: "all" | "my" | "saved" | "messages";
  onAllFeedsClick?: () => void;
  onMyFeedsClick?: () => void;
  onSavedPostsClick?: () => void;
  onMessagesClick?: () => void;
  navItems?: NavMenuItem[];
  showDefaultNav?: boolean;
}

/**
 * ProfileSidebar Component
 * 
 * Reusable profile sidebar for feed pages.
 * Displays user info, stats, and navigation links.
 */
export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  userName,
  userAvatar,
  company,
  role,
  postsCount,
  connectionsCount,
  coverImageUrl,
  activeTab = "all",
  onAllFeedsClick,
  onMyFeedsClick,
  onSavedPostsClick,
  onMessagesClick = () => {},
  navItems,
  showDefaultNav = true,
}) => {
  const [showAvatar, setShowAvatar] = React.useState(true);
  return (
    <GradientContainer>
    <div className='rounded-2xl p-4 md:p-6 overflow-hidden'>
      {/* Cover Image */}
      <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
        <img
          src={coverImageUrl || ProfileBG}
          alt="Cover"
          className="block w-full h-24 md:h-28 object-cover"
        />
        
        {/* Avatar */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-gray-600 border-4 border-[#1a2332] overflow-hidden flex items-center justify-center">
            {userAvatar && showAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover"
                onError={() => setShowAvatar(false)}
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="text-center mt-10 mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">{userName}</h3>
        {company && <p className="text-sm text-gray-400 mb-1">{company}</p>}
        {role && <p className="text-xs text-gray-500">{role}</p>}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-4"></div>

      {/* Stats */}
      <div className="flex justify-around text-center">
        <div>
          <p className="text-xl font-bold text-white">{postsCount}</p>
          <p className="text-xs text-gray-400">Posts</p>
        </div>
        <div>
          <p className="text-xl font-bold text-white">{connectionsCount}</p>
          <p className="text-xs text-gray-400">Connections</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-4"></div>

      {/* Navigation Links */}
      <div className="space-y-2">
        {navItems && navItems.length > 0 ? (
          // Custom navigation items
          navItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                item.isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {typeof item.icon === "string" ? (
                <img src={item.icon} alt={item.label} className="w-5 h-5" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
              )}
              <span>{item.label}</span>
            </button>
          ))
        ) : showDefaultNav ? (
          // Default navigation items
          <>
            <button
              onClick={onAllFeedsClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "all" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <img src={AllfeedsIcon} alt="All Feeds" className="w-5 h-5" />
              <span>All Feeds</span>
            </button>
            <button
              onClick={onMyFeedsClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "my" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <img src={MyfeedIcon} alt="My Feeds" className="w-5 h-5" />
              <span>My Feeds</span>
            </button>
            <button
              onClick={onSavedPostsClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "saved" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <img src={SavedIcon} alt="Saved Posts" className="w-5 h-5" />
              <span>Saved Posts</span>
            </button>
            <button
              onClick={onMessagesClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "messages" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <img src={MessagesIcon} alt="Messages" className="w-5 h-5" />
              <span>Messages</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
    </GradientContainer>
  );
};

export default ProfileSidebar;
