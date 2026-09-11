import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, DateRangeParams } from "./types";

// Dashboard-specific types
export type DashboardOverview = {
  totalRegions?: number;
  totalChapters?: number;
  totalMembers?: number;
  activeMembers?: number;
  totalOpportunities?: number;
  closedOpportunities?: number;
  totalRevenue?: number;
  totalP2P?: number;
  totalVisitors?: number;
  totalEvents?: number;
  totalMeetings?: number;
  // Add other metrics as per backend response
};

export type ChartDataPoint = {
  date?: string;
  month?: string;
  week?: string;
  value: number;
  label?: string;
};

export type DashboardCharts = {
  chaptersGrowth?: ChartDataPoint[];
  memberGrowth?: ChartDataPoint[];
  opportunityTrend?: ChartDataPoint[];
  revenueTrend?: ChartDataPoint[];
  p2pTrend?: ChartDataPoint[];
  // Add other chart series as needed
};

export type DashboardParams = DateRangeParams;

export type ChartsParams = DateRangeParams & {
  granularity?: "month" | "week" | "year";
};

/**
 * Executive Director Dashboard API
 * Handles dashboard overview and charts data
 */
export const edDashboardApi = createApi({
  reducerPath: "edDashboardApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdDashboard"],
  endpoints: (builder) => ({
    /**
     * Get dashboard overview cards
     * @param params - Optional date range filter
     */
    getEdDashboardOverview: builder.query<
      ApiResponse<DashboardOverview>,
      DashboardParams | void
    >({
      query: (params) => ({
        url: "admin/ed/dashboard/overview",
        params: params ?? {},
      }),
      providesTags: ["EdDashboard"],
    }),

    /**
     * Get dashboard charts data
     * @param params - Date range and granularity
     */
    getEdDashboardCharts: builder.query<
      ApiResponse<DashboardCharts>,
      ChartsParams | void
    >({
      query: (params) => ({
        url: "admin/ed/dashboard/charts",
        params: params ?? {},
      }),
      providesTags: ["EdDashboard"],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdDashboardOverviewQuery,
  useLazyGetEdDashboardOverviewQuery,
  useGetEdDashboardChartsQuery,
  useLazyGetEdDashboardChartsQuery,
} = edDashboardApi;
