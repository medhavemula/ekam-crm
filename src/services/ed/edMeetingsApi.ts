import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// Meetings-specific types
export type Meeting = {
  id: string;
  chapterId: string;
  chapterName?: string;
  meetingDate: string;
  meetingType?: "REGULAR" | "SPECIAL" | "BOARD";
  location?: string;
  attendanceCount?: number;
  totalMembers?: number;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  agenda?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MeetingDetails = Meeting & {
  attendees?: Array<{
    memberId: string;
    memberName: string;
    attended: boolean;
    role?: string;
  }>;
  minutes?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
};

export type CreateMeetingInput = {
  chapterId: string;
  meetingDate: string;
  meetingType?: "REGULAR" | "SPECIAL" | "BOARD";
  location?: string;
  agenda?: string;
};

export type UpdateMeetingInput = Partial<CreateMeetingInput> & {
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  minutes?: string;
};

export type MeetingsListParams = EdFilterParams & {
  chapterId?: string;
  meetingType?: string;
  status?: string;
};

/**
 * Executive Director Meetings API
 * Handles meeting management and attendance
 */
export const edMeetingsApi = createApi({
  reducerPath: "edMeetingsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdMeetings", "EdMeetingDetails"],
  endpoints: (builder) => ({
    /**
     * List all meetings
     */
    getEdMeetings: builder.query<
      PaginatedResponse<Meeting>,
      MeetingsListParams | void
    >({
      query: (params) => {
        const p: any = params ?? {};
        const out: any = { ...p };
        if (p.from || p.startDate) {
          out.startDate = p.startDate ?? p.from;
        }
        if (p.to || p.endDate) {
          out.endDate = p.endDate ?? p.to;
        }
        delete out.from;
        delete out.to;
        return {
          url: "admin/ed/meetings",
          params: out,
        };
      },
      providesTags: ["EdMeetings"],
    }),

    /**
     * Get single meeting details
     */
    getEdMeeting: builder.query<ApiResponse<MeetingDetails>, string>({
      query: (meetingId) => ({
        url: `admin/ed/meetings/${meetingId}`,
      }),
      providesTags: (_result, _error, meetingId) => [
        { type: "EdMeetingDetails", id: meetingId },
      ],
    }),

    /**
     * Create a new meeting
     */
    createEdMeeting: builder.mutation<ApiResponse<Meeting>, CreateMeetingInput>({
      query: (body) => ({
        url: "admin/ed/meetings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdMeetings"],
    }),

    /**
     * Update meeting details
     */
    updateEdMeeting: builder.mutation<
      ApiResponse<Meeting>,
      { meetingId: string; data: UpdateMeetingInput }
    >({
      query: ({ meetingId, data }) => ({
        url: `admin/ed/meetings/${meetingId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { meetingId }) => [
        { type: "EdMeetingDetails", id: meetingId },
        "EdMeetings",
      ],
    }),

    /**
     * Delete meeting
     */
    deleteEdMeeting: builder.mutation<ApiResponse<void>, string>({
      query: (meetingId) => ({
        url: `admin/ed/meetings/${meetingId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdMeetings"],
    }),

    /**
     * Export meetings data
     */
    exportEdMeetings: builder.mutation<Blob, MeetingsListParams | void>({
      query: (params) => {
        const p: any = params ?? {};
        const out: any = { ...p };
        if (p.from || p.startDate) {
          out.startDate = p.startDate ?? p.from;
        }
        if (p.to || p.endDate) {
          out.endDate = p.endDate ?? p.to;
        }
        delete out.from;
        delete out.to;
        return {
          url: "admin/ed/meetings/export",
          method: "GET",
          params: out,
          responseHandler: (response) => response.blob(),
        };
      },
    }),

    /**
     * Update meeting attendance
     */
    updateEdMeetingAttendance: builder.mutation<
      ApiResponse<void>,
      {
        meetingId: string;
        attendance: Array<{ memberId: string; attended: boolean }>;
      }
    >({
      query: ({ meetingId, attendance }) => ({
        url: `admin/ed/meetings/${meetingId}/attendance`,
        method: "PATCH",
        body: { attendance },
      }),
      invalidatesTags: (_result, _error, { meetingId }) => [
        { type: "EdMeetingDetails", id: meetingId },
        "EdMeetings",
      ],
    }),

    /**
     * Update meeting status (ED-specific)
     */
    updateEdMeetingStatus: builder.mutation<
      ApiResponse<Meeting>,
      { meetingId: string; status: "DRAFT" | "COMPLETED" | "SUBMITTED" }
    >({
      query: ({ meetingId, status }) => ({
        url: `admin/ed/meetings/${meetingId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { meetingId }) => [
        { type: "EdMeetingDetails", id: meetingId },
        "EdMeetings",
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdMeetingsQuery,
  useLazyGetEdMeetingsQuery,
  useGetEdMeetingQuery,
  useLazyGetEdMeetingQuery,
  useCreateEdMeetingMutation,
  useUpdateEdMeetingMutation,
  useDeleteEdMeetingMutation,
  useExportEdMeetingsMutation,
  useUpdateEdMeetingAttendanceMutation,
  useUpdateEdMeetingStatusMutation,
} = edMeetingsApi;
