import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type Country = {
  id: string;
  name: string;
  code?: string; // mapped from iso2
  phoneCode?: string;
  currency?: string;
  regionsCount?: number; // mapped from regionCount
};

export type PaginatedResponse<T> = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  data: T[];
};

export type ListCountriesParams = { page?: number; limit?: number; search?: string };

export type CreateCountryInput = {
  name: string;
  code?: string;
  iso2?: string;
  phoneCode?: string;
  currency?: string;
};

export type UpdateCountryInput = Partial<CreateCountryInput>;

export const adminGeoApi = createApi({
  reducerPath: "adminGeoApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Countries", "Regions"],
  endpoints: (builder) => ({
    listCountries: builder.query<PaginatedResponse<Country>, ListCountriesParams | void>({
      query: (params) => {
        const p = params ?? {};
        const qp: any = { page: p.page };
        if (typeof p.limit === "number") qp.pageSize = p.limit;
        if (p.search) qp.search = p.search;
        return { url: "admin/sa/geo/countries", params: qp };
      },
      transformResponse: (resp: any): PaginatedResponse<Country> => {
        // backend: { success, data: { items, page, pageSize, total } }
        const items = resp?.data?.items ?? [];
        const page = resp?.data?.page ?? 1;
        const pageSize = resp?.data?.pageSize ?? (resp?.limit ?? 25);
        const total = resp?.data?.total ?? resp?.total ?? items.length;
        const mapped: Country[] = items.map((c: any) => ({
          id: String(c.id ?? c._id ?? ""),
          name: c.name,
          code: c.iso2 ?? c.code,
          regionsCount: c.regionCount ?? c.regionsCount ?? 0,
          phoneCode: c.phoneCode,
          currency: c.currency,
        }));
        return { success: !!resp?.success, page, limit: pageSize, total, data: mapped };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({ type: "Countries" as const, id: c.id })),
              { type: "Countries" as const, id: "LIST" },
            ]
          : [{ type: "Countries" as const, id: "LIST" }],
    }),
    getCountry: builder.query<{ success: boolean; data: Country }, string>({
      query: (id) => ({ url: `admin/sa/geo/countries/${id}` }),
      transformResponse: (resp: any): { success: boolean; data: Country } => {
        const c = resp?.data ?? resp;
        const mapped: Country = {
          id: String(c.id ?? c._id ?? ""),
          name: c.name,
          code: c.iso2 ?? c.code,
          regionsCount: c.regionCount ?? c.regionsCount ?? 0,
          phoneCode: c.phoneCode,
          currency: c.currency,
        };
        return { success: !!resp?.success, data: mapped };
      },
      providesTags: (_res, _err, id) => [{ type: "Countries", id }],
    }),
    createCountry: builder.mutation<{ success: boolean; data: Country }, CreateCountryInput>({
      query: (body) => ({ url: "admin/sa/geo/countries", method: "POST", body }),
      invalidatesTags: [{ type: "Countries", id: "LIST" }],
    }),
    updateCountry: builder.mutation<{ success: boolean; data: Country }, { id: string; body: UpdateCountryInput }>({
      query: ({ id, body }) => ({ url: `admin/sa/geo/countries/${id}`, method: "PATCH", body }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "Countries", id }, { type: "Countries", id: "LIST" }],
    }),
    deleteCountry: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/sa/geo/countries/${id}/hard`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [{ type: "Countries", id }, { type: "Countries", id: "LIST" }],
    }),
    listRegions: builder.query<PaginatedResponse<Region>, { country_id?: string; page?: number; limit?: number; search?: string } | void>({
      query: (params) => ({ url: "admin/sa/geo/regions", params: params ?? {} }),
      transformResponse: (resp: any): PaginatedResponse<Region> => {
        const items = resp?.data?.items ?? resp?.data ?? [];
        const page = resp?.data?.page ?? resp?.page ?? 1;
        const limit = resp?.data?.pageSize ?? resp?.data?.limit ?? resp?.limit ?? 25;
        const total = resp?.data?.total ?? resp?.total ?? items.length;
        const mapped: Region[] = items.map((r: any) => ({
          id: String(r.id ?? r._id ?? ""),
          name: r.name,
          countryId: String(r.countryId ?? r.country_id ?? r.country?.id ?? ""),
          countryName: r.countryName ?? r.country?.name ?? "",
          chapterCount: r.chapterCount ?? 0,
        }));
        return { success: !!resp?.success, page, limit, total, data: mapped };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((r) => ({ type: "Regions" as const, id: r.id })),
              { type: "Regions" as const, id: "LIST" },
            ]
          : [{ type: "Regions" as const, id: "LIST" }],
    }),
    createRegion: builder.mutation<{ success: boolean; data: Region }, { countryId: string; name: string }>({
      query: ({ countryId, name }) => ({ url: "admin/sa/geo/regions", method: "POST", body: { countryId, name } }),
      invalidatesTags: [{ type: "Regions", id: "LIST" }],
    }),
    deleteRegion: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `admin/sa/geo/regions/${id}/hard`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [{ type: "Regions", id }, { type: "Regions", id: "LIST" }],
    }),
  }),
});

export const {
  useListCountriesQuery,
  useLazyListCountriesQuery,
  useGetCountryQuery,
  useCreateCountryMutation,
  useUpdateCountryMutation,
  useDeleteCountryMutation,
  useListRegionsQuery,
  useLazyListRegionsQuery,
  useCreateRegionMutation,
  useDeleteRegionMutation,
} = adminGeoApi;

export type Region = {
  id: string;
  name: string;
  countryId: string;
  countryName?: string;
  chapterCount?: number;
};
