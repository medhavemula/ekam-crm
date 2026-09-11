import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe,
  Handshake,
  Heart,
  IdCard,
  KeyRound,
  LayoutGrid,
  Link2,
  Map,
  Merge,
  Newspaper,
  Quote,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

/**
 * Icon per navigation label.
 *
 * Keyed on the label rather than the href because the same section is mounted at
 * different paths per role, while the label is stable. Every top-level tab across
 * every role config is covered — see `iconsFor` for what happens when one is not.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutGrid,
  "Franchise Partner": Store,
  "Social Partner": Handshake,
  "Team & Role": UsersRound,
  Countries: Globe,
  Regions: Map,
  "Regional Board": ClipboardList,
  "Regional Team": Users,
  "Regional Access": KeyRound,
  Business: Briefcase,
  Professional: IdCard,
  "Content Reports": FileText,
  Social: Heart,
  "My Feed": Newspaper,
  Connections: Link2,
  Groups: Users,
  Events: CalendarDays,
  Meetings: CalendarClock,
  Visitors: UserPlus,
  Testimonials: Quote,
  P2P: ArrowLeftRight,
  "Many to One": Merge,
  "Business Opportunity": TrendingUp,
  "Business Closed": CheckCircle2,
  "Business Opportunity Given (BOG)": ArrowUpRight,
  "Business Opportunity Received (BOR)": ArrowDownLeft,
};

/**
 * Icons for a whole rail, or null.
 *
 * All-or-nothing on purpose: a rail where four tabs carry an icon and two do not
 * reads as broken rather than as minimal, and role configs are edited by people
 * who have no reason to know this map exists. If a single label is unmapped the
 * rail falls back to labels only, which is a complete design rather than a
 * half-applied one.
 */
export function iconsFor(labels: string[]): Record<string, LucideIcon> | null {
  if (labels.length === 0) return null;
  const missing = labels.some((label) => !NAV_ICONS[label]);
  return missing ? null : NAV_ICONS;
}
