import React from "react";

interface EkamFooterProps {
  className?: string;
  large?: boolean;
}

/**
 * Global footer component with copyright text.
 * Use `large` prop for prominent display (e.g., launch page).
 */
export const EkamFooter: React.FC<EkamFooterProps> = ({ className = "", large = false }) => {
  return (
    <footer className={`relative w-full text-center py-4 bg-transparent ${className}`}>
      <p className={`${large ? "text-sm md:text-base" : "text-[10px] md:text-xs"} text-gray-400`}>
        © 2026 Ekam Global Network Pvt. Ltd. All rights reserved.
      </p>
      <p className={`${large ? "text-sm md:text-base" : "text-[10px] md:text-xs"} text-gray-500 mt-0.5`}>
        Developed by Rovixai India Pvt. Ltd.
      </p>
    </footer>
  );
};

export default EkamFooter;
