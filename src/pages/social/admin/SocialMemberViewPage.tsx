import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import AdminPersonalDetailsCard, {
  type AdminPersonalDetail,
  type AdminTimelineItem,
} from "../../../components/admin/AdminPersonalDetailsCard";
import { ProfileCard } from "../../../components/profile";
import GradientContainer from "../../../components/common/GradientContainer";
import {
  useGetScUserActionsQuery,
  useApproveSocialMemberMutation,
  useRejectSocialMemberMutation,
  useBlockSocialMemberMutation,
  useUnblockSocialMemberMutation,
  useGetGrantSocialPreviewQuery,
  useGrantSocialAccessMutation,
} from "../../../services/social/socialAdminDashboardApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { getSocialCategoryLabel } from "../../../utils/businessCategories";

export default function SocialMemberViewPage() {
  const navigate = useNavigate();
  const { chapterId, userId } = useParams<{ chapterId: string; userId: string }>();
  const location = useLocation();
  const { showToast } = useToast();
  const isPlatformMembersMode = location.pathname.includes("/social/admin/regional-board/platform-members");

  const passedApprovalId: string | undefined = location.state?.approvalId;
  const grantSocialMode = location.state?.mode === "grant-social";

  const { data, isLoading, error, refetch } = useGetScUserActionsQuery(
    { userId: userId || "" },
    { skip: !userId, refetchOnMountOrArgChange: true }
  );

  const {
    data: grantPreviewData,
    isLoading: isGrantPreviewLoading,
    error: grantPreviewError,
    refetch: refetchGrantPreview,
  } = useGetGrantSocialPreviewQuery(
    { userId: userId || "" },
    { skip: !userId || !grantSocialMode, refetchOnMountOrArgChange: true }
  );

  const [approveMember, { isLoading: isApproving }] = useApproveSocialMemberMutation();
  const [rejectMember, { isLoading: isRejecting }] = useRejectSocialMemberMutation();
  const [blockMember] = useBlockSocialMemberMutation();
  const [unblockMember] = useUnblockSocialMemberMutation();
  const [grantSocialAccess, { isLoading: isGrantingSocial }] = useGrantSocialAccessMutation();

  // Refetch when navigating back from edit/extend page via location state
  useEffect(() => {
    if (location.state?.refresh) {
      window.history.replaceState({}, document.title);
      if (grantSocialMode) refetchGrantPreview();
      else refetch();
    }
  }, [grantSocialMode, location.state?.refresh, refetch, refetchGrantPreview]);

  // Refetch when navigating back from edit page via sessionStorage flag
  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem("refreshMemberData");
    if (shouldRefresh === "true") {
      sessionStorage.removeItem("refreshMemberData");
      if (grantSocialMode) refetchGrantPreview();
      else refetch();
    }
  }, [grantSocialMode, refetch, refetchGrantPreview]);

  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const user = (data?.user || grantPreviewData?.data?.user) as any;
  const actionsData: any[] = data?.data || [];
  const resolvedApprovalId: string = passedApprovalId || data?.approvalId || "";
  const grantPreview = grantPreviewData?.data as any;
  const needsSocialChapter = Boolean(grantPreview?.needsSocialChapter);
  const isEligibleForSocial = grantPreview?.eligible !== false;
  const isPending = !user?.isApproved;
  const isBlocked = user?.status === "inactive";

  // Social chapter details
  const socialChapter = user?.social?.socialChapterId;
  const socialChapterName = typeof socialChapter === "object" ? (socialChapter?.name ?? "") : "";
  const socialChapterArea = typeof socialChapter === "object"
    ? [socialChapter?.area, socialChapter?.city].filter(Boolean).join(", ")
    : "";

  // Basic info
  const phone = user?.basicInfo?.phone || "";
  const gender = user?.basicInfo?.gender || "";
  const streetAddress = user?.basicInfo?.streetAddress || "";
  const countryName =
    typeof user?.basicInfo?.country === "object"
      ? user.basicInfo.country?.name || ""
      : "";
  const regionName =
    typeof user?.basicInfo?.region === "object"
      ? user.basicInfo.region?.name || ""
      : "";

  // Full address string for AdminPersonalDetailsCard
  const fullAddress = [streetAddress, regionName, countryName].filter(Boolean).join(", ");

  // Categories for display under name in ProfileCard
  const socialCategories = Array.isArray(user?.social?.socialCategory)
    ? (user.social.socialCategory as string[]).map(getSocialCategoryLabel).join(", ")
    : "";

  // Membership expiry
  const membershipExpiryData = actionsData.find((a: any) => a.kind === "MEMBERSHIP_EXPIRES");
  const expiresAt = membershipExpiryData?.data?.expiresAt || user?.membershipInfo?.expiresAt;
  const expiryDateDisplay = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : undefined;
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : undefined;

  // PersonalDetails for AdminPersonalDetailsCard
  const personalDetails: AdminPersonalDetail = {
    phone,
    email: user?.email || "",
    address: fullAddress || undefined,
    chapterName: socialChapterName,
    chapterRegion: socialChapterArea,
    expiryDate: expiryDateDisplay,
    daysLeft: typeof daysLeft === "number" ? daysLeft : undefined,
  };

  // Build timeline from actions (same pattern as ViewMemberProfilePage)
  const timeline: AdminTimelineItem[] = useMemo(() => {
    if (!actionsData.length) return [];
    const formatModuleName = (moduleType?: string) => {
      if (!moduleType) return "Module";
      return moduleType.charAt(0).toUpperCase() + moduleType.slice(1);
    };

    return actionsData.map((action: any, idx: number) => {
      // A missing or zero timestamp formatted straight through as "Jan 1, 1970"
      // against applications that were only waiting to be decided. Say the date
      // is not set yet rather than inventing the epoch.
      const parsed = action.at ? new Date(action.at) : null;
      const actionDate =
        parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() !== 0 ? parsed : null;
      const timeLabel = actionDate
        ? actionDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Date Pending";

      let title = "";
      let subtitle = "";
      switch (action.kind) {
        case "ACCOUNT_CREATED":
          title = "Account Created";
          break;
        case "EMAIL_VERIFIED":
          title = "Email Verified";
          break;
        case "APPROVAL_REQUESTED":
          title = "Membership Requested";
          break;
        case "APPROVAL": {
          // Anything that was not APPROVED used to be labelled "Membership
          // Rejected", so a pending application read as rejected - the worst
          // possible thing to get wrong on a screen someone approves from.
          const approvalStatus = String(action.data?.status || "").toUpperCase();
          title =
            approvalStatus === "APPROVED"
              ? "Membership Approved"
              : approvalStatus === "REJECTED"
                ? "Membership Rejected"
                : approvalStatus === "PENDING"
                  ? "Membership Pending"
                  : "Membership Status Updated";
          subtitle = action.actor ? `By ${action.actor.name}` : "";
          break;
        }
        case "MODULE_ACCESS": {
          const moduleName = formatModuleName(action.data?.moduleType);
          switch (action.data?.action) {
            case "REQUEST_CREATED":
              title = `${moduleName} Access Requested`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
              break;
            case "INITIAL_REGISTRATION_APPROVED":
            case "REQUEST_APPROVED":
              title = `${moduleName} Access Approved`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
              break;
            case "INITIAL_REGISTRATION_REJECTED":
            case "REQUEST_REJECTED":
              title = `${moduleName} Access Rejected`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
              break;
            case "ACCESS_REACTIVATED":
              title = `${moduleName} Access Reactivated`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
              break;
            case "ACCESS_SUSPENDED":
              title = `${moduleName} Access Suspended`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
              break;
            default:
              title = `${moduleName} Module Activity`;
              subtitle = action.actor ? `By ${action.actor.name}` : "";
          }
          break;
        }
        case "CHAPTER_CHANGE":
          title = "Business Chapter Changed";
          subtitle =
            action.data?.previousChapterName && action.data?.newChapterName
              ? `${action.data.previousChapterName} → ${action.data.newChapterName}`
              : action.actor
                ? `By ${action.actor.name}`
                : "";
          if (action.actor && action.data?.previousChapterName && action.data?.newChapterName) {
            subtitle = `${subtitle} | By ${action.actor.name}`;
          }
          break;
        case "SOCIAL_CHAPTER_CHANGE":
          title = "Social Chapter Changed";
          subtitle =
            action.data?.previousChapterName && action.data?.newChapterName
              ? `${action.data.previousChapterName} → ${action.data.newChapterName}`
              : action.actor
                ? `By ${action.actor.name}`
                : "";
          if (action.actor && action.data?.previousChapterName && action.data?.newChapterName) {
            subtitle = `${subtitle} | By ${action.actor.name}`;
          }
          break;
        default:
          title = action.kind.replace(/_/g, " ");
          subtitle = action.actor ? `By ${action.actor.name}` : "";
      }
      return { id: idx, time: timeLabel, title, subtitle };
    });
  }, [actionsData]);

  const handleApprove = async () => {
    if (!resolvedApprovalId) {
      showToast({ title: "Error", description: "Approval request not found", kind: "error" });
      return;
    }
    try {
      await approveMember({ approvalId: resolvedApprovalId, data: { grantModules: ["social"] } }).unwrap();
      showToast({ title: "Member approved", description: "Social module access granted.", kind: "success" });
      refetch();
    } catch (e: any) {
      showToast({ title: "Approval failed", description: e?.data?.message || "Please try again.", kind: "error" });
    }
  };

  const handleReject = async () => {
    if (!resolvedApprovalId) {
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
      await rejectMember({ approvalId: resolvedApprovalId, data: { remark: remark.trim() } }).unwrap();
      showToast({ title: "Member rejected", description: "Rejection sent.", kind: "success" });
      refetch();
    } catch (e: any) {
      showToast({ title: "Rejection failed", description: e?.data?.message || "Please try again.", kind: "error" });
    }
  };

  const handleGrantSocial = async () => {
    if (!userId) return;
    if (needsSocialChapter) {
      navigate(
        isPlatformMembersMode
          ? `/social/admin/regional-board/platform-members/${userId}/move`
          : `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/move`,
        {
          state: {
            mode: "grant-social",
            member: {
              id: user?._id || userId,
              name: user?.name || "",
              email: user?.email || "",
              phone: user?.basicInfo?.phone || "",
              currentChapterId:
                typeof user?.social?.socialChapterId === "object"
                  ? user.social.socialChapterId?._id || ""
                  : user?.social?.socialChapterId || "",
              currentChapterName:
                typeof user?.social?.socialChapterId === "object"
                  ? user.social.socialChapterId?.name || ""
                  : "",
            },
          },
        }
      );
      return;
    }

    try {
      await grantSocialAccess({ userId }).unwrap();
      showToast({
        title: "Social Access Granted",
        description: "Social module access granted successfully.",
        kind: "success",
      });
      navigate(
        isPlatformMembersMode
          ? "/social/admin/regional-board/platform-members"
          : chapterId
          ? `/social/admin/regional-board/chapter/${chapterId}/members`
          : "/social/admin/regional-board"
      );
    } catch (e: any) {
      showToast({
        title: "Grant failed",
        description: e?.data?.message || "Please try again.",
        kind: "error",
      });
    }
  };

  if (isLoading || isGrantPreviewLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || grantPreviewError || (!(isLoading || isGrantPreviewLoading) && !user)) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar />
        <div className="text-red-400 p-6">Failed to load member profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main className="container mx-auto px-4 py-6 pb-24">
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
            { label: "View Profile" },
          ]}
        />

        {/* Action buttons — matches business ViewMemberProfilePage exactly */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-4">
          {grantSocialMode ? (
            <>
              <button
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${userId}/edit`
                      : `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/edit`
                  )
                }
                className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44]"
              >
                Edit
              </button>
              <button
                onClick={handleGrantSocial}
                disabled={isGrantingSocial || !isEligibleForSocial}
                className="h-9 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {needsSocialChapter
                  ? "Assign Chapter & Grant"
                  : isGrantingSocial
                    ? "Granting..."
                    : "Grant Social Access"}
              </button>
            </>
          ) : isPending ? (
            <>
              <button
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${userId}/edit`
                      : `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/edit`,
                    { state: { approvalId: resolvedApprovalId } }
                  )
                }
                className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44]"
              >
                Edit
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="h-9 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isApproving ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="h-9 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${userId}/edit`
                      : `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/edit`
                  )
                }
                className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44]"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${userId}/move`
                      : `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/move`,
                    {
                      state: {
                        member: {
                          id: userId,
                          name: user?.name || "",
                          email: user?.email || "",
                          phone,
                          currentChapterId: chapterId,
                          currentChapterName: socialChapterName,
                          country: countryName,
                          region: regionName,
                        },
                      },
                    }
                  )
                }
                className="h-9 px-4 rounded-md bg-[#FF6A21] text-white hover:bg-[#ff7f44]"
              >
                Move
              </button>
              <button
                onClick={() => setConfirmBlockOpen(true)}
                className="h-9 px-4 rounded-md border border-white/20 text-white hover:bg-white/10"
              >
                {isBlocked ? "Unblock" : "Block"}
              </button>
            </>
          )}
        </div>

        {/* Same grid layout as ViewMemberProfilePage */}
        <section className="grid grid-cols-12 gap-5 items-start">
          {/* Left: ProfileCard + Social Details */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            <div className="min-h-[360px] lg:min-h-[380px] flex flex-col">
              <ProfileCard
                name={user?.name || ""}
                company={
                  socialChapterName ||
                  (grantSocialMode ? "Business or Professional Member for Social Access" : "Social Member")
                }
                role=""
                postsCount="0"
                connectionsCount="0"
                avatarUrl={undefined}
                coverUrl={undefined}
                className="h-full flex-grow"
              />
            </div>

            {/* Additional Details */}
            <GradientContainer>
              <div className="rounded-[18px] border border-white/10 p-5 md:p-6 flex flex-col gap-4">
                <h3 className="text-xl font-semibold text-white">Additional Details</h3>
                <div className="h-px bg-white/10 -mx-5 md:-mx-6" />
                <div className="space-y-4">
                  {grantSocialMode && grantPreview?.reasons?.length > 0 && (
                    <SocialRow label="Eligibility Notes" value={grantPreview.reasons.join(", ")} multiline />
                  )}
                  {gender && <SocialRow label="Gender" value={gender.charAt(0).toUpperCase() + gender.slice(1)} />}
                  {regionName && <SocialRow label="Region" value={regionName} />}
                  {countryName && <SocialRow label="Country" value={countryName} />}
                </div>

                <div className="h-px bg-white/10 -mx-5 md:-mx-6" />
                <h3 className="text-xl font-semibold text-white">Social Profile</h3>
                <div className="space-y-4">
                  {socialCategories && (
                    <SocialRow label="Categories" value={socialCategories} />
                  )}
                  {user?.social?.travelForEvents && (
                    <SocialRow label="Travel for Events" value={user.social.travelForEvents} />
                  )}
                  {user?.social?.motivation && (
                    <SocialRow label="Motivation" value={user.social.motivation} multiline />
                  )}
                  {user?.social?.hobbies && (
                    <SocialRow label="Hobbies" value={user.social.hobbies} multiline />
                  )}
                  {!socialCategories && !user?.social?.motivation && !user?.social?.hobbies && (
                    <p className="text-white/40 text-xs">No social profile details available.</p>
                  )}
                </div>
              </div>
            </GradientContainer>
          </div>

          {/* Right: AdminPersonalDetailsCard with timeline */}
          <div className="col-span-12 lg:col-span-8">
            <AdminPersonalDetailsCard
              details={personalDetails}
              timeline={timeline}
              onExtend={!isPending && userId ? () => {
                const approvalAction = actionsData.find((a: any) => a.kind === "APPROVAL");
                navigate(
                  `/social/admin/regional-board/chapter/${chapterId}/members/${userId}/extend`,
                  {
                    state: {
                      member: {
                        id: userId,
                        name: user?.name || "",
                        email: user?.email || "",
                        phone,
                        currentChapterId: chapterId,
                        country: countryName,
                        region: regionName,
                        registrationApprovedAt: approvalAction?.data?.decidedAt || user?.createdAt || "",
                        expiryDate: expiresAt || "",
                      },
                    },
                  }
                );
              } : undefined}
            />
          </div>
        </section>
      </main>

      {/* Block / Unblock confirmation modal */}
      {confirmBlockOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !confirmLoading && setConfirmBlockOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-[#1a2332] shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-700/40 flex items-center justify-center">
                <span className="text-2xl">⚠</span>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">
                {isBlocked ? "Unblock this member?" : "Block this member?"}
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                {isBlocked
                  ? "This will restore the member's access to the platform."
                  : "This will block the member from the platform."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  disabled={confirmLoading}
                  onClick={async () => {
                    if (!userId) return;
                    setConfirmLoading(true);
                    try {
                      if (isBlocked) {
                        await unblockMember(userId).unwrap();
                        showToast({ title: "Success", description: "Member has been unblocked.", kind: "success" });
                      } else {
                        await blockMember(userId).unwrap();
                        showToast({ title: "Success", description: "Member has been blocked.", kind: "success" });
                      }
                      setConfirmBlockOpen(false);
                      refetch();
                    } catch (e: any) {
                      showToast({ title: "Error", description: e?.data?.message || "Action failed.", kind: "error" });
                    } finally {
                      setConfirmLoading(false);
                    }
                  }}
                  className="px-5 py-2 rounded-md bg-[#D85D27] text-white hover:bg-[#C24F20] disabled:opacity-60"
                >
                  {confirmLoading ? "Please wait..." : isBlocked ? "Yes, Unblock" : "Yes, Block"}
                </button>
                <button
                  disabled={confirmLoading}
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
    </div>
  );
}

function SocialRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-white/50 text-xs mb-0.5">{label}</div>
      <div className={`text-white/90 text-[15px] ${multiline ? "leading-relaxed" : ""}`}>{value}</div>
    </div>
  );
}
