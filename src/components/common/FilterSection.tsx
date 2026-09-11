import React, { useState } from "react";
import DatePicker from "./DatePicker";
import { reconcileRange } from "./filterRange";
import FormSelect from "../forms/FormSelect";
import CalendarIcon from "../../assets/icons/calendar.svg";

interface FilterSectionProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  // Optional third date: From Date
  fromDate?: string;
  onFromDateChange?: (date: string) => void;
  // Controls to show/hide specific date fields per page
  showStartDate?: boolean; // default: true
  showEndDate?: boolean;   // default: true
  showFromDate?: boolean;  // default: false
  onSearch: () => void;
  onPrint?: () => void;
  onAdd?: () => void;
  addButtonLabel?: string;
  className?: string;
  // Optional dropdown placed after End Date
  showDropdown?: boolean;
  dropdownLabel?: string;
  dropdownOptions?: { label: string; value: string }[];
  dropdownValue?: string;
  onDropdownChange?: (value: string) => void;
  // Search functionality for dropdown
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  disableClientSideFilter?: boolean;
  showSearchButton?: boolean;
  // When true, End Date will be allowed beyond today (used by specific pages like P2P)
  allowFutureEndDate?: boolean;
  // When true, Start/From Date will be allowed beyond today
  allowFutureStartDate?: boolean;
  // When true, skip auto-initializing dates to this month on first render
  skipAutoInit?: boolean;
  // When true, do not push date changes to parent until Search is clicked
  deferApply?: boolean;
  // When true, trigger onSearch once after initial auto-init (respected only when skipAutoInit is false)
  autoSearchOnInit?: boolean;
  // Validation
  requireEndDate?: boolean; // default: false
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  fromDate,
  onFromDateChange,
  showStartDate = true,
  showEndDate = true,
  showFromDate = false,
  onSearch,
  onPrint,
  onAdd,
  addButtonLabel = "Add +",
  className = "",
  showDropdown = false,
  dropdownLabel = "Status",
  dropdownOptions = [],
  dropdownValue,
  onDropdownChange,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearchChange,
  disableClientSideFilter = false,
  showSearchButton = true,
  allowFutureEndDate = true,
  allowFutureStartDate = true,
  deferApply = true,
  requireEndDate = false,
}) => {
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter") onSearch();
  };
  const [endDateError, setEndDateError] = useState<string>("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const normalizeYmd = (val: any): string => {
    if (typeof val === "string") return val;
    try {
      if (val instanceof Date && !isNaN(val.getTime())) return toYmd(val);
      const maybe = new Date(val);
      if (!isNaN(maybe.getTime())) return toYmd(maybe);
    } catch {}
    return String(val);
  };

  // Draft state for deferred apply
  const [draftStart, setDraftStart] = React.useState(startDate);
  const [draftEnd, setDraftEnd] = React.useState(endDate);
  const [draftFrom, setDraftFrom] = React.useState(fromDate || "");
  const [draftDropdown, setDraftDropdown] = React.useState(dropdownValue || "");

  // Keep drafts in sync if parent values change externally
  React.useEffect(() => {
    setDraftStart(startDate);
  }, [startDate]);
  React.useEffect(() => {
    setDraftEnd(endDate);
  }, [endDate]);
  React.useEffect(() => {
    setDraftFrom(fromDate || "");
  }, [fromDate]);
  React.useEffect(() => {
    setDraftDropdown(dropdownValue || "");
  }, [dropdownValue]);
  
  // Use draft values during editing when deferApply is enabled
  const effectiveStart = deferApply ? draftStart : startDate;
  const effectiveFrom = deferApply ? draftFrom : (fromDate || "");
  const effectiveEnd = deferApply ? draftEnd : endDate;

  // Today (YYYY-MM-DD) for future-date constraints
  const todayYmd = React.useMemo(() => toYmd(new Date()), []);

  const startMaxDate = allowFutureStartDate ? "" : todayYmd;
  const endMaxDate = allowFutureEndDate ? "" : todayYmd;

  const applyRange = (nextStart: string, nextEnd: string) => {
    if (deferApply) {
      setDraftStart(nextStart);
      setDraftEnd(nextEnd);
    } else {
      onStartDateChange(nextStart);
      onEndDateChange(nextEnd);
    }
  };

  const handleEndDateChange = (d: any) => {
    let next = normalizeYmd(d);
    if (endMaxDate && next > endMaxDate) next = endMaxDate;
    // Clear error when user selects a date
    if (next.trim()) setEndDateError("");
    const reconciled = reconcileRange("end", next, {
      start: showStartDate ? effectiveStart : "",
      end: effectiveEnd,
    });
    applyRange(showStartDate ? reconciled.start : effectiveStart, reconciled.end);
  };

  const handleStartDateChange = (d: any) => {
    let next = normalizeYmd(d);
    if (startMaxDate && next > startMaxDate) next = startMaxDate;
    const reconciled = reconcileRange("start", next, {
      start: effectiveStart,
      end: showEndDate ? effectiveEnd : "",
    });
    applyRange(reconciled.start, showEndDate ? reconciled.end : effectiveEnd);
  };

  const handleFromDateChange = (d: any) => {
    let next = normalizeYmd(d);
    if (startMaxDate && next > startMaxDate) next = startMaxDate;

    // Just update from date - don't automatically clear end date
    if (deferApply) setDraftFrom(next); else onFromDateChange?.(next);
  };

  const applyAndSearch = () => {
    setSearchAttempted(true);
    
    // Validate end date if required
    if (requireEndDate && showEndDate && !effectiveEnd.trim()) {
      setEndDateError("End date is required");
      return;
    }
    
    // Clear any existing errors
    setEndDateError("");
    
    if (deferApply) {
      if (showStartDate) onStartDateChange(draftStart);
      if (showEndDate) onEndDateChange(draftEnd);
      if (showFromDate) onFromDateChange?.(draftFrom);
      if (showDropdown) onDropdownChange?.(draftDropdown);
    }
    onSearch();
  };

  return (
    <section
      // ⬇️  No background, no rounded, no separator line; keep comfortable spacing
      className={`pb-4 md:pb-5 mb-6 ${className}`}
      onKeyDown={onKeyDown}
      aria-label="Filters"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 md:gap-4">
        {/* LEFT: dates + search */}
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            {/* Start Date */}
            {showStartDate && (
            <div className="w-full sm:flex-1 min-w-[170px] md:min-w-[190px] lg:min-w-[210px] sm:max-w-xs">
              <label
                htmlFor="p2p-start"
                className="block text-xs text-[var(--filter-label)] mb-1"
              >
                Start Date
              </label>
              <div className="relative">
                <DatePicker id="p2p-start" value={deferApply ? draftStart : startDate} onChange={handleStartDateChange}  iconSrc={CalendarIcon} maxDate={startMaxDate || undefined} />
                {/* <img
                  src={CalendarIcon}
                  alt="calendar"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-80"
                /> */}
              </div>
            </div>
            )}

            {/* End Date */}
            {showEndDate && (
            <div className="w-full sm:flex-1 min-w-[170px] md:min-w-[190px] lg:min-w-[210px] sm:max-w-xs relative">
              <label
                htmlFor="p2p-end"
                className="block text-xs text-[var(--filter-label)] mb-1"
              >
                End Date
              </label>
              <div className="relative">
                <DatePicker id="p2p-end" value={deferApply ? draftEnd : endDate} onChange={handleEndDateChange}  iconSrc={CalendarIcon} maxDate={endMaxDate || undefined} />
                {/* <img
                  src={CalendarIcon}
                  alt="calendar"
                /> */}
              </div>
              {endDateError && searchAttempted && (
                <p className="text-xs text-[var(--ov-danger)] mt-2 ml-1 absolute bottom-0 left-0 transform translate-y-full">{endDateError}</p>
              )}
            </div>
            )}
            {/* From Date */}
            {showFromDate && (
              <div className="w-full sm:flex-1 min-w-[170px] md:min-w-[190px] lg:min-w-[210px] sm:max-w-xs">
                <label
                  htmlFor="p2p-from"
                  className="block text-xs text-[var(--filter-label)] mb-1"
                >
                  From Date
                </label>
                <div className="relative">
                  <DatePicker id="p2p-from" value={effectiveFrom} onChange={handleFromDateChange}  iconSrc={CalendarIcon} maxDate={startMaxDate || undefined} />
                </div>
              </div>
            )}

            {/* Dropdown (after date fields) */}
            {showDropdown && (
              <div className="w-full sm:flex-1 min-w-[170px] md:min-w-[190px] lg:min-w-[210px] sm:max-w-xs">
                <FormSelect
                  label={dropdownLabel || "Select"}
                  value={deferApply ? draftDropdown : (dropdownValue || "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (deferApply) setDraftDropdown(v); else onDropdownChange?.(v);
                  }}
                  options={dropdownOptions || []}
                  searchable={searchable}
                  searchPlaceholder={searchPlaceholder}
                  disableClientSideFilter={disableClientSideFilter}
                  onSearchChange={(value) => {
                    if (deferApply) {
                      // If deferApply is true, we need to update the search term
                      // but we don't have a direct way to store it in the draft state
                      // So we'll just trigger the search immediately
                      onSearchChange?.(value);
                    } else {
                      onSearchChange?.(value);
                    }
                  }}
                />
              </div>
            )}

            {/* Search Button */}
            {showSearchButton && (
              <div className="w-full sm:w-auto flex items-end justify-start sm:justify-start">
                <button
                  onClick={() => (deferApply ? applyAndSearch() : onSearch())}
                  className="h-10 w-[136px] md:w-[150px] px-4 rounded-md bg-[var(--filter-primary)] hover:bg-[var(--filter-primary-hover)] text-[var(--filter-primary-ink)] font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: actions (auto width, stays on the right) */}
        <div className="flex w-full lg:w-auto flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {false && onPrint && (
              <button
                onClick={onPrint}
                className="h-10 px-5 rounded-md bg-[var(--ov-fill-hover)] hover:bg-[var(--ov-fill-subtle)] text-[var(--filter-primary-ink)] font-medium transition-colors w-full sm:w-auto lg:w-[160px] basis-full sm:basis-auto"
              >
                Print
              </button>
            )}
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="h-10 px-5 rounded-md bg-[var(--filter-primary)] hover:bg-[var(--filter-primary-hover)] text-[var(--filter-primary-ink)] font-medium transition-colors w-full sm:w-auto basis-full sm:basis-auto"
            >
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );

};

export default FilterSection;
