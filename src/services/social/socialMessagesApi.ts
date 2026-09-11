import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type SocialMessageThread = {
  id: string;
  participant: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    online?: boolean;
    lastSeenAt?: string | Date | null;
  };
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageAt: string;
  unreadCount?: number;
};

export type SocialMessage = {
  id: string;
  senderId: string;
  subject?: string;
  body: string;
  type: "TEXT" | "IMAGE" | "FILE" | "VIDEO";
  media?: {
    key: string;
    url: string;
    mime: string;
    size: number;
  };
  createdAt: string;
  isMe: boolean;
};

export type SocialThreadDetail = {
  thread: {
    id: string;
    participant: {
      id: string | null;
      name: string;
      avatarUrl: string | null;
      online?: boolean;
      lastSeenAt?: string | Date | null;
    };
  };
  messages: SocialMessage[];
  page: number;
  limit: number;
  total: number;
};

export type ListThreadsParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export type GetThreadParams = {
  threadId: string;
  page?: number;
  limit?: number;
};

export type CreateMessageParams = {
  userId: string;
  subject?: string;
  body?: string;
  mediaKey?: string;
  mediaMeta?: {
    key: string;
    mime: string;
    size: number;
  };
};

export type ReplyToThreadParams = {
  threadId: string;
  body?: string;
  mediaKey?: string;
  mediaMeta?: {
    key: string;
    mime: string;
    size: number;
  };
};

export type GetOrCreateThreadResponse = {
  success: boolean;
  data: {
    thread: {
      id: string;
      participant: {
        id: string | null;
        name: string;
        avatarUrl: string | null;
      };
      lastMessage?: {
        body: string;
        senderId: string;
        createdAt: string;
      } | null;
      lastMessageAt?: string;
    };
  };
};

export type SocialPresignRequest = {
  mime: string;
  size: number;
  kind: "IMAGE" | "FILE" | "VIDEO";
};

export type SocialPresignResponse = {
  success: boolean;
  data: {
    key: string;
    uploadUrl: string;
    viewUrl: string | null;
  };
};

export const socialMessagesApi = createApi({
  reducerPath: "socialMessagesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialThreads", "SocialMessages"],
  endpoints: (builder) => ({
    getSocialThreads: builder.query<
      { success: boolean; data: { items: SocialMessageThread[]; page: number; limit: number; total: number } },
      ListThreadsParams
    >({
      query: (params) => ({
        url: "/social/messages",
        method: "GET",
        params,
      }),
      providesTags: ["SocialThreads"],
    }),

    getSocialThread: builder.query<{ success: boolean; data: SocialThreadDetail }, GetThreadParams>({
      query: ({ threadId, page = 1, limit = 50 }) => ({
        url: `/social/messages/${threadId}`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _error, arg) => [{ type: "SocialMessages", id: arg.threadId }],
    }),

    createSocialMessage: builder.mutation<
      { success: boolean; data: { threadId: string; messageId: string } },
      CreateMessageParams
    >({
      query: (body) => ({
        url: "/social/messages",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialThreads"],
    }),

    replyToSocialThread: builder.mutation<
      { success: boolean; data: { messageId: string } },
      ReplyToThreadParams
    >({
      query: ({ threadId, ...payload }) => ({
        url: `/social/messages/${threadId}/reply`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "SocialThreads",
        { type: "SocialMessages", id: arg.threadId },
      ],
    }),

    getOrCreateSocialThread: builder.mutation<GetOrCreateThreadResponse, { userId: string }>({
      query: ({ userId }) => ({
        url: `/social/messages/thread/${userId}`,
        method: "GET",
      }),
      invalidatesTags: ["SocialThreads"],
    }),

    getSocialPresignedUrl: builder.mutation<SocialPresignResponse, SocialPresignRequest>({
      query: (body) => ({
        url: "/social/messages/media/presign",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetSocialThreadsQuery,
  useGetSocialThreadQuery,
  useCreateSocialMessageMutation,
  useReplyToSocialThreadMutation,
  useGetOrCreateSocialThreadMutation,
  useGetSocialPresignedUrlMutation,
} = socialMessagesApi;
