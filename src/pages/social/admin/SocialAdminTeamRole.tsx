import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { RegionalTeamMemberCard } from "../../../components/admin";
import { FormSelect } from "../../../components/forms";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import type { FormField } from "../../../components/modals/CreateModal";
import {
  useGetSocialTeamUsersQuery,
  useGetSocialTeamRolesQuery,
  useCreateSocialTeamUserMutation,
  useUpdateSocialTeamUserMutation,
  useRemoveSocialTeamUserMutation,
} from "../../../services/social/socialAdminDashboardApi";

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  roleId?: string;
  avatarColor: string;
  avatarInitial: string;
}

export default function SocialAdminTeamRole() {
  const navigate = useNavigate();
  const [selectedName, setSelectedName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [searchParams, setSearchParams] = useState<{ name?: string; roleId?: string }>({});

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // API queries
  const { data: usersData, isLoading, refetch } = useGetSocialTeamUsersQuery({
    name: searchParams.name,
    roleId: searchParams.roleId,
    limit: 50,
  });
  const { data: rolesData } = useGetSocialTeamRolesQuery({ limit: 100 });

  const defaultRoleId = rolesData?.data?.items?.[0]?.id || "";

  // Mutations
  const [createTeamUser, { isLoading: isCreating }] = useCreateSocialTeamUserMutation();
  const [updateTeamUser, { isLoading: isUpdating }] = useUpdateSocialTeamUserMutation();
  const [removeTeamUser, { isLoading: isRemoving }] = useRemoveSocialTeamUserMutation();

  // Transform API data
  const teamMembers = useMemo(() => {
    if (!usersData?.data?.items) return [];
    return usersData.data.items.map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      phone: user.phone,
      role: user.role || "Member",
      roleId: user.roleId,
      avatarColor: "#D85D27",
      avatarInitial: (user.name || "U").charAt(0).toUpperCase(),
    }));
  }, [usersData]);

  // Build role options from API
  const roleOptions = useMemo(() => {
    const options = [{ value: "", label: "Select Role" }];
    if (rolesData?.data?.items) {
      rolesData.data.items.forEach((role) => {
        options.push({ value: role.id, label: role.name });
      });
    }
    return options;
  }, [rolesData]);


  const nameOptions = useMemo(() => {
    const options = [{ value: "", label: "Select Name" }];

    if (usersData?.data?.items) {
      usersData.data.items.forEach((user) => {
        if (user.name) {
          options.push({
            value: user.name,
            label: user.name,
          });
        }
      });
    }

    return options;
  }, [usersData]);


  // Modal fields for creating/editing team member (UI only for now)
  const createModalFields: FormField[] = useMemo(
    () => [
      {
        name: "name",
        label: "Name",
        type: "text" as const,
        required: true,
      },
      {
        name: "email",
        label: "Email",
        type: "text" as const,
        required: true,
      },
      {
        name: "phone",
        label: "Phone",
        type: "number" as const,
        required: true,
        placeholder: "Enter phone number",
      },
    ],
    []
  );

  const handleSearch = () => {
    setSearchParams({
      name: selectedName || undefined,
      roleId: selectedRole || undefined,
    });
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setIsEditOpen(true);
  };

  const handleRemove = (member: TeamMember) => {
    setMemberToRemove({ id: member.id, name: member.name });
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (memberToRemove) {
      try {
        await removeTeamUser(memberToRemove.id).unwrap();
        refetch();
      } catch (error) {
        console.error("Failed to remove team member:", error);
      }
    }
    setShowConfirmDialog(false);
    setMemberToRemove(null);
  };

  const handleCreateSubmit = async (data: Record<string, string>) => {
    try {
      await createTeamUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        roleId: defaultRoleId,
      }).unwrap();

      refetch();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to create team member:", error);
      return { errors: { form: "Failed to create member" } };
    }
  };

  const handleEditSubmit = async (data: Record<string, string>) => {
    if (editingMember) {
      try {
        await updateTeamUser({
          id: editingMember.id,
          roleId: data.roleId,
        }).unwrap();
        refetch();
      } catch (error) {
        console.error("Failed to update team member:", error);
      }
    }
    setIsEditOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <h1 className="text-xl font-semibold text-white mb-6">Team & Role</h1>

        {/* Filters Row */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div className="w-full sm:w-auto lg:w-[200px]">
            <FormSelect
              label="Name"
              options={nameOptions}
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto lg:w-[200px]">
            <FormSelect
              label="Role"
              options={roleOptions}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-[46px] px-8 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
          >
            Search
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/social/admin/manage-roles")}
            className="h-[46px] px-6 rounded-md border border-white/30 text-white font-medium transition-colors hover:bg-white/10 whitespace-nowrap"
          >
            Manage Roles
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-[46px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap"
          >
            Create Member +
          </button>
        </div>

        {/* Create Modal */}
        <CreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Member"
          fields={createModalFields}
          onSubmit={handleCreateSubmit}
          submitButtonText="Create"
        />

        {/* Edit Modal */}
        <CreateModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingMember(null);
          }}
          title="Edit Member"
          fields={createModalFields}
          onSubmit={handleEditSubmit}
          submitButtonText="Update"
          initialValues={
            editingMember
              ? {
                name: editingMember.name,
                email: editingMember.email || "",
                phone: editingMember.phone || "",
                roleId: editingMember.roleId || "",
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
        />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Team Members Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <RegionalTeamMemberCard
                  key={member.id}
                  name={member.name}
                  role={member.role}
                  avatarColor={member.avatarColor}
                  avatarInitial={member.avatarInitial}
                  onEdit={() => handleEdit(member)}
                  onRemove={() => handleRemove(member)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="text-lg mb-2">No team members found</p>
                <p className="text-sm">Click "Create Member +" to add team members.</p>
              </div>
            )}
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