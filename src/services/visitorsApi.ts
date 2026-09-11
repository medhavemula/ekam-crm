import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

// Types based on backend DTOs
export type VisitType = "REGISTER_SOMEONE_ELSE" | "REGISTER_MYSELF";
export type VisitStatus =
  | "INVITED"
  | "REGISTERED"
  | "CHECKED_IN"
  | "FOLLOWED_UP"
  | "APPLIED"
  | "JOINED"
  | "NO_SHOW"
  | "NOT_A_FIT"
  | "DECLINED";

export type VisitorAddress = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type VisitorRow = {
  id: string;
  visitorName: string;
  email?: string;
  phone?: string;
  visitDate: string;
  company?: string;
  chapterName?: string;
};

export type VisitorDetails = {
  id: string;
  _id: string;
  personId: string;
  chapterId: string;
  visitDate: string;
  invitedByMemberId?: string;
  registeredByMemberId?: string;
  type: VisitType;
  status: VisitStatus;
  checkInTime?: string;
  notes?: string;
  isFirstTimer: boolean;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  category?: string;
  address?: VisitorAddress;
  source?: string;
  createdAt: string;
  updatedAt: string;
  countryId?: string;
  regionId?: string;
  chapterName?: string;
  regionName?: string;
  countryName?: string;
};

export type CreateVisitorRequest = {
  type: VisitType;
  chapterId: string;
  visitDate: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  category?: string;
  address?: VisitorAddress;
};

export type UpdateVisitorRequest = {
  type?: "REGISTER_MYSELF" | "REGISTER_SOMEONE_ELSE";
  chapterId?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  category?: string;
  address?: VisitorAddress;
  visitDate?: string;
};

export type ListVisitorsParams = {
  from?: string;
  to?: string;
  q?: string;
  chapterId?: string;
  page?: number;
  limit?: number;
  sortBy?: "visitDate" | "person.firstName" | "person.email" | "person.phone" | "person.company";
  sortDir?: "asc" | "desc";
};

export type RegistrationType = {
  value: string;
  label: string;
};

export type Category = {
  value: string;
  label: string;
};

export const visitorsApi = createApi({
  reducerPath: "visitorsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Visitors", "VisitorDetails", "RegistrationTypes", "Categories"],
  endpoints: (builder) => ({
    listVisitors: builder.query<
      { success: boolean; data: VisitorRow[]; page: number; pageSize: number; total: number },
      ListVisitorsParams
    >({
      query: (params) => ({
        url: "visitors",
        params,
      }),
      providesTags: ["Visitors"],
    }),
    getVisitor: builder.query<{ success: boolean; data: VisitorDetails }, string>({
      query: (id) => `visitors/${id}`,
      providesTags: (_result, _error, id) => [{ type: "VisitorDetails", id }],
    }),
    createVisitor: builder.mutation<{ success: boolean; data: VisitorRow }, CreateVisitorRequest>({
      query: (body) => ({
        url: "visitors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Visitors"],
    }),
    updateVisitor: builder.mutation<{ success: boolean; data: VisitorDetails }, { id: string; body: UpdateVisitorRequest }>({
      query: ({ id, body }) => ({
        url: `visitors/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "VisitorDetails", id }, "Visitors"],
    }),
    getRegistrationTypes: builder.query<{ success: boolean; data: RegistrationType[] }, void>({
      query: () => "visitors/registration-types",
      providesTags: ["RegistrationTypes"],
    }),
    getCategories: builder.query<{ success: boolean; data: Category[] }, void>({
      query: () => "visitors/categories",
      providesTags: ["Categories"],
    }),
    exportVisitorsCsv: builder.query<string, ListVisitorsParams>({
      query: (params) => ({
        url: "visitors/export.csv",
        params,
        responseHandler: (response) => response.text(),
      }),
    }),
  }),
});

export const {
  useListVisitorsQuery,
  useGetVisitorQuery,
  useCreateVisitorMutation,
  useUpdateVisitorMutation,
  useGetRegistrationTypesQuery,
  useGetCategoriesQuery,
  useLazyExportVisitorsCsvQuery,
} = visitorsApi;
