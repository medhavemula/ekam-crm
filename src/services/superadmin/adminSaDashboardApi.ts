import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

// Helper function to get first and last day of current month in ISO format with time
const getCurrentMonthDateRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  return {
    firstDay: `${formatDate(firstDay)}T00:00:00`,
    lastDay: `${formatDate(lastDay)}T23:59:59`
  };
};

const { firstDay: currentMonthFirstDay, lastDay: currentMonthLastDay } = getCurrentMonthDateRange();

export type AdminTotals = {
  countries: number;
  regions: number;
  chapters: number;
  members: number;
  businessOpportunity: number;
  businessClosed: number;
};

export type AdminSeriesPoint = { month?: string; value?: number } & Record<string, any>;

export type AdminDashboardResponse = {
  success: boolean;
  data: {
    totals: AdminTotals;
    series: {
      chaptersGrowth: AdminSeriesPoint[];
      opportunity: AdminSeriesPoint[];
      businessClosed: AdminSeriesPoint[];
    };
  };
};

export type AdminKpisResponse = {
  success: boolean;
  data: Record<string, number>;
};

export type AdminFiltersParams = {
  date_from?: string;
  date_to?: string;
  country_id?: string;
  region_id?: string;
  chapter_id?: string;
};

export type AdminSeriesParams = AdminFiltersParams & {
  metric: "chapters" | "opportunity" | "business_closed";
  interval?: "week" | "month" | "year";
};

export type AdminSeriesResponse = {
  success: boolean;
  data: Array<{ month?: string; label?: string; date?: string; value?: number; amount?: number; count?: number }>;
};

export const adminSaDashboardApi = createApi({
  reducerPath: "adminSaDashboardApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<AdminDashboardResponse, AdminFiltersParams | void>({
      query: (params) => ({
        url: "admin/dashboard",
        params: {
          date_from: currentMonthFirstDay,
          date_to: currentMonthLastDay,
          ...(params || {})
        },
      }),
    }),
    getAdminKpis: builder.query<AdminKpisResponse, AdminFiltersParams | void>({
      query: (params) => ({
        url: "admin/kpis",
        params: {
          date_from: currentMonthFirstDay,
          date_to: currentMonthLastDay,
          ...(params || {})
        },
      }),
    }),
    getAdminSeries: builder.query<AdminSeriesResponse, AdminSeriesParams>({
      query: (params) => {
        const { interval: _intervalIgnored, date_from: pFrom, date_to: pTo, ...rest } =
          params || ({} as AdminSeriesParams);

        const date_from = pFrom || currentMonthFirstDay;
        const date_to = pTo || currentMonthLastDay;

        let interval: "week" | "month" | "year";
        try {
          const fromDate = new Date(date_from);
          const toDate = new Date(date_to);
          const diffMs = toDate.getTime() - fromDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
          const monthDiff =
            (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
            (toDate.getUTCMonth() - fromDate.getUTCMonth()) +
            1;

          // <= 31 days  -> week
          // <= 12 months -> month
          // > 12 months  -> year
          if (diffDays <= 31) interval = "week";
          else if (monthDiff <= 12) interval = "month";
          else interval = "year";
        } catch {
          interval = "month";
        }

        return {
          url: "admin/series",
          params: {
            date_from,
            date_to,
            interval,
            ...rest,
          },
        };
      },
      transformResponse: (resp: any): AdminSeriesResponse => {
        // Backend returns { success, data: { metric, series } }
        const raw = resp?.data?.series ?? resp?.data?.items ?? resp?.data ?? resp ?? [];
        const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        return { success: !!resp?.success || true, data: arr };
      },
    }),
  }),
});

export const { useGetAdminDashboardQuery, useLazyGetAdminDashboardQuery, useGetAdminKpisQuery, useLazyGetAdminKpisQuery, useGetAdminSeriesQuery, useLazyGetAdminSeriesQuery } = adminSaDashboardApi;
