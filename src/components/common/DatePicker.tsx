import React from "react";
import { createPortal } from "react-dom";
import { themeClassFor } from "../../theme/themeScope";

interface DatePickerProps {
  id?: string;
  value: string; // yyyy-mm-dd
  onChange: (next: string) => void;
  className?: string;
  iconSrc?: string;
  iconAlt?: string;
  iconPosition?: "right" | "left";
  minDate?: string; // yyyy-mm-dd, disable dates before this
  maxDate?: string; // yyyy-mm-dd, disable dates after this
  availableDates?: string[]; // yyyy-mm-dd array of allowed dates
  disableTodayHighlight?: boolean; // disable today highlighting when using availableDates
  placeholder?: string;
  disabled?: boolean;
  forceOpenDirection?: "down" | "up"; // Force dropdown direction
}

// Helpers
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toDdMmYyyy = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

// Parse common date string inputs to a Date. Supports:
// - yyyy-mm-dd
// - dd/mm/yyyy (always treat slash format as dd/mm/yyyy)
const parseDateString = (s?: string): Date | null => {
  if (!s) return null;
  // yyyy-mm-dd
  if (s.includes("-")) {
    const parts = s.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map((x) => Number(x));
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, (m || 1) - 1, d || 1);
    }
  }
  // slash formats - always treat as dd/mm/yyyy
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, (m || 1) - 1, d || 1);
      }
    }
  }
  return null;
};

