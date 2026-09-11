import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface ReportStatCardProps {
  title: string;
  value: string | number;
  /** Kept for callers; both variants always rendered identically. */
  variant?: "default" | "primary";
  gradient?: {
    colors?: string[];
    borderColors?: string[];
    borderRadius?: number;
    padding?: number;
    direction?: string;
    borderDirection?: string;
    className?: string;
    style?: React.CSSProperties;
  };
}

/**
 * ReportStatCard Component
 * 
 * Reusable stat card for displaying report metrics.
 */
export const ReportStatCard: React.FC<ReportStatCardProps> = ({
  title,
  value,
  gradient,
}) => {
  // The label was text-white, which is invisible on a light card — these cards
  // were showing a bare figure with nothing to say what it counted. A label is
  // also not headline text: it takes the eyebrow treatment the rest of the
  // admin panel uses, and the figure keeps the accent.
  const inner = (
    <div className="rounded-2xl p-5">
      <h3 className="ekam-eyebrow text-[9.5px] font-semibold text-[var(--ov-ink-4)]">{title}</h3>
      <p className="ekam-figure mt-2.5 text-[26px] font-semibold leading-none text-[var(--ov-ember)]">
        {value}
      </p>
    </div>
  );

  // Default gradient if none provided
  const defaults = {
    colors: ["#0D1117", "#1E2630"],
    borderColors: ["rgba(92, 92, 92, 1)", "rgba(255, 255, 255, 0)"],
    borderRadius: 16,
    padding: 2,
    direction: "180deg",
    borderDirection: "180deg",
  };

  const g = {
    ...defaults,
    ...(gradient || {}),
  };

  return (
    <GradientContainer
      className={g.className}
      style={g.style}
    >
      {inner}
    </GradientContainer>
  );
};

export default ReportStatCard;
