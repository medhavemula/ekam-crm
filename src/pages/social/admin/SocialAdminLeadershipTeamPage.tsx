import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { RegionalTeamMemberCard } from "../../../components/admin";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useToast } from "../../../components/toast/ToastProvider";
import type { FormField } from "../../../components/modals/CreateModal";
import {
  useGetSocialRegionalTeamQuery,
  useGetSocialRegionalTeamRolesQuery,
  useCreateSocialRegionalTeamMemberMutation,
  useUpdateSocialRegionalTeamMemberMutation,
  useRemoveSocialRegionalTeamMemberMutation,
  useGetSocialChapterMembersQuery,
} from "../../../services/social";

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  roleCode?: string;
  chapter?: string;
  status?: "ACTIVE" | "BLOCKED" | "ENDED";
  avatarColor: string;
  avatarInitial: string;
}

const EXECUTIVE_ROLE_CODES = [
  "SOCIAL_PRESIDENT",
  "SOCIAL_TREASURER",
  "SOCIAL_GENERAL_SECRETARY",
  "VICE_PRESIDENT",
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "ENDED", label: "Ended" },
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

export default function SocialAdminLeadershipTeamPage() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // API queries (scoped to this social chapter)
  const { data: regionalData, isLoading, isFetching, error, refetch } = useGetSocialRegionalTeamQuery({
    name: searchParams.name || undefined,
    role_code: searchParams.role_code,
    status: searchParams.status,
    social_chapter_id: chapterId,
    page: searchParams.page,
    limit: searchParams.limit,
  });
  const { data: rolesData } = useGetSocialRegionalTeamRolesQuery();

  // Chapter members for the Member dropdown in the modal
  const { data: chapterMembersData } = useGetSocialChapterMembersQuery(
    {
      socialChapterId: chapterId || "",
      page: 1,
      limit: 100,
    },
    { skip: !chapterId }
  );

  // Mutations
  const [createRegionalMember, { isLoading: isCreating }] = useCreateSocialRegionalTeamMemberMutation();
  const [updateRegionalMember, { isLoading: isUpdating }] = useUpdateSocialRegionalTeamMemberMutation();
  const [removeRegionalMember, { isLoading: isRemoving }] = useRemoveSocialRegionalTeamMemberMutation();

  // Transform API data
  const teamMembers = useMemo<TeamMember[]>(() => {
    if (!regionalData?.data?.items) return [];
    return regionalData.data.items
      .filter((item) => item.scope === "CHAPTER" && EXECUTIVE_ROLE_CODES.includes(item.role.code))
      .map((item) => ({
        id: item.id,
        name: item.user?.name || "Unknown",
        email: item.user?.email,
        role: item.role.label || item.role.code,
        roleCode: item.role.code,
        chapter: item.chapter?.name || "",
        status: item.status,
        avatarColor: "#D85D27",
        avatarInitial: item.user?.avatarInitial || (item.user?.name || "U").charAt(0).toUpperCase(),
      }));
  }, [regionalData]);

  const currentPage = Number(regionalData?.data?.page ?? searchParams.page);
  const pageLimit = Number(regionalData?.data?.limit ?? searchParams.limit);
  const totalItems = Number(regionalData?.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));

  // Build role options from API - only chapter-level executive roles
  const roleOptions = useMemo(() => {
    const options = [{ value: "ALL_ROLES", label: "All Roles" }];
    const allRoles = rolesData?.data?.roles || [];
    allRoles
      .filter((role: { scope: string; code: string }) => role.scope === "CHAPTER" && EXECUTIVE_ROLE_CODES.includes(role.code))
      .forEach((role: { code: string; display_name: string }) => {
        options.push({ value: role.code, label: role.display_name });
      });
    return options;
  }, [rolesData]);

  const roleOptionsForCreate = useMemo(
    () => roleOptions.filter((opt) => opt.value !== "ALL_ROLES"),
    [roleOptions]
  );

  // Member options for the Executive Team modal (value = member email)
  const memberOptions = useMemo(
    () => {
      const base = [{ value: "", label: "Select member" }];
      const items = chapterMembersData?.data?.items || [];
      return [
        ...base,
        ...items.map((m) => ({
          value: m.email,
          label: m.name || m.email,
        })),
      ];
    },
    [chapterMembersData]
  );

  // Modal fields: exactly two dropdowns - Member and Role
  const createModalFields: FormField[] = useMemo(
    () => [
      {
        name: "member",
        label: "Member",
        type: "select" as const,
        options: memberOptions,
        includePlaceholderOption: false,
        required: true,
      },
      {
        name: "roleCode",
        label: "Role",
        type: "select" as const,
        options: roleOptionsForCreate,
        includePlaceholderOption: false,
        required: true,
      },
    ],
    [memberOptions, roleOptionsForCreate]
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

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setSubmitError("");
    setIsEditOpen(true);
  };

  const handleRemove = (member: TeamMember) => {
    setMemberToRemove({ id: member.id, name: member.name });
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (memberToRemove) {
      try {
        await removeRegionalMember(memberToRemove.id).unwrap();
        showToast({
          title: "Success",
          description: "Leadership member removed successfully.",
          kind: "success",
        });
        refetch();
      } catch (err) {
        showToast({
          title: "Remove failed",
          description: extractApiError(err),
          kind: "error",
        });
      }
    }
    setShowConfirmDialog(false);
    setMemberToRemove(null);
  };

  const handleCreateSubmit = async (data: Record<string, string>) => {
    if (!chapterId) return;
    const memberEmail = data.member;
    const allMembers = chapterMembersData?.data?.items || [];
    const selected = allMembers.find((m) => m.email === memberEmail);

    setSubmitError("");

    try {
      await createRegionalMember({
        name: selected?.name,
        email: memberEmail,
        phone: selected?.phone,
        role_code: data.roleCode,
        scope: "CHAPTER",
        social_chapter_id: chapterId,
      }).unwrap();
      showToast({
        title: "Success",
        description: "Leadership member added successfully.",
        kind: "success",
      });
      refetch();
      setIsModalOpen(false);
    } catch (err) {
      const message = extractApiError(err);
      setSubmitError(message);
      return { errors: { form: message } };
    }
  };

  const handleEditSubmit = async (data: Record<string, string>) => {
    if (!editingMember) return;
    setSubmitError("");
    try {
      await updateRegionalMember({
        id: editingMember.id,
        role_code: data.roleCode,
      }).unwrap();
      showToast({
        title: "Success",
        description: "Leadership member updated successfully.",
        kind: "success",
      });
      refetch();
      setIsEditOpen(false);
      setEditingMember(null);
    } catch (err) {
      const message = extractApiError(err);
      setSubmitError(message);
      return { errors: { form: message } };
    }
  };

  const emptyMessage =
    pendingStatus === "BLOCKED"
      ? "No blocked members found."
      : pendingStatus === "ENDED"
      ? "No ended members found."
      : "No active leadership members found.";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
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
          <span></span>
          <span className="text-white">Executive Team</span>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            Failed to load leadership team members. Please try again.
          </div>
        )}

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {submitError}
          </div>
        )}

        {/* Filters Row */}
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

            <button
              onClick={handleSearch}
              disabled={isLoading || isFetching}
              className="h-[46px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isLoading || isFetching ? "Searching..." : "Search"}
            </button>

            <button
              onClick={() => {
                setSubmitError("");
                setIsModalOpen(true);
              }}
              className="h-[46px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap ml-auto"
            >
              Create Leadership Member +
            </button>
          </div>
        </div>

        {/* Create Modal */}
        <CreateModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSubmitError("");
          }}
          title="Create Leadership Member"
          fields={createModalFields}
          onSubmit={handleCreateSubmit}
          submitButtonText={isCreating ? "Creating..." : "Create"}
        />

        {/* Edit Modal */}
        <CreateModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingMember(null);
            setSubmitError("");
          }}
          title="Edit Leadership Member"
          fields={createModalFields}
          onSubmit={handleEditSubmit}
          submitButtonText={isUpdating ? "Updating..." : "Update"}
          initialValues={
            editingMember
              ? {
                  member: editingMember.email || "",
                  roleCode: editingMember.roleCode || "",
                }
              : undefined
          }
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
          cancelText="Cancel"
          isSubmitting={isRemoving}
        />

        {/* Team Members Grid */}
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
                  role={member.role}
                  chapter={member.chapter}
                  avatarColor={member.avatarColor}
                  avatarInitial={member.avatarInitial}
                  onEdit={() => handleEdit(member)}
                  onRemove={() => handleRemove(member)}
                  onClick={() =>
                    chapterId && navigate(`/social/admin/regional-board/chapter/${chapterId}/leadership-team/member/${member.id}`)
                  }
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
              Adjust the filters or click "Create Leadership Member +" to add members.
            </p>
          </div>
        )}

        {/* Processing overlay */}
        {(isCreating || isUpdating || isRemoving) && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-[#1a2332] rounded-lg p-6 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
              <span className="text-white">Processing...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
