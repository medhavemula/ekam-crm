import type { Location } from "react-router-dom";

export interface NavDropdownItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: NavDropdownItem[];
}

/**
 * Route-matching rules for the main navigation.
 *
 * Extracted so the desktop rail and the mobile drawer highlight identically — they
 * previously carried separate copies and had already drifted (the mobile dropdown
 * check was missing the /business/connections alias).
 *
 * The per-role special cases below are preserved verbatim from the original
 * NavbarBottom; they encode which sub-routes roll up under which tab.
 */
export function createIsActive(location: Location) {
  const routeState = (location.state as { chapterId?: string } | null) ?? null;
  const hasChapterContext = Boolean(routeState?.chapterId);
  const isChapterContextReportRoute = [
    "/admin/many-to-one",
    "/admin/visitors",
    "/admin/inducted-by-report",
    "/admin/business/events",
  ].some((path) => location.pathname === path || location.pathname.startsWith(path + "/"));

  return function isActive(href: string, dropdownItems?: NavDropdownItem[]): boolean {
    // Special-case: treat all report pages as part of Dashboard for highlighting
    if (href === "/dashboard") {
      return (
        location.pathname === href ||
        location.pathname.startsWith("/reports") ||
        location.pathname.startsWith(href + "/")
      );
    }

    // Special-case: Business dropdown items for admin roles
    if (href.startsWith("/business") || href === "/business") {
      if (href === "/business") {
        if (hasChapterContext && isChapterContextReportRoute) {
          return false;
        }
        return (
          location.pathname.startsWith("/admin/business") ||
          location.pathname.startsWith("/business") ||
          location.pathname.startsWith("/viewprofile/") ||
          location.pathname === "/admin/meetings" ||
          location.pathname.startsWith("/admin/meetings/") ||
          location.pathname === "/admin/many-to-one" ||
          location.pathname.startsWith("/admin/many-to-one") ||
          location.pathname.startsWith("/admin/ed/m2o/") ||
          location.pathname.startsWith("/admin/visitors")
        );
      }

      if (dropdownItems) {
        return dropdownItems.some((item) => {
          if (item.href === "/admin/meetings") {
            return (
              location.pathname === "/admin/meetings" ||
              location.pathname.startsWith("/admin/meetings/")
            );
          }
          if (item.href === "/admin/many-to-one") {
            return (
              location.pathname === "/admin/many-to-one" ||
              location.pathname.startsWith("/admin/many-to-one") ||
              location.pathname.startsWith("/admin/ed/m2o/")
            );
          }
          if (item.href === "/admin/visitors") {
            return location.pathname.startsWith("/admin/visitors");
          }
          return location.pathname === item.href || location.pathname.startsWith(item.href + "/");
        });
      }

      return location.pathname === href || location.pathname.startsWith(href + "/");
    }

    // Special-case: Professional should highlight on ANY /professional route
    if (href.startsWith("/professional")) {
      return (
        location.pathname === "/professional" ||
        location.pathname.startsWith("/professional/") ||
        location.pathname.startsWith("/professional")
      );
    }

    // ED Regional Board tab: chapter and chapter-context report subroutes
    if (href === "/admin/regional-board") {
      return (
        location.pathname === href ||
        location.pathname.startsWith("/admin/regional-board/") ||
        location.pathname.startsWith("/admin/chapters/") ||
        location.pathname.startsWith("/admin/inducted-by-report") ||
        (hasChapterContext && isChapterContextReportRoute)
      );
    }

    // Special-case: Social admin tabs
    if (href.startsWith("/social/admin/")) {
      const path = location.pathname;

      if (href === "/social/admin/dashboard") {
        return (
          path === href ||
          path.startsWith("/social/admin/dashboard/") ||
          path === "/social/admin/profile"
        );
      }

      if (href === "/social/admin/regional-board") {
        return path === href || path.startsWith("/social/admin/regional-board/");
      }

      if (href === "/social/admin/regional-team") {
        return path === href || path.startsWith("/social/admin/regional-team/");
      }

      if (href === "/social/admin/team-role") {
        return (
          path === href ||
          path.startsWith("/social/admin/team-role/") ||
          path.startsWith("/social/admin/manage-roles")
        );
      }

      // Social tab: all remaining social-admin routes (events, all-activities, etc.)
      if (href === "/social/admin/all-activities") {
        const isSomeAdmin = path.startsWith("/social/admin/");
        const isDashboard =
          path === "/social/admin/dashboard" || path.startsWith("/social/admin/dashboard/");
        const isProfile = path === "/social/admin/profile";
        const isRegionalBoard =
          path === "/social/admin/regional-board" ||
          path.startsWith("/social/admin/regional-board/");
        const isRegionalTeam =
          path === "/social/admin/regional-team" || path.startsWith("/social/admin/regional-team/");
        const isTeamRole =
          path === "/social/admin/team-role" ||
          path.startsWith("/social/admin/team-role/") ||
          path.startsWith("/social/admin/manage-roles");

        return (
          isSomeAdmin &&
          !isDashboard &&
          !isProfile &&
          !isRegionalBoard &&
          !isRegionalTeam &&
          !isTeamRole
        );
      }

      return path === href || path.startsWith(href + "/");
    }

    // User-facing (non-admin) /social routes
    if (!href.includes("/admin/") && href.startsWith("/social")) {
      if (href === "/social/all-activities") {
        return location.pathname === href || location.pathname.startsWith("/social/");
      }
      return location.pathname === href || location.pathname.startsWith(href + "/");
    }

    if (location.pathname === href || location.pathname.startsWith(href + "/")) {
      return true;
    }

    const isAliasOf = (itemHref: string) => {
      if (itemHref === "/business/connections" && location.pathname.startsWith("/viewprofile/"))
        return true;
      return false;
    };

    if (dropdownItems) {
      return dropdownItems.some(
        (item) =>
          location.pathname === item.href ||
          location.pathname.startsWith(item.href + "/") ||
          isAliasOf(item.href),
      );
    }

    return false;
  };
}

/** Highlight rule for an individual dropdown entry. */
export function isDropdownItemActive(location: Location, href: string): boolean {
  if (location.pathname === href || location.pathname.startsWith(href + "/")) return true;
  if (
    href === "/business/connections" &&
    (location.pathname.startsWith("/profile/") || location.pathname.startsWith("/viewprofile/"))
  ) {
    return true;
  }
  return false;
}
