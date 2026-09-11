import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type OpportunityReceived = {
  id: string;
  createdAt: string;
  contact: {
    name: string;
    email?: string;
    phone?: string;
  };
  status: string;
  comments?: string;
  giver?: {
    id: string;
    name?: string;
    email?: string;
  };
};

export type OpportunityGiven = {
  id: string;
  createdAt: string;
  to: string;
  contact: {
    email?: string;
    phone?: string;
  };
  comments?: string;
  derivedStatus: string;
  amount?: number;
};

export type OpportunityClosed = {
  id: string;
  closedAt?: string;
  amount: number;
  opportunitySource?: string;
  comments?: string;
  creditedGiver: {
    name?: string;
  };
  receiver?: {
    name?: string;
  };
  status: string;
};

export type ListOpportunitiesParams = {
  view?: "received" | "given" | "closed";
  status?: string;
  startDate?: string; // legacy
  endDate?: string;   // legacy
  from?: string;      // ISO start datetime
  to?: string;        // ISO end datetime
  limit?: number;
  offset?: number;
  page?: number;
  q?: string;
};

export type CreateGivenOpportunityRequest = {
  receiverId: string;
  givenAt?: string;
  contact: {
    name: string;
    email?: string;
    phone?: string;
  };
  address?: string;
  comments?: string;
  topic?: string;
};

export type UpdateReceivedOpportunityRequest = {
  status: "NOT_CONTACTED" | "CONTACTED" | "NO_RESPONSE" | "WON" | "LOST" | "NOT_A_GOOD_FIT";
  comments?: string;
  amount?: number;
  creditedGiverId?: string;
  opportunitySource?: string;
};

export type CreateClosedOpportunityRequest = {
  /** WEB-BUS-13: omitted for a manual entry with no member to credit - the
   *  server self-credits and tags the record External. */
  creditedGiverId?: string;
  amount: number;
  closedAt?: string; // Date when business was closed
  contact: {
    name?: string;
    email?: string;
    phone?: string;
  };
  opportunitySource?: string;
  comments?: string;
};

export const opportunityApi = createApi({
  reducerPath: "opportunityApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Opportunities", "OpportunitiesReceived", "OpportunitiesGiven", "OpportunitiesClosed"],
  endpoints: (builder) => ({
    listOpportunities: builder.query<
      { success: boolean; data: (OpportunityReceived | OpportunityGiven | OpportunityClosed)[] },
      ListOpportunitiesParams
    >({
      query: (params) => ({ url: "opportunities", params }),
      providesTags: ["Opportunities"],
    }),
    listReceivedOpportunities: builder.query<
      { success: boolean; data: OpportunityReceived[] },
      ListOpportunitiesParams
    >({
      query: (params) => ({ url: "opportunities", params: { ...params, view: "received" } }),
      providesTags: ["OpportunitiesReceived"],
    }),
    listGivenOpportunities: builder.query<
      { success: boolean; data: OpportunityGiven[] },
      ListOpportunitiesParams
    >({
      query: (params) => ({ url: "opportunities", params: { ...params, view: "given" } }),
      providesTags: ["OpportunitiesGiven"],
    }),
    listClosedOpportunities: builder.query<
      { success: boolean; data: OpportunityClosed[] },
      ListOpportunitiesParams
    >({
      query: (params) => ({ url: "opportunities/closed", params }),
      providesTags: ["OpportunitiesClosed"],
    }),
    getOpportunity: builder.query<{ success: boolean; data: any }, string>({
      query: (id) => ({ url: `opportunities/${id}` }),
      providesTags: ["Opportunities"],
    }),
    createGivenOpportunity: builder.mutation<
      { success: boolean; data: OpportunityGiven },
      CreateGivenOpportunityRequest
    >({
      query: (body) => ({ url: "opportunities", method: "POST", body }),
      invalidatesTags: ["Opportunities", "OpportunitiesGiven", "OpportunitiesReceived"],
    }),
    updateReceivedOpportunity: builder.mutation<
      { success: boolean; data: OpportunityReceived },
      { id: string; body: UpdateReceivedOpportunityRequest }
    >({
      query: ({ id, body }) => ({
        url: `opportunities/received/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Opportunities", "OpportunitiesReceived"],
    }),
    createClosedOpportunity: builder.mutation<
      { success: boolean; data: OpportunityClosed },
      CreateClosedOpportunityRequest
    >({
      query: (body) => ({ url: "opportunities/closed", method: "POST", body }),
      invalidatesTags: ["Opportunities", "OpportunitiesClosed"],
    }),
  }),
});

export const {
  useGetOpportunityQuery,
  useListOpportunitiesQuery,
  useListReceivedOpportunitiesQuery,
  useListGivenOpportunitiesQuery,
  useListClosedOpportunitiesQuery,
  useCreateGivenOpportunityMutation,
  useUpdateReceivedOpportunityMutation,
  useCreateClosedOpportunityMutation,
} = opportunityApi;
