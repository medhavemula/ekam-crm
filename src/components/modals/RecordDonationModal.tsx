import React, { useState, useEffect } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import { useToast } from "../../components/toast/ToastProvider";
import {
  useCreateEventDonationMutation,
  useUpdateEventDonationMutation,
} from "../../services/social";

export interface RecordDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  eventId: string;
  /** Pass when editing an existing donation */
  editingDonation?: {
    id: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
    amount: number;
    currency: string;
    note?: string;
  } | null;
  /** Pass when recording a new donation pre-linked to a member */
  donationTarget?: {
    donorUserId?: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
  } | null;
}

interface DonationFormData {
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: string;
  currency: string;
  note: string;
}

const RecordDonationModal: React.FC<RecordDonationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventId,
  editingDonation,
  donationTarget,
}) => {
  const { showToast } = useToast();

  const [formData, setFormData] = useState<DonationFormData>({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    amount: "",
    currency: "INR",
    note: "",
  });

  const [errors, setErrors] = useState<Partial<DonationFormData>>({});

  const [createDonation, { isLoading: isCreating }] = useCreateEventDonationMutation();
  const [updateDonation, { isLoading: isUpdating }] = useUpdateEventDonationMutation();
  const isSaving = isCreating || isUpdating;
  const isEditing = !!editingDonation;

  // Populate form when editing or when a donationTarget is provided
  useEffect(() => {
    if (!isOpen) return;
    if (editingDonation) {
      setFormData({
        donorName: editingDonation.donorName || "",
        donorEmail: editingDonation.donorEmail || "",
        donorPhone: editingDonation.donorPhone || "",
        amount: String(editingDonation.amount ?? ""),
        currency: editingDonation.currency || "INR",
        note: editingDonation.note || "",
      });
    } else if (donationTarget) {
      setFormData({
        donorName: donationTarget.donorName || "",
        donorEmail: donationTarget.donorEmail || "",
        donorPhone: donationTarget.donorPhone || "",
        amount: "",
        currency: "INR",
        note: "",
      });
    } else {
      setFormData({
        donorName: "",
        donorEmail: "",
        donorPhone: "",
        amount: "",
        currency: "INR",
        note: "",
      });
    }
    setErrors({});
  }, [isOpen, editingDonation, donationTarget]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);

  const validate = (): boolean => {
    const next: Partial<DonationFormData> = {};
    if (!formData.donorName.trim()) next.donorName = "Donor name is required";
    const amountNum = Number(formData.amount);
    if (!formData.amount || !Number.isFinite(amountNum) || amountNum <= 0)
      next.amount = "Enter a positive amount";
    if (formData.donorEmail && !validateEmail(formData.donorEmail))
      next.donorEmail = "Enter a valid email";
    if (formData.donorPhone && !/^\d+$/.test(formData.donorPhone))
      next.donorPhone = "Phone must contain digits only";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const amountNum = Number(formData.amount);

    try {
      if (isEditing && editingDonation) {
        await updateDonation({
          donationId: editingDonation.id,
          eventId,
          donorName: formData.donorName.trim(),
          donorEmail: formData.donorEmail.trim() || undefined,
          donorPhone: formData.donorPhone.trim() || undefined,
          amount: amountNum,
          currency: formData.currency.trim() || "INR",
          note: formData.note.trim() || undefined,
        }).unwrap();
        showToast({
          title: "Donation updated",
          description: `${formData.currency || "INR"} ${amountNum.toFixed(2)} saved.`,
          kind: "success",
        });
      } else {
        await createDonation({
          eventId,
          donorUserId: donationTarget?.donorUserId,
          donorName: formData.donorName.trim(),
          donorEmail: formData.donorEmail.trim() || undefined,
          donorPhone: formData.donorPhone.trim() || undefined,
          amount: amountNum,
          currency: formData.currency.trim() || "INR",
          note: formData.note.trim() || undefined,
        }).unwrap();
        showToast({
          title: "Donation recorded",
          description: `${formData.currency || "INR"} ${amountNum.toFixed(2)} added.`,
          kind: "success",
        });
      }
      await onSuccess?.();
      handleClose();
    } catch (err: any) {
      const message =
        err?.data?.errors?.[0]?.message ||
        err?.data?.message ||
        "Failed to save donation.";
      showToast({ title: "Error", description: message, kind: "error" });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const isDonorNameDisabled = isEditing ? false : !!donationTarget?.donorUserId;

  const modalTitle = isEditing
    ? "Edit Donation"
    : donationTarget?.donorName
    ? `Donate as ${donationTarget.donorName}`
    : "Record Donation";

  const isSubmitDisabled =
    !formData.donorName.trim() ||
    !formData.amount ||
    Number(formData.amount) <= 0 ||
    isSaving;

  if (!isOpen) return null;

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

                {/* Donor Name */}
                <div className="md:col-span-2">
                  <FormInput
                    label="Donor"
                    isRequired
                    placeholder="Enter donor name"
                    value={formData.donorName}
                    disabled={isDonorNameDisabled}
                    onChange={(e) => {
                      setFormData({ ...formData, donorName: e.target.value });
                      if (errors.donorName)
                        setErrors((prev) => ({ ...prev, donorName: undefined }));
                    }}
                    onBlur={() =>
                      setErrors((prev) => ({
                        ...prev,
                        donorName: !formData.donorName.trim()
                          ? "Donor name is required"
                          : undefined,
                      }))
                    }
                    error={errors.donorName}
                  />
                </div>

                {/* Email */}
                <FormInput
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.donorEmail}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, donorEmail: v });
                    setErrors((prev) => ({
                      ...prev,
                      donorEmail: v && !validateEmail(v) ? "Enter a valid email" : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      donorEmail:
                        formData.donorEmail && !validateEmail(formData.donorEmail)
                          ? "Enter a valid email"
                          : undefined,
                    }))
                  }
                  error={errors.donorEmail}
                />

                {/* Phone */}
                <FormInput
                  label="Phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.donorPhone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, donorPhone: v });
                    setErrors((prev) => ({
                      ...prev,
                      donorPhone: v && !/^\d+$/.test(v) ? "Phone must contain digits only" : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      donorPhone:
                        formData.donorPhone && !/^\d+$/.test(formData.donorPhone)
                          ? "Phone must contain digits only"
                          : undefined,
                    }))
                  }
                  error={errors.donorPhone}
                />

                {/* Amount */}
                <FormInput
                  label="Amount"
                  isRequired
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, amount: v });
                    const num = Number(v);
                    setErrors((prev) => ({
                      ...prev,
                      amount:
                        v && (!Number.isFinite(num) || num <= 0)
                          ? "Enter a positive amount"
                          : undefined,
                    }));
                  }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      amount:
                        !formData.amount ||
                        !Number.isFinite(Number(formData.amount)) ||
                        Number(formData.amount) <= 0
                          ? "Enter a positive amount"
                          : undefined,
                    }))
                  }
                  error={errors.amount}
                />

                {/* Currency */}
                <FormInput
                  label="Currency"
                  placeholder="INR"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                />

                {/* Note */}
                <div className="md:col-span-2">
                  <FormInput
                    label="Note"
                    placeholder="Optional remark"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>

              </div>
            </div>

            {/* ── Footer (pinned) ── */}
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="px-8 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Submitting..." : isEditing ? "Update" : "Submit"}
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

export default RecordDonationModal;
