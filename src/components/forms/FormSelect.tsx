import React from "react";
import { createPortal } from "react-dom";
import { themeClassFor } from "../../theme/themeScope";
import type { SelectHTMLAttributes } from "react";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  isRequired?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  showMenuHeader?: boolean; // controls the non-searchable header placeholder row
  /**
   * Drops the label element entirely instead of rendering it empty.
   *
   * Many callers pass label="" on purpose, so the blank label block lines the
   * control up with labelled fields beside it — removing that everywhere would
   * shift those layouts. This is opt-in for the case where the control stands
   * alone in a toolbar and the empty block is just dead height.
   */
  hideLabel?: boolean;
  hideOptionsUntilSearch?: boolean; // when true, do not show options until user types
  menuMaxHeightClass?: string; // tailwind max-h-* class to control visible items
  disableClientSideFilter?: boolean; // when true, disables client-side filtering for API-based search
  // When provided, forces dropdown to open in a specific direction (default auto)
  openDirection?: "down" | "up";
  // Custom content to render between label and the select trigger (e.g., chips)
  topAdornment?: React.ReactNode;
  // Optional custom z-index utility class for the dropdown menu container
  zIndex?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  error,
  isRequired = false,
  options,
  placeholder = "Select an option",
  className = "",
  name,
  disabled,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = "Search",
  onSearchChange,
  showMenuHeader = true,
  hideLabel = false,
  hideOptionsUntilSearch = false,
  menuMaxHeightClass = "max-h-60",
  disableClientSideFilter = false,
  openDirection,
  topAdornment,
  zIndex,
}) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = React.useState("");
  const [lastSelected, setLastSelected] = React.useState<{ value: string; label: string } | null>(null);
  const [openUp, setOpenUp] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  // The menu is portaled out of the page, so it has to carry the page theme with it.
  const [themeClass, setThemeClass] = React.useState("");

  /**
   * The menu is portaled to <body>, so it is positioned in viewport coordinates
   * rather than relative to the trigger. Rendered in place it inherited every
   * ancestor's stacking context and overflow — inside a popover or a card with
   * `overflow-hidden` it was clipped, and beside a later sibling it painted
   * underneath. Portaling removes both failure modes for good.
   */
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const MENU_H = 280;
      const GAP = 4;
      const up = window.innerHeight - rect.bottom < MENU_H && rect.top > window.innerHeight - rect.bottom;
      setOpenUp(up);
      setMenuPos({
        top: up ? Math.max(GAP, rect.top - GAP) : rect.bottom + GAP,
        left: rect.left,
        width: rect.width,
      });
      setThemeClass(themeClassFor(el));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);


  // Notify parent of search changes
  React.useEffect(() => {
    if (onSearchChange && searchable) {
      onSearchChange(query);
    }
  }, [query, onSearchChange, searchable]);

  const selectedOption =
    options.find((o) => o.value === String(value ?? "")) ||
    (lastSelected && lastSelected.value === String(value ?? "") ? lastSelected : undefined);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || "Select an option");
  const filtered = React.useMemo(() => {
    if (hideOptionsUntilSearch && searchable && !query.trim()) {
      return [];
    }
    
    // If client-side filtering is disabled, return all options (for API-based search)
    if (disableClientSideFilter) {
      return options;
    }
    
    const base =
      !searchable || !query.trim()
        ? options
        : options.filter((o) => {
            const label = (o.label || "").toLowerCase();
            const q = (query || "").toLowerCase().trim();
            
            // Improved case-insensitive search with partial matching
            // Handle multiple search terms (space-separated)
            const searchTerms = q.split(/\s+/).filter(term => term.length > 0);
            
            if (searchTerms.length === 0) return true;
            
            // All search terms must be found in the label
            return searchTerms.every(term => label.includes(term));
          });

    // For dropdowns where the first option is a real "All"/empty option,
    // always keep it visible even when filtering. Otherwise, just return base.
    const firstOption = options[0];
    const isAllOption = firstOption && ["", "all", "All", "ALL"].includes(firstOption.value);
    if (!isAllOption) return base;

    const otherOptions = base.filter((_, idx) => idx !== 0);
    return firstOption ? [firstOption, ...otherOptions] : otherOptions;
  }, [options, query, searchable, hideOptionsUntilSearch, disableClientSideFilter]);

  // Close on outside click / Escape
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // The menu is portaled to <body>, so it is no longer inside containerRef.
      // Without this the mousedown on an option closed the menu before its click
      // handler ran, and the option could never be chosen.
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Compute whether to open above or below similar to DatePicker, unless forced
  React.useEffect(() => {
    if (openDirection) {
      setOpenUp(openDirection === "up");
      return;
    }
    if (!open) return;
    const computePlacement = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const desiredHeight = 280; // approx dropdown height
      const shouldOpenUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
      setOpenUp(shouldOpenUp);
    };
    computePlacement();
    window.addEventListener("resize", computePlacement);
    window.addEventListener("scroll", computePlacement, true);
    return () => {
      window.removeEventListener("resize", computePlacement);
      window.removeEventListener("scroll", computePlacement, true);
    };
  }, [open, openDirection]);

  const menuRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current;
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel as any);
      el.removeEventListener("touchmove", onTouchMove as any);
    };
  }, [open]);

  const emitChange = (nextValue: string) => {
    if (onChange) {
      const synthetic = {
        target: { value: nextValue, name },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(synthetic);
    }
  };

  const borderClass = error
    ? "border-[color:var(--field-invalid)]"
    : "border-[color:var(--field-border)]";

  return (
    <div className="w-full min-w-0">
      {!hideLabel && (
        <label className="block text-xs text-[var(--field-label)] mb-1.5">
          {label} {isRequired && <span className="text-[var(--field-invalid)]">*</span>}
        </label>
      )}

      {/* Adornment area (e.g., chips) */}
      {topAdornment}

      {/* Hidden input for form submission compatibility */}
      {name && <input type="hidden" name={name} value={String(value ?? "")} />}

      {/* Trigger */}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          className={`w-full h-11 rounded-[var(--field-radius)] bg-[var(--field-bg)] border ${borderClass} px-3 pr-9 text-[var(--field-ink)] text-left focus:outline-none focus:border-[color:var(--field-border-focus)] transition-colors cursor-pointer ${className} relative flex items-center overflow-hidden min-w-0 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed bg-[var(--field-bg-hover)] border-[color:var(--field-border)]' 
              : 'hover:bg-[var(--field-bg-hover)]'
          }`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`block truncate whitespace-nowrap ${selectedOption ? "text-[var(--field-ink)]" : "text-[var(--field-placeholder)]"}`}>
            {displayLabel}
          </span>
          {/* Chevron */}
          {/* The chevron was stroked #FFFFFF, so on a light theme it was white
              on a white control and the field did not read as a dropdown at
              all. currentColor lets it follow the field ink. */}
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--field-placeholder)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>

        {open && menuPos && createPortal(
          <div
            role="listbox"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              transform: openUp ? "translateY(-100%)" : undefined,
            }}
            className={`${themeClass} ${zIndex ?? "z-[10000]"} overflow-auto rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-menu)] p-1 shadow-[var(--field-shadow)] ${menuMaxHeightClass}`}
            ref={menuRef}
          >
            {/* Optional search bar */}
            {searchable && (
              <div className="sticky top-0 z-10 bg-[var(--field-menu)] p-1 pb-2">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-[color:var(--field-border)] bg-[var(--field-bg)] px-3 py-2 pl-8 text-sm text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:border-[color:var(--field-border-focus)] focus:outline-none"
                  />
                  <svg
                    className="absolute left-2 top-2.5 text-[var(--field-placeholder)]"
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
              </div>
            )}
            {/* The header row is skipped when the options already carry an
                empty-value entry ("All countries", "Select role"): that entry is
                the placeholder and it is selectable, so printing a second inert
                copy above it says the same thing twice. */}
            {!searchable && showMenuHeader && !options.some((o) => o.value === "") && (
              <div className="select-none px-3 py-2 text-sm text-[var(--field-placeholder)]">{placeholder || 'Select an option'}</div>
            )}
            {hideOptionsUntilSearch && searchable && !query.trim() && (
              <div className="select-none px-4 py-3 text-sm text-[var(--field-placeholder)]">Type to search…</div>
            )}
            {filtered.length === 0 ? (
              <div className="select-none px-4 py-3 text-sm text-[var(--field-placeholder)]">No data found</div>
            ) : (
              filtered.map((opt) => {
                const isActive = String(value ?? "") === opt.value;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    key={opt.value}
                    onClick={() => {
                      setLastSelected(opt);
                      emitChange(opt.value);
                      setOpen(false);
                      // Only clear query if client-side filtering is enabled
                      if (!disableClientSideFilter) {
                        setQuery("");
                      }
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--field-selected-bg)] text-[var(--field-selected-ink)] font-medium"
                        : "text-[var(--field-ink)] hover:bg-[var(--field-menu-hover)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
      </div>
      {error && <p className="text-xs text-[var(--field-invalid)] mt-1">{error}</p>}
    </div>
  );
};

export default FormSelect;
