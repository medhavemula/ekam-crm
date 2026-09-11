import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { createIsActive, isDropdownItemActive } from "./navActive";
import { iconsFor } from "./navIcons";
import type { NavItem } from "./navActive";

export type { NavItem, NavDropdownItem } from "./navActive";

const ChevronDown = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
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

interface NavbarBottomProps {
  items?: NavItem[];
  className?: string;
  /** Set once the page has scrolled, so the rail can condense with the bar above it. */
  scrolled?: boolean;
}

const defaultNavItems: NavItem[] = [{ label: "Dashboard", href: "/dashboard" }];

const MENU_MIN_WIDTH = 320;
const EDGE_GAP = 12;
/** Grace period so the pointer can travel from the tab into the menu. */
const CLOSE_DELAY_MS = 130;

interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
}

/** One spring for every nav movement, so the whole bar feels like one mechanism. */
const NAV_SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

/**
 * Desktop navigation rail.
 *
 * The active tab carries a single indicator that slides between tabs rather than
 * per-tab pseudo-element blocks, so moving between sections reads as one motion.
 * The rail scrolls horizontally when a role has more tabs than fit, with fade
 * masks marking the overflow.
 *
 * Dropdowns render through a portal: the scroller needs `overflow-x`, which would
 * otherwise clip an absolutely-positioned menu, and the sticky header's
 * backdrop-filter creates a stacking context that would trap it behind the page.
 *
 * Mobile navigation lives in MobileNavDrawer — this component is desktop-only.
 */
