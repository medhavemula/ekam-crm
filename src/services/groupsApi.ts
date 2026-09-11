import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

// Types based on backend DTOs and models
export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE";
  category: string;
  memberCount: number;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ACTIVE" | "INACTIVE";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  coverImageUrl?: string;
  location?: string;
  postCount?: number;
  updatedAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  canJoin?: boolean;
  canRequestJoin?: boolean;
}

export interface CreateGroupParams {
  name: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE";
  category: string;
  location?: string;
  coverImageUrl?: string;
}

export interface UpdateGroupParams {
  name?: string;
  description?: string;
  privacy?: "PUBLIC" | "PRIVATE";
  category?: string;
  location?: string;
  coverImageUrl?: string;
}

export interface ListGroupsParams {
  tab: "suggested" | "my" | "requested";
  page?: number;
  limit?: number;
  search?: string;
  includePrivate?: boolean;
  privacy?: "all" | "public" | "private";
  include_private?: boolean;
  showPrivate?: boolean;
}

export interface ListGroupsResponse {
  success: boolean;
  items: Group[];
  page: number;
  limit: number;
  total: number;
}

export interface GroupMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface GroupJoinRequest {
  id: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface GroupJoinRequestsResponse {
  success: boolean;
  items: GroupJoinRequest[];
  page: number;
  limit: number;
  total: number;
}

export interface GroupInvite {
  id: string;
  groupId?: string;
  invitedUserId?: string;
  status?: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt?: string;
  invitedUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface GroupInvitesResponse {
  success: boolean;
  items?: GroupInvite[];
  data?: GroupInvite[];
  page?: number;
  limit?: number;
  total?: number;
}

export interface JoinRequestParams {
  groupId: string;
}

export interface InviteUserParams {
  groupId: string;
  invitedUserId: string;
  message?: string;
}

// Group Feed Types
export interface GroupFeedPost {
  id: string;
  text: string;
  authorUserId?: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    photoUrl?: string;
    photoUrlDecrypted?: string;
  };
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
  shareUrl?: string;
  media?: {
    id: string;
    url: string;
    type: "image" | "video";
    metadata?: any;
  }[];
  stats?: {
    likes: number;
    comments: number;
    reposts?: number;
    shares?: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  youLiked?: boolean;
  youSaved?: boolean;
  meta?: {
    liked?: boolean;
    saved?: boolean;
    canEdit?: boolean;
  };
  isRepost?: boolean;
  originalPost?: {
    id: string;
    text: string;
    shareUrl?: string;
    media?: {
      url: string;
      type: "image" | "video";
    }[];
    stats?: {
      likes: number;
      comments: number;
      reposts?: number;
      saves?: number;
    };
    createdAt: string;
    author?: {
      id: string;
      name: string;
      avatarUrl?: string;
      photoUrl?: string;
      photoUrlDecrypted?: string;
    } | null;
  } | null;
  groupId: string;
  groupName?: string;
  savedAt?: string;
}

export interface CreateGroupPostParams {
  text: string;
  media?: {
    url: string;
    type: "image" | "video";
    metadata?: any;
  }[];
}

export interface UpdateGroupPostParams {
  text?: string;
  media?: {
    url: string;
    type: "image" | "video";
    metadata?: any;
  }[];
}

export interface Comment {
  _id: string;
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  author?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  authorProfilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSummaryResponse {
  success: boolean;
  data: {
    header: {
      id: string;
      name: string;
      tagline: string;
      location: string;
      companySize: string;
      logoUrl: string;
      bannerUrl: string;
      phone: string;
      email: string;
      website: string;
    };
    stats: {
      posts: number;
      connections: number;
    };
  };
}

export interface GroupFeedResponse {
  success: boolean;
  items: GroupFeedPost[];
  page: number;
  limit: number;
  total: number;
  hasNext?: boolean;
}

export interface GetPresignCoverUrlParams {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface GetPresignUrlBatchParams {
  files: {
    fileName: string;
    contentType: string;
    fileSize: number;
  }[];
}

export const groupsApi = createApi({
  reducerPath: "groupsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Groups", "GroupMembers", "GroupFeed", "ProfileSummary"],
  endpoints: (builder) => ({
    // List groups with tabs (suggested, my, requested)
    listGroups: builder.query<ListGroupsResponse, ListGroupsParams>({
      query: (params) => ({
        url: "/groups",
        method: "GET",
        params,
      }),
      providesTags: ["Groups"],
    }),

    // Get presigned URL for group cover image upload
    getPresignCoverUrl: builder.mutation<
      { success: boolean; data: { uploadUrl: string; url: string; key: string; expiresIn: number } },
      { fileName: string; contentType: string; fileSize: number }
    >({
      query: (body) => ({
        url: "/groups/presign-cover-image",
        method: "POST",
        body,
      }),
    }),

    // Get single group details
    getGroup: builder.query<{ success: boolean; data: Group }, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Groups", id }],
    }),

    // Create new group
    createGroup: builder.mutation<{ success: boolean; data: Group }, CreateGroupParams>({
      query: (body) => ({
        url: "/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Groups"],
    }),

    // Update group (owner only)
    updateGroup: builder.mutation<{ success: boolean; data: Group }, { id: string; data: UpdateGroupParams }>({
      query: ({ id, data }) => ({
        url: `/groups/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Groups", id }],
    }),

    // Delete group (owner only)
    deleteGroup: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),

    // Join a public group
    joinGroup: builder.mutation<{ success: boolean }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/join`,
        method: "POST",
      }),
      invalidatesTags: ["Groups", "GroupMembers"],
    }),

    // Leave a group
    leaveGroup: builder.mutation<{ success: boolean }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/leave`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups", "GroupMembers"],
    }),

    // Request to join a private group
    requestJoinGroup: builder.mutation<{ success: boolean }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/request-join`,
        method: "POST",
      }),
      invalidatesTags: ["Groups"],
    }),

