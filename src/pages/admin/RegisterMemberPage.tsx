import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationStepper from "../../components/registration/RegistrationStepper";
import GradientContainer from "../../components/common/GradientContainer";
import type { RegistrationStep } from "../../components/registration/RegistrationStepper";
import BasicInfoStep from "../../components/registration/BasicInfoStep";
import BusinessStep from "../../components/registration/BusinessStep";
import ProfessionalStep from "../../components/registration/ProfessionalStep";
import LocationSelectionFields from "../../components/registration/LocationSelectionFields";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../components/toast/ToastProvider";
import type { BasicInfoData, BusinessData, ProfessionalData, FormErrors, ModuleType } from "../../types/registration.types";
import { validateBasicInfo, validateBusiness, validateProfessional } from "../../utils/validation";
import { useRegisterMemberDirectMutation } from "../../services/ed/edPTeamApi";
import { useUsersMeQuery } from "../../services/authApi";

export default function RegisterMemberPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("BASIC");
  const formRef = useRef<HTMLFormElement | null>(null);
  
  const [registerMember, { isLoading: isRegistering }] = useRegisterMemberDirectMutation();
  
  // Get current user data including assignments using /users/me endpoint
  const { data: currentUser } = useUsersMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  
  // Get the user's assignment and scope
  const userAssignment = currentUser?.data?.assignments?.[0];
  const userScope = userAssignment?.scope;
  
  // Automatically set country and region from user's scope when available
  useEffect(() => {
    if (userScope?.country && userScope?.region) {
      setBasicInfo(prev => ({
        ...prev,
        countryId: userScope.country,
        regionId: userScope.region
      }));
    }
  }, [userScope?.country, userScope?.region]);
  
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
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
    countryId: "",
    regionId: "",
    chapterRegistering: "",
    chapterName: "",
    expectation: "",
    whenToJoin: "",
    moduleAccess: [], // Initialize with empty array for normal registration
  });

  const [businessData, setBusinessData] = useState<BusinessData>({
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
  });

  const [professionalData, setProfessionalData] = useState<ProfessionalData>({
    name: "",
    role: "",
    workPreference: "",
    yearsOfExperience: "",
    professionalCategory: "",
    skillsTechnologies: "",
  });


  const [errors, setErrors] = useState<FormErrors>({});

  const selectedModules = Array.isArray(basicInfo.moduleAccess) ? basicInfo.moduleAccess : [];
  const hasBusiness = selectedModules.includes("business");
  const hasProfessional = selectedModules.includes("professional");

  // Location selection rules (ED registration):
  // - Normal (business/professional) chapter selection: show in BUSINESS if business selected, else in PROFESSIONAL.
  const shouldAskNormalLocationInBusiness = hasBusiness;
  const shouldAskNormalLocationInProfessional = !hasBusiness && hasProfessional;

  // Define the order of steps - dynamic based on module access (normal registration)
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

  // Check if current step is the last step - dynamic based on selected modules
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
    
    // Handle cascading dropdown logic
    if (field === 'countryId') {
      // Reset region and chapter when country changes
      setBasicInfo((prev) => ({
        ...prev,
        regionId: "",
        state: "",
        city: "",
        pincode: "",
        chapterRegistering: "",
      }));
    } else if (field === 'regionId') {
      // Reset chapter when region changes
      setBasicInfo((prev) => ({
        ...prev,
        chapterRegistering: "",
      }));
    }
  };

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


  const validateCurrentStep = (): boolean => {
    let stepErrors: FormErrors = {};

    switch (currentStep) {
      case "BASIC":
        // In ED registration, location is collected in a module step, not in BASIC.
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
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    // Additional validation for location
    // - If business or professional selected: normal chapter is required
    const requireNormalLocation = hasBusiness || hasProfessional;

    if (requireNormalLocation && (!basicInfo.countryId?.trim() || !basicInfo.regionId?.trim())) {
      showToast({
        title: "Error",
        description: "Please select country and region before registering.",
        kind: "error"
      });
      return;
    }

    if (requireNormalLocation && (!basicInfo.chapterRegistering || !basicInfo.chapterRegistering.trim())) {
      showToast({
        title: "Error",
        description: "Please select a chapter (business/professional) before registering.",
        kind: "error"
      });
      return;
    }


    try {
      // Build payloads matching backend schema - include all fields for admin registration
      const basicInfoPayload: Record<string, any> = {
        // Include all fields (not conditional) for admin registration
        streetAddress: basicInfo.streetAddress || "",
        pincode: basicInfo.pincode || "",
        gender: basicInfo.gender || "",
        whenToJoin: basicInfo.whenToJoin || "",
        chapter: basicInfo.chapterRegistering || "",
        chapterAnswer: basicInfo.chapterName || "",
        phone: basicInfo.phoneNumber || "",
        dob: basicInfo.dateOfBirth || "",
        city: basicInfo.city || "",
        state: basicInfo.state || "",
        country: basicInfo.countryId || "",
        region: basicInfo.regionId || "",
        expectationNote: basicInfo.expectation || "",
      };

      const businessPayload = {
        businessName: businessData.businessName || "",
        businessCategory:
          businessData.businessCategory === "other" && businessData.businessCategoryCustom
            ? businessData.businessCategoryCustom
            : businessData.businessCategory || "",
        sponsorName: basicInfo.inductedByName || businessData.sponsorName || "",
        sponsorId: basicInfo.inductedById || businessData.sponsorId || "",
        establishedYear: businessData.establishedYear ? Number(businessData.establishedYear) : undefined,
        hqLocation: businessData.headquartersLocation || "",
        contactRole: businessData.contactRole || "",
        companySize: businessData.companySize || "",
        workPreference: businessData.workPreference || "",
        gstNumber: businessData.gstNumber || "",
        businessRegistrationNumber: businessData.businessRegistrationNumber || "",
        panNumber: businessData.panNumber || "",
        shortDescription: businessData.shortDescription || "",
      } as Record<string, any>;

      const professionalPayload = {
        role: professionalData.role || "",
        workPreference: professionalData.workPreference || "",
        yearsOfExperience: professionalData.yearsOfExperience ? Number(professionalData.yearsOfExperience) : undefined,
        professionalCategory:
          professionalData.professionalCategory === "other" && professionalData.professionalCategoryCustom
            ? professionalData.professionalCategoryCustom
            : professionalData.professionalCategory || "",
        skillsTechnologies: (() => {
          const skills = professionalData.skillsTechnologies;
          if (Array.isArray(skills)) {
            return skills.length > 0 ? skills : [];
          } else if (typeof skills === "string" && skills.trim()) {
            const skillsArray = skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            return skillsArray.length > 0 ? skillsArray : [];
          }
          return [];
        })(),
      } as Record<string, any>;

      // Create moduleAccess object based on user's selection (same as user registration)
      const moduleAccess: Record<string, boolean> = {};
      if (basicInfo.moduleAccess) {
        if (Array.isArray(basicInfo.moduleAccess)) {
          basicInfo.moduleAccess.forEach(module => {
            moduleAccess[module] = true;
          });
        }
      }

      // Create payload with only selected modules (same as user registration)
      const createPayload = () => {
        const payload: any = {
          name: basicInfo.fullName,
          email: basicInfo.email,
          basicInfo: basicInfoPayload,
          moduleAccess: moduleAccess,
          termsAccepted: true, // Always true for admin registration
        };

        // Only include modules that were selected by the user
        if (moduleAccess.business) {
          payload.business = businessPayload;
        }
        if (moduleAccess.professional) {
          payload.professional = professionalPayload;
        }

        // Admin-specific fields
        payload.modules = selectedModules;
        payload.sponsorId = businessData.sponsorId || undefined;

        return payload;
      };

      // TEMP FIX: Always send JSON for now to test if data is received
      const payload = createPayload();
      const result = await registerMember(payload as any).unwrap();
      
      // TODO: Re-enable FormData handling once JSON works
      /*
      const result = await (basicInfo.profilePhoto ? 
        (async () => {
          console.log("📸 Using FormData due to profile photo");
          const form = new FormData();
          const payload = createPayload();
          
          // Append all fields to form data (same as user registration)
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
          
          if (basicInfo.profilePhoto) {
            form.append("profilePhoto", basicInfo.profilePhoto);
          }
          
          // Debug FormData contents
          console.log("📤 FormData contents:");
          for (let [key, value] of form.entries()) {
            console.log(`${key}:`, value);
          }
          
          return (registerMember as any)(form).unwrap();
        })()
      : 
        (() => {
          console.log("📄 Using JSON payload (no profile photo)");
          const payload = createPayload();
          console.log("📤 JSON payload being sent:", payload);
          return registerMember(payload as any).unwrap();
        })()
      );
      */
      
      if (result.success) {
        showToast({
          title: "Success",
          description: "Member registered successfully. Account is pending admin approval.",
          kind: "success"
        });
        
        // Navigate back to admin dashboard
        navigate("/admin/regional-board");
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Failed to register member. Please try again.";
      
      if (error?.data) {
        if (error.data.code === "CHAPTER_NOT_FOUND") {
          errorMessage = "The selected chapter does not exist. Please select a valid chapter and try again.";
        } else if (error.data.message) {
          errorMessage = error.data.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast({
        title: "Error",
        description: errorMessage,
        kind: "error"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName="" />
      
      <main className="container mx-auto px-4 py-6">
        <PageHeader 
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") }, 
            { label: "Register New Member" }
          ]} 
        />

        <div className="flex items-start justify-center p-4 md:p-6 py-8">
          <div className="w-full max-w-full shadow-2xl backdrop-blur">
            <GradientContainer>
              {/* Main Content */}
              <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-4 md:p-10 rounded-2xl min-h-[600px]">
                <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">
                  Register New Member
                </h1>

                {/* Registration Stepper */}
                <div className="mb-8">
                  <RegistrationStepper
                    currentStep={currentStep}
                    onStepClick={(step) => {
                      // Allow navigation based on step order
                      const currentIndex = stepOrder.indexOf(currentStep);
                      const targetIndex = stepOrder.indexOf(step);
                      if (targetIndex <= currentIndex) {
                        // Allow going back or to current step
                        setCurrentStep(step);
                        setErrors({});
                      }
                    }}
                    isNormalRegistration={true}
                    moduleAccess={Array.isArray(basicInfo.moduleAccess) ? basicInfo.moduleAccess : []}
                  />
                </div>

                {/* Form Content */}
                <form ref={formRef} className="space-y-6">
                  {currentStep === "BASIC" && (
                    <BasicInfoStep
                      data={basicInfo}
                      onChange={handleBasicInfoChange}
                      errors={errors}
                      registrationType="normal"
                      isNormalRegistration={true}
                      showLocationFields={false}
                      hideSocialOption={true}
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
                        onChange={handleBusinessChange}
                        errors={errors}
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
                        onChange={handleProfessionalChange}
                        errors={errors}
                        regionId={basicInfo.regionId}
                      />
                    </>
                  )}


                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-700">
                    {currentStep !== "BASIC" && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Back
                      </button>
                    )}
                    {currentStep === "BASIC" && <div />} {/* Spacer for alignment */}

                    {isLastStep ? (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isRegistering}
                        className="px-6 py-2 bg-[#D85D27] hover:bg-[#B84E21] disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {isRegistering ? "Registering..." : "Register Member"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 py-2 bg-[#D85D27] hover:bg-[#B84E21] text-white rounded-lg transition-colors"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </GradientContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
