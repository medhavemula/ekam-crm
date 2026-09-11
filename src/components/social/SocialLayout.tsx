import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "../navigation";

interface SocialLayoutProps {
  children: React.ReactNode;
}

const mockUser = {
  name: "Mike",
  avatar: undefined,
};

// Tabs for regular users
const userTabs = [
  { id: "all-activities", label: "All Activities", path: "/social/all-activities" },
   { id: "all-events", label: "All Events", path: "/social/all-events" },
  { id: "my-events", label: "My Events", path: "/social/my-events" },
  { id: "upcoming-events", label: "Upcoming Events", path: "/social/upcoming-events" },
  { id: "connections", label: "Connections", path: "/social/connections" },
  { id: "messages", label: "Messages", path: "/social/messages" },
];

// Tabs for Social Admin roles (Social Chairperson, RG, ARG)
const adminTabs = [
  { id: "all-activities", label: "All Activities", path: "/social/admin/all-activities" },
  { id: "all-events", label: "All Events", path: "/social/admin/all-events" },
  { id: "my-events", label: "My Events", path: "/social/admin/my-events" },
  { id: "events-request", label: "Events Request", path: "/social/admin/events-request" },
  { id: "upcoming-events", label: "Upcoming Events", path: "/social/admin/upcoming-events" },
];

export function SocialLayout({ children }: SocialLayoutProps) {
  const location = useLocation();

  // Use the route tree itself so the tab strip does not flash while role state hydrates.
  const isSocialAdmin = location.pathname.startsWith("/social/admin/");
  const tabs = isSocialAdmin ? adminTabs : userTabs;

  const getActiveTab = () => {
    // Check for exact matches first
    const exactMatch = tabs.find((tab) => location.pathname === tab.path);
    if (exactMatch) return exactMatch.id;

    // Keep Messages tab active for thread routes
    if (location.pathname.startsWith("/social/messages/")) {
      return "messages";
    }
    if (location.pathname.startsWith("/social/profile")) {
      return "connections";
    }
    // ✅ ADMIN: Add / Edit Event should stay on MY EVENTS
if (
  location.pathname.startsWith("/social/admin/add-event") ||
  location.pathname.startsWith("/social/admin/edit-event")
) {
  return "my-events";
}

    // Handle social admin event details pages
    if (location.pathname.startsWith("/social/admin/event-details/") || location.pathname.startsWith("/social/admin/event/")) {
      const pageType = location.state?.pageType || location.state?.from;
      if (pageType === "upcoming-events") return "upcoming-events";
      if (pageType === "event-requests" || pageType === "events-request") return "events-request";
      if (pageType === "all-events") return "all-events";
      return "my-events";
    }

    // Keep tab active for social admin event members page
    if (location.pathname.startsWith("/social/admin/upcoming-events/") && location.pathname.endsWith("/members")) {
      return "upcoming-events";
    }

    // Handle event-requests page accessed from chapter details
    if (location.pathname.startsWith("/social/admin/regional-board/chapter/") && location.pathname.includes("/event-requests")) {
      return "events-request";
    }

    // Handle view-event page - check the navigation state or URL pattern
    if (location.pathname.startsWith("/social/event/") || 
        location.pathname.startsWith("/social/event-details/")) {
      // Check if we have navigation state with source
      if (location.state?.from === 'upcoming-events' || location.state?.event?.source === 'upcoming-events') {
        return 'upcoming-events';
      }
      // Default to my-events if no source is specified
     if (location.state?.from) {
  return location.state.from;
}

return "all-events";
    }

    // Handle add-event page
    if (location.pathname.startsWith("/social/add-event")) {
      return 'my-events';
    }

    // Handle view-event page with old URL pattern (for backward compatibility)
    if (location.pathname.startsWith("/social/view-event")) {
      return location.state?.from === 'upcoming-events' ? 'upcoming-events' : 'my-events';
    }

    // Default to All Activities tab
    return 'all-activities';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={mockUser.name} userAvatar={mockUser.avatar} />

      <main className="container mx-auto px-4 py-6">
          {/* Tab Navigation */}
        <div className="mb-6">
            <div className="rounded-lg border border-white/10 bg-[#0f1419] p-1">
              <div className={`grid grid-cols-2 lg:grid-cols-${tabs.length} gap-2`}>
                {tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    className={`flex w-full items-center justify-center px-3 py-2.5 rounded-md text-center text-sm font-medium ${
                      activeTab === tab.id
                        ? "bg-[#D85D27] text-white ring-1 ring-white/10"
                        : "text-gray-300 hover:text-white"
                    }`}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
        </div>

        {/* Content */}
        <div>{children}</div>
      </main>
    </div>
  );
}
