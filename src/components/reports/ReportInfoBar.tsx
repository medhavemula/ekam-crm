import React from "react";

export interface ReportInfoBarProps {
  chapter: string;
  member: string;
  fromDate: string;
  toDate: string;
  className?: string;
  region?: string;
  country?: string;
}

/**
 * ReportInfoBar Component
 * 
 * Displays chapter, member, and date range information for reports.
 */
export const ReportInfoBar: React.FC<ReportInfoBarProps> = ({
  chapter,
  member,
  fromDate,
  toDate,
  className = "",
  region,
  country,
}) => {
  const items: Array<{ label: string; value: string }> = [
    { label: "Chapter", value: chapter },
  ];
  if (member) items.push({ label: "Member", value: member });
  if (region) items.push({ label: "Region", value: region });
  if (country) items.push({ label: "Country", value: country });
  items.push({ label: "From Date", value: fromDate });
  items.push({ label: "To Date", value: toDate });

  const gridCols = Math.min(items.length, 6);
  const mdColsClass =
    gridCols === 1 ? "md:grid-cols-1" :
    gridCols === 2 ? "md:grid-cols-2" :
    gridCols === 3 ? "md:grid-cols-3" :
    gridCols === 4 ? "md:grid-cols-4" :
    gridCols === 5 ? "md:grid-cols-5" :
    "md:grid-cols-6";

  return (
    <div className={`bg-[var(--infobar-bg)] border-b border-[color:var(--infobar-line)] ${className}`}>
      <div className={["grid grid-cols-2", mdColsClass].join(" ")}> 
        {items.map((it, idx) => (
          <div
            key={idx}
            className={`px-4 py-3 md:py-4 border-b border-[color:var(--infobar-line)] md:border-b-0 ${idx !== items.length - 1 ? "md:border-r md:border-[color:var(--infobar-line)]" : ""}`}
          >
            <div className="text-sm text-[var(--infobar-label)]">{it.label}</div>
            <div className="text-lg md:text-2xl font-semibold leading-tight text-[var(--infobar-value)] break-words">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportInfoBar;
