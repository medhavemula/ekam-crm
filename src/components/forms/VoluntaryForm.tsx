import React, { useState, useEffect } from "react";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";
import {
  useListCountriesQuery,
  useListRegionsQuery,
  useListSocialChaptersQuery,
} from "../../services/publicApi";

export interface VolunteerFormData {
  name: string;
  email?: string;
  phone?: string;
  countryId: string;
  regionId: string;
  socialChapterId: string;
  referredBy?: string;
  area?: string;
  eventId?: string;
}

interface VolunteerFormProps {
  initialData?: Partial<VolunteerFormData>;
  onSubmit: (data: VolunteerFormData) => void;
  submitButtonText?: string;
  isEditMode?: boolean;
  onCancel?: () => void;
  cancelButtonText?: string;
}

function VolunteerForm({
  initialData,
  onSubmit,
  submitButtonText = "Submit",
  onCancel,
  cancelButtonText = "Cancel",
}: VolunteerFormProps) {
  const [formData, setFormData] = useState<VolunteerFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    countryId: initialData?.countryId || "",
    regionId: initialData?.regionId || "",
    socialChapterId: initialData?.socialChapterId || "",
    referredBy: initialData?.referredBy || "",
    area: initialData?.area || "",
    eventId: initialData?.eventId || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------- COUNTRIES ---------- */
  const { data: countriesRes } = useListCountriesQuery({ limit: 100 });
  const countries =
    countriesRes?.data?.map((c) => ({
      value: c.id,
      label: c.name,
    })) || [];

  /* ---------- REGIONS ---------- */
  const { data: regionsRes } = useListRegionsQuery(
    formData.countryId ? { countryId: formData.countryId, limit: 100 } : undefined,
    { skip: !formData.countryId }
  );

  const regions =
    regionsRes?.data?.map((r) => ({
      value: r.id,
      label: r.name,
    })) || [];

  /* ---------- CHAPTERS ---------- */
  const { data: chaptersRes } = useListSocialChaptersQuery(
    formData.regionId ? { regionId: formData.regionId, limit: 100 } : undefined,
    { skip: !formData.regionId }
  );

  const chapters =
    chaptersRes?.data?.map((c) => ({
      value: c.id,
      label: c.name,
    })) || [];

  /* ---------- UPDATE FROM INITIAL DATA ---------- */
  useEffect(() => {
    if (!initialData) return;
    setFormData((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  /* ---------- SUBMIT ---------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3)
      nextErrors.name = "Name must be at least 3 characters";

    if (!formData.countryId) nextErrors.countryId = "Country is required";
    if (!formData.regionId) nextErrors.regionId = "Region is required";
    if (!formData.socialChapterId)
      nextErrors.socialChapterId = "Chapter is required";

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      nextErrors.email = "Valid email is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormInput
          label="Name"
          value={formData.name}
          placeholder="enter the name"
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          isRequired
          error={errors.name}
        />

        <FormInput
          label="Email"
          type="email"
          placeholder="enter the email"
          value={formData.email || ""}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          error={errors.email}
        />

        <FormInput
          label="Phone"
          placeholder="enter the mobile number"
          type="tel"
          value={formData.phone || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              phone: e.target.value.replace(/\D+/g, ""),
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormSelect
          label="Country"
          options={countries}
          value={formData.countryId}
          onChange={(e) =>
            setFormData({
              ...formData,
              countryId: e.target.value,
              regionId: "",
              socialChapterId: "",
            })
          }
          isRequired
          error={errors.countryId}
        />

        <FormSelect
          label="Region"
          options={regions}
          value={formData.regionId}
          onChange={(e) =>
            setFormData({
              ...formData,
              regionId: e.target.value,
              socialChapterId: "",
            })
          }
          disabled={!formData.countryId}
          isRequired
          error={errors.regionId}
        />

        <FormSelect
          label="Chapter"
          options={chapters}
          value={formData.socialChapterId}
          onChange={(e) =>
            setFormData({
              ...formData,
              socialChapterId: e.target.value,
            })
          }
          disabled={!formData.regionId}
          isRequired
          error={errors.socialChapterId}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Referred By"
          placeholder="enter the referred name"
          value={formData.referredBy || ""}
          onChange={(e) =>
            setFormData({ ...formData, referredBy: e.target.value })
          }
        />

        <FormInput
          label="Area"
          placeholder="enter the location/Area"
          value={formData.area || ""}
          onChange={(e) =>
            setFormData({ ...formData, area: e.target.value })
          }
        />
      </div>

      <div className="flex gap-3">
        <button className="px-8 py-3 bg-[#D85D27] text-white rounded-lg">
          {submitButtonText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 bg-gray-700 text-white rounded-lg"
          >
            {cancelButtonText}
          </button>
        )}
      </div>
    </form>
  );
}

export default VolunteerForm;
