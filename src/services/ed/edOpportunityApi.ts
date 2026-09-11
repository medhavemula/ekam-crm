import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// Business Opportunity-specific types
export type BusinessOpportunity = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  memberId: string;
  memberName?: string;
  chapterId: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
  amount?: number;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  closedDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOpportunityInput = {
  title: string;
  description?: string;
  category?: string;
  memberId: string;
  chapterId: string;
  amount?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
};

export type UpdateOpportunityInput = Partial<CreateOpportunityInput> & {
  status?: "OPEN" | "IN_PROGRESS" | "CLOSED" | "CANCELLED";
  closedDate?: string;
};

export type OpportunityListParams = EdFilterParams & {
  chapterId?: string;
  memberId?: string;
  status?: string;
  category?: string;
  priority?: string;
};

/**
 * Executive Director Business Opportunity API
 * Handles business opportunities and referrals
 */
export const edOpportunityApi = createApi({
  reducerPath: "edOpportunityApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdOpportunities", "EdOpportunityDetails"],
  endpoints: (builder) => ({
    /**
     * List all business opportunities
     */
    getEdOpportunities: builder.query<
      PaginatedResponse<BusinessOpportunity>,
      OpportunityListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/opportunities",
        params: params ?? {},
      }),
      providesTags: ["EdOpportunities"],
    }),

    /**
     * Get single opportunity details
     */
    getEdOpportunity: builder.query<ApiResponse<BusinessOpportunity>, string>({
      query: (opportunityId) => ({
        url: `admin/ed/business-opportunities/${opportunityId}`,
      }),
      providesTags: (_result, _error, opportunityId) => [
        { type: "EdOpportunityDetails", id: opportunityId },
      ],
    }),

    /**
     * Create a new business opportunity
     */
    createEdOpportunity: builder.mutation<
      ApiResponse<BusinessOpportunity>,
      CreateOpportunityInput
    >({
      query: (body) => ({
        url: "admin/ed/business-opportunities",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdOpportunities"],
    }),

    /**
     * Update opportunity details
     */
    updateEdOpportunity: builder.mutation<
      ApiResponse<BusinessOpportunity>,
      { opportunityId: string; data: UpdateOpportunityInput }
    >({
      query: ({ opportunityId, data }) => ({
        url: `admin/ed/business-opportunities/${opportunityId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { opportunityId }) => [
        { type: "EdOpportunityDetails", id: opportunityId },
        "EdOpportunities",
      ],
    }),

    /**
     * Delete opportunity
     */
    deleteEdOpportunity: builder.mutation<ApiResponse<void>, string>({
      query: (opportunityId) => ({
        url: `admin/ed/business-opportunities/${opportunityId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdOpportunities"],
    }),

    /**
     * Export opportunities data
     */
    exportEdOpportunities: builder.mutation<Blob, OpportunityListParams | void>({
      query: (params) => ({
        url: "admin/ed/business-opportunities/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdOpportunitiesQuery,
  useLazyGetEdOpportunitiesQuery,
  useGetEdOpportunityQuery,
  useLazyGetEdOpportunityQuery,
  useCreateEdOpportunityMutation,
  useUpdateEdOpportunityMutation,
  useDeleteEdOpportunityMutation,
  useExportEdOpportunitiesMutation,
} = edOpportunityApi;
