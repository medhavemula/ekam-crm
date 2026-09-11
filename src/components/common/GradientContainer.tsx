import React from "react";

interface GradientContainerProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const GradientContainer: React.FC<GradientContainerProps> = ({ children, className = "", innerClassName = "", style, onClick }) => {
  return (
    <div
      // The ring and the surface come from tokens now. At :root they are the
      // exact gradients this component always drew, so the ~150 unthemed pages
      // using it are unchanged; on a themed page it follows the theme instead
      // of staying a fixed dark slab.
      className={`p-[2px] rounded-[16px] relative ${className}`}
      style={{ background: "var(--surface-ring)", ...style }}
      onClick={onClick}
    >
      <div
        className={`w-full h-full overflow-visible rounded-[14px] ${innerClassName}`}
        style={{ background: "var(--surface-bg)" }}
      >
        {children}
      </div>
    </div>
  );
};

export default GradientContainer;
