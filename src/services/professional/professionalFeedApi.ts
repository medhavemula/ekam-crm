import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type FeedAuthor = {
  id: string;
  name?: string;
  photoUrl?: string;
  photoUrlDecrypted?: string;
  title?: string;
  company?: string;
};

export type FeedMedia = {
  url?: string;
  key?: string;
  type: string;
  size?: number;
};

export type FeedStats = {
  likes: number;
  comments: number;
  reposts: number;
  saves: number;
};

export type FeedMeta = {
  liked: boolean;
  saved: boolean;
  canEdit: boolean;
};

export type FeedItem = {
  id: string;
  author: FeedAuthor;
  text: string;
  media: FeedMedia[];
  stats: FeedStats;
  createdAt: string;
  updatedAt: string;
  meta: FeedMeta;
  original?: {
    author: FeedAuthor;
    text: string;
    media?: FeedMedia[];
    createdAt: string;
  };
};

export type ProfessionalFeedResponse = {
  success: boolean;
  data: {
    items: FeedItem[];
    page: number;
    limit: number;
    total: number;
  };
};

export type CreatePostRequest = {
  text: string;
  media?: Array<{
    url: string;
    type: string; // "image", "video", or file extension like "jpeg", "png", "mp4", etc.
  }>;
};

export type CreatePostResponse = {
  success: boolean;
  data?: FeedItem;
  message?: string;
};

export type UpdatePostRequest = {
  postId: string;
  text?: string;
  media?: Array<{ url: string; type: string }>;
};

export type DeletePostRequest = {
  postId: string;
};

export type ReactPostRequest = {
  postId: string;
};

export type LikePostRequest = {
  postId: string;
};

export type UnlikePostRequest = {
  postId: string;
};

export type SavePostRequest = {
  postId: string;
};

export type UnsavePostRequest = {
  postId: string;
};

export type RepostRequest = {
  postId: string;
  text?: string;
};

export type CommentAuthor = {
  id: string;
  name?: string;
  photoUrl?: string;
  photoUrlDecrypted?: string;
  title?: string;
  company?: string;
};

export type Comment = {
  id: string;
  postId: string;
  author: CommentAuthor;
  text: string;
  stats: {
    likes: number;
  };
  createdAt: string;
  meta: {
    liked: boolean;
    canEdit: boolean;
  };
};

export type CommentsResponse = {
  success: boolean;
  data: {
    items: Comment[];
    page: number;
    limit: number;
    total: number;
  };
};

export type AddCommentRequest = {
  postId: string;
  text: string;
};

export type AddCommentResponse = {
  success: boolean;
  data: Comment;
};

export type PresignRequest = {
  mime: string;
  size: string;
  kind: string;
};

export type PresignResponse = {
  success: boolean;
  data: {
    uploadUrl: string;
    key: string;
    viewUrl: string | null;
  };
};

export type ProfileSummaryHeader = {
  id: string;
  name: string;
  tagline: string | null;
  location: string;
  companySize: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
};

export type ProfileSummaryStats = {
  posts: number;
  connections: number;
};

export type ProfileSummaryResponse = {
  success: boolean;
  data: {
    header: ProfileSummaryHeader;
    stats: ProfileSummaryStats;
  };
};

export type ProfileAboutData = {
  company: string;
  summary: string | null;
  companySize: string | null;
  establishedYear: number | null;
  hqLocation: string | null;
  services: string[];
  logoUrl: string | null;
  bannerUrl: string | null;
};

export type ProfileAboutResponse = {
  success: boolean;
  data: ProfileAboutData;
};

