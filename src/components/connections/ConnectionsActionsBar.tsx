import React from "react";

export interface ConnectionsActionsBarProps {
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  onSearch: () => void;
  onAddConnection: () => void;
  onSyncConnections?: () => void;
}

export const ConnectionsActionsBar: React.FC<ConnectionsActionsBarProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearch,
  onAddConnection,
  onSyncConnections,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 w-full">
      {/* Left group: search input + search button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            className="w-full px-4 py-2 pl-10 bg-[linear-gradient(90deg,#0D1117_0%,#1E2630_100%)] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <button
          onClick={onSearch}
          className="px-8 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Right group: Add Connection and Sync buttons */}
      <div className="ml-auto flex items-center gap-3">
        {onSyncConnections && (
          <button
            onClick={onSyncConnections}
            className="px-6 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            Sync Connections
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button
          onClick={onAddConnection}
          className="px-6 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          Add Connection
          <span className="text-xl">+</span>
        </button>
      </div>
    </div>
  );
};

export default ConnectionsActionsBar;
