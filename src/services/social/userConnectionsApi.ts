import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type UserSocialConnectionsTab = "connections" | "requests" | "pending" | "suggested";

export type UserSocialConnectionsListParams = {
  tab?: UserSocialConnectionsTab;
  q?: string;
  socialChapterId?: string;
  page?: number;
  limit?: number;
  refreshKey?: number;
};

export type UserSocialConnectionItem = {
  id: string;
  connectionId?: string;
  user: {
    id: string;
    name: string;
    company?: string;
    role?: string;
    avatarUrl?: string;
    connectionsCount: number;
  };
  status: "ACCEPTED" | "PENDING_SENT" | "PENDING_RECEIVED" | "SUGGESTED";
};

export type UserSocialConnectionsListResponse = {
  success: boolean;
  data: {
    items: UserSocialConnectionItem[];
    page: number;
    limit: number;
    total: number;
  };
};

export type UserSocialConnectionProfileResponse = {
  success: boolean;
  data: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatarUrl: string | null;
    city?: string;
    state?: string;
    role?: string;
    company?: string;
    bio?: string;
    motivation?: string;
    hobbies?: string[];
    chapters?: {
      id: string;
      name: string;
      city?: string;
      area?: string;
      joinedAt?: string;
    }[];
    connectionsCount?: number;
  };
};

export type UserSocialConnectionsStatsResponse = {
  success: boolean;
  data: {
    myConnections: number;
    requests: number;
    pending: number;
    suggested: number;
  };
};

export type UserSocialConnectionsProfileSummaryResponse = {
  success: boolean;
  data: {
    id: string;
    name: string;
    avatarUrl?: string;
    company?: string;
    role?: string;
    eventsCount: number;
    connectionsCount: number;
  };
};

export const socialUserConnectionsApi = createApi({
  reducerPath: "socialUserConnectionsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["UserSocialConnections"],
  endpoints: (builder) => ({
    getUserSocialConnections: builder.query<UserSocialConnectionsListResponse, UserSocialConnectionsListParams>({
      query: ({ tab, refreshKey: _refreshKey, ...params }) => {
        const t = tab ?? "connections";
        const url =
          t === "connections"
            ? "/social/connections/my"
            : t === "requests"
              ? "/social/connections/requests"
              : t === "pending"
                ? "/social/connections/pending"
                : "/social/connections/suggested";

        return {
          url,
          method: "GET",
          params,
        };
      },
      providesTags: ["UserSocialConnections"],
    }),

    getUserSocialConnectionsStats: builder.query<UserSocialConnectionsStatsResponse, void>({
      query: () => ({
        url: "/social/connections/stats",
        method: "GET",
      }),
      providesTags: ["UserSocialConnections"],
    }),

    getUserSocialConnectionsProfileSummary: builder.query<UserSocialConnectionsProfileSummaryResponse, void>({
      query: () => ({
        url: "/social/connections/profile-summary",
        method: "GET",
      }),
      providesTags: ["UserSocialConnections"],
    }),

    sendUserSocialConnectionRequest: builder.mutation<{ success: boolean; data?: any }, { userId: string }>({
      query: ({ userId }) => ({
        url: `/social/connections/${userId}/request`,
        method: "POST",
      }),
      invalidatesTags: ["UserSocialConnections"],
    }),

    acceptUserSocialConnectionRequest: builder.mutation<{ success: boolean; data?: any }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `/social/connections/${connectionId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["UserSocialConnections"],
    }),

    rejectUserSocialConnectionRequest: builder.mutation<{ success: boolean; message?: string }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `/social/connections/${connectionId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["UserSocialConnections"],
    }),

    cancelUserSocialConnectionRequest: builder.mutation<{ success: boolean; message?: string }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `/social/connections/${connectionId}/cancel`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserSocialConnections"],
    }),

    removeUserSocialConnection: builder.mutation<{ success: boolean; message?: string }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `/social/connections/${connectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserSocialConnections"],
    }),

    getUserSocialConnectionProfile: builder.query<UserSocialConnectionProfileResponse, string>({
      query: (userId) => ({
        url: `/social/connections/${userId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetUserSocialConnectionsQuery,
  useGetUserSocialConnectionsStatsQuery,
  useGetUserSocialConnectionsProfileSummaryQuery,
  useGetUserSocialConnectionProfileQuery,
  useSendUserSocialConnectionRequestMutation,
  useAcceptUserSocialConnectionRequestMutation,
  useRejectUserSocialConnectionRequestMutation,
  useCancelUserSocialConnectionRequestMutation,
  useRemoveUserSocialConnectionMutation,
} = socialUserConnectionsApi;
