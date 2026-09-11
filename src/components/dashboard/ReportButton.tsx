import React from "react";

interface ReportButtonProps {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ReportButton: React.FC<ReportButtonProps> = ({ title, subtitle, onClick, className = "", style }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-6 py-4 text-white font-medium rounded-lg text-sm md:text-base transition-[filter,transform] hover:brightness-110 active:scale-[0.99] ${className}`}
      style={{
        background: "linear-gradient(90deg, #D85D27 0%, #93401B 100%)",
        ...style,
      }}
    >
      <div className="flex flex-col items-center">
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs mt-1 font-normal opacity-90">{subtitle}</div>}
      </div>
    </button>
  );
};

export default ReportButton;
