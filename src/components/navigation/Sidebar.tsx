import React, { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Layers,
  Globe,
  MapPin,
  Users,
  Building2,
  HeartHandshake,
  Briefcase,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  ClipboardList,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  UserCheck,
} from "lucide-react";
import { useRole } from "../../hooks/useRole";

interface NavSubItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  items?: NavSubItem[];
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { role } = useRole();

  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ekam_sidebar_collapsed") === "true";
    }
    return false;
  });

  // Track expanded accordion groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    network: true,
    partners: true,
    business: true,
    operations: true,
    reports: false,
  });

  // Toggle sidebar and update body class for content shift
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ekam_sidebar_collapsed", String(next));
      if (typeof document !== "undefined") {
        document.body.classList.toggle("sidebar-collapsed", next);
      }
      return next;
    });
  };

  // Sync body class on initial load
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("sidebar-collapsed", isCollapsed);
    }
  }, [isCollapsed]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      // If collapsed, clicking group expands sidebar
      setIsCollapsed(false);
      localStorage.setItem("ekam_sidebar_collapsed", "false");
      document.body.classList.remove("sidebar-collapsed");
      setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
    } else {
      setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    }
  };

  // Group definitions conforming to Section 1
  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        id: "network",
        label: "Network",
        icon: Layers,
        items: [
          { label: "Countries", href: "/admin/countries", icon: Globe },
          { label: "Regions", href: "/admin/regions", icon: MapPin },
          { label: "Chapters", href: "/admin/chapters", icon: Layers },
          { label: "Members", href: "/admin/members", icon: Users },
        ],
      },
      {
        id: "partners",
        label: "Partners",
        icon: Building2,
        items: [
          { label: "Franchise Partners", href: "/admin/franchise", icon: Building2 },
          { label: "Social Partners", href: "/admin/social", icon: HeartHandshake },
        ],
      },
      {
        id: "business",
        label: "Business",
        icon: Briefcase,
        items: [
          { label: "Opportunities", href: "/admin/business-opportunity", icon: Briefcase },
          { label: "1-to-1 Meetings", href: "/admin/business/p2p", icon: UserCheck },
          { label: "Chapter Meetings", href: "/admin/meetings", icon: Calendar },
        ],
      },
      {
        id: "operations",
        label: "Operations",
        icon: ShieldCheck,
        items: [
          { label: "Approvals", href: "/admin/approvals", icon: CheckCircle2 },
          { label: "Team & Roles", href: "/admin/team", icon: ShieldCheck },
        ],
      },
      {
        id: "reports",
        label: "Reports",
        icon: ClipboardList,
        items: [
          { label: "PALMS Attendance", href: "/reports/palms-attendance", icon: ClipboardList },
          { label: "Weekly Reports", href: "/reports/weekly", icon: ClipboardList },
        ],
      },
    ],
    []
  );

  // Helper to check if a route is currently active
  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      data-sidebar=""
      aria-label="Sidebar Navigation"
      className={`hidden md:flex fixed left-0 top-0 bottom-0 z-[1200] flex-col bg-[#0B2130] text-slate-300 border-r border-slate-800/80 transition-all duration-200 ease-in-out ${
        isCollapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80 shrink-0">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] rounded-lg py-1 transition-opacity hover:opacity-90"
          aria-label="EKAM CRM Dashboard"
        >
          {isCollapsed ? (
            <div className="w-8 h-8 grid place-items-center">
              <img
                src={`${import.meta.env.BASE_URL}ekam-icon-white.png`}
                alt="EKAM"
                className="h-7 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              <img
                src={`${import.meta.env.BASE_URL}EKAMLogo.png`}
                alt="EKAM"
                className="h-6 w-auto max-w-[135px] object-contain object-left"
              />
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E85A14] mt-1 pl-0.5">
                Enterprise CRM
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden lg:grid place-items-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => {
          const GroupIcon = group.icon;

          // Single direct link (e.g. Dashboard)
          if (!group.items) {
            const active = isActive(group.href);
            return (
              <div key={group.id} className="relative group/tooltip">
                <Link
                  to={group.href || "#"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    active
                      ? "bg-[#E85A14] text-white shadow-md shadow-orange-600/20 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <GroupIcon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                  {!isCollapsed && <span className="truncate">{group.label}</span>}
                </Link>

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tooltip:block z-50 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-xl border border-slate-700">
                    {group.label}
                  </div>
                )}
              </div>
            );
          }

          // Expandable group
          const isExpanded = !!expandedGroups[group.id];
          const hasActiveChild = group.items.some((item) => isActive(item.href));

          return (
            <div key={group.id} className="space-y-1">
              <div className="relative group/tooltip">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    hasActiveChild && isCollapsed
                      ? "bg-[#E85A14] text-white font-semibold shadow-md shadow-orange-600/20"
                      : hasActiveChild
                      ? "text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GroupIcon className={`w-5 h-5 shrink-0 ${hasActiveChild ? "text-[#E85A14]" : "text-slate-400"}`} />
                    {!isCollapsed && <span className="truncate text-left">{group.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tooltip:block z-50 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-xl border border-slate-700">
                    {group.label}
                  </div>
                )}
              </div>

              {/* Child Sub-items */}
              {!isCollapsed && isExpanded && (
                <div className="pl-6 space-y-1 pt-0.5 animate-in fade-in duration-150">
                  {group.items.map((subItem) => {
                    const active = isActive(subItem.href);
                    const SubIcon = subItem.icon;
                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-[#E85A14] text-white font-semibold shadow-sm shadow-orange-600/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        }`}
                      >
                        <SubIcon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                        <span className="truncate">{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/80 shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} p-2 rounded-xl bg-slate-900/50 border border-slate-800/80`}>
          <div className="w-8 h-8 rounded-full bg-[#E85A14]/20 border border-[#E85A14]/40 text-[#E85A14] font-bold text-xs grid place-items-center shrink-0">
            {role ? role.substring(0, 2) : "SA"}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Administrator</p>
              <p className="text-[10px] text-[#E85A14] truncate font-mono uppercase font-bold">{role || "SUPER_ADMIN"}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
