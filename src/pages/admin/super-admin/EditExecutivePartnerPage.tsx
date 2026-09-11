import React, { useEffect, useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DatePicker from "../../../components/common/DatePicker";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FormCard from "../../../components/forms/FormCard";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";
import { useUpdateFranchisePartnerMutation } from "../../../services/superadmin/adminFranchiseApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { FiEdit2 } from "react-icons/fi";
import { useRole } from "../../../hooks/useRole";
import { useGetEdChaptersQuery } from "../../../services/ed";
import { useUpdateEdTeamMemberMutation } from "../../../services/ed";

const getErrMsg = (e: any) =>
  e?.data?.message || e?.error || e?.message || "Something went wrong";

const toInputDate = (date?: string | null) => {
  if (!date) return "";
  return date.split("T")[0];
};

interface ExecutivePartnerFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  startDate: string;
  expiryDate: string;
  country: string;
  region: string;
}

export default function EditExecutivePartnerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id = "" } = useParams();
  const location = useLocation() as { state?: any };
  const partner = location.state?.partner || {};

  const { role, isAdmin } = useRole();

  const pageType = location.state?.pageType || "franchise";

  const isRegionalTeamEdit = pageType === "regional-team";

  const edRoles = ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const canEditEmail = isAdmin || edRoles.includes(role as any);

  const [isEmailEditOpen, setIsEmailEditOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string>("");
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);

  const reduceMotion = useReducedMotion();

  const [formData, setFormData] = useState<ExecutivePartnerFormData>({
    name:
      partner?.user?.name ||
      partner?.name ||
      "",

    email:
      partner?.user?.email ||
      partner?.email ||
      "",

    phone:
      partner?.user?.phone ||
      partner?.phone ||
      "",

    role:
      partner?.role?.code ||
      partner?.role ||
      "",

    startDate:
      toInputDate(
        partner?.start_date ||
        partner?.startDate ||
        partner?.registrationDate
      ),

    expiryDate:
      toInputDate(
        partner?.end_date ||
        partner?.expiryDate
      ),

    country:
      partner?.country?.id ||
      "",

    region:
      partner?.region?.id ||
      "",
  });

  const { data: filtersRes } = useGetAdminFiltersQuery();
  const roleOptions = useMemo(() => {
    if (isRegionalTeamEdit) {
      return [
        { value: "", label: "Select role" },
        {
          value: "REGIONAL_DIRECTOR",
          label: "Regional Director",
        },
        {
          value: "ASSISTANT_REGIONAL_DIRECTOR",
          label: "Assistant Regional Director",
        },
      ];
    }

    return [
      { value: "", label: "Select role" },
      {
        value: "EXECUTIVE_DIRECTOR",
        label: "Executive Director",
      },
    ];
  }, [isRegionalTeamEdit]);

  // Map the partner's role to the correct value if it's different
  const partnerRole = useMemo(() => {
    return (
      partner?.role?.code ||
      partner?.role ||
      ""
    );
  }, [partner]);

  // Update form data with mapped role when partner data is available
  React.useEffect(() => {
    if (partner?.role) {
      setFormData(prev => ({
        ...prev,

        name:
          partner?.user?.name ||
          partner?.name ||
          "",

        email:
          partner?.user?.email ||
          partner?.email ||
          "",

        phone:
          partner?.user?.phone ||
          partner?.phone ||
          "",

        role: partnerRole,

        startDate:
          toInputDate(
            partner?.start_date ||
            partner?.startDate ||
            partner?.registrationDate
          ),

        expiryDate:
          toInputDate(
            partner?.end_date ||
            partner?.expiryDate
          ),

        country:
          partner?.country?.id ||
          "",

        region:
          partner?.region?.id ||
          "",
      }));
    }
  }, [partner, partnerRole]);
  const countryOptions = useMemo(() => [{ value: "", label: "Select country" }, ...((filtersRes?.data?.countries ?? []).map((c) => ({ value: c.id, label: c.name })))], [filtersRes]);
  const regionOptions = useMemo(() => {
    const all = (filtersRes?.data?.regions ?? []);
    const filtered = formData.country ? all.filter((r) => r.country_id === formData.country) : all;
    return [{ value: "", label: "Select region" }, ...filtered.map((r) => ({ value: r.id, label: r.name }))];
  }, [filtersRes, formData.country]);

  const handleChange = (field: keyof ExecutivePartnerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string): string | null => {
    const v = (email || "").trim().toLowerCase();
    if (!v) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(v)) return "Please enter a valid email address";
    return null;
  };

  const openEmailEdit = () => {
    setNewEmail(formData.email || "");
    setNewEmailError("");
    setIsEmailEditOpen(true);
  };

  const closeEmailEdit = () => {
    if (isEmailUpdating) return;
    setIsEmailEditOpen(false);
  };

  // Escape closes the email dialog. It previously trapped the reader until they
  // found the Cancel button.
  useEffect(() => {
    if (!isEmailEditOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEmailUpdating) setIsEmailEditOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isEmailEditOpen, isEmailUpdating]);
  const { data: chaptersRes } = useGetEdChaptersQuery({
    page: 1,
    limit: 50,
  });

  const chapterOptions = React.useMemo(() => {
    const chapters =
      (((chaptersRes as any)?.data?.items ?? []) as any[]);

    return chapters.map((c: any) => ({
      value: c.id,
      label: c.name,
    }));
  }, [chaptersRes]);

  const submitEmailEdit = async () => {
    const trimmed = (newEmail || "").trim();
    const err = validateEmail(trimmed);
    if (err) {
      setNewEmailError(err);
      return;
    }
    if (!id) {
      setNewEmailError("Missing user id");
      return;
    }

    try {
      setIsEmailUpdating(true);
      setNewEmailError("");
      // Use the update partner API instead of direct-update
      const resp = await updatePartner({ id: String(id), body: { email: trimmed } }).unwrap();
      if (resp && (resp as any).success === false) {
        throw new Error((resp as any).message || "Failed to update email");
      }
      setFormData((p) => ({ ...p, email: trimmed }));
      showToast({
        title: "Email Updated",
        description: "Email updated successfully. A new password has been generated for the partner.",
        kind: "success",
      });
      setIsEmailEditOpen(false);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to update email";
      setNewEmailError(String(msg));
    } finally {
      setIsEmailUpdating(false);
    }
  };

  // Helper function to get only changed fields
  const getChangedFields = () => {
    const originalData = {
      name:
        partner?.user?.name ||
        partner?.name ||
        "",

      email:
        partner?.user?.email ||
        partner?.email ||
        "",

      phone:
        partner?.user?.phone ||
        partner?.phone ||
        "",
      role:
        partner?.role?.code ||
        partner?.role ||
        "",

      startDate:
        toInputDate(
          partner?.start_date ||
          partner?.startDate ||
          partner?.registrationDate
        ),

      expiryDate:
        toInputDate(
          partner?.end_date ||
          partner?.expiryDate
        ),

      country_id: partner?.country?.id || "",
      region_id: partner?.region?.id || "",
    };

    const changed: any = {};

    if (formData.name !== originalData.name) changed.name = formData.name;
    if (formData.phone !== originalData.phone) changed.phone = formData.phone;
    if (formData.role !== originalData.role) {
      if (isRegionalTeamEdit) {
        changed.roleCode = formData.role;
      } else {
        changed.role = formData.role;
      }
    }

    const originalChapterIds = Array.isArray(partner?.chapters)
      ? partner.chapters.map((c: any) => String(c.id))
      : partner?.chapter?.id
        ? [String(partner.chapter.id)]
        : [];

    const chaptersChanged =
      JSON.stringify(originalChapterIds.sort()) !==
      JSON.stringify([...selectedChapters].sort());

    if (isRegionalTeamEdit && showChapterField && chaptersChanged) {
      changed.chapterId = selectedChapters[0];
      changed.chapterIds = selectedChapters;
    }
    if (formData.startDate !== originalData.startDate) {
      changed.startDate = toStartOfDayISO(formData.startDate) || formData.startDate;
    }
    if (formData.expiryDate !== originalData.expiryDate) {
      changed.expiryDate = toEndOfDayISO(formData.expiryDate) || formData.expiryDate;
    }
    if (pageType === "franchise") {
      if (formData.country !== originalData.country_id) {
        changed.country_id = formData.country;
      }

      if (formData.region !== originalData.region_id) {
        changed.region_id = formData.region;
      }
    }

    return changed;
  };
  const showChapterField =
    pageType === "regional-team" &&
    formData.role === "ASSISTANT_REGIONAL_DIRECTOR";

  const [selectedChapters, setSelectedChapters] = useState<string[]>(
    Array.isArray(partner?.chapters)
      ? partner.chapters.map((c: any) => String(c.id))
      : partner?.chapter?.id
        ? [String(partner.chapter.id)]
        : []
  );

  const [updatePartner, { isLoading: isUpdating }] = useUpdateFranchisePartnerMutation();
  const [updateRegionalMember] =
    useUpdateEdTeamMemberMutation();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const changedFields = getChangedFields();

    // If no fields have changed, show a message and return
    if (Object.keys(changedFields).length === 0) {
      showToast({
        title: "No Changes",
        description: "No fields have been modified.",
        kind: "info"
      });
      return;
    }

    try {
      if (isRegionalTeamEdit) {
        await updateRegionalMember({
          memberId: String(id),
          data: changedFields,
        }).unwrap();
      } else {
        await updatePartner({
          id: String(id),
          body: changedFields,
        }).unwrap();
      }

      // Check if email was updated to show appropriate message
      const isEmailUpdated = changedFields.email;
      const successMessage = isEmailUpdated
        ? `Executive Partner has been updated successfully. Email updated and a new password has been generated.`
        : `Executive Partner has been updated successfully.`;

      showToast({
        title: isRegionalTeamEdit
          ? "Team Member Updated"
          : "Update Successful",
        description: isRegionalTeamEdit
          ? "Regional team member updated successfully."
          : successMessage,
        kind: "success"
      });
      // Use returnPath from location.state or default to the franchise list
      const returnPath =
        location.state?.returnPath ||
        (isRegionalTeamEdit
          ? "/admin/regional-team"
          : "/admin/franchise");
      navigate(returnPath, { replace: true });
    } catch (e) {
      const errorMessage = getErrMsg(e as any);
      showToast({
        title: "Update Failed",
        description: `Could not update partner information: ${errorMessage}`,
        kind: "error",
      });
    }
  };

  const handleCancel = () => navigate(-1);

  const dateLabel = "mb-1.5 block text-xs text-[var(--field-label)]";
  const pageTitle = isRegionalTeamEdit ? "Edit Regional Team Member" : "Edit Executive Partner";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
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
          {formData.name && (
            <p className="mt-2.5 text-[12.5px] text-[var(--ov-ink-4)]">
              Editing <span className="font-medium text-[var(--ov-ink-2)]">{formData.name}</span>
            </p>
          )}
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

            <div>
              <label className={dateLabel} htmlFor="partner-email">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="partner-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-11 w-full rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-bg)] px-3 pr-10 text-[var(--field-ink)] opacity-90 focus:outline-none"
                />
                {canEditEmail && (
                  <button
                    type="button"
                    onClick={openEmailEdit}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                    aria-label="Change email address"
                  >
                    <FiEdit2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
              {/* Changing the sign-in address reissues the password, which is a
                  consequence worth stating before the reader clicks, not after. */}
              {canEditEmail && (
                <p className="mt-1.5 text-[11px] leading-4 text-[var(--ov-ink-4)]">
                  Changing this issues a new password.
                </p>
              )}
            </div>

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
              {/* No required marker: the field is disabled, and a field you
                  cannot fill cannot be required of you. */}
              <label className={dateLabel} htmlFor="start-date">
                Start date
              </label>
              <DatePicker
                id="start-date"
                value={formData.startDate}
                onChange={() => {}}
                iconSrc={CalendarIcon}
                className="h-11 w-full"
                disabled
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

            {pageType === "franchise" && (
              <>
                <FormSelect
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
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
                />
              </>
            )}

            {isRegionalTeamEdit && showChapterField && (
              <div className="sm:col-span-2 lg:col-span-3">
                <FormSelect
                  label="Chapters"
                  value=""
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue && !selectedChapters.includes(newValue)) {
                      setSelectedChapters([...selectedChapters, newValue]);
                    }
                  }}
                  options={chapterOptions.filter((opt) => !selectedChapters.includes(opt.value))}
                  searchable
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
                              setSelectedChapters(selectedChapters.filter((id) => id !== chapterId))
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
                disabled={isUpdating}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isUpdating ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>

        {/* Email change dialog. Previously it had no Escape handler and no
            scrim dismissal, so once open the only way out was the Cancel button. */}
        <AnimatePresence>
          {canEditEmail && isEmailEditOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div
                className="absolute inset-0 bg-black/65"
                onClick={closeEmailEdit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-dialog-title"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--ov-deep)] p-6 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-deep-line)]"
              >
                <h3
                  id="email-dialog-title"
                  className="text-[16px] font-semibold text-[var(--ov-deep-ink)]"
                >
                  Change sign-in email
                </h3>
                <p className="mt-1.5 text-[13px] leading-5 text-[var(--ov-deep-ink-2)]">
                  A new password is generated and sent to the new address. The old address stops
                  working immediately.
                </p>

                <div className="mt-5">
                  <FormInput
                    label="New email"
                    type="email"
                    placeholder="Enter new email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    error={newEmailError || undefined}
                    isRequired
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEmailEdit}
                    disabled={isEmailUpdating}
                    className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-deep-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-deep-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitEmailEdit}
                    disabled={isEmailUpdating}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEmailUpdating && (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    {isEmailUpdating ? "Changing…" : "Change email"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
