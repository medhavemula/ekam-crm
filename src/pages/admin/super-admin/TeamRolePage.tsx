// src/pages/admin/team/TeamRolePage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Users, Pencil, UserMinus } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import FormSelect from "../../../components/forms/FormSelect";
import { 
  useListTeamUsersQuery,
  useListTeamRolesQuery,
  useUpdateTeamUserMutation,
  useDeleteTeamUserMutation,
  type TeamUser as SaTeamUser,
} from "../../../services/superadmin/adminTeamApi";
import {
  useListPTeamUsersQuery,
  useListPTeamRolesQuery,
  useUpdatePTeamUserMutation,
  useDeletePTeamUserMutation,
  type TeamUser as EdTeamUser,
} from "../../../services/ed/edPTeamApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { useRole } from "../../../hooks/useRole";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";

export const TeamRolePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, closeToast } = useToast();
  const { role } = useRole();
  const reduceMotion = useReducedMotion();
  const edRoles = ["EXECUTIVE_DIRECTOR", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const saRoles = ["SUPER_ADMIN", "SUPER_ADMIN_TEAM"] as const;
  const isEd = edRoles.includes(role as any);
  const isSa = saRoles.includes(role as any);

  const [selectedName, setSelectedName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [userToRemove, setUserToRemove] = useState<{id: string, name: string} | null>(null);
  const [appliedName, setAppliedName] = useState("");
  const [appliedRoleId, setAppliedRoleId] = useState("");

  const [page, setPage] = useState(1);
  const limit = 24;

  // Prepare both stacks; select by role using skipToken
  const [updateSaUser] = useUpdateTeamUserMutation();
  const [deleteSaUser] = useDeleteTeamUserMutation();
  const [updateEdUser] = useUpdatePTeamUserMutation();
  const [deleteEdUser] = useDeletePTeamUserMutation();

  const {
    data: rolesPageSa,
    isFetching: rolesLoadingSa,
    isError: rolesErrorSa,
  } = useListTeamRolesQuery(
    { page: 1, limit: 100 },
    { skip: !isSa }
  );
  
  const {
    data: rolesPageEd,
    isFetching: rolesLoadingEd,
    isError: rolesErrorEd,
  } = useListPTeamRolesQuery(
    { page: 1, limit: 100 },
    { skip: !isEd }
  );

  const rolesPage = isEd ? rolesPageEd : rolesPageSa;
  const rolesLoading = isEd ? rolesLoadingEd : rolesLoadingSa;
  const rolesError = isEd ? rolesErrorEd : rolesErrorSa;

  const { data: usersPageSa, isFetching: isFetchingSa, isError: isErrorSa, refetch: refetchSa } = useListTeamUsersQuery(
    { page, limit },
    { skip: !isSa }
  );
  
  const { data: usersPageEd, isFetching: isFetchingEd, isError: isErrorEd, refetch: refetchEd } = useListPTeamUsersQuery(
    { page, limit },
    { skip: !isEd }
  );

  const isFetching = isEd ? isFetchingEd : isFetchingSa;
  const isError = isEd ? isErrorEd : isErrorSa;
  const users = (isEd ? usersPageEd : usersPageSa)?.data ?? [];

  const nameOptions = useMemo(() => {
    const names = Array.from(new Set(users.map(u => u.name).filter((name): name is string => Boolean(name))));
    return [
      { value: "", label: "Select Name" as const },
      ...names.map(n => ({ value: n, label: n }))
    ];
  }, [users]);

  const roleOptions = useMemo(() => {
    const roles = rolesPage?.data ?? [];
    const hasNoRoles = !rolesLoading && roles.length === 0;
    
    return [
      { value: "", label: rolesLoading ? "Loading roles..." : "Select Role" },
      ...(hasNoRoles ? [{ value: "create_roles", label: "Create Roles" }] : []),
      ...roles.map(r => ({ value: r.id, label: r.name }))
    ];
  }, [rolesPage, rolesLoading]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Check name filter
      const nameMatch = !appliedName || user.name === appliedName;
      
      // Check role filter
      const roleMatch = !appliedRoleId || 
        (user.role?.id === appliedRoleId) || 
        (user.role?.name && rolesPage?.data?.some(r => 
          r.id === appliedRoleId && 
          user.role && 
          r.name === user.role.name
        ));
      
      return nameMatch && roleMatch;
    });
  }, [users, appliedName, appliedRoleId, rolesPage?.data]);

  const handleCreateMember = () => {
    navigate("/admin/team/create");
  };
  
  const handleManageRoles = () => {
    navigate("/admin/team/roles");
  };
  const handleEdit = (u: SaTeamUser | EdTeamUser) => {
    try {
      sessionStorage.setItem(`ekam_edit_user_${u.id}`, JSON.stringify(u));
    } catch (error) {
      console.error("Failed to save user data to session:", error);
      showToast({
        title: "Warning",
        description: "Could not save user data for editing. Some information may need to be re-entered.",
        kind: "info", // Changed from 'warning' to 'info' to match available ToastKind
      });
    }
    navigate(`/admin/team/edit/${u.id}`, { state: { user: u } });
  };
  const handleRemove = async (id: string, name: string) => {
    setUserToRemove({ id, name });
  };

  const confirmRemove = async () => {
    if (!userToRemove) return;
    
    const { id, name } = userToRemove;
    // Show loading state
    const toastId = showToast({
      title: "Processing...",
      description: `Deactivating team member ${name}`,
      kind: "info",
    });
    
    try {
      // Prefer hard delete when supported
      try {
        if (isEd) {
          await deleteEdUser(id).unwrap();
        } else {
          await deleteSaUser(id).unwrap();
        }
      } catch (_delErr) {
        // Fallback to soft-deactivate (backend accepts ACTIVE | BLOCKED)
        if (isEd) {
          await updateEdUser({ id, body: { status: "BLOCKED" } }).unwrap();
        } else {
          await updateSaUser({ id, body: { status: "BLOCKED" } }).unwrap();
        }
      }
      
      // Close the loading toast
      if (toastId) {
        closeToast(toastId);
      }
      
      // Show success message
      showToast({
        title: "Success",
        description: `Team member ${name} has been removed.`,
        kind: "success",
        durationMs: 5000,
      });
      
      // Refresh the data
      if (isEd) {
        refetchEd && refetchEd();
      } else {
        refetchSa && refetchSa();
      }
      
      // Reset the user to remove
      setUserToRemove(null);
      
    } catch (error: any) {
      console.error("Error deactivating team member:", error);
      // Close the loading toast if it exists
      if (toastId) {
        closeToast(toastId);
      }
      
      showToast({
        title: "Error",
        description: `Failed to deactivate team member: ${error?.data?.message || error?.message || 'Please try again'}`,
        kind: "error",
        durationMs: 7000, // Show error for longer
      });
    }
  };

  const renderCard = (u: SaTeamUser | EdTeamUser, index: number) => {
    const name = u.name || "";
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    const roleLabel = u.role?.name || "—";

    return (
      <motion.article
        key={u.id}
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: Math.min(index, 11) * 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full flex-col rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:ring-[color:var(--ov-line-strong)]"
      >
        <div className="flex items-start gap-3 p-5">
          <span
            aria-hidden="true"
            className="ekam-figure grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[16px] font-bold text-[var(--ov-on-ember)]"
            style={{ backgroundColor: "var(--ov-ember-fill)" }}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]" title={name}>
              {name || "—"}
            </h3>
            <p className="mt-1 truncate text-[12.5px] text-[var(--ov-ink-3)]" title={roleLabel}>
              {roleLabel}
            </p>
            {u.email && (
              <p className="mt-0.5 truncate text-[12px] text-[var(--ov-ink-4)]" title={u.email}>
                {u.email}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
          <button
            type="button"
            onClick={() => handleEdit(u)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleRemove(u.id, u.name || "this user")}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[var(--ov-ink-4)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      </motion.article>
    );
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <ConfirmationDialog
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={confirmRemove}
        actionType="remove"
        // The dialog asked "are you sure?" without naming who.
        title={`Remove ${userToRemove?.name || "this member"}?`}
        confirmText="Remove"
        cancelText="Cancel"
      />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <Users className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Network Administration
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Team &amp; Role
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isFetching && !isError && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                    {filteredUsers.length}
                  </span>{" "}
                  {filteredUsers.length === 1 ? "member" : "members"}
                  {" · "}
                </>
              )}
              People who administer this network
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="w-full sm:w-44">
              <FormSelect
                label="Name"
                hideLabel
                value={selectedName}
                onChange={(e) => {
                  // A select is a discrete choice, so it applies on change
                  // rather than waiting for a Search button.
                  setSelectedName(e.target.value);
                  setAppliedName(e.target.value);
                  setPage(1);
                }}
                options={nameOptions}
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-44">
              <FormSelect
                label="Role"
                hideLabel
                value={selectedRoleId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "create_roles") {
                    handleManageRoles();
                    return;
                  }
                  setSelectedRoleId(value);
                  setAppliedRoleId(value);
                  setPage(1);
                }}
                options={roleOptions}
                disabled={rolesLoading || !!rolesError}
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateMember}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create member
            </button>
          </div>
        </motion.div>

        {rolesError && (
          <div className="mb-4 rounded-2xl bg-[var(--ov-ember-wash)] p-4 text-[13px] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-edge)]">
            Roles didn&apos;t load, so the role filter is unavailable. Members are still listed.
          </div>
        )}

        {isError ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load team members. Check your connection and try again.
          </div>
        ) : isFetching && users.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="h-[168px] animate-pulse rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line-faint)]"
              />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <Users className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {appliedName || appliedRoleId ? "Nothing matches those filters" : "No team members yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {appliedName || appliedRoleId
                ? "Try a different name or role."
                : "Members you create appear here."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredUsers.map(renderCard)}
          </div>
        )}
    </main>
    </div>
  );
};

export default TeamRolePage;

