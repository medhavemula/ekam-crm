import React from "react";

export interface TestimonialTabButtonProps {
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

/**
 * TestimonialTabButton Component
 * Reusable summary/tab card. Styling centered and consistent.
 */
export const TestimonialTabButton: React.FC<TestimonialTabButtonProps> = ({
  title,
  count,
  isActive,
  onClick,
  icon,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full h-[112px] rounded-xl border transition-all text-left px-6 py-5",
        "relative flex items-center shadow-sm",
        isActive
          ? "bg-[#D85D27] border-orange-600 text-white"
          : "bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] border-orange-600 text-white hover:bg-[#D85D27]/10",
      ].join(" ")}
      aria-pressed={isActive}
    >
      <div className="pr-20">
        <h3 className="text-sm md:text-base font-semibold mb-2">{title}</h3>
        <p className="text-4xl md:text-5xl leading-none tracking-tight">
          {String(count).padStart(2, "0")}
        </p>
      </div>
      <div className="absolute bottom-4 right-4 opacity-95 transform scale-125 md:scale-150">
        {icon}
      </div>
    </button>
  );
};

export default TestimonialTabButton;
