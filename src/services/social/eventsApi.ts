import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialEventsListParams,
  SocialEventsListResponse,
  SocialEventMembersParams,
  SocialEventMembersResponse,
  SocialEventVolunteersParams,
  SocialEventVolunteersResponse,
  CreateSocialEventParams,
  UpdateSocialEventParams,
  ApproveRejectEventParams,
} from "./types";

export const socialEventsApi = createApi({
  reducerPath: "socialEventsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialEvents", "SocialDashboard", "SocialActivities"],
  endpoints: (builder) => ({
    getSocialEvents: builder.query<SocialEventsListResponse, SocialEventsListParams>({
      query: (params) => ({
        url: "/admin/sc/social/events",
        method: "GET",
        params,
      }),
      providesTags: ["SocialEvents"],
    }),

    getSocialEvent: builder.query<{ success: boolean; data: any }, string>({
      query: (id) => ({
        url: `/admin/sc/social/events/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "SocialEvents", id }],
    }),

    createSocialEvent: builder.mutation<{ success: boolean; data: { id: string } }, CreateSocialEventParams>({
      query: (body) => ({
        url: "/admin/sc/social/events",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialEvents", "SocialDashboard", "SocialActivities"],
    }),

    presignEventImage: builder.mutation<{ success: boolean; data: { uploadUrl: string; url: string } }, { fileName: string; contentType: string }>({
      query: (body) => ({
        url: "/admin/sc/social/events/presign-image",
        method: "POST",
        body,
      }),
    }),

    updateSocialEvent: builder.mutation<{ success: boolean }, UpdateSocialEventParams>({
      query: ({ id, ...body }) => ({
        url: `/admin/sc/social/events/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SocialEvents"],
    }),

    deleteSocialEvent: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/sc/social/events/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialEvents", "SocialDashboard", "SocialActivities"],
    }),

    approveSocialEvent: builder.mutation<{ success: boolean }, ApproveRejectEventParams>({
      query: ({ id, remark }) => ({
        url: `/admin/sc/social/events/${id}/approve`,
        method: "PATCH",
        body: { remark },
      }),
      invalidatesTags: ["SocialEvents", "SocialDashboard"],
    }),

    rejectSocialEvent: builder.mutation<{ success: boolean }, ApproveRejectEventParams>({
      query: ({ id, remark }) => ({
        url: `/admin/sc/social/events/${id}/reject`,
        method: "PATCH",
        body: { remark },
      }),
      invalidatesTags: ["SocialEvents", "SocialDashboard"],
    }),

    getSocialEventMembers: builder.query<SocialEventMembersResponse, SocialEventMembersParams>({
      query: ({ eventId, ...params }) => ({
        url: `/admin/sc/social/events/${eventId}/members`,
        method: "GET",
        params,
      }),
    }),

    addSocialEventMember: builder.mutation<
      { success: boolean; data: { id: string; status: string } },
      { eventId: string; memberId: string }
    >({
      query: ({ eventId, memberId }) => ({
        url: `/admin/sc/social/events/${eventId}/members`,
        method: "POST",
        body: { memberId },
      }),
      invalidatesTags: ["SocialEvents", "SocialDashboard", "SocialActivities"],
    }),

    getSocialEventVolunteers: builder.query<SocialEventVolunteersResponse, SocialEventVolunteersParams>({
      query: ({ eventId, ...params }) => ({
        url: `/admin/sc/social/events/${eventId}/volunteers`,
        method: "GET",
        params,
      }),
    }),
  }),
});

export const {
  useGetSocialEventsQuery,
  useGetSocialEventQuery,
  useCreateSocialEventMutation,
  usePresignEventImageMutation,
  useUpdateSocialEventMutation,
  useDeleteSocialEventMutation,
  useApproveSocialEventMutation,
  useRejectSocialEventMutation,
  useGetSocialEventMembersQuery,
  useAddSocialEventMemberMutation,
  useGetSocialEventVolunteersQuery,
} = socialEventsApi;