export const NavbarBottom: React.FC<NavbarBottomProps> = ({
  items = defaultNavItems,
  className = "",
  scrolled = false,
}) => {
  const location = useLocation();
  const isActive = createIsActive(location);
  const reduceMotion = useReducedMotion();

  // Icons render for the whole rail or for none of it — see iconsFor.
  const icons = React.useMemo(() => iconsFor(items.map((i) => i.label)), [items]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const listRef = useRef<HTMLUListElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const activeItem = items.find((item) => isActive(item.href, item.dropdownItems));
  const activeLabel = activeItem?.label ?? null;

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    cancelClose();
    setOpenDropdown(null);
    setMenuPos(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenDropdown(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Anchor the portaled menu under its trigger, flipping to right-aligned when a
  // left-aligned menu would run past the viewport edge.
  const positionMenu = useCallback((label: string) => {
    const trigger = triggerRefs.current[label];
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const top = rect.bottom + 4;
    if (rect.left + MENU_MIN_WIDTH > window.innerWidth - EDGE_GAP) {
      setMenuPos({ top, right: Math.max(EDGE_GAP, window.innerWidth - rect.right) });
    } else {
      setMenuPos({ top, left: rect.left });
    }
  }, []);

  const openDropdownFor = useCallback(
    (label: string) => {
      cancelClose();
      positionMenu(label);
      setOpenDropdown(label);
    },
    [cancelClose, positionMenu],
  );

  // Keep the menu glued to its trigger while the page or rail scrolls.
  useEffect(() => {
    if (!openDropdown) return;
    const reposition = () => positionMenu(openDropdown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [openDropdown, positionMenu]);

  // Position the sliding indicator behind the active tab.
  //
  // Measured with bounding rects against the list, NOT with offsetLeft: each tab
  // sits inside a positioned <li>, so the tab's offsetParent is that <li> and its
  // offsetLeft is ~0 for every tab in the rail. That put the indicator at the left
  // edge no matter which tab was active — correct-looking only on the first tab.
  // Both rects move together under horizontal scroll, so their difference is the
  // position within the list at any scroll offset.
  const measureIndicator = useCallback(() => {
    const list = listRef.current;
    const el = activeLabel ? tabRefs.current[activeLabel] : null;
    if (!list || !el) {
      setIndicator(null);
      return;
    }
    const listRect = list.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    setIndicator({ left: tabRect.left - listRect.left, width: tabRect.width });
  }, [activeLabel]);

  useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator, items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => measureIndicator());
    ro.observe(list);
    return () => ro.disconnect();
  }, [measureIndicator]);

  // Web fonts can land after first paint and shift tab widths.
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts?.ready) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) measureIndicator();
    });
    return () => {
      cancelled = true;
    };
  }, [measureIndicator]);

  const updateOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    updateOverflow();
    const scroller = scrollerRef.current;
    const list = listRef.current;
    const ro = new ResizeObserver(updateOverflow);
    // Observe the list as well as the viewport: the scroller's own width never
    // changes, so watching only it misses the tabs growing once webfonts land.
    if (scroller) ro.observe(scroller);
    if (list) ro.observe(list);
    return () => ro.disconnect();
  }, [updateOverflow, items]);

  // Keep the active tab in view when the rail overflows.
  useEffect(() => {
    const el = activeLabel ? tabRefs.current[activeLabel] : null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeLabel]);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = Object.values(triggerRefs.current).some((el) => el?.contains(target));
      if (!inTrigger && !menuRef.current?.contains(target)) closeMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openDropdown, closeMenu]);

  const closeAndRefocus = useCallback(
    (label: string) => {
      closeMenu();
      triggerRefs.current[label]?.focus();
    },
    [closeMenu],
  );

  const onTriggerKeyDown = (e: React.KeyboardEvent, item: NavItem) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openDropdownFor(item.label);
      // Wait for the portal to mount before moving focus into it.
      requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      });
    } else if (e.key === "Escape" && openDropdown === item.label) {
      e.preventDefault();
      closeAndRefocus(item.label);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent, label: string) => {
    const links = Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    if (links.length === 0) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      links[(index + 1 + links.length) % links.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      links[(index - 1 + links.length) % links.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      links[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      links[links.length - 1]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      closeAndRefocus(label);
    }
  };

  const hoverCapable = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer:fine)").matches;

  // The pill sits behind the label, so the tab needs a stacking context above it.
  // Type steps down to 13.5px with normal tracking: at 15–16px and wide tracking
  // the rail read like a marketing site's header rather than an application's.
  const tabBase =
    `relative z-10 inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13.5px] transition-[color,height] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-track)] ${scrolled ? "h-8" : "h-9"}`;

  const openItem = items.find((item) => item.label === openDropdown);

  return (
    <>
      {/* The rail is a segment of the action bar rather than a row of its own, so
          it carries no surface or border — the bar around it supplies both. */}
      <nav
        className={`relative hidden min-w-0 flex-1 md:block ${className}`}
        aria-label="Main navigation"
      >
        {/* w-fit so the track hugs its tabs instead of stretching to the actions —
            a segmented control that runs the width of the bar stops reading as a
            control. max-w-full lets it shrink and scroll when a role has more tabs
            than fit. The fade masks sit on this box so they land on the track's own
            edges, and they fade to the track rather than the bar behind it. */}
        <div className="relative w-fit max-w-full">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 left-1 z-10 w-8 rounded-l-lg bg-gradient-to-r from-[var(--nav-track)] to-transparent transition-opacity duration-200 ${
              overflow.start ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 right-1 z-10 w-8 rounded-r-lg bg-gradient-to-l from-[var(--nav-track)] to-transparent transition-opacity duration-200 ${
              overflow.end ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* The tabs sit in a recessed track, and the active tab is a raised
              surface inside it. A segmented control reads as a control; loose
              text links across a bar read as a website menu. The inversion also
              means the selection needs no colour to be obvious. */}
          <div
            ref={scrollerRef}
            onScroll={updateOverflow}
            className={`overflow-x-auto rounded-xl bg-[var(--nav-track)] p-1 ring-1 ring-[color:var(--ov-line-faint)] transition-[padding] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              scrolled ? "p-[3px]" : "p-1"
            }`}
          >
            {/* w-max so the list sizes to its content — at 100% width the
                overflowing tabs would be clipped rather than scrollable. */}
            <ul
              ref={listRef}
              className="relative flex w-max items-center gap-0.5"
            >
              {/* One pill that slides between tabs. It is drawn before the tabs so
                  it sits behind their labels, and it is the *only* indicator —
                  a pill plus an underline is two accessories doing one job. */}
              {indicator && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 rounded-lg bg-[var(--nav-active-wash)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--nav-active-edge)]"
                  initial={false}
                  animate={{ left: indicator.left, width: indicator.width }}
                  transition={reduceMotion ? { duration: 0 } : NAV_SPRING}
                />
              )}

              {items.map((item) => {
                const active = isActive(item.href, item.dropdownItems);
                const isOpen = openDropdown === item.label;
                const Icon = icons?.[item.label];

                return (
                  <li
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => {
                      if (item.hasDropdown && hoverCapable()) openDropdownFor(item.label);
                    }}
                    onMouseLeave={() => {
                      if (item.hasDropdown && hoverCapable()) scheduleClose();
                    }}
                  >
                    {item.hasDropdown ? (
                      <button
                        ref={(el) => {
                          triggerRefs.current[item.label] = el;
                          tabRefs.current[item.label] = el;
                        }}
                        onClick={() => (isOpen ? closeMenu() : openDropdownFor(item.label))}
                        onKeyDown={(e) => onTriggerKeyDown(e, item)}
                        aria-expanded={isOpen}
                        aria-haspopup="menu"
                        aria-current={active ? "page" : undefined}
                        className={`${tabBase} ${
                          active
                            ? "font-semibold text-[var(--nav-active-ink)]"
                            : "font-medium text-[var(--ov-ink-3)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            className="h-[15px] w-[15px] shrink-0 opacity-80"
                            strokeWidth={active ? 2.2 : 1.9}
                            aria-hidden="true"
                          />
                        )}
                        {item.label}
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 motion-reduce:transition-none ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        to={item.href}
                        ref={(el) => {
                          tabRefs.current[item.label] = el;
                        }}
                        aria-current={active ? "page" : undefined}
                        className={`${tabBase} ${
                          active
                            ? "font-semibold text-[var(--nav-active-ink)]"
                            : "font-medium text-[var(--ov-ink-3)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            className="h-[15px] w-[15px] shrink-0 opacity-80"
                            strokeWidth={active ? 2.2 : 1.9}
                            aria-hidden="true"
                          />
                        )}
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}

            </ul>
          </div>
        </div>
      </nav>

      {createPortal(
        <AnimatePresence>
          {openItem?.dropdownItems && menuPos && (
            <motion.div
              ref={menuRef}
              key={openItem.label}
              role="menu"
              aria-label={openItem.label}
              onKeyDown={(e) => onMenuKeyDown(e, openItem.label)}
              onMouseEnter={cancelClose}
              onMouseLeave={() => hoverCapable() && scheduleClose()}
              // Grows from its top edge, which is the edge touching the trigger,
              // so the menu reads as unfolding out of the tab rather than fading in.
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                right: menuPos.right,
                minWidth: MENU_MIN_WIDTH,
                transformOrigin: menuPos.right != null ? "top right" : "top left",
              }}
              className="z-[2500] hidden w-max max-w-[32rem] rounded-2xl border border-[color:var(--ov-line)] bg-[var(--nav-raised)] p-1.5 shadow-[var(--ov-shadow-pop)] md:block"
            >
              {openItem.dropdownItems.map((dropdownItem, index) => {
                const itemActive = isDropdownItemActive(location, dropdownItem.href);
                return (
                  <motion.div
                    key={dropdownItem.href}
                    initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.2, delay: 0.03 + index * 0.025, ease: [0.16, 1, 0.3, 1] }
                    }
                  >
                    <Link
                      to={dropdownItem.href}
                      role="menuitem"
                      aria-current={itemActive ? "page" : undefined}
                      onClick={closeMenu}
                      className={`block whitespace-normal break-words rounded-xl px-3 py-2 text-[15px] leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                        itemActive
                          ? "bg-[var(--nav-active-wash)] font-semibold text-[var(--nav-active-ink)]"
                          : "text-[var(--ov-ink-2)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                      }`}
                    >
                      {dropdownItem.label}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default NavbarBottom;
