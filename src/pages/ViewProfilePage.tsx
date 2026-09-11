import React, { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Flag } from "lucide-react";
import { ADMIN_THEME } from "../theme/themeScope";
import { Skeleton } from "../components/common/Skeletons";
import Navbar from "../components/navigation/Navbar";
import PageHeader from "../components/common/PageHeader";
import { useMeQuery } from "../services/authApi";
import { useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery } from "../services/publicApi";
import { getCategoryLabel, normalizeWorkPreference, transformApiCategories } from "../utils/businessCategories";
import {
  ProfileCard,
  PersonalDetailsCard,
  BusinessDetailsCard,
  ProfessionalDetailsCard,
  TestimonialsCard,
  MyFeedCard,
} from "../components/profile";
import ComposeMessageModal from "../components/modals/ComposeMessageModal";
import WriteTestimonialModal from "../components/modals/WriteTestimonialModal";
import AddP2PModal from "../components/modals/AddP2PModal";
import AddBOGModal from "../components/modals/AddBOGModal";
import { useTestimonialsWriteMutation } from "../services/testimonialsApi";
import { useConnectionProfileQuery } from "../services/connectionsApi";
import { useToast } from "../components/toast/ToastProvider";
import { useReportContentMutation } from "../services/moderationApi";
import type { ModerationReason } from "../services/moderationApi";
import { ReportDialog } from "../components/common/ReportDialog";
import type {
  PersonalDetail,
  BusinessDetail,
  ProfessionalDetail,
  Testimonial,
  FeedItem,
} from "../components/profile";

