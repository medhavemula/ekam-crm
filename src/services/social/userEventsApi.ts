import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type UserSocialEventsListParams = {
  from?: string;
  to?: string;
  q?: string;
  eventType?: string;
  tab?: "all" | "mine" | "upcoming";
  page?: number;
  limit?: number;
};

export type UserSocialEventItem = {
  id: string;
  title: string;
  badge: string;
  startsAt: string;
  endsAt?: string | null;
  imageUrl: string | null;
  description: string;
  location: string;
  chapterId?: string;
  chapterName?: string | null;
  countryId?: string;
  countryName?: string | null;
  regionId?: string;
  regionName?: string | null;
  status: string;
  mode?: string;
  joinedCount: number;
  approvalStatus?: string | null;
  isCreatedByMe?: boolean;
  isJoined?: boolean;
};

export type UserSocialEventsListResponse = {
  success: boolean;
  data: {
    items: UserSocialEventItem[];
    page: number;
    limit: number;
    total: number;
  };
};

export type UserSocialEventDetailsResponse = {
  success: boolean;
  data: any;
};

export type UserSocialEventMembersParams = {
  eventId: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type UpdateMemberAttendanceParams = {
  eventId: string;
  memberId: string;
  attendance: "P" | "A";
};

export type UpdateMemberAttendanceResponse = {
  success: boolean;
  data: {
    memberId: string;
    attendance: string;
    status: string;
    checkInTime: string | null;
  };
};

export type UserSocialEventMember = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  attendance?: string;
  chapter?: string;
  chapterName?: string;
  area?: string;
  noOfVoluntary?: number;
  fundsDonated?: number;
  avatarUrl?: string;
};

export type UserSocialEventMembersResponse = {
  success: boolean;
  data: {
    items: UserSocialEventMember[];
    page: number;
    limit: number;
    total: number;
  };
};

export type UserSocialEventVolunteersParams = {
  eventId: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type UserSocialEventVolunteer = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  attendance?: string;
  phone?: string;
  category?: string | null;
  customCategory?: string;
  chapterName?: string;
  noOfVoluntary?: number;
  fundsDonated?: number;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  socialChapterId?: string | null;
  regionId?: string | null;
  countryId?: string | null;
};

export type UserSocialEventVolunteersResponse = {
  success: boolean;
  data: {
    items: UserSocialEventVolunteer[];
    page: number;
    limit: number;
    total: number;
  };
};

export type UserEventRsvpResponse = {
  success: boolean;
  data: {
    id: string;
    data: any;
  };
};

export type UserEventJoinResponse = {
  success: boolean;
  data: any;
};

export type UserEventMyRegistrationResponse = {
  success: boolean;
  data: {
    registered: boolean;
    registrationId?: string;
    status?: string;
    checkInTime?: string;
  };
};

export type CreateUserSocialEventRequest = {
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  tz?: string;
  socialChapterId: string;
  countryId?: string;
  regionId?: string;
  eventType?: string;
  category?: string;
  categoryLabel?: string;
  imageUrl?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  costForMembers?: number;
  costForNonMembers?: number;
  maxAttendees?: number;
  link?: string;
  mode?: string;
};

export type UpdateUserSocialEventRequest = {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  tz?: string;
  countryId?: string;
  regionId?: string;
  eventType?: string;
  category?: string;
  categoryLabel?: string;
  imageUrl?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  costForMembers?: number;
  maxAttendees?: number;
  link?: string;
};

export type CreateUserSocialEventResponse = {
  success: boolean;
  data: {
    id: string;
    slug: string;
    approvalStatus: string;
    message: string;
  };
};

export const socialUserEventsApi = createApi({
  reducerPath: "socialUserEventsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["UserSocialEvents", "UserSocialEvent"],
  endpoints: (builder) => ({
    getUserSocialEvents: builder.query<UserSocialEventsListResponse, UserSocialEventsListParams>({
      query: (params) => ({
        url: "/social/events",
        method: "GET",
        params,
      }),
      providesTags: ["UserSocialEvents"],
    }),

    getUserSocialEvent: builder.query<UserSocialEventDetailsResponse, string>({
      query: (id) => ({
        url: `/social/events/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "UserSocialEvent", id }],
    }),

    rsvpUserEvent: builder.mutation<UserEventRsvpResponse, string>({
      query: (id) => ({
        url: `/social/events/${id}/rsvp`,
        method: "POST",
      }),
      invalidatesTags: ["UserSocialEvents"],
    }),

    joinUserEvent: builder.mutation<UserEventJoinResponse, string>({
      query: (id) => ({
        url: `/social/events/${id}/join`,
        method: "POST",
      }),
      invalidatesTags: ["UserSocialEvents"],
    }),

    cancelRsvpUserEvent: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/social/events/${id}/rsvp`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserSocialEvents"],
    }),

    getUserEventRegistration: builder.query<UserEventMyRegistrationResponse, string>({
      query: (id) => ({
        url: `/social/events/${id}/my-registration`,
        method: "GET",
      }),
    }),

    createUserSocialEvent: builder.mutation<
      CreateUserSocialEventResponse,
      CreateUserSocialEventRequest
    >({
      query: (body) => ({
        url: "/social/events",
        method: "POST",
        body,
      }),
      invalidatesTags: ["UserSocialEvents"],
    }),

    presignUserEventImage: builder.mutation<
      { success: boolean; data: { key: string; uploadUrl: string; viewUrl: string | null } },
      { mime: string; size: number }
    >({
      query: (body) => ({
        url: "/social/events/presign",
        method: "POST",
        body,
      }),
    }),

    updateUserSocialEvent: builder.mutation<{ success: boolean; data: { id: string } }, UpdateUserSocialEventRequest>({
      query: ({ id, ...body }) => ({
        url: `/social/events/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "UserSocialEvents",
        { type: "UserSocialEvent", id },
      ],
    }),

    getUserSocialEventMembers: builder.query<
      UserSocialEventMembersResponse,
      UserSocialEventMembersParams
    >({
      query: ({ eventId, ...params }) => ({
        url: `/social/events/${eventId}/members`,
        method: "GET",
        params,
      }),
    }),

    getUserSocialEventVolunteers: builder.query<
      UserSocialEventVolunteersResponse,
      UserSocialEventVolunteersParams
    >({
      query: ({ eventId, ...params }) => ({
        url: `/social/events/${eventId}/volunteers`,
        method: "GET",
        params,
      }),
    }),

    updateMemberAttendance: builder.mutation<
      UpdateMemberAttendanceResponse,
      UpdateMemberAttendanceParams
    >({
      query: ({ eventId, memberId, attendance }) => ({
        url: `/social/events/${eventId}/members/${memberId}/attendance`,
        method: "PATCH",
        body: { attendance },
      }),
    }),
  }),
});

export const {
  useGetUserSocialEventsQuery,
  useGetUserSocialEventQuery,
  useRsvpUserEventMutation,
  useJoinUserEventMutation,
  useCancelRsvpUserEventMutation,
  useGetUserEventRegistrationQuery,
  useCreateUserSocialEventMutation,
  usePresignUserEventImageMutation,
  useUpdateUserSocialEventMutation,
  useGetUserSocialEventMembersQuery,
  useGetUserSocialEventVolunteersQuery,
  useUpdateMemberAttendanceMutation,
} = socialUserEventsApi;
