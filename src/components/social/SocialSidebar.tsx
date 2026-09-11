import React from "react";
import ProfileBG from "../../assets/icons/profilebg.svg";
import GradientContainer from "../common/GradientContainer";

export type ConnectionTab = "connections" | "requests" | "pending" | "suggested";

export interface SocialSidebarProps {
  userName: string;
  userAvatar?: string;
  company: string;
  role: string;
  postsCount: string;
  connectionsCount: string;
  tabCounts?: {
    connections?: number;
    requests?: number;
    pending?: number;
    suggested?: number;
  };
  coverImageUrl: string;
  activeConnectionTab?: ConnectionTab;
  onConnectionTabChange?: (tab: ConnectionTab) => void;
}

export const SocialSidebar: React.FC<SocialSidebarProps> = ({
  userName,
  userAvatar,
  company,
  role,
  postsCount,
  connectionsCount,
  tabCounts,
  coverImageUrl = ProfileBG,
  activeConnectionTab = "connections",
  onConnectionTabChange,
}) => {
  const counts = {
    connections: tabCounts?.connections ?? 0,
    requests: tabCounts?.requests ?? 0,
    pending: tabCounts?.pending ?? 0,
    suggested: tabCounts?.suggested ?? 0,
  };

  return (
    <div className="w-full lg:w-80 space-y-4">
      {/* Profile Card */}
      <GradientContainer className="overflow-hidden">
        <div className="overflow-hidden rounded-[14px]">
          {/* Cover Image */}
          <div className="h-20 relative">
            <img
              src={coverImageUrl || ProfileBG}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = ProfileBG;
              }}
            />
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
              <p className="text-gray-300 text text-center">{company}</p>
              <p className="text-gray-300 text text-center">{role}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4 pt-6 border-t border-gray-200 mx-6">
              <div className="text-center">
                <div className="text-gray-200 font-bold text-xl pb-2">{postsCount}</div>
                <div className="text-gray-200 text-xs">Events</div>
              </div>
              <div className="text-center">
                <div className="text-gray-200 font-bold text-xl pb-2">{connectionsCount}</div>
                <div className="text-gray-200 text-xs">Connections</div>
              </div>
            </div>
          </div>
        </div>
      </GradientContainer>

      {/* Connection Tabs */}
      <GradientContainer>
        <div className="p-3 overflow-hidden rounded-[14px]">
          <h4 className="text-white font-semibold text-sm mb-3">Connections</h4>
          <div className="space-y-1">
          <button
            onClick={() => onConnectionTabChange?.("connections")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left text-sm ${
              activeConnectionTab === "connections" ? "text-white bg-gray-700" : "text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="flex-1">My Connections</span>
            <span className="text-xs text-gray-200 bg-white/10 px-2 py-0.5 rounded-full">
              {counts.connections}
            </span>
          </button>

          <button
            onClick={() => onConnectionTabChange?.("requests")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left text-sm ${
              activeConnectionTab === "requests" ? "text-white bg-gray-700" : "text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <span className="flex-1">Requests</span>
            <span className="text-xs text-gray-200 bg-white/10 px-2 py-0.5 rounded-full">
              {counts.requests}
            </span>
          </button>

          <button
            onClick={() => onConnectionTabChange?.("pending")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left text-sm ${
              activeConnectionTab === "pending" ? "text-white bg-gray-700" : "text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1">Pending</span>
            <span className="text-xs text-gray-200 bg-white/10 px-2 py-0.5 rounded-full">
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => onConnectionTabChange?.("suggested")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left text-sm ${
              activeConnectionTab === "suggested" ? "text-white bg-gray-700" : "text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span className="flex-1">Suggested</span>
            <span className="text-xs text-gray-200 bg-white/10 px-2 py-0.5 rounded-full">
              {counts.suggested}
            </span>
          </button>
          </div>
        </div>
      </GradientContainer>
    </div>
  );
};

export default SocialSidebar;