const weekdaysShort = ["S", "M", "T", "W", "T", "F", "S"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Chevron = ({ dir = "left" }: { dir?: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

export default function DatePicker({
  id,
  value,
  onChange,
  className,
  iconSrc,
  iconAlt = "calendar",
  iconPosition = "right",
  minDate,
  maxDate,
  availableDates,
  disableTodayHighlight = false,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  forceOpenDirection,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number } | null>(null);
  // The panel is portaled out of the page, so it has to carry the page theme with it.
  const [themeClass, setThemeClass] = React.useState("");
  type ViewMode = "day" | "month" | "year";
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [isFocused, setIsFocused] = React.useState(false);
  const [rangeError, setRangeError] = React.useState("");
  const [inputText, setInputText] = React.useState<string>("");
  const isDisabled = disabled;

  const initial = React.useMemo(() => {
    const parsed = parseDateString(value);
    return parsed ?? new Date();
  }, [value]);

  const [viewYear, setViewYear] = React.useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initial.getMonth()); // 0-based
  // Base year for year-grid pages
  const [yearPageBase, setYearPageBase] = React.useState(() => {
    const y = initial.getFullYear();
    return y - (y % 12);
  });

  // Close on outside click/escape
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      // The panel is portaled to <body>, so it is not inside anchorRef any more.
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Decide whether to open above or below based on viewport space
  React.useEffect(() => {
    if (!open) return;
    const computePlacement = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const PANEL_H = 336; // calendar height incl. header
      const PANEL_W = 288; // w-72
      const GAP = 8;
      // A caller-forced direction still needs coordinates computed, so it steers
      // the choice rather than skipping the whole placement pass.
      const shouldOpenUp = forceOpenDirection
        ? forceOpenDirection === "up"
        : spaceBelow < PANEL_H && spaceAbove > spaceBelow;

      // The panel is portaled to <body> and positioned in viewport coordinates,
      // so it can never be trapped by an ancestor's stacking context or clipped
      // by an ancestor's overflow. Rendered in place it painted underneath the
      // sibling fields around it.
      const left = Math.min(
        Math.max(GAP, rect.left),
        Math.max(GAP, window.innerWidth - PANEL_W - GAP),
      );
      const top = shouldOpenUp ? Math.max(GAP, rect.top - PANEL_H - GAP) : rect.bottom + GAP;
      setPanelPos({ top, left });
      setThemeClass(themeClassFor(el));
    };
    computePlacement();
    window.addEventListener("resize", computePlacement);
    window.addEventListener("scroll", computePlacement, true);
    return () => {
      window.removeEventListener("resize", computePlacement);
      window.removeEventListener("scroll", computePlacement, true);
    };
  }, [open, forceOpenDirection]);

  //Reset view to current/selected date when picker opens
  React.useEffect(() => {
    if (open) {
      const resetDate = parseDateString(value) ?? new Date();
      setViewYear(resetDate.getFullYear());
      setViewMonth(resetDate.getMonth());
      setYearPageBase(() => {
        const y = resetDate.getFullYear();
        return y - (y % 12);
      });
      setViewMode("day");
    }
  }, [open, value]);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstOfMonth.getDay(); // 0-6, Sunday first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // The lead-in and lead-out cells carry the neighbouring months' days instead
  // of blanks, so every week row reads as a full week. They render dimmed and
  // stay unselectable - they give the grid context, they are not targets.
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Array<{ day: number; date: Date; outside: boolean }> = [];
  for (let i = startDay; i > 0; i--) {
    const d = daysInPrevMonth - i + 1;
    cells.push({ day: d, date: new Date(viewYear, viewMonth - 1, d), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(viewYear, viewMonth, d), outside: false });
  }
  const trailingCount = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trailingCount; d++) {
    cells.push({ day: d, date: new Date(viewYear, viewMonth + 1, d), outside: true });
  }

  const selectedYmd = React.useMemo(() => {
    const parsed = parseDateString(value);
    return parsed ? toYmd(parsed) : "";
  }, [value]);
  const selectedDisplay = React.useMemo(() => {
    const parsed = parseDateString(value);
    return parsed ? toDdMmYyyy(parsed) : "";
  }, [value]);
  const todayYmd = React.useMemo(() => toYmd(new Date()), []);
  const daysInMonthOf = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const minDateObj = React.useMemo(() => parseDateString(minDate), [minDate]);
  const maxDateObj = React.useMemo(() => parseDateString(maxDate), [maxDate]);

  // Day-granular bounds, so comparisons never trip over a time component.
  const minDay = React.useMemo(
    () =>
      minDateObj
        ? new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate())
        : null,
    [minDateObj],
  );
  const maxDay = React.useMemo(
    () =>
      maxDateObj
        ? new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate())
        : null,
    [maxDateObj],
  );

  // A month/year is only selectable if at least one day inside it is in range.
  // Without this the month and year grids stayed clickable and silently refused
  // to commit, which is how an out-of-range year could look like it was picked.
  const isMonthDisabled = (y: number, m: number) => {
    if (minDay && new Date(y, m, daysInMonthOf(y, m)) < minDay) return true;
    if (maxDay && new Date(y, m, 1) > maxDay) return true;
    return false;
  };
  const isYearDisabled = (y: number) => {
    if (minDay && new Date(y, 11, 31) < minDay) return true;
    if (maxDay && new Date(y, 0, 1) > maxDay) return true;
    return false;
  };
  // Pull a candidate onto the nearest allowed day so picking a partially valid
  // month/year commits the closest legal date instead of doing nothing.
  const clampToBounds = (d: Date) => {
    if (minDay && d < minDay) return new Date(minDay);
    if (maxDay && d > maxDay) return new Date(maxDay);
    return d;
  };

  const selectDate = (d: Date) => {
    onChange(toYmd(d));
    setOpen(false);
    
    // Force close with timeout as fallback
    setTimeout(() => {
      setOpen(false);
    }, 10);
  };

  // Keep input text in sync with selected value when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setInputText(selectedDisplay);
    }
  }, [isFocused, selectedDisplay]);

  const withinBounds = (d: Date) => {
    const minOk = !minDateObj || d >= new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate());
    const maxOk = !maxDateObj || d <= new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate());
    return minOk && maxOk;
  };

  // Format free-typed input to DD/MM/YYYY progressively
  const formatToDdMmYyyyInput = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "").slice(0, 8);
    const parts: string[] = [];
    if (digits.length <= 2) return digits;
    parts.push(digits.slice(0, 2));
    if (digits.length <= 4) return parts[0] + "/" + digits.slice(2);
    parts.push(digits.slice(2, 4));
    const rest = digits.slice(4);
    return parts[0] + "/" + parts[1] + (rest ? "/" + rest : "");
  };

  // Strict parse for DD/MM/YYYY (use for typed input)
  const parseDdMmYyyy = (s: string): Date | null => {
    if (!s || !s.includes("/")) return null;
    const [dd, mm, yyyy] = s.split("/");
    if (!dd || !mm || !yyyy) return null;
    const d = Number(dd);
    const m = Number(mm);
    const y = Number(yyyy);
    if ([d, m, y].some((n) => Number.isNaN(n))) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31 || yyyy.length < 4) return null;
    const days = daysInMonthOf(y, m - 1);
    if (d > days) return null;
    return new Date(y, m - 1, d);
  };

  // Navigation handlers adjust depending on current view
  const goPrev = () => {
    if (viewMode === "day") {
      if (viewMonth === 0) {
        setViewYear((y) => y - 1);
        setViewMonth(11);
      } else {
        setViewMonth((m) => m - 1);
      }
    } else if (viewMode === "month") {
      setViewYear((y) => y - 1);
    } else {
      setYearPageBase((b) => b - 12);
    }
  };
  const goNext = () => {
    if (viewMode === "day") {
      if (viewMonth === 11) {
        setViewYear((y) => y + 1);
        setViewMonth(0);
      } else {
        setViewMonth((m) => m + 1);
      }
    } else if (viewMode === "month") {
      setViewYear((y) => y + 1);
      setYearPageBase((b) => b + 1 - ((b + 1) % 12) + 0);
    } else {
      setYearPageBase((b) => b + 12);
    }
  };

  const hasIcon = Boolean(iconSrc);
  const iconSideCls = iconPosition === "right" ? "right-3" : "left-3";
  const paddingWithIcon = iconPosition === "right" ? "pr-10" : "pl-10";

  return (
    <div
      ref={anchorRef}
      className={`relative w-full ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onFocus={() => !open && !isDisabled && setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      onClick={() => !isDisabled && setOpen(true)}
    >
      {/* Anchor input-like field */}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={isFocused ? inputText : selectedDisplay || ""}
        onFocus={() => {
          setIsFocused(true);
          setInputText((t) => (t || selectedDisplay || ""));
        }}
        onBlur={() => {
          setIsFocused(false);
          const parsed = parseDdMmYyyy(inputText);
          if (parsed && withinBounds(parsed)) {
            setRangeError("");
            onChange(toYmd(parsed));
            setInputText(toDdMmYyyy(parsed));
          } else {
            // A complete date that simply falls outside the allowed range used to be
            // wiped without a word, so the form silently held nothing while the person
            // believed they had entered a date. Say why it was not accepted.
            setRangeError(
              parsed && !withinBounds(parsed)
                ? maxDateObj && parsed > maxDateObj
                  ? "That date is too late — please choose an earlier one."
                  : "That date is outside the allowed range."
                : "",
            );
            setInputText(selectedDisplay);
          }
        }}
        onChange={(e) => {
          const formatted = formatToDdMmYyyyInput(e.target.value);
          setInputText(formatted);
          if (rangeError) setRangeError("");
          
          // Smart clearing logic - only clear what's being deleted
          if (formatted.length < inputText.length) {
            // User is deleting characters
            if (formatted.length === 0) {
              // Completely cleared
              onChange("");
            } else if (formatted.length <= 2) {
              // Only day part left or cleared, keep it
              const parsed = parseDdMmYyyy(formatted + "/01/2024");
              if (parsed && withinBounds(parsed)) {
                onChange(toYmd(parsed));
              }
            } else if (formatted.length <= 5) {
              // Day and month part left, keep them
              const parsed = parseDdMmYyyy(formatted + "/2024");
              if (parsed && withinBounds(parsed)) {
                onChange(toYmd(parsed));
              }
            } else {
              // Full date or year part, parse normally
              const parsed = parseDdMmYyyy(formatted);
              if (parsed && withinBounds(parsed)) {
                onChange(toYmd(parsed));
              }
            }
          } else {
            // User is typing, parse normally
            const parsed = parseDdMmYyyy(formatted);
            if (parsed && withinBounds(parsed)) {
              onChange(toYmd(parsed));
            }
          }
        }}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "h-11 w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border border-[color:var(--field-border)] text-left text-sm",
          "transition-colors focus:outline-none focus:border-[color:var(--field-border-focus)] block",
          "px-3",
          "cursor-pointer focus:cursor-pointer hover:cursor-pointer",
          hasIcon ? paddingWithIcon : "",
          (selectedDisplay ? "text-[var(--field-ink)]" : "text-[var(--field-placeholder)]"),
        ].join(" ")}
        autoComplete="off"
      />

      {hasIcon && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`absolute top-1/2 -translate-y-1/2 ${iconSideCls} h-4 w-4 opacity-80 hover:opacity-100 transition-opacity`}
          aria-label="Open calendar"
        >
          <img 
            src={iconSrc} 
            alt={iconAlt} 
            className="h-4 w-4" 
          />
        </button>
      )}

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Date picker"
          className={`${themeClass} fixed z-[10001] w-72 overflow-hidden rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-cal)] shadow-[var(--field-shadow)]`}
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          {/* Header with clickable Month/Year switching */}
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--field-border)] px-2 py-2 text-[var(--field-ink)]">
            <button type="button" aria-label="Previous" onClick={goPrev} className="grid h-8 w-8 place-items-center rounded-md text-[var(--field-ink)] opacity-70 transition-colors hover:bg-[var(--field-cal-hover)] hover:opacity-100">
              <Chevron dir="left" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "month" ? "day" : "month"))}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  viewMode === "month"
                    ? "bg-[var(--field-accent)] text-[var(--field-accent-ink)]"
                    : "text-[var(--field-ink)] hover:bg-[var(--field-cal-hover)]"
                }`}
              >
                {monthNames[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "year" ? "day" : "year"))}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  viewMode === "year"
                    ? "bg-[var(--field-accent)] text-[var(--field-accent-ink)]"
                    : "text-[var(--field-ink)] hover:bg-[var(--field-cal-hover)]"
                }`}
              >
                {viewYear}
              </button>
            </div>
            <button type="button" aria-label="Next" onClick={goNext} className="grid h-8 w-8 place-items-center rounded-md text-[var(--field-ink)] opacity-70 transition-colors hover:bg-[var(--field-cal-hover)] hover:opacity-100">
              <Chevron dir="right" />
            </button>
          </div>
          {/* Body: switch by viewMode */}
          {viewMode === "day" && (
            <>
              {/* Weekdays */}
              <div className="grid grid-cols-7 px-2 pt-2 text-center">
                {weekdaysShort.map((w, i) => (
                  <div key={`${w}-${i}`} className="py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--field-placeholder)]">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px p-2">
                {cells.map((c, idx) => {
                  const ymd = toYmd(c.date);
                  const isSelected = !c.outside && selectedYmd === ymd;
                  const isTodayFallback = !c.outside && !selectedYmd && ymd === todayYmd && !(disableTodayHighlight && availableDates && !availableDates.includes(ymd));
                  const isDisabled = c.outside || !!(
                    (minDateObj && c.date < new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate())) ||
                    (maxDateObj && c.date > new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate())) ||
                    (availableDates && !availableDates.includes(ymd))
                  );
                  return (
                    <button
                      type="button"
                      key={idx}
                      aria-hidden={c.outside || undefined}
                      tabIndex={c.outside ? -1 : undefined}
                      onClick={() => !isDisabled && selectDate(c.date)}
                      disabled={isDisabled}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        c.outside
                          ? "cursor-default text-[var(--field-placeholder)] opacity-40"
                          : isSelected || isTodayFallback
                            ? "bg-[var(--field-accent)] font-semibold text-[var(--field-accent-ink)]"
                            : isDisabled
                              ? "cursor-not-allowed text-[var(--field-ink)] opacity-30"
                              : "text-[var(--field-ink)] hover:bg-[var(--field-cal-hover)]"
                      }`}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {viewMode === "month" && (
            <div className="grid grid-cols-3 gap-2 p-3">
              {monthNames.map((m, idx) => {
                const monthDisabled = isMonthDisabled(viewYear, idx);
                return (
                <button
                  type="button"
                  key={m}
                  disabled={monthDisabled}
                  onClick={() => {
                    if (monthDisabled) return;
                    setViewMonth(idx);
                    // Commit value immediately when picking a month
                    const today = new Date();
                    const current = parseDateString(value) || new Date(viewYear, idx, today.getDate());
                    const day = current.getDate() || today.getDate();
                    const safeDay = Math.min(day, daysInMonthOf(viewYear, idx));
                    const candidate = clampToBounds(new Date(viewYear, idx, safeDay));
                    onChange(toYmd(candidate));
                    setViewMode("day");
                  }}
                  className={`rounded-md py-2 text-sm text-[var(--field-ink)] transition-colors ${
                    monthDisabled
                      ? "cursor-not-allowed opacity-30"
                      : `hover:bg-[var(--field-cal-hover)] ${idx === viewMonth ? "bg-[var(--field-accent)] font-semibold" : ""}`
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
                );
              })}
            </div>
          )}
          {viewMode === "year" && (
            <div className="grid grid-cols-3 gap-2 p-3">
              {Array.from({ length: 12 }).map((_, i) => {
                const y = yearPageBase + i;
                const yearDisabled = isYearDisabled(y);
                return (
                  <button
                    type="button"
                    key={y}
                    disabled={yearDisabled}
                    onClick={() => {
                      if (yearDisabled) return;
                      setViewYear(y);
                      // Commit value immediately when picking a year
                      const month = viewMonth;
                      const today = new Date();
                      const current = parseDateString(value) || new Date(y, month, today.getDate());
                      const day = current.getDate() || today.getDate();
                      const safeDay = Math.min(day, daysInMonthOf(y, month));
                      const candidate = clampToBounds(new Date(y, month, safeDay));
                      onChange(toYmd(candidate));
                      setViewMonth(candidate.getMonth());
                      setViewMode("day");
                    }}
                    className={`rounded-md py-2 text-sm text-[var(--field-ink)] transition-colors ${
                      yearDisabled
                        ? "cursor-not-allowed opacity-30"
                        : `hover:bg-[var(--field-cal-hover)] ${y === viewYear ? "bg-[var(--field-accent)] font-semibold" : ""}`
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        document.body,
      )}
      {rangeError && (
        <p className="text-xs text-red-400 mt-1" role="alert">
          {rangeError}
        </p>
      )}
    </div>
  );
}