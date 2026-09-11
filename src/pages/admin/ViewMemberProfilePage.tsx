
import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import AdminPersonalDetailsCard, { type AdminPersonalDetail, type AdminTimelineItem } from "../../components/admin/AdminPersonalDetailsCard";
import { ProfileCard, BusinessDetailsCard, ProfessionalDetailsCard, TestimonialsCard, type BusinessDetail, type ProfessionalDetail, type Testimonial } from "../../components/profile";
import { useApproveMemberMutation, useRejectMemberMutation, useBlockUserMutation, useGetUserProfileWithActionsQuery, useGetGrantEdModulesPreviewQuery, useGrantEdModulesAccessMutation } from "../../services/memberApi";
import { useListBusinessCategoriesQuery, useListProfessionalCategoriesQuery } from "../../services/publicApi";
import { useToast } from "../../components/toast/ToastProvider";
import { getCategoryLabel, normalizeWorkPreference, transformApiCategories } from "../../utils/businessCategories";
import { useRole } from "../../hooks/useRole";

export default function ViewMemberProfilePage() {
  // Hooks must be called at the top level
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();
  const { chapterId: routeChapterId } = useParams<{ chapterId?: string }>();
  const location = useLocation();
  const { role: userRole } = useRole();
  const { showToast } = useToast();

  // Get approvalId from navigation state (passed from MembersPage)
  const passedApprovalId = location.state?.approvalId;
  const grantEdModulesMode = location.state?.mode === "grant-ed-modules";
  const targetModule = location.state?.targetModule as "business" | "professional" | undefined;
  const grantModeTitle =
    targetModule === "professional"
      ? "Social Member for Professional Access"
      : targetModule === "business"
        ? "Social Member for Business Access"
        : "Social Member for Additional Access";

  const { data: memberRes, isLoading, error, refetch } = useGetUserProfileWithActionsQuery(
    { userId: memberId || "" },
    { skip: !memberId }
  );
  const {
    data: grantPreviewRes,
    isLoading: isGrantPreviewLoading,
    error: grantPreviewError,
    refetch: refetchGrantPreview,
  } = useGetGrantEdModulesPreviewQuery(
    { userId: memberId || "" },
    { skip: !memberId || !grantEdModulesMode }
  );

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

  // Admin actions
  const [approveMember, { isLoading: isApproving }] = useApproveMemberMutation();
  const [rejectMember, { isLoading: isRejecting }] = useRejectMemberMutation();
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const [grantEdModulesAccess, { isLoading: isGrantingEdModules }] = useGrantEdModulesAccessMutation();
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);

  // Check if we need to refresh data (coming back from edit page)
  useEffect(() => {
    if (location.state?.refresh) {
      // Clear the refresh state to prevent infinite refreshes
      window.history.replaceState({}, document.title);
      // Refetch the data to get updated information
      if (grantEdModulesMode) refetchGrantPreview();
      else refetch();
    }
  }, [grantEdModulesMode, location.state?.refresh, refetch, refetchGrantPreview]);

  // Check sessionStorage flag for refresh (from edit page navigate(-1))
  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem('refreshMemberData');
    if (shouldRefresh === 'true') {
      // Clear the flag to prevent infinite refreshes
      sessionStorage.removeItem('refreshMemberData');
      // Refetch the data to get updated information
      if (grantEdModulesMode) refetchGrantPreview();
      else refetch();
    }
  }, [grantEdModulesMode, refetch, refetchGrantPreview]);

  // Determine route type based on pathname
  const isChapterMembersRoute = location.pathname.includes('/admin/regional-board/chapter/') && location.pathname.includes('/members');
  const isProfessionalsRoute = location.pathname.includes('/admin/professionals');


  // Handle move member to another chapter - just navigate to change chapter page
  const handleMoveMember = () => {
    if (!memberId) return;

    // Close modal and navigate to change chapter page
    setConfirmMoveOpen(false);

    navigate(`/admin/regional-board/members/${memberId}/change-chapter`, {
      state: {
        member: {
          id: memberId,
          userId: memberId,
          name: profileInfo.name,
          email: personal.email,
          phone: personal.phone,
          company: business.businessName,
          profession: professional.role,
          status: memberStatus,
          country: raw.basicInfo?.country || '',
          region: raw.basicInfo?.state || '',
          countryName: raw.basicInfo?.countryName || '',
          regionName: raw.basicInfo?.regionName || ''
        },
        currentChapterId: routeChapterId,
        currentChapterName: personalDetails.chapterName || 'Current Chapter',
        isMovedAway: true // Flag to indicate this is a moved away action
      }
    });
  };

  // Approve pending member directly from view page
  const handleApprovePending = async () => {
    if (!approvalId) {
      showToast({ title: "Error", description: "Approval request not found", kind: "error" });
      return;
    }
    try {
      const chapterId = (raw?.basicInfo as any)?.chapter || undefined;
      const result = await approveMember({
        approvalId: String(approvalId),
        data: {
          remark: "Approved from member profile page",
          chapterId,
        },
      }).unwrap();

      if (result.success) {
        showToast({ title: "Success", description: "Member approved successfully", kind: "success" });
        await refetch();
      } else {
        throw new Error(result.message || "Approval failed");
      }
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to approve member";
      showToast({ title: "Error", description: String(msg), kind: "error" });
    }
  };

  // Reject pending member directly from view page
  const handleRejectPending = async () => {
    if (!approvalId) {
      showToast({ title: "Error", description: "Approval request not found", kind: "error" });
      return;
    }

    const remark = window.prompt("Please enter a reason for rejection:", "");
    if (remark === null) return;
    if (!remark.trim()) {
      showToast({ title: "Error", description: "Rejection remark is required", kind: "error" });
      return;
    }

    try {
      const result = await rejectMember({
        approvalId: String(approvalId),
        data: { remark: remark.trim() },
      }).unwrap();

      if (result.success) {
        showToast({ title: "Success", description: "Member rejected successfully", kind: "success" });
        await refetch();
      } else {
        throw new Error(result.message || "Rejection failed");
      }
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to reject member";
      showToast({ title: "Error", description: String(msg), kind: "error" });
    }
  };

  // Handle block/unblock user
  const handleBlock = async () => {
    if (!memberId) return;

    try {
      setConfirmLoading(true);
      await blockUser(memberId).unwrap();
      showToast({
        title: "Success",
        description: memberStatus === 'Blocked' ? "User has been unblocked" : "User has been blocked",
        kind: "success"
      });
      setConfirmBlockOpen(false);
    } catch (error) {
      console.error("Failed to block/unblock user:", error);
      showToast({
        title: "Error",
        description: `Failed to ${memberStatus === 'Blocked' ? 'unblock' : 'block'} user. Please try again.`,
        kind: "error"
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  // Handle move away action
  const onMovedAway = async () => {
    if (!memberId) return;
    try {
      setConfirmMoveOpen(true);
    } catch (error) {
      console.error("Error preparing move away:", error);
    }
  };

  // Handle block action
  const onBlock = () => {
    setConfirmBlockOpen(true);
  };

  // Navbar name
  const meName = "";
  // Prefer the richer actions-API user object; fall back to the preview only if
  // actions hasn't returned yet (e.g. still loading in grant-ed-modules mode).
  const raw: any = memberRes?.user || grantPreviewRes?.data?.user || {};
  const actionsData: any[] = memberRes?.data || [];
  const grantPreview = grantPreviewRes?.data as any;
  const grantableModules: ("business" | "professional")[] = Array.isArray(grantPreview?.grantableModules)
    ? grantPreview.grantableModules
    : [];

  // Extract and process status from API response (same logic as MembersPage)
  const memberStatus = (!raw.isApproved
    ? 'Pending'
    : raw.status === 'active'
      ? 'Joined'
      : String(raw.status || '').toLowerCase() === 'inactive'
        ? 'Blocked'
        : String(raw.status || "").toUpperCase() === "BLOCKED"
          ? "Blocked"
          : String(raw.status || "").toUpperCase() === "DELETED"
            ? "Deleted"
            : String(raw.status || "").toUpperCase() === "PENDING"
              ? "Pending"
              : (memberRes?.data?.some((action: any) => action.kind === 'APPROVAL_REQUESTED')
                ? 'Pending'
                : 'Joined')) as "Joined" | "Blocked" | "Deleted" | "Pending";

  // Extract approval ID from actions data for pending members
  const approvalId = React.useMemo(() => {
    if (memberStatus === 'Pending') {
      // Debug: Log the data structure to understand what we're working with

      // First priority: Use the approvalId passed from MembersPage
      if (passedApprovalId) {
        return passedApprovalId;
      }

      // Second priority: Use the approvalId from the root level of the user object (API response)
      if (raw.approvalId) {
        return raw.approvalId;
      }

      // Third priority: Find the approval requested action to get the request ID
      const approvalRequestedAction = actionsData.find((action: any) => action.kind === 'APPROVAL_REQUESTED');
      if (approvalRequestedAction?.data?.id) {
        return approvalRequestedAction.data.id;
      }

      // Fourth priority: Check if the raw user data has request information
      // This handles cases where the request data might be structured differently
      if (raw.id && raw.userId && raw.id !== raw.userId) {
        return raw.id; // Use the request ID if it's different from userId
      }
    }
    return null;
  }, [memberStatus, actionsData, raw, passedApprovalId]);
  const personal = {
    phone: raw.basicInfo?.phone || '',
    email: raw.email || '',
    address: [
      raw.basicInfo?.streetAddress,
      raw.basicInfo?.city,
      raw.basicInfo?.state,
      raw.basicInfo?.pincode,
    ].filter(Boolean).join(', ') || ''
  };
  const professional = raw.professional || {};
  const business = raw.business || {};

  // Basic info
  const avatarUrl = raw.basicInfo?.profilePhotoUrl || raw.profilePhotoUrl || undefined;
  const posts = "0";
  const connections = "0";

  // Show loading/error states after all hooks
  if (isLoading || isGrantPreviewLoading) return <div className="text-white p-4">Loading...</div>;
  if (error || grantPreviewError) return <div className="text-red-500 p-4">Error loading profile data.</div>;

  // Timeline mock data
  const MOCK_TIMELINE: AdminTimelineItem[] = [
    { id: 1, time: "10:00 AM", title: "Changed Chapter - Collab to Alliance", subtitle: "Changed by Executive Director: Mike" },
    { id: 2, time: "Nov, 2nd", title: "Your plan Expired, Please renew" },
    { id: 3, time: "2024", title: "Password changed Successfully" },
  ];

  const profileInfo = {
    name: raw?.name || 'No Name',
    company: business?.businessName || 'No Company',
    role: professional?.role || 'No Role',
    postsCount: posts,
    connectionsCount: connections,
    avatarUrl: avatarUrl,
    coverUrl: undefined,
  };


  const personalDetails: AdminPersonalDetail = {
    memberNumber: raw?.memberNumber || "",
    phone: personal?.phone || '',
    email: personal?.email || '',
    address: raw?.basicInfo?.streetAddress || '',
    chapterName: raw?.basicInfo?.chapterAnswer || raw?.basicInfo?.chapterName || '',
    // Old chapter name logic - commented out
    /*
    chapterName: raw?.basicInfo?.chapterName || raw?.basicInfo?.chapterAnswer || raw?.basicInfo?.chapter?.name || profile?.chapterName || profile?.chapter?.name || '',
    */
    chapterRegion: raw?.basicInfo?.regionName || '',
    expiryDate: raw?.membershipExpiryDate ? new Date(raw.membershipExpiryDate).toLocaleDateString("en-GB") : '', // Use membershipExpiryDate from API
    daysLeft: raw?.membershipExpiryDate ? Math.max(0, Math.ceil((new Date(raw.membershipExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0, // Calculate days left
  };

  // Now ProfessionalDetailsCard shows business data
  const businessDetailsForProfessionalCard: ProfessionalDetail = {
    companyName: business?.businessName || '',
    companyType: getCategoryLabel(businessCategoryOptions, business?.businessCategory || '') || '',
    companySize: business?.companySize || '',
    established: business?.establishedYear ? String(business.establishedYear) : '',
    sponsorName: business?.sponsorName || '',
    summary: business?.shortDescription || professional?.summary || professional?.description || '', // Use business short description first
  };

  // Now BusinessDetailsCard shows professional data
  const professionalDetailsForBusinessCard: BusinessDetail = {
    role: professional?.role || '',
    yearsOfExperience: professional?.yearsOfExperience ?? '',
    professionalCategory: getCategoryLabel(professionalCategoryOptions, professional?.professionalCategory || '') || '',
    skillsTechnologies: Array.isArray(professional?.skillsTechnologies) ? professional.skillsTechnologies : [],
    workPreference: normalizeWorkPreference(professional?.workPreference) || '',
    companyName: business?.businessName || '',
    summary: professional?.summary || professional?.description || '',
  };

  // Process timeline from actions data
  const timeline: AdminTimelineItem[] = Array.isArray(actionsData) && actionsData.length > 0
    ? actionsData.map((action: any, idx: number) => {
      // Matching the one exact string "1970-01-01T00:00:00.000Z" only caught the
      // epoch in that single serialisation - a numeric 0, a seconds-precision
      // variant, or an unparseable value all slipped past and rendered as
      // "Jan 1, 1970". Test the instant instead of its spelling.
      const parsedAt = action.at != null ? new Date(action.at) : null;
      const isInvalidUnixDate =
        parsedAt != null && (Number.isNaN(parsedAt.getTime()) || parsedAt.getTime() === 0);

      const actionDate = parsedAt && !isInvalidUnixDate ? parsedAt : null;

      // For today show time, otherwise show date with month and year
      let timeLabel = '';

      if (actionDate) {
        timeLabel = actionDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } else if (isInvalidUnixDate) {
        timeLabel = 'Date Pending';
      }

      let title = '';
      let subtitle = '';
      const formatModuleName = (moduleType?: string) => {
        if (!moduleType) return 'Module';
        return moduleType.charAt(0).toUpperCase() + moduleType.slice(1);
      };

      switch (action.kind) {
        case 'ACCOUNT_CREATED':
          title = 'Account Created';
          subtitle = '';
          break;
        case 'EMAIL_VERIFIED':
          title = 'Email Verified';
          subtitle = '';
          break;
        case 'APPROVAL_REQUESTED':
          title = 'Membership Requested';
          subtitle = '';
          break;
        case 'APPROVAL': {
          const approvalStatus = String(
            action?.data?.status || ''
          ).toUpperCase();

          if (approvalStatus === 'APPROVED') {
            title = 'Membership Approved';
          } else if (approvalStatus === 'REJECTED') {
            title = 'Membership Rejected';
          } else if (approvalStatus === 'PENDING') {
            title = 'Membership Pending';
          } else {
            title = 'Membership Status Updated';
          }

          subtitle = action.actor
            ? `By ${action.actor.name}`
            : '';

          // Set expiry date only for approved memberships
          if (
            approvalStatus === 'APPROVED' &&
            action.data.expiresAt
          ) {
            const expiryDate = new Date(action.data.expiresAt);

            personalDetails.expiryDate =
              expiryDate.toLocaleDateString("en-GB");

            personalDetails.daysLeft = Math.max(
              0,
              Math.ceil(
                (expiryDate.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
              )
            );
          }

          break;
        }
        case 'MODULE_ACCESS': {
          const moduleName = formatModuleName(action.data?.moduleType);

          switch (action.data?.action) {
            case 'REQUEST_CREATED':
              title = `${moduleName} Access Requested`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
              break;
            case 'INITIAL_REGISTRATION_APPROVED':
            case 'REQUEST_APPROVED':
              title = `${moduleName} Access Approved`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
              break;
            case 'INITIAL_REGISTRATION_REJECTED':
            case 'REQUEST_REJECTED':
              title = `${moduleName} Access Rejected`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
              break;
            case 'ACCESS_REACTIVATED':
              title = `${moduleName} Access Reactivated`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
              break;
            case 'ACCESS_SUSPENDED':
              title = `${moduleName} Access Suspended`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
              break;
            default:
              title = `${moduleName} Module Activity`;
              subtitle = action.actor ? `By ${action.actor.name}` : '';
          }

          break;
        }
        case 'CHAPTER_CHANGE': {
          const previousChapterName = action.data?.previousChapterName;
          const newChapterName = action.data?.newChapterName;

          title = 'Business Chapter Changed';
          subtitle =
            previousChapterName && newChapterName
              ? `${previousChapterName} → ${newChapterName}`
              : action.actor
                ? `By ${action.actor.name}`
                : '';

          if (action.actor && previousChapterName && newChapterName) {
            subtitle = `${subtitle} | By ${action.actor.name}`;
          }

          break;
        }
        case 'SOCIAL_CHAPTER_CHANGE': {
          const previousChapterName = action.data?.previousChapterName;
          const newChapterName = action.data?.newChapterName;

          title = 'Social Chapter Changed';
          subtitle =
            previousChapterName && newChapterName
              ? `${previousChapterName} → ${newChapterName}`
              : action.actor
                ? `By ${action.actor.name}`
                : '';

          if (action.actor && previousChapterName && newChapterName) {
            subtitle = `${subtitle} | By ${action.actor.name}`;
          }

          break;
        }
        case 'MEMBERSHIP_EXPIRES':
          title = 'Membership Expires';
          subtitle = '';
          if (action.data.expiresAt) {
            const expiryDate = new Date(action.data.expiresAt);
            personalDetails.expiryDate = expiryDate.toLocaleDateString("en-GB");
            personalDetails.daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          }
          break;
        default:
          title = action.kind.replace(/_/g, ' ');
          subtitle = action.actor ? `By ${action.actor.name}` : '';
      }

      return {
        id: idx,
        time: timeLabel,
        title: title,
        subtitle: subtitle
      };
    })
    : MOCK_TIMELINE;

  // Testimonials not available in new API structure, show empty
  const testimonials: Testimonial[] = [];

  const isEdRole = ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(userRole || "");

  const handleGrantModule = async (moduleName: "business" | "professional") => {
    if (!memberId) return;
    try {
      await grantEdModulesAccess({ userId: memberId, modules: [moduleName] }).unwrap();
      showToast({
        title: "Access granted",
        description: `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} access granted successfully.`,
        kind: "success",
      });
      await refetchGrantPreview();
    } catch (e: any) {
      showToast({
        title: "Grant failed",
        description: e?.data?.message || "Please try again.",
        kind: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={meName} />
      <main className="container mx-auto px-4 py-6 pb-24">
        <PageHeader breadcrumbs={[{ label: "Regional Board", onClick: () => navigate("/admin/regional-board") }, { label: "View Members", onClick: () => navigate(-1) }, { label: grantEdModulesMode ? grantModeTitle : "View Profile" }]} />

        {/* Actions (ED roles only) */}
        {isEdRole && (
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-4">
            {grantEdModulesMode ? (
              <>
                <button
                  onClick={() => {
                    const editUrl = isProfessionalsRoute
                      ? `/admin/professionals/${memberId}/edit`
                      : `/admin/regional-board/members/${memberId}/edit`;
                    navigate(editUrl);
                  }}
                  className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44] disabled:opacity-60"
                >
                  Edit
                </button>
                {grantableModules.includes("business") && (
                  <button
                    onClick={() => handleGrantModule("business")}
                    disabled={isGrantingEdModules}
                    className="h-9 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {isGrantingEdModules && targetModule === "business" ? "Granting..." : "Grant Business Access"}
                  </button>
                )}
                {grantableModules.includes("professional") && (
                  <button
                    onClick={() => handleGrantModule("professional")}
                    disabled={isGrantingEdModules}
                    className="h-9 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {isGrantingEdModules && targetModule === "professional" ? "Granting..." : "Grant Professional Access"}
                  </button>
                )}
              </>
            ) : memberStatus === 'Pending' ? (
              // Show Edit, Approve, Reject and Moved Away buttons for pending status
              <>
                {/* The pending state was only implied by which buttons happened to
                    render, so the profile showed no status at all - the very screen
                    the "Membership Rejected" bug appeared on. State it plainly. */}
                <span className="self-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Membership Pending
                </span>
                <button
                  onClick={() => {
                    let editUrl;
                    if (isChapterMembersRoute) {
                      editUrl = approvalId
                        ? `/admin/regional-board/chapter/${routeChapterId}/members/${memberId}/edit?approvalId=${approvalId}`
                        : `/admin/regional-board/chapter/${routeChapterId}/members/${memberId}/edit`;
                    } else if (isProfessionalsRoute) {
                      editUrl = approvalId
                        ? `/admin/professionals/${memberId}/edit?approvalId=${approvalId}`
                        : `/admin/professionals/${memberId}/edit`;
                    } else {
                      editUrl = approvalId
                        ? `/admin/regional-board/members/${memberId}/edit?approvalId=${approvalId}`
                        : `/admin/regional-board/members/${memberId}/edit`;
                    }
                    navigate(editUrl);
                  }}
                  className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44] disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  onClick={handleApprovePending}
                  disabled={isApproving}
                  className="h-9 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {isApproving ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={handleRejectPending}
                  disabled={isRejecting}
                  className="h-9 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
              </>
            ) : (
              <>
                {/* Show Edit button for active/inactive members */}
                <button
                  onClick={() => {
                    let editUrl;
                    if (isChapterMembersRoute) {
                      editUrl = `/admin/regional-board/chapter/${routeChapterId}/members/${memberId}/edit`;
                    } else if (isProfessionalsRoute) {
                      editUrl = `/admin/professionals/${memberId}/edit`;
                    } else {
                      editUrl = `/admin/regional-board/members/${memberId}/edit`;
                    }
                    navigate(editUrl);
                  }}
                  className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44] disabled:opacity-60"
                >
                  Edit
                </button>
                {/* Show Move button for active/inactive members */}
                <button
                  onClick={onMovedAway}
                  className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44] disabled:opacity-60"
                >
                  Move
                </button>
                {/* Show Block/Unblock button based on current status */}
                <button
                  onClick={onBlock}
                  disabled={isBlocking}
                  className="h-9 px-4 rounded-md border border-white/20 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {memberStatus === 'Blocked' ? 'Unblock' : 'Block'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Grid like the mock - Conditional rendering based on route */}
        <section className="grid grid-cols-12 gap-5 items-stretch">
          {isChapterMembersRoute ? (
            // For chapter members route: Show BasicInfo and Business only
            <>
              {/* Left: Profile + Business details */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
                  <ProfileCard
                    name={profileInfo.name}
                    company={profileInfo.company}
                    role={profileInfo.role}
                    postsCount={profileInfo.postsCount}
                    connectionsCount={profileInfo.connectionsCount}
                    avatarUrl={profileInfo.avatarUrl}
                    coverUrl={profileInfo.coverUrl}
                    className="h-full flex-grow"
                  />
                </div>
                <div className="h-[480px] lg:h-[500px] flex">
                  <BusinessDetailsCard details={professionalDetailsForBusinessCard} className="h-full" />
                </div>
              </div>

              {/* Right: Personal Details */}
              <div className="col-span-12 lg:col-span-8">
                <div className="mb-5">
                  <AdminPersonalDetailsCard
                    details={personalDetails}
                    timeline={timeline}
                    hideExpiry={memberStatus === 'Pending'}
                    onExtend={isEdRole && memberStatus !== 'Pending' ? () => {
                      if (!memberId) return;

                      // Find approval and expiry data from actions
                      const approvalData = actionsData.find((action: any) => action.kind === 'APPROVAL');
                      const membershipExpiryData = actionsData.find((action: any) => action.kind === 'MEMBERSHIP_EXPIRES');

                      navigate(`/admin/regional-board/members/${memberId}/extend`, {
                        state: {
                          member: {
                            id: memberId,
                            name: profileInfo.name,
                            email: personal.email,
                            phone: personal.phone,
                            company: business.businessName,
                            profession: professional.role,
                            currentChapterId: routeChapterId,
                            country: raw.basicInfo?.countryName || raw.basicInfo?.country || '',
                            region: raw.basicInfo?.regionName || raw.basicInfo?.state || '',
                            registrationApprovedAt: approvalData?.data?.decidedAt || raw.createdAt || '',
                            expiryDate: membershipExpiryData?.data?.expiresAt || raw.membershipExpiryDate || ''
                          }
                        }
                      });
                    } : undefined}
                  />
                </div>
              </div>
            </>
          ) : isProfessionalsRoute ? (
            // For professionals route: Show BasicInfo and Professional only
            <>
              {/* Left: Profile + Professional details */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
                  <ProfileCard
                    name={profileInfo.name}
                    company={profileInfo.company}
                    role={profileInfo.role}
                    postsCount={profileInfo.postsCount}
                    connectionsCount={profileInfo.connectionsCount}
                    avatarUrl={profileInfo.avatarUrl}
                    coverUrl={profileInfo.coverUrl}
                    className="h-full flex-grow"
                  />
                </div>
                <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
                  <ProfessionalDetailsCard details={businessDetailsForProfessionalCard} />
                </div>
              </div>

              {/* Right: Personal Details */}
              <div className="col-span-12 lg:col-span-8">
                <div className="mb-5">
                  <AdminPersonalDetailsCard
                    details={personalDetails}
                    timeline={timeline}
                    hideExpiry={memberStatus === 'Pending'}
                    onExtend={isEdRole && memberStatus !== 'Pending' ? () => {
                      if (!memberId) return;

                      // Find approval and expiry data from actions
                      const approvalData = actionsData.find((action: any) => action.kind === 'APPROVAL');
                      const membershipExpiryData = actionsData.find((action: any) => action.kind === 'MEMBERSHIP_EXPIRES');

                      navigate(`/admin/regional-board/members/${memberId}/extend`, {
                        state: {
                          member: {
                            id: memberId,
                            name: profileInfo.name,
                            email: personal.email,
                            phone: personal.phone,
                            company: business.businessName,
                            profession: professional.role,
                            currentChapterId: routeChapterId,
                            country: raw.basicInfo?.countryName || raw.basicInfo?.country || '',
                            region: raw.basicInfo?.regionName || raw.basicInfo?.state || '',
                            registrationApprovedAt: approvalData?.data?.decidedAt || raw.createdAt || '',
                            expiryDate: membershipExpiryData?.data?.expiresAt || raw.membershipExpiryDate || ''
                          }
                        }
                      });
                    } : undefined}
                  />
                </div>
              </div>
            </>
          ) : (
            // Default: Show all sections (original layout)
            <>
              {/* Left: Profile + Business details */}
              <div className="col-span-12 lg:col-span-3 space-y-5">
                <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
                  <ProfileCard
                    name={profileInfo.name}
                    company={profileInfo.company}
                    role={profileInfo.role}
                    postsCount={profileInfo.postsCount}
                    connectionsCount={profileInfo.connectionsCount}
                    avatarUrl={profileInfo.avatarUrl}
                    coverUrl={profileInfo.coverUrl}
                    className="h-full flex-grow"
                  />
                </div>
                <div className="h-[480px] lg:h-[500px]">
                  <BusinessDetailsCard details={professionalDetailsForBusinessCard} className="h-full" />
                </div>
              </div>

              {/* Middle: Personal Details */}
              <div className="col-span-12 lg:col-span-5">
                <div className="mb-5">
                  <AdminPersonalDetailsCard
                    details={personalDetails}
                    timeline={timeline}
                    hideExpiry={memberStatus === 'Pending'}
                    onExtend={isEdRole && memberStatus !== 'Pending' ? () => {
                      if (!memberId) return;

                      // Find approval and expiry data from actions
                      const approvalData = actionsData.find((action: any) => action.kind === 'APPROVAL');
                      const membershipExpiryData = actionsData.find((action: any) => action.kind === 'MEMBERSHIP_EXPIRES');

                      navigate(`/admin/regional-board/members/${memberId}/extend`, {
                        state: {
                          member: {
                            id: memberId,
                            name: profileInfo.name,
                            email: personal.email,
                            phone: personal.phone,
                            company: business.businessName,
                            profession: professional.role,
                            currentChapterId: routeChapterId,
                            country: raw.basicInfo?.countryName || raw.basicInfo?.country || '',
                            region: raw.basicInfo?.regionName || raw.basicInfo?.state || '',
                            registrationApprovedAt: approvalData?.data?.decidedAt || raw.createdAt || '',
                            expiryDate: membershipExpiryData?.data?.expiresAt || raw.membershipExpiryDate || ''
                          }
                        }
                      });
                    } : undefined}
                  />
                </div>
              </div>

              {/* Right: Professional + Testimonials */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
                  <ProfessionalDetailsCard details={businessDetailsForProfessionalCard} />
                </div>
                <div className="h-[480px] lg:h-[500px] flex">
                  <TestimonialsCard
                    className="h-full w-full"
                    testimonials={testimonials.length ? testimonials : [{ name: profileInfo.name, text: "No testimonials yet." }]}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {isLoading && <div className="text-gray-400 mt-4">Loading member...</div>}
        {error && <div className="text-red-400 mt-4">Failed to load member.</div>}

        {confirmBlockOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => !confirmLoading && setConfirmBlockOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-[#1a2332] shadow-2xl">
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-700/40 flex items-center justify-center">
                  <span className="text-2xl">⚠</span>
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">You sure you want to {memberStatus === 'Blocked' ? 'Unblock' : 'Block'}?</h3>
                <p className="text-gray-300 text-sm mb-6">This action will {memberStatus === 'Blocked' ? 'unblock' : 'block'} the member from the platform.</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    disabled={!!confirmLoading}
                    onClick={handleBlock}
                    className="px-5 py-2 rounded-md bg-[#D85D27] text-white hover:bg-[#C24F20] disabled:opacity-60"
                  >
                    {confirmLoading ? "Please wait..." : `Yes, ${memberStatus === 'Blocked' ? 'Unblock' : 'Block'}`}
                  </button>
                  <button
                    disabled={!!confirmLoading}
                    onClick={() => setConfirmBlockOpen(false)}
                    className="px-5 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmMoveOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => !confirmLoading && setConfirmMoveOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-[#1a2332] shadow-2xl">
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-700/40 flex items-center justify-center">
                  <span className="text-2xl">⚠</span>
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">Mark as Moved</h3>
                <p className="text-gray-300 text-sm mb-6">This will allow you to change the member's chapter.</p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    disabled={confirmLoading}
                    onClick={handleMoveMember}
                    className="px-5 py-2 rounded-md bg-[#D85D27] text-white hover:bg-[#C24F20] disabled:opacity-60 flex items-center gap-2"
                  >
                    {confirmLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : 'Confirm Moved'}
                  </button>
                  <button
                    disabled={confirmLoading}
                    onClick={() => {
                      setConfirmMoveOpen(false);
                    }}
                    className="px-5 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
