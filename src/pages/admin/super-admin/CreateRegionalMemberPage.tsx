import React, { useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FormCard from "../../../components/forms/FormCard";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useCreateRegionalMemberMutation,
  useGetChaptersQuery,
  CHAPTER_SCOPED_ROLES,
} from "../../../services/superadmin/adminFranchiseApi";
import type {
  CreateRegionalMemberInput,
  RegionalMemberRole,
} from "../../../services/superadmin/adminFranchiseApi";

const roleOptions: { value: RegionalMemberRole; label: string }[] = [
  { value: "REGIONAL_DIRECTOR", label: "Regional Director" },
  { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" },
  { value: "CHAPTER_DIRECTOR", label: "Chapter Director" },
  { value: "SUPPORT_DIRECTOR", label: "Support Director" },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  role: RegionalMemberRole;
  chapterId: string;
};

function extractApiError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyE = e as any;
    return (
      anyE?.data?.message ||
      anyE?.error ||
      anyE?.message ||
      "Unable to add member. Please try again."
    );
  }
  return "Unable to add member. Please try again.";
}

export default function CreateRegionalMemberPage() {
  const navigate = useNavigate();
  const { edId } = useParams();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    role: "REGIONAL_DIRECTOR",
    chapterId: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [createRegionalMember, { isLoading: creating }] = useCreateRegionalMemberMutation();

  // Chapter list is scoped to this partner, so the dropdown can only offer chapters
  // the server will accept.
  const { data: chaptersData } = useGetChaptersQuery(
    edId ? { edId, filters: { page: 1, limit: 100 } } : { edId: "", filters: {} },
    { skip: !edId },
  );

  const chapterOptions = useMemo(
    () => [
      { value: "", label: "Select a chapter" },
      ...((chaptersData?.data?.data || []).map((c: any) => ({
        value: c.id,
        label: c.name,
      })) as { value: string; label: string }[]),
    ],
    [chaptersData],
  );

  const requiresChapter = CHAPTER_SCOPED_ROLES.includes(formData.role);

  const backToList = () => navigate(`/admin/franchise/regional-members/${edId}`);
  const reduceMotion = useReducedMotion();


  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      // Switching to a region-wide role drops any chapter that was picked, so we
      // never send a chapter the role does not use.
      if (field === "role" && !CHAPTER_SCOPED_ROLES.includes(value)) {
        return { ...prev, role: value as RegionalMemberRole, chapterId: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!edId) {
      setSubmitError("No franchise partner selected.");
      return;
    }
    if (requiresChapter && !formData.chapterId) {
      setSubmitError("Please select a chapter for this role.");
      return;
    }

    const body: CreateRegionalMemberInput = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      role: formData.role,
      chapterId: requiresChapter ? formData.chapterId : undefined,
    };

    try {
      await createRegionalMember({ edId, body }).unwrap();
      showToast({
        title: "Success",
        description: "Regional member added successfully",
        kind: "success",
      });
      backToList();
    } catch (err) {
      setSubmitError(extractApiError(err));
    }
  };

  if (!edId) {
    return (
      <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-[var(--ov-ink)]">
              No partner selected
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              A regional member is added under a franchise partner. Pick one first.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/franchise")}
              className="mt-5 h-10 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Go to Franchise Partners
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
        {/* One way back, at the top, where a reader looks for it. */}
        <button
          type="button"
          onClick={backToList}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Regional Members
        </button>

        <motion.header
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
            Add member
          </h1>
          <p className="mt-2.5 text-[12.5px] text-[var(--ov-ink-4)]">
            They'll receive sign-in details at the email address you enter.
          </p>
        </motion.header>

        <form onSubmit={handleSubmit} className="pb-28">
          <FormCard>
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
            <FormSelect
              label="Role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              options={roleOptions}
              isRequired
            />

            {/* Only the chapter-scoped roles need one, so the field appears with
                the role that asks for it rather than sitting there disabled. */}
            {requiresChapter && (
              <FormSelect
                label="Chapter"
                value={formData.chapterId}
                onChange={(e) => handleChange("chapterId", e.target.value)}
                options={chapterOptions}
                isRequired
              />
            )}
          </FormCard>

          {submitError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-[var(--ov-danger-wash)] px-4 py-3 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-danger-wash)]"
            >
              {submitError}
            </p>
          )}

          {/* The commit stays reachable without scrolling to the end of the form. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--ov-line)] bg-[var(--ov-deep)]/90 backdrop-blur-xl">
            <div className="container mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3">
              <button
                type="button"
                onClick={backToList}
                className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-deep-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-deep-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {creating ? "Adding…" : "Add member"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
