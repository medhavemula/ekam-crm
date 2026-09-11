import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import FormTextarea from "../forms/FormTextarea";
import { useCreateGivenOpportunityMutation } from "../../services/opportunityApi";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useToast } from "../../components/toast/ToastProvider";

export interface AddBOGModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string; // Pre-selected user ID if coming from profile
  recipientName?: string; // Pre-selected user name if coming from profile
}

interface BusinessOpportunityFormData {
  receiverId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  topic: string;
  comments: string;
}

const AddBOGModal: React.FC<AddBOGModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<BusinessOpportunityFormData>({
    receiverId: recipientId || "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    topic: "",
    comments: "",
  });

  // Inline validation state
  const [errors, setErrors] = useState<{ contactName?: string; contactPhone?: string; contactEmail?: string }>({});

  const validateEmail = (email: string) => {
    // simple RFC5322-like pattern for common cases
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(email);
  };

  const validateFields = () => {
    const next: { contactName?: string; contactPhone?: string; contactEmail?: string } = {};
    if (!formData.contactName.trim()) {
      next.contactName = "Name is required";
    }
    if (!formData.contactPhone.trim()) {
      next.contactPhone = "Phone is required";
    } else if (!/^\d+$/.test(formData.contactPhone)) {
      next.contactPhone = "Phone must contain digits only";
    }
    if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
      next.contactEmail = "Enter a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Fetch my connections for member selection
  const { data: connectionsRes } = useConnectionsListQuery({ 
    type: "my", 
    limit: 20,
    q: searchTerm.length >= 2 ? searchTerm : undefined,
  });

  const connections = (connectionsRes?.data ?? []) as Array<ConnectionCardApi>;
  const memberOptions = connections.map((c) => ({
    value: c.user.id,
    label: `${c.user.name} - ${c.user.chapter || 'No Chapter'}`,
  }));

  // Create mutation
  const [createOpportunity, { isLoading: isCreating, error: createError }] =
    useCreateGivenOpportunityMutation();

  const handleSubmit = async () => {
    if (!formData.receiverId) {
      showToast({ title: "Member is required", description: "Please select the receiver member.", kind: "error" });
      return;
    }
    if (!validateFields()) {
      showToast({ title: "Please fix validation errors", kind: "error" });
      return;
    }
    
    try {
      await createOpportunity({
        receiverId: recipientId || formData.receiverId, // Use recipientId if available, otherwise form value
        givenAt: new Date().toISOString(),
        contact: {
          name: formData.contactName,
          email: formData.contactEmail || undefined,
          phone: formData.contactPhone || undefined,
        },
        address: formData.address || undefined,
        topic: formData.topic || undefined,
        comments: formData.comments || undefined,
      }).unwrap();
      
      showToast({ 
        title: "Opportunity recorded", 
        description: "Business opportunity given has been added.", 
        kind: "success" 
      });
      handleClose();
    } catch (err) {
      console.error("Failed to create opportunity:", err);
      showToast({ title: "Failed to add opportunity", description: "Please try again.", kind: "error" });
    }
  };

  const handleClose = () => {
    setFormData({
      receiverId: recipientId || "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      topic: "",
      comments: "",
    });
    setErrors({});
    setSearchTerm("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--ov-scrim,rgba(0,0,0,0.55))] backdrop-blur-sm px-4 pt-30 pb-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[calc(100vh-8rem)] relative flex flex-col my-auto">
        <GradientContainer className="flex flex-col min-h-0 h-full" innerClassName="flex flex-col min-h-0">
          <div className="rounded-2xl flex flex-col min-h-0 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--ov-line-faint)] px-6 py-4 flex-shrink-0">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
                <h2 className="ekam-figure truncate text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                  Add Business Opportunity Given
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {createError && (
                <div className="mb-4 rounded-xl bg-[var(--ov-danger-wash)] p-3 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-danger)]">
                  Failed to create opportunity. Please try again.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Received By (Member) */}
                {recipientId && recipientName ? (
                  // Show as readonly input when recipient is pre-selected
                  <div className="md:col-span-2">
                    <FormInput
                      label="Received By (Member)"
                      value={recipientName}
                      disabled={true}
                    />
                  </div>
                ) : (
                  // Show as dropdown when no recipient is pre-selected
                  <div className="md:col-span-2">
                    <FormSelect
                      label="Received By (Member)"
                      isRequired
                      placeholder="Select a member"
                      options={memberOptions}
                      value={formData.receiverId}
                      onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                      searchable
                      searchPlaceholder="Search member"
                      onSearchChange={setSearchTerm}
                    />
                  </div>
                )}

                {/* Contact Name */}
                <FormInput
                  label="Contact Name"
                  isRequired
                  placeholder="Enter contact name"
                  value={formData.contactName}
                  onChange={(e) => {
                    const v = e.target.value || "";
                    const cleaned = v.replace(/[^A-Za-z ]/g, "");
                    setFormData({ ...formData, contactName: cleaned });
                    setErrors((prev) => ({ ...prev, contactName: !cleaned.trim() ? "Name is required" : undefined }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      contactName: !formData.contactName.trim() ? "Name is required" : undefined,
                    }))
                  }
                  error={errors.contactName}
                />

                {/* Contact Phone */}
                <FormInput
                  label="Contact Phone"
                  type="tel"
                  placeholder="Enter contact phone"
                  value={formData.contactPhone}
                  onChange={(e) => {
                    // Keep digits only
                    const v = (e.target.value || "").replace(/[^0-9]/g, "");
                    setFormData({ ...formData, contactPhone: v });
                    setErrors((prev) => ({
                      ...prev,
                      contactPhone: !v.trim() ? "Phone is required" : !/^\d+$/.test(v) ? "Phone must contain digits only" : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      contactPhone: !formData.contactPhone.trim()
                        ? "Phone is required"
                        : !/^\d+$/.test(formData.contactPhone)
                          ? "Phone must contain digits only"
                          : undefined,
                    }))
                  }
                  error={errors.contactPhone}
                />

                {/* Contact Email */}
                <FormInput
                  label="Contact Email"
                  type="email"
                  placeholder="Enter contact email"
                  value={formData.contactEmail}
                  onChange={(e) => {
                    const v = e.target.value || "";
                    setFormData({ ...formData, contactEmail: v });
                    setErrors((prev) => ({
                      ...prev,
                      contactEmail: v && !validateEmail(v) ? "Enter a valid email" : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      contactEmail:
                        formData.contactEmail && !validateEmail(formData.contactEmail)
                          ? "Enter a valid email"
                          : undefined,
                    }))
                  }
                  error={errors.contactEmail}
                />

                {/* Address */}
                <div className="md:col-span-2">
                  <FormInput
                    label="Address"
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Topic */}
                <div className="md:col-span-2">
                  <FormInput
                    label="Topic"
                    placeholder="Enter topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  />
                </div>

                {/* Looking for */}
                <div className="md:col-span-2">
                  <FormTextarea
                    label="Looking for"
                    placeholder="Enter what you're looking for"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-[color:var(--ov-line-faint)] px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-fill-subtle)] px-6 text-[13px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  (!recipientId && !formData.receiverId) ||
                  !formData.contactName ||
                  !formData.contactPhone ||
                  !!errors.contactName ||
                  !!errors.contactPhone ||
                  !!errors.contactEmail ||
                  isCreating
                }
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
};

export default AddBOGModal;
