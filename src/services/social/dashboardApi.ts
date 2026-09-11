import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialDashboardOverviewParams,
  SocialDashboardOverviewResponse,
  SocialDashboardChartsParams,
  SocialDashboardChartsResponse,
  SocialActivitiesOverviewParams,
  SocialActivitiesOverviewResponse,
  SocialAllActivitiesOverviewParams,
  SocialAllActivitiesOverviewResponse,
} from "./types";

export const socialDashboardApi = createApi({
  reducerPath: "socialDashboardApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "SocialDashboard",
    "SocialActivities",
    "SocialApprovals",
    "SocialUserActions",
    "SocialEligibleUsers",
  ],
  endpoints: (builder) => ({
    getSocialDashboardOverview: builder.query<SocialDashboardOverviewResponse, SocialDashboardOverviewParams>({
      query: (params) => ({
        url: "/admin/sc/social/dashboard/overview",
        method: "GET",
        params,
      }),
      providesTags: ["SocialDashboard"],
    }),

    getSocialDashboardCharts: builder.query<SocialDashboardChartsResponse, SocialDashboardChartsParams>({
      query: (params) => ({
        url: "/admin/sc/social/dashboard/charts",
        method: "GET",
        params,
      }),
      providesTags: ["SocialDashboard"],
    }),

    getSocialActivitiesOverview: builder.query<SocialActivitiesOverviewResponse, SocialActivitiesOverviewParams>({
      query: (params) => ({
        url: "/admin/sc/social/activities/overview",
        method: "GET",
        params,
      }),
      providesTags: ["SocialActivities"],
    }),

    // User-facing All Activities dashboard at /social/dashboard/overview
    getSocialAllActivitiesOverview: builder.query<
      SocialAllActivitiesOverviewResponse,
      SocialAllActivitiesOverviewParams
    >({
      query: (params) => ({
        url: "/social/dashboard/overview",
        method: "GET",
        params,
      }),
      providesTags: ["SocialActivities"],
    }),

    // My Events page KPIs (events I created/joined, donations I made, voluntaries I added)
    getMyEventsOverview: builder.query<
      {
        success: boolean;
        data: {
          kpis: {
            noOfEvents: number;
            noOfAttendedEvents: number;
            totalFundsDonated: number;
            upcomingEvents: number;
            noOfVoluntary: number;
          };
          window: { from: string; to: string };
        };
      },
      { from?: string; to?: string }
    >({
      query: (params) => ({
        url: "/social/dashboard/my-overview",
        method: "GET",
        params,
      }),
      providesTags: ["SocialActivities", "SocialDashboard"],
    }),

    // Get pending approvals for social module
    getSocialPendingApprovals: builder.query<any, { socialChapterId?: string; search?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/admin/sc/social/approvals/pending",
        params,
      }),
      providesTags: ["SocialApprovals"],
    }),

    // Approve social member
    approveSocialMember: builder.mutation<any, { approvalId: string; data?: { grantModules?: string[] } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/sc/social/approvals/${approvalId}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SocialApprovals'],
    }),

    // Reject social member
    rejectSocialMember: builder.mutation<any, { approvalId: string; data: { remark: string } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/sc/social/approvals/${approvalId}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SocialApprovals'],
    }),

    // Get approved social members for a chapter
    getSocialApprovedMembers: builder.query<any, { socialChapterId: string; search?: string; status?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/admin/sc/social/approvals/approved",
        params,
      }),
      providesTags: ["SocialApprovals"],
    }),

    // Get a pending member's profile + activity timeline for review before approval
    getScUserActions: builder.query<any, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/admin/sc/social/users/${userId}/actions`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { userId }) => [{ type: "SocialUserActions", id: userId }],
    }),

    getEligibleForSocialUsers: builder.query<
      any,
      { search?: string; page?: number; limit?: number; requireBoth?: boolean; hasSocialChapter?: boolean }
    >({
      query: ({ search, page = 1, limit = 20, requireBoth, hasSocialChapter }) => ({
        url: "/admin/sc/social/users/eligible-for-social",
        params: {
          ...(search ? { search } : {}),
          page,
          limit,
          ...(requireBoth !== undefined ? { requireBoth } : {}),
          ...(hasSocialChapter !== undefined ? { hasSocialChapter } : {}),
        },
      }),
      providesTags: ["SocialEligibleUsers"],
    }),

    getGrantSocialPreview: builder.query<any, { userId: string }>({
      query: ({ userId }) => ({
        url: `/admin/sc/social/users/${userId}/grant-social-preview`,
      }),
      providesTags: (_result, _error, { userId }) => [{ type: "SocialUserActions", id: `grant-preview-${userId}` }],
    }),

    grantSocialAccess: builder.mutation<any, { userId: string; socialChapterId?: string }>({
      query: ({ userId, socialChapterId }) => ({
        url: `/admin/sc/social/users/${userId}/grant-social`,
        method: "POST",
        body: socialChapterId ? { socialChapterId } : {},
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        "SocialApprovals",
        "SocialEligibleUsers",
        { type: "SocialUserActions", id: userId },
        { type: "SocialUserActions", id: `grant-preview-${userId}` },
      ],
    }),

    // Update a social member's profile (SC-scoped endpoint)
    updateSocialMember: builder.mutation<
      { success: boolean; message?: string },
      { userId: string; data: { name?: string; basicInfo?: Record<string, any>; moduleAccess?: string[]; social?: Record<string, any>; membershipExpiryDate?: string } }
    >({
      query: ({ userId, data }) => ({
        url: `/admin/sc/social/users/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        'SocialApprovals',
        'SocialEligibleUsers',
        { type: 'SocialUserActions', id: userId },
      ],
    }),

    // Block a social member
    blockSocialMember: builder.mutation<any, string>({
      query: (userId) => ({
        url: `/admin/sc/social/users/${userId}/block`,
        method: 'POST',
      }),
      invalidatesTags: ['SocialApprovals'],
    }),

    // Unblock a social member
    unblockSocialMember: builder.mutation<any, string>({
      query: (userId) => ({
        url: `/admin/sc/social/users/${userId}/unblock`,
        method: 'POST',
      }),
      invalidatesTags: ['SocialApprovals'],
    }),

    // Move a social member to another social chapter
    updateSocialUserChapter: builder.mutation<any, { userId: string; socialChapterId: string }>({
      query: ({ userId, socialChapterId }) => ({
        url: `/admin/sc/social/users/${userId}/chapter`,
        method: 'PATCH',
        body: { socialChapterId },
      }),
      invalidatesTags: ['SocialApprovals'],
    }),
  }),
});

export const {
  useGetSocialDashboardOverviewQuery,
  useGetSocialDashboardChartsQuery,
  useGetSocialActivitiesOverviewQuery,
  useGetSocialAllActivitiesOverviewQuery,
  useGetMyEventsOverviewQuery,
  useGetSocialPendingApprovalsQuery,
  useApproveSocialMemberMutation,
  useRejectSocialMemberMutation,
  useGetSocialApprovedMembersQuery,
  useGetScUserActionsQuery,
  useGetEligibleForSocialUsersQuery,
  useGetGrantSocialPreviewQuery,
  useGrantSocialAccessMutation,
  useUpdateSocialMemberMutation,
  useBlockSocialMemberMutation,
  useUnblockSocialMemberMutation,
  useUpdateSocialUserChapterMutation,
} = socialDashboardApi;
