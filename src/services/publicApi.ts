import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type PublicCategory = { id: string; name: string };
export type PublicChapter = { id: string; name: string; regionId: string | null };
export type PublicSponsor = { id: string; name: string };
export type PublicCountry = { id: string; name: string };
export type PublicRegion = { id: string; name: string; countryId: string | null };
export type PublicListResponse<T> = { success: boolean; page: number; limit: number; total: number; data: T[] };

export const publicApi = createApi({
  reducerPath: "publicApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    listCountries: builder.query<
      PublicListResponse<PublicCountry>,
      { q?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: "public/countries", params: params ?? {} }),
    }),
    listRegions: builder.query<
      PublicListResponse<PublicRegion>,
      { q?: string; countryId?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: "public/regions", params: params ?? {} }),
    }),
    listChapters: builder.query<PublicListResponse<PublicChapter>, { q?: string; regionId?: string; countryId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "public/chapters", params: params ?? {} }),
    }),
    listSocialChapters: builder.query<PublicListResponse<PublicChapter>, { q?: string; regionId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ 
        url: "public/chapters/social", 
        params: params ?? {}
      }),
    }),
    listSponsors: builder.query<PublicListResponse<PublicSponsor>, { q?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "public/sponsors", params: params ?? {} }),
    }),
    listBusinessCategories: builder.query<PublicListResponse<PublicCategory>, { regionId?: string; q?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "public/categories/business", params: params ?? {} }),
    }),
    listProfessionalCategories: builder.query<PublicListResponse<PublicCategory>, { regionId?: string; q?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "public/categories/professional", params: params ?? {} }),
    }),
    listSocialCategories: builder.query<PublicListResponse<PublicCategory>, { regionId?: string; q?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: "public/categories/social", params: params ?? {} }),
    }),
  }),
});

export const { 
  useListCountriesQuery,
  useLazyListCountriesQuery,
  useListRegionsQuery,
  useLazyListRegionsQuery,
  useListChaptersQuery, 
  useLazyListChaptersQuery, 
  useListSocialChaptersQuery,
  useLazyListSocialChaptersQuery,
  useListSponsorsQuery, 
  useLazyListSponsorsQuery,
  useListBusinessCategoriesQuery,
  useLazyListBusinessCategoriesQuery,
  useListProfessionalCategoriesQuery,
  useLazyListProfessionalCategoriesQuery,
  useListSocialCategoriesQuery,
  useLazyListSocialCategoriesQuery
} = publicApi;
