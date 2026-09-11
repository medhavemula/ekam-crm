import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { ArrowLeft } from "lucide-react";
import DatePicker from "../../../components/common/DatePicker";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import {
  useUpdateSocialPartnerMutation,
  useGetSocialPartnerQuery,
} from "../../../services/superadmin/adminSocialApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { useDirectUpdateEmailMutation } from "../../../services/memberApi";
import { FiEdit2 } from "react-icons/fi";
import { useRole } from "../../../hooks/useRole";

interface SocialPartnerFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  startDate: string;
  expiryDate: string;
  country_id: string;
  region_id: string;
}

export default function EditSocialPartnerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id = "" } = useParams();
  const location = useLocation() as { state?: any };
  const partner = location.state?.partner || {};

  const { role, isAdmin } = useRole();
  const edRoles = ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const canEditEmail = isAdmin || edRoles.includes(role as any);

  const [directUpdateEmail] = useDirectUpdateEmailMutation();
  const [isEmailEditOpen, setIsEmailEditOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string>("");
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);

  // Fetch partner details if not provided in location state
  const { data: partnerData } = useGetSocialPartnerQuery(id, {
    skip: !!partner.id,
  });

  const [formData, setFormData] = useState<SocialPartnerFormData>({
    name: partner?.name || "",
    email: partner?.email || "",
    phone: partner?.phone || "",
    role: partner?.role || "",
    startDate: partner?.startDate || "",
    expiryDate: partner?.expiryDate || "",
    country_id: partner?.country?.id || "",
    region_id: partner?.region?.id || "",
  });

  // Update form data if partner data is loaded
  useEffect(() => {
    if (partnerData?.data && !partner.id) {
      const data = partnerData.data;
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "",
        startDate: data.startDate || data.registrationDate || "",
        expiryDate: data.expiryDate || "",
        country_id: data.country?.id || "",
        region_id: data.region?.id || "",
      });
    }
  }, [partner, partnerData]);

  const { data: filtersRes } = useGetAdminFiltersQuery();
  const [updatePartner, { isLoading: isUpdating }] = useUpdateSocialPartnerMutation();

  const roleOptions = useMemo(
    () => [
      { value: "", label: "Select role" },
      { value: "SOCIAL_CHAIRPERSON", label: "Social Chairperson" },
    ],
    []
  );

  const countryOptions = useMemo(
    () =>
      filtersRes?.data?.countries?.map((c: any) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [filtersRes]
  );

  const regionOptions = useMemo(() => {
    if (!filtersRes?.data?.regions) return [];
    
    const sampleRegion = filtersRes.data.regions[0];
    const countryIdField = 'country_id' in sampleRegion ? 'country_id' : 
                         'countryId' in sampleRegion ? 'countryId' : 'country';
    
    return filtersRes.data.regions
      .filter((r: any) => String(r[countryIdField]) === String(formData.country_id))
      .map((r: any) => ({
        value: r.id,
        label: r.name,
      }));
  }, [filtersRes, formData.country_id]);

  const handleChange = (field: keyof SocialPartnerFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "country_id" ? { region_id: "" } : {}),
    }));
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
      const resp = await directUpdateEmail({ userId: String(id), newEmail: trimmed }).unwrap();
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
    const currentPartner = partner.id ? partner : partnerData?.data;
    const originalData = {
      name: currentPartner?.name || "",
      email: currentPartner?.email || "",
      phone: currentPartner?.phone || "",
      role: currentPartner?.role || "",
      startDate: currentPartner?.startDate || currentPartner?.registrationDate || "",
      expiryDate: currentPartner?.expiryDate || "",
      country_id: currentPartner?.country?.id || "",
      region_id: currentPartner?.region?.id || "",
    };

    const changed: any = {};
    
    if (formData.name !== originalData.name) changed.name = formData.name;
    if (!canEditEmail && formData.email !== originalData.email) changed.email = formData.email;
    if (formData.phone !== originalData.phone) changed.phone = formData.phone;
    if (formData.role !== originalData.role) changed.role = formData.role;
    if (formData.startDate !== originalData.startDate) changed.startDate = formData.startDate;
    if (formData.expiryDate !== originalData.expiryDate) changed.expiryDate = formData.expiryDate;
    if (formData.country_id !== originalData.country_id) changed.country_id = formData.country_id;
    if (formData.region_id !== originalData.region_id) changed.region_id = formData.region_id;
    
    return changed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'role', 'startDate', 'expiryDate', 'country_id', 'region_id'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof SocialPartnerFormData]?.trim());
    
    if (missingFields.length > 0) {
      showToast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        kind: "error",
      });
      return;
    }

    const changedFields = getChangedFields();
    
    // If no fields have changed, show a message and return
    if (Object.keys(changedFields).length === 0) {
      showToast({
        title: "No Changes",
        description: "No fields have been modified.",
        kind: "info",
      });
      return;
    }

    try {
      await updatePartner({
        id,
        data: changedFields,
      }).unwrap();
      
      showToast({
        title: "Success",
        description: "Partner updated successfully",
        kind: "success",
      });
      
      navigate("/admin/social");
    } catch (error: any) {
      console.error("Error updating partner:", error);
      showToast({
        title: "Error",
        description: error?.data?.message || "Failed to update partner. Please try again.",
        kind: "error",
      });
    }
  };
  
  const handleCancel = () => {
    navigate("/admin/social");
  };

  if (!partner.id && !partnerData?.data) {
    return (
      <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-center text-[13px] text-[var(--ov-ink-3)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            <p>Loading partner details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/social")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Social Partner
        </button>

        <h1 className="ekam-figure mb-5 text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
          Edit social partner
        </h1>

        <div className="rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput label="Name" type="text" placeholder="Enter name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} isRequired required />
                {canEditEmail ? (
                  <div>
                    <label className="block text-xs text-[var(--field-label)] mb-1.5">
                      Email <span className="text-[var(--field-invalid)]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full rounded bg-[var(--field-bg)] border border-[color:var(--field-border)] px-3 pr-10 py-2.5 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none transition-colors opacity-90"
                      />
                      <button
                        type="button"
                        onClick={openEmailEdit}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ov-ink-3)] hover:text-[var(--field-ink)]"
                        aria-label="Edit email"
                      >
                        <FiEdit2 size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <FormInput
                    label="Email"
                    type="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    isRequired
                    required
                  />
                )}
                <FormInput label="Phone" type="tel" placeholder="Enter Phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} isRequired required />
                <FormSelect label="Role" value={formData.role} onChange={(e) => handleChange("role", e.target.value)} options={roleOptions} isRequired required />
                <div>
                  <label className="block text-[12px] text-[var(--field-label)] mb-2">Start Date <span className="text-[var(--field-invalid)]">*</span></label>
                  <DatePicker id="start-date" value={formData.startDate} onChange={() => {}} iconSrc={CalendarIcon} className="h-11" disabled />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--field-label)] mb-2">Expiry Date <span className="text-[var(--field-invalid)]">*</span></label>
                  <DatePicker id="expiry-date" value={formData.expiryDate} onChange={(value) => handleChange("expiryDate", value)} iconSrc={CalendarIcon} className="h-11" minDate={formData.startDate} />
                </div>
                <FormSelect label="Country" value={formData.country_id} onChange={(e) => handleChange("country_id", e.target.value)} options={countryOptions} isRequired required />
                <FormSelect label="Region" value={formData.region_id} onChange={(e) => handleChange("region_id", e.target.value)} options={regionOptions} isRequired required />
              </div>
              <div className="flex items-center justify-start gap-3 pt-2">
                <button type="submit" className="w-36 md:w-40 h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isUpdating}>Update</button>
                <button type="button" onClick={handleCancel} className="h-11 w-36 md:w-40 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">Cancel</button>
              </div>
            </form>

            {canEditEmail && isEmailEditOpen && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={closeEmailEdit} />
                <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line)]">
                  <div className="p-6">
                    <h3 className="text-[17px] font-semibold text-[var(--ov-ink)] mb-2">Update Email</h3>
                    <p className="text-[13px] leading-5 text-[var(--ov-ink-3)] mb-4">
                      Enter the new email. A new password will be generated for the partner.
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
                        className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitEmailEdit}
                        disabled={isEmailUpdating}
                        className="h-10 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] disabled:opacity-60"
                      >
                        {isEmailUpdating ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
