import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialRegionalTeamListParams,
  SocialRegionalTeamListResponse,
  SocialRegionalTeamOverviewResponse,
  CreateSocialRegionalTeamMemberParams,
  UpdateSocialRegionalTeamMemberParams,
  SocialRegionalTeamRolesResponse,
  SocialRegionalTeamUsersSearchParams,
  SocialRegionalTeamUsersSearchResponse,
} from "./types";

export const socialRegionalTeamApi = createApi({
  reducerPath: "socialRegionalTeamApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialRegionalTeam"],
  endpoints: (builder) => ({
    getSocialRegionalTeam: builder.query<SocialRegionalTeamListResponse, SocialRegionalTeamListParams | void>({
      query: (params) => ({
        url: "/admin/sc/social/regional-team",
        method: "GET",
        params: params ? params : {},
      }),
      providesTags: ["SocialRegionalTeam"],
    }),

    getSocialRegionalTeamMemberOverview: builder.query<SocialRegionalTeamOverviewResponse, string>({
      query: (id) => ({
        url: `/admin/sc/social/regional-team/${id}`,
        method: "GET",
      }),
      providesTags: ["SocialRegionalTeam"],
    }),

    getSocialRegionalTeamRoles: builder.query<SocialRegionalTeamRolesResponse, void>({
      query: () => ({
        url: "/admin/sc/social/regional-team/roles",
        method: "GET",
      }),
    }),

    searchSocialRegionalTeamUsers: builder.query<
      SocialRegionalTeamUsersSearchResponse,
      SocialRegionalTeamUsersSearchParams | void
    >({
      query: (params) => ({
        url: "/admin/sc/social/regional-team/users/search",
        method: "GET",
        params: params ? params : {},
      }),
    }),

    createSocialRegionalTeamMember: builder.mutation<{ success: boolean; data?: any }, CreateSocialRegionalTeamMemberParams>({
      query: (body) => ({
        url: "/admin/sc/social/regional-team",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialRegionalTeam"],
    }),

    updateSocialRegionalTeamMember: builder.mutation<{ success: boolean; data?: any }, UpdateSocialRegionalTeamMemberParams>({
      query: ({ id, ...body }) => ({
        url: `/admin/sc/social/regional-team/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SocialRegionalTeam"],
    }),

    removeSocialRegionalTeamMember: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/sc/social/regional-team/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialRegionalTeam"],
    }),
  }),
});

export const {
  useGetSocialRegionalTeamQuery,
  useGetSocialRegionalTeamMemberOverviewQuery,
  useGetSocialRegionalTeamRolesQuery,
  useSearchSocialRegionalTeamUsersQuery,
  useCreateSocialRegionalTeamMemberMutation,
  useUpdateSocialRegionalTeamMemberMutation,
  useRemoveSocialRegionalTeamMemberMutation,
} = socialRegionalTeamApi;
