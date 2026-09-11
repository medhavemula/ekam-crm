export interface PersonalDetail {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  chapterName?: string;
  chapterRegion?: string;
  expiryDate?: string;
  daysLeft?: number;
  avatarUrl?: string;
}

export interface ProfessionalDetail {
  role?: string;
  yearsOfExperience?: number | string;
  professionalCategory?: string;
  skillsTechnologies?: string[] | string;
  workPreference?: string;
  companyName?: string;
  summary?: string;
  designation?: string;
  company?: string;
  industry?: string;
  expertise?: string[];
  experience?: string;
}

export interface BusinessDetail {
  companyName: string;
  companyType: string;
  companySize: string;
  established: string;
  services: string[];
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  shortDescription?: string;
  hqLocation?: string;
  subCategory?: string;
  businessCategory?: string;
  establishedYear?: number | string;
}
