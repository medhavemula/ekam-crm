import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

// Types based on backend DTOs
export type MeetingType = "WEEKLY" | "VISITORS_DAY" | "POWER_TEAM" | "TRAINING";
export type MeetingMode = "IN_PERSON" | "ONLINE" | "HYBRID";
export type MeetingStatus = "DRAFT" | "PUBLISHED" | "CHECKIN_OPEN" | "IN_SESSION" | "COMPLETED" | "ARCHIVED";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "SUBSTITUTE";

export type MeetingListItem = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  mode?: MeetingMode | string | null;
  chapterCity?: string | null;
  chapterRegion?: string | null;
  enteredBy?: {
    id: string;
    name: string;
  } | null;
  enteredAt?: string | null;
  status: MeetingStatus;
};

export type MeetingDetails = {
  _id: string;
  chapterId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  mode: MeetingMode;
  type: MeetingType;
  status: MeetingStatus;
  agenda?: {
    educationMemberId?: string;
    featureSpeakerIds?: string[];
    notes?: string;
  };
  enteredBy?: string;
  enteredAt?: string;
  metrics?: {
    totals: {
      totalMembers: number;
      present: number;
      late: number;
      absent: number;
      visitors: number;
      p2p: number;
      businessClosed: number;
    };
    palmsTableVersion: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type PalmsRow = {
  member: { id: string; name: string };
  attendance: "P" | "L" | "A" | "S";
  OGI: number; // Opportunity Given Inside
  OGOT: number; // Opportunity Given Outside
  ORI: number; // Opportunity Received Inside
  ORO: number; // Opportunity Received Outside
  visitors: number;
  p2p: number;
  businessClosed: number; // amount
  testimonials: number;
};

export type PalmsSummary = {
  totalMembers: number;
  present: number;
  visitors: number;
  businessClosed: number;
  p2p: number;
};

export type ListMeetingsParams = {
  from?: string;
  to?: string;
  status?: MeetingStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "date" | "enteredBy" | "enteredAt" | "status";
  sortDir?: "asc" | "desc";
};

export const meetingsApi = createApi({
  reducerPath: "meetingsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Meetings", "MeetingDetails"],
  endpoints: (builder) => ({
    listMeetings: builder.query<
      { success: boolean; data: MeetingListItem[]; page: number; pageSize: number; total: number },
      ListMeetingsParams
    >({
      query: (params) => ({
        url: "meetings",
        params,
      }),
      providesTags: ["Meetings"],
    }),
    getMeeting: builder.query<{ success: boolean; data: MeetingDetails }, string>({
      query: (id) => `meetings/${id}/palms`,
      providesTags: (_result, _error, id) => [{ type: "MeetingDetails", id }],
    }),
    // Get next upcoming meeting (no date filter - always returns the nearest future meeting)
    getNextMeeting: builder.query<
      { success: boolean; data: MeetingListItem | null },
      void
    >({
      query: () => ({
        url: "meetings",
        params: {
          // from today onward; backend will still return nextMeeting independently
          from: new Date().toISOString().split("T")[0],
          limit: 1,
          sortBy: "date",
          sortDir: "asc",
        },
      }),
      transformResponse: (response: any) => ({
        success: Boolean(response?.success ?? true),
        // Prefer explicit nextMeeting field from API, fall back to first item in data[]
        data: (response && (response.nextMeeting || response.next_meeting)) ||
          (Array.isArray(response?.data) ? response.data[0] : null) ||
          null,
      }),
      providesTags: ["Meetings"],
    }),
    transitionMeetingStatus: builder.mutation<
      { success: boolean; data: any },
      { meetingId: string; action: "SUBMIT" | "UNSUBMIT" | "COMPLETE" }
    >({
      query: ({ meetingId, action }) => ({
        url: `meetings/${meetingId}/status`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_result, _error, { meetingId }) => [
        { type: "MeetingDetails", id: meetingId },
        "Meetings",
      ],
    }),
  }),
});

export const { useListMeetingsQuery, useGetMeetingQuery, useGetNextMeetingQuery, useTransitionMeetingStatusMutation } = meetingsApi;
