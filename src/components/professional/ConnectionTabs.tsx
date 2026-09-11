import React from "react";

interface ConnectionTabsProps {
  activeTab: "all" | "requests" | "suggested" | "pending";
  onTabChange: (tab: "all" | "requests" | "suggested" | "pending") => void;
  counts?: {
    all?: number;
    requests?: number;
    suggested?: number;
    pending?: number;
  };
}

export const ConnectionTabs: React.FC<ConnectionTabsProps> = ({
  activeTab,
  onTabChange,
  counts = {},
}) => {
  const tabs = [
    { key: "all" as const, label: "All Connections", count: counts.all },
    { key: "requests" as const, label: "Requests" },
    { key: "suggested" as const, label: "Suggested"},
    { key: "pending" as const, label: "Pending" },
  ];

  return (
    <div className="mb-6">
      <div className="p-1 rounded-lg border border-gray-700 bg-[#1a2332] flex flex-wrap md:flex-nowrap overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`relative py-2 px-2 md:px-1 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
              activeTab === tab.key
                ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                : "text-gray-400 hover:text-white"
            }`}
            style={{ flex: '1 0 auto', minWidth: '0' }}
          >
            <div className="flex items-center justify-center">
              <span className="truncate">
                {tab.key === 'all' ? (
                  <>
                    <span className="hidden sm:inline">All Connections</span>
                    <span className="sm:hidden">All</span>
                  </>
                ) : tab.key === 'requests' ? 'Requests' : tab.key === 'suggested' ? 'Suggested' : 'Pending'}
              </span>
              {tab.count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 text-xs flex-shrink-0 ${
                  activeTab === tab.key 
                    ? 'bg-white text-[#D85D27] rounded-sm' 
                    : 'bg-white/10 text-gray-300 rounded-sm'
                }`}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConnectionTabs;
