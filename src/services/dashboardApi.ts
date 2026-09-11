import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type MoneySeriesPoint = {
  month: string;
  amount: number;
};

export type CountSeriesPoint = {
  month: string;
  count: number;
};

export type DashboardKPIs = {
  businessOpportunityReceived: number;
  businessOpportunityGiven: number;
  visitors: number;
  p2p: number;
  chapterMemberCount: number;
};

export type DashboardResponse = {
  kpis: DashboardKPIs;
  revenueReceivedToMyBusiness: MoneySeriesPoint[];
  businessClosed: MoneySeriesPoint[];
  // Total value of business given by the user (per month)
  businessGiven?: MoneySeriesPoint[];
  receivedBusinessOpportunitySeries: CountSeriesPoint[];
  givenBusinessOpportunitySeries?: CountSeriesPoint[]; // Optional in case backend doesn't provide it yet
};

export type DashboardParams = {
  memberId?: string;
  from?: string;
  to?: string;
  period?: "last6m" | "thisMonth" | "thisFY";
  granularity?: "month" | "week";
};

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getDashboard: builder.query<{ success: boolean; data: DashboardResponse }, DashboardParams>({
      query: (params) => ({
        url: "reports/dashboard",
        params,
      }),
      providesTags: ["Dashboard"],
    }),
    getPersonalPalmsReport: builder.query<
      { success: boolean; data: any },
      { from: string; to: string }
    >({
      query: ({ from, to }) => ({
        url: "reports/personal-palms",
        params: { userId: "me", from, to },
      }),
    }),
    getReceivedOpportunitiesReport: builder.query<
      { success: boolean; data: any },
      { from: string; to: string; memberId?: string }
    >({
      query: ({ from, to, memberId }) => ({
        url: "reports/opportunities/received",
        params: { from, to, ...(memberId && { memberId }) },
      }),
    }),
    exportReceivedOpportunitiesReport: builder.mutation<
      Blob,
      { from: string; to: string; memberId?: string }
    >({
      query: ({ from, to, memberId }) => ({
        url: "reports/opportunities/received/export",
        params: { from, to, ...(memberId && { memberId }) },
        responseHandler: (response) => response.blob(),
      }),
    }),
    getWeeklyReport: builder.query<
      { success: boolean; data: any },
      { from: string; to: string }
    >({
      query: ({ from, to }) => ({
        url: "reports/weekly",
        params: { from, to },
      }),
    }),
    getPalmsAttendanceReport: builder.query<
      { success: boolean; data: any },
      { chapterId: string; from: string; to: string; memberId?: string }
    >({
      query: ({ chapterId, from, to, memberId }) => ({
        url: "reports/plams-attendance",
        params: { chapterId, from, to, memberId },
      }),
    }),
    exportPalmsAttendanceReport: builder.mutation<
      Blob,
      { chapterId: string; from: string; to: string; memberId?: string }
    >({
      query: ({ chapterId, from, to, memberId }) => ({
        url: "reports/plams-attendance",
        params: { chapterId, from, to, memberId },
        responseHandler: (response) => response.blob(),
      }),
    }),
    // Sponsors report (general users)
    getSponsorsReport: builder.query<
      { success: boolean; data: any[] },
      { chapterId?: string; from: string; to: string; memberId?: string; page?: number; pageSize?: number }
    >({
      query: ({ chapterId, from, to, memberId, page, pageSize }) => ({
        url: "reports/sponsors",
        params: { chapterId, from, to, ...(memberId ? { memberId } : {}), ...(page ? { page } : {}), ...(pageSize ? { pageSize } : {}) },
      }),
    }),
    exportSponsorsReport: builder.mutation<
      Blob,
      { chapterId?: string; from: string; to: string }
    >({
      query: ({ chapterId, from, to }) => ({
        url: "reports/sponsors/export",
        params: { chapterId, from, to },
        // Tell RTKQ to parse the response as a Blob
        responseHandler: (response) => response.blob(),
      }),
    }),
    // Many-to-One report
    getM2OReport: builder.query<
      { success: boolean; data: any[] },
      { from: string; to: string; chapterId?: string; targetMemberId?: string }
    >({
      query: ({ from, to, chapterId, targetMemberId }) => ({
        url: "reports/m2o",
        params: { from, to, chapterId, ...(targetMemberId ? { targetMemberId } : {}) },
      }),
    }),
    exportM2OReport: builder.mutation<
      Blob,
      { from: string; to: string; chapterId?: string; targetMemberId?: string }
    >({
      query: ({ from, to, chapterId, targetMemberId }) => ({
        url: "reports/m2o/export",
        params: { from, to, chapterId, ...(targetMemberId ? { targetMemberId } : {}) },
        responseHandler: (response) => response.blob(),
      }),
    }),
    // PALMS Summary report
    getPALMSSummaryReport: builder.query<
      { success: boolean; data: any },
      { chapterId?: string; from: string; to: string }
    >({
      query: ({ chapterId, from, to }) => ({
        url: "reports/palms-summary",
        params: chapterId ? { chapterId, from, to } : { from, to },
      }),
    }),
    exportPALMSSummaryReport: builder.mutation<
      Blob,
      { chapterId?: string; from: string; to: string }
    >({
      query: ({ chapterId, from, to }) => ({
        url: "reports/palms-summary/export",
        params: chapterId ? { chapterId, from, to } : { from, to },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetPersonalPalmsReportQuery,
  useGetReceivedOpportunitiesReportQuery,
  useLazyGetReceivedOpportunitiesReportQuery,
  useExportReceivedOpportunitiesReportMutation,
  useGetWeeklyReportQuery,
  useLazyGetWeeklyReportQuery,
  useGetPalmsAttendanceReportQuery,
  useLazyGetPalmsAttendanceReportQuery,
  useExportPalmsAttendanceReportMutation,
  useGetSponsorsReportQuery,
  useLazyGetSponsorsReportQuery,
  useExportSponsorsReportMutation,
  useGetM2OReportQuery,
  useLazyGetM2OReportQuery,
  useExportM2OReportMutation,
  useGetPALMSSummaryReportQuery,
  useLazyGetPALMSSummaryReportQuery,
  useExportPALMSSummaryReportMutation,
} = dashboardApi;