export default function ViewProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fromSearch = Boolean((location.state as any)?.from === "search");
  const fromAddConnection = Boolean((location.state as any)?.from === "add-connection" || (location.state as any)?.source === "add-connection");
  const fromSentRequests = Boolean((location.state as any)?.from === "sent-requests" || (location.state as any)?.source === "sent-requests");
  const fromReceivedRequests = Boolean((location.state as any)?.from === "received-requests" || (location.state as any)?.source === "received-requests");
  // Remove all button restrictions - show all buttons regardless of source
  const hideP2PBOG = false;
  const hideAllButtons = false;
  const [userName, setUserName] = useState("");
  const [isWriteTestimonialModalOpen, setIsWriteTestimonialModalOpen] = useState(false);
  const [isComposeMessageOpen, setIsComposeMessageOpen] = useState(false);
  const [isAddP2PModalOpen, setIsAddP2PModalOpen] = useState(false);
  const [isAddBOGModalOpen, setIsAddBOGModalOpen] = useState(false);
  const [writeTestimonial] = useTestimonialsWriteMutation();
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const confirmReportProfile = async (reason: ModerationReason, details: string) => {
    if (!id) return;
    try {
      setIsReporting(true);
      await reportContent({
        contentType: "BUSINESS_PROFILE",
        contentId: id,
        targetUserId: id,
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

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch current user (for navbar name + auth check)
  const { data: meRes, isLoading: meLoading, error: meError } = useMeQuery();
  // Fetch viewed user's profile via connections API
  const { data: profileRes, isLoading: profileLoading, error: profileError } = useConnectionProfileQuery(id || "");
  // Members outside your own chapter come back deliberately thin (WEB-BUS-19): the
  // server withholds their details until you connect. Rendering the usual grid would
  // show a wall of empty cards, which reads as broken rather than as "not yet shared".
  const isLimitedProfile = (profileRes as any)?.data?.limited === true;

  // Fetch categories for label lookup
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ limit: 100 });
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 100 });
  
  const businessCategoryOptions = useMemo(() => 
    transformApiCategories(businessCategoriesResponse?.data || []), 
    [businessCategoriesResponse]
  );
  const professionalCategoryOptions = useMemo(() => 
    transformApiCategories(professionalCategoriesResponse?.data || []), 
    [professionalCategoriesResponse]
  );

  // Redirect to login if unauthorized
  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  const meData = (meRes?.data as any) || {};
  const viewData = (profileRes?.data as any) || {};

  // Update navbar name when available
  React.useEffect(() => {
    const name = meData.profile?.name;
    if (name) setUserName(name);
  }, [meData]);

  const profile = viewData.profile || {};
  const personal = viewData.personal || {};
  const professional = viewData.professional || {};
  const business = viewData.business || {};
  const stats = viewData.stats || {};
  const basicInfo = (viewData as any)?.basicInfo || {};
  // Use profilePhotoUrlResolved which is the presigned/resolved URL from backend
  const avatarUrl = basicInfo?.profilePhotoUrlResolved || profile?.avatarUrl || viewData.card?.avatarUrl || personal?.avatarUrl || undefined;

  const profileInfo = {
    name: profile?.name || viewData.card?.name || "User",
    company: business?.businessName || viewData.card?.company || "",
    role: professional?.role || viewData.card?.role || "",
    postsCount: (stats?.posts != null ? String(stats.posts) : ""),
    connectionsCount: (stats?.connections != null ? String(stats.connections) : ""),
    avatarUrl: avatarUrl,
    coverUrl: "",
  };

  const chapterName = basicInfo?.chapterName || "";
  // Old chapter name logic - commented out
  /*
  const chapterName = viewData.card?.chapter || basicInfo?.chapterName || basicInfo?.chapterAnswer || basicInfo?.chapter?.name || profile?.chapterName || profile?.chapter?.name || "";
  */
  const chapterRegion = basicInfo?.regionName || basicInfo?.chapter?.regionName || basicInfo?.chapter?.region?.name || "";

  const personalDetails: PersonalDetail = {
    memberNumber: viewData.memberNumber || "",
    phone: personal?.phone || "",
    email: personal?.email || "",
    website: personal?.website || "",
    address: basicInfo?.streetAddress || "",
    chapterName,
    chapterRegion,
  };

  // Now ProfessionalDetailsCard shows business data
  const businessDetailsForProfessionalCard: ProfessionalDetail = {
    companyName: business?.businessName || "",
    companyType: getCategoryLabel(businessCategoryOptions, business?.businessCategory || business?.companyType || "") || "",
    companySize: business?.companySize || "",
    established: business?.establishedYear || business?.established || "",
    sponsorName: business?.sponsorName || "",
    summary: business?.shortDescription || professional?.summary || professional?.description || "", // Use business short description first
  };

  // Now BusinessDetailsCard shows professional data
  const professionalDetailsForBusinessCard: BusinessDetail = {
    role: professional?.role || "",
    yearsOfExperience: professional?.yearsOfExperience ?? "",
    professionalCategory: getCategoryLabel(professionalCategoryOptions, professional?.professionalCategory || "") || "",
    skillsTechnologies: professional?.skillsTechnologies || [],
    workPreference: normalizeWorkPreference(professional?.workPreference) || "",
    companyName: business?.businessName || "",
    summary: professional?.summary || professional?.description || "",
  };

  // Map backend testimonials to UI shape with author name, avatar, and date
  const testimonials: Testimonial[] = Array.isArray(viewData.testimonials)
    ? (viewData.testimonials as any[]).map((t: any) => ({
        name: t?.authorName || "",
        text: typeof t?.text === "string" ? t.text : "",
        avatarUrl: t?.authorAvatarUrl || undefined,
      }))
    : [];

  const feedItems: FeedItem[] = Array.isArray(viewData.feed)
    ? (viewData.feed as any[]).map((f: any, idx: number) => {
        const firstImage = Array.isArray(f?.media)
          ? f.media.find((m: any) => m?.type === "image")
          : undefined;
        return {
          id: idx + 1,
          image: firstImage?.url || (firstImage?.key ? firstImage.key : undefined),
          title: "",
          description: typeof f?.text === "string" ? f.text : "",
          link: "",
          date: f?.createdAt ? new Date(f.createdAt).toLocaleString() : "",
        } as FeedItem;
      })
    : [];

  const handleWriteTestimonial = () => {
    setIsWriteTestimonialModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!id) return;
    
    try {
      // Navigate to the chat page with the peer ID and ensure conversation detail is opened
      navigate(`/business/my-feed/chat?peerId=${id}`, {
        state: { shouldOpenThread: true }
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
      showToast({
        title: 'Error',
        description: 'Could not open chat. Please try again.',
        kind: 'error'
      });
    }
  };

  const handleSubmitTestimonial = async (_subject: string, body: string) => {
    try {
      // subjectId should be the viewed person's id (from route params)
      const subjectId = id || "";
      // requestId may be provided via navigation state when coming from a testimonial request
      const reqIdFromState = (location.state as any)?.requestId as string | undefined;
      const requestId = reqIdFromState || "";
      if (!subjectId) return;
      await writeTestimonial({ subjectId, text: body, rating: 5, requestId }).unwrap();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleSubmitMessage = (subject: string, body: string) => {
    console.log("Message submitted:", { subject, body, to: profileInfo.name });
    setIsComposeMessageOpen(false);
  };

  const handleAddP2P = () => {
    setIsAddP2PModalOpen(true);
  };

  const handleAddBOG = () => {
    setIsAddBOGModalOpen(true);
  };

  // Layout sizing utils (match ProfilePage)

  const subtitle = [profileInfo.role, profileInfo.company].filter(Boolean).join(" · ");

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header. The actions sit beside the name rather than floating above
            it, which is what used to put them on top of the heading. */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            {fromSearch ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to search
              </button>
            ) : (
              <PageHeader
                breadcrumbs={[
                  { label: "Business", onClick: () => navigate("/dashboard") },
                  { label: "Connections", onClick: () => navigate("/business/connections") },
                  ...(fromAddConnection
                    ? ([{ label: "Add Connection", onClick: () => navigate("/business/connections/add") }] as const)
                    : fromSentRequests
                    ? ([{ label: "Sent Requests", onClick: () => navigate("/business/connections") }] as const)
                    : fromReceivedRequests
                    ? ([{ label: "Received Requests", onClick: () => navigate("/business/connections") }] as const)
                    : ([] as const)),
                  { label: "View Profile" },
                ]}
              />
            )}

            {/* "User" is the fallback this page uses when it has no name yet.
                Printing it while the request is still out states something the
                screen does not know, so the heading waits with everything else. */}
            {meLoading || profileLoading ? (
              <>
                <Skeleton className="h-8 w-56 rounded-lg sm:w-72" />
                <Skeleton className="mt-3 h-3 w-40" />
              </>
            ) : (
              <>
                <h1 className="ekam-figure truncate text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
                  {profileInfo.name}
                </h1>
                {subtitle && (
                  <p className="mt-2.5 truncate text-[12px] text-[var(--ov-ink-4)]">{subtitle}</p>
                )}
              </>
            )}
          </div>

          {/* One primary. Writing a testimonial is the thing this screen is
              for; the rest are alternatives to it, and Report is not an
              action anyone should reach for by accident. */}
          {!hideAllButtons && !isLimitedProfile && !profileLoading && !profileError && !meError && (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {!hideP2PBOG && (
                <button type="button" onClick={handleAddP2P} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--ov-fill-subtle)] px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                  Add P2P
                </button>
              )}
              {!hideP2PBOG && (
                <button type="button" onClick={handleAddBOG} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--ov-fill-subtle)] px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                  Add BOG
                </button>
              )}
              {!fromAddConnection && (
                <button type="button" onClick={handleSendMessage} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--ov-fill-subtle)] px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]">
                  Send message
                </button>
              )}
              <button
                type="button"
                onClick={handleWriteTestimonial}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
              >
                Write a testimonial
              </button>
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                aria-label={`Report ${profileInfo.name}`}
                title="Report this profile"
                className="grid h-10 w-10 place-items-center rounded-xl text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {profileError || meError ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load this profile. Check your connection and try again.
          </div>
        ) : meLoading || profileLoading ? (
          /* Everything on this screen comes from the server, so the whole of it
             stands in for itself — but as the panels it is about to be, not as
             a screen in front of the page. */
          <div className="grid grid-cols-10 gap-6" role="status" aria-live="polite">
            <div className="col-span-10 lg:col-span-2">
              <div className="space-y-4 rounded-2xl bg-[var(--ov-panel)] p-5 ring-1 ring-[color:var(--ov-line)]">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="mx-auto h-4 w-24" />
                <Skeleton className="mx-auto h-3 w-16" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-16 flex-1 rounded-xl" />
                  <Skeleton className="h-16 flex-1 rounded-xl" />
                </div>
              </div>
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="col-span-10 lg:col-span-4">
                <div className="space-y-4 rounded-2xl bg-[var(--ov-panel)] p-5 ring-1 ring-[color:var(--ov-line)]">
                  <Skeleton className="h-4 w-40" />
                  {[0, 1, 2, 3].map((r) => (
                    <div key={r} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <span className="sr-only">Loading profile</span>
          </div>
        ) : null}

          {isLimitedProfile && !profileLoading && (
            <section>
              <div className="mx-auto max-w-xl rounded-2xl bg-[var(--ov-panel)] p-8 text-center shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
                <div className="ekam-figure mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--ov-ember-fill)] text-[22px] font-bold text-[var(--ov-on-ember)]">
                  {(profileInfo.name || "?").trim().charAt(0).toUpperCase()}
                </div>
                <h2 className="text-[19px] font-semibold text-[var(--ov-ink)]">
                  {profileInfo.name || "This member"}
                </h2>
                {(profileInfo.role || profileInfo.company) && (
                  <p className="mt-1 text-[13px] text-[var(--ov-ink-4)]">
                    {profileInfo.role}
                    {profileInfo.role && profileInfo.company ? " · " : ""}
                    {profileInfo.company}
                  </p>
                )}
                <p className="mx-auto mt-5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-3)]">
                  This member is in a different chapter. Connect with them to see their
                  full profile and contact details.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/business/connections/add")}
                  className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
                >
                  Send connection request
                </button>
              </div>
            </section>
          )}

          {/* ===== Floating button bar + grid wrapper ===== */}
          {!isLimitedProfile && !profileLoading && !profileError && (
          <section>
            {/* ===== ROW 1 (shorter): Profile + Personal + Professional ===== */}
            <div className="grid grid-cols-10 gap-6 mb-6 items-stretch">
              {/* Left: 2/10 */}
              <div className="col-span-10 lg:col-span-2">
                <div className="flex h-full flex-col">
                  <ProfileCard
                    name={profileInfo.name}
                    company={profileInfo.company}
                    role={profileInfo.role}
                    postsCount={profileInfo.postsCount}
                    connectionsCount={profileInfo.connectionsCount}
                    avatarUrl={profileInfo.avatarUrl}
                    coverUrl={profileInfo.coverUrl}
                    className="h-full"
                  />
                </div>
              </div>

              {/* Right: two cards */}
              <div className="col-span-10 lg:col-span-8">
                <div className="grid grid-cols-8 gap-6 items-stretch">
                  <div className="col-span-8 lg:col-span-4">
                    <div className="flex h-full flex-col">
                      <div className="h-full flex flex-col">
                        <PersonalDetailsCard details={personalDetails} variant="none" className="h-full" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-8 lg:col-span-4">
                    <div className="flex h-full flex-col">
                      <div className="h-full flex flex-col">
                        <ProfessionalDetailsCard details={businessDetailsForProfessionalCard} variant="none" className="h-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== ROW 2 (taller by +25%): Business + Testimonials + My Feed ===== */}
            <div className="grid grid-cols-10 gap-6 items-stretch">
              {/* Left: Business (2/10) */}
              <div className="col-span-10 lg:col-span-2">
                <div className="h-full">
                  <BusinessDetailsCard details={professionalDetailsForBusinessCard} className="h-full" variant="none" />
                </div>
              </div>

              {/* Right: Testimonials + Feed (8/10) */}
              <div className="col-span-10 lg:col-span-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  <div>
                    <div >
                      <TestimonialsCard testimonials={testimonials} variant="none" />
                    </div>
                  </div>
                  <div>
                    <div className="h-full">
                      <MyFeedCard feedItems={feedItems} className="h-full" variant="none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          )}
      </main>

      {/* Write Testimonial Modal */}
      <WriteTestimonialModal
        isOpen={isWriteTestimonialModalOpen}
        onClose={() => setIsWriteTestimonialModalOpen(false)}
        onSubmit={handleSubmitTestimonial}
        recipientName={profileInfo.name}
      />

      {/* Compose Message Modal */}
      <ComposeMessageModal
        isOpen={isComposeMessageOpen}
        onClose={() => setIsComposeMessageOpen(false)}
        onSubmit={handleSubmitMessage}
        recipientName={profileInfo.name}
      />

      {/* Add P2P Modal */}
      <AddP2PModal
        isOpen={isAddP2PModalOpen}
        onClose={() => setIsAddP2PModalOpen(false)}
        recipientId={id}
        recipientName={profileInfo.name}
      />

      {/* Add BOG Modal */}
      <AddBOGModal
        isOpen={isAddBOGModalOpen}
        onClose={() => setIsAddBOGModalOpen(false)}
        recipientId={id}
        recipientName={profileInfo.name}
      />

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onConfirm={confirmReportProfile}
        isSubmitting={isReporting}
        contentLabel="profile"
        title="Report this profile?"
        description="Tell us what's wrong with this business profile. Our admins will review the reported details and act within 24 hours."
      />
    </div>
  );
}
