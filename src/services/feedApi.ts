import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type FeedPost = {
  id: string;
  title: string;
  description: string;
  date: string; // ISO
  author?: { id: string; name: string };
  type?: string; // e.g., "post", "event"
};

export type FeedTimelineResponse = {
  success: boolean;
  data: FeedPost[];
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type FeedComment = {
  id: string;
  text: string;
  author?: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
};

export type FeedMediaItem = {
  key: string;
  type: "image" | "video" | "file";
  size?: number;
  width?: number;
  height?: number;
};

export type FeedPresignBatchResponse = {
  success: boolean;
  data: {
    files: Array<{
      uploadUrl: string;
      url: string;
      key: string;
      fileName: string;
      expiresIn: number;
    }>;
  };
};

export const feedApi = createApi({
  reducerPath: "feedApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    timeline: builder.query<
      FeedTimelineResponse,
      { cursor?: string | null; limit?: number }
    >({
      query: ({ cursor, limit } = {}) => ({
        url: "feed/timeline",
        params: { cursor, limit },
      }),
    }),
    userPosts: builder.query<
      { success: boolean; data: FeedPost[]; nextCursor?: string },
      { userId: string; cursor?: string; limit?: number }
    >({
      query: ({ userId, cursor, limit }) => ({ url: `feed/user/${userId}/posts`, params: { cursor, limit } }),
    }),
    presignFeedMediaBatch: builder.mutation<
      FeedPresignBatchResponse,
      { files: Array<{ fileName: string; contentType: string; fileSize: number }> }
    >({
      query: (body) => ({
        url: "feed/presign-batch",
        method: "POST",
        body,
      }),
    }),
    createPost: builder.mutation<
      { success: boolean; data?: any },
      { text: string; media?: FeedMediaItem[] | null }
    >({
      query: ({ text, media }) => ({
          url: "feed/posts",
          method: "POST",
          body: { text, media: media ?? [] },
      }),
    }),
    updatePost: builder.mutation<
      { success: boolean; data?: any },
      { postId: string; text?: string; media?: FeedMediaItem[] }
    >({
      query: ({ postId, text, media }) => ({
          url: `feed/posts/${postId}`,
          method: "PATCH",
          body: {
            ...(typeof text !== "undefined" ? { text } : {}),
            ...(typeof media !== "undefined" ? { media } : {}),
          },
      }),
    }),
    deletePost: builder.mutation<
      { success: boolean },
      { postId: string }
    >({
      query: ({ postId }) => ({
        url: `feed/posts/${postId}`,
        method: "DELETE",
      }),
    }),
    listComments: builder.query<
      { success: boolean; data: FeedComment[]; nextCursor?: string },
      { postId: string; cursor?: string; limit?: number }
    >({
      query: ({ postId, cursor, limit }) => ({
        url: `feed/posts/${postId}/comments`,
        params: { cursor, limit },
      }),
    }),
    addComment: builder.mutation<
      { success: boolean; data: FeedComment },
      { postId: string; text: string }
    >({
      query: ({ postId, text }) => ({
        url: `feed/posts/${postId}/comments`,
        method: "POST",
        body: { text },
      }),
    }),
    updateComment: builder.mutation<
      { success: boolean; data: FeedComment },
      { commentId: string; text: string }
    >({
      query: ({ commentId, text }) => ({
        url: `feed/comments/${commentId}`,
        method: "PATCH",
        body: { text },
      }),
    }),
    deleteComment: builder.mutation<
      { success: boolean },
      { commentId: string }
    >({
      query: ({ commentId }) => ({
        url: `feed/comments/${commentId}`,
        method: "DELETE",
      }),
    }),
    reactPost: builder.mutation<
      { success: boolean },
      { postId: string }
    >({
      query: ({ postId }) => ({
        url: `feed/posts/${postId}/react`,
        method: "POST",
      }),
    }),
    repostPost: builder.mutation<
      { success: boolean; data?: any },
      { postId: string; text?: string }
    >({
      query: ({ postId, text }) => ({
        url: `feed/posts/${postId}/repost`,
        method: "POST",
        body: { text },
      }),
    }),
    savePost: builder.mutation<
      { success: boolean },
      { postId: string }
    >({
      query: ({ postId }) => ({
        url: `feed/posts/${postId}/save`,
        method: "POST",
      }),
    }),
    listSaved: builder.query<
      { success: boolean; data: FeedPost[]; nextCursor?: string },
      { cursor?: string; limit?: number }
    >({
      query: ({ cursor, limit } = {}) => ({ url: "feed/saved", params: { cursor, limit } }),
    }),
    profileStats: builder.query<
      { success: boolean; data: { postsCount: number; connectionsCount: number; feedPostsCount: number } },
      void
    >({
      query: () => ({ url: "feed/profile/stats" }),
    }),
    getPost: builder.query<{ success: boolean; data: any }, { postId: string }>({
      query: ({ postId }) => ({ url: `feed/posts/${postId}` }),
    }),
  }),
});

export const {
  useTimelineQuery: useFeedTimelineQuery,
  useLazyTimelineQuery: useLazyFeedTimelineQuery,
  useUserPostsQuery: useFeedUserPostsQuery,
  useLazyUserPostsQuery: useLazyFeedUserPostsQuery,
  usePresignFeedMediaBatchMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useListCommentsQuery,
  useLazyListCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useReactPostMutation,
  useRepostPostMutation,
  useSavePostMutation,
  useListSavedQuery: useFeedListSavedQuery,
  useLazyListSavedQuery: useLazyFeedListSavedQuery,
  useProfileStatsQuery: useFeedProfileStatsQuery,
  useGetPostQuery,
} = feedApi as any;