export const professionalFeedApi = createApi({
  reducerPath: "professionalFeedApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ProfessionalFeed", "MyFeed", "SavedFeed", "ProfileSummary"],
  endpoints: (builder) => ({
    getFeed: builder.query<ProfessionalFeedResponse, { page?: number; limit?: number }>({
      query: (params = {}) => ({
        url: "professional/feed",
        params: Object.fromEntries(
          Object.entries({
            page: params.page,
            limit: params.limit
          }).filter(([_, value]) => value !== undefined)
        ),
      }),
      providesTags: ["ProfessionalFeed"],
    }),
    getPost: builder.query<{ success: boolean; data: FeedItem }, { postId: string }>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}`,
      }),
    }),
    getMyFeed: builder.query<ProfessionalFeedResponse, { page?: number; limit?: number }>({
      query: (params = {}) => ({
        url: "professional/feed/my",
        params: Object.fromEntries(
          Object.entries({
            page: params.page,
            limit: params.limit
          }).filter(([_, value]) => value !== undefined)
        ),
      }),
      providesTags: ["MyFeed"],
    }),
    getUserFeed: builder.query<ProfessionalFeedResponse, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, ...params }) => ({
        url: `professional/profile/${userId}/feed`,
        params: Object.fromEntries(
          Object.entries({
            page: params.page,
            limit: params.limit
          }).filter(([_, value]) => value !== undefined)
        ),
      }),
      providesTags: ["MyFeed"],
    }),
    getSavedFeed: builder.query<ProfessionalFeedResponse, { page?: number; limit?: number }>({
      query: (params = {}) => ({
        url: "professional/saved",
        params: Object.fromEntries(
          Object.entries({
            page: params.page,
            limit: params.limit
          }).filter(([_, value]) => value !== undefined)
        ),
      }),
      providesTags: ["SavedFeed"],
    }),
    createPost: builder.mutation<CreatePostResponse, CreatePostRequest>({
      query: ({ text, media }) => {
        return {
          url: "professional/posts",
          method: "POST",
          body: {
            text: text || "",
            media: media || [],
          },
        };
      },
      invalidatesTags: ["ProfessionalFeed", "MyFeed", "ProfileSummary"],
    }),
    updatePost: builder.mutation<CreatePostResponse, UpdatePostRequest>({
      query: ({ postId, text, media }) => {
        return {
          url: `professional/posts/${postId}`,
          method: "PATCH",
          body: {
            text: text || "",
            media: media || [],
          },
        };
      },
      invalidatesTags: ["ProfessionalFeed", "MyFeed", "SavedFeed", "ProfileSummary"],
    }),
    deletePost: builder.mutation<{ success: boolean; data: { id: string } }, DeletePostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProfessionalFeed", "MyFeed", "SavedFeed", "ProfileSummary"],
    }),
    reactPost: builder.mutation<{ success: boolean }, ReactPostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: ["ProfessionalFeed", "MyFeed", "SavedFeed"],
    }),
    likePost: builder.mutation<{ success: boolean }, LikePostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: ["MyFeed", "SavedFeed"],
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        // Optimistically update all feed caches
        const patchResults: Array<{ undo: () => void }> = [];

        // Update main feed
        const feedPatch = dispatch(
          professionalFeedApi.util.updateQueryData("getFeed", { page: 1, limit: 20 }, (draft) => {
            const post = draft.data.items.find((p) => String(p.id) === String(postId));
            if (post) {
              post.meta.liked = true;
              post.stats.likes += 1;
            }
          }),
        );
        patchResults.push(feedPatch);

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patch) => patch.undo());
        }
      },
    }),
    updateComment: builder.mutation<{ success: boolean; data: Comment }, { commentId: string; text: string }>({
      query: ({ commentId, text }) => ({
        url: `professional/comments/${commentId}`,
        method: "PATCH",
        body: { text },
      }),
      invalidatesTags: ["ProfessionalFeed"],
    }),
    deleteComment: builder.mutation<{ success: boolean; data?: { id: string } }, { commentId: string }>({
      query: ({ commentId }) => ({
        url: `professional/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProfessionalFeed"],
    }),
    likeComment: builder.mutation<{ success: boolean }, { commentId: string }>({
      query: ({ commentId }) => ({
        url: `professional/comments/${commentId}/like`,
        method: "POST",
      }),
    }),
    unlikeComment: builder.mutation<{ success: boolean }, { commentId: string }>({
      query: ({ commentId }) => ({
        url: `professional/comments/${commentId}/like`,
        method: "DELETE",
      }),
    }),
    unlikePost: builder.mutation<{ success: boolean }, UnlikePostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: ["MyFeed", "SavedFeed"],
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        // Optimistically update all feed caches
        const patchResults: Array<{ undo: () => void }> = [];

        // Update main feed
        const feedPatch = dispatch(
          professionalFeedApi.util.updateQueryData("getFeed", { page: 1, limit: 20 }, (draft) => {
            const post = draft.data.items.find((p) => String(p.id) === String(postId));
            if (post) {
              post.meta.liked = false;
              post.stats.likes = Math.max(0, post.stats.likes - 1);
            }
          }),
        );
        patchResults.push(feedPatch);

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patch) => patch.undo());
        }
      },
    }),
    savePost: builder.mutation<{ success: boolean; data: { id: string } }, SavePostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}/save`,
        method: "POST",
      }),
      invalidatesTags: ["SavedFeed", "MyFeed"],
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        // Optimistically update all feed caches
        const patchResults: Array<{ undo: () => void }> = [];

        // Update main feed
        const feedPatch = dispatch(
          professionalFeedApi.util.updateQueryData("getFeed", { page: 1, limit: 20 }, (draft) => {
            const post = draft.data.items.find((p) => String(p.id) === String(postId));
            if (post) {
              post.meta.saved = true;
            }
          }),
        );
        patchResults.push(feedPatch);

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patch) => patch.undo());
        }
      },
    }),
    unsavePost: builder.mutation<{ success: boolean }, UnsavePostRequest>({
      query: ({ postId }) => ({
        url: `professional/posts/${postId}/save`,
        method: "DELETE",
      }),
      invalidatesTags: ["SavedFeed", "MyFeed"],
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        // Optimistically update all feed caches
        const patchResults: Array<{ undo: () => void }> = [];

        // Update main feed
        const feedPatch = dispatch(
          professionalFeedApi.util.updateQueryData("getFeed", { page: 1, limit: 20 }, (draft) => {
            const post = draft.data.items.find((p) => String(p.id) === String(postId));
            if (post) {
              post.meta.saved = false;
            }
          }),
        );
        patchResults.push(feedPatch);

        // Update saved feed - remove the post
        const savedFeedPatch = dispatch(
          professionalFeedApi.util.updateQueryData("getSavedFeed", { page: 1, limit: 20 }, (draft) => {
            draft.data.items = draft.data.items.filter((p) => String(p.id) !== String(postId));
            draft.data.total = Math.max(0, draft.data.total - 1);
          }),
        );
        patchResults.push(savedFeedPatch);

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach((patch) => patch.undo());
        }
      },
    }),
    repost: builder.mutation<CreatePostResponse, RepostRequest>({
      query: ({ postId, text }) => ({
        url: `professional/posts/${postId}/repost`,
        method: "POST",
        body: { text: text || "" },
      }),
      invalidatesTags: ["ProfessionalFeed", "MyFeed"],
    }),
    getComments: builder.query<CommentsResponse, { postId: string; page?: number; limit?: number }>({
      query: ({ postId, page = 1, limit = 20 }) => ({
        url: `professional/posts/${postId}/comments`,
        params: { page, limit },
      }),
    }),
    addComment: builder.mutation<AddCommentResponse, AddCommentRequest>({
      query: ({ postId, text }) => ({
        url: `professional/posts/${postId}/comments`,
        method: "POST",
        body: { text },
      }),
      invalidatesTags: ["ProfessionalFeed"],
      async onQueryStarted({ postId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          // Update comment count in all feed caches
          dispatch(
            professionalFeedApi.util.updateQueryData("getFeed", { page: 1, limit: 20 }, (draft) => {
              const post = draft.data.items.find((p) => String(p.id) === String(postId));
              if (post) {
                post.stats.comments += 1;
              }
            }),
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    presignUpload: builder.mutation<PresignResponse, PresignRequest>({
      query: ({ mime, size, kind }) => ({
        url: "professional/posts/presign",
        method: "POST",
        body: { mime, size, kind },
      }),
    }),
    getProfileSummary: builder.query<ProfileSummaryResponse, { userId: string }>({
      query: ({ userId }) => ({
        url: `professional/profile/${userId}/summary`,
      }),
      providesTags: ["ProfileSummary"],
    }),
    getProfileAbout: builder.query<ProfileAboutResponse, { userId: string }>({
      query: ({ userId }) => ({
        url: `professional/profile/${userId}/about`,
      }),
    }),
  }),
});

export const {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useGetPostQuery,
  useLazyGetPostQuery,
  useGetMyFeedQuery,
  useLazyGetMyFeedQuery,
  useGetUserFeedQuery,
  useLazyGetUserFeedQuery,
  useGetSavedFeedQuery,
  useLazyGetSavedFeedQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useReactPostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useSavePostMutation,
  useUnsavePostMutation,
  useRepostMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useLikeCommentMutation,
  useUnlikeCommentMutation,
  usePresignUploadMutation,
  useGetProfileSummaryQuery,
  useGetProfileAboutQuery,
} = professionalFeedApi;
