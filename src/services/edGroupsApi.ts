import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../lib/rtkBaseQuery';

// ED Groups API interfaces
export interface EdGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE";
  category: string;
  location: string;
  coverImageUrl: string;
  status: string;
  approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
    basicInfo?: any;
  };
  region?: {
    id: string;
    name: string;
  };
  chapter?: {
    id: string;
    name: string;
  };
}

export interface PendingGroupsResponse {
  success: boolean;
  data: EdGroup[];
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  filters?: {
    sortBy: string;
    sortOrder: string;
  };
}

export interface GroupDetailResponse {
  success: boolean;
  data: EdGroup;
}

export interface ApproveGroupRequest {
  reason?: string;
}

export interface RejectGroupRequest {
  reason: string;
}

export interface CreateEdGroupRequest {
  name: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE";
  category: string;
  location?: string;
  coverImageUrl?: string;
  ownerId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  search?: string;
}

// ED Groups API
export const edGroupsApi = createApi({
  reducerPath: 'edGroupsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['EdGroup'],
  endpoints: (builder) => ({
    // Get all groups with pagination and sorting
    getAllGroups: builder.query<PendingGroupsResponse, PaginationParams>({
      query: (params) => {
        const queryParams: any = {
          page: params?.page || 1,
          limit: params?.limit || 20,
          sortBy: params?.sortBy || 'createdAt',
          sortOrder: params?.sortOrder || 'desc',
        };
        
        // Only include status parameter if it's provided
        if (params?.status) {
          queryParams.status = params.status;
        }
        
        // Only include search parameter if it's provided
        if (params?.search) {
          queryParams.search = params.search;
        }
        
        return {
          url: '/admin/ed/groups',
          params: queryParams,
        };
      },
      providesTags: ['EdGroup'],
    }),

    // Get pending groups
    getPendingGroups: builder.query<PendingGroupsResponse, PaginationParams>({
      query: (params) => ({
        url: '/admin/ed/groups/pending',
        params: {
          page: params?.page || 1,
          limit: params?.limit || 10,
        },
      }),
      providesTags: ['EdGroup'],
    }),

    // Get group details for review
    getGroupForReview: builder.query<GroupDetailResponse, string>({
      query: (groupId) => `/admin/ed/groups/${groupId}`,
      providesTags: (_result, _error, groupId) => [{ type: 'EdGroup', id: groupId }],
    }),

    // Approve a group
    approveGroup: builder.mutation<GroupDetailResponse, { groupId: string; data?: ApproveGroupRequest }>({
      query: ({ groupId, data }) => ({
        url: `/admin/ed/groups/${groupId}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'EdGroup', id: groupId }, 'EdGroup'],
    }),

    // Reject a group
    rejectGroup: builder.mutation<GroupDetailResponse, { groupId: string; data: RejectGroupRequest }>({
      query: ({ groupId, data }) => ({
        url: `/admin/ed/groups/${groupId}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'EdGroup', id: groupId }, 'EdGroup'],
    }),

    // Delete a group
    deleteGroup: builder.mutation<void, string>({
      query: (groupId) => ({
        url: `/admin/ed/groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, groupId) => [{ type: 'EdGroup', id: groupId }, 'EdGroup'],
    }),

    // Create a group as ED admin (assign selected user as group admin)
    createEdGroup: builder.mutation<GroupDetailResponse, CreateEdGroupRequest>({
      query: (body) => ({
        url: '/admin/ed/groups/create',
        method: 'POST',
        body: {
          name: body.name,
          description: body.description,
          privacy: body.privacy,
          category: body.category,
          location: body.location,
          coverImageUrl: body.coverImageUrl,
          ownerId: body.ownerId,
        },
      }),
      invalidatesTags: ['EdGroup'],
    }),
  }),
});

// Export hooks
export const {
  useGetAllGroupsQuery,
  useGetPendingGroupsQuery,
  useGetGroupForReviewQuery,
  useApproveGroupMutation,
  useRejectGroupMutation,
  useDeleteGroupMutation,
  useCreateEdGroupMutation,
} = edGroupsApi;
