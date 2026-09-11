import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type FranchisePartner = {
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
  chaptersCount?: number;
  status?: string;
  daysLeft?: number;
  /** Outcome of the last invite email. Undefined for partners created before this was tracked. */
  inviteStatus?: "SENT" | "FAILED";
  inviteLastSentAt?: string | null;
  inviteError?: string | null;
  /** False once the partner has set their own password — resending would lock them out. */
  canResendInvite?: boolean;
};

export type EdOverviewParams = { id: string; from?: string; to?: string };
export type EdOverviewResponse = { success: boolean; data: Record<string, number | string> };

// Base filter types for drilldown APIs
export type BaseDrilldownFilters = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ChapterFilters = BaseDrilldownFilters & {
  status?: 'active' | 'ready_to_launch' | 'inactive';
  region?: string;
  area?: string;
  launchDateFrom?: string;
  launchDateTo?: string;
};

export type MemberFilters = BaseDrilldownFilters & {
  role?: string;
  chapter?: string;
  region?: string;
  area?: string;
  registrationDateFrom?: string;
  registrationDateTo?: string;
};

export type BusinessFilters = BaseDrilldownFilters & {
  status?: string;
  chapter?: string;
  valueFrom?: number;
  valueTo?: number;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
};

// Response types for drilldown APIs
export type ChapterResponse = {
  id: string;
  name: string;
  launchDate: string;
  region: string;
  area: string;
  memberCount: number;
  status: 'active' | 'ready_to_launch' | 'inactive';
  edId: string;
  edName: string;
};

export const REGIONAL_MEMBER_ROLES = [
  "REGIONAL_DIRECTOR",
  "ASSISTANT_REGIONAL_DIRECTOR",
  "CHAPTER_DIRECTOR",
  "SUPPORT_DIRECTOR",
] as const;

export type RegionalMemberRole = (typeof REGIONAL_MEMBER_ROLES)[number];

// Roles scoped to a single chapter; the create form requires a chapter for these.
export const CHAPTER_SCOPED_ROLES: readonly string[] = [
  "CHAPTER_DIRECTOR",
  "SUPPORT_DIRECTOR",
];

export type CreateRegionalMemberInput = {
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  role: RegionalMemberRole;
  chapterId?: string;
};

export type RegionalMemberResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  chapter: {
    id: string;
    name: string;
  };
  region: string;
  area: string;
  registrationDate: string;
  status: 'active' | 'inactive';
};

export type TotalMemberResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  chapter: {
    id: string;
    name: string;
  };
  region: string;
  area: string;
  registrationDate: string;
  status: 'active' | 'inactive';
};

export type BusinessOpportunityResponse = {
  id: string;
  name: string;
  description: string;
  value: number;
  status: string;
  chapter: {
    id: string;
    name: string;
  };
  memberResponsible: {
    id: string;
    name: string;
  };
  createdDate: string;
  expectedCloseDate: string;
  category: string;
};

export type BusinessClosedResponse = {
  id: string;
  name: string;
  amount: number;
  chapter: {
    id: string;
    name: string;
  };
  memberInvolved: {
    id: string;
    name: string;
  };
  completionDate: string;
  category: string;
  commissionAmount?: number;
};

export type ReadyToLaunchChapterResponse = {
  id: string;
  name: string;
  plannedLaunchDate: string;
  region: string;
  area: string;
  preparationStatus: 'planning' | 'recruiting' | 'training' | 'ready';
  readinessScore: number;
  edId: string;
  edName: string;
};

export type PaginatedDrilldownResponse<T> = {
  success: boolean;
  data: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: Record<string, any>;
    summary?: {
      totalValue?: number;
      averageValue?: number;
      counts?: Record<string, number>;
    };
  };
};

export type FranchiseListParams = {
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

export type PaginatedFranchiseResponse = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  data: FranchisePartner[];
};

export type CreateFranchisePartnerInput = {
  name: string;
  email: string;
  phone: string;
  role: string;
  startDate: string;
  expiryDate: string;
  country_id: string;
  region_id: string;
  createUser?: boolean;
  sendInvite?: boolean;
};

