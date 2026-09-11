import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type SocialPartner = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  country?: { id: string; name: string } | null;
  region?: { id: string; name: string } | null;
  startDate?: string | null;
  expiryDate?: string | null;
  registrationDate?: string | null;
  renewalDate?: string | null;
  /** Social chapters this chairperson holds. The list endpoint returns this as
   *  chaptersCount; connectionsCount was never present on the response. */
  chaptersCount?: number;
  connectionsCount?: number;
  status?: string;
  daysLeft?: number;
};

/** One chapter assigned to a social partner, as the drill-down list needs it. */
export type SocialPartnerChapter = {
  id: string;
  chapter: { id: string; name?: string };
  area?: string;
  city?: string;
  region?: string;
  status?: string;
  members: number;
  events: number;
};

export type SocialChaptersParams = {
  id: string;
  page?: number;
  limit?: number;
  search?: string;
};

/**
 * Two shapes, on purpose.
 *
 * The endpoint used to return a bare array of `{ id, chapter }` with no
 * pagination. It now returns `{ items, page, limit, total }` with the chapter
 * fields populated — but a deployment running the older build still sends the
 * array, and reading `.items` off it yields undefined and an empty table. The
 * page accepts either and fills in what the old shape cannot carry.
 */
export type SocialChaptersSummary = {
  chapters: number;
  members: number;
  areas: number;
};

export type SocialChaptersResponse = {
  success: boolean;
  data:
    | SocialPartnerChapter[]
    | {
        items: SocialPartnerChapter[];
        page: number;
        limit: number;
        total: number;
        /** Summed server-side over the whole matching set. Absent on the older
         *  build, which returned a bare array. */
        summary?: SocialChaptersSummary;
      };
};

export type SocialOverviewParams = { id: string; from?: string; to?: string };
export type SocialOverviewResponse = { success: boolean; data: Record<string, number | string> };

export type SocialListParams = {
  q?: string;
  country_id?: string;
  region_id?: string;
  registration_from?: string;
  registration_to?: string;
  renewal_from?: string;
  renewal_to?: string;
  expiry_from?: string;
  expiry_to?: string;
  page?: number;
  limit?: number;
  role?: string;
};

export type PaginatedSocialResponse = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  data: SocialPartner[];
};

export type CreateSocialPartnerInput = {
  name: string;
  email: string;
  phone: string;
  country_id: string;
  region_id: string;
  role: string;
  startDate: string;
  expiryDate: string;
};

export const adminSocialApi = createApi({
  reducerPath: "adminSocialApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialPartners"],
  endpoints: (builder) => ({
    listSocialPartners: builder.query<PaginatedSocialResponse, SocialListParams>({
      query: (params) => ({
        url: "/admin/sa/social/partners",
        method: "GET",
        params,
      }),
      providesTags: (result) => {
        if (!result?.data || !Array.isArray(result.data)) {
          return [{ type: "SocialPartners" as const, id: "LIST" }];
        }
        
        return [
          ...result.data.map(({ id }) => ({
            type: "SocialPartners" as const,
            id,
          })),
          { type: "SocialPartners" as const, id: "LIST" },
        ];
      },
    }),
    getSocialPartner: builder.query<{ success: boolean; data: SocialPartner }, string>({
      query: (id) => ({
        url: `/admin/sa/social/partners/${id}`,
        method: "GET",
      }),
      providesTags: (_, __, id) => [{ type: "SocialPartners" as const, id }],
    }),
    getSocialOverview: builder.query<SocialOverviewResponse, SocialOverviewParams>({
      query: ({ id, ...params }) => ({
        url: `/admin/sa/social/partners/${id}/overview`,
        method: "GET",
        params,
      }),
      providesTags: (_, __, { id }) => [{ type: "SocialPartners" as const, id }],
    }),
    createSocialPartner: builder.mutation<{ success: boolean; data: SocialPartner }, CreateSocialPartnerInput>({
      query: (data) => ({
        url: "/admin/sa/social/partners",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "SocialPartners", id: "LIST" }],
    }),
    updateSocialPartner: builder.mutation<
      { success: boolean; data: SocialPartner },
      { id: string; data: Partial<CreateSocialPartnerInput> }
    >({
      query: ({ id, data }) => ({
        url: `/admin/sa/social/partners/${id}`,
        method: "PATCH",
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          country_id: data.country_id || (data as any).country,
          region_id: data.region_id || (data as any).region,
          role: data.role,
          startDate: data.startDate,
          expiryDate: data.expiryDate,
        },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
    renewSocialPartner: builder.mutation<
      { success: boolean; message: string }, 
      { id: string; renewalDate: string; expiryDate: string }
    >({
      query: ({ id, renewalDate, expiryDate }) => ({
        url: `/admin/sa/social/partners/${id}/renew`,
        method: "POST",
        body: { renewalDate, expiryDate },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
    // successorId is required by the server whenever the chairperson still holds
    // chapters, so none are left without an owner.
    deleteSocialPartner: builder.mutation<
      {
        success: boolean;
        message?: string;
        data?: {
          deleted: boolean;
          freedEmail: string;
          chaptersTransferred: number;
          successor: { id: string; name: string } | null;
        };
      },
      { id: string; successorId?: string }
    >({
      query: ({ id, successorId }) => ({
        url: `/admin/sa/social/partners/${id}`,
        method: "DELETE",
        body: successorId ? { successorId } : {},
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
    blockSocialPartner: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/admin/sa/social/partners/${id}/block`,
        method: "POST",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
    unblockSocialPartner: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/admin/sa/social/partners/${id}/unblock`,
        method: "POST",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
    getSocialPartnerChapters: builder.query<SocialChaptersResponse, SocialChaptersParams>({
      query: ({ id, ...params }) => ({
        url: `/admin/sa/social/partners/${id}/chapters`,
        method: "GET",
        params,
      }),
      providesTags: (_, __, { id }) => [{ type: "SocialPartners" as const, id }],
    }),
    resendInvite: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/admin/sa/social/partners/${id}/resend-invite`,
        method: "PUT",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "SocialPartners", id },
        { type: "SocialPartners", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListSocialPartnersQuery,
  useLazyListSocialPartnersQuery,
  useGetSocialPartnerQuery,
  useCreateSocialPartnerMutation,
  useUpdateSocialPartnerMutation,
  useRenewSocialPartnerMutation,
  useDeleteSocialPartnerMutation,
  useBlockSocialPartnerMutation,
  useUnblockSocialPartnerMutation,
  useResendInviteMutation,
  useGetSocialOverviewQuery,
  useGetSocialPartnerChaptersQuery,
} = adminSocialApi;