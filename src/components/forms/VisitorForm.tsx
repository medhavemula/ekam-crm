import React, { useState, useEffect } from "react";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";
import DatePicker from "../common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { useGetRegistrationTypesQuery, } from "../../services/visitorsApi";
import { useListCountriesQuery, useListRegionsQuery, useListBusinessCategoriesQuery, useListChaptersQuery } from "../../services/publicApi";
import { useUsersMeQuery } from "../../services/authApi";
import { useListMeetingsQuery } from "../../services/meetingsApi";
import { transformApiCategories } from "../../utils/businessCategories";

export interface VisitorFormData {
  registrationType: string;
  registrationChapter: string;
  visitDate: string;
  firstName: string;
  lastName: string;
  category: string;
  categoryCustom?: string;
  phoneNumber: string;
  emailAddress: string;
  companyName: string;
  streetAddress: string;
  country: string;
  countryId?: string;
  regionId?: string;
  chapterId?: string;
}

interface VisitorFormProps {
  initialData?: VisitorFormData;
  onSubmit: (data: VisitorFormData) => void;
  submitButtonText?: string;
  isEditMode?: boolean;
  lockedChapterId?: string;
  lockedChapterName?: string;
  onCancel?: () => void;
  cancelButtonText?: string;
}

export const VisitorForm: React.FC<VisitorFormProps> = ({
  initialData,
  onSubmit,
  submitButtonText = "Submit",
  isEditMode = false,
  lockedChapterId,
  lockedChapterName,
  onCancel,
  cancelButtonText = "Cancel",
}) => {
  // Initialize form with empty visit date (no auto-selection)
  const initialState: VisitorFormData = {
    registrationType: "",
    registrationChapter: "",
    visitDate: "", // No default date - user must select
    firstName: "",
    lastName: "",
    category: "",
    categoryCustom: "",
    phoneNumber: "",
    emailAddress: "",
    companyName: "",
    country: "",
    countryId: "",
    regionId: "",
    streetAddress: "",
  };

  const [formData, setFormData] = useState<VisitorFormData>(
    initialData || initialState
  );

  const [errors, setErrors] = useState<Record<string, string>>({});


  // Determine if chapter is locked (from users/me)
  const chapterLocked = Boolean(lockedChapterId) || Boolean(lockedChapterName);

  // Fetch current user data to get default location
  const { data: userData } = useUsersMeQuery();
  const currentUser = userData?.data;

  // Fetch meetings for current month, next month, and previous 3 months to get available dates
  const getCurrentMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
  };
  
  const getNextMonthEnd = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return nextMonth.toISOString().split('T')[0];
  };

  const { data: meetingsRes } = useListMeetingsQuery({
    from: getCurrentMonthStart(),
    to: getNextMonthEnd(),
    limit: 100, // Get all meetings for previous 3 months, current and next month
    sortBy: "date",
    sortDir: "asc"
  });

  // Extract available meeting dates. Undefined (not []) when there are none -
  // an empty array tells the DatePicker to disable every single day, which
  // would make the form permanently unsubmittable for a chapter that simply
  // hasn't had a meeting logged in the window yet (WEB-BUS-16).
  const availableMeetingDates = React.useMemo(() => {
    if (!meetingsRes?.data || meetingsRes.data.length === 0) return undefined;
    return meetingsRes.data.map(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    });
  }, [meetingsRes]);

  // Fetch registration types from API
  const { data: registrationTypesRes } = useGetRegistrationTypesQuery();

  // Transform API data to dropdown format
  const registrationTypes = registrationTypesRes?.data?.map((type) => ({
    value: type.value,
    label: type.label,
  })) || [
    { value: "REGISTER_SOMEONE_ELSE", label: "Register someone else" },
    { value: "REGISTER_MYSELF", label: "Register myself to visit" },
  ];

  // Fetch countries, regions for cascading dropdowns
  const { data: countriesResp, isLoading: countriesLoading } = useListCountriesQuery({ limit: 250 });
  const { data: regionsResp, isLoading: regionsLoading } = useListRegionsQuery({ 
    countryId: formData.countryId || undefined, 
    limit: 250 
  });
  
  // Fetch business categories for visitor form
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ 
    limit: 15,
    q: categorySearchQuery 
  });
  
  // Use business categories with "Others" option
  const businessCategories = transformApiCategories(businessCategoriesResponse?.data || []);
  const categories = [...businessCategories, { value: "others", label: "Others" }];
  // Fetch chapters based on selected region using public API
  const { data: locationChaptersResp, isLoading: locationChaptersLoading } = useListChaptersQuery({
    regionId: formData.regionId,
    limit: 15,
  });

  const countryOptions = React.useMemo(
    () =>
      (countriesResp?.data || []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [countriesResp],
  );

  const regionOptions = React.useMemo(
    () =>
      (regionsResp?.data || []).map((r) => ({
        value: r.id,
        label: r.name,
      })),
    [regionsResp],
  );

  const locationChapterOptions = React.useMemo(
    () =>
      (locationChaptersResp?.data || []).map((c) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [locationChaptersResp],
  );

  // Set default values based on user's location data or initialData
  useEffect(() => {
    if (currentUser) {
      const userCountryId = currentUser.basicInfo?.country;
      const userRegionId = currentUser.basicInfo?.region;
      const userChapterId = currentUser.basicInfo?.chapter;
      
      // For edit mode, try to match existing country name with country options
      if (initialData?.country && countryOptions.length > 0) {
        const matchingCountry = countryOptions.find(c => 
          c.label.toLowerCase() === initialData.country?.toLowerCase()
        );
        
        if (matchingCountry && !formData.countryId) {
          setFormData(prev => ({ 
            ...prev, 
            countryId: matchingCountry.value,
            country: matchingCountry.label
          }));
        }
      }
      // For new mode, use user's default country
      else if (!initialData) {
        const matchingCountry = countryOptions.find(c => c.value === userCountryId);
        
        if (matchingCountry && !formData.countryId) {
          setFormData(prev => ({ 
            ...prev, 
            country: matchingCountry.label,
            countryId: matchingCountry.value 
          }));
        }
      }
      
      // Set region by ID after country is set and regions are loaded
      const shouldSetRegion = (userRegionId && !initialData) || (initialData && formData.countryId);
      if (shouldSetRegion && formData.countryId && regionsResp?.data) {
        const targetRegionId = initialData ? null : userRegionId; // For edit, we'll let the form handle region based on country
        const matchingRegion = targetRegionId ? 
          regionsResp.data.find((r: any) => r.id === targetRegionId) :
          regionsResp.data.find((r: any) => r.id === userRegionId);
          
        if (matchingRegion && !formData.regionId) {
          setFormData(prev => ({ ...prev, regionId: matchingRegion.id }));
        }
      }
      
      // Set chapter by ID after region is set and chapters are loaded
      const shouldSetChapter = (userChapterId && !initialData) || (initialData?.registrationChapter);
      if (shouldSetChapter && formData.regionId && locationChaptersResp?.data) {
        const targetChapterId = initialData?.registrationChapter || userChapterId;
        const matchingChapter = locationChaptersResp.data.find((c: any) => c.id === targetChapterId);
        if (matchingChapter && !formData.registrationChapter) {
          setFormData(prev => ({ ...prev, registrationChapter: matchingChapter.id }));
        }
      }
    }
  }, [currentUser, countryOptions, initialData, formData.countryId, formData.regionId, formData.registrationChapter, regionsResp, locationChaptersResp]);

  // If a locked chapter is provided from users/me, ensure the form value reflects it
  useEffect(() => {
    if (lockedChapterId && !formData.registrationChapter) {
      setFormData((prev) => ({ ...prev, registrationChapter: "" }));
    }
  }, [lockedChapterId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const nameMin = 2; // matches backend createVisitorAndVisitDto's firstName min(2)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.registrationType) nextErrors.registrationType = "Registration type is required";
    if (!formData.category) nextErrors.category = "Business category is required";
    if (!formData.visitDate) nextErrors.visitDate = "Visit date is required";
    if (!formData.firstName || formData.firstName.trim().length < nameMin) nextErrors.firstName = `First name must be at least ${nameMin} characters`;
    // Phone strengthens duplicate matching but is not mandatory (WEB-BUS-17). The
    // server still needs one way to reach the visitor, so ask for an email when no
    // phone was given rather than demanding both.
    if (
      (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) &&
      (!formData.emailAddress || formData.emailAddress.trim().length === 0)
    ) {
      nextErrors.phoneNumber = "Enter a phone number or an email address";
    }
    if (formData.emailAddress && !emailRe.test(formData.emailAddress)) nextErrors.emailAddress = "Valid email is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registration Type */}
        <FormSelect
          label="Registrations Type"
          options={registrationTypes}
          placeholder="Select type"
          value={formData.registrationType}
          onChange={(e) => setFormData({ ...formData, registrationType: e.target.value })}
          isRequired
          error={errors.registrationType}
        />

        {/* Business Category */}
        <FormSelect
          label="Business Category"
          options={categories}
          placeholder="Select business category"
          value={formData.category}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({ ...formData, category: value });
            if (value !== "others") {
              setFormData({ ...formData, category: value, categoryCustom: "" });
            }
          }}
          searchable
          searchPlaceholder="Search category"
          onSearchChange={setCategorySearchQuery}
          isRequired
          error={errors.category}
        />

        {/* Custom Business Category - shown when "Others" is selected */}
        {formData.category === "others" && (
          <FormInput
            label="Custom Business Category"
            placeholder="Enter custom business category"
            value={formData.categoryCustom || ""}
            onChange={(e) => {
              const cleaned = (e.target.value || "").replace(/[^A-Za-z ,.&]/g, "");
              setFormData({ ...formData, categoryCustom: cleaned });
            }}
            isRequired
            error={errors.categoryCustom}
          />
        )}

        {/* First Name - shown when "Others" is not selected */}
        {formData.category !== "others" && (
          <FormInput
            label="First name"
            placeholder={isEditMode ? formData.firstName : "Enter your first name"}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            isRequired
            error={errors.firstName}
          />
        )}

        {/* Last Name */}
        <FormInput
          label="Last name"
          placeholder={isEditMode ? formData.lastName : "Enter your full name"}
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          error={errors.lastName}
        />

        {/* Email Address */}
        <FormInput
          label="Email address"
          type="email"
          placeholder={isEditMode ? formData.emailAddress : "Enter your email address"}
          value={formData.emailAddress}
          onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
          error={errors.emailAddress}
        />

        {/* First Name - shown when "Others" is selected */}
        {formData.category === "others" && (
          <FormInput
            label="First name"
            placeholder={isEditMode ? formData.firstName : "Enter your first name"}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            isRequired
            error={errors.firstName}
          />
        )}

        {/* Visit Date */}
        <div className="w-full">
          <label className="block text-xs text-gray-400 mb-1.5">Visit Date <span className="text-red-500">*</span></label>
          <DatePicker
            value={formData.visitDate}
            onChange={(v) => setFormData({ ...formData, visitDate: v })}
            iconSrc={CalendarIcon}
            placeholder="Select visit date"
            className={errors.visitDate ? 'border-red-500' : ''}
            availableDates={availableMeetingDates}
            disableTodayHighlight={true}
          />
          {errors.visitDate && (
            <p className="mt-1 text-xs text-red-500">{errors.visitDate}</p>
          )}
        </div>

        {/* Country */}
        <FormSelect
          label="Country"
          options={countryOptions}
          placeholder={countriesLoading ? "Loading countries..." : "Select Country"}
          value={formData.countryId || ""}
          onChange={(e) => {
            const id = e.target.value;
            setFormData({ ...formData, countryId: id, regionId: "", registrationChapter: "" });
            const name = countryOptions.find((o) => o.value === id)?.label || "";
            setFormData(prev => ({ ...prev, country: name }));
          }}
          searchable
          searchPlaceholder="Search countries"
          disabled={countriesLoading}
        />

        {/* Region */}
        <FormSelect
          label="Region"
          options={regionOptions}
          placeholder={
            !formData.countryId
              ? "Select country first"
              : regionsLoading
              ? "Loading regions..."
              : regionOptions.length
              ? "Select Region"
              : "No regions available"
          }
          value={formData.regionId || ""}
          onChange={(e) => {
            const id = e.target.value;
            setFormData({ ...formData, regionId: id, registrationChapter: "" });
          }}
          searchable
          searchPlaceholder="Search regions"
          disabled={regionsLoading || !formData.countryId}
        />

        {/* Chapter */}
        <FormSelect
          label="Registration Chapter"
          options={locationChapterOptions}
          placeholder={
            !formData.regionId && !chapterLocked
              ? "Select region first"
              : locationChaptersLoading
              ? "Loading chapters..."
              : locationChapterOptions.length || chapterLocked
              ? "Select Chapter"
              : "No chapters available"
          }
          value={formData.registrationChapter}
          onChange={(e) => setFormData({ ...formData, registrationChapter: e.target.value })}
          disabled={!formData.regionId && !chapterLocked}
          error={errors.registrationChapter}
          searchable
          searchPlaceholder="Search chapters"
        />

        {/* Phone Number */}
        <FormInput
          label="Phone number"
          type="tel"
          placeholder={isEditMode ? formData.phoneNumber : "Enter Phone number"}
          value={formData.phoneNumber}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => {
            const onlyDigits = e.target.value.replace(/\D+/g, "");
            setFormData({ ...formData, phoneNumber: onlyDigits });
          }}
          error={errors.phoneNumber}
        />

        {/* Company Name */}
        <FormInput
          label="Company Name"
          placeholder={isEditMode ? formData.companyName : "Enter company name"}
          value={formData.companyName}
          pattern="[A-Za-z\s]*"
          onChange={(e) => {
            const onlyLetters = e.target.value.replace(/[^A-Za-z\s]/g, "");
            setFormData({ ...formData, companyName: onlyLetters });
          }}
        />
      </div>

      {/* Address - Separate Row with TextArea */}
      <div className="grid grid-cols-1 gap-6">
        <FormTextarea
          label="Address"
          placeholder="Enter complete address (street, city, state, pincode)"
          value={formData.streetAddress}
          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
          rows={3}
        />
      </div>


      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-8 py-3 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
        >
          {submitButtonText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {cancelButtonText}
          </button>
        )}
      </div>
    </form>
  );
};

export default VisitorForm;
