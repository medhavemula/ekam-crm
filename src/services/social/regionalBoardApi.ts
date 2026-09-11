import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type {
  SocialRegionalBoardParams,
  SocialRegionalBoardResponse,
} from "./types";

export const socialRegionalBoardApi = createApi({
  reducerPath: "socialRegionalBoardApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SocialRegionalBoard"],
  endpoints: (builder) => ({
    getSocialRegionalBoard: builder.query<SocialRegionalBoardResponse, SocialRegionalBoardParams>({
      query: (params) => ({
        url: "/admin/sc/social/regional-board",
        method: "GET",
        params,
      }),
      providesTags: ["SocialRegionalBoard"],
    }),
  }),
});

export const {
  useGetSocialRegionalBoardQuery,
} = socialRegionalBoardApi;
