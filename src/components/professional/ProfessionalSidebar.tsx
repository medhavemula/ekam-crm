import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/store";
import { useGetProfileSummaryQuery } from "../../services/professional/professionalSidebarApi";
import ProfileBG from "../../assets/icons/profilebg.svg";
import GradientContainer from "../common/GradientContainer";

interface ProfessionalSidebarProps {
  profileUserId?: string;
}

export const ProfessionalSidebar: React.FC<ProfessionalSidebarProps> = ({ profileUserId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get userId from Redux store
  const userId = useAppSelector((state) => state.auth.user?._id);
  const summaryUserId = profileUserId || userId;

  // Fetch profile summary
  const { data, isLoading, isError } = useGetProfileSummaryQuery(
    { userId: summaryUserId! },
    { skip: !summaryUserId },
  );

  // Format role text with proper line breaks and sections
  const formatRoleText = (text: string) => {
    if (!text) return [];
    return text.split('\n\n').filter(section => section.trim() !== '');
  };

  // Extract data from API response
  const profileData = data?.data;
  const userName = profileData?.header?.name || "";
  const userAvatar = profileData?.header?.logoUrl || "";
  const company = profileData?.header?.location || "";
  const role = profileData?.header?.tagline || "";
  const postsCount = profileData?.stats?.posts?.toString() || "0";
  const connectionsCount = profileData?.stats?.connections?.toString() || "0";
  const coverImageUrl = profileData?.header?.bannerUrl || ProfileBG;
  const maxLines = 3; // Number of lines to show by default
  const lineHeight = 1.5; // Line height in rem

  // Check if role is long enough to need truncation
  const needsTruncation = role.split('\n').length > maxLines || role.length > 150;

  const isActive = (path: string) => {
    if (path === "/professional/connections" && location.pathname.startsWith("/professional/profile")) {
      return true;
    }
    if (path.startsWith("/professional/messages")) {
      return location.pathname.startsWith("/professional/messages");
    }
    return location.pathname === path;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <GradientContainer>
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-20 bg-gray-700 rounded mb-4"></div>
              <div className="h-20 w-20 bg-gray-700 rounded-full mx-auto mb-3"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </GradientContainer>
      </div>
    );
  }

  // Error state
  if (isError || !profileData) {
    return (
      <div className="space-y-4">
        <GradientContainer>
          <div className="p-6">
            <p className="text-gray-400 text-center">Unable to load profile</p>
          </div>
        </GradientContainer>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <GradientContainer>
        <div className="overflow-hidden rounded-[14px]">
          {/* Cover Image */}
          <div className="h-20 bg-gradient-to-r from-gray-700 to-gray-600 relative">
            {coverImageUrl && <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />}
          </div>
          {/* Profile Info */}
          <div className="px-4 pb-4 -mt-10 relative">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gray-600 border-4 border-[#161b22] overflow-hidden flex items-center justify-center mb-3">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">{userName.charAt(0)}</span>
                )}
              </div>

              <h3 className="text-white font-semibold text-lg text-center">{userName}</h3>
              {company && <p className="text-gray-300 text-sm text-center mt-1">{company}</p>}
              {role && (
                <div className="mt-2 w-full px-2">
                  <div 
                    className="text-gray-300 text-sm text-left line-clamp-3"
                    style={{ lineHeight: lineHeight }}
                  >
                    {formatRoleText(role).map((section, index) => {
                      // Check if section is a heading (ends with a colon)
                      const isHeading = section.endsWith(':');
                      // Check if section is a list item
                      const isListItem = section.trim().startsWith('●');
                      
                      if (isHeading) {
                        return (
                          <h4 key={index} className="font-semibold text-white mt-3 first:mt-0">
                            {section}
                          </h4>
                        );
                      } else if (isListItem) {
                        // Split list items by newline and render as list
                        const items = section.split('\n').filter(item => item.trim() !== '');
                        return (
                          <ul key={index} className="list-disc pl-5 space-y-1">
                            {items.map((item, i) => (
                              <li key={i} className="text-gray-300">
                                {item.trim().replace('●', '').trim()}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={index} className="text-gray-300">
                          {section}
                        </p>
                      );
                    })}
                  </div>
                  {needsTruncation && (
                    <button 
                      onClick={() => summaryUserId && navigate(`/professional/businessprofile/${summaryUserId}`)}
                      className="text-orange-400 hover:text-orange-300 text-xs mt-1 focus:outline-none"
                    >
                      Read More
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4 pt-6 border-t border-gray-200 mx-6">
              <div className="text-center">
                <div className="text-gray-200 font-bold text-xl pb-2">{postsCount}</div>
                <div className="text-gray-200 text-xs">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-gray-200 font-bold text-xl pb-2">{connectionsCount}</div>
                <div className="text-gray-200 text-xs">Connections</div>
              </div>
            </div>
          </div>
        </div>
      </GradientContainer>

      {/* Navigation Menu */}
      <GradientContainer>
        <div className="rounded-lg p-3">
        <button
          onClick={() => navigate("/professional/feed")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 text-left ${
            isActive("/professional/feed") ? "text-white" : "text-gray-400"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <span className="text-sm">Feeds</span>
        </button>

        <button
          onClick={() => navigate("/professional/connections")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 text-left ${
            isActive("/professional/connections") ? "text-white" : "text-gray-400"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-sm">Connections</span>
        </button>

        <button
          onClick={() => navigate("/professional/messages")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 text-left ${
            isActive("/professional/messages") ? "text-white" : "text-gray-400"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span className="text-sm">Messages</span>
        </button>

        <button
          onClick={() => navigate(`/professional/businessprofile/${userId}`)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 text-left ${
            location.pathname.startsWith("/professional/businessprofile") ? "text-white" : "text-gray-400"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-sm">Profile</span>
        </button>
        </div>
      </GradientContainer>
    </div>
  );
};

export default ProfessionalSidebar;
