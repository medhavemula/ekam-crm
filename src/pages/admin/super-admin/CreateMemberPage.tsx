import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { ArrowLeft } from "lucide-react";
import FormInput from "../../../components/forms/FormInput";
import { useToast } from "../../../components/toast/ToastProvider";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useCreateTeamUserMutation,
  useListTeamRolesQuery,
} from "../../../services/superadmin/adminTeamApi";
import {
  useCreatePTeamUserMutation,
  useListPTeamRolesQuery,
} from "../../../services/ed/edPTeamApi";
import { useRole } from "../../../hooks/useRole";

type MemberFormData = {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  countryId: string;
  regionId: string;
};

function extractApiError(e: unknown): string {
  // RTK Query error shapes: {data:{message}}, {error}, string, etc.
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyE = e as any;
    return (
      anyE?.data?.message ||
      anyE?.error ||
      anyE?.message ||
      "Unable to create member. Please try again."
    );
  }
  return "Unable to create member. Please try again.";
}

export default function CreateMemberPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const edRoles = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const isEd = edRoles.includes(role as any);

  const [formData, setFormData] = useState<MemberFormData>({
    name: "",
    email: "",
    phone: "",
    roleId: "", // Will be set when roles load
    countryId: "",
    regionId: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load Roles (to get roleId ObjectIds)
  const { data: rolesPageSa } =
    useListTeamRolesQuery(isEd ? (skipToken as any) : { page: 1, limit: 100 });
  const { data: rolesPageEd } =
    useListPTeamRolesQuery(isEd ? { page: 1, limit: 100 } : (skipToken as any));

  const rolesPage = isEd ? rolesPageEd : rolesPageSa;

  const roles = rolesPage?.data ?? [];

  // Auto-select first role ID
  const firstRoleId = roles.length > 0 ? roles[0].id : "";

  // Auto-set first role when roles load
  useEffect(() => {
    if (firstRoleId && !formData.roleId) {
      setFormData(prev => ({ ...prev, roleId: firstRoleId }));
    }
  }, [firstRoleId, formData.roleId]);

  const handleChange = (field: keyof MemberFormData, value: string) => {
    setFormData((prev) => {
      // Reset region when country changes
      if (field === "countryId") {
        return { ...prev, countryId: value, regionId: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const [createSaMember, { isLoading: creatingSa }] = useCreateTeamUserMutation();
  const [createEdMember, { isLoading: creatingEd }] = useCreatePTeamUserMutation();
  const creating = isEd ? creatingEd : creatingSa;

  const { showToast } = useToast();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Quick validations to catch accidental labels instead of ids
    const isObjectId = (s?: string) => !!s && /^[0-9a-fA-F]{24}$/.test(s);
    if (!isObjectId(formData.roleId)) {
      setSubmitError("Please select a valid role.");
      return;
    }
    if (formData.countryId && !isObjectId(formData.countryId)) {
      setSubmitError("Please select a valid country.");
      return;
    }
    if (formData.regionId && !isObjectId(formData.regionId)) {
      setSubmitError("Please select a valid region.");
      return;
    }

    // Build body exactly like your franchise example (but using team keys)
    const body = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      roleId: formData.roleId, // 24-char hex from roles API
      countryId: formData.countryId || undefined, // optional
      regionId: formData.regionId || undefined, // optional
    };

    // (Optional) inspect once while testing
    console.log("Team create payload", body);

    try {
      if (isEd) {
        await createEdMember(body).unwrap();
      } else {
        await createSaMember(body).unwrap();
      }

      showToast({
        title: "Success",
        description: "Team member created successfully",
        kind: "success",
      });
      navigate("/admin/team");
    } catch (err) {
      setSubmitError(extractApiError(err));
    }
  };

  const handleCancel = () => navigate("/admin/team");

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
          Create member
        </h1>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormInput
                  label="Name"
                  type="text"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  isRequired
                  required
                />
                <FormInput
                  label="Email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  isRequired
                  required
                />
                <FormInput
                  label="Phone"
                  type="tel"
                  placeholder="Enter phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />

                {/* Role (auto-selected from first role) */}
                <input type="hidden" name="roleId" value={formData.roleId} />

                {/* Error */}
                {submitError && (
                  <div className="rounded-xl bg-[var(--ov-danger-wash)] p-3 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-danger-wash)]">
                    {submitError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 h-11 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
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