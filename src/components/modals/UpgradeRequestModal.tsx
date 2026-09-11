import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../toast/ToastProvider";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import FormTextarea from "../forms/FormTextarea";
import GradientContainer from "../common/GradientContainer";
import { 
  useListBusinessCategoriesQuery, 
  useListProfessionalCategoriesQuery, 
  useListSocialCategoriesQuery,
  useListCountriesQuery,
  useListRegionsQuery,
  useListSocialChaptersQuery 
} from "../../services/publicApi";
import { useGetModuleAccessStatusQuery, useRequestModuleAccessMutation } from "../../services/moduleAccessApi";
import { transformApiCategories } from "../../utils/businessCategories";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  moduleKey: "business" | "professional" | "social";
  onSubmit?: (module: string, reason: string) => Promise<void>;
};

const moduleNames: Record<string, string> = {
  business: "Business",
  professional: "Professional", 
  social: "Social"
};

const travelOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
];

const workPreferenceOptions = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-Site", value: "onsite" },
  { label: "Contract", value: "contract" },
  { label: "Freelance", value: "freelance" },
  { label: "Temporary", value: "temporary" },
  { label: "Seasonal", value: "seasonal" },
  { label: "Consulting", value: "consulting" },
];

const companySizeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501+", label: "501+ employees" },
];

