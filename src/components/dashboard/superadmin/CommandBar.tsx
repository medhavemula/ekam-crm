import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import FormSelect from "../../forms/FormSelect";
import DatePicker from "../../common/DatePicker";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { BEAT, EASE_OUT } from "./chartTheme";
import {
  getFirstDayOfMonth,
  getFirstDayOfYear,
  getLastDayOfMonth,
  inputDateDaysAgo,
  todayInputDate,
} from "../../../utils/date";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarValues {
  fromDate?: string;
  toDate?: string;
  country?: string;
  region?: string;
  chapter?: string;
}

interface CommandBarProps {
  onSearch: (filters: FilterBarValues) => void;
  onCountryChange?: (countryId: string) => void;
  onRegionChange?: (regionId: string) => void;
  onChapterChange?: (chapterId: string) => void;
  showCountries?: boolean;
  showRegions?: boolean;
  showChapters?: boolean;
  showDateRange?: boolean;
  countries?: FilterOption[];
  regions?: FilterOption[];
  chapters?: FilterOption[];
  initialFilters?: FilterBarValues;
  appliedFilters?: {
    date_from?: string;
    date_to?: string;
    country_id?: string;
    region_id?: string;
    chapter_id?: string;
  };
  /** Range currently in effect, yyyy-mm-dd, for the summary line. */
  rangeFrom?: string;
  rangeTo?: string;
  isRefreshing?: boolean;
}

interface Preset {
  id: string;
  label: string;
  range: () => { fromDate: string; toDate: string };
}

/** Presets come first — nobody wants to fight a calendar for "last 30 days". */
const PRESETS: Preset[] = [
  { id: "7d", label: "7 days", range: () => ({ fromDate: inputDateDaysAgo(6), toDate: todayInputDate() }) },
  { id: "30d", label: "30 days", range: () => ({ fromDate: inputDateDaysAgo(29), toDate: todayInputDate() }) },
  { id: "90d", label: "90 days", range: () => ({ fromDate: inputDateDaysAgo(89), toDate: todayInputDate() }) },
  { id: "month", label: "This month", range: () => ({ fromDate: getFirstDayOfMonth(), toDate: getLastDayOfMonth() }) },
  { id: "year", label: "This year", range: () => ({ fromDate: getFirstDayOfYear(), toDate: todayInputDate() }) },
];

