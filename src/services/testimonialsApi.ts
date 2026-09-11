import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type TestimonialApi = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  text: string;
};

export type TestimonialRequestApi = {
  id: string;
  requester: { id: string; name: string; avatarUrl?: string | null };
  potentialAuthor: { id: string; name: string; avatarUrl?: string | null };
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
};

export type TestimonialsCounters = {
  receivedPublished: number;
  givenPublished: number;
  pendingForMe: number;
};

export const testimonialsApi = createApi({
  reducerPath: "testimonialsApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (b) => ({
    stats: b.query<{ success: boolean; data: TestimonialsCounters }, void>({
      query: () => ({ url: "testimonials/counters" }),
      providesTags: (_r) => [{ type: "Stats", id: "TOTALS" }],
    }),
    listReceived: b.query<{ success: boolean; data: TestimonialApi[]; page: number; limit: number; total: number }, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "testimonials", params: { mine: "received", status: "PUBLISHED", page: params?.page ?? 1, limit: params?.limit ?? 12 } }),
      providesTags: (result) => [{ type: "Received", id: "LIST" }, ...(result?.data || []).map((i) => ({ type: "Received" as const, id: i.id }))],
    }),
    listGiven: b.query<{ success: boolean; data: TestimonialApi[]; page: number; limit: number; total: number }, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "testimonials", params: { mine: "given", status: "PUBLISHED", page: params?.page ?? 1, limit: params?.limit ?? 12 } }),
      providesTags: (result) => [{ type: "Given", id: "LIST" }, ...(result?.data || []).map((i) => ({ type: "Given" as const, id: i.id }))],
    }),
    listRequests: b.query<{ success: boolean; data: TestimonialRequestApi[]; page: number; pageSize: number; total: number }, { tab: "received" | "given"; page?: number; limit?: number }>({
      query: ({ tab, page = 1, limit = 12 }) => ({ url: "testimonials/requests", params: { tab, page, limit } }),
      providesTags: (_result, _e, arg) => [
        { type: arg.tab === "received" ? "RequestsReceived" : "RequestsGiven", id: "LIST" },
      ],
    }),
    respondRequest: b.mutation<{ success: boolean }, { requestId: string; action: "ACCEPT" | "REJECT" }>({
      query: ({ requestId, action }) => ({
        url: `testimonials/requests/${requestId}/respond`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: () => [{ type: "RequestsReceived", id: "LIST" }, { type: "Stats", id: "TOTALS" }],
    }),
    write: b.mutation<{ success: boolean }, { subjectId: string; text: string; rating: number; requestId?: string }>({
      query: ({ subjectId, text, rating, requestId }) => ({
        url: `testimonials/write`,
        method: "POST",
        body: requestId ? { subjectId, text, rating, requestId } : { subjectId, text, rating },
      }),
      invalidatesTags: () => [{ type: "Received", id: "LIST" }, { type: "Given", id: "LIST" }, { type: "Stats", id: "TOTALS" }],
    }),
    // Retracting a request you sent is its own operation: the server checks that you
    // are the requester before cancelling it.
    withdrawRequest: b.mutation<{ success: boolean }, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `testimonials/requests/${requestId}/withdraw`,
        method: "POST",
      }),
      invalidatesTags: () => [
        { type: "RequestsGiven" as const, id: "LIST" },
        { type: "RequestsReceived" as const, id: "LIST" },
        { type: "Stats" as const, id: "TOTALS" },
      ],
    }),
    createRequest: b.mutation<{ success: boolean }, { toUserId: string; message: string }>({
      query: ({ toUserId, message }) => ({
        url: `testimonials/request/${toUserId}`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: (_r, _e, _a) => [{ type: "RequestsGiven", id: "LIST" }, { type: "Stats", id: "TOTALS" }],
    }),
  }),
  tagTypes: ["Received", "Given", "RequestsReceived", "RequestsGiven", "Stats"],
});

export const {
  useStatsQuery: useTestimonialsStatsQuery,
  useListReceivedQuery: useTestimonialsReceivedQuery,
  useListGivenQuery: useTestimonialsGivenQuery,
  useListRequestsQuery: useTestimonialsListRequestsQuery,
  useRespondRequestMutation: useTestimonialsRespondRequestMutation,
  useWithdrawRequestMutation: useTestimonialsWithdrawRequestMutation,
  useCreateRequestMutation: useTestimonialsCreateRequestMutation,
  useWriteMutation: useTestimonialsWriteMutation,
} = testimonialsApi as any;
