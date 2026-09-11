import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Ban, LayoutGrid, LogOut, Menu, Repeat2, Trash2, User, UserPlus, X } from "lucide-react";
import { useLogoutMutation } from "../../services/authApi";
import NotificationPopover from "../notifications/NotificationPopover";
import { useNotificationsCountersQuery } from "../../services/notificationsApi";
import { socketService } from "../../services/socketService";
import { useRole } from "../../hooks/useRole";
import RoleManagementModal from "../RoleManagementModal";
import { canSwitchToPrimaryRole } from "../../config/roles";
import { getDashboardRouteForRoles, SOCIAL_ADMIN_ROLES } from "../../config/routeConfig";
import { usePushNotifications } from "../push/PushNotificationsProvider";

const Bell = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
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
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

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

const Search = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

interface NavbarTopProps {
  userName?: string;
  userAvatar?: string;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  /** Drawer state is owned by Navbar so the icon and the panel can never desync. */
  isMenuOpen?: boolean;
  onMenuToggle?: () => void;
  /** Set once the page has scrolled, to deepen the bar's separation from content. */
  scrolled?: boolean;
  /**
   * The desktop tab rail, rendered inline between the wordmark and the actions.
   * Navigation is one row rather than two: the tabs are the primary control on
   * every page, and stacking them under a mostly-empty bar spent a whole row of
   * chrome to say nothing.
   */
  railSlot?: React.ReactNode;
}

const ACCENT = "var(--ov-ember)";

/** One easing curve for every movement in the bar. */
const EASE = [0.16, 1, 0.3, 1] as const;

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]";

