import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import FormInput from "../../../components/forms/FormInput";
import FormTextarea from "../../../components/forms/FormTextarea";
import { useCreateClosedOpportunityMutation } from "../../../services/opportunityApi";
import { useMeQuery } from "../../../services/authApi";
import { useToast } from "../../../components/toast/ToastProvider";

interface BusinessClosedFormData {
  amount: string;
  comments: string;
  phone: string;
}

export default function AddBusinessClosedPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Mike");
  const { showToast } = useToast();

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Create mutation
  const [createClosed, { isLoading: isCreating, error: createError }] =
    useCreateClosedOpportunityMutation();

  // Check authentication
  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  // Update navbar name when available
  React.useEffect(() => {
    const name = meRes?.data?.name;
    if (name) setUserName(name);
  }, [meRes]);

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Business Closed", onClick: () => navigate("/business/business-received") },
    { label: "Add Business Closed" },
  ];

  const [formData, setFormData] = useState<BusinessClosedFormData>({
    amount: "",
    comments: "",
    phone: "",
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    if (!formData.phone.trim() || !formData.comments.trim()) {
      showToast({
        title: "Missing details",
        description: "Phone and comments are required for a manual Business Closed entry.",
        kind: "error",
      });
      return;
    }
    try {
      await createClosed({
        amount: amountNum,
        closedAt: new Date().toISOString(),
        contact: {
          phone: formData.phone || undefined,
        },
        comments: formData.comments || undefined,
      }).unwrap();
      navigate("/business/business-received", {
        replace: true,
        state: {
          toast: {
            title: "Business Closed recorded",
            description: "The Business Closed entry has been added.",
            kind: "success",
          },
        },
      });
    } catch (err: any) {
      const description =
        (err && typeof err === "object" && (err as any).data?.message) ||
        (typeof err === "string" ? err : "") ||
        (err && typeof err === "object" && (err as any).error) ||
        "Please try again.";
      console.error("Failed to create closed opportunity:", err);
      showToast({ title: "Failed to add Business Closed", description, kind: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />
      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="max-w-5xl mx-auto">
          <GradientContainer>
            <div className="rounded-2xl p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Display */}
                {createError && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400">
                    Failed to create closed opportunity. Please try again.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {/* Amount */}
                    <FormInput
                      label="Amount"
                      type="number"
                      isRequired
                      placeholder="Enter Business Closed amount"
                      value={formData.amount}
                      min={0}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (text.includes("-")) {
                          e.preventDefault();
                          const cleaned = text.replace(/-/g, "");
                          const target = e.target as HTMLInputElement;
                          const start = target.selectionStart ?? target.value.length;
                          const end = target.selectionEnd ?? target.value.length;
                          const newValue = target.value.slice(0, start) + cleaned + target.value.slice(end);
                          setFormData({ ...formData, amount: newValue });
                        }
                      }}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value.replace(/-/g, "") })
                      }
                    />
                  </div>

                  <div>
                    {/* A manual entry is the only record of a deal with no referral
                        behind it, so the contact number and the note are part of it. */}
                    <FormInput
                      label="Phone"
                      isRequired
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D+/g, "");
                        setFormData({ ...formData, phone: onlyDigits });
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    {/* Comments */}
                    <FormTextarea
                      label="Comments"
                      isRequired
                      placeholder="Enter comments"
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={
                      !formData.amount ||
                      !formData.phone.trim() ||
                      !formData.comments.trim() ||
                      isCreating
                    }
                    className="flex-1 px-6 py-3 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/business/business-received")}
                    disabled={isCreating}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
