import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import AdminStatCard from "../../../components/admin/AdminStatCard";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { CreateModal } from "../../../components/modals";
import type { FormField } from "../../../components/modals/CreateModal";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetSocialRegionalBoardQuery,
} from "../../../services/social/regionalBoardApi";
import {
  useGetSocialRegionalTeamMemberOverviewQuery,
  useGetSocialRegionalTeamRolesQuery,
  useRemoveSocialRegionalTeamMemberMutation,
  useUpdateSocialRegionalTeamMemberMutation,
} from "../../../services/social/regionalTeamApi";
import type { SocialRegionalTeamRole } from "../../../services/social/types";

type ModalSubmitResult = Promise<{ errors?: Record<string, string> } | void>;
type LocationCardState = {
  chapterNames?: string[];
  chapterName?: string;
  chapterIds?: string[];
};

const MULTI_CHAPTER_ROLE_CODES = [
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
  "CHAPTER_GOVERNOR",
] as const;

const DEFAULT_ROLE_OPTIONS: SocialRegionalTeamRole[] = [
  { code: "REGIONAL_GOVERNOR", scope: "REGION", display_name: "Regional Governor" },
  {
    code: "ASSISTANT_REGIONAL_GOVERNOR",
    scope: "CHAPTER",
    display_name: "Assistant Regional Governor",
  },
  { code: "LAUNCH_GOVERNOR", scope: "CHAPTER", display_name: "Launch Governor" },
  { code: "CHAPTER_GOVERNOR", scope: "CHAPTER", display_name: "Chapter Governor" },
  { code: "SOCIAL_PRESIDENT", scope: "CHAPTER", display_name: "Social President" },
  { code: "SOCIAL_TREASURER", scope: "CHAPTER", display_name: "Social Treasurer" },
  {
    code: "SOCIAL_GENERAL_SECRETARY",
    scope: "CHAPTER",
    display_name: "Social General Secretary",
  },
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

export default function SocialAdminRegionalTeamMemberPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const locationState = (location.state ?? {}) as LocationCardState;

  const { data, isLoading, error } = useGetSocialRegionalTeamMemberOverviewQuery(id ?? skipToken);
  const { data: rolesRes } = useGetSocialRegionalTeamRolesQuery();
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ page: 1, limit: 100 });
  const [updateMember, { isLoading: isUpdating }] = useUpdateSocialRegionalTeamMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveSocialRegionalTeamMemberMutation();

  const roleCatalog = useMemo(
    () => (rolesRes?.data?.roles?.length ? rolesRes.data.roles : DEFAULT_ROLE_OPTIONS),
    [rolesRes],
  );

  const chapterOptions = useMemo(
    () =>
      (((chaptersRes as any)?.data?.items ?? []) as Array<{ id: string; name: string }>).map((chapter) => ({
        value: chapter.id,
        label: chapter.name,
      })),
    [chaptersRes],
  );

  const member = data?.data?.member;
  const cards = data?.data?.cards;

  const chapterNames = useMemo(() => {
    const stateNames = Array.isArray(locationState.chapterNames)
      ? locationState.chapterNames.filter(Boolean)
      : [];
    if (stateNames.length) return stateNames;
    if (locationState.chapterName) return [locationState.chapterName];
    if (member?.chapter?.name) return [member.chapter.name];
    return [];
  }, [locationState.chapterName, locationState.chapterNames, member?.chapter?.name]);

  const chapterIds = useMemo(() => {
    const stateIds = Array.isArray(locationState.chapterIds)
      ? locationState.chapterIds.filter(Boolean)
      : [];
    if (stateIds.length) return stateIds;
    if (member?.chapter?.id) return [member.chapter.id];
    return [];
  }, [locationState.chapterIds, member?.chapter?.id]);

  const editFields = useMemo<FormField[]>(() => {
    if (!member) return [];

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
  }, [chapterOptions, member, roleCatalog]);

  const editInitialValues = useMemo(() => {
    if (!member) return undefined;
    return {
      member: member.user?.name || member.user?.email || "Member",
      role_code: member.role.code,
      social_chapter_id: member.chapter?.id || "",
      social_chapter_ids: chapterIds.join(","),
      area: member.area || "",
    };
  }, [chapterIds, member]);

  const stats = useMemo(
    () => [
      { title: "Chapters", value: cards?.chapters ?? 0, icon: "chapters" as const },
      { title: "Regional Members", value: cards?.regionalMembers ?? 0, icon: "users" as const },
      {
        title: "Ready to launch chapters",
        value: cards?.readyToLaunchChapters ?? 0,
        icon: "chapters" as const,
      },
      { title: "Total Members", value: cards?.totalMembers ?? 0, icon: "totalchapters" as const },
      { title: "No of Events", value: cards?.events ?? 0, icon: "briefcase" as const },
    ],
    [cards],
  );

  const scopeLabel = useMemo(() => {
    if (!member) return "Regional Scope";
    if (member.scope === "REGION") {
      return member.region?.name || member.area || "Regional Scope";
    }

    if (chapterNames.length > 1) {
      return chapterNames.join(", ");
    }

    return chapterNames[0] || member.area || member.region?.name || "Chapter Scope";
  }, [chapterNames, member]);

  const areaLine = useMemo(() => {
    if (!member) return "";
    const values = [member.area, member.region?.name].filter(Boolean);
    return values.join(" | ");
  }, [member]);

  const handleEditSubmit = async (form: Record<string, string>): ModalSubmitResult => {
    if (!member?.id) return;

    const selectedRoleCode = form.role_code;
    const selectedRole = roleCatalog.find((role) => role.code === selectedRoleCode);
    const effectiveScope = selectedRole?.scope || member.scope;
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
        id: member.id,
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
      setIsEditOpen(false);
      return;
    } catch (submitError) {
      const message = extractApiError(submitError);
      setSubmitError(message);
      return { errors: { form: message } };
    }
  };

  const handleRemove = async () => {
    if (!member?.id) return;

    try {
      await removeMember(member.id).unwrap();
      showToast({
        title: "Success",
        description: "Regional team member removed successfully.",
        kind: "success",
      });
      navigate("/social/admin/regional-team");
    } catch (submitError) {
      showToast({
        title: "Remove failed",
        description: extractApiError(submitError),
        kind: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
        <Navbar />
        <main className="container mx-auto px-4 py-6 md:py-8">
          <PageHeader
            breadcrumbs={[
              { label: "Regional Team", onClick: () => navigate("/social/admin/regional-team") },
              { label: "View Member" },
            ]}
          />
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            Failed to load regional team member details. Please try again.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader
          breadcrumbs={[
            { label: "Regional Team", onClick: () => navigate("/social/admin/regional-team") },
            { label: member.user?.name || "View Member" },
          ]}
        />

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {submitError}
          </div>
        )}

        <section className="mb-8 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_1px_minmax(260px,1fr)_1px_minmax(260px,0.8fr)] xl:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#D85D27] text-3xl font-semibold text-white">
                  {member.user?.avatarInitial || member.user?.name?.trim().charAt(0).toUpperCase() || "M"}
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-semibold text-white md:text-[2rem] md:leading-tight">
                    {member.user?.name || "Member"}
                  </h1>
                  <p className="mt-1 text-lg text-gray-200">{member.role.label}</p>
                  {areaLine ? <p className="mt-1 text-base text-gray-300">{areaLine}</p> : null}
                  <p className="mt-1 text-base font-medium text-[#D85D27]">{scopeLabel}</p>
                </div>
              </div>

              <div className="hidden h-12 w-px bg-white/15 xl:block" />

              <div className="min-w-0">
                <p className="text-sm text-gray-400">Email</p>
                <p className="mt-1 break-all text-[1.65rem] font-medium leading-tight text-white">
                  {member.user?.email || "—"}
                </p>
                {member.user?.phone ? (
                  <p className="mt-2 text-base text-gray-300">{member.user.phone}</p>
                ) : null}
              </div>

              <div className="hidden h-12 w-px bg-white/15 xl:block" />

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="flex flex-wrap gap-3 xl:justify-end">
                  <button
                    onClick={() => {
                      setSubmitError("");
                      setIsEditOpen(true);
                    }}
                    className="h-10 min-w-[104px] rounded-md border border-[#D85D27] px-6 text-sm font-medium text-[#D85D27] transition-colors hover:bg-[#D85D27] hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setIsRemoveOpen(true)}
                    className="h-10 min-w-[104px] rounded-md bg-[#D85D27] px-6 text-sm font-medium text-white transition-colors hover:bg-[#C24F20]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <AdminStatCard
              key={stat.title}
              title={stat.title}
              value={String(stat.value)}
              icon={stat.icon}
              className="min-h-[188px]"
            />
          ))}
        </section>
      </main>

      <CreateModal
        key={`edit-${member.id}`}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSubmitError("");
        }}
        title="Edit Regional Team Member"
        fields={editFields}
        onSubmit={handleEditSubmit}
        submitButtonText={isUpdating ? "Updating..." : "Update"}
        initialValues={editInitialValues}
      />

      <ConfirmationDialog
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleRemove}
        actionType="remove"
        isSubmitting={isRemoving}
      />
    </div>
  );
}
