import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import PageHeader from "../../../components/common/PageHeader";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { Search } from "lucide-react";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetSocialTeamRolesQuery,
  useCreateSocialTeamRoleMutation,
  useUpdateSocialTeamRoleMutation,
  useDeleteSocialTeamRoleMutation,
} from "../../../services/social/teamApi";

interface Row {
  id: string;
  name: string;
  permissions: string;
}

export default function SocialAdminManageRolesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const breadcrumbs = [
    { label: "Team & Role", onClick: () => navigate("/social/admin/team-role") },
    { label: "Manage Role" },
  ];

  const [page, setPage] = useState(1);
  const [limit] = useState(100);

  const { data, isFetching, error, refetch } = useGetSocialTeamRolesQuery({ page, limit });

  const [deleteRole] = useDeleteSocialTeamRoleMutation();
  const [createRole] = useCreateSocialTeamRoleMutation();
  const [updateRole] = useUpdateSocialTeamRoleMutation();

  const roles = useMemo(() => data?.data?.items ?? [], [data]);
  const total: number = data?.data?.total ?? roles.length;

  const apiRows: Row[] = useMemo(
    () =>
      roles.map((r) => ({
        id: String(r.id),
        name: r.name,
        permissions:
          (r.permissions ?? [])
            .map((p) =>
              p
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(" "),
            )
            .join(", ") || "View",
      })),
    [roles],
  );

  useEffect(() => {
    if (error) {
      const e: any = error as any;
      const msg = e?.data?.message || e?.error || "Failed to load roles";
      showToast({ title: "Failed to load roles", description: String(msg), kind: "error" });
    }
  }, [error, showToast]);

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    const { id, name } = roleToDelete;
    try {
      setIsDeleting(true);
      await deleteRole(id).unwrap();
      showToast({
        title: "Role deleted",
        description: `Role "${name}" has been deleted successfully.`,
        kind: "success",
      });
      refetch();
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
        const hit = row.name.toLowerCase().includes(s) || row.permissions.toLowerCase().includes(s);
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

  const columns: TableColumn[] = [
    { key: "name", label: "Role Name", sortable: true, searchable: true },
    { key: "permissions", label: "Permissions", sortable: true, searchable: true },
    { key: "actions", label: "Actions", sortable: false, searchable: false },
  ];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; name: string; permissions: string[] } | null>(null);

  const modalFields = [
    {
      name: "name",
      label: "Role Name",
      type: "text" as const,
      placeholder: "Enter role name",
      required: true,
    },
  ];

  const initialFormValues = useMemo(
    () => ({
      name: editingRole?.name || "",
    }),
    [editingRole],
  );

  const handleRoleSubmit = async (form: Record<string, string>): Promise<boolean> => {
    try {
      const name = (form.name || "").trim();
      if (!name) {
        showToast({
          title: "Validation Error",
          description: "Role name is required",
          kind: "error",
        });
        return false;
      }

      const permissions = editingRole?.permissions ?? ["VIEW"];

      if (editingRole) {
        await updateRole({ id: editingRole.id, name, permissions }).unwrap();
        showToast({
          title: "Success",
          description: `Role "${name}" has been updated successfully.`,
          kind: "success",
        });
      } else {
        await createRole({ name, permissions }).unwrap();
        showToast({
          title: "Success",
          description: `Role "${name}" has been created successfully.`,
          kind: "success",
        });
      }

      refetch();
      setEditingRole(null);
      return true;
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Failed to save role";
      showToast({ title: "Error", description: msg, kind: "error" });
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* top-right Add Role */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
          >
            Add Role +
          </button>
        </div>

        <GradientContainer>
          <div className="p-6 rounded-2xl">
            {/* global search input */}
            <div className="mb-4">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full pl-10 pr-4 rounded-md bg-[#33363B] border border-gray-700 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D85D27]"
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              searchValues={searchValues}
              onSearchChange={handleSearchChange}
              showSearchRow={true}
              total={total}
              page={page}
              pageSize={limit}
              onPageChange={(p) => setPage(p)}
              renderCell={(col, row: any) => {
                if (col.key === "actions") {
                  return (
                    <div className="flex space-x-2">
                      <button
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
                        className="px-3 py-1 rounded-md bg-[#D85D27] text-white hover:bg-orange-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleToDelete({ id: row.id, name: row.name });
                        }}
                        className="px-3 py-1 rounded-md border border-orange-600 text-white hover:bg-orange-600 hover:text-white text-sm"
                        disabled={isDeleting}
                      >
                        {isDeleting && roleToDelete?.id === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  );
                }
                return null;
              }}
              className={isFetching ? "opacity-80" : ""}
            />
          </div>
        </GradientContainer>
      </main>

      <ConfirmationDialog
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isDeleting}
        actionType="delete"
      />

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
          const success = await handleRoleSubmit(formData);
          if (success) {
            setIsCreateOpen(false);
            setEditingRole(null);
            return { success: true };
          }
          return { errors: { form: "Failed to save role" } };
        }}
        submitButtonText={editingRole ? "Update Role" : "Add Role"}
      />
    </div>
  );
}
