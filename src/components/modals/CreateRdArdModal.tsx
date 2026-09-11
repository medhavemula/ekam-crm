import React, { useMemo, useState } from "react";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import { toStartOfDayISO } from "../../utils/date";
import { useCreateEDTeamMutation } from "../../services/superadmin/adminTeamApi";
import { useGetEdUsersQuery } from "../../services/ed";
import { useGetEdChaptersQuery } from "../../services/ed";
import { useUsersMeQuery } from "../../services/authApi";
import { useToast } from "../toast/ToastProvider";

type CreationMode = "new" | "existing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: string;
}

const ALL_ROLE_OPTIONS = [
  { value: "", label: "Select role" },
  { value: "REGIONAL_DIRECTOR", label: "Regional Director" },
  { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" },
];

const ARD_ONLY_OPTIONS = [
  { value: "", label: "Select role" },
  { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" },
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

export default function CreateRdArdModal({ isOpen, onClose, onSuccess, userRole }: Props) {
  const isRD = userRole === "REGIONAL_DIRECTOR";
  const roleOptions = isRD ? ARD_ONLY_OPTIONS : ALL_ROLE_OPTIONS;

  const { showToast } = useToast();

  const [mode, setMode] = useState<CreationMode>("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const { data: currentUser } = useUsersMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const userScope = currentUser?.data?.assignments?.[0]?.scope;

  const { data: chaptersRes } = useGetEdChaptersQuery({ page: 1, limit: 50 });
  const { data: edUsersRes, isFetching: isFetchingUsers } = useGetEdUsersQuery(
    { page: 1, limit: 30, q: memberSearch || undefined },
    { skip: !isOpen || mode !== "existing" },
  );

  const [createEDTeam, { isLoading: isCreating }] = useCreateEDTeamMutation();

  const chapterOptions = useMemo(() => {
    const items = (((chaptersRes as any)?.data?.items ?? []) as any[]);
    return items.map((c: any) => ({ value: String(c.id), label: c.name }));
  }, [chaptersRes]);

  const memberOptions = useMemo(() => {
    if (isFetchingUsers) return [{ value: "", label: "Loading..." }];
    const items = ((edUsersRes as any)?.data?.items ?? []) as any[];
    if (!items.length) return [{ value: "", label: "No users found" }];
    return items
      .map((u: any) => {
        const uName = u?.name || u?.userName || u?.fullName || u?.email || String(u?.id || "Member");
        const chapter = u?.chapter?.name || u?.chapterName || "";
        return {
          value: String(u?.id || u?.userId || ""),
          label: chapter ? `${uName} (${chapter})` : uName,
        };
      })
      .filter((o) => o.value);
  }, [edUsersRes, isFetchingUsers]);

  const isARD = role === "ASSISTANT_REGIONAL_DIRECTOR";

  const resetForm = () => {
    setMode("new");
    setName("");
    setEmail("");
    setPhone("");
    setRole("");
    setSelectedChapters([]);
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
    if (!role) errs.role = "Role is required.";
    if (isARD && selectedChapters.length === 0) {
      errs.chapters = "Please select at least one chapter for ARD.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    if (!userScope?.country || !userScope?.region) {
      showToast({
        title: "Error",
        description: "Unable to determine your assigned country/region. Please contact support.",
        kind: "error",
      });
      return;
    }

    const scope = isARD ? "CHAPTER" : "REGION";

    try {
      const body: Record<string, any> = {
        role_code: role,
        scope,
        country_id: userScope.country,
        region_id: userScope.region,
        is_primary: true,
        start_date: toStartOfDayISO(new Date().toISOString().split("T")[0]),
        sendInvite: true,
      };

      if (mode === "new") {
        body.name = name.trim();
        body.email = email.trim();
        body.phone = phone.trim();
      } else {
        body.user_id = selectedUserId;
      }

      if (isARD) {
        body.chapter_id = selectedChapters[0];
        body.chapter_ids = selectedChapters;
      }

      await createEDTeam(body as any).unwrap();

      showToast({
        title: "Success",
        description: "Regional team member created successfully.",
        kind: "success",
      });

      handleClose();
      onSuccess?.();
    } catch (error) {
      const msg = extractApiError(error);
      setSubmitError(msg);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId],
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-rd-ard-title"
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-visible rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line)]"
        >
          {/* Header. The title used to be text-white on this panel, so on a
              light theme the whole band read as empty space with a lone × in
              it — the dialog never said what it was for. */}
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--ov-line-faint)] px-5 py-4">
            <div className="min-w-0">
              <h2
                id="create-rd-ard-title"
                className="text-[17px] font-semibold leading-tight text-[var(--ov-ink)]"
              >
                {isRD ? "Create an ARD" : "Create an RD or ARD"}
              </h2>
              <p className="mt-1 text-[12.5px] leading-5 text-[var(--ov-ink-4)]">
                Add a director to your region — a new person, or someone already on the platform.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto overflow-x-visible px-5 py-5">
            {submitError && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-[var(--ov-danger-wash)] px-3.5 py-3">
                <span className="mt-0.5 text-[var(--ov-danger)]" aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-[13px] leading-5 text-[var(--ov-danger)]">{submitError}</p>
              </div>
            )}

            <form id="create-rd-ard-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Which kind of person this is — the app's segmented control,
                  not two filled slabs where the unselected half was a dark
                  navy block left over from the old chrome. */}
              <div>
                <span className="mb-1.5 block text-xs text-[var(--field-label)]">Create type</span>
                <div
                  role="group"
                  className="inline-flex w-full gap-0.5 rounded-xl bg-[var(--ov-trough)] p-1 ring-1 ring-[color:var(--ov-line-faint)]"
                >
                  {([
                    { id: "new" as const, label: "New person" },
                    { id: "existing" as const, label: "Existing member" },
                  ]).map((option) => {
                    const isActive = mode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          if (option.id === "new") {
                            setMode("new");
                            setSelectedUserId("");
                          } else {
                            setMode("existing");
                            setName("");
                            setEmail("");
                            setPhone("");
                          }
                        }}
                        className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                          isActive
                            ? "bg-[var(--ov-select-fill)] text-[var(--ov-on-select)]"
                            : "text-[var(--ov-ink-3)] hover:text-[var(--ov-ink)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* New Person Fields */}
              {mode === "new" && (
                <>
                  <FormInput
                    label="Name"
                    type="text"
                    className="text-[13px]"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    isRequired
                    error={errors.name}
                  />
                  <FormInput
                    label="Email"
                    type="email"
                    className="text-[13px]"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isRequired
                    error={errors.email}
                  />
                  <FormInput
                    label="Phone"
                    type="tel"
                    className="text-[13px]"
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
                  className="text-[13px]"
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
                value={role}
                onChange={(e) => { setRole(e.target.value); setSelectedChapters([]); }}
                options={roleOptions}
                className="text-[13px]"
                isRequired
                error={errors.role}
              />

              {/* Chapters — only for ARD */}
              {isARD && (
                <FormSelect
                  label="Chapters"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedChapters.includes(val)) toggleChapter(val);
                  }}
                  options={chapterOptions.filter((o) => !selectedChapters.includes(o.value))}
                  className="text-[13px]"
                  placeholder="Select chapter to add"
                  isRequired
                  searchable
                  searchPlaceholder="Search chapters..."
                  menuMaxHeightClass="max-h-64"
                  error={errors.chapters}
                  topAdornment={
                    selectedChapters.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedChapters.map((chapterId) => {
                          const chapter = chapterOptions.find((o) => o.value === chapterId);
                          return (
                            <span
                              key={chapterId}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ov-fill-subtle)] py-1 pl-2.5 pr-1.5 text-[12px] text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
                            >
                              {chapter?.label || chapterId}
                              <button
                                type="button"
                                className="grid h-4 w-4 place-items-center rounded text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                                onClick={() => toggleChapter(chapterId)}
                                aria-label={`Remove ${chapter?.label || "chapter"}`}
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
            </form>
          </div>

          {/* One action, one way out — Cancel used to be a filled grey slab the
              same size as Create, so the dialog offered two equal buttons. */}
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--ov-line-faint)] px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-rd-ard-form"
              disabled={isCreating}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
