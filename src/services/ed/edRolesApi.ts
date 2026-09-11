import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, Role } from "./types";

// Roles-specific types
export type RoleListParams = {
  scope?: "COUNTRY" | "REGION" | "CHAPTER";
};

/**
 * Executive Director Roles API
 * Handles role definitions and permissions
 */
export const edRolesApi = createApi({
  reducerPath: "edRolesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdRoles"],
  endpoints: (builder) => ({
    /**
     * List all available roles
     */
    getEdRoles: builder.query<
      ApiResponse<Role[]>,
      RoleListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/roles",
        params: params ?? {},
      }),
      providesTags: ["EdRoles"],
    }),

    /**
     * Get single role details
     */
    getEdRole: builder.query<ApiResponse<Role>, string>({
      query: (roleCode) => ({
        url: `admin/ed/roles/${roleCode}`,
      }),
      providesTags: (_result, _error, roleCode) => [
        { type: "EdRoles", id: roleCode },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdRolesQuery,
  useLazyGetEdRolesQuery,
  useGetEdRoleQuery,
  useLazyGetEdRoleQuery,
} = edRolesApi;
