import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  CreateSocialChapterParams,
  SocialChapterOverviewResponse,
  SocialChapterMembersParams,
  SocialChapterMembersResponse,
} from "./types";

export const socialChaptersApi = createApi({
  reducerPath: "socialChaptersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialChapter", "SocialChapterMembers", "SocialRegionalBoard"],
  endpoints: (builder) => ({
    createSocialChapter: builder.mutation<{ success: boolean; data: { id: string } }, CreateSocialChapterParams>({
      query: (body) => ({
        url: "/admin/sc/social/chapters",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialRegionalBoard"],
    }),

    getSocialChapterOverview: builder.query<SocialChapterOverviewResponse, string>({
      query: (socialChapterId) => ({
        url: `/admin/sc/social/chapters/${socialChapterId}/overview`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "SocialChapter", id }],
    }),

    getSocialChapterMembers: builder.query<SocialChapterMembersResponse, SocialChapterMembersParams>({
      query: ({ socialChapterId, ...params }) => ({
        url: `/admin/sc/social/chapters/${socialChapterId}/members`,
        method: "GET",
        params,
      }),
      providesTags: (_result, _error, { socialChapterId }) => [
        { type: "SocialChapterMembers", id: socialChapterId },
      ],
    }),

    addSocialChapterMember: builder.mutation<{ success: boolean }, { socialChapterId: string; userId: string }>({
      query: ({ socialChapterId, userId }) => ({
        url: `/admin/sc/social/chapters/${socialChapterId}/members`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { socialChapterId }) => [
        { type: "SocialChapterMembers", id: socialChapterId },
        { type: "SocialChapter", id: socialChapterId },
      ],
    }),

    removeSocialChapterMember: builder.mutation<{ success: boolean }, { socialChapterId: string; userId: string }>({
      query: ({ socialChapterId, userId }) => ({
        url: `/admin/sc/social/chapters/${socialChapterId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { socialChapterId }) => [
        { type: "SocialChapterMembers", id: socialChapterId },
        { type: "SocialChapter", id: socialChapterId },
      ],
    }),
  }),
});

export const {
  useCreateSocialChapterMutation,
  useGetSocialChapterOverviewQuery,
  useGetSocialChapterMembersQuery,
  useAddSocialChapterMemberMutation,
  useRemoveSocialChapterMemberMutation,
} = socialChaptersApi;
