import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { ArrowLeft } from "lucide-react";
import FormInput from "../../../components/forms/FormInput";
import { useToast } from "../../../components/toast/ToastProvider";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useListTeamRolesQuery,
  useUpdateTeamUserMutation,
} from "../../../services/superadmin/adminTeamApi";
import {
  useListPTeamRolesQuery,
  useUpdatePTeamUserMutation,
} from "../../../services/ed/edPTeamApi";
import type { TeamUser as SaTeamUser } from "../../../services/superadmin/adminTeamApi";
import type { TeamUser as EdTeamUser } from "../../../services/ed/edPTeamApi";
import { useRole } from "../../../hooks/useRole";

const isObjectId = (s?: string) => !!s && /^[0-9a-fA-F]{24}$/.test(s);
const stripEmpty = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export default function EditMemberPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const { role } = useRole();
  const edRoles = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const isEd = edRoles.includes(role as any);

  // Get user from navigation state or session cache
  const passedUser = (location.state as any)?.user as (SaTeamUser | EdTeamUser) | undefined;
  const initialUser: (SaTeamUser | EdTeamUser) | undefined = useMemo(() => {
    if (passedUser) return passedUser;
    try {
      const raw = sessionStorage.getItem(`ekam_edit_user_${id}`);
      if (raw) return JSON.parse(raw) as SaTeamUser | EdTeamUser;
    } catch { }
    return undefined;
  }, [id, passedUser]);

  // Dropdown data
  const { data: rolesPageSa } =
    useListTeamRolesQuery(isEd ? (skipToken as any) : { page: 1, limit: 100 });
  const { data: rolesPageEd } =
    useListPTeamRolesQuery(isEd ? { page: 1, limit: 100 } : (skipToken as any));

  const rolesPage = isEd ? rolesPageEd : rolesPageSa;

  const roles = rolesPage?.data ?? [];

  // Auto-select first role ID
  const firstRoleId = roles.length > 0 ? roles[0].id : "";

  // Form state (prefill if we have initialUser)
  const [name, setName] = useState(initialUser?.name ?? "");
  const [email] = useState(initialUser?.email ?? ""); // display only
  const [phone, setPhone] = useState(initialUser?.phone ?? "");
  const [roleId, setRoleId] = useState(initialUser?.role?.id ?? "");
  
  // Auto-set first role when roles load and no initial role
  useEffect(() => {
    if (firstRoleId && !roleId && !initialUser?.role?.id) {
      setRoleId(firstRoleId);
    }
  }, [firstRoleId, roleId, initialUser]);
  // const [status, setStatus] = useState((initialUser?.status as string) ?? "ACTIVE");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If initial user has role name but missing id, auto-map to id when roles load
  useEffect(() => {
    if (!roleId && initialUser?.role?.name && roles.length > 0) {
      const match = (roles as any[]).find((r) => String(r.name).trim() === String(initialUser.role?.name).trim());
      if (match?.id) setRoleId(String(match.id));
    }
  }, [roles, roleId, initialUser]);

  const [updateSaUser, { isLoading: isUpdatingSa }] = useUpdateTeamUserMutation();
  const [updateEdUser, { isLoading: isUpdatingEd }] = useUpdatePTeamUserMutation();
  const isUpdating = isEd ? isUpdatingEd : isUpdatingSa;

  const { showToast } = useToast();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!id) return setSubmitError("Missing user id.");
    if (!name.trim()) return setSubmitError("Name is required.");
    if (roleId && !isObjectId(roleId)) return setSubmitError("Please select a valid role.");

    const body = stripEmpty({
      name: name.trim(),
      phone: phone.trim(),
      roleId: roleId || undefined,
    });

    try {
      if (isEd) {
        await updateEdUser({ id, body }).unwrap();
      } else {
        await updateSaUser({ id, body }).unwrap();
      }
      showToast({
        title: "Success",
        description: "Team member updated successfully",
        kind: "success",
      });
      navigate("/admin/team");
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.error || err?.message || "Failed to update member.";
      console.error("Failed to update user:", err);
      setSubmitError(errorMessage);
      showToast({
        title: "Error updating team member",
        description: errorMessage,
        kind: "error",
      });
    }
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/team")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Team & Role
        </button>

        <h1 className="ekam-figure mb-5 text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
          Edit member
        </h1>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] md:p-8">
              {!initialUser && (
                <div className="mb-4 rounded-md border border-yellow-600 bg-yellow-900/30 p-3 text-yellow-100 text-sm">
                  Member details weren’t preloaded. If fields are empty, go back and click <b>Edit</b> from the Team list.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput
                  label="Name"
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  isRequired
                  required
                />

                <FormInput
                  label="Email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  disabled
                />

                <FormInput
                  label="Phone"
                  type="tel"
                  placeholder="Enter phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                {/* Role (auto-selected from first role) */}
                <input type="hidden" name="roleId" value={roleId} />

                {submitError && (
                  <div className="rounded-xl bg-[var(--ov-danger-wash)] p-3 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-danger-wash)]">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/team")}
                    className="flex-1 h-11 rounded-xl px-6 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
        </div>
      </main>
    </div>
  );
}