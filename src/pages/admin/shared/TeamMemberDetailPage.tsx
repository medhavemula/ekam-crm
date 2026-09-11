import { useMemo, useState } from "react";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import AdminStatCard from "../../../components/admin/AdminStatCard";
import { useToast } from "../../../components/toast/ToastProvider";
import { CreateModal } from "../../../components/modals";
import type { FormField } from "../../../components/modals/CreateModal";
import { useGetEdTeamMemberQuery, useUpdateEdTeamMemberStatusMutation, useUpdateEdTeamMemberMutation } from "../../../services/ed/edTeamApi";
import { useGetEdChaptersQuery } from "../../../services/ed/edChaptersApi";
import { skipToken } from "@reduxjs/toolkit/query";

interface TeamMemberApiResponse {
    success: boolean;
    data: {
        member: {
            id: string;
            user: {
                id: string;
                name: string;
                email: string;
                phone?: string;
            };
            role: {
                code: string;
                label: string;
            };
            scope: string;
            region?: {
                id: string;
                name: string;
            };
            status: string;
        };
        cards: {
            chapters: number;
            regionalMembers: number;
            readyToLaunchChapters: number;
            totalMembers: number;
            businessOpportunity: number;
            businessClosed: number;
        };
    };
}

interface TeamMember {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: {
        code: string;
        label: string;
    };
    region?: {
        id: string;
        name: string;
    };
    chapter?: {
        id: string;
        name: string;
    };
    stats?: {
        chapters: number;
        regionalMembers: number;
        readyToLaunchChapters: number;
        totalMembers: number;
        opportunities: number;
        businessClosedAmount: number | string;
    };
    status?: string;
    scope?: string;
    area?: string;
}

const getErrMsg = (e: any) =>
    e?.data?.message || e?.error || e?.message || "Something went wrong";

