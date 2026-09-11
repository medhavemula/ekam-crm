import { useEffect, useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ShieldCheck, Pencil, Trash2, Search as SearchIcon, X } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useToast } from "../../../components/toast/ToastProvider";
import { skipToken } from "@reduxjs/toolkit/query";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import {
    useListTeamRolesQuery,
    useCreateTeamRoleMutation,
    useUpdateTeamRoleMutation,
    useDeleteTeamRoleMutation,
    type TeamRole,
} from "../../../services/superadmin/adminTeamApi";
import {
    useListPTeamRolesQuery,
    useCreatePTeamRoleMutation,
    useUpdatePTeamRoleMutation,
    useDeletePTeamRoleMutation,
    type TeamRole as EdTeamRole,
} from "../../../services/ed/edPTeamApi";
import { useRole } from "../../../hooks/useRole";

type Row = {
    id: string;
    name: string;
    permissions: string; // comma-joined string for DataTable cell + search
};

export default function ManageRolesPage() {
    const { role } = useRole();
    const authRole = useSelector((state: RootState) => state.auth.role);
    const storedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('userRole') : null;

    const effectiveRole = authRole || role || storedRole || null;
    const edRoles = ["EXECUTIVE_DIRECTOR", "ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
    const isEd = edRoles.includes(effectiveRole as any);
    const roleResolved = !!effectiveRole;
    // pagination (client) — your API already paginates; keep it consistent with CountriesPage
    const [page, setPage] = useState(1);
    const [limit] = useState(100);

    // fetch roles
    const { data: dataSa, isFetching: fetchingSa, error: errorSa, refetch: refetchSa } = useListTeamRolesQuery(
        !roleResolved ? (skipToken as any) : (isEd ? (skipToken as any) : { page, limit }),
    );
    const { data: dataEd, isFetching: fetchingEd, error: errorEd, refetch: refetchEd } = useListPTeamRolesQuery(
        !roleResolved ? (skipToken as any) : (isEd ? { page, limit } : (skipToken as any)),
    );
    const reduceMotion = useReducedMotion();
    const isFetching = isEd ? fetchingEd : fetchingSa;
    const error = isEd ? (errorEd as any) : (errorSa as any);
    const refetch = isEd ? refetchEd : refetchSa;
    const [deleteSaRole] = useDeleteTeamRoleMutation();
    const [deleteEdRole] = useDeletePTeamRoleMutation();

    // your adminTeamApi transformResponse already converts to {data: TeamRole[], page, limit, total}
    // but we’ll also be defensive if someone bypassed that transform.
    const roles: (TeamRole | EdTeamRole)[] = useMemo(() => {
        // normalized (recommended)
        const data = isEd ? dataEd : dataSa;
        if (Array.isArray((data as any)?.data)) return (data as any).data;
        // raw API shape from your example
        const rawItems = (data as any)?.data?.items;
        if (Array.isArray(rawItems)) return rawItems as TeamRole[];
        return [];
    }, [dataSa, dataEd, isEd]);

    const total: number = (
        isEd
            ? ((dataEd as any)?.total ?? (dataEd as any)?.data?.total)
            : ((dataSa as any)?.total ?? (dataSa as any)?.data?.total)
    ) ?? roles.length;

    // map to DataTable rows
    const apiRows: Row[] = useMemo(
        () =>
            roles.map((r) => ({
                id: String(r.id),
                name: r.name,
                permissions: (r.permissions && r.permissions.length > 0) 
                    ? r.permissions.map(p => p.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')).join(", ")
                    : "View , Create, Edit",
            })),
        [roles]
    );

    // toasts
    const { showToast } = useToast();
    useEffect(() => {
        if (error) {
            const e: any = error as any;
            const msg = e?.data?.message || e?.error || "Failed to load roles";
            showToast({ title: "Failed to load roles", description: String(msg), kind: "error" });
        }
    }, [error, showToast]);

    // global + column search
    const [globalSearch, setGlobalSearch] = useState("");
    const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});
    const [roleToDelete, setRoleToDelete] = useState<{id: string, name: string} | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearchChange = (key: string, value: string) => {
        setSearchValues((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleDeleteClick = (id: string, name: string) => {
        setRoleToDelete({ id, name });
    };

    const handleDeleteConfirm = async () => {
        if (!roleToDelete) return;
        
        const { id, name } = roleToDelete;
        try {
            setIsDeleting(true);
            if (isEd) await deleteEdRole(id).unwrap();
            else await deleteSaRole(id).unwrap();
            showToast({ title: "Role deleted", description: `Role "${name}" has been deleted successfully.`, kind: "success" });
            refetch?.();
        } catch (e: any) {
            const msg = e?.data?.message || e?.message || "Delete failed";
            showToast({ title: "Delete failed", description: String(msg), kind: "error" });
        } finally {
            setIsDeleting(false);
            setRoleToDelete(null);
        }
    };

    const filteredData = useMemo(() => {
        const rows = apiRows;
        return rows.filter((row) => {
            if (globalSearch) {
                const s = globalSearch.toLowerCase();
                const hit =
                    row.name.toLowerCase().includes(s) ||
                    row.permissions.toLowerCase().includes(s);
                if (!hit) return false;
            }
            for (const [key, value] of Object.entries(searchValues)) {
                if (value) {
                    const cell = String((row as any)[key] ?? "").toLowerCase();
                    if (!cell.includes(value.toLowerCase())) return false;
                }
            }
            return true;
        });
    }, [apiRows, globalSearch, searchValues]);

    // columns to match screenshot: Role Name | Permissions (both sortable & searchable)
    const columns: TableColumn[] = [
        { key: "name", label: "Role Name", sortable: true, searchable: true },
        { key: "permissions", label: "Permissions", sortable: true, searchable: true },
        { key: "actions", label: "Actions", sortable: false, searchable: false },
    ];

    // Create/Edit Role modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<{id: string; name: string; permissions: string[]} | null>(null);
    const [createSaRole] = useCreateTeamRoleMutation();
    const [updateSaRole] = useUpdateTeamRoleMutation();
    const [createEdRole] = useCreatePTeamRoleMutation();
    const [updateEdRole] = useUpdatePTeamRoleMutation();
    
    const modalFields = [
        { name: "name", label: "Role Name", type: "text" as const, placeholder: "Enter role name", required: true },
        // { name: "permissions", label: "Permissions (comma separated)", type: "text" as const, placeholder: "e.g. VIEW_DASHBOARD, MANAGE_TEAM" },
    ];
    
    const initialFormValues = useMemo(() => ({
        name: editingRole?.name || "",
        // permissions: editingRole?.permissions?.join(", ") || ""
    }), [editingRole]);

    const handleRoleSubmit = async (form: Record<string, string>): Promise<boolean> => {
        try {
            const name = (form.name || "").trim();
            if (!name) {
                showToast({ 
                    title: "Validation Error", 
                    description: "Role name is required", 
                    kind: "error" 
                });
                return false;
            }

            if (isEd) {
                if (editingRole) {
                    await updateEdRole({ id: editingRole.id, body: { name } }).unwrap();
                    showToast({ 
                        title: "Success", 
                        description: `Role "${name}" has been updated successfully.`, 
                        kind: "success" 
                    });
                } else {
                    await createEdRole({ name }).unwrap();
                    showToast({ 
                        title: "Success", 
                        description: `Role "${name}" has been created successfully.`, 
                        kind: "success" 
                    });
                }
            } else {
                if (editingRole) {
                    await updateSaRole({ id: editingRole.id, body: { name } }).unwrap();
                    showToast({ 
                        title: "Success", 
                        description: `Role "${name}" has been updated successfully.`, 
                        kind: "success" 
                    });
                } else {
                    await createSaRole({ name }).unwrap();
                    showToast({ 
                        title: "Success", 
                        description: `Role "${name}" has been created successfully.`, 
                        kind: "success" 
                    });
                }
            }
            
            refetch?.();
            setEditingRole(null);
            return true;
            
        } catch (e: any) {
            const msg = e?.data?.message || e?.message || "Failed to create role";
            showToast({ 
                title: "Error", 
                description: msg,
                kind: "error" 
            });
            return false; // Prevent modal from closing
        }
    };

    return (
        <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
            <Navbar />

            <main className="container mx-auto px-4 py-6 md:py-8">
                <motion.div
                    initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
                >
                    <div>
                        <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
                            Manage Roles
                        </h1>
                        <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
                            {!isFetching && !error && (
                                <>
                                    <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                                        {filteredData.length}
                                    </span>{" "}
                                    {filteredData.length === 1 ? "role" : "roles"}
                                    {" · "}
                                </>
                            )}
                            What each team member is allowed to do
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <div className="relative w-full sm:w-64">
                            <SearchIcon
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                value={globalSearch}
                                onChange={(e) => { setGlobalSearch(e.target.value); setPage(1); }}
                                placeholder="Search roles"
                                aria-label="Search roles"
                                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-9 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] [&::-webkit-search-cancel-button]:hidden"
                            />
                            {globalSearch && (
                                <button
                                    type="button"
                                    onClick={() => { setGlobalSearch(""); setPage(1); }}
                                    aria-label="Clear search"
                                    className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Add role
                        </button>
                    </div>
                </motion.div>

                {error ? (
                    <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
                        Couldn&apos;t load roles. Check your connection and try again.
                    </div>
                ) : isFetching && filteredData.length === 0 ? (
                    <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
                        <div className="h-12 bg-[var(--ov-raised)]" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-14 animate-pulse border-t border-[color:var(--ov-line-faint)] bg-[var(--ov-panel)]"
                            />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
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
                            <ShieldCheck className="h-7 w-7" strokeWidth={1.75} />
                        </span>
                        <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
                            {globalSearch ? "Nothing matches that search" : "No roles yet"}
                        </p>
                        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
                            {globalSearch
                                ? "Try a different name."
                                : "Roles you add here become assignable to team members."}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className={`overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-opacity ${
                            isFetching ? "opacity-60" : "opacity-100"
                        }`}
                    >
                        <DataTable
                            columns={columns}
                            data={filteredData}
                            searchValues={searchValues}
                            onSearchChange={handleSearchChange}
                            total={total}
                            page={page}
                            pageSize={limit}
                            onPageChange={(p) => setPage(p)}
                            renderCell={(col, row: any) => {
                                if (col.key === "actions") {
                                    return (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const role = roles.find((r) => String(r.id) === row.id);
                                                    if (role) {
                                                        setEditingRole({
                                                            id: row.id,
                                                            name: row.name,
                                                            permissions: role.permissions || [],
                                                        });
                                                        setIsCreateOpen(true);
                                                    }
                                                }}
                                                aria-label={`Edit ${row.name}`}
                                                title="Edit role"
                                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                                            >
                                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(row.id, row.name);
                                                }}
                                                disabled={isDeleting}
                                                aria-label={`Delete ${row.name}`}
                                                title="Delete role"
                                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </motion.div>
                )}
            </main>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={handleDeleteConfirm}
                isSubmitting={isDeleting}
                actionType="delete"
                title={`Delete ${roleToDelete?.name || "this role"}?`}
            />

            {/* Create Role modal */}
            <CreateModal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setEditingRole(null);
                }}
                title={editingRole ? "Edit Role" : "Add Role"}
                fields={modalFields}
                initialValues={initialFormValues}
                onSubmit={async (formData) => {
                    try {
                        const success = await handleRoleSubmit(formData);
                        if (success) {
                            setIsCreateOpen(false);
                            setEditingRole(null);
                            return { success: true };
                        }
                        return { errors: { form: 'Failed to save role' } };
                    } catch (error) {
                        return { 
                            errors: { 
                                form: error instanceof Error ? error.message : 'Failed to save role' 
                            } 
                        };
                    }
                }}
                submitButtonText={editingRole ? "Update Role" : "Add Role"}
            />
        </div>
    );
}
