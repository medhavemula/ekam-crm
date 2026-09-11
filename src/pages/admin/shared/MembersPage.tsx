import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useBlockUserMutation,
  useGetEligibleForEdModulesUsersQuery,
} from "../../../services/memberApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { ChevronLeft, ChevronRight, Search as SearchIcon, Users, X } from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { MemberCardGridSkeleton } from "../../../components/common/Skeletons";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FormSelect from "../../../components/forms/FormSelect";
import { useRole } from "../../../hooks/useRole";
import { useGetEdChapterQuery, useGetEdRegionalBoardQuery } from "../../../services/ed";
import { useGetBusinessPendingApprovalsQuery, useApproveBusinessMemberMutation, useRejectBusinessMemberMutation, useGetApprovedMembersQuery, useDeleteMemberMutation } from "../../../services/approvalsApi";
import { useGetModuleAccessRequestsQuery, useReviewModuleRequestApproveMutation, useReviewModuleRequestRejectMutation } from "../../../services/adminModuleAccessApi";
import FormInput from "../../../components/forms/FormInput";
import FormTextarea from "../../../components/forms/FormTextarea";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import MemberDirectoryCard from "../../../components/admin/MemberDirectoryCard";
import type { MemberDirectoryCardProps } from "../../../components/admin/MemberDirectoryCard";
// TableColumn type is not currently used

interface MemberRecord {
  id: string;
  userId?: string; // Add userId for request records
  name: string;
  email: string;
  phone: string;
  company: string;
  profession: string;
  status: "Joined" | "Blocked" | "Deleted" | "Pending";
  region?: string;
  area?: string;
  country?: string;
  regionName?: string;
  countryName?: string;
  isRequest?: boolean;
  requestedAt?: string;
  chapterName?: string; // Add chapterName field
  requestedModule?: "business" | "professional" | "social"; // Add for module requests
  requestType?: string; // Add to distinguish request types
  hasBusiness?: boolean; // Add to track if user has business data
  hasProfessional?: boolean; // Add to track if user has professional data
  originalData?: any; // Store original API response for approval logic
  eligibleModules?: string[];
  /** True while the member still holds an unused temporary password. */
  mustChangePassword?: boolean;
  /** Outcome of the last credentials email sent to this member. */
  credentialDelivery?: { status?: "SENT" | "FAILED"; lastSentAt?: string; error?: string };
}

// Table columns configuration for admin view (commented out as not currently used)
// const adminColumns: TableColumn[] = [
//   { key: "name", label: "Name", sortable: true, searchable: true },
//   { key: "email", label: "Email", sortable: true, searchable: true },
//   { key: "phone", label: "Phone", sortable: true, searchable: true },
//   { key: "region", label: "Region", sortable: true, searchable: true },
//   { key: "area", label: "Area", sortable: true, searchable: true },
//   { key: "profession", label: "Profession/Specialty", sortable: true, searchable: true },
//   { key: "status", label: "Status", sortable: true, searchable: false },
//   { key: "actions", label: "Actions", sortable: false, searchable: false },
// ];

// Table columns configuration for limited access view WITH actions (Chapter)
// Commented out as not currently used
/*
const limitedColumnsWithActions: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: true },
  { key: "email", label: "Email", sortable: true, searchable: true },
  { key: "phone", label: "Phone", sortable: true, searchable: true },
  { key: "profession", label: "Profession/Specialty", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: false },
  { key: "actions", label: "Actions", sortable: false, searchable: false },
];

// Table columns configuration for limited access view WITHOUT actions (President, Support Director)
const limitedColumnsWithoutActions: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: true },
  { key: "email", label: "Email", sortable: true, searchable: true },
  { key: "phone", label: "Phone", sortable: true, searchable: true },
  { key: "company", label: "Company", sortable: true, searchable: true },
  { key: "profession", label: "Profession/Specialty", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: false },
];
*/

