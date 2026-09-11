import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

// Create API slice with the reauthentication-enabled base query
export const apiSlice = createApi({
  reducerPath: "approvalsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Approvals", "Members"],
  endpoints: () => ({}),
});

export interface ApproveRejectResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface RejectRequest {
  remark: string;
}

export const approvalsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    approveMember: builder.mutation<ApproveRejectResponse, { approvalId: string }>({
      query: ({ approvalId }) => ({
        url: `/admin/approvals/${approvalId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Approvals', 'Members'],
    }),
    
    rejectMember: builder.mutation<ApproveRejectResponse, { approvalId: string; data: RejectRequest }>({
      query: (args) => ({
        url: `/admin/approvals/${args.approvalId}/reject`,
        method: 'POST',
        body: args.data,
      }),
      invalidatesTags: ['Approvals', 'Members'],
    }),

    // Registrations routed to the Super Admin because their chapter has no ED, RD or
    // ARD to review them (WEB-AUTH-06). The server returns only fallback-routed
    // applications, so this never duplicates what a reviewer sees in their own queue.
    getSuperAdminPendingApprovals: builder.query<any, void>({
      query: () => ({ url: '/admin/approvals/pending' }),
      providesTags: ['Approvals'],
    }),

    // Get pending approvals for business module
    getBusinessPendingApprovals: builder.query<any, { page?: number; limit?: number; chapterId?: string }>({
      query: (params) => ({
        url: '/admin/ed/approvals/pending',
        params: { moduleFilter: 'business', ...params },
      }),
      providesTags: ['Approvals'],
    }),

    // Approve business member
    approveBusinessMember: builder.mutation<any, { approvalId: string; data?: { grantModules?: string[] } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approvals'],
    }),

    // Reject business member
    rejectBusinessMember: builder.mutation<any, { approvalId: string; data: { remark: string } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approvals'],
    }),

    // Get pending approvals for professional module
    getProfessionalPendingApprovals: builder.query<any, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/admin/ed/approvals/pending',
        params: { moduleFilter: 'professional', ...params },
      }),
      providesTags: ['Approvals'],
    }),

    // Approve professional member
    approveProfessionalMember: builder.mutation<any, { approvalId: string; data?: { grantModules?: string[] } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approvals'],
    }),

    // Reject professional member
    rejectProfessionalMember: builder.mutation<any, { approvalId: string; data: { remark: string } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approvals'],
    }),

    // Get approved members with module and chapter filters
    getApprovedMembers: builder.query<any, { moduleFilter?: string; chapterId?: string; page?: number; limit?: number; search?: string; area?: string; status?: string }>({
      query: (params) => ({
        url: '/admin/ed/approvals/approved',
        params,
      }),
      providesTags: ['Members'],
    }),

    // Block user
    blockUser: builder.mutation<any, string>({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}/block`,
        method: 'POST',
      }),
      invalidatesTags: ['Members'],
    }),

    // Unblock user
    unblockUser: builder.mutation<any, string>({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}/unblock`,
        method: 'POST',
      }),
      invalidatesTags: ['Members'],
    }),

    // Soft-delete a member. Scope-checked server-side, so an ED can only reach
    // members in their own chapter/region. Irreversible: privileges are stripped,
    // sessions revoked, and the email released for re-registration.
    deleteMember: builder.mutation<
      { success: boolean; message?: string; data?: { id: string; status: string; freedEmail: string } },
      string
    >({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Members', 'Approvals'],
    }),

    // Issue a fresh temporary password and email it. The backend rejects this
    // once the member has set their own password, so it can only rescue someone
    // who never received their original credentials.
    resendMemberCredentials: builder.mutation<
      { success: boolean; message?: string; details?: { emailDelivered?: boolean; emailError?: string } },
      string
    >({
      query: (userId) => ({
        url: `/admin/ed/approvals/users/${userId}/regenerate-temp-password`,
        method: 'POST',
      }),
      invalidatesTags: ['Members'],
    }),
  }),
});

export const {
  useGetSuperAdminPendingApprovalsQuery,
  useApproveMemberMutation,
  useRejectMemberMutation,
  useGetBusinessPendingApprovalsQuery,
  useGetProfessionalPendingApprovalsQuery,
  useApproveBusinessMemberMutation,
  useRejectBusinessMemberMutation,
  useApproveProfessionalMemberMutation,
  useRejectProfessionalMemberMutation,
  useGetApprovedMembersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useResendMemberCredentialsMutation,
  useDeleteMemberMutation,
} = approvalsApi;
