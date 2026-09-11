import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, DateRangeParams } from "./types";

// Reports-specific types
export type ReportType = 
  | "MEMBERSHIP"
  | "ATTENDANCE"
  | "REVENUE"
  | "OPPORTUNITIES"
  | "VISITORS"
  | "EVENTS"
  | "P2P"
  | "M2O"
  | "SPONSORS";

export type ReportParams = DateRangeParams & {
  reportType: ReportType;
  regionId?: string;
  chapterId?: string;
  format?: "PDF" | "CSV" | "EXCEL";
};

export type ReportData = {
  reportType: ReportType;
  generatedAt: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary: {
    [key: string]: number | string;
  };
  data: any[];
};

/**
 * Executive Director Reports API
 * Handles various report generation and exports
 */
export const edReportsApi = createApi({
  reducerPath: "edReportsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdReports"],
  endpoints: (builder) => ({
    /**
     * Generate a report
     */
    generateEdReport: builder.query<
      ApiResponse<ReportData>,
      ReportParams
    >({
      query: (params) => ({
        url: "admin/ed/reports/generate",
        params,
      }),
      providesTags: ["EdReports"],
    }),

    /**
     * Export report in specified format
     */
    exportEdReport: builder.mutation<Blob, ReportParams>({
      query: (params) => ({
        url: "admin/ed/reports/export",
        method: "POST",
        body: params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    /**
     * Get membership report
     */
    getEdMembershipReport: builder.query<
      ApiResponse<ReportData>,
      DateRangeParams & { regionId?: string; chapterId?: string }
    >({
      query: (params) => ({
        url: "admin/ed/reports/membership",
        params,
      }),
      providesTags: ["EdReports"],
    }),

    /**
     * Get attendance report
     */
    getEdAttendanceReport: builder.query<
      ApiResponse<ReportData>,
      DateRangeParams & { regionId?: string; chapterId?: string }
    >({
      query: (params) => ({
        url: "admin/ed/reports/palms-attendance",
        params,
      }),
      providesTags: ["EdReports"],
    }),

    /**
     * Get revenue report
     */
    getEdRevenueReport: builder.query<
      ApiResponse<ReportData>,
      DateRangeParams & { regionId?: string; chapterId?: string }
    >({
      query: (params) => ({
        url: "admin/ed/reports/revenue",
        params,
      }),
      providesTags: ["EdReports"],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGenerateEdReportQuery,
  useLazyGenerateEdReportQuery,
  useExportEdReportMutation,
  useGetEdMembershipReportQuery,
  useLazyGetEdMembershipReportQuery,
  useGetEdAttendanceReportQuery,
  useLazyGetEdAttendanceReportQuery,
  useGetEdRevenueReportQuery,
  useLazyGetEdRevenueReportQuery,
} = edReportsApi;
