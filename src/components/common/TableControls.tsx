import React from "react";
import FormSelect from "../forms/FormSelect";

interface TableControlsProps {
  entriesPerPage: number;
  onEntriesChange: (value: number) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  className?: string;
  showSearchInput?: boolean;
}

export const TableControls: React.FC<TableControlsProps> = ({
  entriesPerPage,
  onEntriesChange,
  searchTerm,
  onSearchChange,
  className = "",
  showSearchInput = true,
}) => {
  return (
    <div className={`bg-[#0E1319] p-4 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="w-40">
        <FormSelect
          label="Show entries"
          options={[
            { value: "10", label: "10" },
            { value: "25", label: "25" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
          ]}
          value={String(entriesPerPage)}
          onChange={(e) => onEntriesChange(Number(e.target.value))}
          showMenuHeader={false}
        />
      </div>

      {showSearchInput && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-4 py-2 pl-8 bg-[linear-gradient(90deg,#0D1117_0%,#1E2630_100%)] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
          <svg
            className="absolute left-3 top-3 text-white"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default TableControls;
