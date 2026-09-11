import React, { useMemo,useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_THEME } from "../theme/themeScope";
import { Pencil } from "lucide-react";
import Navbar from "../components/navigation/Navbar";
import { useMeQuery } from "../services/authApi";
import { useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery } from "../services/publicApi";
import { transformApiCategories, getCategoryLabel, normalizeWorkPreference } from "../utils/businessCategories";
import {
  ProfileCard,
  PersonalDetailsCard,
  BusinessDetailsCard,
  ProfessionalDetailsCard,
  TestimonialsCard,
  MyFeedCard,
} from "../components/profile";
import type { PersonalDetail, BusinessDetail, ProfessionalDetail, Testimonial, FeedItem } from "../components/profile";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  // Auth guard
  // Fetch current user; cookies are sent automatically due to credentials: 'include'
  const { data: meRes, isLoading: meLoading, error: meError } = useMeQuery();

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

  // Data
  const profileData = (meRes?.data as any) || {};

  // Update navbar name when available
  React.useEffect(() => {
    const name = profileData.profile?.name;
    if (name) setUserName(name);
  }, [profileData]);

  const profile = profileData.profile || {};
  const personal = profileData.personal || {};
  const professional = profileData.professional || {};
  const business = profileData.business || {};
  const stats = profileData.stats || {};

  const basicInfo = (profileData as any)?.basicInfo || {};
  // Use profilePhotoUrlResolved which is the presigned/resolved URL from backend
  const avatarUrl = basicInfo?.profilePhotoUrlResolved || profile?.avatarUrl || personal?.avatarUrl || undefined;

  const profileInfo = {
    name: profile?.name || "User",
    company: business?.businessName || "",
    role: professional?.role || "",
    postsCount: stats?.posts?.toString() || "",
    connectionsCount: stats?.connections?.toString() || "",
    avatarUrl: avatarUrl,
  };

  const chapterName = basicInfo?.chapterName || "";
  // Old chapter name logic - commented out
  /*
  const chapterName =
    basicInfo?.chapterName ||
    basicInfo?.chapterAnswer ||
    basicInfo?.chapter?.name ||
    profile?.chapterName ||
    profile?.chapter?.name ||
    "";
  */
  const chapterRegion =
    basicInfo?.regionName || basicInfo?.chapter?.regionName || basicInfo?.chapter?.region?.name || "";
  // Membership expiry from same API response
  const rawExpiry: string | undefined = (profileData as any)?.membership?.expiresAt;
  const expiryDate = rawExpiry ? new Date(rawExpiry) : undefined;
  const expiryDateStr = expiryDate ? expiryDate.toLocaleDateString("en-GB") : undefined; // DD/MM/YYYY
  const daysLeft = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : undefined;

  const personalDetails: PersonalDetail = {
    memberNumber: (profileData as any)?.memberNumber || "",
    phone: personal?.phone || "",
    email: personal?.email || "",
    website: personal?.website || "",
    address: basicInfo?.streetAddress || "",
    chapterName,
    chapterRegion,
    expiryDate: expiryDateStr,
    daysLeft,
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
  const apiTestimonials: Testimonial[] = Array.isArray(profileData.testimonials)
    ? (profileData.testimonials as any[]).map((t: any) => {
        return {
          name: t?.authorName || "",
          text: typeof t?.text === "string" ? t.text : "",
          avatarUrl: t?.authorAvatarUrl || undefined,
        };
      })
    : [];

  // Map backend feed to UI FeedItem shape: handle both images and videos
  const apiFeedItems: FeedItem[] = Array.isArray(profileData.feed)
    ? (profileData.feed as any[]).map((f: any, idx: number) => {
        // First, check if there are any media items
        const hasMedia = Array.isArray(f?.media) && f.media.length > 0;
        const mediaItem = hasMedia ? f.media[0] : null;
        const isVideo = mediaItem?.type === 'video';
        
        // Get the media URL, preferring the resolved URL if available
        let mediaUrl = '';
        if (mediaItem) {
          // Use the resolved URL if available, otherwise construct from key
          mediaUrl = mediaItem.url || 
                    (mediaItem.key ? `https://ekam-develop.s3.ap-south-2.amazonaws.com/${mediaItem.key}` : '');
        }
        
        // For videos, we'll show a play button overlay
        return {
          id: idx + 1,
          postId: f?._id || f?.id || undefined,
          image: mediaUrl,
          mediaType: isVideo ? 'video' : 'image',
          videoThumbnail: isVideo ? mediaUrl : undefined,
          title: "",
          description: typeof f?.text === "string" ? f.text : "",
          link: "",
          date: f?.createdAt ? new Date(f.createdAt).toLocaleString() : "",
        } as FeedItem;
      })
    : [];
  const row1Min = "min-h-[360px] md:min-h-[380px] lg:min-h-[420px]"; // Allow cards to stretch to match height
  const row2Min = "min-h-[400px] md:min-h-[480px] lg:min-h-[510px]"; // Row-2 increased for taller Testimonials/My Feed

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        <Navbar userName={userName} />

        <main className="container mx-auto px-4 py-6">
          {meLoading && <div className="mb-4 text-sm text-[var(--ov-ink-2)]">Loading your profile...</div>}
          {meError && <div className="mb-4 text-sm text-red-400">Failed to load profile.</div>}
          <h1 className="text-2xl font-semibold text-[var(--ov-ink)] mb-4">My Account</h1>

          <section className="relative md:pt-6">
            {/* ===== ROW 1 (shorter): Profile + Personal + Professional ===== */}
            <div className="grid grid-cols-10 gap-6 mb-6 items-stretch">
              {/* Left: 2/10 */}
              <div className="col-span-10 lg:col-span-2">
                <div className={`h-full ${row1Min} flex flex-col flex-1`}>
                  <ProfileCard
                    name={profileInfo.name}
                    company={profileInfo.company}
                    role={profileInfo.role}
                    postsCount={profileInfo.postsCount}
                    connectionsCount={profileInfo.connectionsCount}
                    avatarUrl={profileInfo.avatarUrl}
                    className="h-full"
                  />
                </div>
              </div>

              {/* Right: two cards */}
              <div className="col-span-10 lg:col-span-8">
                <div className="grid grid-cols-8 gap-6 items-stretch">
                  <div className="col-span-8 lg:col-span-4">
                    <div className={`${row1Min} relative flex flex-col flex-1`}>
                      <div className="h-full flex flex-col">
                        <PersonalDetailsCard details={personalDetails} variant="none" className="h-full" />
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/profile/update/personal")}
                        className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-ember-wash)] hover:text-[var(--ov-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                        aria-label="Edit personal details"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-8 lg:col-span-4">
                    <div className={`${row1Min} relative flex flex-col flex-1`}>
                      <div className="h-full flex flex-col">
                        <ProfessionalDetailsCard details={businessDetailsForProfessionalCard} variant="none" className="h-full" />
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/profile/update/business")}
                        className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-ember-wash)] hover:text-[var(--ov-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                        aria-label="Edit business details"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== ROW 2 (taller by +25%): Business + Testimonials + My Feed ===== */}
            <div className="grid grid-cols-10 gap-6 items-stretch">
              {/* Left: Business (2/10) */}
              <div className="col-span-10 lg:col-span-2">
                <div className={`h-full ${row2Min}`}>
                  <BusinessDetailsCard 
                    details={professionalDetailsForBusinessCard} 
                    className="h-full" 
                    variant="none"
                    onEdit={() => navigate("/profile/update/professional")}
                  />
                </div>
              </div>

              {/* Right: Testimonials + Feed (8/10) */}
              <div className="col-span-10 lg:col-span-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                  <div>
                    <div className={`${row2Min}`}>
                      <TestimonialsCard
                        testimonials={
                          apiTestimonials.length > 0
                            ? apiTestimonials
                            : [{ name: "", text: "No testimonials yet.", avatarUrl: "" }]
                        }
                        variant="none"
                      />
                    </div>
                  </div>
                  <div>
                    <div className={`h-full ${row2Min}`}>
                      <MyFeedCard feedItems={apiFeedItems} className="h-full" variant="none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
