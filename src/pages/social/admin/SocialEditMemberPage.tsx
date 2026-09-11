import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import { RegistrationStepper } from "../../../components/registration/RegistrationStepper";
import BasicInfoStep from "../../../components/registration/BasicInfoStep";
import { SocialStep } from "../../../components/registration/SocialStep";
import { useGetScUserActionsQuery, useUpdateSocialMemberMutation } from "../../../services/social/socialAdminDashboardApi";
import { useToast } from "../../../components/toast/ToastProvider";
import type { BasicInfoData, SocialData, FormErrors } from "../../../types/registration.types";
import type { RegistrationStep } from "../../../components/registration/RegistrationStepper";

export default function SocialEditMemberPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chapterId, userId } = useParams<{ chapterId?: string; userId: string }>();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const isPlatformMembersMode = location.pathname.includes("/social/admin/regional-board/platform-members");


  const [currentStep, setCurrentStep] = useState<RegistrationStep>("BASIC");
  const [errors, setErrors] = useState<FormErrors>({});

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    fullName: "",
    phoneNumber: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    profilePhoto: null,
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    countryId: "",
    regionId: "",
    chapterRegistering: "",
    chapterName: "",
    expectation: "",
    whenToJoin: "",
    moduleAccess: [],
  });

  const [socialData, setSocialData] = useState<SocialData>({
    name: "",
    socialCategory: [],
    hobbies: "",
    motivation: "",
    travelForEvents: "",
    socialChapter: "",
  });

  const { data: memberRes, isLoading, error } = useGetScUserActionsQuery(
    { userId: userId || "" },
    { skip: !userId }
  );

  const [updateSocialMember, { isLoading: isUpdating }] = useUpdateSocialMemberMutation();

  // Pre-populate form from API response
  useEffect(() => {
    if (!memberRes?.user) return;
    const raw = memberRes.user as any;

    const regionObj = raw.basicInfo?.region;
    const regionId = typeof regionObj === "object" ? regionObj?._id || "" : regionObj || "";
    const countryObj = raw.basicInfo?.country;
    const countryId = typeof countryObj === "object" ? countryObj?._id || "" : countryObj || "";

    setBasicInfo({
      fullName: raw.name || "",
      phoneNumber: raw.basicInfo?.phone || "",
      email: raw.email || "",
      gender: raw.basicInfo?.gender || "",
      dateOfBirth: raw.basicInfo?.dob ? new Date(raw.basicInfo.dob).toISOString().split('T')[0] : "",
      profilePhoto: null,
      profilePhotoUrl: raw.basicInfo?.profilePhotoUrl || raw.profilePhotoUrl || "",
      streetAddress: raw.basicInfo?.streetAddress || "",
      city: raw.basicInfo?.city || "",
      state: raw.basicInfo?.state || "",
      pincode: raw.basicInfo?.pincode || "",
      country: countryId,
      countryId,
      regionId,
      chapterRegistering: raw.basicInfo?.chapter || "",
      chapterName: raw.basicInfo?.chapterAnswer || "",
      expectation: raw.basicInfo?.expectation || "",
      whenToJoin: raw.basicInfo?.whenToJoin ? new Date(raw.basicInfo.whenToJoin).toISOString().split('T')[0] : "",
      moduleAccess: raw.moduleAccess?.social ? ["social"] : [],
    });

    const socialChapterObj = raw.social?.socialChapterId;
    const socialChapterId = typeof socialChapterObj === "object"
      ? socialChapterObj?._id || ""
      : socialChapterObj || "";

    setSocialData({
      name: raw.name || "",
      socialCategory: Array.isArray(raw.social?.socialCategory) ? raw.social.socialCategory : [],
      hobbies: raw.social?.hobbies || "",
      motivation: raw.social?.motivation || "",
      travelForEvents: raw.social?.travelForEvents || "",
      socialChapter: socialChapterId,
    });
  }, [memberRes]);

  const isPendingMember = memberRes?.user?.isApproved === false;

  const handleBasicInfoChange = (field: keyof BasicInfoData, value: any) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSocialChange = (field: keyof SocialData, value: any) => {
    setSocialData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleNext = () => {
    // Basic validation before moving to next step
    const newErrors: FormErrors = {};
    if (currentStep === "BASIC") {
      if (!basicInfo.fullName.trim()) newErrors.fullName = "Name is required";
      if (!basicInfo.phoneNumber.trim()) newErrors.phoneNumber = "Phone is required";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setCurrentStep("SOCIAL");
    }
  };

  const handleBack = () => {
    if (currentStep === "SOCIAL") setCurrentStep("BASIC");
  };

  const handleSubmit = async () => {
    if (!userId) return;

    // Validate social step
    const newErrors: FormErrors = {};
    if (!socialData.motivation.trim()) newErrors.motivation = "Motivation is required";
    if (!socialData.hobbies.trim()) newErrors.hobbies = "Hobbies are required";
    if (!socialData.socialCategory.length) newErrors.socialCategory = "Please select a category";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await updateSocialMember({
        userId,
        data: {
          name: basicInfo.fullName,
          basicInfo: {
            phone: basicInfo.phoneNumber,
            gender: basicInfo.gender,
            streetAddress: basicInfo.streetAddress,
            city: basicInfo.city,
            pincode: basicInfo.pincode,
            ...(basicInfo.dateOfBirth ? { dob: basicInfo.dateOfBirth } : {}),
            ...(basicInfo.whenToJoin ? { whenToJoin: basicInfo.whenToJoin } : {}),
            ...(basicInfo.countryId ? { country: basicInfo.countryId } : {}),
            ...(basicInfo.regionId ? { region: basicInfo.regionId } : {}),
          },
          moduleAccess: Array.isArray(basicInfo.moduleAccess) ? basicInfo.moduleAccess : [],
          social: {
            motivation: socialData.motivation,
            hobbies: socialData.hobbies,
            socialCategory: socialData.socialCategory,
            travelForEvents: socialData.travelForEvents,
            ...(socialData.socialChapter ? { socialChapterId: socialData.socialChapter } : {}),
          },
        },
      }).unwrap();

      if (result.success) {
        showToast({
          title: "Success",
          description: isPendingMember
            ? "Pending member updated successfully"
            : "Member updated successfully",
          kind: "success",
        });
        sessionStorage.setItem("refreshMemberData", "true");
        navigate(-1);
      } else {
        throw new Error(result.message || "Update failed");
      }
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to update member";
      showToast({ title: "Error", description: String(msg), kind: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar />
        <div className="text-red-400 p-6">Error loading member data.</div>
      </div>
    );
  }

  const isLastStep = currentStep === "SOCIAL";

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName="" />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Regional Board", onClick: () => navigate("/social/admin/regional-board") },
            {
              label: isPlatformMembersMode ? "Add Platform Member" : "Members",
              onClick: () =>
                navigate(
                  isPlatformMembersMode
                    ? "/social/admin/regional-board/platform-members"
                    : chapterId
                    ? `/social/admin/regional-board/chapter/${chapterId}/members`
                    : "/social/admin/regional-board"
                ),
            },
            {
              label: "View Profile",
              onClick: () => navigate(-1),
            },
            { label: isPendingMember ? "Edit Pending Member" : "Edit Member" },
          ]}
        />

        <div className="flex items-start justify-center p-4 md:p-6 py-8">
          <div className="w-full max-w-full shadow-2xl backdrop-blur">
            <GradientContainer>
              <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-4 md:p-10 rounded-2xl min-h-[600px]">
                <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">
                  {isPendingMember ? "Edit Pending Member Information" : "Edit Member Information"}
                </h1>

                {/* Stepper — BASIC + SOCIAL only */}
                <RegistrationStepper
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                  registrationType="social"
                />

                <form ref={formRef} className="mt-6 md:mt-8">
                  {currentStep === "BASIC" && (
                    <BasicInfoStep
                      data={basicInfo}
                      errors={errors}
                      onChange={handleBasicInfoChange}
                      existingProfilePhotoUrl={basicInfo.profilePhotoUrl}
                      registrationType="normal"
                      onlySocialOption={true}
                      showLocationFields={false}
                      disableEmail={true}
                    />
                  )}

                  {currentStep === "SOCIAL" && (
                    <SocialStep
                      data={socialData}
                      errors={errors}
                      onChange={handleSocialChange}
                      regionId={basicInfo.regionId}
                      registrationType="normal"
                      moduleAccess={["social"]}
                    />
                  )}

                  {/* Navigation buttons — exact same as EditMemberPage */}
                  <div
                    className={`flex flex-col sm:flex-row ${
                      currentStep === "BASIC" ? "justify-end" : "justify-between"
                    } gap-3 mt-6 md:mt-8`}
                  >
                    {currentStep !== "BASIC" && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors order-2 sm:order-1"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={isLastStep ? handleSubmit : handleNext}
                      disabled={isUpdating}
                      className="px-6 py-2.5 rounded-lg bg-[#D85D27] hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                    >
                      {isLastStep
                        ? isUpdating
                          ? "Updating..."
                          : isPendingMember
                          ? "Update Pending Member"
                          : "Update Member"
                        : "Next"}
                    </button>
                  </div>
                </form>
              </div>
            </GradientContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
