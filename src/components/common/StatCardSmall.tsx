import React from "react";
import GradientContainer from "./GradientContainer";

interface StatCardSmallProps {
  title: string;
  value: string | number;
  className?: string;
}

/**
 * A compact metric tile. The label was text-white — invisible on a light
 * card — so these were bare numbers with nothing to say what they counted;
 * fixed the same way ReportStatCard was. The label takes the eyebrow
 * treatment the rest of the admin panel uses, and the figure carries the
 * accent as a token rather than raw orange-500.
 */
export const StatCardSmall: React.FC<StatCardSmallProps> = ({ title, value, className = "" }) => {
  return (
    <GradientContainer className={className}>
      <div className="rounded-[14px] p-4 md:p-5">
        <h3 className="ekam-eyebrow text-[9.5px] font-semibold text-[var(--ov-ink-4)]">{title}</h3>
        <p className="ekam-figure mt-2 text-2xl font-semibold leading-none text-[var(--ov-ember)] md:text-3xl">
          {value}
        </p>
      </div>
    </GradientContainer>
  );
};

export default StatCardSmall;
