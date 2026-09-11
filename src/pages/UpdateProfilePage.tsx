import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ADMIN_THEME } from "../theme/themeScope";
import Navbar from "../components/navigation/Navbar";
import DatePicker from "../components/common/DatePicker";
import CalendarIcon from "../assets/icons/calendar.svg";
import FormInput from "../components/forms/FormInput";
import FormSelect from "../components/forms/FormSelect";
import { useUsersMeQuery, useUpdateMeMutation } from "../services/authApi";
import { useToast } from "../components/toast/ToastProvider";
import { useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery, useListSocialCategoriesQuery, useListCountriesQuery, useListRegionsQuery, useListChaptersQuery } from "../services/publicApi";
import { transformApiCategories, workPreferenceOptions } from "../utils/businessCategories";

type Section = "personal" | "professional" | "business" | "social";

const getProfilePhotoPreviewUrl = (data: any): string | null => {
  const basicInfo = data?.basicInfo || {};
  const profile = data?.profile || {};
  const personal = data?.personal || {};

  return (
    basicInfo.profilePhotoUrlResolved ||
    profile.avatarUrl ||
    basicInfo.profilePhotoUrl ||
    personal.avatarUrl ||
    basicInfo.profilePhoto ||
    null
  );
};

export default function UpdateProfilePage() {
  const navigate = useNavigate();
  const { section: rawSection } = useParams<{ section?: Section }>();
  const section: Section = (rawSection as Section) || "personal";
  const { showToast } = useToast();

  // Prefill from users/me with refetch capability
  const { data: meRes } = useUsersMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const me = (meRes?.data as any) || {};
  const business = me.business || {};
  const professional = me.professional || {};

  // Fetch categories from APIs
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ limit: 100 });
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 100 });
  const { data: socialCategoriesResponse } = useListSocialCategoriesQuery({ limit: 100 });
  
  // Fetch reference data for name resolution
  const { data: countriesResponse } = useListCountriesQuery({ limit: 200 });
  const { data: regionsResponse } = useListRegionsQuery({ limit: 200 });
  const { data: chaptersResponse } = useListChaptersQuery({ limit: 200 });

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
  
  // Helper functions to resolve IDs to names
  const getCountryName = (countryId: string) => {
    const country = countriesResponse?.data?.find(c => c.id === countryId);
    return country ? country.name : countryId;
  };
  
  const getRegionName = (regionId: string) => {
    const region = regionsResponse?.data?.find(r => r.id === regionId);
    return region ? region.name : regionId;
  };
  
  const getChapterName = (chapterId: string) => {
    const chapter = chaptersResponse?.data?.find(c => c.id === chapterId);
    return chapter ? chapter.name : chapterId;
  };
  
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();

  // Local state per section
  // Initialize state with default values
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [personal, setPersonal] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    countryId: "",
    regionId: "",
    region: "",
    chapter: "",
    chapterAnswer: "",
    whenToJoin: "",
    expectationNote: "",
    profilePhoto: null as File | null,
    inductedById: "",
    inductedByName: "",
  });
  
  // Resolve names for display
  const countryName = useMemo(() => getCountryName(personal.countryId), [personal.countryId, countriesResponse?.data]);
  const regionName = useMemo(() => getRegionName(personal.regionId), [personal.regionId, regionsResponse?.data]);
  const chapterName = useMemo(() => getChapterName(personal.chapter), [personal.chapter, chaptersResponse?.data]);

  // Update state when meRes changes
  useEffect(() => {
    if (meRes?.data) {
      const basicInfo = meRes.data.basicInfo || {};
      setPersonal({
        name: String(meRes.data.name || ""),
        email: String(meRes.data.email || ""),
        phone: String(basicInfo.phone || ""),
        gender: String(basicInfo.gender || ""),
        dob: basicInfo.dob ? String(basicInfo.dob).slice(0, 10) : "",
        streetAddress: String(basicInfo.streetAddress || ""),
        city: String(basicInfo.city || ""),
        state: String(basicInfo.state || ""),
        pincode: String(basicInfo.pincode || ""),
        country: String(basicInfo.country || ""),
        countryId: String(basicInfo.country || ""),
        regionId: String(basicInfo.region || ""),
        region: String(basicInfo.region || ""),
        chapter: String(basicInfo.chapter || ""),
        chapterAnswer: String(basicInfo.chapterAnswer || ""),
        whenToJoin: basicInfo.whenToJoin ? String(basicInfo.whenToJoin).slice(0, 10) : "",
        expectationNote: String(basicInfo.expectationNote || ""),
        profilePhoto: null, // Don't reset profile photo to null if already selected
        inductedById: String(basicInfo.inductedById || ""),
        inductedByName: String(basicInfo.inductedByName || ""),
      });

      setProfilePhotoUrl(getProfilePhotoPreviewUrl(meRes.data));
    }
  }, [meRes]);

  const [biz, setBiz] = useState({
    businessName: String(business?.businessName || ""),
    businessCategory: String(business?.businessCategory || ""),
    businessCategoryCustom: String(business?.businessCategoryCustom || ""),
    subCategory: String(business?.subCategory || ""),
    sponsorName: String(business?.sponsorName || ""),
    establishedYear: String(business?.establishedYear ?? ""),
    hqLocation: String(business?.hqLocation || ""),
    contactRole: String(business?.contactRole || ""),
    companySize: String(business?.companySize || ""),
    workPreference: String(business?.workPreference || ""),
    gstNumber: String(business?.gstNumber || ""),
    businessRegistrationNumber: String(business?.businessRegistrationNumber || ""),
    panNumber: String(business?.panNumber || ""),
    shortDescription: String(business?.shortDescription || ""),
  });

  const [prof, setProf] = useState({
    role: String(professional?.role || ""),
    yearsOfExperience: String(professional?.yearsOfExperience ?? ""),
    professionalCategory: String(professional?.professionalCategory || ""),
    professionalCategoryCustom: String(professional?.professionalCategoryCustom || ""),
    socialCategory: String(professional?.socialCategory || ""),
    skillsTechnologies: Array.isArray(professional?.skillsTechnologies)
      ? professional.skillsTechnologies
      : String(professional?.skillsTechnologies || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
    workPreference: String(professional?.workPreference || ""),
  });

  useEffect(() => {
    if (!meRes?.data) return;

    const rawBusiness = (meRes.data as any)?.business || {};
    const rawProfessional = (meRes.data as any)?.professional || {};

    const rawBusinessCategory = String(rawBusiness.businessCategory || "");
    const rawProfessionalCategory = String(rawProfessional.professionalCategory || "");

    const normalizeBusinessCategory = () => {
      if (!rawBusinessCategory.trim()) {
        return {
          businessCategory: "",
          businessCategoryCustom: String(rawBusiness.businessCategoryCustom || ""),
        };
      }

      const foundByValue = businessCategoryOptions.find((c: any) => c.value === rawBusinessCategory);
      const foundByLabel = businessCategoryOptions.find((c: any) => c.label === rawBusinessCategory);

      if (foundByValue || foundByLabel) {
        return {
          businessCategory: String((foundByValue || foundByLabel)?.value || ""),
          businessCategoryCustom: String(rawBusiness.businessCategoryCustom || ""),
        };
      }

      return {
        businessCategory: "other",
        businessCategoryCustom: rawBusinessCategory,
      };
    };

    const normalizeProfessionalCategory = () => {
      if (!rawProfessionalCategory.trim()) {
        return {
          professionalCategory: "",
          professionalCategoryCustom: String(rawProfessional.professionalCategoryCustom || ""),
        };
      }

      const foundByValue = professionalCategoryOptions.find((c: any) => c.value === rawProfessionalCategory);
      const foundByLabel = professionalCategoryOptions.find((c: any) => c.label === rawProfessionalCategory);

      if (foundByValue || foundByLabel) {
        return {
          professionalCategory: String((foundByValue || foundByLabel)?.value || ""),
          professionalCategoryCustom: String(rawProfessional.professionalCategoryCustom || ""),
        };
      }

      return {
        professionalCategory: "other",
        professionalCategoryCustom: rawProfessionalCategory,
      };
    };

    const normalizedBiz = normalizeBusinessCategory();
    setBiz({
      businessName: String(rawBusiness.businessName || ""),
      businessCategory: normalizedBiz.businessCategory,
      businessCategoryCustom: normalizedBiz.businessCategoryCustom,
      subCategory: String(rawBusiness.subCategory || ""),
      sponsorName: String(rawBusiness.sponsorName || ""),
      establishedYear: String(rawBusiness.establishedYear ?? ""),
      hqLocation: String(rawBusiness.hqLocation || ""),
      contactRole: String(rawBusiness.contactRole || ""),
      companySize: String(rawBusiness.companySize || ""),
      workPreference: String(rawBusiness.workPreference || ""),
      gstNumber: String(rawBusiness.gstNumber || ""),
      businessRegistrationNumber: String(rawBusiness.businessRegistrationNumber || ""),
      panNumber: String(rawBusiness.panNumber || ""),
      shortDescription: String(rawBusiness.shortDescription || ""),
    });

    const normalizedProf = normalizeProfessionalCategory();
    setProf({
      role: String(rawProfessional.role || ""),
      yearsOfExperience: String(rawProfessional.yearsOfExperience ?? ""),
      professionalCategory: normalizedProf.professionalCategory,
      professionalCategoryCustom: normalizedProf.professionalCategoryCustom,
      socialCategory: String(rawProfessional.socialCategory || ""),
      skillsTechnologies: Array.isArray(rawProfessional.skillsTechnologies)
        ? rawProfessional.skillsTechnologies
        : String(rawProfessional.skillsTechnologies || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      workPreference: String(rawProfessional.workPreference || ""),
    });
  }, [meRes, businessCategoryOptions, professionalCategoryOptions]);

  const [social, setSocial] = useState({
    socialCategory: String(professional?.socialCategory || ""),
    hobbies: String(professional?.hobbies || ""),
    motivation: String(professional?.motivation || ""),
    travelForEvents: String(professional?.travelForEvents || ""),
    socialChapter: String(professional?.socialChapter || ""),
  });

  const title = useMemo(() => {
    if (section === "personal") return "Update Personal Details";
    if (section === "business") return "Update Business Details";
    if (section === "professional") return "Update Professional Details";
    return "Update Social Details";
  }, [section]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let body: any = {};
      if (section === "personal") {
        const formData = new FormData();

        // Get original basicInfo from meRes
        const originalBasicInfo = meRes?.data?.basicInfo || {};
        
        // Only include fields that have changed
        const basicInfoData: any = {};
        
        // Compare each field with original value
        if (personal.phone !== (originalBasicInfo.phone || "")) basicInfoData.phone = personal.phone;
        if (personal.gender !== (originalBasicInfo.gender || "")) basicInfoData.gender = personal.gender;
        if (personal.dob !== (originalBasicInfo.dob ? String(originalBasicInfo.dob).slice(0, 10) : "")) {
          basicInfoData.dob = personal.dob ? new Date(personal.dob).toISOString() : undefined;
        }
        if (personal.streetAddress !== (originalBasicInfo.streetAddress || "")) basicInfoData.streetAddress = personal.streetAddress;
        if (personal.city !== (originalBasicInfo.city || "")) basicInfoData.city = personal.city;
        if (personal.state !== (originalBasicInfo.state || "")) basicInfoData.state = personal.state;
        if (personal.pincode !== (originalBasicInfo.pincode || "")) basicInfoData.pincode = personal.pincode;
        if (personal.countryId !== (originalBasicInfo.countryId || "")) {
          basicInfoData.country = personal.countryId || undefined;
          basicInfoData.countryId = personal.countryId;
        }
        if (personal.regionId !== (originalBasicInfo.regionId || "")) basicInfoData.regionId = personal.regionId;
        if (personal.region !== (originalBasicInfo.region || "")) basicInfoData.region = personal.region;
        if (personal.chapter !== (originalBasicInfo.chapter || "")) basicInfoData.chapter = personal.chapter;
        if (personal.chapterAnswer !== (originalBasicInfo.chapterAnswer || "")) basicInfoData.chapterAnswer = personal.chapterAnswer;
        if (personal.whenToJoin !== (originalBasicInfo.whenToJoin ? String(originalBasicInfo.whenToJoin).slice(0, 10) : "")) {
          basicInfoData.whenToJoin = personal.whenToJoin ? new Date(personal.whenToJoin).toISOString() : undefined;
        }
        if (personal.expectationNote !== (originalBasicInfo.expectationNote || "")) basicInfoData.expectationNote = personal.expectationNote;
        if (personal.inductedById !== (originalBasicInfo.inductedById || "")) basicInfoData.inductedById = personal.inductedById;
        if (personal.inductedByName !== (originalBasicInfo.inductedByName || "")) basicInfoData.inductedByName = personal.inductedByName;

        formData.append('name', personal.name);
        
        // Only append basicInfo if there are changes
        if (Object.keys(basicInfoData).length > 0) {
          formData.append('basicInfo', JSON.stringify(basicInfoData));
        }

        // Add profile photo if present
        if (personal.profilePhoto) {
          formData.append('profilePhoto', personal.profilePhoto);
        }

        body = formData;
      } else if (section === "business") {
        const originalBusiness = meRes?.data?.business || {};
        const businessData: any = {};
        
        if (biz.businessName !== (originalBusiness.businessName || "")) businessData.businessName = biz.businessName;
        const businessCategory = biz.businessCategory === "other" && biz.businessCategoryCustom
          ? biz.businessCategoryCustom
          : biz.businessCategory;
        if (businessCategory !== (originalBusiness.businessCategory || "")) {
          businessData.businessCategory = businessCategory;
          if (biz.businessCategory === "other") {
            businessData.businessCategoryCustom = biz.businessCategoryCustom;
          }
        }
        if (biz.subCategory !== (originalBusiness.subCategory || "")) businessData.subCategory = biz.subCategory;
        if (biz.sponsorName !== (originalBusiness.sponsorName || "")) businessData.sponsorName = biz.sponsorName;
        if (biz.establishedYear !== (String(originalBusiness.establishedYear) || "")) {
          businessData.establishedYear = biz.establishedYear ? Number(biz.establishedYear) : undefined;
        }
        if (biz.hqLocation !== (originalBusiness.hqLocation || "")) businessData.hqLocation = biz.hqLocation;
        if (biz.contactRole !== (originalBusiness.contactRole || "")) businessData.contactRole = biz.contactRole;
        if (biz.companySize !== (originalBusiness.companySize || "")) businessData.companySize = biz.companySize;
        if (biz.workPreference !== (originalBusiness.workPreference || "")) businessData.workPreference = biz.workPreference;
        if (biz.gstNumber !== (originalBusiness.gstNumber || "")) businessData.gstNumber = biz.gstNumber;
        if (biz.businessRegistrationNumber !== (originalBusiness.businessRegistrationNumber || "")) {
          businessData.businessRegistrationNumber = biz.businessRegistrationNumber;
        }
        if (biz.panNumber !== (originalBusiness.panNumber || "")) businessData.panNumber = biz.panNumber;
        if (biz.shortDescription !== (originalBusiness.shortDescription || "")) businessData.shortDescription = biz.shortDescription;
        
        body = Object.keys(businessData).length > 0 ? { business: businessData } : {};
      } else if (section === "professional") {
        const originalProfessional = meRes?.data?.professional || {};
        const professionalData: any = {};
        
        if (prof.role !== (originalProfessional.role || "")) professionalData.role = prof.role;
        if (prof.yearsOfExperience !== (String(originalProfessional.yearsOfExperience) || "")) {
          professionalData.yearsOfExperience = prof.yearsOfExperience ? Number(prof.yearsOfExperience) : undefined;
        }
        const professionalCategory = prof.professionalCategory === "other" && prof.professionalCategoryCustom
          ? prof.professionalCategoryCustom
          : prof.professionalCategory;
        if (professionalCategory !== (originalProfessional.professionalCategory || "")) {
          professionalData.professionalCategory = professionalCategory;
          if (prof.professionalCategory === "other") {
            professionalData.professionalCategoryCustom = prof.professionalCategoryCustom;
          }
        }
        if (JSON.stringify(prof.skillsTechnologies) !== JSON.stringify(originalProfessional.skillsTechnologies || [])) {
          professionalData.skillsTechnologies = prof.skillsTechnologies;
        }
        if (prof.workPreference !== (originalProfessional.workPreference || "")) professionalData.workPreference = prof.workPreference;
        
        body = Object.keys(professionalData).length > 0 ? { professional: professionalData } : {};
      } else {
        const originalSocial = meRes?.data?.social || {};
        const socialData: any = {};
        
        if (social.socialCategory !== (originalSocial.socialCategory || "")) socialData.socialCategory = social.socialCategory;
        if (social.hobbies !== (originalSocial.hobbies || "")) socialData.hobbies = social.hobbies;
        if (social.motivation !== (originalSocial.motivation || "")) socialData.motivation = social.motivation;
        if (social.travelForEvents !== (originalSocial.travelForEvents || "")) socialData.travelForEvents = social.travelForEvents;
        if (social.socialChapter !== (originalSocial.socialChapter || "")) socialData.socialChapter = social.socialChapter;
        
        body = Object.keys(socialData).length > 0 ? { social: socialData } : {};
      }
      
      await updateMe(body).unwrap();
      showToast({ title: "Profile updated", description: "Your changes have been saved.", kind: "success" });
      navigate('/profile');
    } catch (e) {
      console.error(e);
      showToast({ title: "Update failed", description: "Please review the fields and try again.", kind: "error" });
    }
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={String(me?.name || "")} />
      <main className="container mx-auto px-4 py-6">
        <h1 className="ekam-figure mb-5 text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
          {title}
        </h1>

        <form onSubmit={submit} className="w-full">
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            {/* The same accent rule the profile cards use, so the form reads as
                the editable face of the card it was opened from. */}
            <div className="flex items-center gap-3 border-b border-[color:var(--ov-line-faint)] px-6 py-4 md:px-8">
              <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
              <h2 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                {title.replace(/^Update /, "")}
              </h2>
            </div>
            <div className="p-6 md:p-8">
            {section === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormInput
                  label="Your full name"
                  placeholder="Enter your full name"
                  value={personal.name}
                  onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                />
                <FormInput
                  label="Email address"
                  placeholder="Enter your email"
                  value={personal.email}
                  disabled
                  className="opacity-70 cursor-not-allowed"
                />
                <FormInput
                  label="Phone number"
                  placeholder="Enter Phone number"
                  value={personal.phone}
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                />
                <FormSelect
                  label="Gender"
                  options={[
                    { value: "", label: "Select gender" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" }
                  ]}
                  value={personal.gender.toLowerCase()}
                  onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                />
                <div>
                  <label className="block text-sm text-[var(--ov-ink-2)] mb-2">Date of birth</label>
                  <DatePicker value={personal.dob} onChange={(v) => setPersonal({ ...personal, dob: v })} iconSrc={CalendarIcon} />
                </div>
                <div className="w-full">
                  <label className="block text-xs text-[var(--field-label)] mb-1.5">Profile Photo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (profilePhotoUrl?.startsWith("blob:")) {
                            URL.revokeObjectURL(profilePhotoUrl);
                          }
                          setPersonal({ ...personal, profilePhoto: file });
                          setProfilePhotoUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                      id="profilePhoto"
                    />
                    <div className="flex items-stretch h-11">
                      <label
                        htmlFor="profilePhoto"
                        className={`flex-1 flex items-center justify-between bg-[var(--field-bg)] border border-[color:var(--field-border)] rounded px-3 text-[var(--ov-ink-2)] cursor-pointer hover:border-orange-500 transition-colors`}
                      >
                        <span className="truncate max-w-[180px] text-sm">
                          {personal.profilePhoto ? personal.profilePhoto.name : (profilePhotoUrl ? "Profile Photo" : "Choose File")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--ov-ink-2)] bg-[var(--ov-fill-subtle)]/50 px-2 py-1 rounded whitespace-nowrap">
                            {personal.profilePhoto || profilePhotoUrl ? "Change" : "No File Chosen"}
                          </span>
                          {(personal.profilePhoto || profilePhotoUrl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (profilePhotoUrl?.startsWith("blob:")) {
                                  URL.revokeObjectURL(profilePhotoUrl);
                                }
                                setPersonal({ ...personal, profilePhoto: null });
                                setProfilePhotoUrl(null);
                                const fileInput = document.getElementById('profilePhoto') as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--ov-ember-fill)] hover:bg-orange-700 text-[var(--ov-on-ember)] text-sm font-medium transition-colors"
                              title="Remove photo"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  {profilePhotoUrl && (
                    <div className="mt-2">
                      <img
                        src={profilePhotoUrl}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-full object-cover border border-[color:var(--ov-line-strong)]"
                      />
                    </div>
                  )}
                </div>
                <FormInput label="Country" placeholder="Enter Country" value={countryName} disabled className="opacity-70 cursor-not-allowed" />
                <FormInput label="Region" placeholder="Enter Region" value={regionName} disabled className="opacity-70 cursor-not-allowed" />
                <FormInput label="Chapter" placeholder="Select Chapter" value={chapterName} disabled className="opacity-70 cursor-not-allowed" />
                
                {/* Address and Expectation in single row */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--field-label)] mb-1.5">Address</label>
                    <textarea
                      placeholder="Enter full address"
                      value={personal.streetAddress}
                      onChange={(e) => setPersonal({ ...personal, streetAddress: e.target.value })}
                      className="w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border border-[color:var(--field-border)] px-3 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors py-2.5 resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--field-label)] mb-1.5">Please let us know what you expect from Ekam</label>
                    <textarea
                      placeholder="Enter your answer"
                      value={personal.expectationNote}
                      onChange={(e) => setPersonal({ ...personal, expectationNote: e.target.value })}
                      className="w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border border-[color:var(--field-border)] px-3 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors py-2.5 resize-y"
                      rows={3}
                    />
                  </div>
                </div>
                
                                <div className="md:col-span-3 mt-8 flex items-center gap-3 border-t border-[color:var(--ov-line-faint)] pt-6">
                  <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Updating..." : "Update"}
                  </button>
                  <button type="button" onClick={() => navigate(-1)} className="h-11 rounded-xl px-6 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {section === "business" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <FormInput
                  label="Business Name"
                  placeholder="Enter business Name"
                  value={biz.businessName}
                  onChange={(e) => {
                    const cleaned = (e.target.value || "").replace(/[^A-Za-z ]/g, "");
                    setBiz({ ...biz, businessName: cleaned });
                  }}
                />
                <FormSelect
                  label="Business Category"
                  options={[
                    ...businessCategoryOptions,
                    { value: "other", label: "Other" }
                  ]}
                  value={biz.businessCategory}
                  disabled
                  className="opacity-70 cursor-not-allowed"
                  searchable
                  searchPlaceholder="Search categories..."
                />
                {biz.businessCategory === "other" && (
                  <FormInput
                    label="Custom Business Category"
                    placeholder="Enter custom business category"
                    value={biz.businessCategoryCustom || ""}
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                )}
                <FormInput
                  label="Established Year"
                  placeholder="Enter Established year"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={biz.establishedYear}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 4);
                    setBiz({ ...biz, establishedYear: digits });
                  }}
                />
                <FormInput
                  label="Headquarters Location"
                  placeholder="Enter Headquarters Location"
                  value={biz.hqLocation}
                  onChange={(e) => {
                    const cleaned = (e.target.value || "").replace(/[^A-Za-z ,]/g, "");
                    setBiz({ ...biz, hqLocation: cleaned });
                  }}
                />
                <FormInput
                  label="Designation"
                  placeholder="Enter Designation"
                  value={biz.contactRole}
                  onChange={(e) => {
                    const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
                    setBiz({ ...biz, contactRole: cleaned });
                  }}
                />
                <FormSelect
                  label="Company Size"
                  options={[
                    { value: "1-10", label: "1-10 employees" },
                    { value: "11-50", label: "11-50 employees" },
                    { value: "51-200", label: "51-200 employees" },
                    { value: "201-500", label: "201-500 employees" },
                    { value: "501+", label: "501+ employees" },
                  ]}
                  value={biz.companySize}
                  onChange={(e) => setBiz({ ...biz, companySize: e.target.value })}
                />
                <FormInput
                  label="Sponsor Name"
                  placeholder="Enter Sponsor Name"
                  value={biz.sponsorName}
                  disabled
                  className="opacity-70 cursor-not-allowed"
                />
                <FormInput
                  label="GST Number"
                  placeholder="Enter GST Number"
                  value={biz.gstNumber}
                  maxLength={15}
                  onChange={(e) => {
                    const cleaned = e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 15);
                    setBiz({ ...biz, gstNumber: cleaned });
                  }}
                />
                <FormInput
                  label="Business Registration Number"
                  placeholder="Enter Business Registration Number"
                  value={biz.businessRegistrationNumber}
                  maxLength={30}
                  onChange={(e) => {
                    const cleaned = e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 30);
                    setBiz({ ...biz, businessRegistrationNumber: cleaned });
                  }}
                />
                <FormInput
                  label="PAN Number"
                  placeholder="Enter PAN Number"
                  value={biz.panNumber}
                  maxLength={10}
                  onChange={(e) => {
                    const cleaned = e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 10);
                    setBiz({ ...biz, panNumber: cleaned });
                  }}
                />
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs text-[var(--field-label)] mb-1.5">Business Description</label>
                  <textarea
                    placeholder="Enter Business Description (max 4000 characters)"
                    value={biz.shortDescription}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 4000) {
                        setBiz({ ...biz, shortDescription: value });
                      }
                    }}
                    onBlur={() => {
                      if (biz.shortDescription && biz.shortDescription.length > 4000) {
                        setBiz({ ...biz, shortDescription: biz.shortDescription.slice(0, 4000) });
                      }
                    }}
                    className={`w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border border-[color:var(--field-border)] px-3 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors h-11`}
                    rows={4}
                    maxLength={4000}
                  />
                  <div className="mt-1 text-xs text-[var(--field-label)] text-right">
                    {biz.shortDescription?.length || 0}/4000 characters
                  </div>
                </div>
                <div className="md:col-span-3 mt-8 flex items-center gap-3 border-t border-[color:var(--ov-line-faint)] pt-6">
                  <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Updating..." : "Update"}
                  </button>
                  <button type="button" onClick={() => navigate(-1)} className="h-11 rounded-xl px-6 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {section === "professional" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <FormInput
                  label="Designation"
                  placeholder="Enter Designation"
                  value={prof.role}
                  pattern="[A-Za-z\s]*"
                  onChange={(e) => {
                    const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
                    setProf({ ...prof, role: cleaned });
                  }}
                />
                <FormSelect
                  label="Work Preference"
                  options={workPreferenceOptions}
                  placeholder="Select work preference"
                  value={prof.workPreference}
                  onChange={(e) => setProf({ ...prof, workPreference: e.target.value })}
                />
                <FormInput
                  label="Years of Experience"
                  placeholder="Enter Years of Experience"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={prof.yearsOfExperience}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D+/g, "");
                    setProf({ ...prof, yearsOfExperience: digits });
                  }}
                />
                <FormSelect
                  label="Professional Category"
                  options={[
                    ...professionalCategoryOptions,
                    { value: "other", label: "Other" }
                  ]}
                  value={prof.professionalCategory}
                  disabled
                  className="opacity-70 cursor-not-allowed"
                  searchable
                  searchPlaceholder="Search categories..."
                />
                {prof.professionalCategory === "other" && (
                  <FormInput
                    label="Custom Professional Category"
                    placeholder="Enter custom professional category"
                    value={prof.professionalCategoryCustom || ""}
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                )}
                <div className="w-full">
                  <label className="block text-xs text-[var(--field-label)] mb-1.5">Skills & Technologies</label>
                  <input
                    type="text"
                    placeholder="e.g. Node.js, MongoDB, AWS, React"
                    value={Array.isArray(prof.skillsTechnologies) ? prof.skillsTechnologies.join(", ") : prof.skillsTechnologies}
                    onChange={(e) => {
                      const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
                      setProf({ ...prof, skillsTechnologies: cleaned });
                    }}
                    className={`w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border border-[color:var(--field-border)] px-3 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors h-11`}
                  />
                </div>
                <div className="md:col-span-3 mt-8 flex items-center gap-3 border-t border-[color:var(--ov-line-faint)] pt-6">
                  <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Updating..." : "Update"}
                  </button>
                  <button type="button" onClick={() => navigate(-1)} className="h-11 rounded-xl px-6 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {section === "social" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <FormSelect
                    label="Social Category"
                    options={socialCategoryOptions.filter((opt) => !String(social.socialCategory || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(opt.value.toLowerCase()))}
                    placeholder="Select a social category"
                    value=""
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next) return;
                      const existing = String(social.socialCategory || "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (existing.map(s => s.toLowerCase()).includes(next.toLowerCase())) return;
                      const updated = [...existing, next].join(",");
                      setSocial({ ...social, socialCategory: updated });
                    }}
                    searchable
                    searchPlaceholder="Search social categories..."
                  />

                  {(() => {
                    const values = String(social.socialCategory || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (!values.length) return null;
                    return (
                      <div className="flex flex-wrap gap-2">
                        {values.map((id) => {
                          const option = socialCategoryOptions.find((o) => o.value === id);
                          const label = option ? option.label : id;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--field-bg)] border border-[color:var(--ov-line-strong)] text-xs text-[var(--ov-ink)]"
                            >
                              <span className="truncate max-w-[140px]">{label}</span>
                              <button
                                type="button"
                                className="text-[var(--field-label)] hover:text-[var(--ov-ink)] text-[10px] leading-none"
                                onClick={() => {
                                  const remaining = values.filter((v) => v !== id);
                                  setSocial({ ...social, socialCategory: remaining.join(",") });
                                }}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <FormInput
                  label="Hobbies"
                  placeholder="Enter Hobbies"
                  value={social.hobbies}
                  onChange={(e) => setSocial({ ...social, hobbies: e.target.value })}
                />
                <FormInput
                  label="What is your biggest motivation to join Ekam Global Network?"
                  placeholder="Enter your answer"
                  value={social.motivation}
                  onChange={(e) => setSocial({ ...social, motivation: e.target.value })}
                />
                <FormSelect
                  label="Would you be able to travel for group events?"
                  options={[
                    { value: "", label: "Select your answer" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "maybe", label: "Maybe" },
                  ]}
                  value={social.travelForEvents}
                  onChange={(e) => setSocial({ ...social, travelForEvents: e.target.value })}
                />
                <FormInput
                  label="Which Social chapter are you registering for?"
                  placeholder="Enter chapter name"
                  value={social.socialChapter}
                  onChange={(e) => setSocial({ ...social, socialChapter: e.target.value })}
                />
                <div className="md:col-span-2 mt-8 flex items-center gap-3 border-t border-[color:var(--ov-line-faint)] pt-6">
                  <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Updating..." : "Update"}
                  </button>
                  <button type="button" onClick={() => navigate(-1)} className="h-11 rounded-xl px-6 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
