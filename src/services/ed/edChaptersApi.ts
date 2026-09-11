import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, Chapter, PaginationParams } from "./types";

// Chapter-specific types
export type ChapterOverview = {
  chapter: Chapter;
  stats: {
    totalMembers?: number;
    activeMembers?: number;
    totalMeetings?: number;
    upcomingMeetings?: number;
    totalOpportunities?: number;
    closedOpportunities?: number;
    totalRevenue?: number;
    totalVisitors?: number;
    totalEvents?: number;
  };
  recentActivity?: any[];
};

export type CreateChapterInput = {
  name: string;
  code?: string;
  regionId?: string;
  city?: string;
  area?: string;
  status?: "ACTIVE" | "INACTIVE";
  launch_date?: string;
  meeting_date?: string;
  meeting_day?: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  meeting_weekday?: number;
  meeting_time?: string;
  meeting_mode?: "IN_PERSON" | "ONLINE" | "HYBRID";
  meeting_cadence?: "WEEKLY" | "ALTERNATE" | "MONTHLY";
  alternate_interval_weeks?: number;
  renewal_date?: string;
  createdByName?: string;
};

export type UpdateChapterInput = Partial<CreateChapterInput>;

export type UpdateChapterStatusInput = {
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
};

export type UpdateChapterRenewalInput = {
  renewalDate: string;
  expiryDate?: string;
};

