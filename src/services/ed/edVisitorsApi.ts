import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// Visitors-specific types
export type Visitor = {
  id: string;
  personId: string;
  chapterId: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
  countryId?: string;
  countryName?: string;
  visitDate: string;
  type: "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE";
  status: "INVITED" | "REGISTERED" | "CHECKED_IN" | "FOLLOWED_UP" | "APPLIED" | "JOINED" | "NO_SHOW" | "NOT_A_FIT" | "DECLINED";
  checkInTime?: string;
  notes?: string;
  isFirstTimer: boolean;
  invitedByMemberId?: string;
  invitedByName?: string;
  registeredByMemberId?: string;
  person?: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    category?: string;
    address?: {
      street?: string;
      country?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVisitorInput = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  chapterId: string;
  meetingId?: string;
  invitedBy?: string;
  visitDate: string;
  notes?: string;
};

export type UpdateVisitorInput = {
  type?: "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE";
  chapterId?: string;
  visitDate?: string;
  person: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    category?: string;
    address?: {
      street?: string;
    };
  };
};

export type VisitorsListParams = EdFilterParams & {
  chapterId?: string;
  meetingId?: string;
  status?: string;
  invitedBy?: string;
};

/**
 * Executive Director Visitors API
 * Handles visitor management and tracking
 */
export const edVisitorsApi = createApi({
  reducerPath: "edVisitorsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdVisitors", "EdVisitorDetails"],
  endpoints: (builder) => ({
    /**
     * List all visitors
     */
    getEdVisitors: builder.query<
      PaginatedResponse<Visitor>,
      VisitorsListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/visitors",
        params: params ?? {},
      }),
      providesTags: ["EdVisitors"],
    }),

    /**
     * Get single visitor details
     */
    getEdVisitor: builder.query<ApiResponse<Visitor>, string>({
      query: (visitorId) => ({
        url: `admin/ed/visitors/${visitorId}`,
      }),
      providesTags: (_result, _error, visitorId) => [
        { type: "EdVisitorDetails", id: visitorId },
      ],
    }),

    /**
     * Create a new visitor
     */
    createEdVisitor: builder.mutation<ApiResponse<Visitor>, CreateVisitorInput>({
      query: (body) => ({
        url: "admin/ed/visitors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdVisitors"],
    }),

    /**
     * Update visitor details
     */
    updateEdVisitor: builder.mutation<
      ApiResponse<Visitor>,
      { visitorId: string; data: UpdateVisitorInput }
    >({
      query: ({ visitorId, data }) => ({
        url: `admin/ed/visitors/${visitorId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { visitorId }) => [
        { type: "EdVisitorDetails", id: visitorId },
        "EdVisitors",
      ],
    }),

    /**
     * Delete visitor
     */
    deleteEdVisitor: builder.mutation<ApiResponse<void>, string>({
      query: (visitorId) => ({
        url: `admin/ed/visitors/${visitorId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdVisitors"],
    }),

    /**
     * Export visitors data
     */
    exportEdVisitors: builder.mutation<Blob, VisitorsListParams | void>({
      query: (params) => ({
        url: "admin/ed/visitors/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdVisitorsQuery,
  useLazyGetEdVisitorsQuery,
  useGetEdVisitorQuery,
  useLazyGetEdVisitorQuery,
  useCreateEdVisitorMutation,
  useUpdateEdVisitorMutation,
  useDeleteEdVisitorMutation,
  useExportEdVisitorsMutation,
} = edVisitorsApi;
