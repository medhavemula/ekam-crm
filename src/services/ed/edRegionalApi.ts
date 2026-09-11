import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, Region, Chapter, PaginationParams } from "./types";

// Regional Board specific types
export type RegionalBoardChapter = {
  id: string;
  chapterName: string;
  location: string;
  regionName?: string;
  memberCount: number;
  status?: string;
};

export type RegionalBoardParams = PaginationParams & {
  q?: string; // search query
};

export type RegionalBoardResponse = {
  success: boolean;
  data: {
    chapters: RegionalBoardChapter[];
    regions?: Region[];
    page: number;
    limit: number;
    total: number;
  };
  request_id?: string;
};

export type CreateRegionInput = {
  name: string;
  code?: string;
  countryId: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type UpdateRegionInput = Partial<CreateRegionInput>;

export type UpdateRegionStatusInput = {
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
};

/**
 * Executive Director Regional API
 * Handles regional board, regions, and related operations
 */
export const edRegionalApi = createApi({
  reducerPath: "edRegionalApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdRegionalBoard", "EdRegions", "EdRegionChapters"],
  endpoints: (builder) => ({
    /**
     * Get regional board view with chapters
     */
    getEdRegionalBoard: builder.query<
      RegionalBoardResponse,
      RegionalBoardParams | void
    >({
      query: (params) => ({
        url: "admin/ed/regional-board",
        params: params ?? {},
      }),
      providesTags: ["EdRegionalBoard"],
    }),

    /**
     * List all regions accessible by the ED
     */
    getEdRegions: builder.query<PaginatedResponse<Region>, void>({
      query: () => ({
        url: "admin/ed/regions",
      }),
      providesTags: ["EdRegions"],
    }),

    /**
     * Get single region details
     */
    getEdRegion: builder.query<ApiResponse<Region>, string>({
      query: (regionId) => ({
        url: `admin/ed/regions/${regionId}`,
      }),
      providesTags: (_result, _error, regionId) => [
        { type: "EdRegions", id: regionId },
      ],
    }),

    /**
     * Create a new region
     */
    createEdRegion: builder.mutation<ApiResponse<Region>, CreateRegionInput>({
      query: (body) => ({
        url: "admin/ed/regions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdRegions", "EdRegionalBoard"],
    }),

    /**
     * Update region details
     */
    updateEdRegion: builder.mutation<
      ApiResponse<Region>,
      { regionId: string; data: UpdateRegionInput }
    >({
      query: ({ regionId, data }) => ({
        url: `admin/ed/regions/${regionId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { regionId }) => [
        { type: "EdRegions", id: regionId },
        "EdRegions",
        "EdRegionalBoard",
      ],
    }),

    /**
     * Update region status
     */
    updateEdRegionStatus: builder.mutation<
      ApiResponse<Region>,
      { regionId: string; status: UpdateRegionStatusInput }
    >({
      query: ({ regionId, status }) => ({
        url: `admin/ed/regions/${regionId}/status`,
        method: "PATCH",
        body: status,
      }),
      invalidatesTags: (_result, _error, { regionId }) => [
        { type: "EdRegions", id: regionId },
        "EdRegions",
        "EdRegionalBoard",
      ],
    }),

    /**
     * Get chapters for a specific region
     */
    getEdRegionChapters: builder.query<
      PaginatedResponse<Chapter>,
      string
    >({
      query: (regionId) => ({
        url: `admin/ed/regions/${regionId}/chapters`,
      }),
      providesTags: (_result, _error, regionId) => [
        { type: "EdRegionChapters", id: regionId },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdRegionalBoardQuery,
  useLazyGetEdRegionalBoardQuery,
  useGetEdRegionsQuery,
  useLazyGetEdRegionsQuery,
  useGetEdRegionQuery,
  useLazyGetEdRegionQuery,
  useCreateEdRegionMutation,
  useUpdateEdRegionMutation,
  useUpdateEdRegionStatusMutation,
  useGetEdRegionChaptersQuery,
  useLazyGetEdRegionChaptersQuery,
} = edRegionalApi;
