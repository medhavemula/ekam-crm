import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type Suggestion = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  photoUrlDecrypted?: string;
  title?: string;
  company?: string;
};

export type SuggestionsResponse = {
  success: boolean;
  data: Suggestion[];
};

export const rightSidebarApi = createApi({
  reducerPath: "rightSidebarApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Suggestions"],
  endpoints: (builder) => ({
    getSuggestions: builder.query<SuggestionsResponse, { limit?: number } | void>({
      query: (params) => ({ url: "professional/suggestions", params: params || {} }),
      providesTags: ["Suggestions"],
    }),
  }),
});

export const { useGetSuggestionsQuery, useLazyGetSuggestionsQuery } = rightSidebarApi;
