import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";
import type { Role } from "../config/roles";

export type UserRole = {
  role: Role;
  isPrimary: boolean;
  scope?: {
    chapter?: {
      id: string;
      name: string;
    };
  };
};

export type UserRolesResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    assignments: UserRole[];
    primaryRole: UserRole;
  };
};

export type UpdatePrimaryRoleRequest = {
  role: Role;
};

export type UpdatePrimaryRoleResponse = {
  success: boolean;
  data: {
    role: Role;
    message: string;
  };
};

export const userRolesApi = createApi({
  reducerPath: "userRolesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["UserRoles"],
  endpoints: (builder) => ({
    getUserRoles: builder.query<UserRolesResponse, void>({
      query: () => ({
        url: "user/profile/roles",
        method: "GET",
      }),
      providesTags: ["UserRoles"],
    }),
    updatePrimaryRole: builder.mutation<UpdatePrimaryRoleResponse, UpdatePrimaryRoleRequest>({
      query: ({ role }) => ({
        url: "user/profile/roles/primary",
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["UserRoles"],
    }),
  }),
});

export const {
  useGetUserRolesQuery: useUserRolesQuery,
  useUpdatePrimaryRoleMutation: useUpdatePrimaryRoleMutation,
} = userRolesApi;
