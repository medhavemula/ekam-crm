import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

/**
 * Categories API Types
 */
export interface CategoryMetadata {
  description?: string;
  sortOrder?: number;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  value: string;
  type: "business" | "professional" | "social" | "visitor";
  scope: "global" | "regional";
  isActive: boolean;
  metadata?: CategoryMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedCategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  value: string;
  type: "business" | "professional" | "social" | "visitor";
  scope: "global" | "regional";
  metadata?: CategoryMetadata;
}

export interface UpdateCategoryInput {
  name?: string;
  value?: string;
  type?: "business" | "professional" | "social" | "visitor";
  isActive?: boolean;
  metadata?: CategoryMetadata;
}

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  type?: "business" | "professional" | "social" | "visitor";
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  scope?: "global" | "regional";
}

/**
 * Categories API
 * Handles global and regional categories management
 */
export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Categories"],
  endpoints: (builder) => ({
    /**
     * Super Admin Categories - Get categories list
     */
    getSACategories: builder.query<PaginatedCategoriesResponse, GetCategoriesParams | void>({
      query: (params) => ({
        url: "admin/categories",
        params: params ?? {},
      }),
      providesTags: ["Categories"],
      transformResponse: (response: any): PaginatedCategoriesResponse => {
        const categories = response?.data || [];
        return {
          success: response?.success || true,
          data: {
            categories,
            page: response?.pagination?.page || response?.page || 1,
            limit: response?.pagination?.limit || response?.limit || 20,
            total: response?.pagination?.total || response?.total || categories.length,
          },
        };
      },
    }),

    /**
     * Super Admin Categories - Get single category
     */
    getSACategory: builder.query<{ success: boolean; data: Category }, string>({
      query: (id) => `admin/categories/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Categories", id }],
    }),

    /**
     * Super Admin Categories - Create new category
     */
    createSACategory: builder.mutation<{ success: boolean; data: Category }, CreateCategoryInput>({
      query: (data) => ({
        url: "admin/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    /**
     * Super Admin Categories - Update category
     */
    updateSACategory: builder.mutation<
      { success: boolean; data: Category },
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `admin/categories/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Super Admin Categories - Delete category
     */
    deleteSACategory: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `admin/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Executive Director Categories - Get categories list
     */
    getEDCategories: builder.query<PaginatedCategoriesResponse, GetCategoriesParams | void>({
      query: (params) => ({
        url: "admin/ed/categories",
        params: params ?? {},
      }),
      providesTags: ["Categories"],
      transformResponse: (response: any): PaginatedCategoriesResponse => {
        const categories = response?.data || [];
        return {
          success: response?.success || true,
          data: {
            categories,
            page: response?.pagination?.page || response?.page || 1,
            limit: response?.pagination?.limit || response?.limit || 20,
            total: response?.pagination?.total || response?.total || categories.length,
          },
        };
      },
    }),

    /**
     * Executive Director Categories - Get single category
     */
    getEDCategory: builder.query<{ success: boolean; data: Category }, string>({
      query: (id) => `admin/ed/categories/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Categories", id }],
    }),

    /**
     * Executive Director Categories - Create new category
     */
    createEDCategory: builder.mutation<{ success: boolean; data: Category }, CreateCategoryInput>({
      query: (data) => ({
        url: "admin/ed/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    /**
     * Executive Director Categories - Update category
     */
    updateEDCategory: builder.mutation<
      { success: boolean; data: Category },
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `admin/ed/categories/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Executive Director Categories - Delete category
     */
    deleteEDCategory: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `admin/ed/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Social Chairperson Categories - Get categories list
     */
    getSCCategories: builder.query<PaginatedCategoriesResponse, GetCategoriesParams | void>({
      query: (params) => ({
        url: "admin/sc/social/categories",
        params: params ?? {},
      }),
      providesTags: ["Categories"],
      transformResponse: (response: any): PaginatedCategoriesResponse => {
        const categories = response?.data || [];
        return {
          success: response?.success || true,
          data: {
            categories,
            page: response?.pagination?.page || response?.page || 1,
            limit: response?.pagination?.limit || response?.limit || 20,
            total: response?.pagination?.total || response?.total || categories.length,
          },
        };
      },
    }),

    /**
     * Social Chairperson Categories - Get single category
     */
    getSCCategory: builder.query<{ success: boolean; data: Category }, string>({
      query: (id) => `admin/sc/social/categories/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Categories", id }],
    }),

    /**
     * Social Chairperson Categories - Create new category
     */
    createSCCategory: builder.mutation<{ success: boolean; data: Category }, CreateCategoryInput>({
      query: (data) => ({
        url: "admin/sc/social/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    /**
     * Social Chairperson Categories - Update category
     */
    updateSCCategory: builder.mutation<
      { success: boolean; data: Category },
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `admin/sc/social/categories/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Social Chairperson Categories - Delete category
     */
    deleteSCCategory: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `admin/sc/social/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Categories", id },
        "Categories",
      ],
    }),

    /**
     * Social Chairperson Categories - Get regional statistics
     */
    getSCCategoryStats: builder.query<{ success: boolean; data: any }, void>({
      query: () => "admin/sc/social/categories/stats",
      providesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetSACategoriesQuery,
  useLazyGetSACategoriesQuery,
  useGetSACategoryQuery,
  useLazyGetSACategoryQuery,
  useCreateSACategoryMutation,
  useUpdateSACategoryMutation,
  useDeleteSACategoryMutation,
  useGetEDCategoriesQuery,
  useLazyGetEDCategoriesQuery,
  useGetEDCategoryQuery,
  useLazyGetEDCategoryQuery,
  useCreateEDCategoryMutation,
  useUpdateEDCategoryMutation,
  useDeleteEDCategoryMutation,
  useGetSCCategoriesQuery,
  useLazyGetSCCategoriesQuery,
  useGetSCCategoryQuery,
  useLazyGetSCCategoryQuery,
  useCreateSCCategoryMutation,
  useUpdateSCCategoryMutation,
  useDeleteSCCategoryMutation,
  useGetSCCategoryStatsQuery,
} = categoriesApi;
