import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { EdFilterParams } from "./types";

// Sponsors-specific types
export type SponsorReportItem = {
  sponsorName: string;
  sponsorId?: string;
  noOfSponsored: number;
  sponsoredName: string;
  sponsoredId?: string;
  sponsoredRegion: string;
  sponsoredChapter: string;
  applicationDate?: string;
};

export type SponsorsReportParams = EdFilterParams & {
  pageSize?: number;
  sort?: string;
};

export type SponsorsReportResponse = {
  success: boolean;
  items: SponsorReportItem[];
  page: number;
  pageSize: number;
  total: number;
  request_id?: string;
};

/**
 * Executive Director Sponsors API
 * Handles sponsor reports and data
 */
export const edSponsorsApi = createApi({
  reducerPath: "edSponsorsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdSponsors"],
  endpoints: (builder) => ({
    /**
     * Get sponsors report
     */
    getEdSponsorsReport: builder.query<
      SponsorsReportResponse,
      SponsorsReportParams | void
    >({
      query: (params) => ({
        url: "admin/ed/sponsors/report",
        params: params ?? {},
      }),
      providesTags: ["EdSponsors"],
    }),

    /**
     * Export sponsors report as CSV
     */
    exportEdSponsorsReport: builder.mutation<Blob, SponsorsReportParams | void>({
      query: (params) => ({
        url: "admin/ed/sponsors/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdSponsorsReportQuery,
  useLazyGetEdSponsorsReportQuery,
  useExportEdSponsorsReportMutation,
} = edSponsorsApi;
