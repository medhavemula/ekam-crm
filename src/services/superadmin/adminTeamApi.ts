import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

/**
 * ---------- Types ----------
 */
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

export type PaginatedResponse<T> = {
    success: boolean;
    page: number;
    limit: number;
    total: number;
    data: T[];
};

export type ListTeamRolesParams = {
    page?: number;
    limit?: number;
};

export type ListTeamUsersParams = {
    page?: number;
    limit?: number;
};

export type CreateTeamRoleInput = {
    name: string;
    description?: string;
    permissions?: string[];
};

export type CreateTeamUserInput = {
    name: string;
    email: string;
    phone?: string;
    roleId: string;
    countryId?: string;
    regionId?: string;
};

export type CreateEDTeamInput = {
    name: string;
    email: string;
    phone: string;
    role_code: 'REGIONAL_DIRECTOR' | 'ASSISTANT_REGIONAL_DIRECTOR' | string;
    scope: 'REGION' | 'COUNTRY' | string;
    country_id: string;
    region_id: string;
    is_primary: boolean;
    start_date: string;
};

export type EDTeamMember = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    country: { id: string; name: string };
    region: { id: string; name: string };
    created_at: string;
    updated_at: string;
};

export type UpdateTeamUserInput = {
  name?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  roleId?: string;
  countryId?: string;
  regionId?: string;
};

/**
 * ---------- Helpers ----------
 */
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
    // handle role arriving as string, object, or via roleId/roleName
    let roleObj: { id: string; name: string } | null = null;

    if (typeof u?.role === "string") {
        roleObj = { id: "", name: u.role }; // backend sent the role label directly
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

/**
 * ---------- API ----------
 * NOTE: Assumes baseQueryWithReauth has baseUrl '/api/v1'.
 * So we use 'admin/team/...' here (not the absolute '/api/v1/...').
 */
export const adminTeamApi = createApi({
    reducerPath: "adminTeamApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["TeamRoles", "TeamUsers", "EDTeam"],
    endpoints: (builder) => ({
        listTeamRoles: builder.query<PaginatedResponse<TeamRole>, ListTeamRolesParams | void>({
            query: (params) => ({
                url: "admin/team/roles",
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
                        ...result.data.map((r) => ({ type: "TeamRoles" as const, id: r.id })),
                        { type: "TeamRoles" as const, id: "LIST" },
                    ]
                    : [{ type: "TeamRoles" as const, id: "LIST" }],
        }),

        createTeamRole: builder.mutation<{ success: boolean; data: TeamRole }, CreateTeamRoleInput>({
            query: (body) => ({ url: "admin/team/roles", method: "POST", body }),
            transformResponse: (resp: any) => ({ success: !!resp?.success, data: normalizeRole(resp?.data ?? resp) }),
            invalidatesTags: [{ type: "TeamRoles", id: "LIST" }],
        }),

        updateTeamRole: builder.mutation<{ success: boolean; data: TeamRole }, { id: string; body: Partial<CreateTeamRoleInput> }>({
            query: ({ id, body }) => ({
                url: `admin/team/roles/${id}`,
                method: "PATCH",
                body,
            }),
            transformResponse: (resp: any) => ({ success: !!resp?.success, data: normalizeRole(resp?.data ?? resp) }),
            invalidatesTags: (_, __, { id }) => [
                { type: "TeamRoles", id },
                { type: "TeamRoles", id: "LIST" },
            ],
        }),

        listTeamUsers: builder.query<PaginatedResponse<TeamUser>, ListTeamUsersParams | void>({
            query: (params) => ({
                url: "admin/team/users",
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
                        ...result.data.map((u) => ({ type: "TeamUsers" as const, id: u.id })),
                        { type: "TeamUsers" as const, id: "LIST" },
                    ]
                    : [{ type: "TeamUsers" as const, id: "LIST" }],
        }),

        createTeamUser: builder.mutation<{ success: boolean; data?: TeamUser }, CreateTeamUserInput>({
            query: (body) => ({ url: "admin/team/users", method: "POST", body }),
            transformResponse: (resp: any) => {
                // tolerate 201/204/no body
                if (resp == null) return { success: true, data: undefined };
                const raw = resp?.data ?? resp;
                if (raw && typeof raw === "object") {
                    try { return { success: !!(resp?.success ?? true), data: normalizeUser(raw) }; }
                    catch { return { success: !!(resp?.success ?? true), data: undefined }; }
                }
                return { success: !!(resp?.success ?? true), data: undefined };
            },
            invalidatesTags: [{ type: "TeamUsers", id: "LIST" }],
        }),
        updateTeamUser: builder.mutation<{ success: boolean; data?: TeamUser }, { id: string; body: UpdateTeamUserInput }>({
  query: ({ id, body }) => ({
    url: `admin/team/users/${id}`,
    method: "PATCH",
    body,
  }),
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
    { type: "TeamUsers", id },
    { type: "TeamUsers", id: "LIST" },
  ],
}),
        deleteTeamUser: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({ url: `admin/team/users/${id}`, method: "DELETE" }),
            invalidatesTags: (_res, _err, id) => [
                { type: "TeamUsers", id },
                { type: "TeamUsers", id: "LIST" },
            ],
        }),

        deleteTeamRole: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({ url: `admin/team/roles/${id}`, method: "DELETE" }),
            invalidatesTags: (_res, _err, id) => [
                { type: "TeamRoles", id },
                { type: "TeamRoles", id: "LIST" },
            ],
        }),
        // Super Admin Team Management
        listEDTeam: builder.query<PaginatedResponse<EDTeamMember>, { page?: number; limit?: number }>({
            query: (params = {}) => ({
                url: 'admin/ed/team',
                params: {
                    page: params.page || 1,
                    limit: params.limit || 10,
                },
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'EDTeam' as const, id })),
                          { type: 'EDTeam' as const, id: 'LIST' },
                      ]
                    : [{ type: 'EDTeam' as const, id: 'LIST' }],
        }),

        createEDTeam: builder.mutation<EDTeamMember, CreateEDTeamInput>({
            query: (data) => ({
                url: 'admin/ed/team',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'EDTeam' as const, id: 'LIST' }],
        }),

        updateEDTeam: builder.mutation<EDTeamMember, { id: string; data: Partial<CreateEDTeamInput> }>({
            query: ({ id, data }) => ({
                url: `admin/ed/team/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_, __, { id }) => [
                { type: 'EDTeam' as const, id },
                { type: 'EDTeam' as const, id: 'LIST' },
            ],
        }),

        deleteEDTeam: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: `admin/ed/team/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_, __, id) => [
                { type: 'EDTeam' as const, id },
                { type: 'EDTeam' as const, id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useListTeamRolesQuery,
    useLazyListTeamRolesQuery,
    useCreateTeamRoleMutation,
    useUpdateTeamRoleMutation,
    useDeleteTeamRoleMutation,
    useListTeamUsersQuery,
    useLazyListTeamUsersQuery,
    useCreateTeamUserMutation,
    useUpdateTeamUserMutation,
    useDeleteTeamUserMutation,
    // ED Team mutations
    useListEDTeamQuery,
    useLazyListEDTeamQuery,
    useCreateEDTeamMutation,
    useUpdateEDTeamMutation,
    useDeleteEDTeamMutation,
} = adminTeamApi;
