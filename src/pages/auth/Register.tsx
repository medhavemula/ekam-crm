import { useState, useEffect, useRef, useMemo } from "react";
import type { FormEvent } from "react";
import { useRegisterMutation } from "../../services/authApi";
import RegistrationStepper from "../../components/registration/RegistrationStepper";
import GradientContainer from "../../components/common/GradientContainer";
import type { RegistrationStep } from "../../components/registration/RegistrationStepper";
import BasicInfoStep from "../../components/registration/BasicInfoStep";
import BusinessStep from "../../components/registration/BusinessStep";
import ProfessionalStep from "../../components/registration/ProfessionalStep";
import SocialStep from "../../components/registration/SocialStep";
import LocationSelectionFields from "../../components/registration/LocationSelectionFields";
import TermsAndConditionsModal from "../../components/modals/TermsAndConditionsModal";
import CheckedSvg from "../../assets/icons/checked.svg";
import UncheckedSvg from "../../assets/icons/unchecked.svg";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/toast/ToastProvider";
import type { BasicInfoData, BusinessData, ProfessionalData, SocialData, FormErrors, ModuleType } from "../../types/registration.types";
import { validateBasicInfo, validateBusiness, validateProfessional, validateSocial } from "../../utils/validation";

const initialBasicInfo: BasicInfoData = {
  fullName: "",
  phoneNumber: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  profilePhoto: null,
  streetAddress: "",
  city: "",
  state: "",
  pincode: "",
  country: "",
  chapterRegistering: "",
  chapterName: "",
  expectation: "",
  whenToJoin: "",
};

const initialBusinessData: BusinessData = {
  businessName: "",
  businessCategory: "",
  sponsorName: "",
  sponsorId: "",
  establishedYear: "",
  headquartersLocation: "",
  contactRole: "",
  companySize: "",
  workPreference: "",
  gstNumber: "",
  businessRegistrationNumber: "",
  panNumber: "",
  shortDescription: "",
};

const initialProfessionalData: ProfessionalData = {
  name: "",
  role: "",
  workPreference: "",
  yearsOfExperience: "",
  professionalCategory: "",
  skillsTechnologies: "",
};

