import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialTeamUsersParams,
  SocialTeamUsersResponse,
  CreateSocialTeamUserParams,
  UpdateSocialTeamUserParams,
  SocialTeamRolesParams,
  SocialTeamRolesResponse,
  CreateSocialTeamRoleParams,
  UpdateSocialTeamRoleParams,
} from "./types";

export const socialTeamApi = createApi({
  reducerPath: "socialTeamApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialTeamUsers", "SocialTeamRoles"],
  endpoints: (builder) => ({
    // Team Users
    getSocialTeamUsers: builder.query<SocialTeamUsersResponse, SocialTeamUsersParams>({
      query: (params) => ({
        url: "/admin/sc/social/team/users",
        method: "GET",
        params,
      }),
      providesTags: ["SocialTeamUsers"],
    }),

    createSocialTeamUser: builder.mutation<{ success: boolean }, CreateSocialTeamUserParams>({
      query: (body) => ({
        url: "/admin/sc/social/team/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialTeamUsers"],
    }),

    updateSocialTeamUser: builder.mutation<{ success: boolean }, UpdateSocialTeamUserParams>({
      query: ({ id, ...body }) => ({
        url: `/admin/sc/social/team/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SocialTeamUsers"],
    }),

    removeSocialTeamUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/sc/social/team/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialTeamUsers"],
    }),

    // Team Roles
    getSocialTeamRoles: builder.query<SocialTeamRolesResponse, SocialTeamRolesParams>({
      query: (params) => ({
        url: "/admin/sc/social/team/roles",
        method: "GET",
        params,
      }),
      providesTags: ["SocialTeamRoles"],
    }),

    createSocialTeamRole: builder.mutation<{ success: boolean; data: { id: string } }, CreateSocialTeamRoleParams>({
      query: (body) => ({
        url: "/admin/sc/social/team/roles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialTeamRoles"],
    }),

    updateSocialTeamRole: builder.mutation<{ success: boolean }, UpdateSocialTeamRoleParams>({
      query: ({ id, ...body }) => ({
        url: `/admin/sc/social/team/roles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SocialTeamRoles"],
    }),

    deleteSocialTeamRole: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/sc/social/team/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialTeamRoles"],
    }),
  }),
});

export const {
  useGetSocialTeamUsersQuery,
  useCreateSocialTeamUserMutation,
  useUpdateSocialTeamUserMutation,
  useRemoveSocialTeamUserMutation,
  useGetSocialTeamRolesQuery,
  useCreateSocialTeamRoleMutation,
  useUpdateSocialTeamRoleMutation,
  useDeleteSocialTeamRoleMutation,
} = socialTeamApi;
