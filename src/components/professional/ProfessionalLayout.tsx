import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../navigation";
import { ProfessionalSidebar } from ".";
import { PageHeader } from "../common";
import { useAppSelector } from "../../app/store";

interface ProfessionalLayoutProps {
  children: React.ReactNode;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  showSidebar?: boolean;
  contentClassName?: string;
  sidebarProfileUserId?: string;
}

export function ProfessionalLayout({
  children,
  breadcrumbs,
  showSidebar = true,
  contentClassName = "lg:col-span-9",
  sidebarProfileUserId,
}: ProfessionalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useAppSelector((state) => state.auth.user?._id);

  const isActive = (path: string) => {
    if (path.startsWith("/professional/businessprofile")) {
      return location.pathname.startsWith("/professional/businessprofile");
    }
    if (path.startsWith("/professional/messages")) {
      return location.pathname.startsWith("/professional/messages");
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        {/* Header (non-sticky) */}
        <div className="bg-[#0f1419] pb-3">
          <div className="pt-2">
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>

          {/* Mobile Navigation Tabs - Only visible on mobile */}
          <div className="lg:hidden mt-4">
            <div className="rounded-lg border border-white/10 bg-[#0f1419] p-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/professional/feed")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive("/professional/feed")
                      ? "bg-[#D85D27] text-white shadow-inner ring-1 ring-white/10"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  Feeds
                </button>

                <button
                  onClick={() => navigate("/professional/connections")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive("/professional/connections")
                      ? "bg-[#D85D27] text-white shadow-inner ring-1 ring-white/10"
                      : "text-gray-300 hover:text-white"
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
                  Connections
                </button>

                <button
                  onClick={() => navigate("/professional/messages")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive("/professional/messages")
                      ? "bg-[#D85D27] text-white shadow-inner ring-1 ring-white/10"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  Messages
                </button>

                <button
                  onClick={() => navigate(`/professional/businessprofile/${userId}`)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive(`/professional/businessprofile/${userId}`)
                      ? "bg-[#D85D27] text-white shadow-inner ring-1 ring-white/10"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile & Navigation - Desktop Only */}
          {showSidebar && (
            <div className="lg:col-span-3 hidden lg:block">
              <div className="relative">
                <ProfessionalSidebar profileUserId={sidebarProfileUserId} />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={contentClassName}>{children}</div>
        </div>
      </main>
    </div>
  );
}
