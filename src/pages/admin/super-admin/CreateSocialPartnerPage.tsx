import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { ArrowLeft } from "lucide-react";
import DatePicker from "../../../components/common/DatePicker";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { useCreateSocialPartnerMutation } from "../../../services/superadmin/adminSocialApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";
import { useToast } from "../../../components/toast/ToastProvider";

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

export default function CreateExecutivePartnerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ExecutivePartnerFormData>({
    name: "",
    email: "",
    phone: "",
    role: "SOCIAL_CHAIRPERSON",
    startDate: "",
    expiryDate: "",
    country: "",
    region: "",
  });
  const [emailError, setEmailError] = useState<string>("");

  const { data: filtersRes } = useGetAdminFiltersQuery();
  const roleOptions = useMemo(() => [
    { value: "", label: "Select role" },
    { value: "SOCIAL_CHAIRPERSON", label: "Social Chairperson" }
  ], []);
  const countryOptions = useMemo(() => [{ value: "", label: "Select country" }, ...((filtersRes?.data?.countries ?? []).map((c) => ({ value: c.id, label: c.name })))], [filtersRes]);
  const regionOptions = useMemo(() => {
    const all = (filtersRes?.data?.regions ?? []);
    const filtered = formData.country ? all.filter((r) => r.country_id === formData.country) : all;
    return [{ value: "", label: "Select region" }, ...filtered.map((r) => ({ value: r.id, label: r.name }))];
  }, [filtersRes, formData.country]);

  const handleChange = (field: keyof ExecutivePartnerFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "country" ? { region: "" } : {}),
    }));
  };

  const [createPartner, { isLoading: isCreating }] = useCreateSocialPartnerMutation();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setEmailError(""); // Reset email error on new submission

    const requiredFields: Array<keyof ExecutivePartnerFormData> = [
      "name",
      "email",
      "phone",
      "role",
      "startDate",
      "expiryDate",
      "country",
      "region",
    ];
    const missingFields = requiredFields.filter((field) => !formData[field]?.trim());

    if (missingFields.length > 0) {
      showToast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        kind: "error",
      });
      return;
    }
    
    const body = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      startDate: formData.startDate,
      expiryDate: formData.expiryDate,
      country_id: formData.country,
      region_id: formData.region,
      createUser: true,
      sendInvite: true,
    };
    
    try {
      await createPartner(body).unwrap();
      showToast({ 
        title: "Social Partner Created Successfully!",
        description: `Name: ${formData.name}\nEmail: ${formData.email}\nRole: ${formData.role}`,
        kind: "success",
      });
      navigate("/admin/social", { replace: true });
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
          title: "Error Creating Partner",
          description: errorMessage,
          kind: "error",
        });
      }
    }
  };

  const handleCancel = () => {
    navigate("/admin/social");
  };

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
          Create social partner
        </h1>

        <div className="rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] md:p-8">

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Name */}
                <FormInput
                  label="Name"
                  type="text"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  isRequired
                  required
                />

                {/* Email */}
                <div>
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
                </div>

                {/* Phone */}
                <FormInput
                  label="Phone"
                  type="tel"
                  placeholder="Enter Phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  isRequired
                  required
                />

                {/* Role */}
                <FormSelect
                  label="Role"
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  options={roleOptions}
                  isRequired
                  required
                />

                {/* Start Date */}
                <div>
                  <label className="block text-[12px] text-[var(--field-label)] mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="start-date"
                    value={formData.startDate}
                    onChange={(value) => handleChange("startDate", value)}
                    iconSrc={CalendarIcon}
                    className="h-11"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-[12px] text-[var(--field-label)] mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="expiry-date"
                    value={formData.expiryDate}
                    onChange={(value) => handleChange("expiryDate", value)}
                    iconSrc={CalendarIcon}
                    className="h-11"
                    minDate={formData.startDate}
                  />
                </div>

                {/* Country */}
                <FormSelect
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  options={countryOptions}
                  isRequired
                  required
                />

                {/* Region */}
                <FormSelect
                  label="Region"
                  value={formData.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  options={regionOptions}
                  isRequired
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-start gap-3 pt-2">
                <button
                  type="submit"
                  className="w-36 md:w-40 h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="h-11 w-36 md:w-40 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  Cancel
                </button>
              </div>
            </form>
        </div>
      </main>
    </div>
  );
}
