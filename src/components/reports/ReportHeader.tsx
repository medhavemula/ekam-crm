import React from "react";

export interface ReportHeaderProps {
  title: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearch: () => void;
  onExport?: () => void;
  onPrint?: () => void;
}

/**
 * ReportHeader Component
 * 
 * Reusable header for all report pages with date filters and action buttons.
 */
export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  onExport,
  onPrint,
}) => {
  return (
    <div className="mb-6">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-white mb-6">{title}</h1>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        {/* Start Date */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
          />
        </div>

        {/* End Date */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
          />
        </div>

        {/* Search Button */}
        <button
          onClick={onSearch}
          className="px-8 py-2 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
        >
          Search
        </button>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className="px-6 py-2 bg-transparent hover:bg-[#D85D27]/10 text-orange-500 border border-orange-500 font-medium rounded-lg transition-colors"
          >
            Export
          </button>
        )}

        {/* Print Button */}
        {false && onPrint && (
          <button
            onClick={onPrint}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Print
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportHeader;
