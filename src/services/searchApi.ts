import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

// Global Search Types (Backend: /search/members)
export type GlobalSearchParams = {
  // Basic Search
  q?: string;
  // Name Filters
  firstName?: string;
  lastName?: string;
  // Member identification
  memberNumber?: string;
  // Location Filters
  countryId?: string;
  regionId?: string;
  chapterId?: string;
  city?: string;
  state?: string;
  location?: string;
  // Professional Filters
  professionalCategory?: string;
  role?: string;
  skills?: string;
  yearsOfExperience?: number;
  // Business Filters
  businessName?: string;
  businessCategory?: string;
  subCategory?: string;
  companySize?: string;
  establishedYear?: number;
  // Module Access Filters
  hasBusinessAccess?: boolean;
  hasProfessionalAccess?: boolean;
  hasSocialAccess?: boolean;
  // Connection Filters
  connectionStatus?: "NONE" | "PENDING" | "ACCEPTED" | "BLOCKED";
  excludeConnected?: boolean;
  // Pagination
  page?: number;
  limit?: number;
  // Sorting
  sort?: "relevance" | "name" | "recent" | "connections";
};

export type GlobalSearchResult = {
  id: string;
  name: string;
  email?: string;
  headline?: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  chapter?: string;
  location?: string;
  phone?: string;
  businessName?: string;
  professionalCategory?: string;
  businessCategory?: string;
  skills?: string[];
  yearsOfExperience?: number;
  moduleAccess?: {
    business?: boolean;
    professional?: boolean;
    social?: boolean;
  };
  connection?: {
    status: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | "BLOCKED" | "SELF";
    actionAllowed: boolean;
    reason?: string;
    connectionId?: string;
  };
};

export type GlobalSearchResponse = {
  success: boolean;
  data: GlobalSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters?: Record<string, any>;
};

export type GlobalSearchSuggestionsResponse = {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    headline?: string;
    company?: string;
    chapter?: string;
    avatarUrl?: string;
    connectionStatus?: string;
  }>;
};

export const searchApi = createApi({
  reducerPath: "searchApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Search"],
  endpoints: (b) => ({
    // Global Search Endpoints
    globalSearchMembers: b.query<GlobalSearchResponse, GlobalSearchParams>({
      query: (params) => ({
        url: "search/members",
        params: {
          limit: 20,
          sort: "relevance",
          ...params,
        },
      }),
      providesTags: [{ type: "Search", id: "MEMBERS" }],
    }),
    globalSearchSuggestions: b.query<GlobalSearchSuggestionsResponse, { q: string }>({
      query: ({ q }) => ({
        url: "search/members/suggestions",
        params: { q },
      }),
      providesTags: [{ type: "Search", id: "SUGGESTIONS" }],
    }),
  }),
});

export const {
  useGlobalSearchMembersQuery,
  useLazyGlobalSearchMembersQuery,
  useGlobalSearchSuggestionsQuery,
  useLazyGlobalSearchSuggestionsQuery,
} = searchApi;
