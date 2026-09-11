import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, EdFilterParams } from "./types";

// PALMS-specific types
export type PalmsAttendance = {
  meetingId: string;
  meetingDate: string;
  chapterId: string;
  chapterName?: string;
  members: Array<{
    memberId: string;
    memberName: string;
    present: boolean;
    absent: boolean;
    late: boolean;
    makeUp: boolean;
    substitute: boolean;
  }>;
  totalMembers?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  makeUpCount?: number;
  substituteCount?: number;
};

export type PalmsListParams = EdFilterParams & {
  chapterId?: string;
  meetingId?: string;
};

export interface BulkPalmsUpsertInput {
  meetingId: string;
  idempotencyKey: string;
  entries: Array<{
    memberId: string;
    attendance: 'P' | 'A' | 'L' | 'M' | 'S';
    bor: number;
    bog: number;
    visitors: number;
    p2p: number;
    businessClosed: number;
    testimonials: number;
  }>;
};

/**
 * Executive Director PALMS API
 * Handles PALMS (attendance) data
 */
export const edPalmsApi = createApi({
  reducerPath: "edPalmsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdPalms"],
  endpoints: (builder) => ({
    /**
     * View PALMS attendance for a meeting
     */
    getEdPalmsAttendance: builder.query<
      ApiResponse<PalmsAttendance>,
      { meetingId: string }
    >({
      query: ({ meetingId }) => ({
        url: `admin/ed/palms/${meetingId}`,
      }),
      providesTags: (_result, _error, { meetingId }) => [
        { type: "EdPalms", id: meetingId },
      ],
    }),

    /**
     * Bulk upsert PALMS attendance
     */
    bulkUpsertEdPalms: builder.mutation<
      ApiResponse<void>,
      BulkPalmsUpsertInput
    >({
      query: (body) => ({
        url: `admin/ed/palms/${body.meetingId}/bulk-upsert`,
        method: "PUT",
        body: {
          ...body,
          meetingId: undefined // Remove meetingId from the body since it's in the URL
        },
      }),
      invalidatesTags: (_result, _error, { meetingId }) => [
        { type: "EdPalms", id: meetingId },
        "EdPalms",
      ],
    }),

    /**
     * Export PALMS data
     */
    exportEdPalms: builder.mutation<Blob, PalmsListParams | void>({
      query: (params) => ({
        url: "admin/ed/palms/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdPalmsAttendanceQuery,
  useLazyGetEdPalmsAttendanceQuery,
  useBulkUpsertEdPalmsMutation,
  useExportEdPalmsMutation,
} = edPalmsApi;
