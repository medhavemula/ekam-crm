import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export interface ModuleAccessRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    basicInfo?: {
      phone?: string;
      gender?: string;
      dob?: string;
      streetAddress?: string;
      country?: string;
      region?: string;
      chapter?: string;
      chapterAnswer?: string;
    };
    business?: {
      businessName?: string;
      businessCategory?: string;
    };
    professional?: {
      role?: string;
    };
  };
  requestedModule: "business" | "professional" | "social";
  status: "PENDING" | "APPROVED" | "REJECTED";
  moduleData?: {
    businessName?: string;
    businessCategory?: string;
    [key: string]: any;
  };
  requestedAt: string;
  requestedBy: string;
  requestType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleAccessRequestsResponse {
  success: boolean;
  data: {
    requests: ModuleAccessRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export const adminModuleAccessApi = createApi({
  reducerPath: "adminModuleAccessApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getModuleAccessRequests: builder.query<ModuleAccessRequestsResponse, { status?: string; moduleType?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/admin/module-access/requests",
        params,
      }),
    }),
    approveModuleRequest: builder.mutation<
      { success: boolean; message?: string },
      { requestId: string; data?: any }
    >({
      query: ({ requestId, data }) => ({
        url: `/admin/module-access/requests/${requestId}/approve`,
        method: "POST",
        body: data,
      }),
    }),
    rejectModuleRequest: builder.mutation<
      { success: boolean; message?: string },
      { requestId: string; data: { remark?: string } }
    >({
      query: ({ requestId, data }) => ({
        url: `/admin/module-access/requests/${requestId}/reject`,
        method: "POST",
        body: data,
      }),
    }),
    reviewModuleRequestApprove: builder.mutation<
      { success: boolean; message?: string },
      { requestId: string }
    >({
      query: ({ requestId }) => ({
        url: `/admin/module-access/requests/${requestId}/review`,
        method: "POST",
        body: { decision: "APPROVE" },
      }),
    }),
    reviewModuleRequestReject: builder.mutation<
      { success: boolean; message?: string },
      { requestId: string; rejectionReason: string }
    >({
      query: ({ requestId, rejectionReason }) => ({
        url: `/admin/module-access/requests/${requestId}/review`,
        method: "POST",
        body: { decision: "REJECT", rejectionReason },
      }),
    }),
  }),
});

export const { 
  useGetModuleAccessRequestsQuery, 
  useApproveModuleRequestMutation, 
  useRejectModuleRequestMutation,
  useReviewModuleRequestApproveMutation,
  useReviewModuleRequestRejectMutation
} = adminModuleAccessApi;