const initialSocialData: SocialData = {
  name: "",
  socialCategory: [],
  hobbies: "",
  motivation: "",
  travelForEvents: "",
  socialChapter: "",
};

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("BASIC");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>(initialBasicInfo);
  const [businessData, setBusinessData] = useState<BusinessData>(initialBusinessData);
  const [professionalData, setProfessionalData] = useState<ProfessionalData>(initialProfessionalData);
  const [socialData, setSocialData] = useState<SocialData>(initialSocialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Define order of steps - dynamic based on module access
  const stepOrder = useMemo(() => {
    const steps: RegistrationStep[] = ["BASIC"];
    
    // Add steps based on module access selection
    if (basicInfo.moduleAccess) {
      if (Array.isArray(basicInfo.moduleAccess)) {
        if (basicInfo.moduleAccess.includes('business')) steps.push("BUSINESS");
        if (basicInfo.moduleAccess.includes('professional')) steps.push("PROFESSIONAL");
        if (basicInfo.moduleAccess.includes('social')) steps.push("SOCIAL");
      }
    }
    
    return steps;
  }, [basicInfo.moduleAccess]);

  const [register, { isLoading, isSuccess }] = useRegisterMutation();

  // After success, navigate to Verify OTP with email param
  useEffect(() => {
    if (isSuccess) {
      const email = (basicInfo.email || "").trim();
      const query = email ? `?email=${encodeURIComponent(email)}` : "";
      navigate(`/verify-otp${query}`);
    }
  }, [isSuccess, basicInfo.email, navigate]);

  // Handle current step validation when moduleAccess changes
  useEffect(() => {
    // If current step is no longer in stepOrder, go back to BASIC
    if (!stepOrder.includes(currentStep)) {
      setCurrentStep("BASIC");
      setErrors({});
    }
  }, [stepOrder, currentStep]);

  // Check if current step is last step - using dynamic step order
  const isLastStep = stepOrder.length > 0 && currentStep === stepOrder[stepOrder.length - 1];

  const handleBasicInfoChange = (field: keyof BasicInfoData, value: string | File | ModuleType[] | null) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Cascading location resets (location fields are collected in module steps)
    if (field === 'countryId') {
      setBasicInfo((prev) => ({
        ...prev,
        regionId: "",
        state: "",
        city: "",
        pincode: "",
        chapterRegistering: "",
        chapterName: "",
      }));
      setSocialData((prev) => ({ ...prev, socialChapter: "" }));
    }
    if (field === 'regionId') {
      setBasicInfo((prev) => ({
        ...prev,
        chapterRegistering: "",
        chapterName: "",
      }));
      setSocialData((prev) => ({ ...prev, socialChapter: "" }));
    }
  };

  const selectedModules: ModuleType[] = Array.isArray(basicInfo.moduleAccess)
    ? basicInfo.moduleAccess
    : basicInfo.moduleAccess
      ? [basicInfo.moduleAccess]
      : [];

  const hasBusiness = selectedModules.includes('business');
  const hasProfessional = selectedModules.includes('professional');
  const hasSocial = selectedModules.includes('social');
  const shouldAskNormalLocationInBusiness = hasBusiness;
  const shouldAskNormalLocationInProfessional = !hasBusiness && hasProfessional;
  const shouldAskSocialLocationInSocial = hasSocial;

  const handleBusinessChange = (field: keyof BusinessData, value: string) => {
    setBusinessData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProfessionalChange = (field: keyof ProfessionalData, value: string | string[]) => {
    setProfessionalData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSocialChange = (field: keyof SocialData, value: string | boolean | string[]) => {
    setSocialData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateCurrentStep = (): boolean => {
    let stepErrors: FormErrors = {};

    switch (currentStep) {
      case "BASIC":
        // Location is collected in a module step, not in BASIC.
        stepErrors = validateBasicInfo(basicInfo, true, false);
        break;
      case "BUSINESS":
        stepErrors = validateBusiness(businessData, basicInfo);
        if (shouldAskNormalLocationInBusiness) {
          if (!basicInfo.countryId?.trim()) stepErrors.countryId = "Country is required";
          if (!basicInfo.regionId?.trim()) stepErrors.regionId = "Region is required";
          if (!basicInfo.chapterRegistering?.trim()) stepErrors.chapterRegistering = "Please select a chapter";
        }
        break;
      case "PROFESSIONAL":
        stepErrors = validateProfessional(professionalData);
        if (shouldAskNormalLocationInProfessional) {
          if (!basicInfo.countryId?.trim()) stepErrors.countryId = "Country is required";
          if (!basicInfo.regionId?.trim()) stepErrors.regionId = "Region is required";
          if (!basicInfo.chapterRegistering?.trim()) stepErrors.chapterRegistering = "Please select a chapter";
        }
        break;
      case "SOCIAL":
        stepErrors = validateSocial(socialData, shouldAskSocialLocationInSocial);
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    // Validate current step first
    const isValid = validateCurrentStep();
    if (!isValid) {
      return; // Don't proceed - errors are already set by validateCurrentStep
    }
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
      // Clear errors only after successful validation and navigation
      setErrors({});
    }
  };

  const handleBack = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
      setErrors({});
    }
  };

  const handleStepClick = (targetStep: RegistrationStep) => {
    // Find the index of the target step in the step order
    const targetIndex = stepOrder.indexOf(targetStep);
    const currentIndex = stepOrder.indexOf(currentStep);
    
    // Only allow moving to the next step with validation
    if (targetIndex === currentIndex + 1) {
      // Validate current step before moving to next
      const isValid = validateCurrentStep();
      if (!isValid) {
        // Validation failed - don't navigate, errors are already set by validateCurrentStep
        return;
      }
      // Validation passed - move to next step
      setCurrentStep(targetStep);
      setErrors({}); // Clear errors when moving to next step
    } else if (targetIndex < currentIndex) {
      // Allow going back to previous steps without validation
      setCurrentStep(targetStep);
      setErrors({});
    }
    // If trying to jump ahead more than one step, do nothing
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    // Check if terms are accepted on final step
    if (isLastStep && !termsAccepted) {
      showToast({ 
        title: "Terms Required", 
        description: "Please accept the Terms and Conditions to continue.", 
        kind: "error" 
      });
      return;
    }
    try {
      // Build payloads matching backend schema - only include filled fields
      const basicInfoPayload: Record<string, any> = {};
      
      // Only add fields that have actual data
      if (basicInfo.streetAddress?.trim()) basicInfoPayload.streetAddress = basicInfo.streetAddress;
      if (basicInfo.pincode?.trim()) basicInfoPayload.pincode = basicInfo.pincode;
      if (basicInfo.gender?.trim()) basicInfoPayload.gender = basicInfo.gender;
      if (basicInfo.whenToJoin?.trim()) basicInfoPayload.whenToJoin = basicInfo.whenToJoin;
      if (basicInfo.chapterRegistering?.trim()) basicInfoPayload.chapter = basicInfo.chapterRegistering;
      if (basicInfo.chapterName?.trim()) basicInfoPayload.chapterAnswer = basicInfo.chapterName;
      if (basicInfo.phoneNumber?.trim()) basicInfoPayload.phone = basicInfo.phoneNumber;
      if (basicInfo.dateOfBirth?.trim()) basicInfoPayload.dob = basicInfo.dateOfBirth;
      if (basicInfo.city?.trim()) basicInfoPayload.city = basicInfo.city;
      if (basicInfo.state?.trim()) basicInfoPayload.state = basicInfo.state;
      if (basicInfo.countryId?.trim()) basicInfoPayload.country = basicInfo.countryId;
      if (basicInfo.regionId?.trim()) basicInfoPayload.region = basicInfo.regionId;
      if (basicInfo.expectation?.trim()) basicInfoPayload.expectationNote = basicInfo.expectation;
      // WEB-AUTH-03: only sent when answered, so skipping leaves registration unchanged.
      if (basicInfo.attendedAsGuest !== undefined) {
        basicInfoPayload.attendedAsGuest = basicInfo.attendedAsGuest;
        if (basicInfo.attendedAsGuest && basicInfo.visitorPhone?.trim()) {
          basicInfoPayload.visitorPhone = basicInfo.visitorPhone.trim();
        }
      }

      const businessPayload = {
        businessName: businessData.businessName,
        businessCategory:
          businessData.businessCategory === "other" && businessData.businessCategoryCustom
            ? businessData.businessCategoryCustom
            : businessData.businessCategory,
        sponsorName: basicInfo.inductedByName || businessData.sponsorName || undefined,
        sponsorId: basicInfo.inductedById || businessData.sponsorId || undefined,
        establishedYear: businessData.establishedYear ? Number(businessData.establishedYear) : undefined,
        hqLocation: businessData.headquartersLocation || undefined,
        contactRole: businessData.contactRole || undefined,
        companySize: businessData.companySize || undefined,
        workPreference: businessData.workPreference || undefined,
        gstNumber: businessData.gstNumber || undefined,
        businessRegistrationNumber: businessData.businessRegistrationNumber || undefined,
        panNumber: businessData.panNumber || undefined,
        shortDescription: businessData.shortDescription || undefined,
      } as Record<string, any>;

      const professionalPayload = {
        role: professionalData.role,
        workPreference: professionalData.workPreference,
        yearsOfExperience: professionalData.yearsOfExperience ? Number(professionalData.yearsOfExperience) : undefined,
        professionalCategory:
          professionalData.professionalCategory === "other" && professionalData.professionalCategoryCustom
            ? professionalData.professionalCategoryCustom
            : professionalData.professionalCategory,
        skillsTechnologies: (() => {
          const skills = professionalData.skillsTechnologies;
          if (Array.isArray(skills)) {
            return skills.length > 0 ? skills : undefined;
          } else if (typeof skills === "string" && skills.trim()) {
            const skillsArray = skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            return skillsArray.length > 0 ? skillsArray : undefined;
          }
          return undefined;
        })(),
      } as Record<string, any>;

      const socialPayload = {
        socialCategory: socialData.socialCategory || undefined,
        socialChapterId: socialData.socialChapter || undefined,
        hobbies: socialData.hobbies || undefined,
        motivation: socialData.motivation || undefined,
        travelForEvents: socialData.travelForEvents || undefined,
      } as Record<string, unknown>;

      // Create moduleAccess object based on user's selection
      const moduleAccess: Record<string, boolean> = {};
      if (basicInfo.moduleAccess) {
        if (Array.isArray(basicInfo.moduleAccess)) {
          basicInfo.moduleAccess.forEach(module => {
            moduleAccess[module] = true;
          });
        }
      }

      // Create payload with only selected modules
      const createPayload = () => {
        const payload: any = {
          name: basicInfo.fullName,
          email: basicInfo.email,
          basicInfo: basicInfoPayload,
          moduleAccess: moduleAccess,
          termsAccepted: termsAccepted,
        };

        // Only include modules that were selected by the user
        if (moduleAccess.business) {
          payload.business = businessPayload;
        }
        if (moduleAccess.professional) {
          payload.professional = professionalPayload;
        }
        if (moduleAccess.social) {
          payload.social = socialPayload;
        }

        return payload;
      };

      if (basicInfo.profilePhoto) {
        const form = new FormData();
        const payload = createPayload();
        
        // Append all fields to form data
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'termsAccepted') {
            // Send boolean as string 'true' or 'false'
            form.append(key, value ? 'true' : 'false');
          } else if (value && typeof value === 'object' && !(value instanceof File)) {
            form.append(key, JSON.stringify(value));
          } else if (value !== undefined && value !== null) {
            form.append(key, value.toString());
          }
        });
        
        form.append("profilePhoto", basicInfo.profilePhoto);
        await (register as any)(form).unwrap();
      } else {
        const payload = createPayload();
        await register(payload as any).unwrap();
      }
      showToast({ 
        title: "Registration successful", 
        description: "Check your email for the verification code.", 
        kind: "success" 
      });
    } catch (err: any) {
      console.error("Registration failed:", err);
      
      // Show the exact API error message
      const errorMessage = err?.data?.message || err?.message || "Registration failed. Please try again.";
      const errorCode = err?.data?.code || "REGISTRATION_ERROR";
      
      // Handle EMAIL_NOT_VERIFIED error - navigate to OTP page
      if (errorCode === "EMAIL_NOT_VERIFIED") {
        showToast({ 
          title: "Registration Failed", 
          description: errorMessage,
          kind: "error" 
        });
        
        // Navigate to OTP verification page with email
        const email = basicInfo.email || "";
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      
      showToast({ 
        title: "Registration Failed", 
        description: errorMessage,
        kind: "error" 
      });
    }
  };

  
  // Inline error cards removed; errors are surfaced via toasts in submit handlers
  // Do not render inline success screen; OTP page handles post-register flow

  return (
    <div
      className="min-h-screen flex items-start justify-center p-4 md:p-6 py-8"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage: `linear-gradient(rgba(11,18,32,0.9), rgba(11,18,32,0.9)), url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-7xl shadow-2xl backdrop-blur">
        <GradientContainer>
          {/* Header with Logo */}
          <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
            <img
              src={`${import.meta.env.BASE_URL}ekam-logo2.png`}
              alt="Ekam Logo"
              className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
              style={{ display: "block", marginBottom: "-10px" }}
            />
          </div>

          {/* Main Content */}
          <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-4 md:p-10 rounded-2xl min-h-[600px]">
            <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">Ekam Global Network registration</h1>

            {/* Stepper */}
            <RegistrationStepper 
              currentStep={currentStep} 
              onStepClick={handleStepClick}
              registrationType="all"
              moduleAccess={basicInfo.moduleAccess as ModuleType[]}
              isNormalRegistration={true}
            />

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="mt-6 md:mt-8">
              {currentStep === "BASIC" && (
                <BasicInfoStep 
                  data={basicInfo} 
                  errors={errors} 
                  onChange={handleBasicInfoChange} 
                  isNormalRegistration={true}
                  registrationType="normal"
                  showLocationFields={false}
                />
              )}

              {currentStep === "BUSINESS" && (
                <>
                  {shouldAskNormalLocationInBusiness && (
                    <LocationSelectionFields
                      data={basicInfo}
                      errors={errors}
                      onChange={(field, value) => handleBasicInfoChange(field, value)}
                      chapterValue={basicInfo.chapterRegistering}
                      onChapterChange={(id, name) => {
                        handleBasicInfoChange("chapterRegistering", id);
                        handleBasicInfoChange("chapterName", name);
                      }}
                      useSocialChapters={false}
                    />
                  )}
                  <BusinessStep 
                    data={businessData} 
                    errors={errors} 
                    onChange={handleBusinessChange}
                    regionId={basicInfo.regionId}
                  />
                </>
              )}

              {currentStep === "PROFESSIONAL" && (
                <>
                  {shouldAskNormalLocationInProfessional && (
                    <LocationSelectionFields
                      data={basicInfo}
                      errors={errors}
                      onChange={(field, value) => handleBasicInfoChange(field, value)}
                      chapterValue={basicInfo.chapterRegistering}
                      onChapterChange={(id, name) => {
                        handleBasicInfoChange("chapterRegistering", id);
                        handleBasicInfoChange("chapterName", name);
                      }}
                      useSocialChapters={false}
                    />
                  )}
                  <ProfessionalStep 
                    data={professionalData} 
                    errors={errors} 
                    onChange={handleProfessionalChange}
                    regionId={basicInfo.regionId}
                  />
                </>
              )}

              {currentStep === "SOCIAL" && (
                <>
                  {shouldAskSocialLocationInSocial && (
                    <LocationSelectionFields
                      data={basicInfo}
                      errors={errors}
                      onChange={(field, value) => handleBasicInfoChange(field, value)}
                      chapterValue={socialData.socialChapter}
                      onChapterChange={(id, _name) => {
                        handleSocialChange("socialChapter", id);
                      }}
                      useSocialChapters={true}
                    />
                  )}
                  <SocialStep 
                    data={socialData} 
                    errors={errors} 
                    onChange={handleSocialChange}
                    registrationType="normal"
                    moduleAccess={selectedModules}
                    regionId={basicInfo.regionId}
                    hideSocialChapter={shouldAskSocialLocationInSocial}
                  />
                </>
              )}

              {/* Terms and Conditions Checkbox - Only show on last step */}
              {isLastStep && (
                <div className="mt-6">
                  <div 
                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors p-2 rounded-lg"
                    onClick={() => {
                      if (termsAccepted) {
                        // If already checked, uncheck it
                        setTermsAccepted(false);
                      } else {
                        // If not checked, open modal
                        setShowTermsModal(true);
                      }
                    }}
                  >
                    {/* Custom checkbox using SVG icons */}
                    <img
                      src={termsAccepted ? CheckedSvg : UncheckedSvg}
                      alt={termsAccepted ? "Selected" : "Not selected"}
                      className="w-5 h-5 mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTermsModal(true);
                          }}
                          className="text-[#D85D27] hover:text-[#C24F20] underline font-medium"
                        >
                          Terms and Conditions
                        </button>
                        {" "}of Ekam Global Network
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className={`flex flex-col sm:flex-row ${currentStep === "BASIC" ? "justify-end" : "justify-between"} gap-3 mt-6 md:mt-8`}>
                {currentStep !== "BASIC" && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors order-2 sm:order-1"
                  >
                    Back
                  </button>
                )}
                <button
                  type={isLastStep ? "submit" : "button"}
                  onClick={isLastStep ? undefined : handleNext}
                  disabled={isLoading || (isLastStep && !termsAccepted)}
                  className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  {isLastStep ? (isLoading ? "Submitting..." : "Submit") : "Next"}
                </button>
              </div>
            </form>
          </div>
        </GradientContainer>
      </div>
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTermsModal(false);
        }}
      />
    </div>
  );
}
