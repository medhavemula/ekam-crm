import React, { useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import { hasHigherOrEqualRole } from "../../../config/roles";
import { useUsersMeQuery } from "../../../services/authApi";
import Navbar from "../../../components/navigation/Navbar";
import DatePicker from "../../../components/common/DatePicker";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FormCard from "../../../components/forms/FormCard";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";
import { useCreateFranchisePartnerMutation } from "../../../services/superadmin/adminFranchiseApi";
import { useCreateEDTeamMutation } from "../../../services/superadmin/adminTeamApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";
import { useGetEdChaptersQuery } from "../../../services/ed";
import { useToast } from "../../../components/toast/ToastProvider";

interface ExecutivePartnerFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  role_code?: string;
  scope?: string;
  startDate: string;
  expiryDate: string;
  country: string;
  region: string;
  chapters?: string[];
  is_primary?: boolean;
}

export default function CreateExecutivePartnerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentRole = useSelector((state: RootState) => state.auth.role);
  const reduceMotion = useReducedMotion();
  
  // Get current user data including assignments using /users/me endpoint
  const { data: currentUser } = useUsersMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  
  // Get the user's assignment and scope
  const userAssignment = currentUser?.data?.assignments?.[0];
  const userScope = userAssignment?.scope;
  const isED = currentRole === 'EXECUTIVE_DIRECTOR' || currentRole === 'ED_TEAM';
  
  // Set default country and region from user's scope if available
  React.useEffect(() => {
    if (userScope?.country && userScope?.region) {
      setFormData(prev => ({
        ...prev,
        country: userScope.country,
        region: userScope.region
      }));
    }
  }, [userScope?.country, userScope?.region]);
  

  /**
   * Page title per role. The breadcrumb trail this used to build is gone: its
   * Super Admin entry pointed at /admin/executive-directors, which is not a
   * route — the list lives at /admin/franchise — so it was a dead link on every
   * render. A single Back control that returns where the reader came from is
   * both correct and shorter.
   */
  const pageTitle = useMemo(() => {
    if (currentRole === "SUPER_ADMIN") return "Create Executive Director";
    if (currentRole && hasHigherOrEqualRole(currentRole, "EXECUTIVE_DIRECTOR"))
      return "Create Regional Team Member";
    return "Create Team Member";
  }, [currentRole]);

  interface FormData {
    name: string;
    email: string;
    phone: string;
    role: string;
    country: string;
    region: string;
    startDate: string;
    expiryDate: string;
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    role: currentRole === 'SUPER_ADMIN' ? 'EXECUTIVE_DIRECTOR' : "",
    country: "",
    region: "",
    startDate: "",
    expiryDate: "",
  });
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string>("");

  // Remove duplicate useEffect that was setting the same values

  const { data: filtersRes } = useGetAdminFiltersQuery();
  
  // Load chapters for dropdown
  const { data: chaptersRes } = useGetEdChaptersQuery({ 
    page: 1, 
    limit: 50,
  });
  
  const chapterOptions = React.useMemo(() => {
    const chapters = (((chaptersRes as any)?.data?.items ?? []) as any[]);
    return chapters.map((c: any) => ({ value: c.id, label: c.name }));
  }, [chaptersRes]);
  
  const roleOptions = useMemo(() => {
    const options = [{ value: "", label: "Select role" }];
    
    // Add role options based on current user's role
    if (currentRole === 'SUPER_ADMIN') {
      // Only show Executive Director for Super Admin
      options.push({ value: "EXECUTIVE_DIRECTOR", label: "Executive Director" });
    } else if (currentRole === 'EXECUTIVE_DIRECTOR' || currentRole === 'ED_TEAM') {
      // Show Regional Director and Assistant Regional Director for EDs
      options.push(
        { value: "REGIONAL_DIRECTOR", label: "Regional Director" },
        { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" }
      );
    }
    
    return options;
  }, [currentRole]);

  React.useEffect(() => {
    if (currentRole === 'SUPER_ADMIN' && !formData.role) {
      setFormData((prev) => ({ ...prev, role: 'EXECUTIVE_DIRECTOR' }));
    }
  }, [currentRole, formData.role]);

  // Reset chapters when role changes
  React.useEffect(() => {
    setSelectedChapters([]);
  }, [formData.role]);
  const countryOptions = useMemo(() => [{ value: "", label: "Select country" }, ...((filtersRes?.data?.countries ?? []).map((c) => ({ value: c.id, label: c.name })))], [filtersRes]);
  const regionOptions = useMemo(() => {
    const all = (filtersRes?.data?.regions ?? []);
    const filtered = formData.country ? all.filter((r) => r.country_id === formData.country) : all;
    return [{ value: "", label: "Select region" }, ...filtered.map((r) => ({ value: r.id, label: r.name }))];
  }, [filtersRes, formData.country]);

  const handleChange = (field: keyof ExecutivePartnerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChaptersChange = (chapters: string[]) => {
    setSelectedChapters(chapters);
  };

  const [createPartner, { isLoading: isCreatingPartner }] = useCreateFranchisePartnerMutation();
  const [createEDTeam, { isLoading: isCreatingED }] = useCreateEDTeamMutation();
  const isCreating = isCreatingPartner || isCreatingED;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone || !formData.role || !formData.startDate) {
      showToast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        kind: "error",
      });
      return;
    }
    
    if (formData.expiryDate && formData.expiryDate < formData.startDate) {
      showToast({
        title: "Validation Error",
        description: "Expiry date cannot be before the start date.",
        kind: "error",
      });
      return;
    }

    // Additional validation for non-ED users
    if (!isED && (!formData.country || !formData.region)) {
      showToast({
        title: "Validation Error",
        description: "Please select both country and region.",
        kind: "error",
      });
      return;
    }

    // Validate chapter selection for ARD role only
    if (isED && formData.role === 'ASSISTANT_REGIONAL_DIRECTOR') {
      if (!selectedChapters || selectedChapters.length === 0) {
        showToast({
          title: "Validation Error",
          description: "Please select at least one chapter for this role.",
          kind: "error",
        });
        return;
      }
    }

    try {
      // For ED users, always use the ED team endpoint
      if (isED) {
        
        if (!userScope?.country || !userScope?.region) {
          console.error('Missing ED scope - Details:', {
            hasScope: !!userScope,
            hasCountry: !!userScope?.country,
            hasRegion: !!userScope?.region,
            userAssignment,
            allAssignments: currentUser?.data?.assignments
          });
          
          showToast({
            title: "Error",
            description: `Unable to determine your assigned country/region. 
              ${userScope ? 'User has no assigned country/region.' : 'No Executive Director assignment found.'} 
              Please contact support.`,
            kind: "error",
          });
          return;
        }
        
        // Determine scope based on role
        let scope = 'REGION';
        if (formData.role === 'ASSISTANT_REGIONAL_DIRECTOR') {
          scope = 'CHAPTER';
        }

        const edTeamBody = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role_code: formData.role,
          scope: scope,
          country_id: userScope.country,
          region_id: userScope.region,
          ...(formData.role === 'ASSISTANT_REGIONAL_DIRECTOR' && { 
            chapter_id: selectedChapters[0], // Use first chapter as primary chapter_id
            chapter_ids: selectedChapters // All chapters as array
          }),
          is_primary: true,
          start_date: toStartOfDayISO(formData.startDate) || formData.startDate,
          sendInvite: true,
        };
        await createEDTeam(edTeamBody).unwrap();
        
        // Show success message and navigate to regional team page for ED
        showToast({ 
          title: 'Team Member Created Successfully!',
          description: `Name: ${formData.name}\nEmail: ${formData.email}\nRole: ${formData.role}\nChapters: ${selectedChapters.length} selected`,
          kind: 'success',
        });
        navigate("/admin/regional-team");
      } 
      // For Super Admin, use the franchise partners endpoint
      else {
        const franchisePartnerBody = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          country_id: formData.country,
          region_id: formData.region,
          startDate: toStartOfDayISO(formData.startDate) || formData.startDate,
          expiryDate: toEndOfDayISO(formData.expiryDate) || formData.expiryDate,
          createUser: true,
          sendInvite: true
        };
        const created = await createPartner(franchisePartnerBody).unwrap();

        // The account is created either way, but the invite email can still fail.
        // Say so plainly instead of reporting a blanket success — otherwise the
        // ED silently never receives their temporary password.
        const emailSent = (created as any)?.data?.emailSent;
        if (emailSent === false) {
          showToast({
            title: 'Created, but the invite email failed',
            description: `${formData.name} was created and can be resent from the Franchise Partner list. Reason: ${(created as any)?.data?.emailError || 'unknown error'}`,
            kind: 'error',
          });
        } else {
          showToast({
            title: 'Executive Director Created Successfully!',
            description: `Name: ${formData.name}\nEmail: ${formData.email}\nRole: ${formData.role}`,
            kind: 'success',
          });
        }
        navigate("/admin/franchise");
      }
    } catch (e: any) {
      
      // Extract error message from different possible locations in the error object
      const errorMessage = e?.data?.message || 
                         e?.data?.error?.message || 
                         e?.error?.message || 
                         e?.message || 
                         "Something went wrong";
      
      if (e?.data?.code === "EDUPLICATE_EMAIL" || 
          e?.data?.error?.code === "EDUPLICATE_EMAIL" ||
          errorMessage.toLowerCase().includes('email') || 
          errorMessage.toLowerCase().includes('duplicate')) {
        const displayMessage = errorMessage || "This email is already in use. Please use a different email address.";
        setEmailError(displayMessage);
        showToast({
          title: "Email Already Exists",
          description: displayMessage,
          kind: "error",
        });
      } else {
        showToast({
          title: `Error Creating ${formData.role === 'EXECUTIVE_DIRECTOR' ? 'Executive Director' : 'Executive Partner'}`,
          description: errorMessage,
          kind: "error",
        });
      }
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  const dateLabel = "mb-1.5 block text-xs text-[var(--field-label)]";
  const showChapters = isED && formData.role === "ASSISTANT_REGIONAL_DIRECTOR";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
        {/* One way back, at the top, where a reader looks for it — rather than a
            Cancel button parked at the far end of a long form. */}
        <button
          type="button"
          onClick={handleCancel}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        <motion.header
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
            {pageTitle}
          </h1>
          <p className="mt-2.5 text-[12.5px] text-[var(--ov-ink-4)]">
            They will receive sign-in details at the email address you enter.
          </p>
        </motion.header>

        <form onSubmit={handleSubmit} className="pb-28">
          <FormCard>
            <FormInput
              label="Name"
              type="text"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              isRequired
              required
            />

            <FormInput
              label="Email"
              type="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => {
                handleChange("email", e.target.value);
                if (emailError) setEmailError("");
              }}
              isRequired
              required
              error={emailError}
            />

            <FormInput
              label="Phone"
              type="tel"
              placeholder="Enter Phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              isRequired
              required
            />

            <FormSelect
              label="Role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              options={roleOptions}
              isRequired
              required
            />

            <div>
              <label className={dateLabel} htmlFor="start-date">
                Start date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                id="start-date"
                value={formData.startDate}
                onChange={(value) => handleChange("startDate", value)}
                iconSrc={CalendarIcon}
                className="h-11 w-full"
              />
            </div>

            <div>
              <label className={dateLabel} htmlFor="expiry-date">
                Expiry date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                id="expiry-date"
                value={formData.expiryDate}
                onChange={(value) => handleChange("expiryDate", value)}
                iconSrc={CalendarIcon}
                className="h-11 w-full"
                minDate={formData.startDate}
              />
            </div>

            {!isED && (
              <>
                <FormSelect
                  label="Country"
                  value={formData.country}
                  onChange={(e) => {
                    handleChange("country", e.target.value);
                    handleChange("region", ""); // Reset region when country changes
                  }}
                  options={countryOptions}
                  isRequired
                  required
                />

                <FormSelect
                  label="Region"
                  value={formData.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  options={regionOptions}
                  isRequired
                  required
                  disabled={!formData.country}
                />
              </>
            )}

            {showChapters && (
              <div className="sm:col-span-2 lg:col-span-3">
                <FormSelect
                  label="Chapters"
                  value=""
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue && !selectedChapters.includes(newValue)) {
                      handleChaptersChange([...selectedChapters, newValue]);
                    }
                  }}
                  options={chapterOptions.filter((opt) => !selectedChapters.includes(opt.value))}
                  placeholder="Select chapters to add"
                  searchable={true}
                  searchPlaceholder="Search chapters..."
                  menuMaxHeightClass="max-h-64"
                  isRequired
                  required
                />
                {selectedChapters.length > 0 && (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {selectedChapters.map((chapterId) => {
                      const chapter = chapterOptions.find((opt) => opt.value === chapterId);
                      return (
                        <li
                          key={chapterId}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--ov-fill-subtle)] py-1 pl-2.5 pr-1 text-[12px] text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
                        >
                          {chapter?.label || chapterId}
                          <button
                            type="button"
                            onClick={() =>
                              handleChaptersChange(selectedChapters.filter((id) => id !== chapterId))
                            }
                            aria-label={`Remove ${chapter?.label || chapterId}`}
                            className="grid h-4 w-4 place-items-center rounded-full text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                          >
                            <X className="h-2.5 w-2.5" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </FormCard>

          {/* The commit stays reachable without scrolling to the end of the form. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--ov-line)] bg-[var(--ov-deep)]/90 backdrop-blur-xl">
            <div className="container mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-deep-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-deep-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isCreating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