export default function UpgradeRequestModal({ isOpen, onClose, moduleKey, onSubmit }: Props) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch module access status
  const { data: moduleAccessData, isLoading: isLoadingStatus } = useGetModuleAccessStatusQuery();
  
  // Request module access mutation
  const [requestModuleAccess] = useRequestModuleAccessMutation();
  
  // Get current module status
  const currentModuleAccess = moduleAccessData?.data?.moduleAccess?.[moduleKey];
  const currentModuleStatus = moduleAccessData?.data?.moduleRequestStatus?.[moduleKey];
  
  // Determine UI state based on status
  const hasAccess = currentModuleAccess === true;
  const isPending = currentModuleStatus === "PENDING";
  const isApproved = currentModuleStatus === "APPROVED";
  const isRejected = currentModuleStatus === "REJECTED";
  
  // Don't open modal if request is pending
  if (isPending && isOpen) {
    onClose();
    return null;
  }
  
  // State for form data
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessCategory: "",
    businessCategoryCustom: "",
    establishedYear: "",
    headquartersLocation: "",
    companySize: "",
    gstNumber: "",
    businessRegistrationNumber: "",
    panNumber: "",
    shortDescription: "",
    country: "",
    region: "",
    chapter: ""
  });
  
  // Fetch categories from APIs
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ limit: 100 });
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 100 });
  const { data: socialCategoriesResponse } = useListSocialCategoriesQuery({ limit: 100 });
  
  // Fetch countries and regions
  const { data: countriesResponse } = useListCountriesQuery({});
  const { data: regionsResponse } = useListRegionsQuery(
    { countryId: businessData.country },
    { skip: !businessData.country }
  );
  const { data: chaptersResponse } = useListSocialChaptersQuery(
    { regionId: businessData.region },
    { skip: !businessData.region }
  );
  
  // Transform API data to options
  const countryOptions = useMemo(() => 
    (countriesResponse?.data || []).map((country: any) => ({
      value: country.id,
      label: country.name
    })),
    [countriesResponse]
  );
  
  const regionOptions = useMemo(() => 
    (regionsResponse?.data || []).map((region: any) => ({
      value: region.id,
      label: region.name
    })),
    [regionsResponse]
  );
  
  const chapterOptions = useMemo(() => 
    (chaptersResponse?.data || []).map((chapter: any) => ({
      value: chapter.id,
      label: chapter.name
    })),
    [chaptersResponse]
  );
  
  
  // Transform API data to options
  const businessCategoryOptions = useMemo(() => 
    transformApiCategories(businessCategoriesResponse?.data || []), 
    [businessCategoriesResponse]
  );
  const professionalCategoryOptions = useMemo(() => 
    transformApiCategories(professionalCategoriesResponse?.data || []), 
    [professionalCategoriesResponse]
  );
  const socialCategoryOptions = useMemo(() => 
    transformApiCategories(socialCategoriesResponse?.data || []), 
    [socialCategoriesResponse]
  );
  
  // Business state is now defined at the top of the component
  
  // Professional state
  const [professionalData, setProfessionalData] = useState({
    role: "",
    workPreference: "",
    yearsOfExperience: "",
    professionalCategory: "",
    professionalCategoryCustom: "",
    skillsTechnologies: "",
  });
  
  // Social state
  const [socialData, setSocialData] = useState({
    socialCategory: [] as string[],
    socialCategoryCustom: "",
    socialChapter: "",
    motivation: "",
    willingToTravel: "",
    travelNotes: "",
    country: "",
    region: "",
    chapter: "",
    hobbies: ""
  });
  
  // Social region and chapter queries
  const socialRegionResponse = useListRegionsQuery(
    { countryId: socialData.country },
    { skip: !socialData.country }
  );

  const socialChapterResponse = useListSocialChaptersQuery(
    { regionId: socialData.region },
    { skip: !socialData.region }
  );

  // Transform social regions and chapters
  const socialRegionOptions = useMemo(() => 
    (socialRegionResponse.data?.data || []).map((region: any) => ({
      value: region.id,
      label: region.name
    })),
    [socialRegionResponse.data]
  );

  const socialChapterOptions = useMemo(() => 
    ((socialChapterResponse.data?.data || []) as any[]).map((chapter) => ({
      value: chapter.id,
      label: chapter.name
    })),
    [socialChapterResponse.data]
  );

  // Social chapters data is available in socialChapterResponse

  // Error state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let moduleData;
      
      if (moduleKey === 'business') {
        // Validate required fields for business
        if (!businessData.businessName.trim() || 
            !businessData.businessCategory ||
            (businessData.businessCategory === 'other' && !businessData.businessCategoryCustom.trim()) ||
            !businessData.establishedYear ||
            !businessData.headquartersLocation ||
            !businessData.companySize ||
            !businessData.gstNumber ||
            !businessData.businessRegistrationNumber ||
            !businessData.panNumber ||
            !businessData.shortDescription.trim() ||
            !businessData.country ||
            !businessData.region ||
            !businessData.chapter) {
          showToast({ title: 'Please fill in all required fields', kind: 'error' });
          setIsSubmitting(false);
          return;
        }

        moduleData = {
          ...businessData,
          // Ensure we only submit custom category if 'other' is selected
          businessCategory: businessData.businessCategory === 'other' 
            ? businessData.businessCategoryCustom 
            : businessData.businessCategory
        };
      } else if (moduleKey === 'professional') {
        // Validate required fields for professional
        if (!professionalData.role.trim() ||
            !professionalData.workPreference ||
            !professionalData.yearsOfExperience ||
            !professionalData.professionalCategory ||
            (professionalData.professionalCategory === 'other' && !professionalData.professionalCategoryCustom.trim()) ||
            !professionalData.skillsTechnologies.trim()) {
          showToast({ title: 'Please fill in all required fields', kind: 'error' });
          setIsSubmitting(false);
          return;
        }

        moduleData = {
          ...professionalData,
          // Ensure we only submit custom category if 'other' is selected
          professionalCategory: professionalData.professionalCategory === 'other'
            ? professionalData.professionalCategoryCustom
            : professionalData.professionalCategory
        };
      } else if (moduleKey === 'social') {
        // Validate required fields for social
        const newErrors: Record<string, string> = {};
        
        if (socialData.socialCategory.length === 0) {
          newErrors.socialCategory = 'Please select at least one category';
        } else if (socialData.socialCategory.includes('other') && !socialData.socialCategoryCustom.trim()) {
          newErrors.socialCategoryCustom = 'Please specify the category';
        }
        
        if (!socialData.country) newErrors.country = 'Country is required';
        if (!socialData.region) newErrors.region = 'Region is required';
        if (!socialData.chapter) newErrors.chapter = 'Chapter is required';
        if (!socialData.motivation.trim()) newErrors.motivation = 'Motivation is required';
        if (!socialData.willingToTravel) newErrors.willingToTravel = 'Please select travel preference';
        if (!socialData.hobbies.trim()) newErrors.hobbies = 'Hobbies are required';
        
        if (socialData.willingToTravel === 'yes' && !socialData.travelNotes.trim()) {
          newErrors.travelNotes = 'Please provide travel notes';
        }
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          showToast({ title: 'Please fill in all required fields', kind: 'error' });
          setIsSubmitting(false);
          return;
        }

        moduleData = {
          ...socialData,
          // For social, we might have multiple categories
          categories: socialData.socialCategory.map(cat => ({
            id: cat,
            name: socialCategoryOptions.find(opt => opt.value === cat)?.label || cat
          })),
          // Include custom category if 'other' is selected
          ...(socialData.socialCategory.map(cat => cat.toLowerCase()).includes('other') && { socialCategoryCustom: socialData.socialCategoryCustom })
        };
      }
      
      await requestModuleAccess({
        moduleType: moduleKey,
        moduleData
      }).unwrap();
      
      // Call onSubmit prop if provided
      if (onSubmit) {
        await onSubmit(moduleKey, JSON.stringify(moduleData));
      }
      
      showToast({ title: 'Request submitted successfully', kind: 'success' });
      onClose();
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      showToast({ title: 'Failed to submit upgrade request', description: 'Please try again.', kind: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setBusinessData({
        businessName: "",
        businessCategory: "",
        businessCategoryCustom: "",
        establishedYear: "",
        headquartersLocation: "",
        companySize: "",
        gstNumber: "",
        businessRegistrationNumber: "",
        panNumber: "",
        shortDescription: "",
        country: "",
        region: "",
        chapter: ""
      });
      setProfessionalData({
        role: "",
        workPreference: "",
        yearsOfExperience: "",
        professionalCategory: "",
        professionalCategoryCustom: "",
        skillsTechnologies: "",
      });
      setSocialData({
        socialCategory: [],
        socialCategoryCustom: "",
        socialChapter: "",
        motivation: "",
        willingToTravel: "",
        travelNotes: "",
        country: "",
        region: "",
        chapter: "",
        hobbies: ""
      });
    }
  };
  
  const handleBusinessChange = (field: string, value: string) => {
    setBusinessData(prev => {
      // If country changes, reset region and chapter
      const updates: any = { [field]: value };
      if (field === 'country') {
        updates.region = '';
        updates.chapter = '';
      }
      // If region changes, reset chapter
      if (field === 'region') {
        updates.chapter = '';
      }
      // Clear custom category if not 'other'
      if (field === 'businessCategory' && value !== 'other') {
        updates.businessCategoryCustom = '';
      }
      return { ...prev, ...updates };
    });
  };

  const handleProfessionalChange = (field: string, value: string) => {
    setProfessionalData(prev => ({
      ...prev,
      [field]: value,
      // Clear custom category if not "other"
      ...(field === 'professionalCategory' && value !== 'other' ? { professionalCategoryCustom: '' } : {})
    }));
  };

  const handleSocialChange = (field: string, value: string | string[]) => {
    setSocialData(prev => {
      const updates: any = { [field]: value };
      
      // Handle field dependencies
      if (field === 'country') {
        updates.region = '';
        updates.chapter = '';
      } else if (field === 'region') {
        updates.chapter = '';
      }
      
      // Clear custom category if not in social categories
      if (field === 'socialCategory' && !(value as string[]).includes('other')) {
        updates.socialCategoryCustom = '';
      }

      return { ...prev, ...updates };
    });
    
    // Clear any existing errors when field changes
    setErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
  };

  const renderBusinessForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Business Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormSelect
          label="Country"
          options={countryOptions}
          placeholder="Select country"
          value={businessData.country}
          onChange={(e) => handleBusinessChange('country', e.target.value)}
          error={errors.country}
          isRequired
        />
        
        <FormSelect
          label="Region"
          options={regionOptions}
          placeholder={!businessData.country ? 'Select country first' : 'Select region'}
          value={businessData.region}
          onChange={(e) => handleBusinessChange('region', e.target.value)}
          disabled={!businessData.country}
          error={errors.region}
          isRequired
        />
        
        <FormSelect
          label="Chapter"
          options={chapterOptions}
          placeholder={!businessData.region ? 'Select region first' : 'Select chapter'}
          value={businessData.chapter}
          onChange={(e) => handleBusinessChange('chapter', e.target.value)}
          disabled={!businessData.region}
          error={errors.chapter}
          isRequired
        />
        <FormInput
          label="Business Name"
          value={businessData.businessName}
          onChange={(e) => {
            const cleaned = (e.target.value || "").replace(/[^A-Za-z ]/g, "");
            handleBusinessChange('businessName', cleaned);
          }}
          placeholder="Enter business name"
          error={errors.businessName}
          isRequired
        />

        <FormSelect
          label="Business Category"
          options={businessCategoryOptions}
          placeholder={businessCategoryOptions.length ? "Search or select a category" : "Loading categories..."}
          value={businessData.businessCategory}
          onChange={(e) => handleBusinessChange('businessCategory', e.target.value)}
          error={errors.businessCategory}
          isRequired
          searchable
          searchPlaceholder="Search categories..."
        />

        {businessData.businessCategory === 'other' && (
          <FormInput
            label="Please specify your business category"
            placeholder="Enter your business category"
            value={businessData.businessCategoryCustom || ""}
            onChange={(e) => {
              const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
              handleBusinessChange('businessCategoryCustom', cleaned);
            }}
            error={errors.businessCategoryCustom}
            isRequired
          />
        )}

        <FormInput
          label="Established Year"
          placeholder="e.g. 2010"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={businessData.establishedYear}
          onKeyDown={(e) => {
            if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D+/g, "");
            handleBusinessChange('establishedYear', digits);
          }}
          error={errors.establishedYear}
          isRequired
        />

        <FormInput
          label="Headquarters Location"
          value={businessData.headquartersLocation}
          onChange={(e) => handleBusinessChange('headquartersLocation', e.target.value)}
          placeholder="City, Country"
          error={errors.headquartersLocation}
          isRequired
        />

        <FormSelect
          label="Company Size"
          value={businessData.companySize}
          onChange={(e) => handleBusinessChange('companySize', e.target.value)}
          options={companySizeOptions}
          placeholder="Select company size"
          error={errors.companySize}
          isRequired
        />

        <FormInput
          label="GST Number"
          value={businessData.gstNumber}
          onChange={(e) => handleBusinessChange('gstNumber', e.target.value.toUpperCase())}
          placeholder="Enter GST number"
          error={errors.gstNumber}
          isRequired
        />

        <FormInput
          label="Business Registration Number"
          value={businessData.businessRegistrationNumber}
          onChange={(e) => handleBusinessChange('businessRegistrationNumber', e.target.value.toUpperCase())}
          placeholder="Enter registration number"
          error={errors.businessRegistrationNumber}
          isRequired
        />

        <FormInput
          label="PAN Number"
          value={businessData.panNumber}
          onChange={(e) => handleBusinessChange('panNumber', e.target.value.toUpperCase())}
          placeholder="Enter PAN number"
          error={errors.panNumber}
          isRequired
        />
      </div>

      <FormTextarea
        label="Short Description"
        value={businessData.shortDescription}
        onChange={(e) => handleBusinessChange('shortDescription', e.target.value)}
        placeholder="Briefly describe your business (max 500 characters)"
        rows={4}
        maxLength={500}
        error={errors.shortDescription}
        isRequired
      />
    </div>
  );

  const renderProfessionalForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Professional Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <FormInput
          label="Role"
          placeholder="Enter Role"
          value={professionalData.role}
          pattern="[A-Za-z\s]*"
          onChange={(e) => {
            const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
            handleProfessionalChange('role', cleaned);
          }}
          error={errors.role}
          isRequired
        />

        <FormSelect
          label="Work Preference"
          options={workPreferenceOptions}
          placeholder="Select work preference"
          value={professionalData.workPreference}
          onChange={(e) => handleProfessionalChange('workPreference', e.target.value)}
          error={errors.workPreference}
          isRequired
        />

        <FormInput
          label="Years of Experience"
          placeholder="Enter Years of Experience"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={professionalData.yearsOfExperience}
          onKeyDown={(e) => {
            if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D+/g, "");
            handleProfessionalChange('yearsOfExperience', digits);
          }}
          error={errors.yearsOfExperience}
          isRequired
        />

        <FormSelect
          label="Professional Category"
          options={professionalCategoryOptions}
          placeholder={professionalCategoryOptions.length ? "Select a category" : "Loading categories..."}
          value={professionalData.professionalCategory}
          onChange={(e) => handleProfessionalChange('professionalCategory', e.target.value)}
          error={errors.professionalCategory}
          isRequired
          searchable
          searchPlaceholder="Search categories..."
        />

        {professionalData.professionalCategory === 'other' && (
          <FormInput
            label="Please specify your professional category"
            placeholder="Enter your professional category"
            value={professionalData.professionalCategoryCustom || ""}
            onChange={(e) => {
              const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
              handleProfessionalChange('professionalCategoryCustom', cleaned);
            }}
            error={errors.professionalCategoryCustom}
            isRequired
          />
        )}

        <FormTextarea
          label="Skills & Technologies"
          value={professionalData.skillsTechnologies}
          onChange={(e) => handleProfessionalChange('skillsTechnologies', e.target.value)}
          placeholder="List your key skills and technologies (comma separated)"
          rows={3}
          error={errors.skillsTechnologies}
          isRequired
        />
      </div>
    </div>
  );


  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;
  
  const modalRoot = document.getElementById('modal-root') || document.body;
  
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-[9998]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <GradientContainer className="w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
          <div className="rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">
                Request {moduleNames[moduleKey]} Module Access
              </h3>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Display */}
            <div className="mb-6">
              {isLoadingStatus ? (
                <div className="text-center py-4">
                  <div className="text-white">Loading status...</div>
                </div>
              ) : hasAccess || isApproved ? (
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-400 font-medium">Access Granted</span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">You already have access to this module.</p>
                </div>
              ) : isPending ? (
                <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-400 font-medium">Request Pending</span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">Your request is currently under review.</p>
                </div>
              ) : isRejected ? (
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-400 font-medium">Request Rejected</span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">Your previous request was rejected. You can submit a new request below.</p>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-gray-300 font-medium">Upgrade Required</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">You don't have access to this module yet.</p>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">

                {moduleKey === "business" && renderBusinessForm()}
                {moduleKey === "professional" && renderProfessionalForm()}
                {moduleKey === "social" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Social Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                      {/* Country, Region, Chapter */}
                      <div className="lg:col-span-6">
                        <FormSelect
                          label="Country"
                          options={countryOptions}
                          placeholder="Select country"
                          value={socialData.country}
                          onChange={(e) => handleSocialChange('country', e.target.value)}
                          error={errors.country}
                          isRequired
                        />
                      </div>
                      
                      <div className="lg:col-span-6">
                        <FormSelect
                          label="Region"
                          options={socialRegionOptions}
                          placeholder={!socialData.country ? 'Select country first' : 'Select region'}
                          value={socialData.region}
                          onChange={(e) => handleSocialChange('region', e.target.value)}
                          disabled={!socialData.country || socialRegionResponse.isLoading}
                          error={errors.region}
                          isRequired
                        />
                      </div>
                      
                      <div className="lg:col-span-6">
                        <FormSelect
                          label="Which Social chapter are you registering for?"
                          options={socialChapterOptions}
                          placeholder={
                            socialChapterResponse.isLoading 
                              ? 'Loading chapters...' 
                              : !socialData.region 
                                ? 'Select region first' 
                                : 'Select chapter'
                          }
                          value={socialData.chapter}
                          onChange={(e) => handleSocialChange('chapter', e.target.value)}
                          disabled={!socialData.region || socialChapterResponse.isLoading}
                          error={errors.chapter}
                          isRequired
                          className="w-full"
                        />
                        {socialChapterResponse.isLoading && (
                          <p className="mt-1 text-xs text-gray-400">Loading available chapters...</p>
                        )}
                      </div>

                      {/* Social Category */}
                      <div className="lg:col-span-6">
                        <FormSelect
                          label="Social Category"
                          options={socialCategoryOptions}
                          placeholder={socialCategoryOptions.length ? "Select a category" : "Loading categories..."}
                          value={socialData.socialCategory[0] || ""}
                          onChange={(e) => handleSocialChange('socialCategory', [e.target.value])}
                          error={errors.socialCategory}
                          isRequired
                          searchable
                          searchPlaceholder="Search categories..."
                        />

                        {socialData.socialCategory.includes('other') && (
                          <FormInput
                            label="Please specify your social category"
                            placeholder="Enter your social category"
                            value={socialData.socialCategoryCustom || ""}
                            onChange={(e) => {
                              const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
                              handleSocialChange('socialCategoryCustom', cleaned);
                            }}
                            error={errors.socialCategoryCustom}
                            isRequired
                          />
                        )}
                      </div>



                      <div className="lg:col-span-6">
                        <FormInput
                          label="What is your biggest motivation to join Ekam Global Network?"
                          placeholder="Enter your answer"
                          value={socialData.motivation}
                          onChange={(e) => handleSocialChange("motivation", e.target.value)}
                          error={errors.motivation}
                          isRequired
                        />
                      </div>
                      
                      <div className="lg:col-span-6">
                        <FormInput
                          label="Hobbies and Interests"
                          placeholder="Please list your hobbies and interests"
                          value={socialData.hobbies}
                          onChange={(e) => handleSocialChange("hobbies", e.target.value)}
                          error={errors.hobbies}
                          isRequired
                        />
                      </div>

                      <div className="lg:col-span-6">
                        <FormSelect
                          label="Would you be able to travel for group events?"
                          options={travelOptions}
                          placeholder="Select your answer"
                          value={socialData.willingToTravel}
                          onChange={(e) => handleSocialChange("willingToTravel", e.target.value)}
                          error={errors.willingToTravel}
                          isRequired
                        />
                      </div>

                      {socialData.willingToTravel === 'yes' && (
                        <div className="lg:col-span-6">
                          <FormInput
                            label="Please provide any additional travel notes"
                            placeholder="Enter your travel notes"
                            value={socialData.travelNotes}
                            onChange={(e) => handleSocialChange("travelNotes", e.target.value)}
                            error={errors.travelNotes}
                            isRequired
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  <p>Your request will be reviewed by an administrator.</p>
                  <p>You will receive a notification once a decision is made.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {(!hasAccess && !isApproved && !isPending) && (
                    <button
                      type="submit"
                      disabled={isSubmitting || 
                        (moduleKey === "business" && (!businessData.businessName.trim() || !businessData.businessCategory.trim())) ||
                        (moduleKey === "professional" && (!professionalData.role.trim() || !professionalData.workPreference.trim() || !professionalData.professionalCategory.trim())) ||
                        (moduleKey === "social" && socialData.socialCategory.length === 0)}
                      className="px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  )}
                </div>
              </form>
          </div>
        </GradientContainer>
      </div>
    </>,
    modalRoot
  );
};
