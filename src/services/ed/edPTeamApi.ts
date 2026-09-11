import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

// Local PaginatedResponse type for PTeam API with flat structure
export type PaginatedResponse<T> = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  data: T[];
};

export type TeamRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: { id: string; name: string } | null;
  country?: { id: string; name: string } | null;
  region?: { id: string; name: string } | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  regionId?: string;
  status?: string;
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  permissions?: string[];
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

export type CreateUserInput = {
  name: string;
  email: string;
  phone?: string;
  roleId?: string; // optional at creation; can assign later
  countryId?: string;
  regionId?: string;
};

export type UpdateUserInput = {
  name?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  roleId?: string;
  countryId?: string;
  regionId?: string;
};

export type AssignUserRoleInput = {
  roleId: string;
};

const normId = (v: any): string => String(v?.id ?? v?._id ?? v ?? "");

const normalizeRole = (r: any): TeamRole => ({
  id: normId(r),
  name: r?.name ?? "",
  description: r?.description ?? null,
  permissions: Array.isArray(r?.permissions) ? r.permissions : [],
  createdAt: r?.createdAt ?? null,
  updatedAt: r?.updatedAt ?? null,
});

const normalizeUser = (u: any): TeamUser => {
  let roleObj: { id: string; name: string } | null = null;
  if (typeof u?.role === "string") {
    roleObj = { id: "", name: u.role };
  } else if (u?.role) {
    roleObj = {
      id: normId(u.role.id ?? u.role._id ?? u.role.roleId ?? u.role),
      name: u.role.name ?? u.roleName ?? "",
    };
  } else if (u?.roleId || u?.roleName) {
    roleObj = { id: normId(u.roleId), name: u.roleName ?? "" };
  }

  return {
    id: normId(u),
    name: u?.name ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? null,
    role: roleObj,
    country: u?.country
      ? { id: normId(u.country.id ?? u.country._id ?? u.country_id ?? u.countryId), name: u.country.name ?? u.countryName ?? "" }
      : u?.countryId
      ? { id: normId(u.countryId), name: u?.countryName ?? "" }
      : undefined,
    region: u?.region
      ? { id: normId(u.region.id ?? u.region._id ?? u.region_id ?? u.regionId), name: u.region.name ?? u.regionName ?? "" }
      : u?.regionId
      ? { id: normId(u.regionId), name: u?.regionName ?? "" }
      : undefined,
    status: u?.status ?? null,
    createdAt: u?.createdAt ?? null,
    updatedAt: u?.updatedAt ?? null,
  };
};

