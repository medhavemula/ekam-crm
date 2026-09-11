import React from "react";
import groupInfoIcon from "../../assets/icons/groupinfo.svg";
import businessIcon from "../../assets/icons/business.svg";
import professionalIcon from "../../assets/icons/professional.svg";
import socialIcon from "../../assets/icons/social.svg";
import groupInfoActiveIcon from "../../assets/icons/groupinfo-active.svg";
import businessActiveIcon from "../../assets/icons/business-active.svg";
import professionalActiveIcon from "../../assets/icons/professional-active.svg";
import socialActiveIcon from "../../assets/icons/social-active.svg";

export type RegistrationStep = "BASIC" | "BUSINESS" | "PROFESSIONAL" | "SOCIAL";

export type ModuleType = 'business' | 'professional' | 'social';

interface Step {
  id: RegistrationStep;
  label: string;
  description: string;
  module?: ModuleType;
  icon: string;
  activeIcon: string;
}

const allSteps: Step[] = [
  {
    id: "BASIC",
    label: "Basic Info",
    description: "Personal Information",
    icon: groupInfoIcon,
    activeIcon: groupInfoActiveIcon,
  },
  {
    id: "BUSINESS",
    label: "Business",
    description: "Business Details",
    module: 'business',
    icon: businessIcon,
    activeIcon: businessActiveIcon,
  },
  {
    id: "PROFESSIONAL",
    label: "Professional",
    description: "Professional Details",
    module: 'professional',
    icon: professionalIcon,
    activeIcon: professionalActiveIcon,
  },
  {
    id: "SOCIAL",
    label: "Social",
    description: "Social Interests",
    module: 'social',
    icon: socialIcon,
    activeIcon: socialActiveIcon,
  },
];

interface RegistrationStepperProps {
  currentStep: RegistrationStep;
  onStepClick?: (step: RegistrationStep) => void;
  registrationType?: 'business' | 'professional' | 'social' | 'all';
  moduleAccess?: ModuleType[]; // For dynamic step display
  isNormalRegistration?: boolean; // Flag for normal registration mode
  hideSocialStep?: boolean; // New prop to explicitly hide social step
}

export const RegistrationStepper: React.FC<RegistrationStepperProps> = ({
  currentStep,
  onStepClick = () => {},
  registrationType = 'all',
  moduleAccess,
  isNormalRegistration = false,
  hideSocialStep = false,
}) => {
  // Determine which steps to show based on registration type and module access
  const visibleSteps = allSteps.filter(step => {
    // Explicitly hide social step if requested
    if (hideSocialStep && step.id === 'SOCIAL') {
      return false;
    }
    
    if (registrationType === 'business') {
      return step.id === 'BASIC' || step.id === 'BUSINESS';
    } else if (registrationType === 'professional') {
      return step.id === 'BASIC' || step.id === 'PROFESSIONAL';
    } else if (registrationType === 'social') {
      return step.id === 'BASIC' || step.id === 'SOCIAL';
    } else if (isNormalRegistration) {
      // Dynamic mode: show BASIC always, and selected modules
      if (step.id === 'BASIC') return true;
      return step.module && moduleAccess && moduleAccess.includes(step.module);
    } else {
      // 'all' - show all steps
      return true;
    }
  });

  const currentStepIndex = visibleSteps.findIndex((step) => step.id === currentStep);
  const effectiveCurrentIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="w-full mb-6">
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-4">
          {visibleSteps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < effectiveCurrentIndex;

            return (
              <React.Fragment key={step.id}>
                <div
                  className="flex flex-col items-center gap-2 cursor-pointer"
                  onClick={() => onStepClick(step.id)}
                >
                  <img 
                    src={isCompleted ? step.activeIcon : step.icon} 
                    alt={step.label} 
                    className={`w-10 h-10 transition-all ${
                      isCompleted || isActive ? "opacity-100" : "opacity-50"
                    }`}
                  />
                  <span
                    className={`text-base font-medium transition-colors text-center ${
                      isCompleted ? "text-orange-500" : "text-white"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          {visibleSteps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < effectiveCurrentIndex;

            return (
              <React.Fragment key={step.id}>
                <div 
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => onStepClick(step.id)}
                >
                  <div>
                    <img 
                      src={isCompleted ? step.activeIcon : step.icon} 
                      alt={step.label} 
                      className={`w-8 h-8 transition-all ${
                        isCompleted || isActive ? "opacity-100" : "opacity-50"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCompleted ? "text-orange-500" : "text-white"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mt-4">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 -translate-y-1/2" />
        {visibleSteps.length > 1 && (
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-[#D85D27] -translate-y-1/2 transition-all duration-300"
            style={{
              width: `${((visibleSteps.findIndex(step => step.id === currentStep) + 1) / visibleSteps.length) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RegistrationStepper;
