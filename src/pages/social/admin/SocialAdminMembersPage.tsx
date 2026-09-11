import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import FormSelect from "../../../components/forms/FormSelect";
import {
  useGetSocialApprovedMembersQuery,
  useRemoveSocialChapterMemberMutation,
  useGetSocialPendingApprovalsQuery,
  useApproveSocialMemberMutation,
  useRejectSocialMemberMutation,
  useGetEligibleForSocialUsersQuery,
} from "../../../services/social/socialAdminDashboardApi";
import { useToast } from "../../../components/toast/ToastProvider";

interface SocialMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  isRequest: boolean;
  requestedAt?: string;
  socialChapter: string;
  status: "Active" | "Blocked" | "Pending" | "Eligible";
}

export default function SocialAdminMembersPage() {
  const { chapterId } = useParams<{ chapterId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const isPlatformMembersMode = location.pathname.includes("/social/admin/regional-board/platform-members");

  const rawSocialChapterId = chapterId || searchParams.get("chapterId") || "";
  const isValidObjectId = /^[a-f\d]{24}$/i.test(rawSocialChapterId);
  const socialChapterId = isValidObjectId ? rawSocialChapterId : "";

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [appliedStatus, setAppliedStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"members" | "pending" | "eligible">(
    isPlatformMembersMode ? "eligible" : "members"
  );
  const limit = 20;

  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SocialMember | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState("");

  const { data, isLoading, isFetching } = useGetSocialApprovedMembersQuery(
    { socialChapterId, search: appliedSearch || undefined, status: appliedStatus || undefined, page, limit },
    { skip: isPlatformMembersMode || activeTab !== "members" || !socialChapterId }
  );

  const { data: pendingData, isLoading: isPendingLoading, isFetching: isPendingFetching } =
    useGetSocialPendingApprovalsQuery(
      { socialChapterId, search: appliedSearch || undefined, page, limit },
      { skip: isPlatformMembersMode || !socialChapterId }
    );

  const {
    data: eligibleData,
    isLoading: isEligibleLoading,
    isFetching: isEligibleFetching,
  } = useGetEligibleForSocialUsersQuery(
    { search: appliedSearch || undefined, page, limit },
    { refetchOnMountOrArgChange: true }
  );

  const [_removeMember] = useRemoveSocialChapterMemberMutation();
  const [approveMember] = useApproveSocialMemberMutation();
  const [rejectMember] = useRejectSocialMemberMutation();

  const members: SocialMember[] = Array.isArray(data?.data)
    ? data.data.map((m: any) => ({
        id: m._id,
        userId: m._id,
        name: m.name || "",
        email: m.email || "",
        phone: m.basicInfo?.phone || "",
        isRequest: false,
        requestedAt: m.createdAt,
        socialChapter: m.social?.socialChapterId?.name || "",
        status: String(m.status || "").toLowerCase() === "inactive" ? ("Blocked" as const) : ("Active" as const),
      }))
    : [];
  const total = data?.pagination?.total || 0;

  const pendingMembers: SocialMember[] = Array.isArray(pendingData?.data)
    ? pendingData.data.map((req: any) => ({
        id: req._id,
        userId: req.user?._id,
        name: req.user?.name || "",
        email: req.user?.email || "",
        phone: req.user?.basicInfo?.phone || "",
        isRequest: true,
        requestedAt: req.createdAt,
        socialChapter: req.user?.social?.socialChapterId?.name || "",
        status: "Pending" as const,
      }))
    : [];
  const pendingTotal = pendingData?.pagination?.total ?? pendingMembers.length;

  const eligibleMembers: SocialMember[] = Array.isArray(eligibleData?.data)
    ? eligibleData.data.map((u: any) => ({
        id: u._id,
        userId: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.basicInfo?.phone || "",
        isRequest: false,
        requestedAt: u.createdAt,
        socialChapter:
          typeof u.social?.socialChapterId === "object" ? u.social.socialChapterId?.name || "" : "",
        status: "Eligible" as const,
      }))
    : [];
  const eligibleTotal = eligibleData?.pagination?.total ?? eligibleMembers.length;

  const currentChapterName =
    members.find((member) => member.socialChapter)?.socialChapter ||
    pendingMembers.find((member) => member.socialChapter)?.socialChapter ||
    "Current Chapter";

  const currentData =
    activeTab === "pending" ? pendingMembers : activeTab === "eligible" ? eligibleMembers : members;
  const currentLoading =
    activeTab === "pending"
      ? isPendingLoading || isPendingFetching
      : activeTab === "eligible"
        ? isEligibleLoading || isEligibleFetching
        : isLoading || isFetching;

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedStatus(status);
    setPage(1);
  };

  const handleApprove = async (member: SocialMember) => {
    try {
      await approveMember({ approvalId: member.id, data: { grantModules: ["social"] } }).unwrap();
      showToast({ title: "Success", description: "Member approved successfully", kind: "success" });
    } catch (e: any) {
      showToast({ title: "Error", description: e?.data?.message || "Approval failed", kind: "error" });
    }
  };

  const openRejectionModal = (member: SocialMember) => {
    setSelectedMember(member);
    setRejectionRemark("");
    setRejectionModalOpen(true);
    setOpenMenuFor(null);
  };

  const handleConfirmReject = async () => {
    if (!selectedMember || !rejectionRemark.trim()) return;
    try {
      await rejectMember({ approvalId: selectedMember.id, data: { remark: rejectionRemark } }).unwrap();
      showToast({ title: "Success", description: "Member rejected", kind: "success" });
      setRejectionModalOpen(false);
      setSelectedMember(null);
      setRejectionRemark("");
    } catch (e: any) {
      showToast({ title: "Error", description: e?.data?.message || "Rejection failed", kind: "error" });
    }
  };

  // Member Card — matches business module UI exactly
  const MemberCard = ({ member }: { member: SocialMember }) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const initials = member.name.trim().split(" ").map((s) => s[0]?.toUpperCase()).slice(0, 2).join("") || "U";
    const isRequest = member.isRequest;

    const statusMap: Record<string, { label: string; className: string }> = {
      Active: { label: "Active", className: "bg-green-600" },
      Blocked: { label: "Blocked", className: "bg-[#E99F1F]" },
      Pending: { label: "Pending", className: "bg-gray-500" },
      Eligible: { label: "Eligible", className: "bg-[#D85D27]" },
    };

    const actions = isRequest
      ? [{ key: "view", label: "View Profile" }]
      : activeTab === "eligible"
        ? [
            { key: "view", label: "View Profile" },
            { key: "grantSocial", label: "Grant Social Access" },
          ]
      : [
          { key: "block", label: "Block" },
          { key: "moved", label: "Move" },
        ];

    useEffect(() => {
      if (openMenuFor !== member.id) return;
      const handle = (e: MouseEvent) => {
        if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
          setOpenMenuFor(null);
        }
      };
      document.addEventListener("mousedown", handle, true);
      return () => document.removeEventListener("mousedown", handle, true);
    }, [openMenuFor, member.id]);

    const onMenuAction = (key: string) => {
      setOpenMenuFor(null);
      if (key === "view") {
        navigate(
          isPlatformMembersMode
            ? `/social/admin/regional-board/platform-members/${member.userId}/view`
            : `/social/admin/regional-board/chapter/${socialChapterId}/members/${member.userId}/view`,
          {
            state:
              activeTab === "eligible"
                ? { mode: "grant-social", sourceTab: "eligible" }
                : { approvalId: member.id },
          }
        );
      } else if (key === "grantSocial") {
        navigate(
          isPlatformMembersMode
            ? `/social/admin/regional-board/platform-members/${member.userId}/view`
            : `/social/admin/regional-board/chapter/${socialChapterId}/members/${member.userId}/view`,
          { state: { mode: "grant-social", sourceTab: "eligible" } }
        );
      } else if (key === "block") {
        showToast({ title: "Coming soon", description: "Block functionality coming soon.", kind: "success" });
      } else if (key === "moved") {
        showToast({ title: "Coming soon", description: "Move functionality coming soon.", kind: "success" });
      }
    };

    return (
      <GradientContainer>
        <div className="relative rounded-xl p-4 flex flex-col h-full" ref={cardRef}>
          {/* Kebab menu */}
          <button
            className="absolute top-3 right-3 text-gray-300 hover:text-white"
            onClick={() => setOpenMenuFor(openMenuFor === member.id ? null : member.id)}
          >
            <span className="inline-block w-6 h-6">⋮</span>
          </button>

          {openMenuFor === member.id && (
            <div className="absolute right-3 top-10 z-10 w-40 rounded-md border border-gray-700 bg-[#1a2332] shadow-lg">
              {actions.map((a) => (
                <button
                  key={a.key}
                  onClick={() => onMenuAction(a.key)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Member info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 mr-8">
              <div className="text-white text-lg font-semibold leading-tight truncate">{member.name || "Unknown"}</div>
              <div className="text-gray-300 text-sm truncate">{member.email}</div>
              <div className="text-gray-400 text-xs">{member.phone}</div>
              {member.socialChapter && (
                <div className="mt-2 mb-2">
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#D85D27] text-white">
                    {member.socialChapter}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {isRequest ? (
            <div className="mt-4 grid grid-cols-2 gap-3 mt-auto">
              <button
                className="h-9 w-full rounded-lg border border-[#D85D27] text-white hover:bg-[#D85D27] transition-colors"
                onClick={() => handleApprove(member)}
              >
                Accept
              </button>
              <button
                className="h-9 w-full rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                onClick={() => openRejectionModal(member)}
              >
                Reject
              </button>
            </div>
          ) : activeTab === "eligible" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 mt-auto">
              <button
                className="h-9 w-full rounded-lg border border-gray-700 text-white hover:bg-gray-800 transition-colors"
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${member.userId}/view`
                      : `/social/admin/regional-board/chapter/${socialChapterId}/members/${member.userId}/view`,
                    { state: { mode: "grant-social", sourceTab: "eligible" } }
                  )
                }
              >
                View Profile
              </button>
              <button
                className="min-h-[44px] w-full rounded-lg bg-[#D85D27] px-3 py-2 text-sm font-medium leading-5 text-white hover:bg-[#C24F20] transition-colors"
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${member.userId}/view`
                      : `/social/admin/regional-board/chapter/${socialChapterId}/members/${member.userId}/view`,
                    { state: { mode: "grant-social", sourceTab: "eligible" } }
                  )
                }
              >
                Grant Social Access
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 mt-auto">
              <button
                className="h-9 w-full rounded-lg border border-gray-700 text-white hover:bg-gray-800 transition-colors"
                onClick={() =>
                  navigate(
                    isPlatformMembersMode
                      ? `/social/admin/regional-board/platform-members/${member.userId}/view`
                      : `/social/admin/regional-board/chapter/${socialChapterId}/members/${member.userId}/view`
                  )
                }
              >
                View Profile
              </button>
              <div
                className={`h-9 w-full rounded-lg text-white text-sm flex items-center justify-center ${statusMap[member.status]?.className || "bg-gray-600"}`}
              >
                {statusMap[member.status]?.label || member.status}
              </div>
            </div>
          )}
        </div>
      </GradientContainer>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button
            onClick={() => navigate("/social/admin/regional-board")}
            className="hover:text-white transition-colors"
          >
            Regional Board
          </button>
          <span>›</span>
          {isPlatformMembersMode ? (
            <span className="text-white">Add Platform Member</span>
          ) : (
            <>
              <span>Chapter</span>
              <span>›</span>
              <span className="text-white">View Members</span>
            </>
          )}
        </div>

        {!isPlatformMembersMode && !isValidObjectId && (
          <div className="mb-6 rounded-md border border-yellow-700 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
            Invalid or missing chapter id. Please go back to Regional Board and open Members from a chapter card.
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end lg:flex lg:flex-nowrap lg:gap-3">
            <div className="w-full lg:w-[240px] flex-none">
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <input
                type="text"
                placeholder="Enter Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                disabled={!isPlatformMembersMode && activeTab === "members" && !socialChapterId}
                className="w-full h-[46px] px-4 bg-[#1a2332] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {!isPlatformMembersMode && (
              <div className="w-full lg:w-[240px] flex-none">
                <label className="block text-sm text-gray-400 mb-2">Chapter</label>
                <div className="flex h-[46px] w-full items-center rounded-md border border-gray-700 bg-[#1a2332] px-4 text-white">
                  <span className="truncate">{currentChapterName}</span>
                </div>
              </div>
            )}

            {!isPlatformMembersMode && (
              <div className="w-full lg:w-[240px] flex-none">
                <FormSelect
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Blocked" },
                  ]}
                />
              </div>
            )}

            <div className="w-full lg:w-[140px] flex-none">
              <button
                onClick={handleSearch}
                disabled={!isPlatformMembersMode && activeTab === "members" && !socialChapterId}
                className="h-[46px] w-full px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed lg:mt-[26px]"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {!isPlatformMembersMode && (
          <div className="flex items-center gap-8 border-b border-gray-700 mb-4">
            <button
              className={`pb-2 text-sm ${activeTab === "members" ? "text-white border-b-2 border-orange-500" : "text-gray-400"}`}
              onClick={() => setActiveTab("members")}
            >
              Members ({total})
            </button>
            <button
              className={`pb-2 text-sm ${activeTab === "pending" ? "text-white border-b-2 border-orange-500" : "text-gray-400"}`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Approvals ({pendingTotal})
            </button>
          </div>
        )}

        {/* Loading */}
        {currentLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Grid */}
        {!currentLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {currentData.length > 0 ? (
              currentData.map((member) => <MemberCard key={member.id} member={member} />)
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="text-lg mb-2">
                  {activeTab === "pending"
                    ? "No pending approvals found"
                    : activeTab === "eligible"
                      ? "No business or professional members are available for social access"
                      : "No members found"}
                </p>
                <p className="text-sm">
                  {activeTab === "pending"
                    ? "There are no pending approvals at this time."
                    : activeTab === "eligible"
                    ? appliedSearch
                      ? "Try adjusting your search criteria."
                      : "No approved business or professional members are currently available for social access."
                    : appliedSearch
                    ? "Try adjusting your search criteria."
                    : "Click the Search button to load members."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {currentData.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-300">
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, activeTab === "pending" ? pendingTotal : activeTab === "eligible" ? eligibleTotal : total)} of{" "}
              {activeTab === "pending" ? pendingTotal : activeTab === "eligible" ? eligibleTotal : total}{" "}
              {activeTab === "pending"
                ? "pending approvals"
                : activeTab === "eligible"
                  ? "eligible members"
                  : "members"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={
                  page === 1 ||
                  (activeTab === "pending"
                    ? isPendingFetching
                    : activeTab === "eligible"
                      ? isEligibleFetching
                      : isFetching)
                }
                className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  page * limit >= (activeTab === "pending" ? pendingTotal : activeTab === "eligible" ? eligibleTotal : total) ||
                  (activeTab === "pending"
                    ? isPendingFetching
                    : activeTab === "eligible"
                      ? isEligibleFetching
                      : isFetching)
                }
                className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Rejection modal — matches business module pattern */}
      {rejectionModalOpen && selectedMember && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setRejectionModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-[#1a2332] shadow-2xl">
            <div className="p-6">
              <h3 className="text-white text-lg font-semibold mb-1">Reject Member</h3>
              <p className="text-gray-400 text-sm mb-4">
                Rejecting <span className="text-white font-medium">{selectedMember.name}</span>. Please provide a reason.
              </p>
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1.5">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionRemark}
                  onChange={(e) => setRejectionRemark(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Enter rejection reason..."
                  className="w-full bg-[#0f1419] border border-gray-600 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#D85D27] resize-none"
                />
                <div className="text-gray-500 text-xs text-right mt-1">{rejectionRemark.length}/500</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="flex-1 h-10 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectionRemark.trim()}
                  className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
