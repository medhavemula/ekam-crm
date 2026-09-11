import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../lib/rtkBaseQuery';

export const memberApi = createApi({
  reducerPath: 'memberApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Members'],
  endpoints: (builder) => ({
    // Approve member and assign to chapter
    approveMember: builder.mutation<{ success: boolean; message?: string }, { 
      approvalId: string; 
      data: { 
        remark: string; 
        chapterId?: string 
      } 
    }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/approve`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        // If response is already in the correct format, return it
        if (typeof response === 'object' && response !== null && 'success' in response) {
          return response;
        }
        // If the response is just a success message, return success: true
        return { success: true, message: response };
      },
      invalidatesTags: ['Members'],
    }),

        
    // Reject member request
    rejectMember: builder.mutation<{ success: boolean; message?: string }, { approvalId: string; data: { remark: string } }>({
      query: ({ approvalId, data }) => ({
        url: `/admin/ed/approvals/${approvalId}/reject`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        // If response is already in the correct format, return it
        if (typeof response === 'object' && response !== null && 'success' in response) {
          return response;
        }
        // If the response is just a success message, return success: true
        return { success: true, message: response };
      },
      invalidatesTags: ['Members'],
    }),
    
    // Block a user
    blockUser: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}/block`,
        method: 'POST',
      }),
      invalidatesTags: ['Members'],
    }),
    
    // Unblock a user
    unblockUser: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}/unblock`,
        method: 'POST',
      }),
      invalidatesTags: ['Members'],
    }),
    
    // Delete a user
    deleteUser: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: `/admin/ed/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Members'],
    }),
    
    // Mark member as move
    markAsMovedAway: builder.mutation<unknown, { approvalId: string; chapterId: string }>({
      query: ({ approvalId, chapterId }) => ({
        url: `/admin/ed/approvals/${approvalId}/place`,
        method: 'PATCH',
        body: { chapterId },
      }),
      invalidatesTags: ['Members'],
    }),

    // Update user's chapter
    updateUserChapter: builder.mutation<unknown, { userId: string; chapterId: string }>({
      query: ({ userId, chapterId }) => ({
        url: `/admin/ed/users/${userId}/chapter`,
        method: 'PATCH',
        body: { chapterId },
      }),
      invalidatesTags: ['Members'],
    }),

    // Update user profile (admin endpoint)
    updateUserProfile: builder.mutation<{ success: boolean; message?: string }, { 
      userId: string; 
      data: { 
        name?: string; 
        basicInfo?: Record<string, any>; 
        business?: Record<string, any>; 
        professional?: Record<string, any>; 
        social?: Record<string, any>; 
        moduleAccess?: {
          business?: boolean;
          professional?: boolean;
          social?: boolean;
        };
        membershipExpiryDate?: string;
      } 
    }>({
      query: ({ userId, data }) => ({
        url: `/admin/ed/users/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => {
        // If response is already in the correct format, return it
        if (typeof response === 'object' && response !== null && 'success' in response) {
          return response;
        }
        // If the response is just a success message, return success: true
        return { success: true, message: response };
      },
      invalidatesTags: ['Members'],
    }),

    // Update user profile (user endpoint)
    updateMyProfile: builder.mutation<{ success: boolean; message?: string }, { 
      data: { 
        name?: string; 
        basicInfo?: Record<string, any>; 
        business?: Record<string, any>; 
        professional?: Record<string, any>; 
        social?: Record<string, any>; 
      } 
    }>({
      query: ({ data }) => ({
        url: `/users/me`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => {
        // If response is already in the correct format, return it
        if (typeof response === 'object' && response !== null && 'success' in response) {
          return response;
        }
        // If the response is just a success message, return success: true
        return { success: true, message: response };
      },
      invalidatesTags: ['Members'],
    }),

    // Get user profile with actions for admin view
    getUserProfileWithActions: builder.query<{
      success: boolean;
      user: {
        _id: string;
        name: string;
        email: string;
        isEmailVerified: boolean;
        isApproved: boolean;
        status: string;
        profilePhotoUrl?: string;
        moduleAccess?: {
          business: boolean;
          professional: boolean;
          social: boolean;
        };
        basicInfo: {
          phone: string;
          gender: string;
          dob: string;
          streetAddress: string;
          city: string;
          state: string;
          pincode: string;
          country: string;
          region: string;
          chapter: string;
          chapterAnswer: string;
          whenToJoin: string;
          expectationNote: string;
          profilePhotoUrl?: string;
        };
        business: {
          businessName: string;
          businessCategory: string;
          subCategory: string;
          sponsorId: string;
          sponsorName: string;
          establishedYear: number;
          hqLocation: string;
          contactRole: string;
          companySize: string;
          workPreference: string;
          gstNumber: string;
          businessRegistrationNumber: string;
          panNumber: string;
          shortDescription: string;
        };
        professional: {
          role: string;
          yearsOfExperience: number;
          professionalCategory: string;
          skillsTechnologies: string[];
          workPreference: string;
        };
        social: {
          motivation: string;
          socialCategory: string[];
          hobbies: string;
          travelForEvents: string;
          socialChapterId: string;
        };
        assignments: Array<{
          role: string;
          isPrimary: boolean;
          scope?: {
            chapter: string;
          };
        }>;
        createdAt: string;
        updatedAt: string;
      };
      data: Array<{
        at: string;
        kind: string;
        actor: {
          id: string;
          name: string;
        } | null;
        data: Record<string, any>;
      }>;
      page: number;
      limit: number;
      total: number;
    }, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/admin/ed/users/${userId}/actions`,
        params: { page, limit },
      }),
    }),

    getEligibleForEdModulesUsers: builder.query<any, { search?: string; page?: number; limit?: number; moduleType?: "business" | "professional" | "all" }>({
      query: (params) => ({
        url: `/admin/ed/users/eligible-for-ed-modules`,
        params,
      }),
      providesTags: ['Members'],
    }),

    getGrantEdModulesPreview: builder.query<any, { userId: string }>({
      query: ({ userId }) => ({
        url: `/admin/ed/users/${userId}/grant-ed-modules-preview`,
      }),
      providesTags: ['Members'],
    }),

    grantEdModulesAccess: builder.mutation<
      { success: boolean; message?: string; data?: { grantedModules?: string[]; alreadyActiveModules?: string[] } },
      { userId: string; modules?: string[] }
    >({
      query: ({ userId, modules }) => ({
        url: `/admin/ed/users/${userId}/grant-ed-modules`,
        method: 'POST',
        body: { modules },
      }),
      invalidatesTags: ['Members'],
    }),

    directUpdateEmail: builder.mutation<
      { success: boolean; message?: string; data?: any },
      { userId: string; newEmail: string }
    >({
      query: ({ userId, newEmail }) => ({
        url: `/admin/email-updates/direct-update`,
        method: 'POST',
        body: { userId, newEmail },
      }),
      transformResponse: (response: any) => {
        if (typeof response === 'object' && response !== null && 'success' in response) {
          return response;
        }
        return { success: true, message: response };
      },
    }),
  }),
});

export const {
  useApproveMemberMutation,
  useRejectMemberMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useDeleteUserMutation,
  useMarkAsMovedAwayMutation,
  useUpdateUserChapterMutation,
  useUpdateUserProfileMutation,
  useUpdateMyProfileMutation,
  useGetUserProfileWithActionsQuery,
  useGetEligibleForEdModulesUsersQuery,
  useGetGrantEdModulesPreviewQuery,
  useGrantEdModulesAccessMutation,
  useDirectUpdateEmailMutation,
} = memberApi;
