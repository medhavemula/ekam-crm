import React, { useState, useEffect } from "react";
import { FiEdit2 } from "react-icons/fi";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import FormTextarea from "../forms/FormTextarea";
import DatePicker from "../common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";
import CheckedSvg from "../../assets/icons/checked.svg";
import UncheckedSvg from "../../assets/icons/unchecked.svg";
import businessIcon from "../../assets/icons/businessr.svg";
import professionalIcon from "../../assets/icons/professionalr.svg";
import socialIcon from "../../assets/icons/socialr.svg";
import type { BasicInfoData, FormErrors, ModuleType } from "../../types/registration.types";
import { useListChaptersQuery, useListCountriesQuery, useListRegionsQuery, useListSponsorsQuery, useListSocialChaptersQuery } from "../../services/publicApi";
import ProfilePhotoCropperModal from "./ProfilePhotoCropperModal";

// Email validation function with common typo detection
const validateEmail = (email: string): { isValid: boolean; message: string } => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  // Trim and convert to lowercase for validation
  email = email.trim().toLowerCase();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g., user@example.com)' };
  }

  const [localPart, domain] = email.split('@');
  
  // Common email domain typos with suggestions
  const commonTypos: Record<string, string> = {
    // Gmail variations
    'gmial.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmail.ocm': 'gmail.com',
    'gmaik.com': 'gmail.com',
    'giaml.com': 'gmail.com',  // giaml.com -> gmail.com
    'gimail.com': 'gmail.com', // gimail.com -> gmail.com
    'gmaile.com': 'gmail.com', // gmaile.com -> gmail.com
    'gmailll.com': 'gmail.com', // gmailll.com -> gmail.com
    'gmail.co': 'gmail.com',   // gmail.co -> gmail.com
    'gmai.com': 'gmail.com',   // gmai.com -> gmail.com
    'gmail..com': 'gmail.com', // gmail..com -> gmail.com
    'gmail.cop': 'gmail.com',  // gmail.cop -> gmail.com
    'gmail.cpm': 'gmail.com',  // gmail.cpm -> gmail.com
    'gmail.om': 'gmail.com',   // gmail.om -> gmail.com
    'gmail.vom': 'gmail.com',  // gmail.vom -> gmail.com
    'gmail.ckm': 'gmail.com',  // gmail.ckm -> gmail.com
    'gmail.coom': 'gmail.com', // gmail.coom -> gmail.com
    'gmail.comm': 'gmail.com', // gmail.comm -> gmail.com
    'gmail.cim': 'gmail.com',  // gmail.cim -> gmail.com
    'gmail.cok': 'gmail.com',  // gmail.cok -> gmail.com
    'gmail.cool': 'gmail.com', // gmail.cool -> gmail.com
    'gmail.copm': 'gmail.com', // gmail.copm -> gmail.com
    'gmail.de': 'gmail.com',   // gmail.de -> gmail.com
    'gmail.dk': 'gmail.com',   // gmail.dk -> gmail.com
    'gmail.es': 'gmail.com',   // gmail.es -> gmail.com
    'gmail.eu': 'gmail.com',   // gmail.eu -> gmail.com
    'gmail.fr': 'gmail.com',   // gmail.fr -> gmail.com
    'gmail.gr': 'gmail.com',   // gmail.gr -> gmail.com
    'gmail.hu': 'gmail.com',   // gmail.hu -> gmail.com
    'gmail.it': 'gmail.com',   // gmail.it -> gmail.com
    'gmail.net': 'gmail.com',  // gmail.net -> gmail.com
    'gmail.nz': 'gmail.com',   // gmail.nz -> gmail.com
    'gmail.org': 'gmail.com',  // gmail.org -> gmail.com
    'gmail.pl': 'gmail.com',   // gmail.pl -> gmail.com
    'gmail.pt': 'gmail.com',   // gmail.pt -> gmail.com
    'gmail.ru': 'gmail.com',   // gmail.ru -> gmail.com
    'gmail.se': 'gmail.com',   // gmail.se -> gmail.com
    'gmail.uk': 'gmail.com',   // gmail.uk -> gmail.com
    'gmail.vn': 'gmail.com',   // gmail.vn -> gmail.com
    'gmail.za': 'gmail.com',   // gmail.za -> gmail.com
    'gmailcom': 'gmail.com',   // gmailcom -> gmail.com
    'gmailcom.com': 'gmail.com', // gmailcom.com -> gmail.com
    'gmil.com': 'gmail.com',   // gmil.com -> gmail.com
    'gnail.com': 'gmail.com',  // gnail.com -> gmail.com
    'gmsil.com': 'gmail.com',  // gmsil.com -> gmail.com
    'gmx.com': 'gmail.com',    // gmx.com -> gmail.com
    'yaho.com': 'yahoo.com',
    'yhaoo.com': 'yahoo.com',
    'yaho.co': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
    'outlook.cm': 'outlook.com',
    'outlook.sg': 'outlook.com',
    'outlook.co': 'outlook.com',
    'hotmail.co': 'hotmail.com',
    'hotmail.con': 'hotmail.com',
    'hotmail.cm': 'hotmail.com',
  };
  
  // Additional fuzzy matching for common domain typos
  const fuzzyMatchDomains = (domain: string): string | null => {
    const gmailVariations = ['gmail', 'gamil', 'gmal', 'gmial', 'giaml', 'gimail'];
    const yahooVariations = ['yahoo', 'yhoo', 'yaho'];
    const outlookVariations = ['outlook', 'outlok', 'outluk'];
    const hotmailVariations = ['hotmail', 'hotmal', 'hotmil'];
    
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return null;
    
    const name = domainParts[0];
    const tld = domainParts[1];
    
    // Check for common TLD typos
  const tldMap: Record<string, string> = {
    'cm': 'com',
    'con': 'com',
    'cim': 'com',
    'cok': 'com',
    'coom': 'com',
    'comm': 'com',
    'co': 'com',
    'om': 'com',
    'vom': 'com',
    'ckm': 'com',
    'cpm': 'com',
    'copm': 'com',
    'cop': 'com'
  };  
    
    // Check if the domain name is a variation of a known domain
    if (gmailVariations.some(v => name.includes(v))) {
      return `gmail.${tldMap[tld] || 'com'}`;
    }
    if (yahooVariations.some(v => name.includes(v))) {
      return `yahoo.${tldMap[tld] || 'com'}`;
    }
    if (outlookVariations.some(v => name.includes(v))) {
      return `outlook.${tldMap[tld] || 'com'}`;
    }
    if (hotmailVariations.some(v => name.includes(v))) {
      return `hotmail.${tldMap[tld] || 'com'}`;
    }
    
    return null;
  };

  // Check for common typos
  let suggestedDomain = commonTypos[domain];
  
  // If no direct match, try fuzzy matching
  if (!suggestedDomain) {
    const fuzzyMatch = fuzzyMatchDomains(domain);
    if (fuzzyMatch) {
      suggestedDomain = fuzzyMatch;
    }
  }
  
  if (suggestedDomain && suggestedDomain !== domain) {
    return { 
      isValid: false, 
      message: `Did you mean ${localPart}@${suggestedDomain}?` 
    };
  }

  // Check for disposable email domains
  const disposableDomains = [
    'tempmail.com', 'mailinator.com', 'guerrillamail.com', 'yopmail.com',
    '10minutemail.com', 'temp-mail.org', 'dispostable.com', 'maildrop.cc',
    'throwawaymail.com', 'fakeinbox.com', 'tempmail.net', 'trashmail.com',
    'mailnesia.com', 'mailcatch.com', 'tempr.email', 'tempmailgen.com'
  ];
  
  if (disposableDomains.some(d => domain.endsWith(d))) {
    return { 
      isValid: false, 
      message: 'Disposable email addresses are not allowed. Please use a permanent email address.' 
    };
  }

  // Check for valid domain format
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return { 
      isValid: false, 
      message: 'Invalid domain format. Please check the domain name and try again.' 
    };
  }

  return { isValid: true, message: '' };
};


