import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type ModerationContentType =
  | "BUSINESS_POST"
  | "PROFESSIONAL_POST"
  | "GROUP_POST"
  | "BUSINESS_COMMENT"
  | "PROFESSIONAL_COMMENT"
  | "GROUP_COMMENT"
  | "CHAT_MESSAGE"
  | "SOCIAL_EVENT"
  | "SOCIAL_ACTIVITY"
  | "GROUP"
  | "PROFESSIONAL_PROFILE"
  | "BUSINESS_PROFILE"
  | "SOCIAL_PROFILE";

export type ModerationReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE"
  | "SEXUAL_CONTENT"
  | "VIOLENCE"
  | "MISINFORMATION"
  | "OTHER";

export const moderationApi = createApi({
  reducerPath: "moderationApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ModerationReports", "BlockedUsers"],
  endpoints: (builder) => ({
    reportContent: builder.mutation<
      { success: boolean; message?: string; data?: any },
      {
        contentType: ModerationContentType;
        contentId: string;
        targetUserId?: string;
        contextId?: string;
        reason: ModerationReason;
        details?: string;
        blockUser?: boolean;
      }
    >({
      query: (body) => ({
        url: "moderation/reports",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModerationReports"],
    }),
    blockUser: builder.mutation<
      { success: boolean; message?: string; data?: any },
      {
        userId: string;
        reason?: ModerationReason;
        details?: string;
        sourceContentType?: ModerationContentType;
        sourceContentId?: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: `moderation/users/${userId}/block`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModerationReports", "BlockedUsers"],
    }),
    listBlockedUsers: builder.query<
      {
        success: boolean;
        data: Array<{
          _id: string;
          userId: string;
          name: string;
          email?: string;
          phone?: string;
          avatarUrl?: string;
          reason?: ModerationReason;
          details?: string;
          sourceContentType?: ModerationContentType;
          sourceContentId?: string;
          blockedAt?: string;
        }>;
      },
      void
    >({
      query: () => ({
        url: "moderation/blocked-users",
      }),
      providesTags: ["BlockedUsers"],
    }),
    unblockUser: builder.mutation<{ success: boolean; message?: string; data?: any }, { userId: string }>({
      query: ({ userId }) => ({
        url: `moderation/users/${userId}/unblock`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["BlockedUsers", "ModerationReports"],
    }),
    listReports: builder.query<
      { success: boolean; data: { items: any[]; page: number; limit: number; total: number } },
      { status?: string; contentType?: ModerationContentType; page?: number; limit?: number }
    >({
      query: (params = {}) => ({
        url: "admin/moderation/reports",
        params,
      }),
      providesTags: ["ModerationReports"],
    }),
    resolveReport: builder.mutation<
      { success: boolean; data?: any },
      { reportId: string; action: "REMOVE_CONTENT" | "DISMISS" | "EJECT_USER"; note?: string }
    >({
      query: ({ reportId, ...body }) => ({
        url: `admin/moderation/reports/${reportId}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModerationReports"],
    }),
  }),
});

export const {
  useReportContentMutation,
  useBlockUserMutation,
  useListBlockedUsersQuery,
  useUnblockUserMutation,
  useListReportsQuery,
  useResolveReportMutation,
} = moderationApi;
