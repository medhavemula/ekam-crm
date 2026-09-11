import React from "react";

interface EkamLogoProps {
  className?: string;
}

export const EkamLogo: React.FC<EkamLogoProps> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src="/ekam-logo2.png"
        alt="EKAM - One Network Infinite Aspirations"
        className="h-12 w-auto max-w-full object-contain"
      />
    </div>
  );
};

export default EkamLogo;
