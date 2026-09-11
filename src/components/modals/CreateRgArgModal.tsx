import React, { useMemo, useState } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import { useToast } from "../toast/ToastProvider";
import {
  useCreateSocialRegionalTeamMemberMutation,
  useSearchSocialRegionalTeamUsersQuery,
  useGetSocialRegionalTeamRolesQuery,
} from "../../services/social/regionalTeamApi";
import { useGetSocialRegionalBoardQuery } from "../../services/social/regionalBoardApi";
import type { SocialRegionalTeamRole } from "../../services/social/types";

type CreationMode = "new" | "existing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_REGION_ROLES: SocialRegionalTeamRole[] = [
  { code: "REGIONAL_GOVERNOR", scope: "REGION", display_name: "Regional Governor" },
  { code: "ASSISTANT_REGIONAL_GOVERNOR", scope: "CHAPTER", display_name: "Assistant Regional Governor" },
];

const MULTI_CHAPTER_CODES = new Set(["ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR", "CHAPTER_GOVERNOR"]);

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

export default function CreateRgArgModal({ isOpen, onClose, onSuccess }: Props) {
  const { showToast } = useToast();

  const [mode, setMode] = useState<CreationMode>("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const { data: rolesRes } = useGetSocialRegionalTeamRolesQuery();
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ page: 1, limit: 100 });
  const { data: usersRes, isFetching: isFetchingUsers } = useSearchSocialRegionalTeamUsersQuery(
    { q: memberSearch || undefined, page: 1, limit: 50 },
    { skip: !isOpen || mode !== "existing" },
  );

  const [createMember, { isLoading: isCreating }] = useCreateSocialRegionalTeamMemberMutation();

  const roleCatalog = useMemo(
    () => (rolesRes?.data?.roles?.length ? rolesRes.data.roles : DEFAULT_REGION_ROLES),
    [rolesRes],
  );

  const roleOptions = useMemo(() => {
    const allowed = new Set(["REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR"]);
    return [
      { value: "", label: "Select role" },
      ...roleCatalog
        .filter((r) => allowed.has(r.code))
        .map((r) => ({ value: r.code, label: r.display_name })),
    ];
  }, [roleCatalog]);

  const chapterOptions = useMemo(
    () =>
      (((chaptersRes as any)?.data?.items ?? []) as Array<{ id: string; name: string }>).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [chaptersRes],
  );

  const memberOptions = useMemo(() => {
    if (isFetchingUsers) return [{ value: "", label: "Loading..." }];
    const items = ((usersRes as any)?.data?.items ?? []) as any[];
    if (!items.length) return [{ value: "", label: "No users found" }];
    return items
      .map((u: any) => {
        const scopeLabel = u?.chapter?.name || u?.region?.name || u?.email || "";
        return {
          value: String(u?.id || ""),
          label: scopeLabel ? `${u.name} (${scopeLabel})` : u.name,
        };
      })
      .filter((o) => o.value);
  }, [usersRes, isFetchingUsers]);

  const selectedRole = roleCatalog.find((r) => r.code === roleCode);
  const isARG = roleCode === "ASSISTANT_REGIONAL_GOVERNOR";
  const needsChapters = isARG || MULTI_CHAPTER_CODES.has(roleCode);

  const resetForm = () => {
    setMode("new");
    setName("");
    setEmail("");
    setPhone("");
    setRoleCode("");
    setSelectedChapters([]);
    setArea("");
    setMemberSearch("");
    setSelectedUserId("");
    setErrors({});
    setSubmitError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (mode === "new") {
      if (!name.trim()) errs.name = "Name is required.";
      if (!email.trim()) errs.email = "Email is required.";
      if (!phone.trim()) errs.phone = "Phone is required.";
    } else {
      if (!selectedUserId) errs.user_id = "Please select a member.";
    }
    if (!roleCode) errs.role_code = "Role is required.";
    if (needsChapters && selectedChapters.length === 0) {
      errs.chapters = "Please select at least one chapter.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    const scope = selectedRole?.scope ?? (isARG ? "CHAPTER" : "REGION");

    try {
      await createMember({
        ...(mode === "new"
          ? { name: name.trim(), email: email.trim(), phone: phone.trim() }
          : { user_id: selectedUserId }),
        role_code: roleCode,
        scope,
        ...(needsChapters && selectedChapters.length > 0
          ? { social_chapter_id: selectedChapters[0], social_chapter_ids: selectedChapters }
          : {}),
        area: area.trim() || undefined,
      }).unwrap();

      showToast({
        title: "Success",
        description: "Regional governor role added successfully.",
        kind: "success",
      });

      handleClose();
      onSuccess?.();
    } catch (error) {
      setSubmitError(extractApiError(error));
    }
  };

  const toggleChapter = (id: string) => {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <GradientContainer className="max-w-2xl w-full mx-auto max-h-[95vh] overflow-visible flex flex-col">
          <div className="rounded-2xl flex flex-col max-h-[95vh] overflow-visible">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-semibold text-white">Create RG &amp; ARG</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-[#D85D27] hover:text-[#D85D27] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form body */}
            <div className="p-6 overflow-visible flex-1">
              {submitError && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {submitError}
                </div>
              )}

              <form id="create-rg-arg-form" onSubmit={handleSubmit}>
                <div className="space-y-6 max-w-[420px] mx-auto">

                  {/* Mode Toggle */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Create Type</label>
                    <div className="flex rounded-md overflow-hidden border border-gray-600">
                      <button
                        type="button"
                        onClick={() => { setMode("new"); setSelectedUserId(""); }}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          mode === "new"
                            ? "bg-[#D85D27] text-white"
                            : "bg-[#232B3B] text-gray-400 hover:text-white"
                        }`}
                      >
                        Create New Person
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMode("existing"); setName(""); setEmail(""); setPhone(""); }}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          mode === "existing"
                            ? "bg-[#D85D27] text-white"
                            : "bg-[#232B3B] text-gray-400 hover:text-white"
                        }`}
                      >
                        Select Existing Member
                      </button>
                    </div>
                  </div>

                  {/* New Person Fields */}
                  {mode === "new" && (
                    <>
                      <FormInput
                        label="Name"
                        type="text"
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        isRequired
                        error={errors.name}
                      />
                      <FormInput
                        label="Email"
                        type="email"
                        placeholder="Enter email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        isRequired
                        error={errors.email}
                      />
                      <FormInput
                        label="Phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        isRequired
                        error={errors.phone}
                      />
                    </>
                  )}

                  {/* Existing Member Select */}
                  {mode === "existing" && (
                    <FormSelect
                      label="Member"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      options={memberOptions}
                      placeholder="Select member"
                      isRequired
                      searchable
                      searchPlaceholder="Search members..."
                      onSearchChange={setMemberSearch}
                      disableClientSideFilter
                      menuMaxHeightClass="max-h-64"
                      error={errors.user_id}
                    />
                  )}

                  {/* Role */}
                  <FormSelect
                    label="Role"
                    value={roleCode}
                    onChange={(e) => { setRoleCode(e.target.value); setSelectedChapters([]); }}
                    options={roleOptions}
                    isRequired
                    error={errors.role_code}
                  />

                  {/* Chapters — for ARG */}
                  {needsChapters && (
                    <FormSelect
                      label="Chapters"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedChapters.includes(val)) toggleChapter(val);
                      }}
                      options={chapterOptions.filter((o) => !selectedChapters.includes(o.value))}
                      placeholder="Select chapter to add"
                      isRequired
                      searchable
                      searchPlaceholder="Search chapters..."
                      menuMaxHeightClass="max-h-36"
                      error={errors.chapters}
                      topAdornment={
                        selectedChapters.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {selectedChapters.map((id) => {
                              const chapter = chapterOptions.find((o) => o.value === id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#2a2f36] text-white border border-gray-700"
                                >
                                  {chapter?.label || id}
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-white ml-1"
                                    onClick={() => toggleChapter(id)}
                                    aria-label="Remove chapter"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : undefined
                      }
                    />
                  )}

                  {/* Area */}
                  <FormInput
                    label="Area"
                    type="text"
                    placeholder="Enter area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6 max-w-[420px] mx-auto w-full">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={`flex-1 h-10 px-4 rounded-md bg-[#D85D27] text-white text-sm font-medium transition-colors ${
                      isCreating ? "opacity-70 cursor-not-allowed" : "hover:bg-orange-500"
                    }`}
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-10 px-4 rounded-md bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

          </div>
        </GradientContainer>
      </div>
    </>
  );
}
