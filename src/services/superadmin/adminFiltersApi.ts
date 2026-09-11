import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type AdminFilterCountry = { id: string; name: string };
export type AdminFilterRegion = { id: string; name: string; country_id: string };
export type AdminFilterChapter = { id: string; name: string; region_id?: string | null; country_id?: string | null };
export type AdminFilterRole = string;

export type AdminFiltersResponse = {
  success: boolean;
  data: {
    countries: AdminFilterCountry[];
    regions: AdminFilterRegion[];
    chapters: AdminFilterChapter[];
    roles: AdminFilterRole[];
  };
};

export const adminFiltersApi = createApi({
  reducerPath: "adminFiltersApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getAdminFilters: builder.query<AdminFiltersResponse, void | undefined>({
      query: () => ({ url: "admin/filters" }),
    }),
  }),
});

export const { useGetAdminFiltersQuery, useLazyGetAdminFiltersQuery } = adminFiltersApi;
