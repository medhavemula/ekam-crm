import React, { useCallback, useEffect, useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { GlobalCommandPalette } from "../search/GlobalCommandPalette";
import MobileNavDrawer from "./MobileNavDrawer";
import type { NavItem } from "./navActive";
import { useAppSelector } from "../../app/store";
import { useRole } from "../../hooks/useRole";
import { getDashboardConfigForRoles } from "../../config/dashboardConfig";

interface NavbarProps {
  userName?: string;
  userAvatar?: string;
  navItems?: NavItem[];
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

const CONDENSE_AT = 48;
const EXPAND_BELOW = 12;

export const Navbar: React.FC<NavbarProps> = ({
  userName,
  userAvatar,
  navItems,
  onNotificationClick,
  onProfileClick,
  className = "",
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const storeUser = useAppSelector((s) => s.auth.user);
  const effectiveName =
    (typeof localStorage !== "undefined" && localStorage.getItem("userName")) ||
    userName ||
    storeUser?.name;
  const effectiveAvatar = userAvatar || storeUser?.basicInfo?.profilePhotoUrl;

  // Get role-based navigation if navItems not provided
  const { role } = useRole();
  const dashboardConfig = getDashboardConfigForRoles([role], role || "USER");
  const effectiveNavItems = navItems || dashboardConfig.tabs;

  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Keyboard shortcut listener for Global Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll detection for sticky header depth
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled((was) => (was ? y > EXPAND_BELOW : y > CONDENSE_AT));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Drop mobile menu on screen resize to desktop
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setIsMobileMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Enterprise Collapsible Sidebar (Fixed left) */}
      <Sidebar />

      {/* Enterprise Top Bar */}
      <div data-ekam-nav="" className={`sticky top-0 z-30 ${className}`}>
        <TopBar
          userName={effectiveName}
          userAvatar={effectiveAvatar}
          onNotificationClick={onNotificationClick}
          onProfileClick={onProfileClick}
          onSearchClick={() => setIsSearchOpen(true)}
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen((v) => !v)}
          scrolled={scrolled}
        />
      </div>

      {/* Global Command Palette Modal (⌘K / Ctrl+K) */}
      <GlobalCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile Drawer */}
      <MobileNavDrawer
        open={isMobileMenuOpen}
        onClose={closeMenu}
        items={effectiveNavItems}
        userName={effectiveName}
        userAvatar={effectiveAvatar}
      />
    </>
  );
};

export default Navbar;
