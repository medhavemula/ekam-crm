import React from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  className?: string;
}

/**
 * StatCard Component
 * 
 * Reusable card component for displaying statistics/metrics.
 * Used in reports and dashboards.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  className = "",
}) => {
  return (
    <div className={`bg-[#1a2332] border border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-orange-500">{value}</p>
    </div>
  );
};

export default StatCard;
