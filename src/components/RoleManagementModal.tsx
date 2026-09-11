import { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { useUserRolesQuery, useUpdatePrimaryRoleMutation } from "../services/userRolesApi";
import type { Role } from "../config/roles";
import { canSwitchToPrimaryRole, ROLE_LABELS } from "../config/roles";
import { useToast } from "./toast/ToastProvider";

type RoleManagementModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function RoleManagementModal({ open, onClose }: RoleManagementModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { data: userRolesData, isLoading, error } = useUserRolesQuery();
  const [updatePrimaryRole, { isLoading: isUpdating }] = useUpdatePrimaryRoleMutation();
  const { showToast } = useToast();

  const userRoles = Array.isArray(userRolesData?.data?.assignments) ? userRolesData.data.assignments : [];
  const currentPrimaryRole = userRolesData?.data?.primaryRole?.role || null;

  // Set default selected role when data loads or modal opens
  useEffect(() => {
    if (currentPrimaryRole && !selectedRole) {
      setSelectedRole(currentPrimaryRole);
    }
  }, [currentPrimaryRole, selectedRole]);

  // Get only roles that are actually allowed by the primary-role switch flow.
  const availableRoles = Array.from(
    new Set(
      userRoles
        .map((userRole) => userRole.role)
        .filter((role) => canSwitchToPrimaryRole(role))
    )
  );

  const handleUpdateRole = async () => {
    if (!selectedRole || selectedRole === currentPrimaryRole) return;

    try {
      await updatePrimaryRole({ role: selectedRole }).unwrap();
      showToast({
        title: "Primary role updated",
        description: `${ROLE_LABELS[selectedRole]} is now your active role.`,
        kind: "success",
      });
      onClose();
    } catch (error) {
      console.error("Failed to update primary role:", error);
      const message =
        (error as any)?.data?.message ||
        "This role cannot be set as the primary role right now.";
      showToast({
        title: "Unable to switch role",
        description: String(message),
        kind: "error",
      });
    }
  };

  const handleClose = () => {
    setSelectedRole(null);
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose}
      title="Switch Roles"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isUpdating} className="bg-gray-500 hover:bg-gray-600 text-white">
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handleUpdateRole}
            disabled={!selectedRole || selectedRole === currentPrimaryRole || isUpdating}
            loading={isUpdating}
            style={{ backgroundColor: '#D85D27', borderColor: '#D85D27' }}
            className="hover:opacity-90 text-white"
          >
            Update Primary Role
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="text-center py-4">Loading roles...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">
          Failed to load user roles. Please try again.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Primary Role</h3>
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-white font-medium">
                {currentPrimaryRole ? ROLE_LABELS[currentPrimaryRole] : "No primary role set"}
              </span>
              {currentPrimaryRole && (
                <span className="ml-2 text-xs text-[#D85D27] font-medium">Primary</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Select New Primary Role</h3>
            {availableRoles.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableRoles.map((role) => (
                  <label
                    key={role}
                    className="flex items-center p-3 bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="mr-3 w-4 h-4 appearance-none border-2 border-gray-600 rounded-full checked:border-[#D85D27] checked:bg-[#D85D27] focus:outline-none focus:ring-2 focus:ring-[#D85D27] relative"
                      style={{
                        background: selectedRole === role
                          ? "radial-gradient(circle, #D85D27 40%, transparent 40%)"
                          : "transparent",
                        backgroundColor: selectedRole === role ? "#D85D27" : "transparent",
                      }}
                    />
                    <span className="text-white flex-1">{ROLE_LABELS[role]}</span>
                    {role === currentPrimaryRole && (
                      <span className="text-xs text-[#D85D27] font-medium">Current</span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300">
                No switchable roles are available for this account.
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Note: Super Admin, Super Admin Team, Executive Director, and ED Team roles cannot be switched here.
          </div>
        </div>
      )}
    </Modal>
  );
}