export const NavbarTop: React.FC<NavbarTopProps> = ({
  userName = "Mike",
  userAvatar,
  onNotificationClick,
  onProfileClick,
  isMenuOpen = false,
  onMenuToggle,
  scrolled = false,
  railSlot,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const { cleanupPushSession } = usePushNotifications();
  const { role, roles } = useRole();
  const displayName = userName;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const { data: countersRes } = useNotificationsCountersQuery(undefined, {
    pollingInterval: 120000,
  });
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const assignedRoles = React.useMemo(
    () => Array.from(new Set([role, ...(roles || [])].filter(Boolean))),
    [role, roles],
  );

  const edRoles = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR",
  ] as const;
  const isEdRole = assignedRoles.some((assignedRole) => edRoles.includes(assignedRole as any));

  // Check all assigned roles so multi-role users reach the correct account page.
  const isSocialAdminRole = assignedRoles.some((assignedRole) =>
    SOCIAL_ADMIN_ROLES.includes(assignedRole as any),
  );

  const hasCategoriesAccess =
    role &&
    [
      "SUPER_ADMIN",
      "SUPER_ADMIN_TEAM",
      "ED_TEAM",
      "EXECUTIVE_DIRECTOR",
      "REGIONAL_DIRECTOR",
      "SOCIAL_CHAIRPERSON",
    ].includes(role);

  const hasMemberRegistrationAccess = role && ["ED_TEAM", "EXECUTIVE_DIRECTOR"].includes(role);

  const switchableRoles = assignedRoles.filter((assignedRole) =>
    canSwitchToPrimaryRole(assignedRole as any),
  );
  const canManageRoles = switchableRoles.length > 1;

  const unread = countersRes?.data?.unread ?? 0;

  const handleProfileToggle = () => {
    setIsProfileOpen((v) => !v);
    onProfileClick?.();
  };

  const handleRoleManagement = () => {
    setIsProfileOpen(false);
    setIsRoleModalOpen(true);
  };

  const goToAccount = () => {
    setIsProfileOpen(false);
    if (isSocialAdminRole) navigate("/social/admin/profile");
    else if (isEdRole) navigate("/ed/profile");
    else navigate("/profile");
  };

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!isProfileOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isProfileOpen]);

  // Same for the notification popover, which previously stayed open on outside click.
  useEffect(() => {
    if (!isNotifOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isNotifOpen]);

  // Close both menus when the route changes.
  useEffect(() => {
    setIsProfileOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await cleanupPushSession();
    } catch {
      // ignore push cleanup failures
    }
    try {
      await logout().unwrap();
    } catch {
      // ignore
    } finally {
      // Disconnect socket before clearing storage
      socketService.forceDisconnectAll();
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // Force a full refresh to clear any in-memory caches/state
      window.location.replace("/login");
    }
  };

  const isSearchActive = location.pathname === "/search";
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`relative z-20 w-full border-b border-[color:var(--ov-line)] bg-[var(--nav-bar)]/80 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-300 ${
        scrolled ? "shadow-[var(--ov-shadow-nav)]" : "shadow-none"
      }`}
    >
      {/* The bar gives back height once the page scrolls — on a dashboard this is
          the difference between one and two folds of chrome. */}
      <div
        className={`mx-auto flex max-w-[1600px] items-center gap-3 px-3 transition-[height] duration-300 sm:px-4 lg:gap-5 lg:px-6 ${
          scrolled ? "h-14" : "h-[68px]"
        }`}
      >
        {/* Left: menu toggle + logo */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] md:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>

          <button
            onClick={() => navigate(getDashboardRouteForRoles(assignedRoles))}
            className="flex shrink-0 items-center rounded-lg leading-none transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            aria-label="Go to Dashboard"
          >
            <img
              src={`${import.meta.env.BASE_URL}EKAMLogo-navy.png`}
              alt="E.K.A.M"
              className={`block shrink-0 select-none object-contain object-left transition-[height,width] duration-300 ${
                scrolled ? "h-5 w-[76px]" : "h-6.5 w-[96px]"
              }`}
            />
          </button>

          {/* Hairline between identity and navigation — the wordmark is a brand
              mark, not the first tab, and without a rule they read as one row of
              equal things. */}
          {railSlot && (
            <span
              aria-hidden="true"
              className="ml-1 hidden h-7 w-px shrink-0 bg-[var(--ov-line)] md:block lg:ml-2"
            />
          )}
        </div>

        {railSlot}

        {/* Right: actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <motion.button
            onClick={() => navigate("/search")}
            aria-label="Search members"
            aria-current={isSearchActive ? "page" : undefined}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE }}
            className={`group flex h-9 items-center gap-2 rounded-lg px-2 text-[var(--ov-ink-2)] ring-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] xl:px-2.5 ${
              isSearchActive
                ? "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-[color:var(--ov-ember-edge)]"
                : "ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:ring-[color:var(--ov-line-strong)]"
            }`}
          >
            <Search size={17} className="shrink-0" />
            <span className="hidden text-[13px] font-medium leading-none xl:block">Search</span>
          </motion.button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen((v) => !v);
                onNotificationClick?.();
              }}
              className="relative grid h-9 w-9 place-items-center rounded-lg text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              aria-expanded={isNotifOpen}
            >
              <Bell size={17} />
              <AnimatePresence>
                {unread > 0 && (
                  <>
                    <motion.span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full motion-safe:animate-ping"
                      style={{ backgroundColor: ACCENT }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                    {/* The count springs in rather than appearing, so a new
                        notification is caught by peripheral vision. */}
                    <motion.span
                      className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold leading-none text-[var(--ov-on-select)] ring-2 ring-[var(--nav-bar)]"
                      style={{ backgroundColor: "var(--ov-select-fill)" }}
                      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 640, damping: 22 }
                      }
                    >
                      {Math.min(unread, 99)}
                    </motion.span>
                  </>
                )}
              </AnimatePresence>
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2">
                <NotificationPopover isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={handleProfileToggle}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              aria-label="User menu"
              className="flex h-9 items-center gap-2 rounded-lg px-1 ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:ring-[color:var(--ov-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] sm:pr-2"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--ov-fill-hover)] ring-1 ring-[color:var(--ov-line-strong)]">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-[var(--ov-ink)]">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="hidden max-w-[10rem] truncate text-[13px] font-medium text-[var(--ov-ink-2)] lg:block">
                {displayName}
              </span>
              <ChevronDown
                size={15}
                className={`hidden text-[var(--ov-ink-2)] transition-transform duration-200 motion-reduce:transition-none sm:block ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
              <motion.div
                role="menu"
                aria-label="User menu"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: EASE }}
                style={{ transformOrigin: "top right" }}
                className="absolute right-0 top-full z-[2200] mt-2 w-60 rounded-2xl border border-[color:var(--ov-line)] bg-[var(--nav-raised)] p-1.5 shadow-[var(--ov-shadow-pop)]"
              >
                <div className="border-b border-[color:var(--ov-line)] px-3 pb-2 pt-1">
                  <p className="truncate text-sm font-medium text-[var(--ov-ink)]">{displayName}</p>
                  {role && (
                    <p className="truncate text-xs text-[var(--ov-ink-3)]">{role.replace(/_/g, " ")}</p>
                  )}
                </div>

                <div className="pt-1.5">
                  <button type="button" role="menuitem" onClick={goToAccount} className={menuItemClass}>
                    <User size={16} aria-hidden="true" />
                    My Account
                  </button>

                  {hasCategoriesAccess && (
                    <a href="/categories" role="menuitem" className={menuItemClass}>
                      <LayoutGrid size={16} aria-hidden="true" />
                      Categories
                    </a>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/blocked-members");
                    }}
                    className={menuItemClass}
                  >
                    <Ban size={16} aria-hidden="true" />
                    Blocked Members
                  </button>

                  {hasMemberRegistrationAccess && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("/admin/register-member");
                      }}
                      className={menuItemClass}
                    >
                      <UserPlus size={16} aria-hidden="true" />
                      Member Registration
                    </button>
                  )}

                  {canManageRoles && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleRoleManagement}
                      className={menuItemClass}
                    >
                      <Repeat2 size={16} aria-hidden="true" />
                      Switch Roles
                    </button>
                  )}
                </div>

                <div className="mt-1.5 border-t border-[color:var(--ov-line)] pt-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/delete-account");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ov-danger)] transition-colors hover:bg-[var(--ov-danger-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-danger)]"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete Account
                  </button>
                  <a
                    href="/login"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ov-danger)] transition-colors hover:bg-[var(--ov-danger-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-danger)]"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {loggingOut ? "Signing Out..." : "Sign Out"}
                  </a>
                </div>
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <RoleManagementModal open={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} />
    </div>
  );
};

export default NavbarTop;
