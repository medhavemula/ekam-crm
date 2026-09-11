import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGetUserProfileWithActionsQuery, useUpdateUserProfileMutation } from "../services/memberApi";
import { useDirectUpdateEmailMutation } from "../services/memberApi";
import type { RegistrationStep } from "../components/registration/RegistrationStepper";
import type { BasicInfoData, BusinessData, ProfessionalData, FormErrors, ModuleType } from "../types/registration.types";
import { validateBasicInfo, validateBusiness, validateProfessional } from "../utils/validation";
import { useListCountriesQuery, useListRegionsQuery, useListSponsorsQuery, useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery } from "../services/publicApi";
import { transformApiCategories } from "../utils/businessCategories";
import { useToast } from "../components/toast/ToastProvider";

export function useEditMemberForm(memberId: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  // Determine route type based on pathname
  const isBusinessRoute = location.pathname.includes('/admin/regional-board/chapter/') && location.pathname.includes('/members');
  const isProfessionalsRoute = location.pathname.includes('/admin/professionals');
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("BASIC");
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Fetch member data
  const { data: memberRes, isLoading, error } = useGetUserProfileWithActionsQuery({ userId: memberId });
  
  // Determine if this is a pending member based on user data
  const isPendingMember = memberRes?.user?.isApproved === false || 
                          memberRes?.user?.status === 'pending';
  
  // Fetch countries, regions, sponsors, and categories for dropdown mapping
  const { data: countriesResp } = useListCountriesQuery({ limit: 250 });
  const { data: regionsResp } = useListRegionsQuery({ limit: 250 });
  const { data: sponsorsResp } = useListSponsorsQuery({ limit: 100 });
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 100 });
  
  // Transform professional categories from API data
  const professionalCategoryOptions = useMemo(() => 
    transformApiCategories(professionalCategoriesResponse?.data || []), 
    [professionalCategoriesResponse]
  );
  
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
    moduleAccess: [],
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

  const [updateUserProfile, { isLoading: isUpdating }] = useUpdateUserProfileMutation();
  const [directUpdateEmail] = useDirectUpdateEmailMutation();
  
  // Fetch business categories dynamically for proper mapping
  const { data: businessCategoriesResp } = useListBusinessCategoriesQuery({
    regionId: basicInfo.regionId || undefined,
    limit: 100
  });

  const hasPopulatedRef = useRef(false);
  useEffect(() => {
    if (hasPopulatedRef.current) return;
    if (memberRes?.user && countriesResp?.data && regionsResp?.data) {
      hasPopulatedRef.current = true;
      const raw = memberRes.user;
      
            
      // Handle country mapping
      const countryOptions = (countriesResp?.data || []).map((c: any) => ({
        value: c.id,
        label: c.name,
      }));
      
      const allRegions = (regionsResp?.data || []);
      const userRegion = allRegions.find((r: any) => r.id === raw.basicInfo?.region);
      
      let foundCountryId = "";
      let foundCountryName = "";
      
      if (userRegion?.countryId) {
        foundCountryId = userRegion.countryId;
        foundCountryName = countryOptions.find((c: any) => c.value === foundCountryId)?.label || "";
      } else {
        const apiCountryValue = raw.basicInfo?.country;
        
        if (apiCountryValue) {
          const isValidCountryId = countryOptions.some((c: any) => c.value === apiCountryValue);
          if (isValidCountryId) {
            foundCountryId = apiCountryValue;
            foundCountryName = countryOptions.find((c: any) => c.value === foundCountryId)?.label || "";
          } else {
            const countryMatch = countryOptions.find((c: any) => 
              c.label === apiCountryValue ||
              c.label.toLowerCase().trim() === apiCountryValue.toLowerCase().trim()
            );
            foundCountryId = countryMatch?.value || "";
            foundCountryName = countryMatch?.label || "";
          }
        }
      }
      
      // Handle region mapping
      const countryRegions = allRegions.filter((r: any) => r.countryId === foundCountryId);
      const regionOptions = countryRegions.map((r: any) => ({
        value: r.id,
        label: r.name,
      }));
      
      let foundRegionId = raw.basicInfo?.region || "";
      let foundRegionName = "";
      
      const isValidRegionId = regionOptions.some((r: any) => r.value === raw.basicInfo?.region);
      
      if (isValidRegionId) {
        foundRegionId = raw.basicInfo?.region || "";
        foundRegionName = regionOptions.find((r: any) => r.value === foundRegionId)?.label || "";
      } else {
        const regionMatch = regionOptions.find((r: any) => 
          r.label === raw.basicInfo?.region ||
          r.label.toLowerCase().trim() === (raw.basicInfo?.region || "").toLowerCase().trim() ||
          r.label.toLowerCase().includes((raw.basicInfo?.region || "").toLowerCase().trim()) ||
          (raw.basicInfo?.region || "").toLowerCase().trim().includes(r.label.toLowerCase())
        );
        foundRegionId = regionMatch?.value || "";
        foundRegionName = regionMatch?.label || "";
      }
      
      // Handle sponsor mapping
      const sponsorOptions = (sponsorsResp?.data || []).map((s: any) => ({
        value: s.id,
        label: s.name,
      }));
      
      const sponsorName = raw.business?.sponsorName || (raw.basicInfo as any)?.inductedByName || "";
      const sponsorId = raw.business?.sponsorId || (raw.basicInfo as any)?.inductedById || "";
      
      let foundSponsorId = "";
      let foundSponsorName = "";
      
      if (sponsorId) {
        foundSponsorId = sponsorId;
        foundSponsorName =
          sponsorOptions.find((s: any) => s.value === sponsorId)?.label || sponsorName || "";
      } else if (sponsorName) {
        const sponsorMatch = sponsorOptions.find((s: any) => 
          s.label === sponsorName ||
          s.label.toLowerCase().trim() === sponsorName.toLowerCase().trim() ||
          s.label.toLowerCase().includes(sponsorName.toLowerCase().trim()) ||
          sponsorName.toLowerCase().trim().includes(s.label.toLowerCase())
        );
        foundSponsorId = sponsorMatch?.value || "";
        foundSponsorName = sponsorMatch?.label || sponsorName;
      }
      
      if (sponsorName && sponsorName.toLowerCase() === "self") {
        foundSponsorId = "";
        foundSponsorName = "Self";
      }
      
      // Handle business category mapping
      const businessCategoryName = raw.business?.businessCategory || "";
      const businessCategoryCustom = (raw.business as any)?.businessCategoryCustom || "";
      
      const dynamicBusinessCategoryOptions = (businessCategoriesResp?.data || []).map((category: any) => ({
        value: category.value,
        label: category.label,
      }));
      
      const foundByValue = dynamicBusinessCategoryOptions.find((c: any) => c.value === businessCategoryName);
      const foundByLabel = dynamicBusinessCategoryOptions.find((c: any) => c.label === businessCategoryName);
      
      let foundBusinessCategoryId = "";
      let foundBusinessCategoryCustom = "";
      
      if (foundByValue || foundByLabel) {
        foundBusinessCategoryId = foundByValue?.value || foundByLabel?.value || "";
      } else if (businessCategoryName || businessCategoryCustom) {
        foundBusinessCategoryId = "other";
        foundBusinessCategoryCustom = businessCategoryName || businessCategoryCustom;
      }
      
      // Handle professional category mapping
      const professionalCategoryName = raw.professional?.professionalCategory || "";
      const professionalCategoryCustom = (raw.professional as any)?.professionalCategoryCustom || "";
      
      const foundProfByValue = professionalCategoryOptions.find((c: { value: string; label: string }) => c.value === professionalCategoryName);
      const foundProfByLabel = professionalCategoryOptions.find((c: { value: string; label: string }) => c.label === professionalCategoryName);
      
      let foundProfessionalCategoryId = "";
      let foundProfessionalCategoryCustom = "";
      
      if (foundProfByValue || foundProfByLabel) {
        foundProfessionalCategoryId = foundProfByValue?.value || foundProfByLabel?.value || "";
      } else if (professionalCategoryName || professionalCategoryCustom) {
        foundProfessionalCategoryId = "other";
        foundProfessionalCategoryCustom = professionalCategoryName || professionalCategoryCustom;
      }
      
      // Populate basic info
      setBasicInfo(prev => ({
        ...prev,
        fullName: raw.name || "",
        phoneNumber: raw.basicInfo?.phone || "",
        email: raw.email || "",
        gender: raw.basicInfo?.gender || "",
        dateOfBirth: raw.basicInfo?.dob 
          ? new Date(raw.basicInfo.dob).toISOString().split('T')[0] 
          : "",
        streetAddress: raw.basicInfo?.streetAddress || "",
        city: raw.basicInfo?.city || "",
        state: foundRegionName,
        pincode: raw.basicInfo?.pincode || "",
        country: foundCountryName,
        countryId: foundCountryId,
        regionId: foundRegionId,
        chapterRegistering: raw.basicInfo?.chapter || "",
        chapterName: raw.basicInfo?.chapterAnswer || "",
        expectation: raw.basicInfo?.expectationNote || "",
        whenToJoin: raw.basicInfo?.whenToJoin ? new Date(raw.basicInfo.whenToJoin).toISOString().split('T')[0] : "",
        inductedByName: foundSponsorName,
        inductedById: foundSponsorId,
        profilePhotoUrl: raw.basicInfo?.profilePhotoUrl || raw.profilePhotoUrl || "",
        moduleAccess: (() => {
          let modules: ModuleType[] = [];
          
          // For pending members, include modules that have PENDING status
          const isUserPending = raw.isApproved === false || raw.status === 'pending';
          
                    
          if (isUserPending && (raw as any).moduleRequestStatus) {
            modules = Object.entries((raw as any).moduleRequestStatus)
              .filter(([_, status]) => status === "PENDING")
              .map(([module]) => module as ModuleType);
          } else {
            // For approved members, use existing logic
            modules = (raw as any).moduleAccess ? Object.entries((raw as any).moduleAccess)
              .filter(([_, hasAccess]) => hasAccess)
              .map(([module]) => module as ModuleType) : [];
          }
          
          return modules;
        })(),
      }));

      // Populate business data
      if (raw.business) {
        setBusinessData(prev => ({
          ...prev,
          businessName: raw.business.businessName || "",
          businessCategory: foundBusinessCategoryId || raw.business.businessCategory || "",
          businessCategoryCustom: foundBusinessCategoryCustom || (raw.business as any).businessCategoryCustom || "",
          subCategory: raw.business.subCategory || "",
          sponsorName: foundSponsorName,
          sponsorId: foundSponsorId,
          establishedYear: raw.business.establishedYear ? String(raw.business.establishedYear) : "",
          headquartersLocation: raw.business.hqLocation || "",
          contactRole: raw.business.contactRole || "",
          companySize: raw.business.companySize || "",
          workPreference: raw.business.workPreference || "",
          gstNumber: raw.business.gstNumber || "",
          businessRegistrationNumber: raw.business.businessRegistrationNumber || "",
          panNumber: raw.business.panNumber || "",
          shortDescription: raw.business.shortDescription || "",
        }));
      }

      // Populate professional data
      if (raw.professional) {
        setProfessionalData(prev => ({
          ...prev,
          role: raw.professional.role || "",
          workPreference: raw.professional.workPreference || "",
          yearsOfExperience: (raw.professional as any).yearsOfExperience ? String((raw.professional as any).yearsOfExperience) : "",
          professionalCategory: foundProfessionalCategoryId || raw.professional.professionalCategory || "",
          professionalCategoryCustom: foundProfessionalCategoryCustom || (raw.professional as any).professionalCategoryCustom || "",
          skillsTechnologies: Array.isArray(raw.professional.skillsTechnologies) 
            ? raw.professional.skillsTechnologies.join(', ')
            : raw.professional.skillsTechnologies || "",
        }));
      }
    }
  }, [memberRes, countriesResp, regionsResp, sponsorsResp, businessCategoriesResp]);

  // Track which modules are selected from user data
  const selectedModules: ModuleType[] = Array.isArray(basicInfo.moduleAccess) 
    ? basicInfo.moduleAccess 
    : basicInfo.moduleAccess ? [basicInfo.moduleAccess] : [];
    
      
  // Location selection rules
  const hasBusiness = selectedModules.includes('business');
  const hasProfessional = selectedModules.includes('professional');
  const shouldAskNormalLocationInBusiness = hasBusiness;
  const shouldAskNormalLocationInProfessional = !hasBusiness && hasProfessional;
    
  // Define order of steps based on selected modules and route
  const stepOrder = useMemo(() => {
    const steps: RegistrationStep[] = ["BASIC"];
    
    if (isBusinessRoute) {
      steps.push("BUSINESS");
    } else if (isProfessionalsRoute) {
      steps.push("PROFESSIONAL");
    } else {
      const modulesToUse = selectedModules.length === 0 
        ? ['business', 'professional'] as ModuleType[]
        : selectedModules;
      
      if (modulesToUse.includes('business')) steps.push("BUSINESS");
      if (modulesToUse.includes('professional')) steps.push("PROFESSIONAL");
    }
    
    return steps;
  }, [selectedModules, isBusinessRoute, isProfessionalsRoute]);

  // Check if current step is the last step
  const isLastStep = currentStep === stepOrder[stepOrder.length - 1];

  const handleBasicInfoChange = (field: keyof BasicInfoData, value: string | File | ModuleType[] | null) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    if (field === 'countryId') {
      setBasicInfo((prev) => ({
        ...prev,
        regionId: "",
        state: "",
        city: "",
        pincode: "",
        chapterRegistering: "",
      }));
    } else if (field === 'regionId') {
      setBasicInfo((prev) => ({
        ...prev,
        chapterRegistering: "",
      }));
    }
    
    if (field === 'inductedByName' || field === 'inductedById') {
      setBusinessData((prev) => ({
        ...prev,
        sponsorName: field === 'inductedByName' ? (value as string) : prev.sponsorName,
        sponsorId: field === 'inductedById' ? (value as string) : prev.sponsorId,
      }));
    }
  };

  const handleEmailUpdateRequest = async (newEmail: string) => {
    if (!memberId) throw new Error("Missing user id");
    const resp = await directUpdateEmail({ userId: memberId, newEmail }).unwrap();
    if (resp && (resp as any).success === false) {
      throw new Error((resp as any).message || "Failed to update email");
    }
    showToast({
      title: "Email Updated",
      description: "Email updated successfully. A new password has been generated for the member.",
      kind: "success",
    });
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
    
    if (field === 'sponsorName' || field === 'sponsorId') {
      setBasicInfo((prev) => ({
        ...prev,
        inductedByName: field === 'sponsorName' ? value : prev.inductedByName,
        inductedById: field === 'sponsorId' ? value : prev.inductedById,
      }));
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

    const validateLocationFields = (): FormErrors => {
      const locErrors: FormErrors = {};
      if (!String(basicInfo.countryId || "").trim()) {
        locErrors.country = "Country is required";
        locErrors.countryId = "Country is required";
      }
      if (!String(basicInfo.regionId || "").trim()) {
        locErrors.regionId = "Region is required";
      }
      if (!basicInfo.chapterRegistering || !basicInfo.chapterRegistering.trim()) {
        locErrors.chapterRegistering = "Please select a chapter";
      }
      return locErrors;
    };

    switch (currentStep) {
      case "BASIC":
        stepErrors = validateBasicInfo(basicInfo, false, false);
        break;
      case "BUSINESS":
        stepErrors = validateBusiness(businessData, basicInfo);
        if (shouldAskNormalLocationInBusiness) {
          stepErrors = { ...stepErrors, ...validateLocationFields() };
        }
        break;
      case "PROFESSIONAL":
        stepErrors = validateProfessional(professionalData);
        if (shouldAskNormalLocationInProfessional) {
          stepErrors = { ...stepErrors, ...validateLocationFields() };
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

  const handleSubmit = async (isPendingMember: boolean) => {
    if (!validateCurrentStep()) {
      return;
    }

    if (!memberId) {
      showToast({
        title: "Error",
        description: "Member ID not found",
        kind: "error"
      });
      return;
    }

    try {
      // Build payloads matching backend schema
      const basicInfoPayload = {
        phone: basicInfo.phoneNumber || undefined,
        gender: basicInfo.gender,
        dob: basicInfo.dateOfBirth || undefined,
        streetAddress: basicInfo.streetAddress,
        city: basicInfo.city || undefined,
        state: basicInfo.regionId || undefined,
        pincode: basicInfo.pincode,
        country: basicInfo.country || undefined,
        region: basicInfo.regionId || undefined,
        profilePhotoUrl: basicInfo.profilePhotoUrl || undefined,
        expectationNote: basicInfo.expectation || undefined,
        whenToJoin: basicInfo.whenToJoin || undefined,
        chapter: basicInfo.chapterRegistering || undefined,
      };

      const businessPayload = {
        businessName: businessData.businessName,
        businessCategory: businessData.businessCategory === "other" 
          ? (businessData.businessCategoryCustom || "")
          : businessData.businessCategory,
        subCategory: businessData.subCategory || undefined,
        establishedYear: businessData.establishedYear ? Number(businessData.establishedYear) : undefined,
        hqLocation: businessData.headquartersLocation || undefined,
        contactRole: businessData.contactRole || undefined,
        companySize: businessData.companySize || undefined,
        workPreference: businessData.workPreference || undefined,
        gstNumber: businessData.gstNumber || undefined,
        businessRegistrationNumber: businessData.businessRegistrationNumber || undefined,
        panNumber: businessData.panNumber || undefined,
        shortDescription: businessData.shortDescription || undefined,
        sponsorName: businessData.sponsorName || undefined,
        sponsorId: businessData.sponsorId && businessData.sponsorId !== "" ? businessData.sponsorId : undefined,
      };

      const professionalPayload = {
        role: professionalData.role,
        yearsOfExperience: professionalData.yearsOfExperience ? Number(professionalData.yearsOfExperience) : undefined,
        professionalCategory: professionalData.professionalCategory === "other" 
          ? (professionalData.professionalCategoryCustom || "")
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
        workPreference: professionalData.workPreference,
      };

      const updatePayload: any = {};
      
      // Compare with original data and only include changed fields
      if (basicInfo.fullName !== memberRes?.user?.name) {
        updatePayload.name = basicInfo.fullName;
      }
      
      // Compare basicInfo fields
      const basicInfoChanges: any = {};
      const originalBasicInfo = (memberRes?.user?.basicInfo as any) || {};
      
      if (basicInfoPayload.phone !== originalBasicInfo.phone) {
        basicInfoChanges.phone = basicInfoPayload.phone;
      }
      if (basicInfoPayload.gender !== originalBasicInfo.gender) {
        basicInfoChanges.gender = basicInfoPayload.gender;
      }
      if (basicInfoPayload.dob !== originalBasicInfo.dob) {
        basicInfoChanges.dob = basicInfoPayload.dob;
      }
      if (basicInfoPayload.streetAddress !== originalBasicInfo.streetAddress) {
        basicInfoChanges.streetAddress = basicInfoPayload.streetAddress;
      }
      if (basicInfoPayload.city !== originalBasicInfo.city) {
        basicInfoChanges.city = basicInfoPayload.city;
      }
      if (basicInfoPayload.state !== originalBasicInfo.state) {
        basicInfoChanges.state = basicInfoPayload.state;
      }
      if (basicInfoPayload.pincode !== originalBasicInfo.pincode) {
        basicInfoChanges.pincode = basicInfoPayload.pincode;
      }
      if (basicInfoPayload.profilePhotoUrl !== originalBasicInfo.profilePhotoUrl) {
        basicInfoChanges.profilePhotoUrl = basicInfoPayload.profilePhotoUrl;
      }
      if (basicInfoPayload.expectationNote !== originalBasicInfo.expectationNote) {
        basicInfoChanges.expectationNote = basicInfoPayload.expectationNote;
      }
      if (basicInfoPayload.chapter !== originalBasicInfo.chapter) {
        basicInfoChanges.chapter = basicInfoPayload.chapter;
      }
      if (basicInfoPayload.country !== originalBasicInfo.country) {
        basicInfoChanges.country = basicInfoPayload.country;
      }
      if (basicInfoPayload.region !== originalBasicInfo.region) {
        basicInfoChanges.region = basicInfoPayload.region;
      }
      if (basicInfoPayload.whenToJoin !== originalBasicInfo.whenToJoin) {
        basicInfoChanges.whenToJoin = basicInfoPayload.whenToJoin;
      }
      
      if (Object.keys(basicInfoChanges).length > 0) {
        updatePayload.basicInfo = basicInfoChanges;
      }
      
      // Compare business fields
      const businessChanges: any = {};
      const originalBusiness = (memberRes?.user?.business as any) || {};
      
      if (businessPayload.businessName !== originalBusiness.businessName) {
        businessChanges.businessName = businessPayload.businessName;
      }
      if (businessPayload.businessCategory !== originalBusiness.businessCategory) {
        businessChanges.businessCategory = businessPayload.businessCategory;
      }
      if (businessPayload.subCategory !== originalBusiness.subCategory) {
        businessChanges.subCategory = businessPayload.subCategory;
      }
      if (businessPayload.establishedYear !== originalBusiness.establishedYear) {
        businessChanges.establishedYear = businessPayload.establishedYear;
      }
      if (businessPayload.hqLocation !== originalBusiness.hqLocation) {
        businessChanges.hqLocation = businessPayload.hqLocation;
      }
      if (businessPayload.contactRole !== originalBusiness.contactRole) {
        businessChanges.contactRole = businessPayload.contactRole;
      }
      if (businessPayload.companySize !== originalBusiness.companySize) {
        businessChanges.companySize = businessPayload.companySize;
      }
      if (businessPayload.workPreference !== originalBusiness.workPreference) {
        businessChanges.workPreference = businessPayload.workPreference;
      }
      if (businessPayload.gstNumber !== originalBusiness.gstNumber) {
        businessChanges.gstNumber = businessPayload.gstNumber;
      }
      if (businessPayload.businessRegistrationNumber !== originalBusiness.businessRegistrationNumber) {
        businessChanges.businessRegistrationNumber = businessPayload.businessRegistrationNumber;
      }
      if (businessPayload.panNumber !== originalBusiness.panNumber) {
        businessChanges.panNumber = businessPayload.panNumber;
      }
      if (businessPayload.shortDescription !== originalBusiness.shortDescription) {
        businessChanges.shortDescription = businessPayload.shortDescription;
      }
      if (businessPayload.sponsorName !== originalBusiness.sponsorName) {
        businessChanges.sponsorName = businessPayload.sponsorName;
      }
      if (businessPayload.sponsorId !== originalBusiness.sponsorId) {
        businessChanges.sponsorId = businessPayload.sponsorId;
      }
      
      if (Object.keys(businessChanges).length > 0) {
        updatePayload.business = businessChanges;
      }
      
      // Compare professional fields
      const professionalChanges: any = {};
      const originalProfessional = (memberRes?.user?.professional as any) || {};
      
      if (professionalPayload.role !== originalProfessional.role) {
        professionalChanges.role = professionalPayload.role;
      }
      if (professionalPayload.yearsOfExperience !== originalProfessional.yearsOfExperience) {
        professionalChanges.yearsOfExperience = professionalPayload.yearsOfExperience;
      }
      if (professionalPayload.professionalCategory !== originalProfessional.professionalCategory) {
        professionalChanges.professionalCategory = professionalPayload.professionalCategory;
      }
      if (JSON.stringify(professionalPayload.skillsTechnologies) !== JSON.stringify(originalProfessional.skillsTechnologies)) {
        professionalChanges.skillsTechnologies = professionalPayload.skillsTechnologies;
      }
      if (professionalPayload.workPreference !== originalProfessional.workPreference) {
        professionalChanges.workPreference = professionalPayload.workPreference;
      }
      
      if (Object.keys(professionalChanges).length > 0) {
        updatePayload.professional = professionalChanges;
      }
      
      // Always include moduleAccess to ensure API has complete permission data
      const currentModuleAccess = {
        business: selectedModules.includes('business'),
        professional: selectedModules.includes('professional')
      };
      updatePayload.moduleAccess = currentModuleAccess
      
      // Check if any fields have actually changed
      if (Object.keys(updatePayload).length === 0) {
        showToast({
          title: "No Changes",
          description: "No fields have been modified",
          kind: "info"
        });
        return;
      }

      const result = await updateUserProfile({ 
        userId: memberId || "", 
        data: updatePayload 
      }).unwrap();
      
      if (result.success) {
        showToast({
          title: "Success",
          description: isPendingMember ? "Pending member information updated successfully" : "Member information updated successfully",
          kind: "success"
        });
        
        // Navigate back to previous page after update and trigger refetch
        sessionStorage.setItem('refreshMemberData', 'true');
        navigate(-1);
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error: any) {
      console.error("Update failed:", error);
      const errorMessage = error?.data?.message || error?.message || "Failed to update member. Please try again.";
      showToast({
        title: "Error",
        description: errorMessage,
        kind: "error"
      });
    }
  };

  return {
    // State
    currentStep,
    setCurrentStep,
    errors,
    basicInfo,
    businessData,
    professionalData,
    isUpdating,
    isLoading,
    error,
    
    // Computed
    selectedModules,
    stepOrder,
    isLastStep,
    shouldAskNormalLocationInBusiness,
    shouldAskNormalLocationInProfessional,
    memberRes,
    isPendingMember,
    
    // Handlers
    handleBasicInfoChange,
    handleBusinessChange,
    handleProfessionalChange,
    handleEmailUpdateRequest,
    handleNext,
    handleBack,
    handleSubmit,
    validateCurrentStep,
  };
}
