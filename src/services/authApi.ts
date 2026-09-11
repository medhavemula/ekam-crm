import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type User = {
  _id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  isApproved: boolean;
  status: "active" | "inactive" | "banned";
  assignments: any[];
  basicInfo?: {
    chapter?: string;
    [key: string]: any;
  };
  business?: {
    businessName?: string;
    [key: string]: any;
  };
  professional?: {
    role?: string;
    [key: string]: any;
  };
  moduleAccess?: {
    business?: boolean;
    professional?: boolean;
    social?: boolean;
    [key: string]: any;
  };
};

// Registration request payload matching backend expectation
// name, email at root and nested sections for basicInfo, business, professional, social
export type RegisterRequest = {
  name: string;
  email: string;
  basicInfo?: Record<string, any>;
  business?: Record<string, any>;
  professional?: Record<string, any>;
  social?: Record<string, any>;
};

 

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Me", "UsersMe"],
  endpoints: (builder) => ({
    register: builder.mutation<{ success: boolean; message?: string }, RegisterRequest>({
      query: (body) => ({
        url: "auth/register",
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      }),
    }),
    verifyOtp: builder.mutation<
      { success: boolean; message?: string },
      { email: string; code: string }
    >({
      query: (body) => ({ url: "auth/verify-otp", method: "POST", body }),
    }),
    verifyOtpPasswordReset: builder.mutation<
      { success: boolean; message?: string },
      { email: string; code: string }
    >({
      query: ({ email, code }) => ({
        url: "auth/verify-otp",
        method: "POST",
        body: { email, code, purpose: "password_reset" },
      }),
    }),
    login: builder.mutation<{ success: boolean }, { email: string; password: string; rememberMe?: boolean }>({
      query: (body) => ({ url: "auth/login", method: "POST", body }),
    }),
    refresh: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "auth/refresh", method: "POST" }),
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
    }),
    forgotPassword: builder.mutation<{ success: boolean }, { email: string }>({
      query: (body) => ({ url: "auth/forgot-password", method: "POST", body }),
    }),
    resendOtp: builder.mutation<{ success: boolean; message?: string }, { email: string; purpose?: string }>({
      query: (body) => ({ url: "auth/resend-otp", method: "POST", body }),
    }),
    resendCredentials: builder.mutation<{ success: boolean; message?: string }, { email: string }>({
      query: (body) => ({ url: "auth/resend-credentials", method: "POST", body }),
    }),
    changePassword: builder.mutation<
      { success: boolean; message?: string },
      { oldPassword: string; newPassword: string }
    >({
      query: (body) => {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return {
          url: "auth/change-password",
          method: "POST",
          body,
          headers,
        };
      },
    }),
    resetPassword: builder.mutation<{ success: boolean }, { email: string; code: string; password: string }>({
      query: (body) => ({ url: "auth/reset-password", method: "POST", body }),
    }),
    me: builder.query<{ success: boolean; data: User }, void>({
      query: () => ({ url: "account/me" }),
      providesTags: [{ type: "Me", id: "CURRENT" }],
    }),
    usersMe: builder.query<{ success: boolean; data: any }, void>({
      query: () => ({ url: "users/me" }),
      providesTags: [{ type: "UsersMe", id: "CURRENT" }],
    }),
    searchUsers: builder.query<{ success: boolean; data: Array<{ _id: string; name: string; email: string }> }, { q?: string; limit?: number }>({
      query: (params) => ({ url: "users", params }),
    }),
    updateMe: builder.mutation<{ success: boolean; data?: any; message?: string }, Partial<{ name: string; basicInfo: Record<string, any>; business: Record<string, any>; professional: Record<string, any>; social: Record<string, any> }>>({
      query: (body) => ({ url: "users/me", method: "PATCH", body }),
      invalidatesTags: [
        { type: "Me", id: "CURRENT" },
        { type: "UsersMe", id: "CURRENT" },
      ],
    }),
    hardDeleteMe: builder.mutation<{ success: boolean; data?: { ok: boolean }; message?: string }, void>({
      query: () => ({ url: "account/me/hard", method: "DELETE" }),
    }),
    verifyPTeam: builder.mutation<{ success: boolean; message?: string; data?: any }, { token: string; email: string }>({
      query: ({ token, email }) => ({
        url: `auth/pteam/verify?token=${token}&email=${email}`,
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    }),
    setPTeamPassword: builder.mutation<{ success: boolean; message?: string }, { email: string; tempPassword: string; newPassword: string }>({
      query: ({ email, tempPassword, newPassword }) => ({
        url: "auth/pteam/set-password",
        method: "POST",
        body: { email, tempPassword, newPassword },
        headers: { Accept: "application/json" },
      }),
    }),
    verifyAdminTeam: builder.mutation<{ success: boolean; message?: string; data?: any }, { token: string; email: string }>({
      query: ({ token, email }) => ({
        url: `auth/admin/team/verify?token=${token}&email=${encodeURIComponent(email)}`,
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    }),
    setAdminTeamPassword: builder.mutation<{ success: boolean; message?: string }, { email: string; tempPassword: string; newPassword: string }>({
      query: ({ email, tempPassword, newPassword }) => ({
        url: "auth/admin/team/set-password",
        method: "POST",
        body: { email, tempPassword, newPassword },
        headers: { Accept: "application/json" },
      }),
    }),
  }),
});

export const { 
  useRegisterMutation, 
  useVerifyOtpMutation, 
  useVerifyOtpPasswordResetMutation, 
  useLoginMutation, 
  useRefreshMutation, 
  useLogoutMutation, 
  useForgotPasswordMutation, 
  useResendOtpMutation,
  useResendCredentialsMutation, 
  useChangePasswordMutation, 
  useResetPasswordMutation, 
  useMeQuery, 
  useLazyMeQuery, 
  useUsersMeQuery, 
  useSearchUsersQuery, 
  useLazySearchUsersQuery, 
  useUpdateMeMutation, 
  useHardDeleteMeMutation,
  useVerifyPTeamMutation, 
  useSetPTeamPasswordMutation,
  useVerifyAdminTeamMutation,
  useSetAdminTeamPasswordMutation
} = authApi;
