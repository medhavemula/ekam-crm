import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type ChapterSearchResult = {
  id: string;
  name: string;
};

export type ChapterSearchParams = {
  q?: string;
  limit?: number;
};

export type ChapterActionResponse = {
  success: boolean;
  message: string;
};

export const chaptersApi = createApi({
  reducerPath: "chaptersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Chapters"],
  endpoints: (builder) => ({
    searchChapters: builder.query<{ success: boolean; data: ChapterSearchResult[] }, ChapterSearchParams>({
      query: (params) => ({
        url: "chapters/search",
        params,
      }),
      providesTags: ["Chapters"],
    }),
    blockChapter: builder.mutation<ChapterActionResponse, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}/block`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Chapters'],
    }),
    deleteChapter: builder.mutation<ChapterActionResponse, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}/hard`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chapters'],
    }),
  }),
});

export const { 
  useSearchChaptersQuery, 
  useLazySearchChaptersQuery,
  useBlockChapterMutation,
  useDeleteChapterMutation,
} = chaptersApi;
