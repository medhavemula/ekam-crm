import React, { useState, useEffect } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import { useToast } from "../../components/toast/ToastProvider";
import { useCreateUserSocialVolunteerMutation } from "../../services/social";
import type { UserSocialVolunteerItem } from "../../services/social/volunteersApi";

export interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  eventId: string;
  eventName?: string;
  eventType?: string;
  eventDate?: string;
  socialChapterId?: string;
  countryId?: string;
  regionId?: string;
  /** Pass to switch modal into edit mode */
  editingVolunteer?: (UserSocialVolunteerItem & { countryId?: string; regionId?: string }) | null;
  /** Required when editingVolunteer is set */
  onEditSubmit?: (form: Record<string, string>) => Promise<{ errors?: Record<string, string> } | void>;
  isUpdating?: boolean;
}

interface VolunteerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  attendance: string;
  city: string;
  state: string;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Select category" },
  { value: "GENERAL", label: "General" },
  { value: "EVENT_COORDINATOR", label: "Event Coordinator" },
  { value: "FUNDRAISER", label: "Fundraiser" },
  { value: "OUTREACH", label: "Outreach" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "OTHER", label: "Other" },
];

const ATTENDANCE_OPTIONS = [
  { value: "", label: "Select attendance" },
  { value: "PENDING", label: "Pending" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
];

const AddVolunteerModal: React.FC<AddVolunteerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventId,
  eventName,
  eventType,
  eventDate,
  socialChapterId,
  countryId,
  regionId,
  editingVolunteer,
  onEditSubmit,
  isUpdating = false,
}) => {
  const { showToast } = useToast();
  const isEditing = !!editingVolunteer;

  const [formData, setFormData] = useState<VolunteerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    category: "",
    attendance: "",
    city: "",
    state: "",
  });

  const [errors, setErrors] = useState<Partial<VolunteerFormData>>({});

  const [createVolunteer, { isLoading: isCreating }] =
    useCreateUserSocialVolunteerMutation();

  const isSaving = isEditing ? isUpdating : isCreating;

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    if (editingVolunteer) {
      setFormData({
        firstName:
          editingVolunteer.firstName ||
          editingVolunteer.name?.split(" ")[0] ||
          "",
        lastName:
          editingVolunteer.lastName ||
          editingVolunteer.name?.split(" ").slice(1).join(" ") ||
          "",
        email: editingVolunteer.email || "",
        phone: editingVolunteer.phone || "",
        category: editingVolunteer.category || "",
        attendance: editingVolunteer.attendance || "PENDING",
        city: editingVolunteer.city || "",
        state: editingVolunteer.state || "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        category: "",
        attendance: "",
        city: "",
        state: "",
      });
    }
    setErrors({});
  }, [isOpen, editingVolunteer]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);

  const validate = (): boolean => {
    const next: Partial<VolunteerFormData> = {};
    if (!formData.firstName.trim()) next.firstName = "First name is required";
    if (formData.email && !validateEmail(formData.email))
      next.email = "Enter a valid email";
    if (formData.phone && !/^\d+$/.test(formData.phone))
      next.phone = "Phone must contain digits only";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // ── Edit mode ──
    if (isEditing && onEditSubmit) {
      const result = await onEditSubmit({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        category: formData.category,
        attendance: formData.attendance,
        city: formData.city,
        state: formData.state,
      });
      if (result?.errors) {
        const firstMsg = Object.values(result.errors)[0];
        if (firstMsg) showToast({ title: firstMsg, kind: "error" });
      }
      return;
    }

    // ── Create mode ──
    if (!socialChapterId) {
      showToast({ title: "Missing chapter information for this event.", kind: "error" });
      return;
    }
    if (!countryId) {
      showToast({ title: "Country information missing for this event.", kind: "error" });
      return;
    }
    if (!regionId) {
      showToast({ title: "Region information missing for this event.", kind: "error" });
      return;
    }

    try {
      await createVolunteer({
        socialChapterId,
        countryId,
        regionId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        category: (formData.category as any) || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        eventId,
        eventName,
        eventType,
        eventDate,
      }).unwrap();

      showToast({
        title: "Volunteer added",
        description: "Volunteer has been successfully recorded.",
        kind: "success",
      });
      await onSuccess?.();
      handleClose();
    } catch (err: any) {
      const message =
        err?.data?.errors?.[0]?.message ||
        err?.data?.message ||
        "Failed to add volunteer.";
      showToast({ title: "Error", description: message, kind: "error" });
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      category: "",
      attendance: "",
      city: "",
      state: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = isEditing ? "Edit Volunteer" : "Add Volunteer";
  const submitLabel = isSaving ? "Submitting..." : isEditing ? "Update" : "Submit";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-30 pb-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[calc(100vh-8rem)] relative flex flex-col my-auto">
        <GradientContainer
          className="flex flex-col min-h-0 h-full"
          innerClassName="flex flex-col min-h-0"
        >
          <div className="rounded-2xl flex flex-col min-h-0 flex-1">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-white">{modalTitle}</h2>
              <button
                onClick={handleClose}
                className="text-orange-500 hover:text-orange-600 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ── Body (scrollable) ── */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* First Name */}
                <FormInput
                  label="First Name"
                  isRequired
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^A-Za-z ]/g, "");
                    setFormData({ ...formData, firstName: v });
                    if (errors.firstName)
                      setErrors((prev) => ({ ...prev, firstName: undefined }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      firstName: !formData.firstName.trim()
                        ? "First name is required"
                        : undefined,
                    }))
                  }
                  error={errors.firstName}
                />

                {/* Last Name */}
                <FormInput
                  label="Last Name"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value.replace(/[^A-Za-z ]/g, ""),
                    })
                  }
                />

                {/* Email */}
                <FormInput
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, email: v });
                    setErrors((prev) => ({
                      ...prev,
                      email:
                        v && !validateEmail(v) ? "Enter a valid email" : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      email:
                        formData.email && !validateEmail(formData.email)
                          ? "Enter a valid email"
                          : undefined,
                    }))
                  }
                  error={errors.email}
                />

                {/* Phone */}
                <FormInput
                  label="Phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, phone: v });
                    setErrors((prev) => ({
                      ...prev,
                      phone:
                        v && !/^\d+$/.test(v)
                          ? "Phone must contain digits only"
                          : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      phone:
                        formData.phone && !/^\d+$/.test(formData.phone)
                          ? "Phone must contain digits only"
                          : undefined,
                    }))
                  }
                  error={errors.phone}
                />

                {/* Category */}
                <FormSelect
                  label="Category"
                  placeholder="Select category"
                  options={CATEGORY_OPTIONS}
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />

                {isEditing && (
                  <FormSelect
                    label="Attendance"
                    placeholder="Select attendance"
                    options={ATTENDANCE_OPTIONS}
                    value={formData.attendance}
                    onChange={(e) =>
                      setFormData({ ...formData, attendance: e.target.value })
                    }
                  />
                )}

                {/* City */}
                <FormInput
                  label="City"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />

                {/* State */}
                <FormInput
                  label="State"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />

              </div>
            </div>

            {/* ── Footer (pinned) ── */}
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!formData.firstName.trim() || isSaving}
                className="px-8 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLabel}
              </button>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="px-8 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>

          </div>
        </GradientContainer>
      </div>
    </div>
  );
};

export default AddVolunteerModal;
