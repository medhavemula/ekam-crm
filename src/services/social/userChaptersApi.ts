import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type MySocialChapterItem = {
  id: string;
  name: string;
  area?: string;
  city?: string;
  regionName?: string;
  joinedAt?: string;
};

export type MySocialChaptersResponse = {
  success: boolean;
  data: {
    items: MySocialChapterItem[];
  };
};

export const socialUserChaptersApi = createApi({
  reducerPath: "socialUserChaptersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["MySocialChapters"],
  endpoints: (builder) => ({
    getMySocialChapters: builder.query<MySocialChaptersResponse, void>({
      query: () => ({
        url: "/social/my-chapters",
        method: "GET",
      }),
      providesTags: ["MySocialChapters"],
    }),
  }),
});

export const { useGetMySocialChaptersQuery } = socialUserChaptersApi;