/** "2026-08-01" -> "1 Aug 2026"; returns the input unchanged if unparseable. */
function formatDisplayDate(value?: string): string {
  if (!value) return "";
  const parts = value.slice(0, 10).split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The one control surface for the overview: title, the range in effect, the
 * presets, and everything else behind a disclosure.
 *
 * The previous bar laid five form fields and a full-width Apply button across the
 * top of the page, which pushed every number below the fold on a laptop. Presets
 * cover the overwhelming majority of range changes, so they stay out; the custom
 * range and the three geography levels move into a popover that opens over the
 * data instead of displacing it. What is currently applied stays visible as chips,
 * so nothing is hidden — only the controls are.
 */
export const CommandBar: React.FC<CommandBarProps> = ({
  onSearch,
  onCountryChange,
  onRegionChange,
  onChapterChange,
  showCountries = false,
  showRegions = false,
  showChapters = false,
  showDateRange = true,
  countries = [],
  regions = [],
  chapters = [],
  initialFilters,
  appliedFilters,
  rangeFrom,
  rangeTo,
  isRefreshing = false,
}) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [filters, setFilters] = useState<FilterBarValues>(() => ({
    fromDate: appliedFilters?.date_from || initialFilters?.fromDate || getFirstDayOfMonth(),
    toDate: appliedFilters?.date_to || initialFilters?.toDate || getLastDayOfMonth(),
    country: initialFilters?.country || "",
    region: initialFilters?.region || "",
    chapter: initialFilters?.chapter || "",
  }));

  useEffect(() => {
    if (!appliedFilters) return;
    setFilters((prev) => ({
      ...prev,
      fromDate: appliedFilters.date_from || prev.fromDate,
      toDate: appliedFilters.date_to || prev.toDate,
      country: appliedFilters.country_id ?? prev.country,
      region: appliedFilters.region_id ?? prev.region,
      chapter: appliedFilters.chapter_id ?? prev.chapter,
    }));
  }, [appliedFilters]);

  // Dismiss on outside click and on Escape, and hand focus back to the trigger.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** Which preset, if any, the current range matches. */
  const activePreset = useMemo(() => {
    const match = PRESETS.find((p) => {
      const r = p.range();
      return r.fromDate === filters.fromDate && r.toDate === filters.toDate;
    });
    return match?.id ?? null;
  }, [filters.fromDate, filters.toDate]);

  const applyPreset = (preset: Preset) => {
    const next = { ...filters, ...preset.range() };
    setFilters(next);
    onSearch(next);
  };

  const nameFor = (options: FilterOption[], value?: string) =>
    options.find((o) => o.value === value)?.label ?? value ?? "";

  const chips = [
    filters.country && { key: "country" as const, label: nameFor(countries, filters.country) },
    filters.region && { key: "region" as const, label: nameFor(regions, filters.region) },
    filters.chapter && { key: "chapter" as const, label: nameFor(chapters, filters.chapter) },
  ].filter(Boolean) as Array<{ key: "country" | "region" | "chapter"; label: string }>;

  const clearChip = (key: "country" | "region" | "chapter") => {
    // Clearing a level clears the levels below it, matching the cascade in the selects.
    const next: FilterBarValues = { ...filters };
    if (key === "country") {
      next.country = "";
      next.region = "";
      next.chapter = "";
      onCountryChange?.("");
    } else if (key === "region") {
      next.region = "";
      next.chapter = "";
      onRegionChange?.("");
    } else {
      next.chapter = "";
      onChapterChange?.("");
    }
    setFilters(next);
    onSearch(next);
  };

  const resetAll = () => {
    const next: FilterBarValues = {
      fromDate: getFirstDayOfMonth(),
      toDate: getLastDayOfMonth(),
      country: "",
      region: "",
      chapter: "",
    };
    setFilters(next);
    onCountryChange?.("");
    onRegionChange?.("");
    onChapterChange?.("");
    onSearch(next);
    setOpen(false);
  };

  const from = formatDisplayDate(rangeFrom);
  const to = formatDisplayDate(rangeTo);
  const rangeLabel = from && to ? `${from} – ${to}` : from || to;
  const hasDimensions = showCountries || showRegions || showChapters;

  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, delay: BEAT.bar, ease: EASE_OUT },
      };

  return (
    <motion.div {...entrance} className="mb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Network Overview
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            Overview
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            {rangeLabel && (
              <span className="inline-flex items-center gap-2">
                {/* A live dot beats a spinner here: it says "these numbers are
                    being replaced" without taking the numbers away. It appears
                    only while a fetch is in flight — a permanent grey dot beside
                    the date reads as a stray mark, not as status. */}
                {isRefreshing && (
                  <span className="relative grid h-1.5 w-1.5 place-items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ov-ember)]" />
                    {!reduceMotion && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute h-1.5 w-1.5 rounded-full bg-[var(--ov-ember)]"
                        animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                  </span>
                )}
                <span className="ekam-figure font-medium text-[var(--ov-deep-ink-2,var(--ov-ink-2))]">{rangeLabel}</span>
                <span className="sr-only" aria-live="polite">
                  {isRefreshing ? "Updating the overview" : ""}
                </span>
              </span>
            )}

            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--ov-fill-subtle)] py-1 pl-2.5 pr-1 text-[12px] text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => clearChip(chip.key)}
                  aria-label={`Remove ${chip.label} filter`}
                  className="grid h-4 w-4 place-items-center rounded-full text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </span>
            ))}

            {chips.length > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] rounded"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {showDateRange && (
            <div
              role="group"
              aria-label="Date range presets"
              className="flex flex-wrap gap-0.5 rounded-xl bg-[var(--ov-deep,#0A1E2B)] p-1 ring-1 ring-[color:var(--ov-deep-line,rgba(24,72,96,0.35))]"
            >
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    aria-pressed={isActive}
                    className="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                  >
                    {/* The active pill slides between presets instead of blinking
                        on and off, so the eye keeps hold of the selection. */}
                    {isActive && (
                      <motion.span
                        layoutId="preset-pill"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg bg-[var(--ov-select-fill)]"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 420, damping: 34 }
                        }
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        isActive ? "text-[var(--ov-on-select)]" : "text-[var(--ov-deep-ink-2,#94A3B8)] hover:text-[var(--ov-deep-ink,#F1F5F9)]"
                      }`}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls="sa-refine-panel"
              className={`inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                open
                  ? "bg-[var(--ov-fill-hover)] text-[var(--ov-deep-ink,#FFFFFF)] ring-1 ring-[color:var(--ov-line-strong)]"
                  : "text-[var(--ov-deep-ink-2,#CBD5E1)] ring-1 ring-[color:var(--ov-deep-line,rgba(24,72,96,0.35))] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--ov-deep-ink,#FFFFFF)]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Refine
              {chips.length > 0 && (
                <span className="ekam-figure grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ov-ember-fill)] px-1 text-[10px] font-bold text-[var(--ov-on-ember)]">
                  {chips.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  ref={popoverRef}
                  id="sa-refine-panel"
                  role="dialog"
                  aria-label="Refine the overview"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 z-[1400] mt-2 w-[min(86vw,34rem)] rounded-2xl bg-[var(--ov-deep)] p-4 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-deep-line)]"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {showDateRange && (
                      <>
                        <div>
                          <label
                            className="mb-1.5 block text-xs text-[var(--ov-ink-3)]"
                            htmlFor="sa-from-date"
                          >
                            From
                          </label>
                          <DatePicker
                            id="sa-from-date"
                            value={filters.fromDate || ""}
                            onChange={(value) => {
                              const next = { ...filters, fromDate: value };
                              if (filters.toDate && value > filters.toDate) next.toDate = "";
                              setFilters(next);
                            }}
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                          />
                        </div>
                        <div>
                          <label
                            className="mb-1.5 block text-xs text-[var(--ov-ink-3)]"
                            htmlFor="sa-to-date"
                          >
                            To
                          </label>
                          <DatePicker
                            id="sa-to-date"
                            value={filters.toDate || ""}
                            onChange={(value) =>
                              setFilters({
                                ...filters,
                                toDate:
                                  !filters.fromDate || value >= filters.fromDate
                                    ? value
                                    : filters.fromDate,
                              })
                            }
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                            minDate={filters.fromDate}
                          />
                        </div>
                      </>
                    )}

                    {showCountries && (
                      <FormSelect
                        label="Country"
                        value={filters.country}
                        onChange={(e) => {
                          const country = e.target.value;
                          setFilters({ ...filters, country, region: "", chapter: "" });
                          onCountryChange?.(country);
                        }}
                        options={[{ value: "", label: "All countries" }, ...countries]}
                      />
                    )}

                    {showRegions && (
                      <FormSelect
                        label="Region"
                        value={filters.region}
                        onChange={(e) => {
                          const region = e.target.value;
                          setFilters({ ...filters, region, chapter: "" });
                          onRegionChange?.(region);
                        }}
                        options={[{ value: "", label: "All regions" }, ...regions]}
                      />
                    )}

                    {showChapters && (
                      <FormSelect
                        label="Chapter"
                        value={filters.chapter}
                        onChange={(e) => {
                          const chapter = e.target.value;
                          setFilters({ ...filters, chapter });
                          onChapterChange?.(chapter);
                        }}
                        options={[{ value: "", label: "All chapters" }, ...chapters]}
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--ov-deep-line)] pt-3.5">
                    {(chips.length > 0 || hasDimensions) && (
                      <button
                        type="button"
                        onClick={resetAll}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-[var(--ov-deep-ink-2)] transition-colors hover:text-[var(--ov-deep-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onSearch(filters);
                        setOpen(false);
                      }}
                      className="ml-auto h-[38px] rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)]"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommandBar;
