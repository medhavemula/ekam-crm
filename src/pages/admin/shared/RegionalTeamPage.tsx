import React, { useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { useRole } from "../../../hooks/useRole";
import { RegionalTeamMemberCard } from "../../../components/admin";
import { CreateModal } from "../../../components/modals";
import CreateRdArdModal from "../../../components/modals/CreateRdArdModal";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import type { FormField } from "../../../components/modals/CreateModal";
import FormSelect from "../../../components/forms/FormSelect";
import FormInput from "../../../components/forms/FormInput";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search as SearchIcon,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { MemberCardGridSkeleton } from "../../../components/common/Skeletons";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetEdTeamMembersQuery,
  useAddEdTeamMemberMutation,
  useUpdateEdTeamMemberMutation,
  useUpdateEdTeamMemberStatusMutation,
  useGetEdChaptersQuery,
  useGetEdUsersQuery,
} from "../../../services/ed";

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
  const { role: userRole } = useRole();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateRdArdOpen, setIsCreateRdArdOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState<string>("");
  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{id: string, name: string} | null>(null);
  // Local state for form inputs
  const [pendingName, setPendingName] = useState("");
  const [pendingRole, setPendingRole] = useState("ALL_ROLES");
  const [pendingStatus, setPendingStatus] = useState("ACTIVE");
  
  // State for search parameters that trigger API calls
  // Widened: inferred from the initial object, status narrowed to "ACTIVE" and
  // every comparison against another status became a type error.
  const [searchParams, setSearchParams] = useState<{
    role: string;
    status: string;
    name: string;
    page: number;
    limit: number;
  }>({
    role: "ALL_ROLES",
    status: "ACTIVE",
    name: "",
    page: 1,
    limit: 12,
  });
  
  // State for member search in create modal
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchPage, setMemberSearchPage] = useState(1);
  
  const [submitError, setSubmitError] = useState<string>("");

  const isEdRole = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(userRole || "");

  // Load chapters for the dropdown using chapters list API with name sorting
  const { data: chaptersRes } = useGetEdChaptersQuery({ 
    page: 1, 
    limit: 50,
  });
  
  // Chapter options for modal (without "All Chapters")
  const chapterOptions = (((chaptersRes as any)?.data?.items ?? []) as any[]).map((c: any) => ({ value: c.id, label: c.name }));

  // Derive API parameters from search state
  const roleCodeParam = searchParams.role && searchParams.role !== "ALL_ROLES" 
    ? searchParams.role.toUpperCase().replace(/-/g, "_") 
    : undefined;
  const statusParam = searchParams.status !== "ALL_STATUS" ? searchParams.status : 'ACTIVE';
  const nameParam = searchParams.name || undefined;

  // API Integration - only called when searchParams changes
  const { data, isLoading, error, refetch } = useGetEdTeamMembersQuery(
    isEdRole
      ? {
          role_code: roleCodeParam,
          status: statusParam,
          team: 'Regional',
          page: searchParams.page,
          limit: searchParams.limit,
          q: nameParam,
        } as any // Using any to bypass type checking for now
      : undefined,
    { skip: !isEdRole }
  );

  const [addTeamMember, { isLoading: isAdding }] = useAddEdTeamMemberMutation();
  const [updateTeamMember, { isLoading: isUpdating }] = useUpdateEdTeamMemberMutation();
  const [updateStatus] = useUpdateEdTeamMemberStatusMutation();

  // Load ED users for member selection in modal with search
  const { data: edUsersRes } = useGetEdUsersQuery({ 
    page: memberSearchPage, 
    limit: 20,
    q: memberSearch || undefined 
  });
  
  // Build member options for modal from API response
  const memberOptionsFromApi = React.useMemo(() => {
    const userItems = ((edUsersRes as any)?.data?.items ?? []);
    const seen = new Set<string>();
    return userItems
      .map((u: any) => {
        const name = u?.name || u?.userName || u?.fullName || u?.email || String(u?.id || "Member");
        const chapterName = u?.chapter?.name || u?.chapterName || '';
        const label = chapterName ? `${name} (${chapterName})` : name;
        const value = String(u?.id || u?.userId || "");
        return { value, label, raw: u };
      })
      .filter((opt: { value: string; label: string; raw: any }) => {
        if (!opt.value) return false;
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      })
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  }, [edUsersRes]);

  // Pagination derived values from server response
  const totalItems = Number((data as any)?.data?.total ?? 0);
  const serverPage = Number((data as any)?.data?.page ?? searchParams.page);
  const serverLimit = Number((data as any)?.data?.limit ?? searchParams.limit);
  const totalPages = Math.ceil(totalItems / serverLimit);

  // API items from server (no client-side hiding)
  const apiItems: any[] = (data as any)?.data?.items ?? [];

  // Edit Modal setup
  const roleValueFromCode = (code?: string) => {
    const map: Record<string, string> = {
      REGIONAL_DIRECTOR: "regional-director",
      ASSISTANT_REGIONAL_DIRECTOR: "assistant-regional-director",
      LAUNCH_DIRECTOR: "launch-director",
      CHAPTER_DIRECTOR: "chapter-director",
      SUPPORT_DIRECTOR: "support-director",
    };
    return code ? map[code] || code.toLowerCase().replace(/_/g, "-") : "";
  };
  const roleCodeFromValue = (val?: string) => {
    const map: Record<string, string> = {
      "regional-director": "REGIONAL_DIRECTOR",
      "assistant-regional-director": "ASSISTANT_REGIONAL_DIRECTOR",
      "launch-director": "LAUNCH_DIRECTOR",
      "chapter-director": "CHAPTER_DIRECTOR",
      "support-director": "SUPPORT_DIRECTOR",
    };
    // Ensure the value is properly formatted with underscores
    if (!val) return '';
    const mappedValue = map[val];
    if (mappedValue) return mappedValue;
    // If not in the map, convert to uppercase and replace all hyphens with underscores
    return val.toUpperCase().replace(/-/g, "_");
  };

  const editFields: FormField[] = [
    { name: "member", label: "Member", type: "text", placeholder: "Member", required: false, disabled: true },
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      options: [
        { value: "regional-director", label: "Regional Director" },
        { value: "assistant-regional-director", label: "Assistant Regional Director" },
        { value: "launch-director", label: "Launch Director" },
        { value: "chapter-director", label: "Chapter Director" },
        { value: "support-director", label: "Support Director" },
      ],
      required: true,
    },
    {
      name: "chapter",
      label: "Chapter",
      type: "select",
      placeholder: "Select chapter name",
      options: chapterOptions,
      required: false,
      includePlaceholderOption: true,
      searchable: true,
      searchPlaceholder: "Search chapters...",
      menuMaxHeightClass: "max-h-64",
      multiSelect: true,
      chipDisplay: true,
      hideWhenRoleIn: ["", "regional-director"],
    },
    { name: "area", label: "Area", type: "text", placeholder: "Enter area", required: false },
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
        // support multi-chapter prefill: accept arrays from various shapes
        chapter: (() => {
          const arr = (
            Array.isArray((editingRaw as any)?.chapters) ? (editingRaw as any).chapters :
            Array.isArray((editingRaw as any)?.chapterIds) ? (editingRaw as any).chapterIds :
            (editingRaw as any)?.chapter_id_list && Array.isArray((editingRaw as any)?.chapter_id_list) ? (editingRaw as any).chapter_id_list :
            []
          ) as any[];
          if (arr.length) return arr.map((c: any) => String(c?.id || c)).filter(Boolean).join(',');
          const single = String(editingRaw?.chapter?.id || editingRaw?.chapterId || "");
          return single;
        })(),
        area: String(editingRaw?.area || ""),
      }
    : undefined;

  const normalizeRoleCode = (code: string): string => {
    if (!code) return '';
    // Convert to uppercase and replace all hyphens with underscores
    return code.toUpperCase().replace(/-/g, '_');
  };

  const handleUpdateMember = async (form: Record<string, any>) => {
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
      const rawChapter = form.chapter;
      const chapterIdsArr: string[] = Array.isArray(rawChapter)
        ? rawChapter.map((v: any) => String(v)).filter(Boolean)
        : String(rawChapter || "")
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const chapterId = chapterIdsArr[0] || undefined; // primary

      // Derive regionId from selected chapter
      const chapterItems: any[] = (((chaptersRes as any)?.data?.items) || []) as any[];
      const selectedChapterObj = chapterId ? chapterItems.find((c: any) => String(c.id) === String(chapterId)) : undefined;
      const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
      const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];

      await updateTeamMember({
        memberId: String(editingMemberId),
        data: {
          roleCode: roleCode || undefined,
          chapterId,
          chapterIds: chapterIdsArr.map(String),
          regionId: regionIdToSend,
          area: form.area || undefined,
        },
      }).unwrap();
      
      // Show success toast
      showToast({
        title: "Success",
        description: "Team member updated successfully.",
        kind: "success"
      });
      
      // Close the edit modal and reset state
      setIsEditOpen(false);
      setEditingMemberId(null);
      setEditingDisplayName('');
      
    } catch (e) {
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
      
      // Handle multiple chapters - display all chapters from the chapters array
      const chaptersArray = Array.isArray(m.chapters) ? m.chapters : [];
      const chapterLabel = chaptersArray.length > 0 
        ? chaptersArray.map((c: any) => c.name).join(', ')
        : (m.chapterName || chapterObj.name || m.chapterId || "");
      
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

  const ROLE_OPTIONS = [
    { value: "ALL_ROLES", label: "All Roles" },
    { value: "regional-director", label: "Regional Director" },
    { value: "assistant-regional-director", label: "Assistant Regional Director" },
    { value: "launch-director", label: "Launch Director" },
    { value: "chapter-director", label: "Chapter Director" },
    { value: "support-director", label: "Support Director" },
  ];

  const STATUS_OPTIONS = [
    { value: "ALL_STATUS", label: "All Status" },
    { value: "ACTIVE", label: "Active" },
    { value: "BLOCKED", label: "Blocked" },
    { value: "ENDED", label: "Ended" },
  ];

  // Everything below reads the applied filters, never the pending ones — the
  // old empty state read the dropdown, so picking a status rewrote the message
  // before anyone pressed Search.
  const appliedStatus = searchParams.status;
  const appliedRole = searchParams.role;
  const appliedStatusLabel =
    appliedStatus === "ALL_STATUS"
      ? ""
      : STATUS_OPTIONS.find((o) => o.value === appliedStatus)?.label ?? "";
  const appliedRoleLabel =
    appliedRole === "ALL_ROLES" ? "" : ROLE_OPTIONS.find((o) => o.value === appliedRole)?.label ?? "";

  // Two different questions. Narrowing by name or role means the filters found
  // nothing; a status other than the default means the status itself is the
  // explanation, and the empty state should say which. "Active" is where the
  // page opens, so it is not itself a filter — but it is still clearable.
  const narrowedByNameOrRole = Boolean(searchParams.name) || appliedRole !== "ALL_ROLES";
  const hasActiveFilters = narrowedByNameOrRole || appliedStatus !== "ACTIVE";

  const clearFilters = () => {
    setPendingName("");
    setPendingRole("ALL_ROLES");
    setPendingStatus("ACTIVE");
    setSearchParams({ role: "ALL_ROLES", status: "ACTIVE", name: "", page: 1, limit: 12 });
  };

  const emptyCopy = narrowedByNameOrRole
    ? {
        title: "No members match these filters",
        body: "Try a different name or role — or clear the filters to see everyone on the team.",
      }
    : appliedStatus === "BLOCKED"
      ? { title: "No blocked members", body: "Nobody on this team is blocked right now." }
      : appliedStatus === "ENDED"
        ? { title: "No ended members", body: "Nobody on this team has an ended term." }
        : {
            title: "No team members yet",
            body: "Add a regional member, or create an RD or ARD to start building the team.",
          };

  const handleSearch = async () => {
    // Update search parameters which will trigger the API call
    setSearchParams({
      role: pendingRole,
      status: pendingStatus,
      name: pendingName,
      page: 1, // Reset to first page on new search
      limit: 12,
    });
    
  };

  const handlePageChange = (newPage: number) => {
    // Update page in search params to trigger API call
    setSearchParams(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  // Handle member search in create modal
  const handleMemberSearchChange = (searchValue: string) => {
    setMemberSearch(searchValue);
    setMemberSearchPage(1); // Reset to first page on new search
  };

  // Debounce member search to avoid excessive API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // The API call will automatically trigger when memberSearch or memberSearchPage changes
      // due to the useGetEdUsersQuery hook dependencies
    }, 300);
    
    return () => clearTimeout(timer);
  }, [memberSearch, memberSearchPage]);

  const handleEdit = (clicked: TeamMember) => {
    let found = apiItems.find(
      (m: any) => String(m.id ?? m._id) === String(clicked.id)
    );

    if (!found) {
      found = apiItems.find((m: any) => {
        const n =
          m?.user?.name ||
          m?.userName ||
          m?.name ||
          m?.memberName;

        return (
          n &&
          String(n).trim().toLowerCase() ===
          String(clicked.name).trim().toLowerCase()
        );
      });
    }

    // Open modal for all roles
    setEditingMemberId(
      found ? String(found.id ?? found._id) : String(clicked.id)
    );

    setEditingDisplayName(clicked.name);
    setIsEditOpen(true);
  };

  const handleRemoveClick = (memberId: string, memberName: string, e?: React.MouseEvent) => {
    // Prevent the event from bubbling up to parent elements
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMemberToRemove({ id: memberId, name: memberName });
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    
    const memberId = memberToRemove.id;
    const raw = apiItems.find((m: any) => String(m.id ?? m._id) === String(memberId));
    const idToUse = String(raw?.id ?? raw?._id ?? memberId);
    
    try {
      await updateStatus({ memberId: idToUse, status: "ENDED" as any }).unwrap();
      // Manually refetch the team members list to ensure UI is up to date
      await refetch();
    } catch (e) {
      setSubmitError('Failed to remove team member. Please try again.');
    } finally {
      setShowConfirmDialog(false);
      setMemberToRemove(null);
    }
  };

  const handleCreateMember = async (form: Record<string, any>) => {
    setSubmitError("");
    // Map modal fields to API
    const userId = form.member; // Expecting a real userId; if not, backend will validate
    
    // Validate role selection
    if (!form.role || form.role.trim() === '') {
      showToast({
        title: "Validation Error",
        description: "Please select a role before creating the member.",
        kind: "error"
      });
      return { errors: { role: 'Role is required' } as Record<string, string> };
    }
    
    // Get role code and ensure it's properly formatted with underscores
    const roleCode = normalizeRoleCode(roleCodeFromValue(form.role));
    const rawChapter = form.chapter;
    const chapterIdsArr: string[] = Array.isArray(rawChapter)
      ? rawChapter.map((v: any) => String(v)).filter(Boolean)
      : String(rawChapter || "")
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    const chapterId = chapterIdsArr[0] || undefined; // primary
    const area = form.area || undefined;

    // Determine scope based on role
    const roleScopeMap: Record<string, "COUNTRY" | "REGION" | "CHAPTER"> = {
      "REGIONAL_DIRECTOR": "REGION",
      "ASSISTANT_REGIONAL_DIRECTOR": "REGION",
      "LAUNCH_DIRECTOR": "CHAPTER",
      "CHAPTER_DIRECTOR": "CHAPTER",
      "SUPPORT_DIRECTOR": "CHAPTER",
    };

    const scope = roleScopeMap[roleCode] || (chapterId ? "CHAPTER" : "REGION");
    // Removed unused variables

    if (!userId || !roleCode) {
      showToast({
        title: "Validation Error",
        description: "Please select valid Member and Role.",
        kind: "error"
      });
      return { errors: { form: 'Please select valid Member and Role.' } as Record<string, string> };
    }

    // Validate chapter is within allowed list (avoid ED scope violation)
    const allowedChapterIds = new Set(
      ((((chaptersRes as any)?.data?.items) || []) as any[]).map((c: any) => String(c.id))
    );
    if (chapterId && !allowedChapterIds.has(String(chapterId))) {
      showToast({
        title: "Validation Error",
        description: "Selected chapter is outside your scope. Please choose an allowed chapter or leave it blank.",
        kind: "error"
      });
      return { errors: { chapter: 'Selected chapter is outside your scope. Please choose an allowed chapter or leave it blank.' } as Record<string, string> };
    }

    // Derive regionId to satisfy backend scope requirement
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
        chapterIds: chapterIdsArr.map(String),
        regionId: regionIdToSend,
        area,
        isPrimary: true,
      } as any).unwrap();
      
      // Show success toast
      showToast({
        title: "Success",
        description: "Regional team member added successfully.",
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
      options: memberOptionsFromApi,
      required: true,
      searchable: true,
      searchPlaceholder: "Search members...",
      onSearchChange: handleMemberSearchChange,
      disableClientSideFilter: true,
      menuMaxHeightClass: "max-h-64",
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      options: [
        { value: "launch-director", label: "Launch Director" },
        { value: "chapter-director", label: "Chapter Director" },
        { value: "support-director", label: "Support Director" },
      ],
      required: true,
    },
    {
      name: "chapter",
      label: "Chapter",
      type: "select",
      placeholder: "Select chapter name",
      options: chapterOptions,
      required: false,
      includePlaceholderOption: true,
      searchable: true,
      searchPlaceholder: "Search chapters...",
      menuMaxHeightClass: "max-h-64",
      multiSelect: true,
      chipDisplay: true,
      hideWhenRoleIn: ["", "regional-director", "assistant-regional-director"],
    },
    { 
      name: "area", 
      label: "Area", 
      type: "text", 
      placeholder: "Enter area", 
      required: false 
    },
  ];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Title, the count it stands for, and the two ways to add someone.
            Both used to be filled ember and sat on a second row under the
            filters, so the page offered two equal primaries and neither read as
            the usual one. Adding an existing member is the everyday action; the
            RD/ARD one is rarer and quieter. */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <Users className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Regional Leadership
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Regional Team
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
              Directors and members holding a role across your region.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {userRole !== "ASSISTANT_REGIONAL_DIRECTOR" && (
              <button
                type="button"
                onClick={() => setIsCreateRdArdOpen(true)}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                {userRole === "REGIONAL_DIRECTOR" ? "Create ARD" : "Create RD & ARD"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add regional member
            </button>
          </div>
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
                {submitError ? "That did not go through" : "Could not load the team"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--ov-ink-4)]">
                {submitError || "The regional team did not respond. Nothing has changed — try the search again."}
              </p>
            </div>
          </div>
        )}

        {/* Name, role and status sit in the recessed track the rest of the admin
            chrome uses for controls, at the field sizes the panel is set in. */}
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
              options={ROLE_OPTIONS}
            />
          </div>

          <div className="w-full shrink-0 sm:w-auto lg:w-[180px]">
            <FormSelect
              label="Status"
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="text-[13px]"
              options={STATUS_OPTIONS}
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

        {/* Members Grid */}
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
                onEdit={(() => {
                  const memberRaw = apiItems.find((m: any) => String(m.id ?? m._id) === String(member.id));
                  return memberRaw?.status === "ENDED" ? undefined : () => handleEdit(member);
                })()}
                onRemove={(() => {
                  const memberRaw = apiItems.find((m: any) => String(m.id ?? m._id) === String(member.id));
                  return memberRaw?.status === "ENDED" ? undefined : (e?: React.MouseEvent) => handleRemoveClick(member.id, member.name, e);
                })()}
                removeDisabled={(() => {
                  const memberRaw = apiItems.find((m: any) => String(m.id ?? m._id) === String(member.id));
                  const memberRoleCode = memberRaw?.role?.code || memberRaw?.roleCode || "";
                  const isRdOrArd = ["REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(memberRoleCode);
                  const canRemoveRdArd = ["EXECUTIVE_DIRECTOR", "ED_TEAM"].includes(userRole || "");
                  return isRdOrArd && !canRemoveRdArd;
                })()}
                onRemoveDisabledClick={() => showToast({
                  title: "Permission Denied",
                  description: "Only Executive Director or ED Team can remove RD/ARD members.",
                  kind: "error",
                })}
                onClick={() => navigate(`/admin/regional-team/member/${member.id}`)}
              />
            ))}
          </div>
        ) : (
          /* The copy reads the applied status, not the pending one — changing
             the dropdown used to rewrite this message before anyone searched. */
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
                  Add regional member
                </>
              )}
            </button>
          </div>
        )}

        {/* One page of results needs no pager. */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--ov-panel)] px-4 py-3 ring-1 ring-[color:var(--ov-line)]">
            <p className="text-[12.5px] text-[var(--ov-ink-4)]">
              Showing{" "}
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {Math.min((serverPage - 1) * 12 + 1, totalItems)}–
                {Math.min(serverPage * 12, totalItems)}
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

      {/* Create RD & ARD Modal */}
      <CreateRdArdModal
        isOpen={isCreateRdArdOpen}
        onClose={() => setIsCreateRdArdOpen(false)}
        onSuccess={() => refetch()}
        userRole={userRole || ""}
      />

      {/* Add Regional Member Modal */}
      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add a regional member"
        description="Give someone already on the platform a role in your region."
        fields={modalFields}
        onSubmit={handleCreateMember}
        submitButtonText={isAdding ? "Creating..." : "Create"}
      />

      {/* Edit Regional Member Modal */}
      <CreateModal
        key={editingMemberId || "edit"}
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingMemberId(null); }}
        title="Edit regional member"
        description="Change the role or chapter this person is assigned to."
        fields={editFields}
        onSubmit={handleUpdateMember}
        submitButtonText={isUpdating ? "Updating..." : "Update"}
        initialValues={editInitialValues}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleConfirmRemove}
        actionType="remove"
        confirmText={`Yes, Remove ${memberToRemove?.name || 'Member'}`}
        cancelText="Cancel"
      />
    </div>
  );
}
