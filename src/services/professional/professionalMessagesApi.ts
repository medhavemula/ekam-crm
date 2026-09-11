import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { Thread, Message, PresignRequest, PresignResponse } from "../../types/chat.types";

const CHAT_BASE = "chat";

export const professionalMessagesApi = createApi({
  reducerPath: "professionalMessagesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Threads", "Messages"],
  endpoints: (builder) => ({
    // Get list of chat threads with pagination
    getThreads: builder.query<{ success: boolean; data: Thread[] }, { before?: string; limit?: number }>({
      query: ({ before, limit = 20 }) => ({
        url: `${CHAT_BASE}/threads`,
        params: before ? { before, limit } : { limit },
      }),
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ _id }) => ({ type: "Threads" as const, id: _id })), { type: "Threads", id: "LIST" }]
          : [{ type: "Threads", id: "LIST" }],
    }),

    // Create or get direct thread with a user
    createDirectThread: builder.mutation<{ success: boolean; data: Thread }, { peerId: string }>({
      query: (body) => ({
        url: `${CHAT_BASE}/threads/direct`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Threads", id: "LIST" }],
    }),

    // Get messages in a thread with pagination
    getMessages: builder.query<
      { success: boolean; data: Message[] },
      { threadId: string; before?: string; limit?: number }
    >({
      query: ({ threadId, before, limit = 30 }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/messages`,
        params: before ? { before, limit } : { limit },
      }),
      providesTags: (result, _error, { threadId }) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: "Messages" as const, id: _id })),
              { type: "Messages", id: threadId },
            ]
          : [{ type: "Messages", id: threadId }],
    }),

    // Send message via REST (alternative to socket)
    sendMessage: builder.mutation<
      { success: boolean; data: Message },
      { threadId: string; clientId: string; type: string; text?: string }
    >({
      query: ({ threadId, ...body }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { threadId }) => [
        { type: "Messages", id: threadId },
        { type: "Threads", id: threadId },
      ],
    }),

    // Mark messages as read
    markAsRead: builder.mutation<{ success: boolean }, { threadId: string; lastMessageId?: string }>({
      query: ({ threadId, lastMessageId }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/read`,
        method: "POST",
        body: lastMessageId ? { lastMessageId } : {},
      }),
      invalidatesTags: (_result, _error, { threadId }) => [{ type: "Threads", id: threadId }],
    }),

    // Get presigned URL for media upload
    getPresignedUrl: builder.mutation<{ success: boolean; data: PresignResponse }, PresignRequest>({
      query: (body) => ({
        url: `${CHAT_BASE}/media/presign`,
        method: "POST",
        body,
      }),
    }),

    // Delete message for me
    deleteMessage: builder.mutation<{ success: boolean }, { threadId: string; messageId: string }>({
      query: ({ threadId, messageId }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { threadId, messageId }) => [
        { type: "Messages", id: messageId },
        { type: "Messages", id: threadId },
      ],
    }),

    // Block thread
    blockThread: builder.mutation<{ success: boolean }, { threadId: string }>({
      query: ({ threadId }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/block`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { threadId }) => [{ type: "Threads", id: threadId }],
    }),

    // Unblock thread
    unblockThread: builder.mutation<{ success: boolean }, { threadId: string }>({
      query: ({ threadId }) => ({
        url: `${CHAT_BASE}/threads/${threadId}/unblock`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { threadId }) => [{ type: "Threads", id: threadId }],
    }),
  }),
});

export const {
  useGetThreadsQuery,
  useLazyGetThreadsQuery,
  useCreateDirectThreadMutation,
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  useGetPresignedUrlMutation,
  useDeleteMessageMutation,
  useBlockThreadMutation,
  useUnblockThreadMutation,
} = professionalMessagesApi;