interface BasicInfoStepProps {
  data: BasicInfoData;
  errors: FormErrors;
  onChange: (field: keyof BasicInfoData | 'profilePhotoError', value: string | File | null | ModuleType[]) => void;
  existingProfilePhotoUrl?: string; // URL of existing profile photo for display
  registrationType?: 'business' | 'professional' | 'social' | 'normal'; // To determine which chapters to show
  isNormalRegistration?: boolean; // Explicit flag for normal registration
  showLocationFields?: boolean;
  emailMode?: 'editable' | 'locked_with_popup';
  onEmailUpdateRequest?: (newEmail: string) => Promise<void>;
  hideSocialOption?: boolean; // Hide social option — shows Business + Professional only
  onlySocialOption?: boolean; // Show Social option only — hides Business + Professional
  disableEmail?: boolean; // New prop to completely disable email field
}

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  errors,
  onChange,
  existingProfilePhotoUrl,
  registrationType,
  isNormalRegistration = false,
  showLocationFields = true,
  emailMode = 'editable',
  onEmailUpdateRequest,
  hideSocialOption = false,
  onlySocialOption = false,
  disableEmail = false,
}) => {
  const [emailError, setEmailError] = useState<string>('');
  const [isEmailTouched, setIsEmailTouched] = useState(false);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEmailEditOpen, setIsEmailEditOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string>("");
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);

  // Validate email when it changes or when touched state changes
  useEffect(() => {
    // Don't show any validation until the field is touched
    if (!isEmailTouched) return;
    
    const { isValid, message } = validateEmail(data.email || '');
    setEmailError(isValid ? '' : message);
    
    // Clear any existing error from parent's error state when valid
    if (isValid && errors.email) {
      const newErrors = { ...errors };
      delete newErrors.email;
      // @ts-ignore - We know this is safe
      onChange('errors', newErrors);
    }
  }, [data.email, isEmailTouched, errors, onChange]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange("email", value);
    
    // Only show validation state after user has finished typing and left the field
    if (!isEmailTouched) return;
    
    const { isValid, message } = validateEmail(value);
    setEmailError(isValid ? '' : message);
  };

  const handleEmailBlur = () => {
    setIsEmailTouched(true);
    const { isValid, message } = validateEmail(data.email || '');
    setEmailError(isValid ? '' : message);
  };

  const openEmailEdit = () => {
    setNewEmail(data.email || "");
    setNewEmailError("");
    setIsEmailEditOpen(true);
  };

  const closeEmailEdit = () => {
    if (isEmailUpdating) return;
    setIsEmailEditOpen(false);
  };

  const submitEmailEdit = async () => {
    const trimmed = (newEmail || "").trim();
    const { isValid, message } = validateEmail(trimmed);
    if (!isValid) {
      setNewEmailError(message);
      return;
    }
    if (!onEmailUpdateRequest) {
      setNewEmailError("Email update is not configured.");
      return;
    }

    try {
      setIsEmailUpdating(true);
      setNewEmailError("");
      await onEmailUpdateRequest(trimmed);
      onChange("email", trimmed);
      setIsEmailEditOpen(false);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to update email";
      setNewEmailError(String(msg));
    } finally {
      setIsEmailUpdating(false);
    }
  };
  
  // Check if email is valid, user has finished typing, and the field has been interacted with
  const isEmailValid = React.useMemo(() => {
    if (!isEmailTouched) return false; // Don't show valid state until field is touched
    if (!data.email) return false;
    return validateEmail(data.email).isValid;
  }, [data.email, isEmailTouched]);
  // Fetch public countries, regions, chapters and sponsors for dropdowns
  const { data: countriesResp, isLoading: countriesLoading } = useListCountriesQuery({ limit: 20 });
  const { data: regionsResp, isLoading: regionsLoading } = useListRegionsQuery({ countryId: data.countryId || undefined, limit: 20 });
  
  // Conditionally fetch chapters based on registration type
  const { data: chaptersResp, isLoading: chaptersLoading, isError: chaptersError } = registrationType === 'social' 
    ? useListSocialChaptersQuery({})
    : useListChaptersQuery({
        limit: 20,
        countryId: data.countryId || undefined,
        regionId: data.regionId || undefined,
      });
  
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [debouncedSponsorSearch, setDebouncedSponsorSearch] = useState("");
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSponsorSearch(sponsorSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [sponsorSearch]);

  const { data: sponsorsResp, isLoading: sponsorsLoading, isError: sponsorsError } = useListSponsorsQuery({ 
    q: debouncedSponsorSearch || undefined,
    limit: 20
  });

  const countryOptions = React.useMemo(
    () =>
      (countriesResp?.data || []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [countriesResp],
  );

  // Check if this is normal registration (show module access)
  const showModuleAccess = isNormalRegistration || (!registrationType || registrationType === 'normal');

  // Check if social dropdown should be shown in chapter area (only social selected)
  const showSocialDropdownInChapter = (registrationType === 'social') || 
    (showModuleAccess && data.moduleAccess && 
     Array.isArray(data.moduleAccess) && 
     data.moduleAccess.length === 1 && 
     data.moduleAccess.includes('social'));

  // Fetch social chapters when needed
  const {
  data: socialChaptersResp,
  isLoading: socialChaptersLoading,
  isError: socialChaptersError,
} = useListSocialChaptersQuery(
  {
    regionId: data.regionId || undefined,
    limit: 20,
  },
  {
    refetchOnMountOrArgChange: true,
  }
);

  // Merge regular chapters and social chapters for dropdown
  const allChapterOptions = React.useMemo(() => {
    const chapters = (chaptersResp?.data || []).map((c) => ({
      value: c.id,
      label: c.name,
    }));
    
    const socialChapters = (socialChaptersResp?.data || [])
  .filter((c) =>
    data.regionId ? c.regionId === data.regionId : true
  )
  .map((c) => ({
    value: c.id,
    label: c.name,
}));
    
    // Show social chapters when only social is selected or social registration type
    return showSocialDropdownInChapter ? socialChapters : chapters;
  }, [chaptersResp, socialChaptersResp, showSocialDropdownInChapter,data.regionId]);

  const regionOptions = React.useMemo(
    () =>
      (regionsResp?.data || []).map((r) => ({
        value: r.id,
        label: r.name,
      })),
    [regionsResp],
  );
  const sponsorOptions = React.useMemo(
    () => {
      const base = (sponsorsResp?.data || []).map((s: any) => ({
        value: s.id,
        label: s?.chapterName ? `${s.name} (${s.chapterName})` : s.name,
      }));
      const options = [{ value: "self", label: "Self" }, ...base];

      const currentId = (data as any)?.inductedById;
      const currentName = (data as any)?.inductedByName;

      if (
        currentId &&
        currentId !== "self" &&
        !options.some((o) => String(o.value) === String(currentId))
      ) {
        const injected = {
          value: String(currentId),
          label: String(currentName || ""),
        };
        options.splice(1, 0, injected);
      }

      return options;
    },
    [sponsorsResp, data],
  );
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // User cancelled the dialog: do not clear existing selection
      return;
    }
    
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    
    // Reset any previous errors
    onChange('profilePhotoError', '');
    
    // Check file type
    if (!validTypes.includes(file.type)) {
      onChange('profilePhotoError', 'Only JPG, JPEG, and PNG files are allowed');
      // Clear the file input
      e.target.value = '';
      return;
    }
    
    // Check file size
    if (file.size > maxSize) {
      onChange('profilePhotoError', 'File size must be less than 1MB');
      // Clear the file input
      e.target.value = '';
      // Clear the selected file from state
      onChange("profilePhoto", null);
      return;
    }
    
    // If validation passes, open cropper with this file
    setCropSourceFile(file);
    setIsCropOpen(true);
  };

  const today = new Date();
  const maxDob = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Network icons mapping
  const networkIcons = {
    business: businessIcon,
    professional: professionalIcon,
    social: socialIcon,
  };

  // Helper function to check if a network is selected
  const isNetworkSelected = (moduleAccess: ModuleType | ModuleType[] | undefined, networkType: ModuleType): boolean => {
    if (!moduleAccess) return false;
    if (Array.isArray(moduleAccess)) {
      const result = moduleAccess.includes(networkType);
      console.log(`DEBUG: Checking ${networkType}:`, { moduleAccess, result });
      return result;
    }
    const result = moduleAccess === networkType;
    console.log(`DEBUG: Checking ${networkType} (single):`, { moduleAccess, result });
    return result;
  };

  // Helper function to toggle network selection
  const toggleNetworkSelection = (networkType: ModuleType) => {
    const currentAccess = data.moduleAccess;
    let newAccess: ModuleType[];
    
    if (!currentAccess) {
      // If no access selected, select this network
      newAccess = [networkType];
    } else if (Array.isArray(currentAccess)) {
      // If already an array, toggle the network
      if (currentAccess.includes(networkType)) {
        // Remove network if already selected (allow empty selection)
        newAccess = currentAccess.filter(n => n !== networkType);
      } else {
        // Add network to selection
        newAccess = [...currentAccess, networkType];
      }
    } else {
      // If single value, convert to array and toggle
      if (currentAccess === networkType) {
        // Remove the only network (allow empty selection)
        newAccess = [];
      } else {
        // Convert to array and add new network
        newAccess = [currentAccess, networkType];
      }
    }
    
    onChange('moduleAccess', newAccess.length > 0 ? newAccess : null);
  };

  

      return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormInput
        label="Your Full Name"
        placeholder="Enter Your Full Name"
        value={data.fullName}
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z ]/g, "");
          onChange("fullName", cleaned);
        }}
        error={errors.fullName}
        isRequired
      />

      <FormInput
        label="Phone Number"
        placeholder="Enter Phone Number"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={15}
        value={data.phoneNumber}
        onChange={(e) => {
          const digits = (e.target.value || "").replace(/\D/g, "");
          onChange("phoneNumber", digits);
        }}
        error={errors.phoneNumber}
        isRequired
      />

      <div className="w-full">
        {disableEmail ? (
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.email}
              disabled
              className="w-full rounded bg-[#21272D] border border-gray-700 px-3 py-2.5 text-white placeholder:text-gray-500 opacity-60 cursor-not-allowed"
              readOnly
            />
          </div>
        ) : emailMode === 'locked_with_popup' ? (
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={data.email}
                disabled
                className="w-full rounded bg-[#21272D] border border-gray-700 px-3 pr-10 py-2.5 text-white placeholder:text-gray-500 focus:outline-none transition-colors opacity-90"
              />
              <button
                type="button"
                onClick={openEmailEdit}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-white"
                aria-label="Edit email"
              >
                <FiEdit2 size={18} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <FormInput
              label="Email Address"
              placeholder="Enter your email address"
              type="email"
              value={data.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              error={emailError || errors.email}
              isRequired
              className={emailError ? 'border-red-500' : ''}
            />
            {isEmailValid && (
              <p className="text-xs text-green-500 mt-1">✓ Valid email format</p>
            )}
          </>
        )}
      </div>

      {emailMode === 'locked_with_popup' && isEmailEditOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeEmailEdit} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-[#1a2332] shadow-2xl">
            <div className="p-6">
              <h3 className="text-white text-lg font-semibold mb-2">Update Email</h3>
              <p className="text-gray-300 text-sm mb-4">
                Enter the new email. A new password will be generated for the member.
              </p>

              <FormInput
                label="New Email"
                type="email"
                placeholder="Enter new email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                error={newEmailError || undefined}
                isRequired
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEmailEdit}
                  disabled={isEmailUpdating}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitEmailEdit}
                  disabled={isEmailUpdating}
                  className="px-4 py-2 bg-[#D85D27] text-white rounded-md hover:bg-[#C24F20] transition-colors disabled:opacity-60"
                >
                  {isEmailUpdating ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormSelect
        label="Gender"
        options={genderOptions}
        placeholder="Select gender"
        value={data.gender}
        onChange={(e) => onChange("gender", e.target.value)}
        error={errors.gender}
        isRequired
      />

      <div className="w-full ">
        <label className="block text-xs text-gray-400 mb-1.5">
          Date of birth
        </label>
        <DatePicker
          value={data.dateOfBirth}
          onChange={(v) => onChange("dateOfBirth", v)}
          iconSrc={CalendarIcon}
          maxDate={maxDob}
          placeholder="dd/mm/yyyy"
        />

        {errors.dateOfBirth && <p className="text-xs text-red-400 mt-1">{errors.dateOfBirth}</p>}
      </div>

      <div className="w-full">
        <label className="block text-xs text-gray-400 mb-1.5">
          Profile Photo <span className="text-gray-500">(Max 1MB, JPG/JPEG/PNG only)</span>
        </label>
        
        {/* Show existing profile photo if available */}
        {existingProfilePhotoUrl && !data.profilePhoto ? (
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full overflow-hidden cursor-pointer border-2 border-gray-600 hover:border-orange-500 transition-colors"
              onClick={() => setIsPreviewOpen(true)}
              title="Click to preview"
            >
              <img 
                src={existingProfilePhotoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-2">Current profile photo</p>
            </div>
          </div>
        ) : (
          /* Show file upload interface when no existing photo or when new photo is selected */
          <div className="relative">
            <input 
              type="file" 
              accept="image/jpeg,image/jpg,image/png" 
              onChange={handleFileChange} 
              className="hidden" 
              id="profilePhoto" 
            />
            <input 
              type="file" 
              accept="image/jpeg,image/jpg,image/png" 
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                const file = files[0];
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                const maxSize = 1 * 1024 * 1024; // 1MB
                
                // Reset any previous errors
                onChange('profilePhotoError', '');
                
                // Check file type
                if (!validTypes.includes(file.type)) {
                  onChange('profilePhotoError', 'Only JPG, JPEG, and PNG files are allowed');
                  e.target.value = '';
                  return;
                }
                
                // Check file size
                if (file.size > maxSize) {
                  onChange('profilePhotoError', 'File size must be less than 1MB');
                  e.target.value = '';
                  return;
                }
                
                // Directly set the file without cropping
                onChange("profilePhoto", file);
                e.target.value = '';
              }}
              className="hidden" 
              id="profilePhotoChange" 
            />
            <div className="flex items-stretch h-11">
              <div
                className={`flex-1 flex items-center justify-between bg-[#21272D] border ${
                  errors.profilePhoto || data.profilePhotoError ? "border-red-500" : "border-gray-700"
                } rounded px-3 text-gray-300 cursor-pointer hover:border-orange-500 transition-colors`}
                onClick={() => {
                  if (data.profilePhoto) {
                    // For existing photo, create a new URL and open crop flow
                    const url = URL.createObjectURL(data.profilePhoto);
                    // Create a new file object from the existing photo to ensure it works with the cropper
                    fetch(url)
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], data.profilePhoto!.name, { type: data.profilePhoto!.type });
                        setCropSourceFile(file);
                        setIsCropOpen(true);
                        URL.revokeObjectURL(url);
                      })
                      .catch(() => {
                        // Fallback: try with the original file
                        setCropSourceFile(data.profilePhoto);
                        setIsCropOpen(true);
                      });
                  } else {
                    // Open file picker for new photo
                    document.getElementById('profilePhoto')?.click();
                  }
                }}
              >
                <span className="truncate max-w-[180px] text-sm">
                  {data.profilePhoto ? data.profilePhoto.name : "Choose File"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (data.profilePhoto) {
                        // Open file picker to change file without cropping
                        document.getElementById('profilePhotoChange')?.click();
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${
                      data.profilePhoto 
                        ? 'text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer' 
                        : 'text-gray-300 bg-gray-700/50 cursor-default'
                    }`}
                    title={data.profilePhoto ? "Change file only" : ""}
                    disabled={!data.profilePhoto}
                  >
                    {data.profilePhoto ? "Change" : "No File Chosen"}
                  </button>
                  {data.profilePhoto && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange("profilePhoto", null);
                        onChange('profilePhotoError', '');
                        const fileInput = document.getElementById('profilePhoto') as HTMLInputElement;
                        const fileInputChange = document.getElementById('profilePhotoChange') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                        if (fileInputChange) fileInputChange.value = '';
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
                      title="Remove photo"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            {(errors.profilePhoto || data.profilePhotoError) && (
              <p className="text-xs text-red-400 mt-1">
                {errors.profilePhoto || data.profilePhotoError}
              </p>
            )}
          </div>
        )}
      </div>
      <ProfilePhotoCropperModal
        file={cropSourceFile}
        isOpen={isCropOpen}
        onCancel={() => {
          setIsCropOpen(false);
          setCropSourceFile(null);
        }}
        onSave={(cropped) => {
          onChange("profilePhoto", cropped);
          setIsCropOpen(false);
          setCropSourceFile(null);
        }}
      />

      {/* Profile Photo Preview Modal */}
      {isPreviewOpen && existingProfilePhotoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-2xl max-h-[90vh] mx-4">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              title="Close preview"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={existingProfilePhotoUrl} 
              alt="Profile Preview" 
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {showLocationFields && (
        <>
          <FormSelect
            label="Country"
            options={countryOptions}
            placeholder={countriesLoading ? "Loading countries..." : "Select Country"}
            value={data.countryId || ""}
            onChange={(e) => {
              const id = e.target.value;
              onChange("countryId" as keyof BasicInfoData, id as any);
              const name = countryOptions.find((o) => o.value === id)?.label || "";
              onChange("country", name);
              onChange("state" as keyof BasicInfoData, "" as any);
              onChange("city" as keyof BasicInfoData, "" as any);
              onChange("pincode" as keyof BasicInfoData, "" as any);
              onChange("chapterRegistering", "");
            }}
            error={errors.country}
            isRequired
            searchable
            searchPlaceholder="Search countries"
            disabled={countriesLoading}
          />

          <FormSelect
            label="Region"
            options={regionOptions}
            placeholder={
              !data.countryId
                ? "Select country first"
                : regionsLoading
                ? "Loading regions..."
                : regionOptions.length
                ? "Select Region"
                : "No regions available"
            }
            value={data.regionId || ""}
            onChange={(e) => {
              const id = e.target.value;
              onChange("regionId" as keyof BasicInfoData, id as any);
              onChange("chapterRegistering", "");
            }}
            error={errors.regionId}
            isRequired
            searchable
            searchPlaceholder="Search regions"
            disabled={regionsLoading || !data.countryId}
          />

          <FormSelect
            key={`social-${data.regionId || "all"}`}
            label={showSocialDropdownInChapter ? "Which Social chapter are you registering for?" : "Which chapter are you registering for?"}
            options={allChapterOptions}
            placeholder={
              registrationType === 'social'
                ? socialChaptersLoading
                  ? "Loading social chapters..."
                  : allChapterOptions.length
                    ? "Select your social chapter"
                    : "No social chapters available"
                : !data.regionId
                  ? "Select region first"
                  : chaptersLoading
                    ? "Loading chapters..."
                    : allChapterOptions.length
                      ? "Select your chapter"
                      : "No chapters available"
            }
            value={data.chapterRegistering}
            onChange={(e) => {
              const id = e.target.value;
              onChange("chapterRegistering", id);
              const name = allChapterOptions.find((o) => o.value === id)?.label || "";
              onChange("chapterName", name);
            }}
            error={errors.chapterRegistering}
            isRequired
            searchable
            searchPlaceholder={registrationType === 'social' ? "Search social chapters" : "Search chapters"}
            disabled={registrationType === 'social' ? (socialChaptersLoading || !allChapterOptions.length) : (!data.regionId || chaptersLoading || !allChapterOptions.length)}
          />
          {(chaptersError || socialChaptersError) && <p className="text-xs text-yellow-400 -mt-3">Unable to load chapters right now. You can still proceed and select later.</p>}
        </>
      )}

      {registrationType !== 'social' && (
      <>
      <FormSelect
        label="Inducted by"
        options={sponsorOptions}
        placeholder={sponsorsLoading ? "Loading sponsors..." : "Select inducted by"}
        value={data.inductedById || (data.inductedByName?.toLowerCase() === "self" ? "self" : "")}
        onChange={(e) => {
          const id = e.target.value;
          if (id === "self") {
            onChange("inductedById" as keyof BasicInfoData, "" as any);
            onChange("inductedByName" as keyof BasicInfoData, "Self" as any);
          } else {
            const name = sponsorOptions.find((o) => o.value === id)?.label || "";
            onChange("inductedById" as keyof BasicInfoData, id as any);
            onChange("inductedByName" as keyof BasicInfoData, name as any);
          }
        }}
        onSearchChange={(searchQuery) => setSponsorSearch(searchQuery)}
        searchable
        searchPlaceholder="Search inducted by"
        disabled={sponsorsLoading}
        isRequired
        error={errors.inductedById}
      />
      {sponsorsError && (
        <p className="text-xs text-yellow-400 -mt-3">Unable to load inducted by list right now. You can still proceed and type later.</p>
      )}
      </>
      )}

      {/* WEB-AUTH-03: guest-visit prompt. Optional — skipping it, or finding no
          matching visit, must never block registration. */}
      <div className="w-full">
        <label className="block text-xs text-gray-400 mb-1.5">
          Were you invited as a guest to a chapter meeting?
        </label>
        <div className="flex items-center gap-4">
          {[
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ].map(({ value, label }) => {
            // Neither option is shown selected until the prospect actually answers,
            // so a skipped question never looks like a deliberate "No".
            const selected =
              data.attendedAsGuest !== undefined && Boolean(data.attendedAsGuest) === value;
            return (
              <div
                key={label}
                role="radio"
                aria-checked={selected}
                tabIndex={0}
                onClick={() => {
                  onChange("attendedAsGuest" as keyof BasicInfoData, value as any);
                  // Prefill with the registration phone the first time they say yes;
                  // they can correct it if they visited under a different number.
                  if (value && !data.visitorPhone && data.phoneNumber) {
                    onChange("visitorPhone" as keyof BasicInfoData, data.phoneNumber as any);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    (e.currentTarget as HTMLDivElement).click();
                  }
                }}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <img
                  src={selected ? CheckedSvg : UncheckedSvg}
                  alt={selected ? "Selected" : "Not selected"}
                  className="w-5 h-5"
                />
                <span className="text-xs text-gray-300">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {data.attendedAsGuest && (
        <FormInput
          label="Phone number used when you visited (optional)"
          placeholder="Enter Phone Number"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={15}
          value={data.visitorPhone || ""}
          onChange={(e) => {
            const digits = (e.target.value || "").replace(/\D/g, "");
            onChange("visitorPhone" as keyof BasicInfoData, digits as any);
          }}
        />
      )}

      <div className="w-full">
        <label className="block text-xs text-gray-400 mb-1.5">
          When do you plan to join?
        </label>
        <DatePicker 
          value={data.whenToJoin} 
          onChange={(v) => onChange("whenToJoin", v)} 
          iconSrc={CalendarIcon}
          placeholder="dd/mm/yyyy"
        />
        {errors.whenToJoin && <p className="text-xs text-red-400 mt-1">{errors.whenToJoin}</p>}
      </div>
      {/* Module Network Selection - Only show for normal registration */}
      {showModuleAccess && (
      <div>
        {/* Required field with asterisk */}
        <div className="flex items-center gap-1 mb-1.5">
          <h6 className="block text-xs text-gray-400">
            Choose Network Interested
          </h6>
          <span className="text-red-500">*</span>
        </div>

        <div className={`grid ${onlySocialOption ? 'grid-cols-1 max-w-[140px]' : hideSocialOption ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
          {[
            ...(onlySocialOption ? [] : [{ id: "business" as const, label: "Business" }]),
            ...(onlySocialOption ? [] : [{ id: "professional" as const, label: "Professional" }]),
            ...(hideSocialOption ? [] : [{ id: "social" as const, label: "Social" }]),
          ].map(({ id, label }) => {
            const selected = isNetworkSelected(data.moduleAccess, id as ModuleType);
            
            // Debug: Add visual indicator for selection state
            console.log(`DEBUG: Module ${id} selected:`, selected);

            return (
              <div
                key={id}
                onClick={() => toggleNetworkSelection(id as ModuleType)}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                {/* Bigger checkbox */}
                <img
                  src={selected ? CheckedSvg : UncheckedSvg}
                  alt={selected ? "Selected" : "Not selected"}
                  className="w-5 h-5"
                />

                {/* Smaller icon + label */}
                <div className="flex flex-col items-center flex-1">
                  <img
                    src={networkIcons[id]}
                    alt={label}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-xs text-center text-gray-300 mt-1">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {errors.moduleAccess && (
          <div className={`col-span-${hideSocialOption ? '2' : '3'} text-xs text-red-400 mt-2`}>
            {errors.moduleAccess}
          </div>
        )}
      </div>
      )}
      
      <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormTextarea
            label="Address"
            placeholder="Enter full address"
            value={data.streetAddress}
            onChange={(e) => onChange("streetAddress", e.target.value)}
            error={errors.streetAddress}
            rows={3}
          />
        </div>

        <div>
          <FormTextarea
            label="Please let us know what you expect from Ekam"
            placeholder="Enter your answer"
            value={data.expectation}
            onChange={(e) => onChange("expectation", e.target.value)}
            error={errors.expectation}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
