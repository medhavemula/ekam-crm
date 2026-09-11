import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type ProfessionalProfileSummary = {
  success: boolean;
  data: {
    header: {
      id: string;
      name: string;
      tagline: string | null;
      location: string;
      companySize: string | null;
      logoUrl: string;
      bannerUrl: string | null;
    };
    stats: {
      posts: number;
      connections: number;
    };
  };
};

export const professionalSidebarApi = createApi({
  reducerPath: "professionalSidebarApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ProfessionalProfile"],
  endpoints: (builder) => ({
    getProfileSummary: builder.query<ProfessionalProfileSummary, { userId: string }>({
      query: ({ userId }) => ({ url: `professional/profile/${userId}/summary` }),
      providesTags: ["ProfessionalProfile"],
    }),
  }),
});

export const { useGetProfileSummaryQuery, useLazyGetProfileSummaryQuery } = professionalSidebarApi;
