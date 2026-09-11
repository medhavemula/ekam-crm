import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormTextarea from "../../components/forms/FormTextarea";
import { useCreateGivenOpportunityMutation } from "../../services/opportunityApi";
import { useMeQuery } from "../../services/authApi";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useToast } from "../../components/toast/ToastProvider";

interface BusinessOpportunityFormData {
  receiverId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  topic: string;
  comments: string;
}

type ContactType = "self" | "others";

export default function AddBusinessOpportunityGivenPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Mike");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { showToast } = useToast();
  const [contactType, setContactType] = useState<ContactType>("self");

  // Debounce search term
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Fetch my connections for member selection
  const { data: connectionsRes } = useConnectionsListQuery({ 
    type: "my", 
    limit: 20,
    q: debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : undefined,
  });

  // Create mutation
  const [createOpportunity, { isLoading: isCreating, error: createError }] =
    useCreateGivenOpportunityMutation();

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

  // Auto-fill self data when component loads if "self" is default
  React.useEffect(() => {
    if (contactType === "self" && meRes?.data) {
      // Pre-fill with current user's data
      const userData = meRes.data as any; // Use any to handle the actual API response structure
      console.log("Auto-filling self data on load:", userData); // Debug log
      
      setFormData(prev => ({
        ...prev,
        contactName: userData.profile?.name || userData.name || "",
        contactPhone: userData.personal?.phone || userData.basicInfo?.phone || "",
        contactEmail: userData.personal?.email || userData.email || "",
        address: userData.basicInfo?.streetAddress || "",
      }));
    }
  }, [contactType, meRes]);

  // Handle contact type change
  const handleContactTypeChange = (type: ContactType) => {
    setContactType(type);
    
    if (type === "self" && meRes?.data) {
      // Pre-fill with current user's data
      const userData = meRes.data as any; // Use any to handle the actual API response structure
      console.log("User data for self-fill:", userData); // Debug log
      
      setFormData(prev => ({
        ...prev,
        contactName: userData.profile?.name || userData.name || "",
        contactPhone: userData.personal?.phone || userData.basicInfo?.phone || "",
        contactEmail: userData.personal?.email || userData.email || "",
        address: userData.basicInfo?.streetAddress || "",
      }));
    } else {
      // Clear contact fields for "others"
      setFormData(prev => ({
        ...prev,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        address: "",
      }));
    }
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Business Opportunity Given", onClick: () => navigate("/business/opportunity-given") },
    { label: "Add Business Opportunity Given" },
  ];

  const [formData, setFormData] = useState<BusinessOpportunityFormData>({
    receiverId: "",
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

  const connections = (connectionsRes?.data ?? []) as Array<ConnectionCardApi>;
  const memberOptions = connections.map((c) => ({
    value: c.user.id,
    label: `${c.user.name} - ${c.user.chapter || 'No Chapter'}`,
  }));

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
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
        receiverId: formData.receiverId,
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
      navigate("/business/opportunity-given", {
        replace: true,
        state: {
          toast: {
            title: "Opportunity recorded",
            description: "Business opportunity given has been added.",
            kind: "success",
          },
        },
      });
    } catch (err) {
      console.error("Failed to create opportunity:", err);
      showToast({ title: "Failed to add opportunity", description: "Please try again.", kind: "error" });
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
                    Failed to create opportunity. Please try again.
                  </div>
                )}

                {/* Contact Type Selection */}
                <div className="space-y-2">
                  <label className="block text-sm text-white/70 font-medium">
                    Contact Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="contactType"
                          value="self"
                          checked={contactType === "self"}
                          onChange={(e) => handleContactTypeChange(e.target.value as ContactType)}
                          className="w-5 h-5 appearance-none bg-transparent border-2 border-white rounded-full focus:outline-none"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        />
                        {contactType === "self" && (
                          <div 
                            className="absolute bg-[#D85D27] rounded-full pointer-events-none"
                            style={{ 
                              top: '4px', 
                              left: '4px', 
                              width: '12px', 
                              height: '12px'
                            }}
                          />
                        )}
                      </div>
                      <span className="text-white text-base font-medium">Self</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="contactType"
                          value="others"
                          checked={contactType === "others"}
                          onChange={(e) => handleContactTypeChange(e.target.value as ContactType)}
                          className="w-5 h-5 appearance-none bg-transparent border-2 border-white rounded-full focus:outline-none"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        />
                        {contactType === "others" && (
                          <div 
                            className="absolute bg-[#D85D27] rounded-full pointer-events-none"
                            style={{ 
                              top: '4px', 
                              left: '4px', 
                              width: '12px', 
                              height: '12px'
                            }}
                          />
                        )}
                      </div>
                      <span className="text-white text-base font-medium">Others</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    {/* Received By (Member) */}
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
                      disableClientSideFilter
                    />
                  </div>

                  <div>
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
                  </div>

                  <div>
                    {/* Contact Phone */}
                    <FormInput
                      label="Contact Phone"
                      type="tel"
                      placeholder="Enter contact phone"
                      value={formData.contactPhone}
                      isRequired
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
                  </div>

                  <div>
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
                  </div>

                  <div className="md:col-span-2">
                    {/* Address */}
                    <FormInput
                      label="Address"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    {/* Topic */}
                    <FormInput
                      label="Topic"
                      placeholder="Enter topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    {/* Looking for */}
                    <FormTextarea
                      label="Looking for"
                      placeholder="Enter what you're looking for"
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
                      !formData.receiverId ||
                      !formData.contactName ||
                      !formData.contactPhone ||
                      !!errors.contactName ||
                      !!errors.contactPhone ||
                      !!errors.contactEmail ||
                      isCreating
                    }
                    className="flex-1 px-6 py-3 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/business/opportunity-given")}
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