export type ChaptersListParams = PaginationParams & {
  q?: string;
  regionId?: string;
  status?: string;
  city?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

/**
 * Executive Director Chapters API
 * Handles chapter management operations
 */
export const edChaptersApi = createApi({
  reducerPath: "edChaptersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdChapters", "EdChapterOverview", "EdRegionalBoard", "EdRegionChapters"],
  endpoints: (builder) => ({
    /**
     * List all chapters
     */
    getEdChapters: builder.query<
      PaginatedResponse<Chapter>,
      ChaptersListParams | void
    >({
      query: (params) => {
        // Default sorting parameters
        const defaultParams = {
          sort: 'name',  // or any other default field you want to sort by
          order: 'asc',
          ...(params || {})  // This allows overriding defaults with provided params
        };

        return {
          url: "admin/ed/chapters",
          params: defaultParams,
        };
      },
      providesTags: ["EdChapters"],
    }),

    /**
     * Get single chapter details
     */
    getEdChapter: builder.query<ApiResponse<Chapter>, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}`,
      }),
      providesTags: (_result, _error, chapterId) => [
        { type: "EdChapters", id: chapterId },
      ],
    }),

    /**
     * Get chapter overview (detailed stats)
     */
    getEdChapterOverview: builder.query<
      ApiResponse<ChapterOverview>, 
      { chapterId: string; from?: string; to?: string }
    >({
      query: ({ chapterId, from, to }) => {
        const params: any = {};
        if (from) params.from = from;
        if (to) params.to = to;
        
        return {
          url: `admin/ed/chapters/${chapterId}/overview`,
          params,
        };
      },
      providesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapterOverview", id: chapterId },
      ],
    }),

    /**
     * Get chapter members (paginated)
     */
    getEdChapterMembers: builder.query<
      PaginatedResponse<any>,
      { 
        chapterId: string; 
        sort?: string; 
        order?: "asc" | "desc"; 
        page?: number; 
        limit?: number;
        search?: string;
        area?: string;
        status?: "active" | "inactive" | "banned";
      }
    >({
      query: ({ 
        chapterId, 
        sort = "name", 
        order = "asc", 
        page = 1, 
        limit = 20,
        search,
        area,
        status
      }) => {
        const params: any = { sort, order, page, limit };
        if (search) params.search = search;
        if (area) params.area = area;
        if (status) params.status = status;
        
        return {
          url: `admin/ed/chapters/${chapterId}/members`,
          params,
        };
      },
      providesTags: (_res, _err, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
      ],
    }),

    /**
     * Get chapter members list with search and pagination
     */
    getChapterMembersList: builder.query<PaginatedResponse<any>, { 
      chapterId: string;
      limit?: number;
      search?: string;
    }>({
      query: ({ chapterId, limit = 10, search }) => ({
        url: `business/chapters/members`,
        params: { 
          chapterId,
          limit,
          ...(search && { search })
        },
      }),
      providesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
      ],
    }),

    /**
     * Create a new chapter
     */
    createEdChapter: builder.mutation<
      ApiResponse<Chapter>,
      CreateChapterInput
    >({
      query: (body) => ({
        url: "admin/ed/chapters",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdChapters", "EdRegionalBoard"],
    }),

    /**
     * Create chapter under specific region
     */
    createEdRegionChapter: builder.mutation<
      ApiResponse<Chapter>,
      { regionId: string; data: Omit<CreateChapterInput, "regionId"> }
    >({
      query: ({ regionId, data }) => ({
        url: `admin/ed/regions/${regionId}/chapters`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EdChapters", "EdRegionalBoard", "EdRegionChapters"],
    }),

    /**
     * Update chapter details
     */
    updateEdChapter: builder.mutation<
      ApiResponse<Chapter>,
      { chapterId: string; data: UpdateChapterInput }
    >({
      query: ({ chapterId, data }) => ({
        url: `admin/ed/chapters/${chapterId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
        { type: "EdChapterOverview", id: chapterId },
        "EdChapters",
        "EdRegionalBoard",
      ],
    }),

    /**
     * Update chapter status
     */
    updateEdChapterStatus: builder.mutation<
      ApiResponse<Chapter>,
      { chapterId: string; status: UpdateChapterStatusInput }
    >({
      query: ({ chapterId, status }) => ({
        url: `admin/ed/chapters/${chapterId}/status`,
        method: "PATCH",
        body: status,
      }),
      invalidatesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
        { type: "EdChapterOverview", id: chapterId },
        "EdChapters",
        "EdRegionalBoard",
      ],
    }),

    /**
     * Block/unblock chapter
     */
    blockEdChapter: builder.mutation<
      ApiResponse<Chapter>,
      { chapterId: string; blocked: boolean; reason?: string }
    >({
      query: ({ chapterId, blocked, reason }) => ({
        url: `admin/ed/chapters/${chapterId}/block`,
        method: "PATCH",
        body: { blocked, reason },
      }),
      invalidatesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
        { type: "EdChapterOverview", id: chapterId },
        "EdChapters",
        "EdRegionalBoard",
      ],
    }),

    /**
     * Update chapter renewal dates
     */
    updateEdChapterRenewal: builder.mutation<
      ApiResponse<Chapter>,
      { chapterId: string; renewal: UpdateChapterRenewalInput }
    >({
      query: ({ chapterId, renewal }) => ({
        url: `admin/ed/chapters/${chapterId}/renewal`,
        method: "PATCH",
        body: renewal,
      }),
      invalidatesTags: (_result, _error, { chapterId }) => [
        { type: "EdChapters", id: chapterId },
        { type: "EdChapterOverview", id: chapterId },
        "EdChapters",
      ],
    }),

    /**
     * Delete chapter
     */
    deleteEdChapter: builder.mutation<ApiResponse<void>, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdChapters", "EdRegionalBoard"],
    }),

    /**
     * Export chapter data
     */
    exportEdChapter: builder.mutation<Blob, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}/export`,
        method: "POST",
        responseHandler: (response) => response.blob(),
      }),
    }),

    /**
     * Rebuild future meetings for a chapter
     */
    rebuildFutureMeetings: builder.mutation<ApiResponse<void>, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}/meetings/rebuild`,
        method: "POST",
      }),
    }),

    /**
     * Rebuild all meetings for a chapter
     */
    rebuildAllMeetings: builder.mutation<ApiResponse<void>, string>({
      query: (chapterId) => ({
        url: `admin/ed/chapters/${chapterId}/meetings/rebuild?includeAll=true`,
        method: "POST",
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdChaptersQuery,
  useLazyGetEdChaptersQuery,
  useGetEdChapterQuery,
  useLazyGetEdChapterQuery,
  useGetEdChapterOverviewQuery,
  useLazyGetEdChapterOverviewQuery,
  useGetEdChapterMembersQuery,
  useGetChapterMembersListQuery,
  useCreateEdChapterMutation,
  useCreateEdRegionChapterMutation,
  useUpdateEdChapterMutation,
  useUpdateEdChapterStatusMutation,
  useBlockEdChapterMutation,
  useUpdateEdChapterRenewalMutation,
  useDeleteEdChapterMutation,
  useExportEdChapterMutation,
  useRebuildFutureMeetingsMutation,
  useRebuildAllMeetingsMutation,
} = edChaptersApi;
