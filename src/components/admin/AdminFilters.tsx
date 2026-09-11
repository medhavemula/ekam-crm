/**
 * AdminFilters - Reusable filter section for admin dashboards
 * Includes date range, dropdowns, and search button
 */

import React, { useState, useEffect } from "react";
import FormSelect from "../forms/FormSelect";
import DatePicker from "../common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

interface FilterOption {
  label: string;
  value: string;
}

interface AdminFiltersProps {
  onSearch?: (filters: FilterValues) => void;
  onCountryChange?: (countryId: string) => void;
  onRegionChange?: (regionId: string) => void;
  onChapterChange?: (chapterId: string) => void;
  showCountries?: boolean;
  showRegions?: boolean;
  showChapters?: boolean;
  showDateRange?: boolean;
  showTimeRange?: boolean;
  countries?: FilterOption[];
  regions?: FilterOption[];
  chapters?: FilterOption[];
  timeRanges?: FilterOption[];
  initialFilters?: FilterValues;
  appliedFilters?: { date_from?: string; date_to?: string; country_id?: string; region_id?: string; chapter_id?: string; };
}

export interface FilterValues {
  fromDate?: string;
  toDate?: string;
  country?: string;
  region?: string;
  chapter?: string;
  timeRange?: string;
}

export const AdminFilters: React.FC<AdminFiltersProps> = ({
  onSearch,
  onCountryChange,
  onRegionChange,
  onChapterChange,
  showCountries = false,
  showRegions = false,
  showChapters = false,
  showDateRange = true,
  // showTimeRange = true,
  countries = [],
  regions = [],
  chapters = [],
  timeRanges = [
    { label: "Last 6 Months", value: "6m" },
    { label: "Last Year", value: "1y" },
    { label: "All Time", value: "all" },
  ],
  initialFilters,
  appliedFilters, // Add appliedFilters prop to show actual API dates
}) => {
  const [filters, setFilters] = useState<FilterValues>(() => ({
    fromDate: appliedFilters?.date_from || initialFilters?.fromDate || getFirstDayOfMonth(),
    toDate: appliedFilters?.date_to || initialFilters?.toDate || getLastDayOfMonth(),
    country: initialFilters?.country || "",
    region: initialFilters?.region || "",
    chapter: initialFilters?.chapter || "",
    timeRange: timeRanges[0]?.value || "6m",
  }));

  const handleSearch = () => {
    onSearch?.(filters);
  };

  // Sync filters with appliedFilters when they change (after search)
  useEffect(() => {
    if (appliedFilters) {
      setFilters(prev => ({
        ...prev,
        fromDate: appliedFilters.date_from || prev.fromDate,
        toDate: appliedFilters.date_to || prev.toDate,
        country: appliedFilters.country_id || prev.country,
        region: appliedFilters.region_id || prev.region,
        chapter: appliedFilters.chapter_id || prev.chapter,
      }));
    }
  }, [appliedFilters]);

  return (
    <div className="mb-6">
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-wrap gap-2 items-end">
          {/* From Date */}
          {showDateRange && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[220px] flex-none">
              <label className="block text-xs text-gray-400 mb-1">From Date</label>
              <DatePicker
                id="admin-filter-from-date"
                value={filters.fromDate || ""}
                onChange={(value) => {
                  const newFilters = { ...filters, fromDate: value };
                  // If the new fromDate is after the current toDate, clear the toDate
                  if (filters.toDate && value > filters.toDate) {
                    newFilters.toDate = '';
                  }
                  setFilters(newFilters);
                }}
                iconSrc={CalendarIcon}
                className="w-full text-base"
              />
            </div>
          )}

          {/* To Date */}
          {showDateRange && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[220px] flex-none">
              <label className="block text-xs text-gray-400 mb-1">To Date</label>
              <DatePicker
                id="admin-filter-to-date"
                value={filters.toDate || ""}
                onChange={(value) => {
                  setFilters({
                    ...filters,
                    toDate: !filters.fromDate || value >= filters.fromDate ? value : filters.fromDate
                  });
                }}
                iconSrc={CalendarIcon}
                className="w-full text-base"
                minDate={filters.fromDate}
              />
            </div>
          )}

          {/* Countries */}
          {showCountries && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[150px] xl:w-[180px] flex-none">
              <FormSelect
                label="Countries"
                value={filters.country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  setFilters({ ...filters, country: newCountry, region: "", chapter: "" });
                  onCountryChange?.(newCountry);
                }}
                options={[{ value: "", label: "Select Countries" }, ...countries]}
              />
            </div>
          )}

          {/* Regions */}
          {showRegions && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[150px] xl:w-[180px] flex-none">
              <FormSelect
                label="Regions"
                value={filters.region}
                onChange={(e) => {
                  const newRegion = e.target.value;
                  setFilters({ ...filters, region: newRegion, chapter: "" });
                  onRegionChange?.(newRegion);
                }}
                options={[{ value: "", label: "Select Regions" }, ...regions]}
              />
            </div>
          )}

          {/* Chapters */}
          {showChapters && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[180px] xl:w-[180px] flex-none">
              <FormSelect
                label="Chapter"
                value={filters.chapter}
                onChange={(e) => {
                  const newChapter = e.target.value;
                  setFilters({ ...filters, chapter: newChapter });
                  onChapterChange?.(newChapter);
                }}
                options={[{ value: "", label: "Select chapter name" }, ...chapters]}
              />
            </div>
          )}

          {/* Search Button */}
          <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[110px] xl:w-[120px] flex-none">
            <button
              onClick={handleSearch}
              className="h-[46px] w-full rounded bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
            >
              Search
            </button>
          </div>

          {/* Time Range */}
          {/* {showTimeRange && (
            <div className="w-full sm:w-[calc(50%-0.25rem)] lg:w-[150px] xl:w-[160px] flex-none lg:ml-auto">
              <FormSelect
                label=""
                value={filters.timeRange}
                onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                options={timeRanges}
              />
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default AdminFilters;