export default function MembersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chapterId: routeChapterId, moduleType: routeModuleType } = useParams();
  const [userName] = useState("Mike");
  const { role: userRole } = useRole();
  const isPlatformMembersMode = location.pathname.includes("/admin/regional-board/platform-members");

  // Get moduleType from URL params or default to 'business'
  const moduleType = routeModuleType as "business" | "professional" | "social" || "business";
  const eligibleEmptyTitle =
    moduleType === "professional"
      ? "No social members are available for professional access"
      : "No social members are available for business access";
  const eligibleEmptyDescription =
    moduleType === "professional"
      ? "This list is for existing social members who can be given professional access by the admin team after offline discussion and review. Right now, no members match that flow in your scope."
      : "This list is for existing social members who can be given business access by the admin team after offline discussion and review. Right now, no members match that flow in your scope.";
  const grantActionLabel =
    moduleType === "professional" ? "Grant Professional Access" : "Grant Business Access";

  // Global confirm dialog state
  type ConfirmKind = 'block' | 'unblock' | 'reject' | 'moved' | 'delete';
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    kind: ConfirmKind | null;
    member: MemberRecord | null;
    loading: boolean;
  }>({ open: false, kind: null, member: null, loading: false });
  
    // Mutations used by the global dialog
  const [blockUser] = useBlockUserMutation();
  const [deleteMember] = useDeleteMemberMutation();
  

  // Check if user is ED/RD/ARD (for three-dot menu access)
  const isAdminRole = ["EXECUTIVE_DIRECTOR","ED_TEAM","REGIONAL_DIRECTOR","ASSISTANT_REGIONAL_DIRECTOR"].includes(
    userRole || ""
  );

  // Check if user is Chapter/Launch Director (for tab access)
  const isChapterOrLaunchDirector = ["CHAPTER_DIRECTOR", "LAUNCH_DIRECTOR"].includes(
    userRole || ""
  );

  // Check if user can see "For Approval" tab (ED, RD, ARD, Chapter Director, Launch Director, Support Director)
  const canSeeApprovalTab = ["EXECUTIVE_DIRECTOR","REGIONAL_DIRECTOR","ASSISTANT_REGIONAL_DIRECTOR","CHAPTER_DIRECTOR","LAUNCH_DIRECTOR","SUPPORT_DIRECTOR"].includes(
    userRole || ""
  );

  // Check if user can see "Module Access" tab (ED, RD, ARD, ED team)
  // const canSeeModuleAccessTab = ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
  //   userRole || ""
  // );

  
  // Check if user has limited access (Support Director, President)
  const hasLimitedAccess = ["SUPPORT_DIRECTOR", "PRESIDENT"].includes(
    userRole || "",
  );

  // Get current chapter data - keeping the query for potential future use
  useGetEdChapterQuery(routeChapterId || '', { skip: !routeChapterId });

  
  // Handle navigation to move member to another chapter
  // Note: This function is kept for potential future use
  // const handleMoveMember = (member: MemberRecord) => {
  //   navigate(`/admin/regional-board/members/${member.id}/change-chapter`, {
  //     state: {
  //       member,
  //       currentChapterId: routeChapterId,
  //       currentChapterName: currentChapterData?.data?.name || 'Current Chapter'
  //     }
  //   });
  // };
  
  // Function to handle move action - just navigate to change chapter page
  const handleMoveAway = (member: MemberRecord) => {
    // Close modal and navigate to change chapter page
    setConfirmState(s => ({ ...s, open: false }));
    
    // Get the current chapter data from the URL params or state
    const currentChapterName = member.chapterName || 'Current Chapter';
    
    // For pending members, use the request data structure
    const isPendingRequest = member.status === 'Pending';
    
    navigate(`/admin/regional-board/members/${member.id}/change-chapter`, {
      state: {
        member: {
          id: isPendingRequest ? member.userId || member.id : member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          company: member.company,
          profession: member.profession,
          status: member.status,
          region: member.region,
          country: member.country,
          regionName: member.regionName,
          countryName: member.countryName,
          area: member.area,
          chapterName: member.chapterName,
          // Include request-specific fields if this is a pending request
          ...(isPendingRequest && {
            requestedAt: member.requestedAt,
            isRequest: true,
            approvalId: member.id
          })
        },
        currentChapterId: routeChapterId,
        currentChapterName: currentChapterName
      }
    });
  };

  // Search and filter states
  const [searchParams] = useSearchParams();
  
  // State for applied filters (used in API calls)
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    status: "active",
    chapter: "",
    page: 1,
    limit: 12,
    sort: "name",
    order: "asc" as const,
  });
  
  // State for form inputs (not immediately applied)
  const [pendingFilters, setPendingFilters] = useState({
    name: "",
    status: "active",
    chapter: "",
    page: 1,
    limit: 12,
    sort: "name",
    order: "asc" as const,
  });
  
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "module-requests" | "eligible">(
    isPlatformMembersMode ? "eligible" : routeModuleType ? "module-requests" : "all"
  );
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  
  // Update pending filters (updates form inputs without triggering API call)
  const updatePendingFilters = (updates: Partial<typeof pendingFilters>) => {
    setPendingFilters(prev => ({
      ...prev,
      ...updates
    }));
  };
  
  // Apply filters (triggers API call)
  const applyFilters = useCallback(() => {
    setAppliedFilters(prev => ({
      ...prev,
      ...pendingFilters,
      page: 1 // Reset to first page when applying new filters
    }));
  }, [pendingFilters]);
  
  // Handle search button click
  const handleSearch = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  // Anything narrowed away from the defaults the page opens with. The chapter
  // filter only counts as narrowing when the route did not fix one already.
  const hasActiveMemberFilters =
    Boolean(appliedFilters.name) ||
    appliedFilters.status !== "active" ||
    (Boolean(appliedFilters.chapter) && !routeChapterId);

  const clearMemberFilters = useCallback(() => {
    const cleared = { name: "", status: "active", chapter: "", page: 1 };
    setPendingFilters((prev) => ({ ...prev, ...cleared }));
    setAppliedFilters((prev) => ({ ...prev, ...cleared }));
  }, [routeChapterId]);

  // Load chapters scoped to the current user's regional board
  const { data: regionalBoardRes } = useGetEdRegionalBoardQuery({ page: 1, limit: 50 });
  const regionalBoardChapters: Array<{ id: string; name: string; area?: string }> = (
    (regionalBoardRes as any)?.data?.chapters || (regionalBoardRes as any)?.data?.items || []
  ).map((c: any) => ({
    id: c.id ?? c._id ?? c.chapterId ?? "",
    name: c.name ?? c.chapterName ?? "",
    area: c.area ?? c.location ?? "",
  }));

  const chapterOptions = [
    { value: "", label: "Select Chapter", area: "" },
    ...regionalBoardChapters.map((c) => ({
      value: c.id,
      label: c.name,
      area: c.area ?? "",
    })),
  ];

  // Get chapterId from URL query parameters
  const urlChapterId = searchParams.get('chapterId');
  
  // Set initial selected chapter from URL if available
  useEffect(() => {
    if (urlChapterId) {
      updatePendingFilters({ chapter: urlChapterId });
      setAppliedFilters({ ...appliedFilters, chapter: urlChapterId });
    }
  }, [urlChapterId]);

  // Members API integration (used for both admin and limited access views)
  const defaultChapterId = "6902296f3dccfbe93c39d606";
  const effectiveChapterId = (appliedFilters.chapter || routeChapterId || urlChapterId || defaultChapterId) as string;
  const currentChapterName = chapterOptions.find((c) => c.value === effectiveChapterId)?.label || "Chapter";

  // Use new approved members API for "all" tab
  const statusParam = appliedFilters.status
    ? (appliedFilters.status === "active" ? "ACTIVE" : "BLOCKED")
    : undefined;


  const {
    data: membersRes,
    refetch,
    isLoading: isMembersLoading,
    isFetching: isMembersFetching,
  } = useGetApprovedMembersQuery({
    moduleFilter: 'business',
    chapterId: effectiveChapterId,
    page: appliedFilters.page,
    limit: appliedFilters.limit,
    // Pass search query as 'search' parameter
    search: appliedFilters.name || undefined,
    ...(statusParam ? { status: statusParam as any } : {}),
  }, {
    skip: activeTab !== "all"
  });

  // Get business pending approvals for "requests" tab (always fetch to show count on tab)
  const { data: businessPendingRes, isLoading: isRequestsLoading } = useGetBusinessPendingApprovalsQuery({
    page: appliedFilters.page,
    limit: appliedFilters.limit,
    chapterId: effectiveChapterId,
  });

  // Get module access requests for "module-requests" tab
  const {
    data: moduleRequestsRes,
    refetch: refetchModuleRequests,
    isLoading: isModuleRequestsLoading,
  } = useGetModuleAccessRequestsQuery({
    status: "PENDING",
    moduleType: moduleType,
    page: appliedFilters.page,
    limit: appliedFilters.limit,
  });

  const {
    data: eligibleRes,
    refetch: refetchEligible,
    isLoading: isEligibleLoading,
  } = useGetEligibleForEdModulesUsersQuery({
    search: appliedFilters.name || undefined,
    page: appliedFilters.page,
    limit: appliedFilters.limit,
    moduleType: moduleType === "business" || moduleType === "professional" ? moduleType : "all",
  });

  const [approveBusinessMember] = useApproveBusinessMemberMutation();
  const [rejectBusinessMember] = useRejectBusinessMemberMutation();
  const [reviewModuleRequestApprove] = useReviewModuleRequestApproveMutation();
  const [reviewModuleRequestReject] = useReviewModuleRequestRejectMutation();

  // Handle refresh flag from navigation state
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      // Clear the state to prevent infinite refreshes
      window.history.replaceState({ ...location.state, shouldRefresh: false }, '');
      // Trigger a refetch of the members list if refetch function exists
      if (refetch) {
        refetch();
      }
    }
  }, [location.state, refetch]);

  // Handle page change for pagination (commented out as it's not currently used)
  // const handlePageChange = useCallback((newPage: number) => {
  //   setPage(newPage);
  // }, []);

  // Extract members from approved members API (only used when "all" tab is active)
  const resAny = membersRes as any;
  const membersItems = Array.isArray(resAny?.data) 
    ? resAny.data 
    : [];
    
  // Extract requests from business pending approvals API (only used when "requests" tab is active)
  const requestsData = Array.isArray(businessPendingRes?.data)
    ? businessPendingRes.data.map((req: any) => {
        const moduleRequestStatus = req.user?.moduleRequestStatus || {};
        const hasBusiness = moduleRequestStatus.business === 'PENDING';
        const hasProfessional = moduleRequestStatus.professional === 'PENDING';
        
        return {
          id: req._id, // This is the request ID
          userId: req.user?._id, // Store userId separately
          name: req.user?.name || '',
          email: req.user?.email || '',
          phone: req.user?.basicInfo?.phone || '',
          company: req.user?.business?.businessName || '',
          profession: req.user?.professional?.role || '',
          status: 'Pending' as const,
          isRequest: true,
          requestedAt: req.createdAt,
          region: req.scope?.region?.name || '',
          area: req.scope?.chapter?.name || '',
          chapterName: req.scope?.chapter?.name || currentChapterName,
          hasBusiness,
          hasProfessional,
          originalData: req // Store original API response
        };
      })
    : [];

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

  const eligibleData = Array.isArray(eligibleRes?.data)
    ? eligibleRes.data.map((u: any) => ({
        id: u._id,
        userId: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.basicInfo?.phone || "",
        company: u.business?.businessName || "",
        profession: u.professional?.role || "",
        status: "Joined" as const,
        region: typeof u.basicInfo?.region === "object" ? u.basicInfo.region?.name || "" : "",
        area: typeof u.social?.socialChapterId === "object" ? u.social.socialChapterId?.name || "" : "",
        chapterName: typeof u.basicInfo?.chapter === "object" ? u.basicInfo.chapter?.name || "" : "",
        eligibleModules: Array.isArray(u.eligibleModules) ? u.eligibleModules : [],
      }))
    : [];

  // Calculate total count based on active tab
  const membersTotal = activeTab === 'all' 
    ? (resAny?.pagination?.total || membersItems.length)
    : activeTab === 'requests'
    ? requestsData.length
    : activeTab === 'eligible'
    ? (eligibleRes?.pagination?.total || eligibleData.length)
    : (moduleRequestsRes?.data?.pagination?.total || moduleRequestsData.length);

  // Reset to first page when chapter (or route chapter) changes
  useEffect(() => {
    updatePendingFilters({ page: 1 });
  }, [appliedFilters.chapter, routeChapterId]);

  // Refetch APIs when tab changes to ensure proper data loading
  useEffect(() => {
    // Only refetch if the query is not skipped and refetch function exists
    if (refetch && activeTab === "all") {
      refetch();
    } else if (refetchEligible && activeTab === "eligible") {
      refetchEligible();
    } else if (refetchModuleRequests && activeTab === "module-requests") {
      refetchModuleRequests();
    }
  }, [activeTab, refetch, refetchEligible, refetchModuleRequests]);

  const normalizeMemberStatus = (rawStatus: any): MemberRecord["status"] => {
    const s = String(rawStatus ?? "").trim();
    const sLower = s.toLowerCase();

    if (sLower === "active" || s === "ACTIVE" || s === "JOINED") return "Joined";
    if (sLower === "inactive" || s === "INACTIVE" || sLower === "blocked" || s === "BLOCKED") return "Blocked";
    if (sLower === "deleted" || s === "DELETED") return "Deleted";
    if (sLower === "pending" || s === "PENDING") return "Pending";

    return "Joined";
  };

  // Process members data for both admin and limited access views
  const processMemberData = (m: any): MemberRecord => ({
    id: m._id || m.id || '',
    name: m.name || '',
    email: m.email || '',
    phone: m.basicInfo?.phone || m.phone || '',
    company: m.business?.businessName || '',
    profession: m.professional?.role || '',
    status: normalizeMemberStatus(m.status),
    region: m.basicInfo?.region?.name || m.basicInfo?.regionName || '',
    area: '',
    country: m.basicInfo?.country?.name || m.basicInfo?.countryName || '',
    chapterName: m.basicInfo?.chapter?.name || '',
    userId: m._id || m.id || '',
    // Drives the "Resend credentials" action: true only while the member still
    // holds an unused temporary password.
    mustChangePassword: m.mustChangePassword === true,
    credentialDelivery: m.credentialDelivery,
  });

  const baseAdminRows = membersItems.map((m: any) => processMemberData(m));
  const adminRows = baseAdminRows; // Backend filtering only
  
  // Update the total count to include both members and requests
  const totalCount = membersTotal;

  // The grid used to render its empty state while the first page was still in
  // flight, so every fresh load read as "No members found" for a moment.
  const isListLoading =
    activeTab === "all"
      ? isMembersLoading || (isMembersFetching && adminRows.length === 0)
      : activeTab === "requests"
        ? isRequestsLoading
        : activeTab === "eligible"
          ? isEligibleLoading
          : isModuleRequestsLoading;
  

  // State for rejection modal and remark
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  // Get toast function
  const { showToast } = useToast();
  
  const handleApproval = async (row: MemberRecord) => {
    try {
      if (!appliedFilters.chapter && activeTab === 'requests') {
        showToast({
          title: "Error",
          description: "Please select a chapter first",
          kind: "error",
        });
        return;
      }
      
      let result;
      
      if (row.requestType === 'MODULE_ACCESS') {
        // Handle module request approval using new review API
        result = await reviewModuleRequestApprove({ 
          requestId: row.id
        }).unwrap();
      } else {
        // Handle business member approval
        const approvalId = row.isRequest ? row.id : row.userId || row.id;
        
        // Determine which modules to grant based on user data
        const grantModules: string[] = [];
        if (row.hasBusiness) grantModules.push('business');
        if (row.hasProfessional) grantModules.push('professional');
        
        // If no modules detected, default to business
        if (grantModules.length === 0) grantModules.push('business');
        
        result = await approveBusinessMember({ 
          approvalId, 
          data: { 
            grantModules
          } 
        }).unwrap();
      }
      
      if (result.success) {
        // Show success message
        showToast({
          title: "Success",
          description: row.requestType === 'MODULE_ACCESS' ? "Module request approved successfully" : "Member approved successfully",
          kind: "success"
        });
        
        // Refresh the appropriate list after a short delay
        setTimeout(() => {
          if (activeTab === "all" && refetch) {
            refetch();
          } else if (activeTab === "module-requests" && refetchModuleRequests) {
            refetchModuleRequests();
          } else if (activeTab === "all" && refetch) {
            refetch();
          }
        }, 500);
      } else {
        throw new Error(result.message || 'Approval failed');
      }
    } catch (error: any) {
      console.error("Failed to approve:", error);
      showToast({
        title: "Error",
        description: error.message || 'Failed to approve',
        kind: "error"
      });
    }
  };

  const openRejectionModal = (rec: MemberRecord) => {
    setSelectedMember(rec);
    setRejectionModalOpen(true);
  };

  const closeRejectionModal = () => {
    setRejectionModalOpen(false);
    setSelectedMember(null);
    setRejectionRemark("");
    setRejectionError("");
  };

  /**
   * Reject a request.
   *
   * A registration rejection is taken straight from the card with no reason, so one
   * click is the whole action. A module access request still asks for one, because the
   * server refuses to reject that kind without a reason.
   */
  const handleRejection = async (member: MemberRecord | null, remark = "") => {
    if (!member) return;
    if (member.requestType === 'MODULE_ACCESS' && !remark.trim()) return;

    try {
      let result;

      if (member.requestType === 'MODULE_ACCESS') {
        // Handle module request rejection using new review API
        result = await reviewModuleRequestReject({
          requestId: member.id,
          rejectionReason: remark
        }).unwrap();
      } else {
        // Handle business member rejection
        result = await rejectBusinessMember({
          approvalId: member.id,
          data: { remark }
        }).unwrap();
      }

      if (result.success) {
        // Nothing to close on the registration path, but a module rejection came from
        // the dialog and leaving it open reads as though the click did nothing.
        closeRejectionModal();

        showToast({
          title: "Success",
          description: member.requestType === 'MODULE_ACCESS' ? "Module request rejected successfully" : "Member rejected successfully",
          kind: "success"
        });

        // Refresh the appropriate list after a short delay
        setTimeout(() => {
          if (activeTab === "all" && refetch) {
            refetch();
          } else if (activeTab === "module-requests" && refetchModuleRequests) {
            refetchModuleRequests();
          } else if (activeTab === "all" && refetch) {
            refetch();
          }
        }, 500);
      } else {
        throw new Error(result.message || 'Rejection failed');
      }
    } catch (error: any) {
      console.error("Error rejecting:", error);
      const errorMessage = error?.data?.message || error?.message || "Failed to reject. Please try again.";
      // A registration rejection has no dialog to carry an inline message, so the
      // failure has to be said out loud or the click looks like it worked.
      setRejectionError(errorMessage);
      showToast({ title: "Error", description: errorMessage, kind: "error" });
    }
  };

  // Get chapter details if chapterId is present in the route
  const { data: chapterData } = useGetEdChapterQuery(routeChapterId || '', {
    skip: !routeChapterId
  });

  const breadcrumbs = useMemo(() => {
    const items = [
      { label: "Regional Board", onClick: () => navigate("/admin/regional-board") }
    ];
    
    if (routeChapterId && chapterData?.data && !isPlatformMembersMode) {
      items.push({
        label: chapterData.data.name || "Chapter",
        onClick: () => navigate(`/admin/regional-board/chapter/${routeChapterId}`)
      });
    }
    
    if (isPlatformMembersMode) {
      items.push({
        label: "Add Platform Member",
        onClick: () => {}
      });
    } else if (routeModuleType) {
      items.push({ 
        label: "Module Requests",
        onClick: () => {}
      });
    } else {
      items.push({ 
        label: "Members",
        onClick: () => {}
      });
    }
    
    return items;
  }, [navigate, routeChapterId, chapterData, routeModuleType, moduleType, isPlatformMembersMode]);

  /**
   * Everything the directory card needs from this page, in one place, so the
   * two grids below stay identical without repeating fifteen props each.
   */
  const cardPropsFor = (rec: MemberRecord, index: number): MemberDirectoryCardProps => ({
    rec,
    requestMode: activeTab === "requests" || activeTab === "module-requests",
    isEdRole: isAdminRole,
    canOpenMenu: isAdminRole || isChapterOrLaunchDirector,
    activeTab,
    moduleType,
    grantActionLabel,
    chapterLabel: currentChapterName,
    openMenuFor,
    setOpenMenuFor,
    onNavigate: (path, options) => navigate(path, options as any),
    onToast: showToast,
    onRefetch: refetch,
    onConfirm: (kind, member) =>
      setConfirmState({ open: true, kind, member: member as MemberRecord, loading: false }),
    onApprove: (member) => {
      void handleApproval(member as MemberRecord);
    },
    onReject: (member) => {
      void handleRejection(member as MemberRecord);
    },
    onOpenRejectionModal: (member) => openRejectionModal(member as MemberRecord),
    delay: Math.min(index, 8) * 0.04,
  });

  /**
   * Block and delete, on the app's own confirmation dialog.
   *
   * These were three hand-rolled portals with their colours written in — a
   * #1a2332 panel, gray-700 rules, a ⚠ glyph for an icon. Portaled to <body>,
   * none of them inherited the page theme, so on a light screen they came back
   * as dark slabs. ConfirmationDialog already carries the theme across the
   * portal boundary and states the consequence per action.
   */
  const closeConfirm = () => setConfirmState({ open: false, kind: null, member: null, loading: false });

  const runConfirmedAction = async () => {
    if (!confirmState.member) return;
    const isDelete = confirmState.kind === 'delete';
    try {
      setConfirmState((s) => ({ ...s, loading: true }));
      const userId = confirmState.member.userId || confirmState.member.id;
      if (isDelete) {
        await deleteMember(userId as string).unwrap();
        showToast({ title: "Member deleted", description: "Their email is now free to register again.", kind: "success" });
      } else {
        await blockUser(userId as string).unwrap();
        showToast({ title: "Blocked", description: "Member has been blocked", kind: "success" });
      }
      setTimeout(() => refetch?.(), 500);
      closeConfirm();
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Action failed";
      showToast({ title: "Error", description: String(msg), kind: "error" });
      setConfirmState((s) => ({ ...s, loading: false }));
    }
  };

  const confirmName = confirmState.member?.name || "this member";

  const ConfirmPortal = (
    <ConfirmationDialog
      isOpen={confirmState.open && !!confirmState.kind && confirmState.kind !== 'moved'}
      onClose={closeConfirm}
      onConfirm={runConfirmedAction}
      isSubmitting={!!confirmState.loading}
      actionType={confirmState.kind === 'delete' ? 'delete' : 'block'}
      title={
        confirmState.kind === 'delete'
          ? `Delete ${confirmName} permanently?`
          : `Block ${confirmName}?`
      }
      description={
        confirmState.kind === 'delete'
          ? "They lose access immediately and disappear from every member list, and their email address becomes free to register again. This cannot be undone."
          : undefined
      }
    />
  );

  // Move Confirmation Modal
  const MovedAwayConfirmPortal = () => (
    <ConfirmationDialog
      isOpen={confirmState.open && confirmState.kind === 'moved'}
      onClose={closeConfirm}
      onConfirm={() => {
        if (confirmState.member) void handleMoveAway(confirmState.member);
      }}
      isSubmitting={!!confirmState.loading}
      variant="info"
      title={`Move ${confirmName} to another chapter?`}
      description="The next screen lets you pick the chapter. Nothing changes until you confirm it there."
      confirmText="Choose chapter"
    />
  );

  // Rejection Modal
  const rejectionModalNode = (
    <ConfirmationDialog
      isOpen={rejectionModalOpen}
      onClose={closeRejectionModal}
      onConfirm={() => handleRejection(selectedMember, rejectionRemark)}
      actionType="reject"
      title={`Reject ${selectedMember?.name || "this request"}?`}
      description="The reason is sent to them, so write it as something they can act on."
      confirmText="Reject request"
      confirmDisabled={!rejectionRemark.trim()}
    >
      <FormTextarea
        label="Reason"
        isRequired
        rows={4}
        value={rejectionRemark}
        onChange={(e) => setRejectionRemark(e.target.value)}
        placeholder="Enter reason for rejection..."
        error={rejectionError || undefined}
      />
    </ConfirmationDialog>
  );

  /**
   * The pieces both views share.
   *
   * The two renders below had the tab row, the grid and the empty state written
   * out twice, and they had already drifted — one paginated on the right, the
   * other spread across the row. One definition each, used by both.
   */
  const pageTitle = isPlatformMembersMode
    ? "Add Platform Member"
    : routeModuleType
      ? "Module Requests"
      : "Members";

  const emptyCopy =
    activeTab === "requests"
      ? { title: "Nothing waiting for approval", body: "New membership requests for this chapter will appear here." }
      : activeTab === "eligible"
        ? { title: eligibleEmptyTitle, body: eligibleEmptyDescription }
        : activeTab === "module-requests"
          ? { title: "No module requests", body: "Requests for business or professional access will appear here." }
          : hasActiveMemberFilters
            ? { title: "No members match these filters", body: "Try a different name, chapter or status — or clear the filters to see everyone in this chapter." }
            : { title: "No members yet", body: "Members added to this chapter will appear here." };

  const renderTabs = () =>
    !isPlatformMembersMode && (
      <div className="mb-5 flex items-center gap-6 border-b border-[color:var(--ov-line)]">
        {[
          { key: "all" as const, label: "All members", show: true },
          {
            key: "requests" as const,
            label: `Waiting for approval (${requestsData.length})`,
            show: canSeeApprovalTab,
          },
        ]
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              type="button"
              aria-selected={activeTab === t.key}
              onClick={() => {
                setActiveTab(t.key);
                updatePendingFilters({ page: 1 });
              }}
              className={`-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                activeTab === t.key
                  ? "border-[color:var(--ov-ember)] text-[var(--ov-ink)]"
                  : "border-transparent text-[var(--ov-ink-4)] hover:text-[var(--ov-ink-2)]"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>
    );

  const renderEmpty = () => (
    <div className="rounded-2xl bg-[var(--ov-panel)] p-10 text-center ring-1 ring-[color:var(--ov-line)]">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]"
      >
        <Users className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[var(--ov-ink)]">{emptyCopy.title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-5 text-[var(--ov-ink-4)]">
        {emptyCopy.body}
      </p>
      {hasActiveMemberFilters && activeTab === "all" && (
        <button
          type="button"
          onClick={clearMemberFilters}
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );

  const renderGrid = (list: MemberRecord[]) =>
    isListLoading ? (
      <MemberCardGridSkeleton count={8} />
    ) : list.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((rec: MemberRecord, idx: number) => (
          <MemberDirectoryCard key={activeTab + "-" + rec.id} {...cardPropsFor(rec, idx)} />
        ))}
      </div>
    ) : (
      renderEmpty()
    );

  const renderPager = (total: number, totalPages: number) =>
    totalPages > 1 && (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--ov-panel)] px-4 py-3 ring-1 ring-[color:var(--ov-line)]">
        <p className="text-[12.5px] text-[var(--ov-ink-4)]">
          Showing{" "}
          <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
            {Math.min((appliedFilters.page - 1) * appliedFilters.limit + 1, total)}–
            {Math.min(appliedFilters.page * appliedFilters.limit, total)}
          </span>{" "}
          of <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-[12.5px] text-[var(--ov-ink-4)]">
            Page{" "}
            <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
              {appliedFilters.page}
            </span>{" "}
            of <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalPages}</span>
          </span>
          <button
            type="button"
            disabled={appliedFilters.page <= 1}
            onClick={() =>
              appliedFilters.page > 1 &&
              setAppliedFilters((prev) => ({ ...prev, page: prev.page - 1 }))
            }
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Prev
          </button>
          <button
            type="button"
            disabled={appliedFilters.page >= totalPages}
            onClick={() =>
              appliedFilters.page < totalPages &&
              setAppliedFilters((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );

  /** Name, chapter and status, on one row that ends with the button they feed. */
  const renderFilters = (showChapter: boolean) => (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--ov-trough)] p-4 ring-1 ring-[color:var(--ov-line-faint)]">
      <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
        <FormInput
          label="Name"
          type="text"
          className="text-[13px]"
          placeholder="Enter name"
          value={pendingFilters.name}
          onChange={(e) => updatePendingFilters({ name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
      </div>

      {showChapter && !isPlatformMembersMode && (
        <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
          <FormSelect
            label="Chapter"
            value={pendingFilters.chapter}
            onChange={(e) => updatePendingFilters({ chapter: e.target.value })}
            options={chapterOptions}
            className="text-[13px]"
            searchable
            searchPlaceholder="Search chapters"
          />
        </div>
      )}

      {activeTab === "all" && (
        <div className="w-full shrink-0 sm:w-auto lg:w-[180px]">
          <FormSelect
            label="Status"
            value={pendingFilters.status}
            onChange={(e) => updatePendingFilters({ status: e.target.value })}
            className="text-[13px]"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Blocked" },
            ]}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSearch}
        className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-trough)]"
      >
        <SearchIcon className="h-4 w-4" aria-hidden="true" />
        Search
      </button>

      {hasActiveMemberFilters && (
        <button
          type="button"
          onClick={clearMemberFilters}
          className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] px-3 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );

  /** The count line under the title, which changes with the tab. */
  const renderCountLine = (total: number) => (
    <p className="mt-2 text-[13px] text-[var(--ov-ink-4)]">
      <span className="font-medium text-[var(--ov-ink-2)]">{currentChapterName}</span>
      {!isListLoading && (
        <>
          {" · "}
          <span className="ekam-figure">{total}</span>{" "}
          {activeTab === "requests"
            ? total === 1
              ? "request waiting"
              : "requests waiting"
            : total === 1
              ? "member"
              : "members"}
        </>
      )}
    </p>
  );

  // Render Limited Access View (for Support Director, President)
  if (hasLimitedAccess && !isChapterOrLaunchDirector) {
    const showList = activeTab === "all"
      ? adminRows
      : activeTab === "requests"
      ? requestsData
      : activeTab === "eligible"
      ? eligibleData
      : moduleRequestsData;
    const total = activeTab === "all"
      ? membersTotal
      : activeTab === "requests"
      ? requestsData.length
      : activeTab === "eligible"
      ? (eligibleRes?.pagination?.total || eligibleData.length)
      : (moduleRequestsRes?.data?.pagination?.total || moduleRequestsData.length);
    const totalPages = Math.max(1, Math.ceil(total / appliedFilters.limit));
    return (
      <div className={`${ADMIN_THEME} relative min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        {ConfirmPortal}
        <MovedAwayConfirmPortal />
        {rejectionModalNode}
        <Navbar userName={userName} />

        <main className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6">
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <Users className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Chapter Directory
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              {pageTitle}
            </h1>
            {renderCountLine(total)}
          </div>

          {renderFilters(
            ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
              userRole || "",
            ),
          )}
          {renderTabs()}
          {renderGrid(showList)}
          {renderPager(total, totalPages)}
        </main>
      </div>
    );
  }

  // Render Full Access View (for ED/RD/ARD/LD/CD)
  const currentData: MemberRecord[] =
    activeTab === "all"
      ? adminRows
      : activeTab === "requests"
        ? requestsData
        : activeTab === "eligible"
          ? eligibleData
          : moduleRequestsData;
  const fullTotal = activeTab === "all" ? totalCount : currentData.length;
  const fullTotalPages = Math.max(1, Math.ceil(totalCount / appliedFilters.limit));

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      {ConfirmPortal}
      <MovedAwayConfirmPortal />
      {rejectionModalNode}
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mb-6">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <Users className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Chapter Directory
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            {pageTitle}
          </h1>
          {renderCountLine(fullTotal)}
        </div>

        {renderFilters(true)}
        {renderTabs()}
        {renderGrid(currentData)}
        {activeTab === "all" && renderPager(totalCount, fullTotalPages)}
      </main>
    </div>
  );
}
