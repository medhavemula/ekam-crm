import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import VisitorForm from "../../components/forms/VisitorForm";
import type { VisitorFormData } from "../../components/forms/VisitorForm";
import { useGetVisitorQuery, useUpdateVisitorMutation } from "../../services/visitorsApi";
import { useMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";

export default function EditVisitorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [userName, setUserName] = useState("Mike");
  const { showToast } = useToast();

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Fetch visitor details
  const { data: visitorRes, isLoading, error: visitorError } = useGetVisitorQuery(id || "", {
    skip: !id,
  });

  // Update visitor mutation
  const [updateVisitor, { isLoading: isUpdating, error: updateError }] = useUpdateVisitorMutation();

  // Check authentication
  useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  // Update navbar name when available
  useEffect(() => {
    const name = meRes?.data?.name;
    if (name) setUserName(name);
  }, [meRes]);

  const visitor = visitorRes?.data;

  const initialData: VisitorFormData | undefined = visitor
    ? {
        registrationType: visitor.type, // Now using the API value directly
        registrationChapter: visitor.chapterId,
        visitDate: new Date(visitor.visitDate).toISOString().split("T")[0],
        firstName: visitor.firstName,
        lastName: visitor.lastName || "",
        category: visitor.category || "",
        phoneNumber: visitor.phone || "",
        emailAddress: visitor.email || "",
        companyName: visitor.company || "",
        streetAddress: visitor.address?.street || "",
        country: visitor.address?.country || "",
        countryId: visitor.countryId || "",
        regionId: visitor.regionId || "",
      }
    : undefined;

  const handleSubmit = async (data: VisitorFormData) => {
    if (!id) return;
    try {
      // Map form data to update request format
      await updateVisitor({
        id,
        body: {
          type: data.registrationType as "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE",
          chapterId: data.registrationChapter || undefined,
          visitDate: data.visitDate || undefined,
          firstName: data.firstName,
          lastName: data.lastName || undefined,
          phone: data.phoneNumber || undefined,
          email: data.emailAddress || undefined,
          company: data.companyName || undefined,
          category: data.category === "others" ? data.categoryCustom : data.category || undefined,
          address: {
            street: data.streetAddress || undefined,
          },
        },
      }).unwrap();
      
      showToast({ 
        title: "Visitor updated", 
        description: "The visitor has been updated successfully.", 
        kind: "success" 
      });
      
      navigate("/business/visitors");
    } catch (err: any) {
      const description =
        (err && typeof err === "object" && "data" in err && (err as any).data?.message) ||
        (typeof err === "string" ? err : "") ||
        (err && typeof err === "object" && "error" in err ? (err as any).error : "") ||
        "Please try again.";
      console.error("Failed to update visitor:", err);
      showToast({ title: "Failed to update visitor", description, kind: "error" });
    }
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Visitors", onClick: () => navigate("/business/visitors") },
    { label: "Edit Visitor" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Form Container */}
        <GradientContainer>
          <div className="p-4 md:p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="p-8 text-center text-gray-400">Loading visitor details...</div>
            )}
            
            {/* Error State */}
            {visitorError && (
              <div className="p-8 text-center text-red-400">
                Failed to load visitor details. Please try again.
              </div>
            )}

            {/* Update Error */}
            {updateError && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400">
                Failed to update visitor. Please try again.
              </div>
            )}

            {/* Form */}
            {!isLoading && !visitorError && initialData && (
              <VisitorForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText={isUpdating ? "Updating..." : "Update"}
                isEditMode={true}
                onCancel={() => navigate("/business/visitors")}
                cancelButtonText="Cancel"
              />
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
