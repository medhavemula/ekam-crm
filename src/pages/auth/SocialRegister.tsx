import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useRegisterMutation } from "../../services/authApi";
import RegistrationStepper from "../../components/registration/RegistrationStepper";
import GradientContainer from "../../components/common/GradientContainer";
import type { RegistrationStep } from "../../components/registration/RegistrationStepper";
import BasicInfoStep from "../../components/registration/BasicInfoStep";
import SocialStep from "../../components/registration/SocialStep";
import TermsAndConditionsModal from "../../components/modals/TermsAndConditionsModal";
import CheckedSvg from "../../assets/icons/checked.svg";
import UncheckedSvg from "../../assets/icons/unchecked.svg";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/toast/ToastProvider";
import type { BasicInfoData, SocialData, FormErrors, ModuleType } from "../../types/registration.types";
import { validateBasicInfo, validateSocial } from "../../utils/validation";

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
  moduleAccess: ["social"], // Pre-select social module
};

const initialSocialData: SocialData = {
  name: "",
  socialCategory: [],
  hobbies: "",
  motivation: "",
  travelForEvents: "",
  socialChapter: "",
};

export default function SocialRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("BASIC");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>(initialBasicInfo);
  const [socialData, setSocialData] = useState<SocialData>(initialSocialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Fixed step order for social registration
  const stepOrder: RegistrationStep[] = ["BASIC", "SOCIAL"];
  const isLastStep = currentStep === stepOrder[stepOrder.length - 1];

  const [register, { isLoading, isSuccess }] = useRegisterMutation();

  useEffect(() => {
    if (isSuccess) {
      const email = (basicInfo.email || "").trim();
      const query = email ? `?email=${encodeURIComponent(email)}&type=social` : "?type=social";
      navigate(`/verify-otp${query}`);
    }
  }, [isSuccess, basicInfo.email, navigate]);

  const handleBasicInfoChange = (field: keyof BasicInfoData, value: string | File | ModuleType[] | null) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
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
        stepErrors = validateBasicInfo(basicInfo, false, false, true);
        break;
      case "SOCIAL":
        // In standalone social registration, social chapter comes from basic info, so do not require it here
        stepErrors = validateSocial(socialData, false);
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    const isValid = validateCurrentStep();
    if (!isValid) {
      return;
    }
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
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
    const targetIndex = stepOrder.indexOf(targetStep);
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (targetIndex === currentIndex + 1) {
      const isValid = validateCurrentStep();
      if (!isValid) {
        return;
      }
      setCurrentStep(targetStep);
      setErrors({});
    } else if (targetIndex < currentIndex) {
      setCurrentStep(targetStep);
      setErrors({});
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    if (isLastStep && !termsAccepted) {
      showToast({ 
        title: "Terms Required", 
        description: "Please accept the Terms and Conditions to continue.", 
        kind: "error" 
      });
      return;
    }

    try {
      const basicInfoPayload: Record<string, any> = {};
      
      if (basicInfo.streetAddress?.trim()) basicInfoPayload.streetAddress = basicInfo.streetAddress;
      if (basicInfo.pincode?.trim()) basicInfoPayload.pincode = basicInfo.pincode;
      if (basicInfo.gender?.trim()) basicInfoPayload.gender = basicInfo.gender;
      if (basicInfo.whenToJoin?.trim()) basicInfoPayload.whenToJoin = basicInfo.whenToJoin;
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

      const socialPayload = {
        socialCategory: socialData.socialCategory?.map(cat => 
          cat === "other" ? (socialData.socialCategoryCustom || "Other") : cat
        ) || undefined,
        socialChapterId: basicInfo.chapterRegistering || undefined, // Use chapter from basic info
        hobbies: socialData.hobbies || undefined,
        motivation: socialData.motivation || undefined,
        travelForEvents: socialData.travelForEvents || undefined,
      } as Record<string, unknown>;

      const moduleAccess: Record<string, boolean> = {
        social: true
      };

      const payload = {
        name: basicInfo.fullName,
        email: basicInfo.email,
        basicInfo: basicInfoPayload,
        moduleAccess: moduleAccess,
        termsAccepted: termsAccepted,
        business: {
          businessName: "",
          businessCategory: ""
        },
        professional: {
          role: "",
          professionalCategory: "",
          workPreference: ""
        },
        social: socialPayload
      };

      if (basicInfo.profilePhoto) {
        const form = new FormData();
        
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'termsAccepted') {
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
        await register(payload as any).unwrap();
      }

      showToast({ 
        title: "Registration successful", 
        description: "Check your email for the verification code.", 
        kind: "success" 
      });
    } catch (err: any) {
      console.error("Registration failed:", err);
      
      const errorMessage = err?.data?.message || err?.message || "Registration failed. Please try again.";
      const errorCode = err?.data?.code || "REGISTRATION_ERROR";
      
      if (errorCode === "EMAIL_NOT_VERIFIED") {
        showToast({ 
          title: "Registration Failed", 
          description: errorMessage,
          kind: "error" 
        });
        
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

  return (
    <div
      className="min-h-screen flex items-start justify-center p-4 md:p-6 py-8"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage: "linear-gradient(rgba(11,18,32,0.9), rgba(11,18,32,0.9)), url('/auth-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-7xl shadow-2xl backdrop-blur">
        <GradientContainer>
          <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
            <img
              src="/ekam-logo2.png"
              alt="Ekam Logo"
              className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
              style={{ display: "block", marginBottom: "-10px" }}
            />
          </div>

          <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-4 md:p-10 rounded-2xl min-h-[600px]">
            <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">Social Registration - Ekam Global Network</h1>

            <RegistrationStepper 
              currentStep={currentStep} 
              onStepClick={handleStepClick}
              registrationType="social"
            />

            <form ref={formRef} onSubmit={handleSubmit} className="mt-6 md:mt-8">
              {currentStep === "BASIC" && (
                <BasicInfoStep 
                  data={basicInfo} 
                  errors={errors} 
                  onChange={handleBasicInfoChange} 
                  registrationType="social"
                />
              )}

              {currentStep === "SOCIAL" && (
                <SocialStep 
                  data={socialData} 
                  errors={errors} 
                  onChange={handleSocialChange}
                  regionId={basicInfo.regionId}
                  registrationType="social"
                />
              )}

              {isLastStep && (
                <div className="mt-6">
                  <div 
                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors p-2 rounded-lg"
                    onClick={() => {
                      if (termsAccepted) {
                        setTermsAccepted(false);
                      } else {
                        setShowTermsModal(true);
                      }
                    }}
                  >
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
