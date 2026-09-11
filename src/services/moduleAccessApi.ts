import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type ModuleAccessStatus = {
  success: boolean;
  data: {
    moduleAccess: {
      business: boolean;
      professional: boolean;
      social: boolean;
    };
    moduleRequestStatus: {
      business?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUESTED";
      professional?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUESTED";
      social?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUESTED";
    };
    pendingRequests: Array<{
      _id: string;
      requestedModule: "business" | "professional" | "social";
      requestedAt: string;
      requestType: string;
    }>;
  };
};

export const moduleAccessApi = createApi({
  reducerPath: "moduleAccessApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getModuleAccessStatus: builder.query<ModuleAccessStatus, void>({
      query: () => ({
        url: "module-access/status",
        method: "GET",
      }),
    }),
    requestModuleAccess: builder.mutation<
      { success: boolean; message?: string },
      { moduleType: "business" | "professional" | "social"; moduleData: any }
    >({
      query: (body) => ({
        url: "module-access/request",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useGetModuleAccessStatusQuery, useRequestModuleAccessMutation } = moduleAccessApi;