export const edPTeamApi = createApi({
  reducerPath: "edPTeamApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["PTeamRoles", "PTeamUsers"],
  endpoints: (builder) => ({
    listPTeamRoles: builder.query<PaginatedResponse<TeamRole>, ListParams | void>({
      query: (params) => ({
        url: "admin/ed/pteam/roles",
        params: { page: params?.page ?? 1, limit: params?.limit ?? 24 },
      }),
      transformResponse: (resp: any): PaginatedResponse<TeamRole> => {
        const items = resp?.data?.items ?? resp?.data ?? [];
        const page = resp?.data?.page ?? resp?.page ?? 1;
        const limit = resp?.data?.limit ?? resp?.limit ?? 24;
        const total = resp?.data?.total ?? resp?.total ?? items.length;
        return { success: !!resp?.success, page, limit, total, data: items.map(normalizeRole) };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((r) => ({ type: "PTeamRoles" as const, id: r.id })),
              { type: "PTeamRoles" as const, id: "LIST" },
            ]
          : [{ type: "PTeamRoles" as const, id: "LIST" }],
    }),

    createPTeamRole: builder.mutation<{ success: boolean; data: TeamRole }, CreateRoleInput>({
      query: (body) => ({ url: "admin/ed/pteam/roles", method: "POST", body }),
      transformResponse: (resp: any) => ({ success: !!resp?.success, data: normalizeRole(resp?.data ?? resp) }),
      invalidatesTags: [{ type: "PTeamRoles", id: "LIST" }],
    }),

    updatePTeamRole: builder.mutation<{ success: boolean; data: TeamRole }, { id: string; body: UpdateRoleInput }>({
      query: ({ id, body }) => ({ url: `admin/ed/pteam/roles/${id}`, method: "PATCH", body }),
      transformResponse: (resp: any) => ({ success: !!resp?.success, data: normalizeRole(resp?.data ?? resp) }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "PTeamRoles", id },
        { type: "PTeamRoles", id: "LIST" },
      ],
    }),

    deletePTeamRole: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/ed/pteam/roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [
        { type: "PTeamRoles", id },
        { type: "PTeamRoles", id: "LIST" },
      ],
    }),

    listPTeamUsers: builder.query<PaginatedResponse<TeamUser>, ListParams | void>({
      query: (params) => ({
        url: "admin/ed/pteam/users",
        params: { page: params?.page ?? 1, limit: params?.limit ?? 24 },
      }),
      transformResponse: (resp: any): PaginatedResponse<TeamUser> => {
        const items = resp?.data?.items ?? resp?.data ?? [];
        const page = resp?.data?.page ?? resp?.page ?? 1;
        const limit = resp?.data?.limit ?? resp?.limit ?? 24;
        const total = resp?.data?.total ?? resp?.total ?? items.length;
        return { success: !!resp?.success, page, limit, total, data: items.map(normalizeUser) };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((u) => ({ type: "PTeamUsers" as const, id: u.id })),
              { type: "PTeamUsers" as const, id: "LIST" },
            ]
          : [{ type: "PTeamUsers" as const, id: "LIST" }],
    }),

    createPTeamUser: builder.mutation<{ success: boolean; data?: TeamUser }, CreateUserInput>({
      query: (body) => ({ url: "admin/ed/pteam/users", method: "POST", body }),
      transformResponse: (resp: any) => {
        if (resp == null) return { success: true, data: undefined };
        const raw = resp?.data ?? resp;
        if (raw && typeof raw === "object") {
          try { return { success: !!(resp?.success ?? true), data: normalizeUser(raw) }; }
          catch { return { success: !!(resp?.success ?? true), data: undefined }; }
        }
        return { success: !!(resp?.success ?? true), data: undefined };
      },
      invalidatesTags: [{ type: "PTeamUsers", id: "LIST" }],
    }),

    updatePTeamUser: builder.mutation<{ success: boolean; data?: TeamUser }, { id: string; body: UpdateUserInput }>({
      query: ({ id, body }) => ({ url: `admin/ed/pteam/users/${id}`, method: "PATCH", body }),
      transformResponse: (resp: any) => {
        if (resp == null) return { success: true, data: undefined };
        const raw = resp?.data ?? resp;
        if (raw && typeof raw === "object") {
          try { return { success: !!(resp?.success ?? true), data: normalizeUser(raw) }; }
          catch { return { success: !!(resp?.success ?? true), data: undefined }; }
        }
        return { success: !!(resp?.success ?? true), data: undefined };
      },
      invalidatesTags: (_res, _err, { id }) => [
        { type: "PTeamUsers", id },
        { type: "PTeamUsers", id: "LIST" },
      ],
    }),

    deletePTeamUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/ed/pteam/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [
        { type: "PTeamUsers", id },
        { type: "PTeamUsers", id: "LIST" },
      ],
    }),

    assignPTeamUserRole: builder.mutation<{ success: boolean }, { id: string; body: AssignUserRoleInput }>({
      query: ({ id, body }) => ({ url: `admin/ed/pteam/users/${id}/roles`, method: "POST", body }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "PTeamUsers", id },
        { type: "PTeamUsers", id: "LIST" },
      ],
    }),

    registerMemberDirect: builder.mutation<{ success: boolean; message: string; data?: { userId: string; email: string } }, any>({
      query: (body) => ({ url: "admin/ed/pteam/register-member", method: "POST", body }),
      transformResponse: (resp: any) => ({
        success: !!resp?.success,
        message: resp?.message || "",
        data: resp?.data || undefined,
      }),
    }),
  }),
});

export const {
  useListPTeamRolesQuery,
  useLazyListPTeamRolesQuery,
  useCreatePTeamRoleMutation,
  useUpdatePTeamRoleMutation,
  useDeletePTeamRoleMutation,
  useListPTeamUsersQuery,
  useLazyListPTeamUsersQuery,
  useCreatePTeamUserMutation,
  useUpdatePTeamUserMutation,
  useDeletePTeamUserMutation,
  useAssignPTeamUserRoleMutation,
  useRegisterMemberDirectMutation,
} = edPTeamApi;
