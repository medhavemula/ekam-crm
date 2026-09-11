import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProfessionalLayout } from "../../components/professional/ProfessionalLayout";
import { useMeQuery } from "../../services/authApi";
import { useProfessionalConnectionProfileQuery } from "../../services/professional/professionalConnectionsApi";
import { useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery } from "../../services/publicApi";
import { getCategoryLabel, normalizeWorkPreference, transformApiCategories } from "../../utils/businessCategories";
import PersonalDetailsCard from "../../components/profile/PersonalDetailsCard";
import BusinessDetailsCard from "../../components/profile/BusinessDetailsCard";
import ProfessionalDetailsCard from "../../components/profile/ProfessionalDetailsCard";
import MyFeedCard from "../../components/profile/MyFeedCard";
import type { FeedItem } from "../../components/profile/MyFeedCard";
import type { PersonalDetail, BusinessDetail, ProfessionalDetail } from "../../types/profile";
import { useReportContentMutation } from "../../services/moderationApi";
import type { ModerationReason } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";
import { useToast } from "../../components/toast/ToastProvider";

export default function ProfessionalProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [isReporting, setIsReporting] = React.useState(false);

  const confirmReportProfile = async (reason: ModerationReason, details: string) => {
    if (!userId) return;
    try {
      setIsReporting(true);
      await reportContent({
        contentType: "PROFESSIONAL_PROFILE",
        contentId: userId,
        targetUserId: userId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Profile reported",
        description: "Thanks. Our admins will review this profile within 24 hours.",
        kind: "success",
      });
      setIsReportOpen(false);
    } catch (e) {
      showToast({ title: "Failed to report profile", description: "Please try again.", kind: "error" });
    } finally {
      setIsReporting(false);
    }
  };

  // Auth guard
  const { data: meRes, isLoading: meLoading, error: meError } = useMeQuery();

  // Fetch viewed user's profile via professional connections API if userId is provided
  const { data: profileRes, isLoading: profileLoading, error: profileError } = useProfessionalConnectionProfileQuery(
    userId || "",
    { skip: !userId }
  );

  // Fetch categories for label lookup
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ limit: 100 });
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 100 });
  
  const businessCategoryOptions = React.useMemo(() => 
    transformApiCategories(businessCategoriesResponse?.data || []), 
    [businessCategoriesResponse]
  );
  
  const professionalCategoryOptions = React.useMemo(() => 
    transformApiCategories(professionalCategoriesResponse?.data || []), 
    [professionalCategoriesResponse]
  );

  // Determine which data to use
  const isViewingOtherProfile = !!userId;
  const isLoading = meLoading || (isViewingOtherProfile && profileLoading);
  const error = meError || (isViewingOtherProfile && profileError);

  // Redirect to login if unauthorized
  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  // Data with proper typing
  const profileData = isViewingOtherProfile ? (profileRes as any)?.data || {} : (meRes as any)?.data || {};
  const personal: Partial<PersonalDetail> = profileData?.personal || {};
  const professional: Partial<ProfessionalDetail> = profileData?.professional || {};
  const business: Partial<BusinessDetail> = profileData?.business || {};
  
  // Normalize professional categories and work preference
  const normalizedProfessionalCategory = professional.professionalCategory 
    ? getCategoryLabel(professionalCategoryOptions, professional.professionalCategory)
    : '';
  
  const normalizedWorkPreference = professional.workPreference 
    ? normalizeWorkPreference(professional.workPreference)
    : '';
  
  // Normalize business category
  const normalizedBusinessCategory = business.businessCategory || business.companyType
    ? getCategoryLabel(businessCategoryOptions, business.businessCategory || business.companyType || '')
    : '';
  
  // Format feed items to match FeedItem interface
  const feedItems: FeedItem[] = Array.isArray(profileData.feed) 
    ? profileData.feed.map((item: any, idx: number) => ({
        id: item.id || idx,
        image: item.media?.[0]?.url || item.media?.[0]?.key || '',
        title: '',
        description: item.text || item.content || '',
        link: '',
        date: item.createdAt ? new Date(item.createdAt).toLocaleString() : new Date().toLocaleString(),
      }))
    : [];

  // Prepare breadcrumbs
  const breadcrumbs = [
    { label: "Professional", onClick: () => navigate("/professional/feed") },
    ...(isViewingOtherProfile 
      ? [{ label: "Connections", onClick: () => navigate("/professional/connections") }, { label: "View Profile" }]
      : [{ label: "My Profile" }]
    )
  ];
  const row1Min = "min-h-[320px] md:min-h-[340px] lg:min-h-[360px]";
  const row2Min = "h-[360px] md:h-[400px] lg:h-[440px]";


  if (isLoading) {
    return (
      <ProfessionalLayout breadcrumbs={breadcrumbs} sidebarProfileUserId={userId}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </ProfessionalLayout>
    );
  }

  if (error) {
    return (
      <ProfessionalLayout breadcrumbs={breadcrumbs} sidebarProfileUserId={userId}>
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Failed to load profile</p>
          {isViewingOtherProfile && (
            <button 
              onClick={() => navigate("/professional/connections")}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Back to Connections
            </button>
          )}
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout breadcrumbs={breadcrumbs} sidebarProfileUserId={userId}>
      <section className="relative">
        {isViewingOtherProfile && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 border border-amber-500/60 hover:bg-amber-500/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H20l-3 6 3 6h-7.5l-1-2H5a2 2 0 00-2 2z" />
              </svg>
              Report Profile
            </button>
          </div>
        )}
        {/* Row 1: Personal + Professional */}
        <div className="grid grid-cols-8 gap-5 mb-5 items-stretch">
          <div className="col-span-8 lg:col-span-4">
            <div className={`${row1Min} flex flex-col flex-1`}>
              <div className="h-full flex flex-col">
                <PersonalDetailsCard 
                  details={{
                    phone: personal.phone || '',
                    email: personal.email || '',
                    website: (personal as any).website || '',
                    address: profileData?.basicInfo?.streetAddress || personal.address || '',
                    chapterName: personal.chapterName || '',
                    chapterRegion: personal.chapterRegion || '',
                    expiryDate: personal.expiryDate || '',
                    daysLeft: personal.daysLeft
                  }}
                  variant="none"
                  className="h-full"
                />
              </div>
            </div>
          </div>

          <div className="col-span-8 lg:col-span-4">
            <div className={`${row1Min} flex flex-col flex-1`}>
              <div className="h-full flex flex-col">
                <BusinessDetailsCard 
                  details={{
                    role: professional.role || '',
                    yearsOfExperience: professional.yearsOfExperience || '',
                    professionalCategory: normalizedProfessionalCategory,
                    skillsTechnologies: professional.skillsTechnologies || [],
                    workPreference: normalizedWorkPreference,
                    companyName: professional.companyName || '',
                    summary: professional.summary || ''
                  }}
                  title="Professional Details"
                  variant="none"
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Business + My Feed */}
        <div className="grid grid-cols-8 gap-5 items-stretch">
          <div className="col-span-8 lg:col-span-4">
            <div className={`h-full ${row2Min}`}>
              <ProfessionalDetailsCard 
                details={{
                  companyName: business.businessName || business.companyName || '',
                  companyType: normalizedBusinessCategory,
                  companySize: business.subCategory || business.companySize || '',
                  established: business.establishedYear ? business.establishedYear.toString() : business.established || '',
                  summary: business.businessDescription || business.shortDescription || '',
                }}
                title="Business Details"
                variant="none"
                className="h-full"
              />
            </div>
          </div>

          <div className="col-span-8 lg:col-span-4">
            <div className={`h-full ${row2Min}`}>
              <MyFeedCard 
                feedItems={feedItems}
                variant="none"
                className="h-full"
              />
            </div>
          </div>
        </div>
      </section>

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onConfirm={confirmReportProfile}
        isSubmitting={isReporting}
        contentLabel="profile"
        title="Report this profile?"
        description="Tell us what's wrong with this professional profile. Our admins will review the reported details and act within 24 hours."
      />
    </ProfessionalLayout>
  );
}
