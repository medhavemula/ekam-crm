import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialVolunteersParams,
  SocialVolunteersResponse,
  CreateSocialVolunteerParams,
} from "./types";

export type UserSocialVolunteersListParams = {
  socialChapterId?: string;
  eventId?: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type UserSocialVolunteerItem = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  category?: string;
  customCategory?: string;
  eventName?: string;
  eventDate?: string;
  eventType?: string;
  chapterName?: string;
  area?: string;
  referredPerson?: string;
  createdAt?: string;
  attendance?: "PRESENT" | "ABSENT" | "PENDING";
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type UserSocialVolunteersListResponse = {
  success: boolean;
  data: {
    items: UserSocialVolunteerItem[];
    page: number;
    limit: number;
    total: number;
  };
};

export type CreateUserSocialVolunteerParams = {
  socialChapterId: string;
  countryId: string;
  regionId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  category?:
    | "GENERAL"
    | "EVENT_COORDINATOR"
    | "FUNDRAISER"
    | "OUTREACH"
    | "LOGISTICS"
    | "MARKETING"
    | "TECHNICAL"
    | "HOSPITALITY"
    | "OTHER";
  customCategory?: string;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  eventType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  attendance?: "PRESENT" | "ABSENT" | "PENDING";
};

export const socialVolunteersApi = createApi({
  reducerPath: "socialVolunteersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialVolunteers", "SocialDashboard"],
  endpoints: (builder) => ({
    getSocialVolunteers: builder.query<SocialVolunteersResponse, SocialVolunteersParams>({
      query: (params) => ({
        url: "/admin/sc/social/volunteers",
        method: "GET",
        params,
      }),
      providesTags: ["SocialVolunteers"],
    }),

    createSocialVolunteer: builder.mutation<{ success: boolean; data: { id: string } }, CreateSocialVolunteerParams>({
      query: (body) => ({
        url: "/admin/sc/social/volunteers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialVolunteers", "SocialDashboard"],
    }),

    removeSocialVolunteer: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/sc/social/volunteers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialVolunteers", "SocialDashboard"],
    }),

    // User-facing endpoint (non-admin) — hits /social/volunteers
    createUserSocialVolunteer: builder.mutation<
      { success: boolean; data: { id: string } },
      CreateUserSocialVolunteerParams
    >({
      query: (body) => ({
        url: "/social/volunteers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SocialVolunteers", "SocialDashboard"],
    }),

    getUserSocialVolunteers: builder.query<
      UserSocialVolunteersListResponse,
      UserSocialVolunteersListParams
    >({
      query: (params) => ({
        url: "/social/volunteers",
        method: "GET",
        params,
      }),
      providesTags: ["SocialVolunteers"],
    }),

    getUserSocialVolunteer: builder.query<
      { success: boolean; data: UserSocialVolunteerItem & { eventId?: string | null } },
      string
    >({
      query: (id) => ({
        url: `/social/volunteers/${id}`,
        method: "GET",
      }),
      providesTags: (_res, _err, id) => [{ type: "SocialVolunteers" as const, id }],
    }),

    updateUserSocialVolunteer: builder.mutation<
      { success: boolean; data: { id: string } },
      { id: string } & Partial<Omit<CreateUserSocialVolunteerParams, "socialChapterId">>
    >({
      query: ({ id, ...body }) => ({
        url: `/social/volunteers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SocialVolunteers", "SocialDashboard"],
    }),

    removeUserSocialVolunteer: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/social/volunteers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SocialVolunteers", "SocialDashboard"],
    }),
  }),
});

export const {
  useGetSocialVolunteersQuery,
  useCreateSocialVolunteerMutation,
  useRemoveSocialVolunteerMutation,
  useCreateUserSocialVolunteerMutation,
  useGetUserSocialVolunteersQuery,
  useGetUserSocialVolunteerQuery,
  useUpdateUserSocialVolunteerMutation,
  useRemoveUserSocialVolunteerMutation,
} = socialVolunteersApi;
