import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import VisitorForm from "../../components/forms/VisitorForm";
import type { VisitorFormData } from "../../components/forms/VisitorForm";
import { useCreateVisitorMutation } from "../../services/visitorsApi";
import { useMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";

export default function AddVisitorPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Mike");
  const { showToast } = useToast();

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Create visitor mutation
  const [createVisitor, { isLoading }] = useCreateVisitorMutation();

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

  const handleSubmit = async (data: VisitorFormData) => {
    try {
      // Use the chapter from the form (now it's a valid ObjectId from the API)
      // Or fallback to user's chapter if not provided
      const chapterId = data.registrationChapter || meRes?.data?.basicInfo?.chapter;
      
      if (!chapterId) {
        showToast({ title: "Missing chapter", description: "Please select a chapter.", kind: "error" });
        return;
      }

      // Build visitDate ISO using selected date + current local time.
      // This avoids double-applying timezone conversions.
      const picked = new Date(data.visitDate);
      const now = new Date();
      const visitDate = new Date(
        picked.getFullYear(),
        picked.getMonth(),
        picked.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );
      const visitDateISO = visitDate.toISOString();

      // Map form data to API request
      // registrationType now comes directly from API as "REGISTER_MYSELF" or "REGISTER_SOMEONE_ELSE"
      await createVisitor({
        type: data.registrationType as "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE",
        chapterId: chapterId,
        visitDate: visitDateISO,
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        phone: data.phoneNumber || undefined,
        email: data.emailAddress || undefined,
        company: data.companyName || undefined,
        category: data.category === "others" ? data.categoryCustom : data.category || undefined,
        address: {
          street: data.streetAddress || undefined,
        },
      }).unwrap();
      navigate("/business/visitors", {
        replace: true,
        state: {
          toast: {
            title: "Visitor added",
            description: "The visitor has been created successfully.",
            kind: "success",
          },
        },
      });
    } catch (err: any) {
      const description =
        (err && typeof err === "object" && "data" in err && (err as any).data?.message) ||
        (typeof err === "string" ? err : "") ||
        (err && typeof err === "object" && "error" in err ? (err as any).error : "") ||
        "Please try again.";
      console.error("Failed to create visitor:", err);
      showToast({ title: "Failed to add visitor", description, kind: "error" });
    }
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Visitors", onClick: () => navigate("/business/visitors") },
    { label: "Add Visitor" },
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
            {/* Error Display */}
            <VisitorForm
              onSubmit={handleSubmit}
              submitButtonText={isLoading ? "Submitting..." : "Submit"}
              lockedChapterId={meRes?.data?.basicInfo?.chapter}
              lockedChapterName={meRes?.data?.basicInfo?.chapterAnswer}
              onCancel={() => navigate("/business/visitors")}
              cancelButtonText="Cancel"
            />
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
