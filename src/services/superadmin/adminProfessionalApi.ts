import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  company?: string;
  profession?: string;
  registrationDate?: string;
}

interface PaginationResponse {
  data: Professional[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export const adminProfessionalApi = createApi({
  reducerPath: 'adminProfessionalApi',
  baseQuery,
  tagTypes: ['Professional'],
  endpoints: (builder) => ({
    getProfessionals: builder.query<PaginationResponse, any>({
      query: (params) => ({
        url: '/admin/professionals',
        params,
      }),
      providesTags: (result) => 
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Professional' as const, id })),
              { type: 'Professional', id: 'LIST' },
            ]
          : [{ type: 'Professional', id: 'LIST' }],
    }),
    getProfessional: builder.query<{ data: Professional }, string>({
      query: (id) => `/admin/professionals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Professional' as const, id }],
    }),
    createProfessional: builder.mutation<Professional, Partial<Professional>>({
      query: (data) => ({
        url: '/admin/professionals',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Professional', id: 'LIST' }],
    }),
    updateProfessional: builder.mutation<Professional, { id: string; data: Partial<Professional> }>({
      query: ({ id, data }) => ({
        url: `/admin/professionals/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Professional', id },
        { type: 'Professional', id: 'LIST' },
      ],
    }),
    deleteProfessional: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/professionals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Professional', id },
        { type: 'Professional', id: 'LIST' },
      ],
    }),
    blockProfessional: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/professionals/${id}/block`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Professional', id },
        { type: 'Professional', id: 'LIST' },
      ],
    }),
    unblockProfessional: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/professionals/${id}/unblock`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Professional', id },
        { type: 'Professional', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProfessionalsQuery,
  useGetProfessionalQuery,
  useCreateProfessionalMutation,
  useUpdateProfessionalMutation,
  useDeleteProfessionalMutation,
  useBlockProfessionalMutation,
  useUnblockProfessionalMutation,
} = adminProfessionalApi;