export default function TeamMemberDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { id } = useParams<{ id: string }>();
    const { data: chaptersRes } = useGetEdChaptersQuery({ page: 1, limit: 200 });
    const chapterOptions: Array<{ value: string; label: string }> = (((chaptersRes as any)?.data?.items) || [] as any[]).map((c: any) => ({ value: String(c.id), label: String(c.name) }));

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editInitialValues, setEditInitialValues] = useState<any>({});
    const [updateStatus] = useUpdateEdTeamMemberStatusMutation();
    const [updateTeamMember] = useUpdateEdTeamMemberMutation();

    // Determine if this is a leadership team member based on route
    const isLeadershipRoute = location.pathname.includes('/regional-board/leadership-team/');

    const { data: response } = useGetEdTeamMemberQuery<{ data: TeamMemberApiResponse }>(
        id ? { id } : skipToken
    );

    const ed = useMemo<TeamMember>(() => {
        if (!response?.data) return {} as TeamMember;

        const member = response.data.member || {};
        const cards = response.data.cards || {};
        const user = member?.user || {};

        const toNumber = (v: any): number => {
            if (v == null) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            }
            if (Array.isArray(v)) return v.reduce((sum, item) => sum + toNumber(item), 0);
            if (typeof v === 'object') {
                if ('total' in v) return toNumber((v as any).total);
                if ('count' in v) return toNumber((v as any).count);
                if ('value' in v) return toNumber((v as any).value);
            }
            return 0;
        };

        const toCount = (v: any): number => {
            if (v == null) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            }
            if (Array.isArray(v)) return v.length;
            if (typeof v === 'object') {
                if ('total' in v) return toNumber((v as any).total);
                if ('count' in v) return toNumber((v as any).count);
            }
            return 0;
        };

        return {
            ...member,
            id: member?.id,
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            role: member?.role,
            region: member?.region,
            status: member?.status,
            scope: member?.scope,
            avatarInitial: user?.name?.charAt(0)?.toUpperCase() || 'U',
            stats: {
                chapters: toCount((cards as any)?.chapters),
                regionalMembers: toNumber((cards as any)?.regionalMembers),
                readyToLaunchChapters: toCount((cards as any)?.readyToLaunchChapters),
                totalMembers: toNumber((cards as any)?.totalMembers),
                opportunities: toNumber((cards as any)?.businessOpportunity),
                businessClosedAmount: toNumber((cards as any)?.businessClosed)
            }
        } as TeamMember;
    }, [response]);

    const stats = useMemo(() => {
        if (!ed?.stats) return [];
        const memberStats = ed.stats;
        const roleName = typeof ed.role === 'object' ? ed.role?.label || ed.role?.code : ed.role;
        const roleLower = roleName?.toString().toLowerCase() || '';

        // Define roles that should show 6 stats (RD, ARD, LD, CD, SD)
        const fullStatsRoles = [
            'regional director',
            'assistant regional director',
            'local director',
            'chapter director',
            'state director'
        ];

        const shouldShowFullStats = fullStatsRoles.some(r => roleLower.includes(r.toLowerCase()));

        // For RD, ARD, LD, CD, SD - show 6 stats
        if (shouldShowFullStats) {
            return [
                { title: "Chapters", key: "chapters", value: memberStats.chapters ?? 0, icon: "chapters" as const },
                { title: "Regional Members", key: "regionalMembers", value: memberStats.regionalMembers ?? 0, icon: "users" as const },
                { title: "Ready to launch chapters", key: "readyToLaunchChapters", value: memberStats.readyToLaunchChapters ?? 0, icon: "chapters" as const },
                { title: "Total Members", key: "totalMembers", value: memberStats.totalMembers ?? 0, icon: "totalchapters" as const },
                { title: "Business Opportunity", key: "opportunities", value: memberStats.opportunities ?? 0, icon: "bo" as const },
                { title: "Business Closed", key: "businessClosedAmount", value: memberStats.businessClosedAmount ?? 0, icon: "bc" as const },
            ];
        }

        // For all other roles - show 4 stats with chapter name if available
        const stats = [
            {
                title: ed.chapter?.name ? "Chapter" : "Chapters",
                key: ed.chapter?.name ? "chapter" : "chapters",
                value: (ed.chapter?.name || memberStats.chapters) ?? 0,
                icon: "chapters" as const,
                isText: !!ed.chapter?.name
            },
            {
                title: "Total Members",
                key: "totalMembers",
                value: memberStats.totalMembers ?? 0,
                icon: "totalchapters" as const
            },
            {
                title: "Business Opportunity",
                key: "opportunities",
                value: memberStats.opportunities ?? 0,
                icon: "bo" as const
            },
            {
                title: "Business Closed",
                key: "businessClosedAmount",
                value: memberStats.businessClosedAmount ?? 0,
                icon: "bc" as const
            },
        ];

        return stats;
    }, [ed?.stats, ed?.role, ed?.chapter?.name]);

    const prettifyRole = (r?: string) => {
        if (!r) return "—";
        const words = r
            .toLowerCase()
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
        return words.join(" ");
    };

    const handleEdit = () => {
        if (!ed?.id) return;
        setEditingMemberId(ed.id);

        // Determine role type and set appropriate initial values
        const isLeadershipRole = isLeadershipTeamRole(ed?.role?.code || ed?.role?.label || '');

        if (isLeadershipRole) {
            // Leadership roles - simple role mapping
            const leadershipRoleValueFromCode = (code?: string) => {
                const map: Record<string, string> = {
                    PRESIDENT: "president",
                    TREASURER: "treasurer",
                    GENERAL_SECRETARY: "general-secretary",
                    VICE_PRESIDENT: "vice-president",
                };
                return code ? map[code] || code.toLowerCase().replace(/_/g, "-") : "";
            };
            setEditInitialValues({
                member: ed?.name,
                role: leadershipRoleValueFromCode(ed?.role?.code || "")
            });
        } else {
            // Regional roles - existing mapping
            const roleValueFromCode = (code?: string) => {
                const map: Record<string, string> = {
                    REGIONAL_DIRECTOR: "regional-director",
                    ASSISTANT_REGIONAL_DIRECTOR: "assistant-regional-director",
                    LAUNCH_DIRECTOR: "launch-director",
                    CHAPTER_DIRECTOR: "chapter-director",
                    SUPPORT_DIRECTOR: "support-director",
                };
                return code ? map[code] || code.toLowerCase().replace(/_/g, "-") : "";
            };
            setEditInitialValues({
                member: ed?.name,
                role: roleValueFromCode(ed?.role?.code || ""),
                chapter: (ed as any)?.chapter?.id || "",
                area: (ed as any)?.area || ""
            });
        }
        const roleCode = ed?.role?.code || "";

        // Redirect RD & ARD to full page form
        if (
            roleCode === "REGIONAL_DIRECTOR" ||
            roleCode === "ASSISTANT_REGIONAL_DIRECTOR"
        ) {
            navigate(`/admin/regional-team/edit/${ed?.id}`, {
                state: {
                    partner: ed,
                    returnPath: "/admin/regional-team",
                    pageType: "regional-team",
                },
            });
            return;
        }

        setIsEditOpen(true);
    };

    const handleUpdateMember = async (formData: Record<string, string>) => {
        if (!editingMemberId) return;

        try {
            setIsLoading(true);

            // Determine role type and use appropriate mapping
            const isLeadershipRole = isLeadershipTeamRole(ed?.role?.code || ed?.role?.label || '');

            let roleCode: string;

            if (isLeadershipRole) {
                // Leadership role mapping
                const leadershipRoleCodeFromValue = (val?: string) => {
                    const map: Record<string, string> = {
                        "president": "PRESIDENT",
                        "treasurer": "TREASURER",
                        "general-secretary": "GENERAL_SECRETARY",
                        "vice-president": "VICE_PRESIDENT",
                    };
                    if (!val) return '';
                    return map[val] || val.toUpperCase().replace(/-/g, "_");
                };
                roleCode = leadershipRoleCodeFromValue(formData.role);
            } else {
                // Regional role mapping
                const roleCodeFromValue = (val?: string) => {
                    const map: Record<string, string> = {
                        "regional-director": "REGIONAL_DIRECTOR",
                        "assistant-regional-director": "ASSISTANT_REGIONAL_DIRECTOR",
                        "launch-director": "LAUNCH_DIRECTOR",
                        "chapter-director": "CHAPTER_DIRECTOR",
                        "support-director": "SUPPORT_DIRECTOR",
                    };
                    if (!val) return '';
                    return map[val] || val.toUpperCase().replace(/-/g, "_");
                };
                roleCode = roleCodeFromValue(formData.role);
            }

            const normalizeRoleCode = (code: string) => code ? code.toUpperCase().replace(/-/g, "_") : '';
            const finalRoleCode = normalizeRoleCode(roleCode);

            const chapterId = formData.chapter || undefined;

            const chapterItems: any[] = (((chaptersRes as any)?.data?.items) || []) as any[];
            const selectedChapterObj = chapterId ? chapterItems.find((c: any) => String(c.id) === String(chapterId)) : undefined;
            const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
            const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];

            await updateTeamMember({
                memberId: String(editingMemberId),
                data: {
                    roleCode: finalRoleCode || undefined,
                    chapterId,
                    regionId: regionIdToSend,
                    area: formData.area || undefined,
                },
            }).unwrap();

            showToast({ title: "Member updated successfully", kind: "success" });
            setIsEditOpen(false);
        } catch (error) {
            showToast({
                title: "Failed to update member",
                description: getErrMsg(error),
                kind: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDeleteClick = () => {
        if (!ed?.id) {
            showToast({
                title: "Error",
                description: "Invalid team member ID",
                kind: "error",
            });
            return;
        }
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!ed?.id) return;

        try {
            setIsLoading(true);
            await updateStatus({
                memberId: ed.id,
                status: "ENDED" as any
            }).unwrap();

            setIsDeleteModalOpen(false);
            showToast({
                title: "Success",
                description: "Team member removed successfully",
                kind: "success",
            });

            navigate(isLeadershipRoute ? "/admin/regional-board/leadership-team" : "/admin/regional-team");
        } catch (error) {
            console.error("Error removing team member:", error);
            showToast({
                title: "Error",
                description: getErrMsg(error) || "Failed to remove team member. Please try again.",
                kind: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to determine if a role is a leadership team role
    const isLeadershipTeamRole = (roleCodeOrLabel?: string): boolean => {
        if (!roleCodeOrLabel) return false;
        const normalized = roleCodeOrLabel.toLowerCase().replace(/[_-]/g, ' ');
        const leadershipRoles = [
            'president',
            'treasurer',
            'general secretary',
            'vice president',
            'general-secretary',
            'vice-president'
        ];
        return leadershipRoles.some(role => normalized.includes(role));
    };

    // Dynamic edit fields based on role type
    const editFields: FormField[] = useMemo(() => {
        const isLeadershipRole = isLeadershipTeamRole(ed?.role?.code || ed?.role?.label || '');

        if (isLeadershipRole) {
            // Leadership roles - only show member and role fields
            return [
                {
                    name: "member",
                    label: "Member",
                    type: "text",
                    placeholder: "Member",
                    required: true,
                    disabled: true
                },
                {
                    name: "role",
                    label: "Role",
                    type: "select",
                    placeholder: "Select role",
                    options: [
                        { value: "president", label: "President" },
                        { value: "treasurer", label: "Treasurer" },
                        { value: "general-secretary", label: "General Secretary" },
                        { value: "vice-president", label: "Vice President" },
                    ],
                    required: true
                },
            ];
        } else {
            // Regional roles - show all fields
            return [
                {
                    name: "member",
                    label: "Member",
                    type: "text",
                    placeholder: "Member",
                    required: true,
                    disabled: true
                },
                {
                    name: "role",
                    label: "Role",
                    type: "select",
                    placeholder: "Select role",
                    options: [
                        { value: "launch-director", label: "Launch Director" },
                        { value: "chapter-director", label: "Chapter Director" },
                        { value: "support-director", label: "Support Director" },
                    ],
                    required: true
                },
                {
                    name: "chapter",
                    label: "Chapter",
                    type: "select",
                    placeholder: "Select chapter",
                    options: chapterOptions,
                    required: false,
                    includePlaceholderOption: true,
                    searchable: true,
                    searchPlaceholder: "Search chapters...",
                    menuMaxHeightClass: "max-h-28",
                    hideWhenRoleIn: ["", "regional-director", "assistant-regional-director"],
                },
                {
                    name: "area",
                    label: "Area",
                    type: "text",
                    placeholder: "Enter area",
                    required: false
                }
            ];
        }
    }, [ed?.role, chapterOptions]);

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
            <Navbar />
            <main className="container mx-auto px-4 py-6 md:py-8">
                <PageHeader
                    breadcrumbs={[
                        {
                            label: isLeadershipRoute ? "Leadership Team" : "Regional Team",
                            onClick: () => navigate(isLeadershipRoute ? "/admin/regional-board/leadership-team" : "/admin/regional-team")
                        },
                        { label: ed?.name || "..." },
                    ]}
                />

                {!response ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D85D27]"></div>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl">
                        {/* Three equal blocks */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            {/* Block 1: Avatar and name */}
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl"
                                    style={{ backgroundColor: "#D85D27" }}
                                >
                                    {(ed?.name || "").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{ed?.name || "—"}</h1>
                                    <span className="text-gray-300">
                                        {ed.role ? prettifyRole(ed.role.label || '') : '—'}
                                    </span>
                                    <p className="text-gray-400 text-sm">
                                        {typeof (ed as any)?.country === "object"
                                            ? (ed as any)?.country?.name || ""
                                            : (ed as any)?.country || ""}
                                    </p>
                                </div>
                            </div>

                            {/* Block 2: Email */}
                            <div className="grid grid-cols-3 gap-6 border-l border-r border-gray-700 px-2">
                                <div className="col-span-2">
                                    <div className="text-gray-400 text-xs mb-1">Email</div>
                                    <div className="text-white">{ed?.email || "—"}</div>
                                </div>
                            </div>

                            {/* Block 3: Actions */}
                            <div className="flex items-end justify-start md:justify-end gap-3 self-end">
                                <button
                                    onClick={handleEdit}
                                    disabled={isLoading}
                                    className="h-8 w-22 md:w-26 rounded-md border-2 border-[#D85D27] text-white text-sm font-medium px-4 disabled:opacity-50"
                                >
                                    {isLoading ? 'Loading...' : 'Edit'}
                                </button>
                                {/* <button
                                    onClick={handleAssignRole}
                                    disabled={isLoading}
                                    className="h-10 w-26 md:w-30 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Processing...' : 'Assign Role'}
                                </button> */}
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={isLoading}
                                    className="h-8 w-22 md:w-26 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-gray-700 my-6" />

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.map((s) => (
                                <AdminStatCard key={s.key} title={s.title} value={String(s.value)} icon={s.icon} />
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <CreateModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="Update Member Role"
                fields={editFields}
                initialValues={editInitialValues}
                onSubmit={handleUpdateMember}
                submitButtonText="Update Role"
            />
            <ConfirmationDialog
                isOpen={isDeleteModalOpen}
                onClose={() => !isLoading && setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                isSubmitting={isLoading}
                actionType="delete"
                confirmText={isLoading ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
            />
        </div>
    );
}