export const adminFranchiseApi = createApi({
  reducerPath: "adminFranchiseApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["FranchisePartners", "RegionalMembers"],
  endpoints: (builder) => ({
    getFranchisePartner: builder.query<{ success: boolean; data: FranchisePartner }, string>({
      query: (id) => ({ url: `admin/franchise-partners/${id}` }),
      transformResponse: (resp: any): { success: boolean; data: FranchisePartner } => {
        const p = resp?.data ?? resp;
        const data: FranchisePartner = {
          id: String(p.id ?? p._id ?? ""),
          name: p.name,
          email: p.email,
          phone: p.phone,
          role: p.role,
          country: p.country ? { id: String(p.country.id ?? p.country._id ?? p.country_id ?? ""), name: p.country.name ?? p.countryName } : null,
          region: p.region ? { id: String(p.region.id ?? p.region._id ?? p.region_id ?? ""), name: p.region.name ?? p.regionName } : null,
          startDate: p.startDate ?? p.registrationDate ?? null,
          expiryDate: p.expiryDate ?? null,
          registrationDate: p.registrationDate ?? null,
          renewalDate: p.renewalDate ?? null,
          chaptersCount: p.chaptersCount ?? p.noOfChapters ?? 0,
          status: p.status,
          daysLeft: p.daysLeft,
        };
        return { success: !!resp?.success, data };
      },
      providesTags: (_res, _err, id) => [{ type: "FranchisePartners", id }],
    }),
    listFranchisePartners: builder.query<PaginatedFranchiseResponse, FranchiseListParams | void>({
      query: (params) => ({ url: "admin/franchise-partners", params: params ?? {} }),
      transformResponse: (resp: any): PaginatedFranchiseResponse => {
        const items = resp?.data?.items ?? resp?.data ?? [];
        const page = resp?.data?.page ?? resp?.page ?? 1;
        const limit = resp?.data?.pageSize ?? resp?.data?.limit ?? resp?.limit ?? 24;
        const total = resp?.data?.total ?? resp?.total ?? items.length;
        const data: FranchisePartner[] = items.map((p: any) => ({
          id: String(p.id ?? p._id ?? ""),
          name: p.name,
          email: p.email,
          phone: p.phone,
          role: p.role,
          country: p.country ? { id: String(p.country.id ?? p.country._id ?? p.country_id ?? ""), name: p.country.name ?? p.countryName } : null,
          region: p.region ? { id: String(p.region.id ?? p.region._id ?? p.region_id ?? ""), name: p.region.name ?? p.regionName } : null,
          startDate: p.startDate ?? p.registrationDate ?? null,
          expiryDate: p.expiryDate ?? null,
          registrationDate: p.registrationDate ?? null,
          renewalDate: p.renewalDate ?? null,
          chaptersCount: p.chaptersCount ?? p.noOfChapters ?? 0,
          status: p.status,
          daysLeft: p.daysLeft,
          inviteStatus: p.inviteStatus,
          inviteLastSentAt: p.inviteLastSentAt ?? null,
          inviteError: p.inviteError ?? null,
          canResendInvite: p.canResendInvite ?? false,
        }));
        return { success: !!resp?.success, page, limit, total, data };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((p) => ({ type: "FranchisePartners" as const, id: p.id })),
              { type: "FranchisePartners" as const, id: "LIST" },
            ]
          : [{ type: "FranchisePartners" as const, id: "LIST" }],
    }),
    createFranchisePartner: builder.mutation<{ success: boolean; data: FranchisePartner }, CreateFranchisePartnerInput>({
      query: (body) => ({ url: "admin/franchise-partners", method: "POST", body }),
      invalidatesTags: [{ type: "FranchisePartners", id: "LIST" }],
    }),
    updateFranchisePartner: builder.mutation<{ success: boolean; data: FranchisePartner }, { id: string; body: Partial<CreateFranchisePartnerInput> & { chapter_ids?: string[] } }>({
      query: ({ id, body }) => ({ url: `admin/franchise-partners/${id}`, method: "PATCH", body }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    renewFranchisePartner: builder.mutation<{ success: boolean; data: FranchisePartner }, { id: string; body: { renewalDate: string; expiryDate: string } }>({
      query: ({ id, body }) => ({ url: `admin/franchise-partners/${id}/renew`, method: "POST", body }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    blockFranchisePartner: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/franchise-partners/${id}/block`, method: "POST" }),
      invalidatesTags: (_res, _err, id) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    unblockFranchisePartner: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/franchise-partners/${id}/unblock`, method: "POST" }),
      invalidatesTags: (_res, _err, id) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    deleteFranchisePartner: builder.mutation<
      { success: boolean; message?: string; data?: { deleted: boolean; freedEmail: string } },
      string
    >({
      query: (id) => ({ url: `admin/franchise-partners/${id}`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    resendFranchisePartnerInvite: builder.mutation<
      { success: boolean; message?: string; data?: { sent: boolean; createdUser: boolean; emailError?: string } },
      string
    >({
      query: (id) => ({ url: `admin/franchise-partners/${id}/resend-invite`, method: "PUT" }),
      invalidatesTags: (_res, _err, id) => [{ type: "FranchisePartners", id }, { type: "FranchisePartners", id: "LIST" }],
    }),
    getEdOverview: builder.query<EdOverviewResponse, EdOverviewParams>({
      query: ({ id, from, to }) => ({ url: `admin/eds/${id}/overview`, params: { from, to } }),
    }),
    // Drilldown endpoints for franchise partner details
    getChapters: builder.query<PaginatedDrilldownResponse<ChapterResponse>, { edId: string; filters?: ChapterFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/chapters`, params: filters }),
    }),
    getRegionalMembers: builder.query<PaginatedDrilldownResponse<RegionalMemberResponse>, { edId: string; filters?: MemberFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/regional-members`, params: filters }),
      providesTags: (_res, _err, { edId }) => [{ type: "RegionalMembers", id: edId }],
    }),
    createRegionalMember: builder.mutation<
      { success: boolean; data: RegionalMemberResponse },
      { edId: string; body: CreateRegionalMemberInput }
    >({
      query: ({ edId, body }) => ({
        url: `admin/eds/${edId}/regional-members`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { edId }) => [{ type: "RegionalMembers", id: edId }],
    }),
    getTotalMembers: builder.query<PaginatedDrilldownResponse<TotalMemberResponse>, { edId: string; filters?: MemberFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/total-members`, params: filters }),
    }),
    getBusinessOpportunities: builder.query<PaginatedDrilldownResponse<BusinessOpportunityResponse>, { edId: string; filters?: BusinessFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/business-opportunities`, params: filters }),
    }),
    getBusinessClosed: builder.query<PaginatedDrilldownResponse<BusinessClosedResponse>, { edId: string; filters?: BusinessFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/business-closed`, params: filters }),
    }),
    getReadyToLaunchChapters: builder.query<PaginatedDrilldownResponse<ReadyToLaunchChapterResponse>, { edId: string; filters?: ChapterFilters }>({
      query: ({ edId, filters }) => ({ url: `admin/eds/${edId}/ready-to-launch-chapters`, params: filters }),
    }),
  }),
});

export const { useListFranchisePartnersQuery, useLazyListFranchisePartnersQuery, useCreateFranchisePartnerMutation, useUpdateFranchisePartnerMutation, useRenewFranchisePartnerMutation, useBlockFranchisePartnerMutation, useUnblockFranchisePartnerMutation, useResendFranchisePartnerInviteMutation, useDeleteFranchisePartnerMutation, useGetFranchisePartnerQuery, useGetEdOverviewQuery, useGetChaptersQuery, useGetRegionalMembersQuery, useCreateRegionalMemberMutation, useGetTotalMembersQuery, useGetBusinessOpportunitiesQuery, useGetBusinessClosedQuery, useGetReadyToLaunchChaptersQuery } = adminFranchiseApi;
