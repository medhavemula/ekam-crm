/**
 * AdminStatCard - Reusable stat card for admin dashboards
 * Supports icons and custom styling
 */

import React from "react";
import GradientContainer from "../common/GradientContainer";
import { Globe, Users, Briefcase } from "lucide-react";
import globeIcon from "../../assets/icons/globe.svg";
import chaptersIcon from "../../assets/icons/chapters.svg";
import totalChaptersIcon from "../../assets/icons/totalchapters.svg";
import boIcon from "../../assets/icons/BO.svg";
import bcIcon from "../../assets/icons/BC.svg";
import usersIcon from "../../assets/icons/users.svg";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon?:
    | "globe"
    | "users"
    | "briefcase"
    | "chapters"
    | "totalchapters"
    | "bo"
    | "bc"
    | "none";
  className?: string;
  onClick?: () => void;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({ 
  title, 
  value, 
  icon = "none",
  className = "",
  onClick 
}) => {
  const ICONS: Record<string, string | undefined> = {
    globe: globeIcon,
    chapters: chaptersIcon,
    totalchapters: totalChaptersIcon,
    bo: boIcon,
    bc: bcIcon,
    users: usersIcon,
  };

  const renderIcon = () => {
    const imgClass = "h-12 w-12";
    const lucideClass = "h-12 w-12 text-[var(--ov-ink-4)]";

    const src = ICONS[icon ?? ""];
    if (src) {
      return (
        <img src={src} alt={icon} className={imgClass} style={{ filter: "var(--ov-icon-filter)" }} />
      );
    }

    switch (icon) {
      case "globe":
        return <Globe className={lucideClass} />;
      case "users":
        return <Users className={lucideClass} />;
      case "briefcase":
        return <Briefcase className={lucideClass} />;
      default:
        return null;
    }
  };

  return (
    <GradientContainer className={className}>
      <div 
        className={`p-5 md:p-6 rounded-2xl ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={onClick}
      >
        <h3 className="mb-3 text-sm text-[var(--ov-ink-2)]">{title}</h3>
        <div className="flex items-end justify-between">
          <p className="ekam-figure text-3xl font-bold text-[var(--ov-ember)] md:text-4xl">{value}</p>
          {icon !== "none" && <div className="ml-3 shrink-0">{renderIcon()}</div>}
        </div>
      </div>
    </GradientContainer>
  );
};

export default AdminStatCard;
