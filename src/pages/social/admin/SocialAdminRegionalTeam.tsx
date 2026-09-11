import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { RegionalTeamMemberCard } from "../../../components/admin";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import { CreateModal } from "../../../components/modals";
import type { FormField } from "../../../components/modals/CreateModal";
import CreateRgArgModal from "../../../components/modals/CreateRgArgModal";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useCreateSocialRegionalTeamMemberMutation,
  useGetSocialRegionalTeamQuery,
  useGetSocialRegionalTeamRolesQuery,
  useRemoveSocialRegionalTeamMemberMutation,
  useSearchSocialRegionalTeamUsersQuery,
  useUpdateSocialRegionalTeamMemberMutation,
} from "../../../services/social/regionalTeamApi";
import { useGetSocialRegionalBoardQuery } from "../../../services/social/regionalBoardApi";
import type {
  SocialRegionalTeamAssignableUser,
  SocialRegionalTeamMember,
  SocialRegionalTeamRole,
} from "../../../services/social/types";

type ScopeType = "REGION" | "CHAPTER";
type ModalSubmitResult = Promise<{ errors?: Record<string, string> } | void>;
const MULTI_CHAPTER_ROLE_CODES = [
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
  "CHAPTER_GOVERNOR",
] as const;

type CardMember = {
  id: string;
  name: string;
  roleCode: string;
  roleLabel: string;
  scope: ScopeType;
  chapterId: string;
  chapterName: string;
  chapterIds: string[];
  chapterNames: string[];
  regionName: string;
  area: string;
  avatarInitial: string;
  status: "ACTIVE" | "BLOCKED" | "ENDED";
};

const DEFAULT_ROLE_OPTIONS: SocialRegionalTeamRole[] = [
  { code: "REGIONAL_GOVERNOR", scope: "REGION", display_name: "Regional Governor" },
  {
    code: "ASSISTANT_REGIONAL_GOVERNOR",
    scope: "CHAPTER",
    display_name: "Assistant Regional Governor",
  },
  { code: "LAUNCH_GOVERNOR", scope: "CHAPTER", display_name: "Launch Governor" },
  { code: "CHAPTER_GOVERNOR", scope: "CHAPTER", display_name: "Chapter Governor" },
];

const HIDDEN_ADD_MEMBER_ROLE_CODES = new Set([
  "SOCIAL_PRESIDENT",
  "SOCIAL_TREASURER",
  "SOCIAL_GENERAL_SECRETARY",
]);

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "ENDED", label: "Ended" },
];

const REGION_CREATE_MODE_OPTIONS = [
  { value: "new", label: "Create New Person" },
  { value: "existing", label: "Select Existing Member" },
];

