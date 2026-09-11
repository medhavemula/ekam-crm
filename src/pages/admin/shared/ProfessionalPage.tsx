import { useState, useEffect, useCallback } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FormInput from "../../../components/forms/FormInput";
import GradientContainer from "../../../components/common/GradientContainer";
import {
  useGetProfessionalPendingApprovalsQuery,
  useGetApprovedMembersQuery,
  useApproveProfessionalMemberMutation,
  useRejectProfessionalMemberMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
} from "../../../services/approvalsApi";
import { AdminStatCard } from "../../../components/admin/AdminStatCard";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetModuleAccessRequestsQuery,
  useReviewModuleRequestApproveMutation,
  useReviewModuleRequestRejectMutation,
} from "../../../services/adminModuleAccessApi";

interface MemberRecord {
  id: string;
  userId?: string; // Add userId for request records
  name: string;
  email: string;
  phone: string;
  company: string;
  profession: string;
  status: "Joined" | "Blocked" | "Deleted" | "Pending" | "inactive" | "active";
  region?: string;
  area?: string;
  isRequest?: boolean;
  requestedAt?: string;
  requestedModule?: "business" | "professional" | "social"; // Add for module requests
  requestType?: string; // Add to distinguish request types
  chapterName?: string; // Add chapter name for module requests
  moduleData?: any; // Add module data for module requests
  hasBusiness?: boolean; // Add to track if user has business data
  hasProfessional?: boolean; // Add to track if user has professional data
  originalData?: any; // Store original API response for approval logic
}

