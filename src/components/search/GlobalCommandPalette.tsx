import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Building2,
  HeartHandshake,
  Globe,
  MapPin,
  Layers,
  Users,
  Briefcase,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  X,
  CornerDownLeft,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Network" | "Partners" | "Business" | "Operations" | "Reports";
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  badge?: string;
}

const STATIC_REGISTRY: SearchResultItem[] = [
  // Overview
  { id: "dash", title: "Dashboard Overview", subtitle: "KPI metrics & network cascade", category: "Network", icon: Layers, route: "/dashboard" },
  // Network
  { id: "net-countries", title: "Countries", subtitle: "International network directory", category: "Network", icon: Globe, route: "/admin/countries", badge: "Directory" },
  { id: "net-regions", title: "Regions", subtitle: "Active regional network territories", category: "Network", icon: MapPin, route: "/admin/regions", badge: "Territories" },
  { id: "net-chapters", title: "Chapters", subtitle: "All registered operational chapters", category: "Network", icon: Layers, route: "/admin/chapters" },
  { id: "net-members", title: "Members", subtitle: "Directory of chapter members & directors", category: "Network", icon: Users, route: "/admin/members" },
  // Partners
  { id: "pt-franchise", title: "Franchise Partners", subtitle: "Executive Directors leading expansions", category: "Partners", icon: Building2, route: "/admin/franchise", badge: "Executive" },
  { id: "pt-social", title: "Social Partners", subtitle: "Social Chairpersons & regional governors", category: "Partners", icon: HeartHandshake, route: "/admin/social", badge: "Leadership" },
  // Business
  { id: "biz-opps", title: "Business Opportunities", subtitle: "Pipeline referrals (BOG / BOR)", category: "Business", icon: Briefcase, route: "/admin/business-opportunity" },
  { id: "biz-p2p", title: "1-to-1 Meetings", subtitle: "Direct member-to-member interactions", category: "Business", icon: Users, route: "/admin/business/p2p" },
  { id: "biz-meetings", title: "Chapter Meetings", subtitle: "Weekly attendance & meeting logs", category: "Business", icon: Calendar, route: "/admin/meetings" },
  // Operations
  { id: "op-approvals", title: "Approvals Queue", subtitle: "Unassigned registrations pending review", category: "Operations", icon: CheckCircle2, route: "/admin/approvals", badge: "Queue" },
  { id: "op-team", title: "Team & Roles", subtitle: "Admin team members & RBAC permissions", category: "Operations", icon: ShieldCheck, route: "/admin/team" },
  // Reports
  { id: "rep-palms", title: "PALMS Attendance Report", subtitle: "Present, absent, late, and excused stats", category: "Reports", icon: ClipboardList, route: "/reports/palms-attendance" },
  { id: "rep-weekly", title: "Weekly Activity Report", subtitle: "Chapter progress & summary exports", category: "Reports", icon: ClipboardList, route: "/reports/weekly" },
];

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          const event = new CustomEvent("open-ekam-search");
          window.dispatchEvent(event);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_REGISTRY;
    return STATIC_REGISTRY.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [query]);

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
      e.preventDefault();
      navigate(filteredResults[selectedIndex].route);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search EKAM CRM"
      className="fixed inset-0 z-[3000] flex items-start justify-center p-4 pt-16 md:pt-24 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search EKAM (countries, chapters, partners, members, reports)..."
            className="flex-1 bg-transparent text-sm md:text-base text-slate-900 placeholder-slate-400 outline-none"
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-slate-600">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for Countries, Regions, Partners, or Chapters.</p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.route);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-orange-50/80 text-orange-950 ring-1 ring-orange-200" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
                        isSelected ? "bg-[#E85A14] text-white shadow-sm" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-medium text-slate-400">{item.category}</span>
                    <ArrowRight className={`w-4 h-4 ${isSelected ? "text-[#E85A14] translate-x-0.5" : "text-slate-300"} transition-all`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-slate-400" /> Open
            </span>
          </div>
          <span className="text-slate-400">EKAM Network CRM</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalCommandPalette;
