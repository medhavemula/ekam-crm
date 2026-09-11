import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse } from "./types";

export type EdUser = {
  id: string;
  name: string;
  email?: string;
  chapterId?: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
};

export type ListUsersParams = {
  regionId?: string;
  chapterId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type EdScopeResponse = {
  success: boolean;
  data: {
    allowedRegionIds?: string[];
    allowedChapterIds?: string[];
  };
};

export const edUsersApi = createApi({
  reducerPath: "edUsersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdUsers"],
  endpoints: (builder) => ({
    // List ED users (scoped to caller). Optional filters: regionId, chapterId, q, pagination
    getEdUsers: builder.query<PaginatedResponse<EdUser>, ListUsersParams | void>({
      query: (params) => ({
        url: "admin/ed/users",
        params: params ?? {},
      }),
      providesTags: ["EdUsers"],
    }),
    getEdUsersByRegion: builder.query<PaginatedResponse<EdUser>, { regionId: string; q?: string; page?: number; limit?: number }>(
      {
        query: ({ regionId, ...params }) => ({
          url: `admin/ed/regions/${regionId}/users`,
          params,
        }),
        providesTags: (_res, _err, { regionId }) => [{ type: "EdUsers", id: `region-${regionId}` }],
      }
    ),

    getEdUsersByChapter: builder.query<
      PaginatedResponse<EdUser>,
      { chapterId: string; q?: string; page?: number; limit?: number; sort?: string; order?: "asc" | "desc" }
    >(
      {
        query: ({ chapterId, ...params }) => ({
          url: `admin/ed/chapters/${chapterId}/users`,
          params,
        }),
        providesTags: (_res, _err, { chapterId }) => [{ type: "EdUsers", id: `chapter-${chapterId}` }],
      }
    ),

    getEdScope: builder.query<EdScopeResponse, void>({
      query: () => ({ url: "admin/ed/scope" }),
    }),

    suggestEdUsers: builder.query<ApiResponse<EdUser[]>, { q?: string; limit?: number; regionId?: string; chapterId?: string }>(
      {
        query: ({ q, limit = 10, regionId, chapterId }) => ({
          url: `admin/ed/users/suggest`,
          params: {
            q: q ? q.trim() : "", // Always pass q, even if empty
            limit,
            ...(regionId ? { region_id: regionId } : {}),
            ...(chapterId ? { chapter_id: chapterId } : {}),
          },
        }),
      }
    ),
  }),
});

export const {
  useGetEdUsersQuery,
  useGetEdUsersByRegionQuery,
  useLazyGetEdUsersByRegionQuery,
  useGetEdUsersByChapterQuery,
  useLazyGetEdUsersByChapterQuery,
  useGetEdScopeQuery,
  useSuggestEdUsersQuery,
} = edUsersApi;
