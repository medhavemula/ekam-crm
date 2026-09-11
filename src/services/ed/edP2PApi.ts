import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// P2P-specific types
export type P2PRecord = {
  id: string;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  chapterId: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
  amount?: number;
  category?: string;
  description?: string;
  date: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
};

export type CreateP2PInput = {
  giverId: string;
  receiverId: string;
  chapterId: string;
  amount?: number;
  category?: string;
  description?: string;
  date: string;
};

export type P2PListParams = EdFilterParams & {
  chapterId?: string;
  giverId?: string;
  receiverId?: string;
  status?: string;
};

/**
 * Executive Director P2P (Peer-to-Peer) API
 * Handles P2P referrals and transactions
 */
export const edP2PApi = createApi({
  reducerPath: "edP2PApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdP2P"],
  endpoints: (builder) => ({
    /**
     * List all P2P records
     */
    getEdP2PList: builder.query<
      PaginatedResponse<P2PRecord>,
      P2PListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/p2p",
        params: params ?? {},
      }),
      providesTags: ["EdP2P"],
    }),

    /**
     * Create a new P2P record
     */
    createEdP2P: builder.mutation<ApiResponse<P2PRecord>, CreateP2PInput>({
      query: (body) => ({
        url: "admin/ed/p2p",
        method: "POST",
        body,
      }),
      invalidatesTags: ["EdP2P"],
    }),

    /**
     * Export P2P data
     */
    exportEdP2P: builder.mutation<Blob, P2PListParams | void>({
      query: (params) => ({
        url: "admin/ed/p2p/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdP2PListQuery,
  useLazyGetEdP2PListQuery,
  useCreateEdP2PMutation,
  useExportEdP2PMutation,
} = edP2PApi;
