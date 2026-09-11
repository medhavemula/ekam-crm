import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type NotificationItem = {
  id: string;
  type: string; // e.g., P2P_CREATED, TESTIMONIAL_PUBLISHED
  title: string;
  body: string;
  data?: { kind?: string; id?: string; notificationType?: string; [key: string]: any } | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListResponse = {
  success: boolean;
  data: NotificationItem[];
  page?: number;
  total?: number;
};

export type NotificationCountersResponse = {
  success: boolean;
  data: { unread: number; total: number };
};

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Notifications", "Counters"],
  endpoints: (builder) => ({
    list: builder.query<NotificationsListResponse, { onlyUnread?: boolean; onlyRead?: boolean; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "notifications", params: params ?? {} }),
      providesTags: () => [{ type: "Notifications", id: "LIST" }],
    }),
    counters: builder.query<NotificationCountersResponse, void>({
      query: () => ({ url: "notifications/counters" }),
      providesTags: () => [{ type: "Counters", id: "COUNTERS" }],
    }),
    markRead: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({ url: `notifications/${id}/read`, method: "POST" }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }, { type: "Counters", id: "COUNTERS" }],
    }),
    markAllRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: `notifications/read-all`, method: "POST" }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }, { type: "Counters", id: "COUNTERS" }],
    }),
    remove: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({ url: `notifications/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }, { type: "Counters", id: "COUNTERS" }],
    }),
  }),
});

export const {
  useListQuery: useNotificationsListQuery,
  useLazyListQuery: useLazyNotificationsListQuery,
  useCountersQuery: useNotificationsCountersQuery,
  useMarkReadMutation: useNotificationsMarkReadMutation,
  useMarkAllReadMutation: useNotificationsMarkAllReadMutation,
  useRemoveMutation: useNotificationsRemoveMutation,
} = notificationsApi as any;
