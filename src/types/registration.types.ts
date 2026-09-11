export type ModuleType = 'business' | 'professional' | 'social';

export interface BasicInfoData {
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  profilePhoto: File | null;
  profilePhotoUrl?: string; // For existing profile photo URL
  profilePhotoError?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  countryId?: string;
  regionId?: string;
  inductedByName?: string;
  inductedById?: string;
  chapterRegistering: string;
  chapterName?: string;
  expectation: string;
  whenToJoin: string;
  moduleAccess?: ModuleType | ModuleType[];
  // WEB-AUTH-03: prospect states they already attended a chapter meeting as a guest.
  // visitorPhone is the number they visited under, which may differ from phoneNumber.
  attendedAsGuest?: boolean;
  visitorPhone?: string;
}

export interface BusinessData {
  businessName: string;
  businessCategory: string;
  businessCategoryCustom?: string;
  subCategory?: string;
  sponsorName: string;
  sponsorId?: string;
  establishedYear: string;
  headquartersLocation: string;
  contactRole: string;
  companySize: string;
  workPreference: string;
  gstNumber: string;
  businessRegistrationNumber: string;
  panNumber: string;
  shortDescription: string;
}

export interface ProfessionalData {
  name: string;
  role: string;
  workPreference: string;
  yearsOfExperience: string;
  professionalCategory: string;
  professionalCategoryCustom?: string;
  skillsTechnologies: string | string[];
}

export interface SocialData {
  name: string;
  socialCategory: string[];
  socialCategoryCustom?: string;
  hobbies: string;
  motivation: string;
  travelForEvents: string;
  socialChapter: string;
}

export interface RegistrationFormData {
  basicInfo: BasicInfoData;
  business: BusinessData;
  professional: ProfessionalData;
  social: SocialData;
}

export interface FormErrors {
  [key: string]: string;
}
