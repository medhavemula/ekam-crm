import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import { RegionalTeamMemberCard } from "../../../components/admin";
import { CreateModal } from "../../../components/modals";
import type { FormField } from "../../../components/modals/CreateModal";
import FormSelect from "../../../components/forms/FormSelect";
import FormInput from "../../../components/forms/FormInput";
import {
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search as SearchIcon,
  UserPlus,
  X,
} from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { MemberCardGridSkeleton } from "../../../components/common/Skeletons";
import type { BreadcrumbItem } from "../../../components/common/PageHeader";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetEdTeamMembersQuery,
  useAddEdTeamMemberMutation,
  useUpdateEdTeamMemberMutation,
  useUpdateEdTeamMemberStatusMutation,
  useGetEdChaptersQuery,
} from "../../../services/ed";
import { useLazyGetEdUsersByChapterQuery } from "../../../services/ed/edUsersApi";
import { PageHeader } from "../../../components/common";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  location: string;
  chapter: string;
  avatarColor: string;
  avatarInitial: string;
}

export default function RegionalTeamPage() {
  const navigate = useNavigate();
  const { chapterId: routeChapterId } = useParams<{ chapterId?: string }>();
  const userRole = useSelector((state: RootState) => state.auth.role);
  const { showToast } = useToast();
  
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [pendingName, setPendingName] = useState("");
  const [pendingRole, setPendingRole] = useState("ALL_ROLES");
  const [pendingStatus, setPendingStatus] = useState("ACTIVE");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  // Search parameters state
  const [searchParams, setSearchParams] = useState({
    chapterId: routeChapterId,
    status: 'ACTIVE',
    team: 'LEADERSHIP',
    page: 1,
    limit: 12,
    name: '',
    role: ''
  });

  const isEdRole = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(userRole || "");

  // Get chapters for the form fields
  const { data: chaptersRes } = useGetEdChaptersQuery({ 
    page: 1, 
    limit: 100,
    status: 'ACTIVE',
    sort: 'name:asc'
  });
  
  // Use the chapter ID from URL parameters
  const chapterParam = routeChapterId;

  // Update search params when chapter changes
  useEffect(() => {
    setSearchParams(prev => ({
      ...prev,
      chapterId: chapterParam || '',
      page: 1, // Reset to first page when chapter changes
      name: '', // Reset name filter
      role: '', // Reset role filter
      status: 'ACTIVE' // Reset status filter
    }));
  }, [chapterParam]);

  // API Integration for executive team - only called when search is triggered
  const { data, isLoading, error, refetch } = useGetEdTeamMembersQuery(
    {
      status: searchParams.status !== 'ALL_STATUS' ? searchParams.status : undefined,
      role_code: searchParams.role === 'ALL_ROLES' || !searchParams.role
        ? undefined
        : searchParams.role.toUpperCase(),
      q: searchParams.name || undefined,
      chapter_id: searchParams.chapterId || undefined,
      team: 'LEADERSHIP',
      page: searchParams.page,
      limit: searchParams.limit
    } as any,
    { 
      skip: !isEdRole,
      refetchOnMountOrArgChange: true
    }
  );

  const [addTeamMember, { isLoading: isAdding }] = useAddEdTeamMemberMutation();
  const [updateTeamMember, { isLoading: isUpdating }] = useUpdateEdTeamMemberMutation();
  const [updateStatus] = useUpdateEdTeamMemberStatusMutation();

  // State for API-based member search
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchDebounced, setMemberSearchDebounced] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  
  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMemberSearchDebounced(memberSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

  // Fetch ED users for the member selection dropdown with search and limit
  const [fetchEdUsers, { data: edUsersRes }] = useLazyGetEdUsersByChapterQuery();
  
  // Fetch users when component mounts, chapter changes, or search query changes
  useEffect(() => {
    if (chapterParam) {
      fetchEdUsers({
        chapterId: chapterParam,
        limit: 15,
        sort: 'name',
        order: 'asc',
        q: memberSearchDebounced.trim() || undefined
      });
    }
  }, [chapterParam, fetchEdUsers, memberSearchDebounced]);

  // Reset selected member when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setSelectedMemberId("");
    }
  }, [isModalOpen]);

  // Map ED users to options for select dropdown
  const memberOptions = useMemo(() => {
    const users = edUsersRes?.data?.items || [];
    const options = users.map((user) => ({
      value: user.id,
      label: user.name || user.email || `User ${user.id}`,
    }));
    return options;
  }, [edUsersRes]);

  // Pagination derived values from server response
  const totalItems = Number((data as any)?.data?.total ?? 0);
  const serverPage = searchParams.page;
  const serverLimit = searchParams.limit;
  const totalPages = Math.max(1, Math.ceil(totalItems / (serverLimit || 1)));

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // API items from server (no client-side hiding)
  const apiItems: any[] = (data as any)?.data?.items ?? [];

  // Role value to code mapping - always use uppercase for role codes
  const roleValueFromCode = (code?: string) => {
    if (!code) return '';
    // Convert to lowercase for display
    return code.toLowerCase();
  };
  
  const roleCodeFromValue = (val?: string) => {
    if (!val) return '';
    // Convert to uppercase for API
    return val.toUpperCase();
  };

  const editFields: FormField[] = [
    { 
      name: "member", 
      label: "Member", 
      type: "text", 
      placeholder: "Member name", 
      required: false, 
      disabled: true
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      options: [
        { value: "president", label: "President" },
        { value: "treasurer", label: "Treasurer" },
        { value: "general-secretary", label: "General Secretary" },
      ],
      required: true,
    },
  ];

  const editingRaw = editingMemberId ? apiItems.find((m: any) => String(m.id ?? m._id) === String(editingMemberId)) : undefined;
  const editInitialValues = editingRaw
    ? {
        member:
          editingRaw?.user?.name ||
          editingRaw?.user?.fullName ||
          editingRaw?.user_name ||
          editingRaw?.userName ||
          editingRaw?.name ||
          editingRaw?.memberName ||
          editingDisplayName ||
          "",
        role: roleValueFromCode(editingRaw?.role?.code || editingRaw?.roleCode),
      }
    : undefined;

  const normalizeRoleCode = (code: string): string => {
    if (!code) return '';
    // Convert to uppercase and replace all hyphens with underscores
    return code.toUpperCase().replace(/-/g, '_');
  };

  const handleUpdateMember = async (form: Record<string, string>) => {
    if (!editingMemberId) {
      setSubmitError('No member selected for editing');
      return;
    }
    
    // Validate role selection
    if (!form.role || form.role.trim() === '') {
      showToast({
        title: "Validation Error",
        description: "Please select a role before updating.",
        kind: "error"
      });
      return { errors: { role: 'Role is required' } as Record<string, string> };
    }
    
    setSubmitError('');
    
    try {
      // Get role code and ensure it's properly formatted with underscores
      const roleCode = normalizeRoleCode(roleCodeFromValue(form.role));

      await updateTeamMember({
        memberId: String(editingMemberId),
        data: {
          roleCode: roleCode || undefined,
        },
      }).unwrap();
      
      // Show success toast
      showToast({
        title: "Success",
        description: "Executive team member updated successfully.",
        kind: "success"
      });
      
      // Close edit modal and reset state
      setIsEditOpen(false);
      setEditingMemberId(null);
      setEditingDisplayName('');
      
    } catch (e) {
      console.error('Error updating team member:', e);
      setSubmitError('Failed to update team member. Please try again.');
      return { errors: { form: 'Failed to update team member. Please try again.' } as Record<string, string> };
    }
  };

  // Map API members (service TeamMember) to UI TeamMember shape
  const mappedMembers: TeamMember[] = apiItems
    .map((m: any, idx: number) => {
      const userObj = m.user || {};
      const roleObj = m.role || {};
      const regionObj = m.region || {};
      const chapterObj = m.chapter || {};

      const name = userObj.name || m.userName || m.name || userObj.email || "Member";
      const role = roleObj.label || m.roleName || m.roleCode || roleObj.code || "";
      const location = m.regionName || regionObj.name || m.location || "";
      const chapterLabel = m.chapterName || chapterObj.name || m.chapterId || "";
      const initial = (userObj.avatarInitial || (String(name).trim().charAt(0).toUpperCase())) || "M";

      return {
        id: String(m.id ?? m._id ?? idx + 1),
        name,
        role,
        location,
        chapter: String(chapterLabel),
        avatarColor: "#D85D27",
        avatarInitial: initial,
      };
    });

  const members: TeamMember[] = mappedMembers;

  const LEADERSHIP_ROLE_OPTIONS = [
    { value: "ALL_ROLES", label: "All Roles" },
    { value: "president", label: "President" },
    { value: "treasurer", label: "Treasurer" },
    { value: "general-secret", label: "General Secretary" },
  ];

  const LEADERSHIP_STATUS_OPTIONS = [
    { value: "ALL_STATUS", label: "All Status" },
    { value: "ACTIVE", label: "Active" },
    { value: "BLOCKED", label: "Blocked" },
    { value: "ENDED", label: "Ended" },
  ];

  // Read the applied filters, never the pending ones, so the count line and the
  // empty state describe what is actually on screen.
  const appliedRole = searchParams.role || "ALL_ROLES";
  const appliedStatus = searchParams.status || "ALL_STATUS";
  const appliedRoleLabel =
    appliedRole === "ALL_ROLES"
      ? ""
      : LEADERSHIP_ROLE_OPTIONS.find((o) => o.value === appliedRole)?.label ?? "";
  const appliedStatusLabel =
    appliedStatus === "ALL_STATUS"
      ? ""
      : LEADERSHIP_STATUS_OPTIONS.find((o) => o.value === appliedStatus)?.label ?? "";

  const narrowedByNameOrRole = Boolean(searchParams.name) || appliedRole !== "ALL_ROLES";
  const hasActiveFilters = narrowedByNameOrRole || appliedStatus !== "ACTIVE";

  const clearFilters = () => {
    setPendingName("");
    setPendingRole("ALL_ROLES");
    setPendingStatus("ACTIVE");
    setSearchParams((prev) => ({ ...prev, name: "", role: "", status: "ACTIVE", page: 1 }));
  };

  const emptyCopy = narrowedByNameOrRole
    ? {
        title: "No officers match these filters",
        body: "Try a different name or role — or clear the filters to see the whole executive team.",
      }
    : appliedStatus === "BLOCKED"
      ? { title: "No blocked officers", body: "Nobody on this executive team is blocked." }
      : appliedStatus === "ENDED"
        ? { title: "No ended terms", body: "Nobody on this executive team has an ended term." }
        : {
            title: "No executive team yet",
            body: "This chapter has no president, treasurer or secretary on record. Create the first one.",
          };

  const handleSearch = () => {
    // Update search params with current filter values
    setSearchParams(prev => ({
      ...prev,
      name: pendingName,
      role: pendingRole,
      status: pendingStatus,
      page: 1, // Reset to first page on new search
    }));
  };

  const handleEdit = (clicked: TeamMember) => {
    // Try to find by exact API id first (string/number safe)
    let found = apiItems.find((m: any) => String(m.id ?? m._id) === String(clicked.id));
    // Fallback: match by user name/label if ids don't align with UI-mapped ids
    if (!found) {
      found = apiItems.find((m: any) => {
        const n = m?.user?.name || m?.userName || m?.name || m?.memberName;
        return n && String(n).trim().toLowerCase() === String(clicked.name).trim().toLowerCase();
      });
    }
    // Set editing id
    setEditingMemberId(found ? String(found.id ?? found._id) : String(clicked.id));
    setEditingDisplayName(clicked.name);
    setIsEditOpen(true);
  };

  const handleRemove = (memberId: string, e?: React.MouseEvent) => {
    // Prevent the event from bubbling up to parent elements
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMemberToRemove(memberId);
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = useCallback(async () => {
    if (!memberToRemove) return;
    
    setShowRemoveDialog(false);
    const memberId = memberToRemove;
    setMemberToRemove(null);
    
    const raw = apiItems.find((m: any) => String(m.id ?? m._id) === String(memberId));
    const idToUse = String(raw?.id ?? raw?._id ?? memberId);
    
    try {
      await updateStatus({ memberId: idToUse, status: "ENDED" as any }).unwrap();
      // Manually refetch the team members list to ensure UI is up to date
      await refetch();
    } catch (e) {
      console.error('Failed to remove team member:', e);
      setSubmitError('Failed to remove team member. Please try again.');
    }
  }, [apiItems, memberToRemove, refetch, updateStatus]);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: "Regional Board", onClick: () => navigate("/admin/regional-board") }
    ];

    if (routeChapterId) {
      // If we have a chapter ID, we'll show it in the breadcrumb
      // Note: If you need to show the chapter name, you'll need to fetch it first
      items.push({
        label: "Chapter",
        onClick: () => navigate(`/admin/regional-board/chapter/${routeChapterId}`)
      });
      // Don't add "Executive Team" breadcrumb when navigating from chapter - the page title already shows it
    } else {
      // Only add "Executive Team" breadcrumb when not navigating from chapter
      items.push({
        label: "Executive Team"
      });
    }
    return items;
  }, [navigate, routeChapterId]);

  const handleCreateMember = async (form: Record<string, string>) => {
    setSubmitError("");
    // Map modal fields to API
    const userId = form.member; // Expecting a real userId; if not, backend will validate
    
    // Validate role selection
    if (!form.role || form.role.trim() === '') {
      showToast({
        title: "Validation Error",
        description: "Please select a role before creating the leadership member.",
        kind: "error"
      });
      return { errors: { role: 'Role is required' } as Record<string, string> };
    }
    
    // Get role code and ensure it's properly formatted with underscores
    const roleCode = normalizeRoleCode(roleCodeFromValue(form.role));
    const chapterId = routeChapterId || undefined; // Always use current chapter from URL

    // Determine scope based on role
    const roleScopeMap: Record<string, "COUNTRY" | "REGION" | "CHAPTER"> = {
      "PRESIDENT": "CHAPTER",
      "TREASURER": "CHAPTER",
      "GENERAL_SECRETARY": "CHAPTER",
    };

    const scope = roleScopeMap[roleCode] || (chapterId ? "CHAPTER" : "REGION");

    if (!userId || !roleCode) {
      showToast({
        title: "Validation Error",
        description: "Please select valid Member and Role.",
        kind: "error"
      });
      return { errors: { form: 'Please select valid Member and Role.' } as Record<string, string> };
    }

    // Validate that current chapter is within allowed list
    if (chapterId) {
      const allowedChapterIds = new Set(
        ((((chaptersRes as any)?.data?.items) || []) as any[]).map((c: any) => String(c.id))
      );
      
      if (!allowedChapterIds.has(String(chapterId))) {
        showToast({
          title: "Validation Error",
          description: "You don't have permission to add members to this chapter.",
          kind: "error"
        });
        return { errors: { chapter: "You don't have permission to add members to this chapter." } as Record<string, string> };
      }
    }

    // Derive regionId to satisfy backend's scope requirement
    const chapterItems: any[] = (((chaptersRes as any)?.data?.items) || []) as any[];
    const selectedChapterObj = chapterId ? chapterItems.find((c: any) => String(c.id) === String(chapterId)) : undefined;
    const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
    const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];

    try {
      await addTeamMember({
        userId,
        roleCode,
        scope: scope as any,
        chapterId,
        regionId: regionIdToSend,
        area: form.area || undefined,
        isPrimary: true,
      } as any).unwrap();
      
      // Show success toast
      showToast({
        title: "Success",
        description: "Executive team member added successfully.",
        kind: "success"
      });
      
      setIsModalOpen(false);
    } catch (e: unknown) {
      setSubmitError((e as any)?.data?.message || "Failed to add member. Check inputs.");
      return { errors: { form: (e as any)?.data?.message || "Failed to add member. Check inputs." } as Record<string, string> };
    }
  };

  // Modal fields configuration
  const modalFields: FormField[] = [
    {
      name: "member",
      label: "Member",
      type: "select",
      placeholder: "Select member",
      options: memberOptions,
      required: true,
      searchable: true,
      menuMaxHeightClass: "max-h-80",
      onSearchChange: setMemberSearchQuery,
      searchPlaceholder: "Search members...",
      hideOptionsUntilSearch: false,
      disableClientSideFilter: true,
      onChange: (value) => setSelectedMemberId(value),
      value: selectedMemberId
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      options: [
        { value: "president", label: "President" },
        { value: "treasurer", label: "Treasurer" },
        { value: "general-secretary", label: "General Secretary" },
      ],
      required: true,
    },
  ];

  const handleCancelRemove = useCallback(() => {
    setShowRemoveDialog(false);
    setMemberToRemove(null);
  }, []);

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <Award className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Chapter Leadership
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Executive Team
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                    {totalItems || members.length}
                  </span>{" "}
                  {(totalItems || members.length) === 1 ? "member" : "members"}
                  {appliedStatusLabel ? ` · ${appliedStatusLabel}` : ""}
                  {appliedRoleLabel ? ` · ${appliedRoleLabel}` : ""}
                  {" · "}
                </>
              )}
              Presidents, treasurers and secretaries holding a chapter office.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create executive member
          </button>
        </div>

        {/* Error State */}
        {(error || submitError) && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-[var(--ov-panel)] p-4 ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
            >
              <AlertTriangle className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[var(--ov-ink)]">
                {submitError ? "That did not go through" : "Could not load the executive team"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--ov-ink-4)]">
                {submitError || "The team did not respond. Nothing has changed — try the search again."}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--ov-trough)] p-4 ring-1 ring-[color:var(--ov-line-faint)]">
          <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
            <FormInput
              label="Name"
              type="text"
              className="text-[13px]"
              placeholder="Search by name"
              value={pendingName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPendingName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>

          <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
            <FormSelect
              label="Role"
              value={pendingRole}
              onChange={(e) => setPendingRole(e.target.value)}
              className="text-[13px]"
              options={LEADERSHIP_ROLE_OPTIONS}
            />
          </div>

          <div className="w-full shrink-0 sm:w-auto lg:w-[180px]">
            <FormSelect
              label="Status"
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="text-[13px]"
              options={LEADERSHIP_STATUS_OPTIONS}
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-trough)] disabled:opacity-50"
          >
            <SearchIcon className="h-4 w-4" aria-hidden="true" />
            {isLoading ? "Searching…" : "Search"}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] px-3 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {/* Members Grid. The empty case used to render an empty grid, so a
            chapter with no officers showed a blank page under the filters. */}
        {isLoading ? (
          <MemberCardGridSkeleton count={8} />
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member: TeamMember) => (
              <RegionalTeamMemberCard
                key={member.id}
                name={member.name}
                role={member.role}
                chapter={member.chapter}
                avatarColor={member.avatarColor}
                avatarInitial={member.avatarInitial}
                status={(apiItems.find((m: any) => String(m.id ?? m._id) === String(member.id)) as any)?.status}
                onEdit={() => handleEdit(member)}
                onRemove={() => handleRemove(member.id)}
                onClick={() => navigate(`/admin/regional-board/leadership-team/member/${member.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-10 text-center ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]"
            >
              <UserPlus className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[var(--ov-ink)]">{emptyCopy.title}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {emptyCopy.body}
            </p>
            <button
              type="button"
              onClick={hasActiveFilters ? clearFilters : () => setIsModalOpen(true)}
              className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
            >
              {hasActiveFilters ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear filters
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create executive member
                </>
              )}
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--ov-panel)] px-4 py-3 ring-1 ring-[color:var(--ov-line)]">
            <p className="text-[12.5px] text-[var(--ov-ink-4)]">
              Showing{" "}
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {Math.min((serverPage - 1) * serverLimit + 1, totalItems)}–
                {Math.min(serverPage * serverLimit, totalItems)}
              </span>{" "}
              of <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalItems}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="mr-1 text-[12.5px] text-[var(--ov-ink-4)]">
                Page{" "}
                <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{serverPage}</span>{" "}
                of <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, serverPage - 1))}
                disabled={serverPage <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, serverPage + 1))}
                disabled={serverPage >= totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Regional Member Modal */}
      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add an executive member"
        description="Give a chapter member an office — president, treasurer or secretary."
        fields={modalFields}
        onSubmit={handleCreateMember}
        submitButtonText={isAdding ? "Creating..." : "Create"}
        initialValues={{ member: selectedMemberId }}
      />

      {/* Edit Regional Member Modal */}
      <CreateModal
        key={editingMemberId || "edit"}
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingMemberId(null); }}
        title="Edit executive member"
        description="Change the office this person holds in the chapter."
        fields={editFields}
        onSubmit={handleUpdateMember}
        submitButtonText={isUpdating ? "Updating..." : "Update"}
        initialValues={editInitialValues}
      />

      <ConfirmationDialog
        isOpen={showRemoveDialog}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        actionType="remove"
        confirmText="Yes, Remove"
        cancelText="Cancel"
      />
    </div>
  );
}