function extractApiError(error: unknown): string {
  const err = error as {
    data?: { message?: string; errors?: Array<{ message?: string }> };
    message?: string;
  };
  return (
    err?.data?.errors?.[0]?.message ||
    err?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

function buildScopeLabel(member: CardMember): string {
  if (member.scope === "REGION") {
    return member.regionName || member.area || "Regional Scope";
  }

  if (member.chapterNames.length > 1) {
    const chapterLabel = member.chapterNames.join(", ");
    return member.area ? `${chapterLabel}, ${member.area}` : chapterLabel;
  }

  if (member.chapterName && member.area) {
    return `${member.chapterName}, ${member.area}`;
  }

  return member.chapterName || member.area || member.regionName || "Chapter Scope";
}

export default function SocialAdminRegionalTeam() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingName, setPendingName] = useState("");
  const [pendingRoleCode, setPendingRoleCode] = useState("ALL_ROLES");
  const [pendingStatus, setPendingStatus] = useState("ACTIVE");
  const [searchParams, setSearchParams] = useState({
    name: "",
    role_code: undefined as string | undefined,
    status: "ACTIVE" as "ACTIVE" | "BLOCKED" | "ENDED",
    page: 1,
    limit: 12,
  });

  const [isCreateRgArgOpen, setIsCreateRgArgOpen] = useState(false);
  const [creationScope, setCreationScope] = useState<ScopeType | null>(null);
  const [editingMember, setEditingMember] = useState<CardMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [submitError, setSubmitError] = useState("");

  const { data: rolesRes } = useGetSocialRegionalTeamRolesQuery();
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ page: 1, limit: 100 });
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useGetSocialRegionalTeamQuery(searchParams);

  const [createMember, { isLoading: isCreating }] = useCreateSocialRegionalTeamMemberMutation();
  const [updateMember, { isLoading: isUpdating }] = useUpdateSocialRegionalTeamMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveSocialRegionalTeamMemberMutation();

  const isCreateOpen = creationScope !== null;
  const isEditOpen = Boolean(editingMember);
  const isAnyModalOpen = isCreateOpen || isEditOpen;

  const { data: assignableUsersRes, isFetching: isFetchingUsers } = useSearchSocialRegionalTeamUsersQuery(
    { q: memberSearch || undefined, page: 1, limit: 50 },
    { skip: !isAnyModalOpen },
  );

  const roleCatalog = useMemo(
    () => rolesRes?.data?.roles?.length ? rolesRes.data.roles : DEFAULT_ROLE_OPTIONS,
    [rolesRes],
  );

  const roleOptions = useMemo(
    () => [
      { value: "ALL_ROLES", label: "All Roles" },
      ...roleCatalog.map((role) => ({ value: role.code, label: role.display_name })),
    ],
    [roleCatalog],
  );

  const regionRoleOptions = useMemo(
    () => {
      const allowedCodes = new Set(["REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR"]);
      return roleCatalog
        .filter((role) => allowedCodes.has(role.code))
        .map((role) => ({ value: role.code, label: role.display_name }));
    },
    [roleCatalog],
  );

  const chapterRoleOptions = useMemo(
    () =>
      roleCatalog
        .filter((role) => role.scope === "CHAPTER" && !HIDDEN_ADD_MEMBER_ROLE_CODES.has(role.code))
        .map((role) => ({ value: role.code, label: role.display_name })),
    [roleCatalog],
  );

  const chapterOptions = useMemo(
    () =>
      (((chaptersRes as any)?.data?.items ?? []) as Array<{ id: string; name: string }>).map((chapter) => ({
        value: chapter.id,
        label: chapter.name,
      })),
    [chaptersRes],
  );

  const apiItems = (data?.data?.items ?? []) as SocialRegionalTeamMember[];
  const currentPage = Number(data?.data?.page ?? searchParams.page);
  const pageLimit = Number(data?.data?.limit ?? searchParams.limit);
  const totalItems = Number(data?.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));

  const teamMembers = useMemo<CardMember[]>(
    () =>
      apiItems.map((member) => ({
        id: member.id,
        name: member.user?.name || member.user?.email || "Member",
        roleCode: member.role.code,
        roleLabel: member.role.label,
        scope: member.scope,
        chapterId: member.chapter?.id || "",
        chapterName: member.chapter?.name || "",
        chapterIds: Array.isArray(member.chapters)
          ? member.chapters.map((chapter) => chapter.id)
          : member.chapter?.id
          ? [member.chapter.id]
          : [],
        chapterNames: Array.isArray(member.chapters)
          ? member.chapters.map((chapter) => chapter.name)
          : member.chapter?.name
          ? [member.chapter.name]
          : [],
        regionName: member.region?.name || "",
        area: member.area || "",
        avatarInitial:
          member.user?.avatarInitial ||
          (member.user?.name || member.user?.email || "M").trim().charAt(0).toUpperCase(),
        status: member.status,
      })),
    [apiItems],
  );

  const existingUserIds = useMemo(
    () => new Set(apiItems.map((member) => member.user?.id).filter(Boolean)),
    [apiItems],
  );

  const assignableUsers = (assignableUsersRes?.data?.items ?? []) as SocialRegionalTeamAssignableUser[];

  const assignableUserOptions = useMemo(() => {
    const filtered = assignableUsers
      .filter((user) => !existingUserIds.has(user.id))
      .map((user) => {
        const scopeLabel = user.chapter?.name || user.region?.name || user.email;
        return {
          value: user.id,
          label: `${user.name}${scopeLabel ? ` (${scopeLabel})` : ""}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    if (isFetchingUsers) {
      return [{ value: "", label: "Loading users..." }];
    }

    if (!filtered.length) {
      return [{ value: "", label: "No available users found" }];
    }

    return filtered;
  }, [assignableUsers, existingUserIds, isFetchingUsers]);

  const createFields = useMemo<FormField[]>(() => {
    const fields: FormField[] = [];

    if (creationScope === "REGION") {
      fields.push({
        name: "create_mode",
        label: "Create Type",
        type: "select",
        options: REGION_CREATE_MODE_OPTIONS,
        required: true,
        placeholder: "Select create type",
      });

      fields.push({
        name: "user_id",
        label: "Member",
        type: "select",
        options: assignableUserOptions,
        required: false,
        searchable: true,
        searchPlaceholder: "Search members...",
        onSearchChange: setMemberSearch,
        disableClientSideFilter: true,
        hideOptionsUntilSearch: false,
        menuMaxHeightClass: "max-h-64",
        placeholder: "Select member",
        showWhenField: "create_mode",
        showWhenValues: ["existing"],
      });

      fields.push(
        {
          name: "name",
          label: "Name",
          type: "text",
          placeholder: "Enter full name",
          showWhenField: "create_mode",
          showWhenValues: ["new"],
        },
        {
          name: "email",
          label: "Email",
          type: "text",
          placeholder: "Enter email",
          showWhenField: "create_mode",
          showWhenValues: ["new"],
        },
        {
          name: "phone",
          label: "Phone",
          type: "text",
          placeholder: "Enter phone number",
          showWhenField: "create_mode",
          showWhenValues: ["new"],
        },
      );
    } else {
      fields.push({
        name: "user_id",
        label: "Member",
        type: "select",
        options: assignableUserOptions,
        required: true,
        searchable: true,
        searchPlaceholder: "Search members...",
        onSearchChange: setMemberSearch,
        disableClientSideFilter: true,
        hideOptionsUntilSearch: false,
        menuMaxHeightClass: "max-h-64",
        placeholder: "Select member",
      });
    }

    fields.push({
      name: "role_code",
      label: "Role",
      type: "select",
      options: creationScope === "REGION" ? regionRoleOptions : chapterRoleOptions,
      required: true,
      placeholder: "Select role",
    });

    const shouldShowMultiChapterField =
      creationScope === "CHAPTER" || creationScope === "REGION";

    if (shouldShowMultiChapterField) {
      fields.push({
        name: "social_chapter_ids",
        label: "Chapters",
        type: "select",
        options: chapterOptions,
        required: false,
        searchable: true,
        searchPlaceholder: "Search chapters...",
        menuMaxHeightClass: "max-h-64",
        placeholder: "Select chapters",
        multiSelect: true,
        chipDisplay: true,
        showWhenField: "role_code",
        showWhenValues: [...MULTI_CHAPTER_ROLE_CODES],
      });
    }

    if (creationScope === "CHAPTER") {
      fields.push({
        name: "social_chapter_id",
        label: "Chapter",
        type: "select",
        options: chapterOptions,
        required: true,
        searchable: true,
        searchPlaceholder: "Search chapters...",
        menuMaxHeightClass: "max-h-64",
        placeholder: "Select chapter",
        hideWhenField: "role_code",
        hideWhenValues: [...MULTI_CHAPTER_ROLE_CODES],
      });
    }

    fields.push({
      name: "area",
      label: "Area",
      type: "text",
      placeholder: "Enter area",
    });

    return fields;
  }, [assignableUserOptions, chapterOptions, chapterRoleOptions, creationScope, regionRoleOptions]);

  const editFields = useMemo<FormField[]>(() => {
    if (!editingMember) return [];

    const allEditRoleOptions = roleCatalog.map((role) => ({
      value: role.code,
      label: role.display_name,
    }));
    const chapterRoleCodes = roleCatalog
      .filter((role) => role.scope === "CHAPTER")
      .map((role) => role.code);

    const fields: FormField[] = [
      {
        name: "member",
        label: "Member",
        type: "text",
        disabled: true,
      },
      {
        name: "role_code",
        label: "Role",
        type: "select",
        options: allEditRoleOptions,
        required: true,
        placeholder: "Select role",
      },
    ];

    fields.push({
      name: "social_chapter_ids",
      label: "Chapters",
      type: "select",
      options: chapterOptions,
      required: false,
      searchable: true,
      searchPlaceholder: "Search chapters...",
      menuMaxHeightClass: "max-h-64",
      placeholder: "Select chapters",
      multiSelect: true,
      chipDisplay: true,
      showWhenField: "role_code",
      showWhenValues: [...MULTI_CHAPTER_ROLE_CODES],
    });
    fields.push({
      name: "social_chapter_id",
      label: "Chapter",
      type: "select",
      options: chapterOptions,
      required: true,
      searchable: true,
      searchPlaceholder: "Search chapters...",
      menuMaxHeightClass: "max-h-64",
      placeholder: "Select chapter",
      showWhenField: "role_code",
      showWhenValues: chapterRoleCodes.filter((code) => !MULTI_CHAPTER_ROLE_CODES.includes(code as any)),
    });

    fields.push({
      name: "area",
      label: "Area",
      type: "text",
      placeholder: "Enter area",
    });

    return fields;
  }, [chapterOptions, editingMember, roleCatalog]);

  const editInitialValues = useMemo(
    () =>
      editingMember
        ? {
            member: editingMember.name,
            role_code: editingMember.roleCode,
            social_chapter_id: editingMember.chapterId,
            social_chapter_ids: editingMember.chapterIds.join(","),
            area: editingMember.area,
          }
        : undefined,
    [editingMember],
  );

  const handleSearch = () => {
    setSearchParams({
      name: pendingName.trim(),
      role_code: pendingRoleCode !== "ALL_ROLES" ? pendingRoleCode : undefined,
      status: pendingStatus as "ACTIVE" | "BLOCKED" | "ENDED",
      page: 1,
      limit: 12,
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  const closeCreateModal = () => {
    setCreationScope(null);
    setMemberSearch("");
    setSubmitError("");
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setMemberSearch("");
    setSubmitError("");
  };

  const handleCreateSubmit = async (form: Record<string, string>): ModalSubmitResult => {
    if (!creationScope) return;

    const isRegionNewCreate = creationScope === "REGION" && (form.create_mode || "new") === "new";
    const selectedRoleCode = form.role_code;
    const selectedRole = roleCatalog.find((role) => role.code === selectedRoleCode);
    const effectiveScope = selectedRole?.scope || creationScope;
    const selectedChapterIds = String(form.social_chapter_ids || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const primaryChapterId = selectedChapterIds[0] || form.social_chapter_id;

    if (!selectedRoleCode) {
      return { errors: { role_code: "Role is required." } };
    }

    if (isRegionNewCreate) {
      if (!form.name?.trim()) {
        return { errors: { name: "Name is required." } };
      }
      if (!form.email?.trim()) {
        return { errors: { email: "Email is required." } };
      }
      if (!form.phone?.trim()) {
        return { errors: { phone: "Phone is required." } };
      }
    } else if (!form.user_id) {
      return { errors: { user_id: "Please select a member." } };
    }

    if (MULTI_CHAPTER_ROLE_CODES.includes(selectedRoleCode as any) && !selectedChapterIds.length) {
      return { errors: { social_chapter_ids: "Please select at least one chapter." } };
    }

    if (effectiveScope === "CHAPTER" && !primaryChapterId && !selectedChapterIds.length) {
      return { errors: { social_chapter_id: "Chapter is required for chapter-level roles." } };
    }

    setSubmitError("");

    try {
      await createMember({
        user_id: isRegionNewCreate ? undefined : form.user_id,
        name: isRegionNewCreate ? form.name?.trim() : undefined,
        email: isRegionNewCreate ? form.email?.trim() : undefined,
        phone: isRegionNewCreate ? form.phone?.trim() : undefined,
        role_code: selectedRoleCode,
        scope: effectiveScope,
        social_chapter_id: effectiveScope === "CHAPTER" ? primaryChapterId : undefined,
        social_chapter_ids:
          MULTI_CHAPTER_ROLE_CODES.includes(selectedRoleCode as any) ? selectedChapterIds : undefined,
        area: form.area?.trim() || undefined,
      }).unwrap();

      showToast({
        title: "Success",
        description:
          creationScope === "REGION"
            ? "Regional governor role added successfully."
            : "Regional team member added successfully.",
        kind: "success",
      });

      closeCreateModal();
      return;
    } catch (error) {
      const message = extractApiError(error);
      setSubmitError(message);
      return { errors: { form: message } };
    }
  };

  const handleEditSubmit = async (form: Record<string, string>): ModalSubmitResult => {
    if (!editingMember) return;
    const selectedRoleCode = form.role_code;
    const selectedRole = roleCatalog.find((role) => role.code === selectedRoleCode);
    const effectiveScope = selectedRole?.scope || editingMember.scope;
    const selectedChapterIds = String(form.social_chapter_ids || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const isMultiChapterRole =
      effectiveScope === "CHAPTER" && MULTI_CHAPTER_ROLE_CODES.includes(selectedRoleCode as any);
    const primaryChapterId = selectedChapterIds[0] || form.social_chapter_id;

    if (!selectedRoleCode) {
      return { errors: { role_code: "Role is required." } };
    }

    if (isMultiChapterRole && !selectedChapterIds.length) {
      return { errors: { social_chapter_ids: "Please select at least one chapter." } };
    }

    if (effectiveScope === "CHAPTER" && !isMultiChapterRole && !primaryChapterId) {
      return { errors: { social_chapter_id: "Chapter is required for chapter-level roles." } };
    }

    setSubmitError("");

    try {
      await updateMember({
        id: editingMember.id,
        role_code: selectedRoleCode,
        social_chapter_id: effectiveScope === "CHAPTER" && !isMultiChapterRole ? primaryChapterId : undefined,
        social_chapter_ids: effectiveScope === "CHAPTER" && isMultiChapterRole ? selectedChapterIds : undefined,
        area: form.area?.trim() || undefined,
      }).unwrap();

      showToast({
        title: "Success",
        description: "Regional team member updated successfully.",
        kind: "success",
      });

      closeEditModal();
      return;
    } catch (error) {
      const message = extractApiError(error);
      setSubmitError(message);
      return { errors: { form: message } };
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    try {
      await removeMember(memberToRemove.id).unwrap();
      showToast({
        title: "Success",
        description: "Regional team member removed successfully.",
        kind: "success",
      });
      setMemberToRemove(null);
    } catch (error) {
      showToast({
        title: "Remove failed",
        description: extractApiError(error),
        kind: "error",
      });
    }
  };

  const emptyMessage =
    pendingStatus === "BLOCKED"
      ? "No blocked members found."
      : pendingStatus === "ENDED"
      ? "No ended members found."
      : "No active members found.";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Regional Team</h1>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            Failed to load regional team members. Please try again.
          </div>
        )}

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {submitError}
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-auto lg:w-[220px]">
              <FormInput
                label="Name"
                type="text"
                placeholder="Search by name"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>

            <div className="w-full sm:w-auto lg:w-[220px]">
              <FormSelect
                label="Role"
                value={pendingRoleCode}
                onChange={(e) => setPendingRoleCode(e.target.value)}
                options={roleOptions}
              />
            </div>

            <div className="w-full sm:w-auto lg:w-[220px]">
              <FormSelect
                label="Status"
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value)}
                options={STATUS_OPTIONS}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading || isFetching}
                className="h-[46px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {isLoading || isFetching ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                onClick={() => setIsCreateRgArgOpen(true)}
                className="h-10 px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap"
              >
                Create RG & ARG +
              </button>
              <button
                onClick={() => {
                  setCreationScope("CHAPTER");
                  setMemberSearch("");
                }}
                className="h-10 px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap"
              >
                Add Regional Member +
              </button>
            </div>
          </div>
        </div>

        {isLoading || isFetching ? (
          <div className="py-12 text-center text-white">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
            <p className="mt-4">Loading team members...</p>
          </div>
        ) : teamMembers.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
              {teamMembers.map((member) => (
                <RegionalTeamMemberCard
                  key={member.id}
                  name={member.name}
                  role={member.roleLabel}
                  chapter={buildScopeLabel(member)}
                  avatarColor="#D85D27"
                  avatarInitial={member.avatarInitial}
                  onClick={() =>
                    navigate(`/social/admin/regional-team/member/${member.id}`, {
                      state: {
                        chapterNames: member.chapterNames,
                        chapterName: member.chapterName,
                        chapterIds: member.chapterIds,
                      },
                    })
                  }
                  onEdit={() => {
                    setEditingMember(member);
                    setSubmitError("");
                  }}
                  onRemove={() => setMemberToRemove({ id: member.id, name: member.name })}
                />
              ))}
            </div>

            {totalItems > 0 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 rounded-md bg-gray-700 text-white disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 rounded-md bg-gray-700 text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">{emptyMessage}</h3>
            <p className="mt-2 text-sm text-gray-400">
              Adjust the filters or add a new social regional team member.
            </p>
          </div>
        )}
      </main>

      <CreateRgArgModal
        isOpen={isCreateRgArgOpen}
        onClose={() => setIsCreateRgArgOpen(false)}
        onSuccess={() => setSearchParams((p) => ({ ...p }))}
      />

      <CreateModal
        key={`create-${creationScope || "closed"}`}
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        title="Add Regional Member"
        fields={createFields}
        onSubmit={handleCreateSubmit}
        submitButtonText={isCreating ? "Creating..." : "Create"}
      />

      <CreateModal
        key={`edit-${editingMember?.id || "closed"}`}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        title="Edit Regional Team Member"
        fields={editFields}
        onSubmit={handleEditSubmit}
        submitButtonText={isUpdating ? "Updating..." : "Update"}
        initialValues={editInitialValues}
      />

      <ConfirmationDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        actionType="remove"
        isSubmitting={isRemoving}
      />
    </div>
  );
}
