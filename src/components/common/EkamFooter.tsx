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
    <footer className={`fixed bottom-0 left-0 right-0 w-full text-center py-2 bg-transparent pointer-events-none z-40 ${className}`}>
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
