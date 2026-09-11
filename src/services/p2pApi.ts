import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type P2PListParams = {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  meetWith?: string;
  initiatedBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type P2PListResponse = {
  success: boolean;
  data?: any[];
  page?: number;
  limit?: number;
  total?: number;
};

export type P2PMember = { id: string; name: string; email: string };
export type P2PMembersResponse = { success: boolean; data: P2PMember[] };

export type CreateP2PRequest = {
  date: string; // ISO string
  meetWith: string; // userId
  location?: string;
  topic: string;
  status?: string; // e.g., COMPLETED | SCHEDULED
};
export type CreateP2PResponse = { success: boolean; data?: any; message?: string };

export type UpdateP2PRequest = {
  id: string;
  date?: string;
  meetWith?: string;
  location?: string;
  topic?: string;
};
export type P2PMutationResponse = { success: boolean; data?: any; message?: string };
export type P2PGetResponse = { success: boolean; data?: any; message?: string };

export const p2pApi = createApi({
  reducerPath: "p2pApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["P2P"],
  endpoints: (builder) => ({
    list: builder.query<P2PListResponse, P2PListParams | void>({
      query: (params) => ({ url: "p2p", params: (params as Record<string, any>) || {} }),
      providesTags: ["P2P"],
    }),
    members: builder.query<P2PMembersResponse, { q?: string; limit?: number } | void>({
      query: (params) => ({
        url: "p2p/members",
        params: { q: (params as any)?.q, limit: (params as any)?.limit ?? 20 },
      }),
    }),
    create: builder.mutation<CreateP2PResponse, CreateP2PRequest>({
      query: (body) => ({ url: "p2p", method: "POST", body }),
      invalidatesTags: ["P2P"],
    }),
    get: builder.query<P2PGetResponse, string>({
      query: (id) => ({ url: `p2p/${id}` }),
      providesTags: ["P2P"],
    }),
    update: builder.mutation<P2PMutationResponse, UpdateP2PRequest>({
      query: ({ id, ...body }) => ({ url: `p2p/${id}`, method: "PATCH", body }),
      invalidatesTags: ["P2P"],
    }),
    // "Remove from my list" hides the record for the caller only; the other
    // participant keeps theirs, so the list must be refetched but nothing is deleted.
    hide: builder.mutation<P2PMutationResponse, string>({
      query: (id) => ({ url: `p2p/${id}/hide`, method: "POST" }),
      invalidatesTags: ["P2P"],
    }),
  }),
});

export const {
  useListQuery: useP2PListQuery,
  useMembersQuery: useP2PMembersQuery,
  useCreateMutation: useCreateP2PMutation,
  useGetQuery: useP2PGetQuery,
  useUpdateMutation: useUpdateP2PMutation,
  useHideMutation: useHideP2PMutation,
} = p2pApi as any;
