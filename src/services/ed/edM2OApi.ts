import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// M2O (Many-to-One) specific types
export type M2ORecord = {
  id: string;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  chapterId: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
  amount?: number;
  category?: string;
  description?: string;
  date: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
};

export type CreateM2OInput = {
  giverId: string;
  receiverId: string;
  chapterId: string;
  amount?: number;
  category?: string;
  description?: string;
  date: string;
};

export type UpdateM2OInput = Partial<CreateM2OInput> & {
  status?: "PENDING" | "APPROVED" | "REJECTED";
};

export type M2OListParams = EdFilterParams & {
  chapterId?: string;
  giverId?: string;
  receiverId?: string;
  status?: string;
};

/**
 * Executive Director M2O (Many-to-One) API
 * Handles many-to-one referrals and transactions
 */
export const edM2OApi = createApi({
  reducerPath: "edM2OApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdM2O", "EdM2ODetails"],
  endpoints: (builder) => ({
    /**
     * List all M2O records
     */
    getEdM2OList: builder.query<
      PaginatedResponse<M2ORecord>,
      M2OListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/m2o",
        params: params ?? {},
      }),
      providesTags: ["EdM2O"],
    }),

    /**
     * Get single M2O record details
     */
    getEdM2O: builder.query<ApiResponse<M2ORecord>, string>({
      query: (m2oId) => ({
        url: `admin/ed/m2o/${m2oId}`,
      }),
      providesTags: (_result, _error, m2oId) => [
        { type: "EdM2ODetails", id: m2oId },
      ],
    }),

    /**
     * Create a new M2O record
     */
    createEdM2O: builder.mutation<ApiResponse<M2ORecord>, CreateM2OInput>({
      query: (body) => ({
        url: "admin/ed/m2o",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdM2O"],
    }),

    /**
     * Create a new M2O under a specific Chapter (chapter-scoped endpoint)
     * Endpoint: /admin/ed/chapters/{chapterId}/m2o
     * Body: { targetMemberId: string; date: string }
     */
    /**
     * Submit M2O meeting data
     */
    submitEdM2O: builder.mutation<ApiResponse<M2ORecord>, { m2oId: string; data: any }>({
      query: ({ m2oId, data }) => ({
        url: `admin/ed/m2o/${m2oId}/submit`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['EdM2O', 'EdM2ODetails'],
    }),

    /**
     * Update M2O lines data
     */
    updateM2OLines: builder.mutation<ApiResponse<any>, { m2oId: string; data: any }>({
      query: ({ m2oId, data }) => ({
        url: `admin/ed/m2o/${m2oId}/lines`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['EdM2ODetails'],
    }),

    /**
     * Create a new M2O under a specific Chapter (chapter-scoped endpoint)
     * Endpoint: /admin/ed/chapters/{chapterId}/m2o
     * Body: { targetMemberId: string; date: string }
     */
    createEdChapterM2O: builder.mutation<
      ApiResponse<M2ORecord>,
      { chapterId: string; targetMemberId: string; date: string }
    >({
      query: ({ chapterId, targetMemberId, date }) => ({
        url: `admin/ed/chapters/${chapterId}/m2o`,
        method: "POST",
        body: { targetMemberId, date },
      }),
      invalidatesTags: ["EdM2O"],
    }),

    /**
     * Update M2O record
     */
    updateEdM2O: builder.mutation<
      ApiResponse<M2ORecord>,
      { m2oId: string; data: UpdateM2OInput }
    >({
      query: ({ m2oId, data }) => ({
        url: `admin/ed/m2o/${m2oId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { m2oId }) => [
        { type: "EdM2ODetails", id: m2oId },
        "EdM2O",
      ],
    }),

    /**
     * Delete M2O record
     */
    deleteEdM2O: builder.mutation<ApiResponse<void>, string>({
      query: (m2oId) => ({
        url: `admin/ed/m2o/${m2oId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdM2O"],
    }),

    /**
     * Export M2O data
     */
    exportEdM2O: builder.mutation<Blob, M2OListParams | void>({
      query: (params) => ({
        url: "admin/ed/m2o/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),

    /**
     * Approve M2O record
     */
    approveEdM2O: builder.mutation<ApiResponse<M2ORecord>, string>({
      query: (m2oId) => ({
        url: `admin/ed/m2o/${m2oId}/approve`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, m2oId) => [
        { type: "EdM2ODetails", id: m2oId },
        "EdM2O",
      ],
    }),

    /**
     * Unlock M2O record for editing
     */
    unlockEdM2O: builder.mutation<ApiResponse<M2ORecord>, string>({
      query: (m2oId) => ({
        url: `admin/ed/m2o/${m2oId}/unlock`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, m2oId) => [
        { type: "EdM2ODetails", id: m2oId },
        "EdM2O",
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdM2OListQuery,
  useLazyGetEdM2OListQuery,
  useGetEdM2OQuery,
  useLazyGetEdM2OQuery,
  useCreateEdM2OMutation,
  useCreateEdChapterM2OMutation,
  useUpdateEdM2OMutation,
  useDeleteEdM2OMutation,
  useExportEdM2OMutation,
  useApproveEdM2OMutation,
  useSubmitEdM2OMutation,
  useUnlockEdM2OMutation,
  useUpdateM2OLinesMutation,
} = edM2OApi;
