import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type M2OSessionRow = {
  _id: string;
  chapterId: string;
  targetMemberId: string;
  targetMemberName?: string;
  date: string;
  status: "SCHEDULED" | "OPEN" | "SUBMITTED" | "LOCKED" | "CANCELLED";
  meetingTopic?: string;
  place?: string;
  kpis?: {
    totalMembers?: number;
    present?: number;
    visitors?: number;
    businessClosed?: number;
    p2p?: number;
  };
};

export type UpcomingM2O = {
  _id: string;
  chapterId: string;
  targetMemberId: string;
  targetMemberName: string;
  date: string;
  meetingTopic?: string;
  place?: string;
  status: "SCHEDULED" | "OPEN" | "SUBMITTED" | "LOCKED" | "CANCELLED";
  kpis?: {
    totalMembers?: number;
    present?: number;
    visitors?: number;
    businessClosed?: number;
    p2p?: number;
  };
};

export type ListM2OParams = {
  from?: string;
  to?: string;
  q?: string;
  status?: "SCHEDULED" | "OPEN" | "SUBMITTED" | "LOCKED" | "CANCELLED";
  page?: number;
  pageSize?: number;
};

export type ListM2OResponse = {
  success: boolean;
  rows: M2OSessionRow[];
  page: number;
  pageSize: number;
  total: number;
  upcomingM2O?: UpcomingM2O;
};

export type CreateM2ORequest = {
  targetMemberId: string;
  date: string; // ISO date string
  meetingTopic?: string;
  place?: string;
};

export type UpdateM2ORequest = {
  targetMemberId?: string;
  date?: string; // ISO date string
  meetingTopic?: string;
  place?: string;
};

export type GetM2OResponse = {
  success: boolean;
  request_id: string;
  data: any;
};

export type UpsertLinesRequest = {
  id: string;
  body: {
    lines: Array<{
      memberId: string;
      attendance?: "P" | "A";
      bog?: number;
      bor?: number;
      visitors?: number;
      p2p?: number;
      businessClosed?: number;
      testimonials?: number;
      note?: string;
    }>;
  };
};

export type NextM2OResponse = {
  success: boolean;
  data: M2OSessionRow | null;
};

export const m2oApi = createApi({
  reducerPath: "m2oApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["M2O"],
  endpoints: (builder) => ({
    listM2O: builder.query<ListM2OResponse, ListM2OParams>({
      query: (params) => ({ url: "m2o", params }),
      providesTags: ["M2O"],
    }),
    getNextM2O: builder.query<NextM2OResponse, void>({
      query: () => ({ url: "m2o/next" }),
      providesTags: ["M2O"],
    }),
    createM2O: builder.mutation<{ success: boolean; data: { id: string } }, CreateM2ORequest>({
      query: (body) => ({ url: "m2o", method: "POST", body }),
      invalidatesTags: ["M2O"],
    }),
    getM2O: builder.query<GetM2OResponse, string>({
      query: (id) => ({ url: `m2o/${id}` }),
      providesTags: (_res, _err, id) => [{ type: "M2O" as const, id }],
    }),
    updateM2O: builder.mutation<{ success: boolean; data: any }, { id: string; body: UpdateM2ORequest }>({
      query: ({ id, body }) => ({ url: `m2o/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "M2O" as const, id }],
    }),
    upsertM2OLines: builder.mutation<{ success: boolean; kpis: any }, UpsertLinesRequest>({
      query: ({ id, body }) => ({ url: `m2o/${id}/lines`, method: "PUT", body }),
      invalidatesTags: ["M2O"],
    }),
    submitM2O: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `m2o/${id}/submit`, method: "POST" }),
      invalidatesTags: ["M2O"],
    }),
    cancelM2O: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `m2o/${id}`, method: "DELETE" }),
      invalidatesTags: ["M2O"],
    }),
  }),
});

export const {
  useListM2OQuery,
  useLazyListM2OQuery,
  useCreateM2OMutation,
  useGetM2OQuery,
  useUpdateM2OMutation,
  useGetNextM2OQuery,
  useUpsertM2OLinesMutation,
  useSubmitM2OMutation,
  useCancelM2OMutation,
} = m2oApi;
