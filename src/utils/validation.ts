import type { BasicInfoData, BusinessData, ProfessionalData, SocialData, FormErrors } from "../types/registration.types";

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

export const validateBasicInfo = (data: BasicInfoData, isNormalRegistration: boolean = false, requireLocation: boolean = true, isSocialRegistration: boolean = false): FormErrors => {
  const errors: FormErrors = {};

  if (!data.fullName?.trim()) {
    errors.fullName = "Full name is required";
  } else {
    const name = data.fullName.trim();
    if (name.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
  }

  if (!data.phoneNumber?.trim()) {
    errors.phoneNumber = "Phone number is required";
  } else if (!validatePhone(data.phoneNumber)) {
    errors.phoneNumber = "Please enter a valid phone number (10-15 digits)";
  }

  if (!data.email?.trim()) {
    errors.email = "Email is required";
  } else if (!validateEmail(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.gender) {
    errors.gender = "Gender is required";
  }

  // Skip inducted by validation for social registration (field is hidden)
  if (!isSocialRegistration && (!data.inductedById?.trim() && !data.inductedByName?.trim())) {
    errors.inductedById = "Inducted by is required";
  }

  // DOB optional, but if provided, must not be in the future and must be at least 18 years ago
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    // Normalize to date-only by zeroing time for comparison
    const dobDate = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (dobDate > todayDate) {
      errors.dateOfBirth = "Date of birth cannot be in the future";
    } else {
      // Check if user is at least 18 years old
      const age18Date = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dobDate > age18Date) {
        errors.dateOfBirth = "You must be at least 18 years old to register";
      }
    }
  }

  // Street address optional
  if (data.streetAddress && !data.streetAddress.trim()) {
    errors.streetAddress = "Street address cannot be empty if provided";
  }

  if (requireLocation) {
    if (!String(data.countryId || "").trim()) {
      errors.country = "Country is required";
      errors.countryId = "Country is required";
    }

    if (!String(data.regionId || "").trim()) {
      errors.regionId = "Region is required";
    }

    if (!data.chapterRegistering || !data.chapterRegistering.trim()) {
      errors.chapterRegistering = "Please select a chapter";
    }
  }

  // When to join optional - only validate if provided
  if (data.whenToJoin && !data.whenToJoin.trim()) {
    errors.whenToJoin = "Please provide a valid date";
  }

  // Module access validation - only for normal registration
  if (isNormalRegistration) {
    if (!data.moduleAccess) {
      errors.moduleAccess = "Please select at least one network to continue";
    } else if (Array.isArray(data.moduleAccess) && data.moduleAccess.length === 0) {
      errors.moduleAccess = "Please select at least one network to continue";
    }
  }

  return errors;
};

export const validateBusiness = (data: BusinessData, basicInfo?: BasicInfoData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.businessName.trim()) {
    errors.businessName = "Business name is required";
  }

  if (!data.businessCategory) {
    errors.businessCategory = "Business category is required";
  } else if (data.businessCategory === "other") {
    if (!data.businessCategoryCustom || !data.businessCategoryCustom.trim()) {
      errors.businessCategoryCustom = "Please enter a custom business category";
    }
  }

  // Check sponsor information from basic info (inducted by fields)
  if (basicInfo) {
    if (!basicInfo.inductedById?.trim() && !basicInfo.inductedByName?.trim()) {
      errors.inductedById = "Inducted by is required";
    }
  }

  // Established year: optional, but if present, must be 4 digits and <= current year
  if (data.establishedYear && data.establishedYear.trim()) {
    const yStr = data.establishedYear.trim();
    const currentYear = new Date().getFullYear();
    if (!/^\d{4}$/.test(yStr)) {
      errors.establishedYear = "Established year must be 4 digits";
    } else {
      const yNum = Number(yStr);
      if (yNum > currentYear) {
        errors.establishedYear = "Established year cannot be in the future";
      }
    }
  }

  return errors;
};

export const validateProfessional = (data: ProfessionalData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.role?.trim()) {
    errors.role = "Role is required";
  }

  if (!data.professionalCategory) {
    errors.professionalCategory = "Professional category is required";
  } else if (data.professionalCategory === "other") {
    if (!data.professionalCategoryCustom || !data.professionalCategoryCustom.trim()) {
      errors.professionalCategoryCustom = "Please enter a custom professional category";
    }
  }

  if (!data.workPreference) {
    errors.workPreference = "Work preference is required";
  }

  return errors;
};

export const validateSocial = (data: SocialData, requireSocialChapter: boolean = false): FormErrors => {
  const errors: FormErrors = {};

  if (!data.socialCategory || (Array.isArray(data.socialCategory) && data.socialCategory.length === 0)) {
    errors.socialCategory = "Please select at least one social category";
  } else if (Array.isArray(data.socialCategory) && data.socialCategory.includes("other")) {
    if (!data.socialCategoryCustom || !data.socialCategoryCustom.trim()) {
      errors.socialCategoryCustom = "Please enter a custom social category";
    }
  }

  if (!data.hobbies || !data.hobbies.trim()) {
    errors.hobbies = "Hobbies are required";
  }

  if (!data.motivation || !data.motivation.trim()) {
    errors.motivation = "Motivation is required";
  }

  // travelForEvents is optional - no validation required

  // Social chapter validation - only when explicitly required
  if (requireSocialChapter) {
    if (!data.socialChapter || !data.socialChapter.trim()) {
      errors.socialChapter = "Please select a social chapter";
    }
  }

  return errors;
};
