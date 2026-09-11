import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import VisitorForm from "../../../components/forms/VisitorForm";
import type { VisitorFormData } from "../../../components/forms/VisitorForm";
import { useUpdateEdVisitorMutation, useGetEdVisitorQuery } from "../../../services/ed";
import { useToast } from "../../../components/toast/ToastProvider";

export default function EditVisitorPage() {
  const navigate = useNavigate();
  const { visitorId } = useParams<{ visitorId: string }>();
  const userRole = useSelector((state: RootState) => state.auth.role);
  const [userName, setUserName] = useState("Admin");
  const { showToast } = useToast();

  // Check if user is a director role (admin view)
  const showAdminView = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

  // Get visitor data using single GET API
  const { data: visitorData, isLoading: isLoadingVisitor, error: visitorError } = useGetEdVisitorQuery(
    visitorId!,
    { skip: !visitorId || !showAdminView }
  );

  // Update visitor mutation using PATCH API
  const [updateVisitor, { isLoading: isUpdating, error: updateError }] = useUpdateEdVisitorMutation();

  // Note: Dropdown data fetched but not used in current implementation
  // const { data: countriesRes } = useListCountriesQuery({ limit: 200 });
  // const { data: regionsRes } = useGetEdRegionsQuery();
  // const { data: chaptersRes } = useGetEdChaptersQuery({ limit: 200 });
  
  // Update navbar name
  useEffect(() => {
    const name = userRole === "EXECUTIVE_DIRECTOR" ? "Executive Director" : 
                 userRole === "ED_TEAM" ? "ED Team" :
                 userRole === "REGIONAL_DIRECTOR" ? "Regional Director" :
                 userRole === "ASSISTANT_REGIONAL_DIRECTOR" ? "Assistant Regional Director" : "Admin";
    setUserName(name);
  }, [userRole]);

  // Map visitor data to form format (flat structure like business version)
  const visitor = visitorData?.data || visitorData;
  const visitorAny = visitor as any; // Type assertion to handle API response differences
  
  const initialData: VisitorFormData | undefined = visitor
    ? {
        registrationType: visitorAny.type || "REGISTER_SOMEONE_ELSE",
        registrationChapter: visitorAny.chapterId || visitorAny.chapter || "",
        visitDate: visitorAny.visitDate ? new Date(visitorAny.visitDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0], // Convert API visitDate to proper format
        firstName: visitorAny.person?.firstName || visitorAny.firstName || "",
        lastName: visitorAny.person?.lastName || visitorAny.lastName || "",
        category: visitorAny.person?.category || visitorAny.category || "",
        phoneNumber: visitorAny.person?.phone || visitorAny.phone || "",
        emailAddress: visitorAny.person?.email || visitorAny.email || "",
        companyName: visitorAny.person?.company || visitorAny.company || "",
        streetAddress: visitorAny.person?.address?.street || visitorAny.notes || "",
        country: visitorAny.countryName || visitorAny.person?.address?.country || "",
        countryId: visitorAny.countryId || "",
        regionId: visitorAny.regionId || "",
        chapterId: visitorAny.chapterId || "",
      }
    : undefined;

  const handleSubmit = async (data: VisitorFormData) => {
    if (!visitorId) return;
    try {
      // Map form data to update request format (match backend API structure)
      await updateVisitor({
        visitorId,
        data: {
          type: data.registrationType as "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE",
          chapterId: data.registrationChapter || undefined,
          visitDate: data.visitDate || undefined,
          person: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phoneNumber,
            email: data.emailAddress,
            company: data.companyName,
            category: data.category === "others" ? (data.categoryCustom || "") : (data.category || ""),
            address: {
              street: data.streetAddress,
            },
          },
        },
      }).unwrap();
      
      showToast({ 
        title: "Visitor updated", 
        description: "The visitor has been updated successfully.", 
        kind: "success" 
      });
      
      navigate("/admin/visitors");
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
    { label: "Dashboard", onClick: () => navigate("/admin/dashboard") },
    { label: "Visitors", onClick: () => navigate("/admin/visitors") },
    { label: "Edit Visitor" },
  ];

  // Check if user has admin access
  if (!showAdminView) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p>You don't have permission to edit visitors.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingVisitor) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading visitor details...</p>
        </div>
      </div>
    );
  }

  // Check if visitor data is available
  if (visitorError || !visitor) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Visitor Not Found</h2>
          <p>The visitor data could not be found. Please go back and try again.</p>
          <button 
            onClick={() => navigate("/admin/visitors")}
            className="mt-4 px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Form Container */}
        <GradientContainer>
          <div className="p-4 md:p-6">
            {/* Update Error */}
            {updateError && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400">
                Failed to update visitor. Please try again.
              </div>
            )}

            {/* Form */}
            {initialData && (
              <VisitorForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText={isUpdating ? "Updating..." : "Update"}
                isEditMode={true}
                onCancel={() => navigate("/admin/visitors")}
                cancelButtonText="Cancel"
              />
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
