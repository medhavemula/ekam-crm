import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Ban,
  Bell,
  ChevronDown,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  Repeat2,
  Search,
  User,
  X,
} from "lucide-react";
import { useLogoutMutation } from "../../services/authApi";
import NotificationPopover from "../notifications/NotificationPopover";
import { useNotificationsCountersQuery } from "../../services/notificationsApi";
import { socketService } from "../../services/socketService";
import { useRole } from "../../hooks/useRole";
import RoleManagementModal from "../RoleManagementModal";
import { canSwitchToPrimaryRole } from "../../config/roles";
import { SOCIAL_ADMIN_ROLES } from "../../config/routeConfig";
import { usePushNotifications } from "../push/PushNotificationsProvider";

interface TopBarProps {
  userName?: string;
  userAvatar?: string;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  isMenuOpen?: boolean;
  onMenuToggle?: () => void;
  scrolled?: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#334155] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14]";

export const TopBar: React.FC<TopBarProps> = ({
  userName = "Admin",
  userAvatar,
  onNotificationClick,
  onProfileClick,
  onSearchClick,
  isMenuOpen = false,
  onMenuToggle,
  scrolled = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logout] = useLogoutMutation();
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

  // Close menus on outside click or Escape
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

  useEffect(() => {
    if (!isNotifOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
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

  useEffect(() => {
    setIsProfileOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await cleanupPushSession();
    } catch {
      // ignore
    }
    try {
      await logout().unwrap();
    } catch {
      // ignore
    } finally {
      socketService.forceDisconnectAll();
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.replace("/login");
    }
  };

  const reduceMotion = useReducedMotion();
  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section: Mobile menu button & breadcrumbs/title context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] md:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Quick context / current path indicator */}
          <div className="hidden items-center gap-2 text-sm text-[#64748B] sm:flex">
            <span className="font-semibold text-[#0B2130]">EKAM CRM</span>
            <span>/</span>
            <span className="capitalize text-[#334155]">
              {location.pathname.replace(/^\/(admin\/)?/, "").replace(/-/g, " ") || "Dashboard"}
            </span>
          </div>
        </div>

        {/* Center: Global Search trigger button */}
        <div className="flex flex-1 max-w-md mx-4">
          <button
            type="button"
            onClick={onSearchClick}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#94A3B8] transition-all hover:border-[#CBD5E1] hover:bg-white hover:text-[#475569] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14]"
            aria-label="Search EKAM"
          >
            <div className="flex items-center gap-2.5">
              <Search size={16} className="text-[#64748B]" />
              <span className="text-[13px]">Search members, chapters, partners...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] shadow-2xs">
              <span>{isMac ? "⌘" : "Ctrl"}</span>
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* Right section: Notifications & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notifications button & popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen((v) => !v);
                onNotificationClick?.();
              }}
              className="relative grid h-10 w-10 place-items-center rounded-lg text-[#64748B] border border-[#E2E8F0] bg-white transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14]"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              aria-expanded={isNotifOpen}
            >
              <Bell size={18} />
              {unread > 0 && (
                <>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E85A14] animate-ping" />
                  <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E85A14] px-1 text-[10px] font-bold text-white shadow-xs">
                    {Math.min(unread, 99)}
                  </span>
                </>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <NotificationPopover isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
              </div>
            )}
          </div>

          {/* User Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={handleProfileToggle}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              aria-label="User menu"
              className="flex h-10 items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white p-1 transition-colors hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] sm:pr-2.5"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0B2130] text-white">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[8rem] truncate text-xs font-semibold text-[#0F172A]">
                  {displayName}
                </p>
                <p className="max-w-[8rem] truncate text-[10px] font-medium text-[#64748B]">
                  {role ? role.replace(/_/g, " ") : "Administrator"}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`hidden text-[#64748B] transition-transform duration-200 sm:block ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  role="menu"
                  aria-label="User menu"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl"
                >
                  <div className="border-b border-[#E2E8F0] px-3 py-2">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
                    <span className="mt-0.5 inline-block rounded bg-[#E2E8F0]/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                      {role ? role.replace(/_/g, " ") : "ADMIN"}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={goToAccount}
                      className={menuItemClass}
                    >
                      <User size={16} className="text-[#64748B]" />
                      <span>My Account</span>
                    </button>

                    {hasCategoriesAccess && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/categories");
                        }}
                        className={menuItemClass}
                      >
                        <LayoutGrid size={16} className="text-[#64748B]" />
                        <span>Categories</span>
                      </button>
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
                      <Ban size={16} className="text-[#64748B]" />
                      <span>Blocked Members</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("/change-password");
                      }}
                      className={menuItemClass}
                    >
                      <KeyRound size={16} className="text-[#64748B]" />
                      <span>Change Password</span>
                    </button>

                    {canManageRoles && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleRoleManagement}
                        className={menuItemClass}
                      >
                        <Repeat2 size={16} className="text-[#0D9488]" />
                        <span className="font-medium text-[#0D9488]">Switch Role</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {isRoleModalOpen && (
        <RoleManagementModal
          open={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
        />
      )}
    </header>
  );
};

export default TopBar;
