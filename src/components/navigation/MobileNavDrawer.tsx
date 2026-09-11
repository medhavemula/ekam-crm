import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createIsActive, isDropdownItemActive } from "./navActive";
import type { NavItem } from "./navActive";

const ChevronDown = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const Close = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  userName?: string;
  userAvatar?: string;
}

/* The accent, read from the theme rather than frozen as a hex. The drawer is
   rendered inline inside the page wrapper, not portaled, so it inherits
   whichever .ekam-* class the page is wearing. Hardcoding the orange left the
   active markers ember on a screen where every other accent had changed. */
const ACCENT = "var(--ov-ember)";

/**
 * Slide-in navigation for viewports below md.
 *
 * Replaces the previous inline expand, which pushed the page down, never closed
 * after navigating, and left the underlying page scrollable behind it.
 */
export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  open,
  onClose,
  items,
  userName,
  userAvatar,
}) => {
  const location = useLocation();
  const isActive = createIsActive(location);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Open the section containing the current route so the user lands oriented.
  useEffect(() => {
    if (!open) return;
    const current = items.find(
      (item) => item.hasDropdown && isActive(item.href, item.dropdownItems),
    );
    setExpanded(current?.label ?? null);
    // isActive is derived from location, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, location.pathname]);

  // Close whenever the route changes, so tapping a link dismisses the drawer.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock the page behind the drawer and restore the exact scroll position after.
  useEffect(() => {
    if (!open) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  // Escape closes; focus moves into the panel on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, onClose]);

  if (!open) return null;

  const initial = (userName || "U").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[2100] md:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-[navScrimIn_180ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col border-r border-[color:var(--ov-line-strong)] bg-[var(--nav-bar)] shadow-2xl shadow-black/60 motion-safe:animate-[navDrawerIn_240ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--ov-line)] px-4 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--ov-fill-hover)] ring-1 ring-[color:var(--ov-line-strong)]">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-[var(--ov-ink)]">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--ov-ink)]">{userName || "Member"}</p>
            <p className="text-xs text-[var(--ov-ink-3)]">Navigation</p>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            <Close />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {items.map((item, index) => {
              const active = isActive(item.href, item.dropdownItems);
              const isExpanded = expanded === item.label;

              return (
                <li
                  key={item.label}
                  className="motion-safe:animate-[navItemIn_220ms_ease-out_both]"
                  style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                >
                  {item.hasDropdown ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : item.label)}
                        aria-expanded={isExpanded}
                        aria-current={active ? "page" : undefined}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                          active
                            ? "bg-[var(--ov-fill-hover)] text-[var(--ov-ink)]"
                            : "text-[var(--ov-ink-2)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="h-5 w-[3px] shrink-0 rounded-full transition-colors"
                            style={{ backgroundColor: active ? ACCENT : "transparent" }}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronDown
                          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && item.dropdownItems && (
                        <ul className="mb-1 ml-5 mt-1 space-y-0.5 border-l border-[color:var(--ov-line)] pl-3">
                          {item.dropdownItems.map((sub) => {
                            const subActive = isDropdownItemActive(location, sub.href);
                            return (
                              <li key={sub.href}>
                                <Link
                                  to={sub.href}
                                  aria-current={subActive ? "page" : undefined}
                                  className={`block rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                                    subActive
                                      ? "bg-[var(--ov-fill-hover)] text-[var(--ov-ink)]"
                                      : "text-[var(--ov-ink-3)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                        active
                          ? "bg-[var(--ov-fill-hover)] text-[var(--ov-ink)]"
                          : "text-[var(--ov-ink-2)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-5 w-[3px] shrink-0 rounded-full transition-colors"
                        style={{ backgroundColor: active ? ACCENT : "transparent" }}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default MobileNavDrawer;