export default function MembersPage() {
  const navigate = useNavigate();
  const { moduleType: routeModuleType } = useParams();
  const [userName] = useState("Mike");
  const userRole = useSelector((state: RootState) => state.auth.role);

  // Get moduleType from URL params or default to 'professional'
  const moduleType = routeModuleType as "business" | "professional" | "social" || "professional";

  // Check if user has limited access (Chapter/Support/Launch Director, President)
  const hasLimitedAccess = ["CHAPTER_DIRECTOR", "SUPPORT_DIRECTOR", "LAUNCH_DIRECTOR", "PRESIDENT"].includes(
    userRole || "",
  );


  // Member Card component (inline)
  const MemberCard = ({ rec, requestMode }: { rec: MemberRecord; requestMode?: boolean }) => {
    const statusMap: Record<MemberRecord["status"], { label: string; className: string }> = {
      Joined: { label: "Active", className: "text-[var(--ov-ink-2)]" },
      active: { label: "Active", className: "text-[var(--ov-ink-2)]" },
      Blocked: { label: "Blocked", className: "text-[var(--ov-ember)]" },
      inactive: { label: "Blocked", className: "text-[var(--ov-ember)]" },
      Deleted: { label: "Deleted", className: "text-[var(--ov-danger)]" },
      Pending: { label: "Awaiting approval", className: "text-[var(--ov-pending)]" },
    };

    const initials = rec.name?.trim()?.split(" ").map(s => s[0]?.toUpperCase()).slice(0,2).join("") || "U";
    const isRequest = rec.isRequest === true;

    const actions: { key: string; label: string }[] = isRequest
      ? [
          { key: "viewProfile", label: "View Profile" },
          { key: "unblock", label: "Unblock" },
        ]
      : rec.status === "Blocked" || rec.status === "inactive"
      ? [
          { key: "unblock", label: "Unblock" },
        ]
      : [
          { key: "block", label: "Block" },
        ];

    const onAction = async (key: string) => {
      if (key === "viewProfile") {
        navigate(`/admin/regional-board/members/${rec.userId || rec.id}/view`);
      } else if (key === "approve") {
        await handleApproval(rec);
      } else if (key === "block") {
        await handleBlockMember(rec);
      } else if (key === "unblock") {
        await handleUnblockMember(rec);
      }

      setOpenMenuFor(null);
    };

    return (
      <GradientContainer>
      <div className="relative rounded-xl p-4 flex flex-col h-full">
        {/* Kebab */}
        <button
          className="absolute top-3 right-3 text-[var(--ov-ink-2)] hover:text-[var(--ov-ink)]"
          onClick={() => setOpenMenuFor(openMenuFor === rec.id ? null : rec.id)}
        >
          <span className="inline-block w-6 h-6">⋮</span>
        </button>
        {openMenuFor === rec.id && (
          <div className="absolute right-3 top-10 z-20 w-44 rounded-xl bg-[var(--ov-raised)] p-1 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line-strong)]">
            {actions.map(a => (
              <button
                key={a.key}
                onClick={() => onAction(a.key)}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--ov-fill-subtle)] flex items-center justify-center text-[var(--ov-ink)] text-lg font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[var(--ov-ink)] text-lg font-semibold leading-tight">{rec.name || "Unknown"}</div>
            <div className="text-[var(--ov-ink-2)] text-sm truncate">{rec.email}</div>
            <div className="text-[var(--ov-ink-4)] text-xs">{rec.phone}</div>
            {/** Chapter chip */}
            <div className="mt-2 mb-2">
              {rec.requestType === 'MODULE_ACCESS' ? (
                <span className="ekam-eyebrow mr-2 inline-block rounded-md bg-[var(--ov-pending-wash)] px-2 py-0.5 text-[9.5px] font-semibold text-[var(--ov-pending)]">
                  {rec.requestedModule?.toUpperCase()} Module
                </span>
              ) : (
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]">
                  Professional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Push buttons to bottom */}
        <div className="mt-auto">

        {requestMode ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="h-9 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              onClick={() =>
                rec.requestType === 'MODULE_ACCESS'
                  ? openRejectionModal(rec.id)
                  : handleRejection(rec.id)
              }
            >
              Reject
            </button>
            <button
              className="h-9 rounded-lg bg-[var(--ov-ember-fill)] text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
              onClick={() => handleApproval(rec)}
            >
              Accept
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className={`h-9 rounded-lg border border-[color:var(--ov-line)] text-[var(--ov-ink)] ${rec.status === 'Deleted' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--ov-fill-hover)]'}`}
              onClick={() => rec.status !== 'Deleted' && navigate(`/admin/regional-board/members/${rec.id}/view`)}
              disabled={rec.status === 'Deleted'}
            >
              View Profile
            </button>
            <div
              className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-medium ring-1 ring-[color:var(--ov-line-faint)] ${statusMap[rec.status]?.className || "text-[var(--ov-ink-4)]"}`}
            >
              {statusMap[rec.status]?.label || rec.status}
            </div>
          </div>
        )}
        </div>
      </div>
      </GradientContainer>
    );
  };

  // Filter states
  const [selectedName, setSelectedName] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchParams] = useSearchParams();
  const [selectedChapter, setSelectedChapter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "module-requests">(
    routeModuleType ? "module-requests" : "all"
  );
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // Handle search functionality
  const handleSearch = useCallback(() => {
    setActiveSearch(selectedName);
    setPage(1);
  }, [selectedName, selectedChapter]);

  // Get chapterId from URL query parameters
  const urlChapterId = searchParams.get('chapterId');

  // API calls for professional module
  const { data: pendingData, isLoading: isPendingLoading, refetch: refetchPending } = useGetProfessionalPendingApprovalsQuery(
    {
      page,
      limit: pageSize,
    }
  );

  const { data: approvedData, isLoading: isLoadingApproved, refetch: refetchApproved } = useGetApprovedMembersQuery(
    {
      moduleFilter: 'professional',
      chapterId: selectedChapter || undefined,
      page,
      limit: pageSize,
      search: activeSearch || undefined,
    },
    { skip: activeTab !== "all" }
  );

  // Get module access requests for "module-requests" tab
  const { data: moduleRequestsRes, refetch: refetchModuleRequests } = useGetModuleAccessRequestsQuery({
    status: "PENDING",
    moduleType: moduleType,
    page,
    limit: pageSize,
  });

  const [approveMember] = useApproveProfessionalMemberMutation();
  const [rejectMember] = useRejectProfessionalMemberMutation();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const { showToast } = useToast();
  const [reviewModuleRequestApprove] = useReviewModuleRequestApproveMutation();
  const [reviewModuleRequestReject] = useReviewModuleRequestRejectMutation();

  // Transform API data to MemberRecord format
  const membersItems: MemberRecord[] = Array.isArray(approvedData?.data) 
    ? approvedData.data.map((member: any) => ({
        id: member._id,
        userId: member._id,
        name: member.name || '',
        email: member.email || '',
        phone: member.basicInfo?.phone || '',
        company: member.professional?.companyName || '',
        profession: member.professional?.profession || '',
        status: member.status || (member.moduleRequestStatus?.professional === 'APPROVED' ? 'Joined' : 'Pending'),
        region: member.basicInfo?.region,
        area: member.professional?.chapterId?.area || '',
        isRequest: false,
      }))
    : [];

  const pendingItems: any[] = Array.isArray((pendingData as any)?.data)
    ? ((pendingData as any).data as any[])
    : Array.isArray((pendingData as any)?.data?.items)
      ? (((pendingData as any).data.items) as any[])
      : [];
  const requestsData: MemberRecord[] = pendingItems.map((req: any) => {
    const moduleRequestStatus = req.user?.moduleRequestStatus || {};
    const hasBusiness = moduleRequestStatus.business === 'PENDING';
    const hasProfessional = moduleRequestStatus.professional === 'PENDING';
    
    return {
      id: req._id,
      userId: req.user?._id,
      name: req.user?.name || '',
      email: req.user?.email || '',
      phone: req.user?.basicInfo?.phone || '',
      company: req.user?.professional?.companyName || '',
      profession: req.user?.professional?.profession || '',
      status: 'Pending',
      region: req.user?.basicInfo?.region,
      area: req.user?.professional?.chapterId?.area || '',
      isRequest: true,
      requestedAt: req.createdAt,
      hasBusiness,
      hasProfessional,
      originalData: req // Store original API response
    };
  });
  const requestsTotal =
    (pendingData as any)?.pagination?.total ??
    (pendingData as any)?.total ??
    (pendingData as any)?.data?.total ??
    pendingItems.length ??
    0;

  // Extract module requests from module access requests API (only used when "module-requests" tab is active)
  const moduleRequestsData = Array.isArray(moduleRequestsRes?.data?.requests)
    ? moduleRequestsRes.data.requests.map((req: any) => ({
        id: req._id, // This is the request ID
        userId: req.userId?._id, // Store userId separately
        name: req.userId?.name || '',
        email: req.userId?.email || '',
        phone: req.userId?.basicInfo?.phone || '',
        company: req.userId?.business?.businessName || '',
        profession: req.userId?.professional?.role || '',
        status: 'Pending' as const,
        isRequest: true,
        requestedAt: req.requestedAt,
        requestedModule: req.requestedModule,
        region: req.userId?.basicInfo?.region || '',
        area: '',
        chapterName: req.userId?.basicInfo?.chapterAnswer || '',
        requestType: 'MODULE_ACCESS',
        moduleData: req.moduleData || {}
      }))
    : [];

  const membersTotal = approvedData?.pagination?.total || 0;

  // Set initial selected chapter from URL if available
  useEffect(() => {
    if (urlChapterId) {
      setSelectedChapter(urlChapterId);
    }
  }, [urlChapterId]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedChapter, activeSearch]);

  const handlePrint = () => {
    window.print();
  };

  // State for rejection modal and remark
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  // Approval and rejection functions with API integration
  const handleApproval = async (row: MemberRecord) => {
    try {
      
      if (row.requestType === 'MODULE_ACCESS') {
        // Handle module request approval using new review API
        await reviewModuleRequestApprove({ 
          requestId: row.id
        }).unwrap();
      } else {
        // Handle professional member approval
        // Determine which modules to grant based on user data
        const grantModules: string[] = [];
        if (row.hasBusiness) grantModules.push('business');
        if (row.hasProfessional) grantModules.push('professional');
        
        // If no modules detected, default to professional
        if (grantModules.length === 0) grantModules.push('professional');
        
        await approveMember({
          approvalId: row.id,
          data: { grantModules }
        }).unwrap();
      }
      
      // Refresh the appropriate list
      if (row.isRequest) {
        if (row.requestType === 'MODULE_ACCESS') {
          refetchModuleRequests();
        } else {
          refetchPending();
        }
      } else {
        refetchApproved();
      }
    } catch (error: any) {
      console.error("Failed to approve:", error);
      // TODO: Show toast notification
    }
  };

  const handleBlockMember = async (row: MemberRecord) => {
    try {
      const userId = row.userId || row.id;
      await blockUser(userId as string).unwrap();
      showToast({ title: "Blocked", description: "Member has been blocked", kind: "success" });
      console.log("Member blocked successfully");
      // TODO: Show toast notification
      
      // Refresh: appropriate list
      if (row.isRequest) {
        if (row.requestType === 'MODULE_ACCESS') {
          refetchModuleRequests();
        } else {
          refetchPending();
        }
      } else {
        refetchApproved();
      }
    } catch (error: any) {
      console.error("Failed to block member:", error);
      // TODO: Show toast notification
    }
  };

  const handleUnblockMember = async (row: MemberRecord) => {
    try {
      const userId = row.userId || row.id;
      await unblockUser(userId as string).unwrap();
      showToast({ title: "Unblocked", description: "Member has been unblocked", kind: "success" });
      console.log("Member unblocked successfully");
      // TODO: Show toast notification
      
      // Refresh: appropriate list
      if (row.isRequest) {
        if (row.requestType === 'MODULE_ACCESS') {
          refetchModuleRequests();
        } else {
          refetchPending();
        }
      } else {
        refetchApproved();
      }
    } catch (error: any) {
      console.error("Failed to unblock member:", error);
      // TODO: Show toast notification
    }
  };

  /**
   * Reject a request.
   *
   * A registration rejection is taken straight from the card and passes no reason, so
   * one click is the whole action. A module access request still asks for one, because
   * the server refuses to reject that kind without it.
   */
  const handleRejection = async (memberId?: string, remark = "") => {
    const targetId = memberId ?? selectedMemberId;
    if (!targetId) return;

    const allRequests = [...requestsData, ...moduleRequestsData];
    const selectedMember = allRequests.find(m => m.id === targetId);
    const isModuleRequest = selectedMember?.requestType === 'MODULE_ACCESS';

    if (isModuleRequest && !remark.trim()) {
      setRejectionError("Please provide a reason for rejection");
      return;
    }

    try {
      if (isModuleRequest) {
        // Handle module request rejection using new review API
        await reviewModuleRequestReject({
          requestId: targetId,
          rejectionReason: remark
        }).unwrap();
      } else {
        // Handle professional member rejection
        await rejectMember({
          approvalId: targetId,
          data: { remark }
        }).unwrap();
      }

      // Refresh the appropriate list
      if (activeTab === "requests") {
        refetchPending();
      } else if (activeTab === "module-requests") {
        refetchModuleRequests();
      } else {
        refetchApproved();
      }
      closeRejectionModal();
      showToast({
        title: "Rejected",
        description: isModuleRequest
          ? "Module request rejected"
          : `${selectedMember?.name || "The applicant"}'s application was rejected.`,
        kind: "success",
      });
    } catch (error: any) {
      console.error("Failed to reject:", error);
      // Say what the server actually said. A registration rejection has no dialog to
      // carry an inline message, and "Please try again" hid a Forbidden for long enough
      // that the button looked broken rather than refused.
      const message =
        error?.data?.message || error?.message || "Failed to reject. Please try again.";
      setRejectionError(message);
      showToast({ title: "Could not reject", description: message, kind: "error" });
    }
  };

  const openRejectionModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setRejectionModalOpen(true);
    setRejectionError("");
  };

  const closeRejectionModal = () => {
    setRejectionModalOpen(false);
    setSelectedMemberId(null);
    setRejectionRemark("");
    setRejectionError("");
  };

  // Get chapter details if chapterId is present in the route
  // Unused chapter data query - keeping for future use
  // const { data: chapterData } = useGetEdChapterQuery(routeChapterId || '', {
  //   skip: !routeChapterId
  // });

  const breadcrumbs = [];
  
  if (routeModuleType) {
    breadcrumbs.push({ 
      label: "Module Requests",
      onClick: () => {}
    });
  } else {
    breadcrumbs.push({ 
      label: "Professional Members",
      onClick: () => {}
    });
  }

  // Rejection dialog, reached only by module access requests — a registration is
  // rejected straight from its card.
  //
  // A plain node rather than a component declared in this body: as a component it was
  // a new type on every render, so React tore the dialog down and rebuilt it and the
  // textarea lost focus after each keystroke.
  const rejectionModalNode = rejectionModalOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-[var(--ov-ink)] mb-4">Reject Member</h3>
        <p className="text-[var(--ov-ink-2)] mb-4">Please provide a reason for rejection:</p>

        <textarea
          className="w-full h-32 p-3 bg-[#2d3748] text-[var(--ov-ink)] rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-[color:var(--field-border-focus)]"
          value={rejectionRemark}
          onChange={(e) => setRejectionRemark(e.target.value)}
          placeholder="Enter reason for rejection..."
        />

        {rejectionError && <p className="text-[var(--ov-danger)] text-sm mb-4">{rejectionError}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={closeRejectionModal}
            className="px-4 py-2 bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] rounded-md hover:bg-[var(--ov-fill-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleRejection(selectedMemberId ?? undefined, rejectionRemark)}
            className="px-4 py-2 bg-red-600 text-[var(--ov-ink)] rounded-md hover:bg-red-700 transition-colors"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Render Limited Access View (for Chapter/Support/Launch Director, President)
  if (hasLimitedAccess) {
    const showList = activeTab === "all" 
      ? membersItems 
      : activeTab === "requests"
      ? requestsData
      : moduleRequestsData;
    const total = activeTab === "all" 
      ? membersTotal 
      : activeTab === "requests"
      ? requestsTotal
      : (moduleRequestsRes?.data?.pagination?.total || moduleRequestsData.length);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = page;
    const isLoading = activeTab === "requests" ? isPendingLoading : isLoadingApproved;
    return (
      <div className={`${ADMIN_THEME} min-h-screen relative`}
      style={{ background: "var(--ov-floor)" }}>
        {rejectionModalNode}
        <Navbar userName={userName} />

        <main className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[var(--ov-ink)] mb-6">
            {routeModuleType ? "Module Requests" : "Professional Members"}
          </h1>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 items-end mb-6">
            <div>
              <label className="block text-sm text-[var(--ov-ink-4)] mb-2">Name</label>
              <input
                type="text"
                placeholder="Enter Name"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full h-[46px] px-4 bg-[#1a2332] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder:text-[var(--ov-ink-5)] focus:outline-none focus:border-[color:var(--field-border-focus)]"
              />
            </div>
            <div>
              <button onClick={handleSearch} className="h-[46px] w-full px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] font-medium">Search</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-[color:var(--ov-line)] mb-4">
            <button className={`pb-2 text-sm ${activeTab==='all' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('all'); setPage(1); }}>{`All Members (${membersTotal})`}</button>
            <button className={`pb-2 text-sm ${activeTab==='requests' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('requests'); setPage(1); }}>{`Waiting for Approval (${requestsTotal})`}</button>
            {/* <button className={`pb-2 text-sm ${activeTab==='module-requests' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('module-requests'); setPage(1); }}>{`Module Requests (${moduleRequestsData.length})`}</button> */}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {showList.map((rec: MemberRecord) => (
                <MemberCard key={`${activeTab}-${rec.id}`} rec={rec} requestMode={activeTab === 'requests' || activeTab === 'module-requests'} />
              ))}
              {showList.length === 0 && (
                <div className="col-span-full text-center py-12 text-[var(--ov-ink-4)]">
                  <p className="text-lg mb-2">
                    {activeTab === "requests" ? "No pending requests found" : activeTab === "module-requests" ? "No module requests found" : "No members found"}
                  </p>
                  <p className="text-sm">
                    {activeTab === "requests" 
                      ? "There are no pending professional membership requests at this time." 
                      : activeTab === "module-requests"
                      ? "There are no pending module requests at this time."
                      : "No professional members found matching your criteria."
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pagination (only for All Members) */}
          {activeTab === 'all' && total > 0 && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <span className="text-sm text-[var(--ov-ink-4)] mr-2">Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage<=1} onClick={()=> currentPage>1 && setPage(currentPage-1)} className="px-3 py-1 rounded-md border border-[color:var(--ov-line)] text-[var(--ov-ink-2)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--ov-fill-hover)]">Prev</button>
              <button disabled={currentPage>=totalPages} onClick={()=> currentPage<totalPages && setPage(currentPage+1)} className="px-3 py-1 rounded-md border border-[color:var(--ov-line)] text-[var(--ov-ink-2)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--ov-fill-hover)]">Next</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Render Full Access View (for Executive/Regional/Assistant Regional Director)
  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      {/* Reviewers land in this branch, and it was the one branch that never rendered
          the dialog — so Reject set state that nothing displayed. */}
      {rejectionModalNode}
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AdminStatCard
            title="Professional Only"
            value={approvedData?.dashboardCounts?.professionalOnly || 0}
            icon="users"
          />
          <AdminStatCard
            title="Business & Professional"
            value={approvedData?.dashboardCounts?.businessProfessionalCombination || 0}
            icon="briefcase"
          />
          <AdminStatCard
            title="Total Professional"
            value={approvedData?.dashboardCounts?.totalProfessional || 0}
            icon="users"
          />
          <AdminStatCard
            title="Pending Approvals"
            value={approvedData?.dashboardCounts?.pendingProfessionalApprovals || 0}
            icon="globe"
          />
        </div>

        {/* Filters Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end lg:flex lg:flex-nowrap lg:gap-3">

            {/* Name Filter */}
            <div className="w-full lg:w-[200px] flex-none">
              <FormInput
                label="Name"
                type="text"
                placeholder="Enter Name"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
              />
            </div>

            {/* Search Button */}
            <div className="w-full lg:w-[140px] flex-none">
              <button
                onClick={handleSearch}
                className="h-[46px] w-full px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] font-medium transition-colors whitespace-nowrap mt-[26px]"
              >
                Search
              </button>
            </div>

            {/* Right-aligned group: Export and Print */}
            <div className="w-full sm:col-span-2 lg:w-auto lg:ml-auto flex gap-3 justify-end">
              {false && (
                <button
                  onClick={handlePrint}
                  className="h-[46px] px-6 rounded-md bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] font-medium transition-colors whitespace-nowrap mt-[26px]"
                >
                  Print
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs + Cards Section */}
        <div className="mt-2">
          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-[color:var(--ov-line)] mb-4">
            <button className={`pb-2 text-sm ${activeTab==='all' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('all'); setPage(1); }}>{`All Members (${membersTotal})`}</button>
            <button className={`pb-2 text-sm ${activeTab==='requests' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('requests'); setPage(1); }}>{`Waiting for Approval (${requestsTotal})`}</button>
            {/* <button className={`pb-2 text-sm ${activeTab==='module-requests' ? 'text-[var(--ov-ink)] border-b-2 border-[color:var(--ov-ember-edge)]' : 'text-[var(--ov-ink-4)]'}`} onClick={()=>{ setActiveTab('module-requests'); setPage(1); }}>{`Module Requests (${moduleRequestsData.length})`}</button> */}
          </div>

          {/* Loading state */}
          {(isLoadingApproved || isPendingLoading) && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Grid */}
          {!(isLoadingApproved || isPendingLoading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {(() => {
                const currentData = activeTab === 'all' 
                  ? membersItems 
                  : activeTab === 'requests'
                  ? requestsData
                  : moduleRequestsData;
                
                return currentData.map((rec: MemberRecord) => (
                  <MemberCard key={`${activeTab}-${rec.id}`} rec={rec} requestMode={activeTab === 'requests' || activeTab === 'module-requests'} />
                ));
              })()}
              {(() => {
                const currentData = activeTab === 'all' 
                  ? membersItems 
                  : activeTab === 'requests'
                  ? requestsData
                  : moduleRequestsData;
                  
                return currentData.length === 0 && (
                  <div className="col-span-full text-center py-12 text-[var(--ov-ink-4)]">
                    <p className="text-lg mb-2">
                      {activeTab === "requests" ? "No pending requests found" : activeTab === "module-requests" ? "No module requests found" : "No members found"}
                    </p>
                    <p className="text-sm">
                      {activeTab === "requests" 
                        ? "There are no pending professional membership requests at this time." 
                        : activeTab === "module-requests"
                        ? "There are no pending module requests at this time."
                        : "No professional members found matching your criteria."
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Pagination (only for All Members) */}
          {activeTab === 'all' && membersTotal > 0 && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <span className="text-sm text-[var(--ov-ink-4)] mr-2">Page {page} of {Math.max(1, Math.ceil(membersTotal / pageSize))}</span>
              <button disabled={page<=1} onClick={()=> page>1 && setPage(page-1)} className="px-3 py-1 rounded-md border border-[color:var(--ov-line)] text-[var(--ov-ink-2)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--ov-fill-hover)]">Prev</button>
              <button disabled={page>=Math.max(1, Math.ceil(membersTotal / pageSize))} onClick={()=> page<Math.max(1, Math.ceil(membersTotal / pageSize)) && setPage(page+1)} className="px-3 py-1 rounded-md border border-[color:var(--ov-line)] text-[var(--ov-ink-2)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--ov-fill-hover)]">Next</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