    // Cancel join request
    cancelJoinRequest: builder.mutation<{ success: boolean }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/request-join`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),

    // List group members
    listGroupMembers: builder.query<{ success: boolean; items: GroupMember[] }, { groupId: string; page?: number; limit?: number }>({
      query: ({ groupId, page, limit }) => ({
        url: `/groups/${groupId}/members`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _error, { groupId }) => [{ type: "GroupMembers", id: groupId }],
    }),

    // Update member role (owner only)
    updateMemberRole: builder.mutation<{ success: boolean }, { groupId: string; memberId: string; role: "admin" | "member" }>({
      query: ({ groupId, memberId, role }) => ({
        url: `/groups/${groupId}/members/${memberId}/role`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: ["GroupMembers"],
    }),

    // Remove member (owner/admin only)
    removeMember: builder.mutation<{ success: boolean }, { groupId: string; memberId: string }>({
      query: ({ groupId, memberId }) => ({
        url: `/groups/${groupId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["GroupMembers"],
    }),

    // List pending join requests (owner/admin only)
    listPendingRequests: builder.query<GroupJoinRequestsResponse, { groupId: string; page?: number; limit?: number }>({
      query: ({ groupId, page = 1, limit = 20 }) => ({
        url: `/groups/${groupId}/requests`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["Groups"],
    }),

    // Handle join request (approve/reject) (owner/admin only)
    handleJoinRequest: builder.mutation<{ success: boolean }, { groupId: string; requestId: string; action: "approve" | "reject"; reason?: string }>({
      query: ({ groupId, requestId, action, reason }) => ({
        url: `/groups/${groupId}/requests/${requestId}`,
        method: "POST",
        body: { action, reason },
      }),
      invalidatesTags: ["Groups", "GroupMembers"],
    }),

    // Invite user to group (owner/admin only)
    inviteUser: builder.mutation<{ success: boolean }, InviteUserParams>({
      query: ({ groupId, invitedUserId, message }) => ({
        url: `/groups/${groupId}/invite`,
        method: "POST",
        body: { invitedUserId, message },
      }),
      invalidatesTags: ["Groups"],
    }),

    // List my pending invites
    listMyInvites: builder.query<{ success: boolean; items: any[] }, { status?: "PENDING" | "ACCEPTED" | "DECLINED" } | void>({
      query: (params) => ({
        url: "/groups/my-invites",
        method: "GET",
        params: params && 'status' in params ? { status: params.status } : undefined,
      }),
      providesTags: ["Groups"],
    }),

    // Accept group invite
    acceptInvite: builder.mutation<{ success: boolean }, string>({
      query: (inviteId) => ({
        url: `/groups/invites/${inviteId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["Groups", "GroupMembers"],
    }),

    // Decline group invite
    declineInvite: builder.mutation<{ success: boolean }, string>({
      query: (inviteId) => ({
        url: `/groups/invites/${inviteId}/decline`,
        method: "POST",
      }),
      invalidatesTags: ["Groups"],
    }),

    // List pending invites for a group (owner/admin only)
    listGroupInvites: builder.query<GroupInvitesResponse, { groupId: string; status?: "PENDING" | "ACCEPTED" | "DECLINED"; page?: number; limit?: number }>({
      query: ({ groupId, status, page = 1, limit = 20 }) => ({
        url: `/groups/${groupId}/invites`,
        method: "GET",
        params: { page, limit, ...(status ? { status } : {}) },
      }),
      providesTags: ["Groups"],
    }),

    // Cancel pending invite (owner/admin only)
    cancelInvite: builder.mutation<{ success: boolean }, { groupId: string; inviteId: string }>({
      query: ({ groupId, inviteId }) => ({
        url: `/groups/${groupId}/invites/${inviteId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),

    // Get professional profile summary
    getProfileSummary: builder.query<ProfileSummaryResponse, string>({
      query: (profileId) => ({
        url: `/professional/profile/${profileId}/summary`,
        method: "GET",
      }),
      providesTags: ["ProfileSummary"],
    }),

    // Group Feed Endpoints
    
    // Get group feed posts
    getGroupFeed: builder.query<GroupFeedResponse, { groupId: string; page?: number; limit?: number }>({
      query: ({ groupId, page, limit }) => ({
        url: `/groups/${groupId}/feed`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Get single group post
    getGroupPost: builder.query<{ success: boolean; data: GroupFeedPost }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Create group post
    createGroupPost: builder.mutation<{ success: boolean; data: GroupFeedPost }, { groupId: string; data: CreateGroupPostParams }>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}/feed`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Update group post
    updateGroupPost: builder.mutation<{ success: boolean; data: GroupFeedPost }, { groupId: string; postId: string; data: UpdateGroupPostParams }>({
      query: ({ groupId, postId, data }) => ({
        url: `/groups/${groupId}/feed/${postId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Delete group post
    deleteGroupPost: builder.mutation<{ success: boolean }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Like group post
    likeGroupPost: builder.mutation<{ success: boolean; data: { isLiked: boolean; likesCount: number } }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Unlike group post
    unlikeGroupPost: builder.mutation<{ success: boolean; data: { isLiked: boolean; likesCount: number } }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}/like`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    saveGroupPost: builder.mutation<{ success: boolean; data: { saves?: number } }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}/save`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    unsaveGroupPost: builder.mutation<{ success: boolean; data: { saves?: number } }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({
        url: `/groups/${groupId}/feed/${postId}/save`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),

    // Get presigned URL for media upload
    getGroupFeedPresignUrl: builder.mutation<
      { success: boolean; data: { uploadUrl: string; url: string; key: string; expiresIn: number } },
      { groupId: string; data: GetPresignCoverUrlParams }
    >({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}/feed/presign`,
        method: "POST",
        body: data,
      }),
    }),

    // Get multiple presigned URLs for batch media upload
    getGroupFeedPresignUrlBatch: builder.mutation<
      { success: boolean; data: { uploadUrl: string; url: string; key: string; expiresIn: number }[] },
      { groupId: string; data: GetPresignUrlBatchParams }
    >({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}/feed/presign-batch`,
        method: "POST",
        body: data,
      }),
    }),

    // Comment endpoints for group posts
    listGroupPostComments: builder.query<
      { success: boolean; data: Comment[] },
      { groupId: string; postId: string; limit?: number; page?: number }
    >({
      query: ({ groupId, postId, limit = 10, page = 1 }) => ({
        url: `groups/${groupId}/feed/${postId}/comments?limit=${limit}&page=${page}`,
        method: 'GET',
      }),
    }),
    addGroupPostComment: builder.mutation<
      { success: boolean; data: Comment },
      { groupId: string; postId: string; text: string }
    >({
      query: ({ groupId, postId, text }) => ({
        url: `groups/${groupId}/feed/${postId}/comments`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),
    updateGroupPostComment: builder.mutation<
      { success: boolean; data: Comment },
      { groupId: string; postId: string; commentId: string; text: string }
    >({
      query: ({ groupId, postId, commentId, text }) => ({
        url: `groups/${groupId}/feed/${postId}/comments/${commentId}`,
        method: 'PATCH',
        body: { text },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),
    deleteGroupPostComment: builder.mutation<
      { success: boolean },
      { groupId: string; postId: string; commentId: string }
    >({
      query: ({ groupId, postId, commentId }) => ({
        url: `groups/${groupId}/feed/${postId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),
    // Repost endpoint for group posts
    repostGroupPost: builder.mutation<
      { success: boolean; data: any },
      { groupId: string; postId: string; text?: string }
    >({
      query: ({ groupId, postId, text }) => ({
        url: `groups/${groupId}/feed/${postId}/repost`,
        method: 'POST',
        body: text ? { text } : {},
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: "GroupFeed", id: groupId }],
    }),
  }),
});

export const {
  useListGroupsQuery,
  useGetPresignCoverUrlMutation,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useRequestJoinGroupMutation,
  useCancelJoinRequestMutation,
  useListGroupMembersQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useListPendingRequestsQuery,
  useHandleJoinRequestMutation,
  useInviteUserMutation,
  useListMyInvitesQuery,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useListGroupInvitesQuery,
  useCancelInviteMutation,
  // Profile hooks
  useGetProfileSummaryQuery,
  // Group Feed hooks
  useGetGroupFeedQuery,
  useGetGroupPostQuery,
  useCreateGroupPostMutation,
  useUpdateGroupPostMutation,
  useDeleteGroupPostMutation,
  useLikeGroupPostMutation,
  useUnlikeGroupPostMutation,
  useSaveGroupPostMutation,
  useUnsaveGroupPostMutation,
  useGetGroupFeedPresignUrlMutation,
  useGetGroupFeedPresignUrlBatchMutation,
  // Comment hooks
  useListGroupPostCommentsQuery,
  useAddGroupPostCommentMutation,
  useUpdateGroupPostCommentMutation,
  useDeleteGroupPostCommentMutation,
  // Repost hooks
  useRepostGroupPostMutation,
} = groupsApi;
