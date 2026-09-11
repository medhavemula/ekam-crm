import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type ProfessionalConnectionUser = {
  id: string;
  name: string;
  chapter: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  headline?: string;
  connectionsCount?: number;
};

export type ProfessionalConnectionMeta = {
  strength?: number;
  lastActivityAt?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  badge?: "REQUEST_SENT" | "REQUEST_RECEIVED" | null;
};

export type ProfessionalConnection = {
  id: string;
  user: ProfessionalConnectionUser;
  meta: ProfessionalConnectionMeta;
};

export type ProfessionalConnectionsResponse = {
  success: boolean;
  data: ProfessionalConnection[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListProfessionalConnectionsParams = {
  type?: "my" | "sent" | "received" | "blocked";
  q?: string;
  page?: number;
  limit?: number;
  sort?: "recency" | "strength" | "name";
};

export type ProfessionalConnectionsStats = {
  my: number;
  sent: number;
  received: number;
  blocked: number;
};

export type ProfessionalDirectoryCard = {
  id: string;
  name: string;
  headline?: string;
  company?: string;
  role?: string;
  chapter?: string;
  avatarUrl?: string;
  connection: {
    status: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | "BLOCKED" | "SELF";
    actionAllowed: boolean;
    reason?: string;
    connectionId?: string;
  };
};

export type SearchProfessionalDirectoryParams = {
  q?: string;
  chapterId?: string;
  regionId?: string;
  category?: string;
  excludeConnected?: boolean;
  page?: number;
  limit?: number;
  sort?: "relevance" | "name";
};

export const professionalConnectionsApi = createApi({
  reducerPath: "professionalConnectionsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ProfessionalConnections", "ProfessionalProfile"],
  endpoints: (builder) => ({
    list: builder.query<ProfessionalConnectionsResponse, ListProfessionalConnectionsParams | void>({
      query: (params) => ({
        url: "professional/connections",
        params: params ?? {},
      }),
      providesTags: [{ type: "ProfessionalConnections", id: "LIST" }],
    }),
    stats: builder.query<{ success: boolean; data: ProfessionalConnectionsStats }, void>({
      query: () => ({ url: "professional/connections/stats" }),
    }),
    searchDirectory: builder.query<
      { success: boolean; data: ProfessionalDirectoryCard[]; page: number; limit: number; total: number },
      SearchProfessionalDirectoryParams | void
    >({
      query: (params) => ({
        url: "professional/connections/search",
        params: params ?? {},
      }),
    }),
    request: builder.mutation<
      { success: boolean; data: ProfessionalDirectoryCard },
      { userId: string; message: string }
    >({
      query: ({ userId, message }) => ({
        url: `professional/connections/${userId}/request`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: [
        { type: "ProfessionalConnections", id: "LIST" },
        "ProfessionalProfile",
      ],
    }),
    respond: builder.mutation<
      { success: boolean; data: ProfessionalConnection },
      { connectionId: string; action: "ACCEPT" | "REJECT" }
    >({
      query: ({ connectionId, action }) => ({
        url: `professional/connections/${connectionId}/respond`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProfessionalConnections", id: "LIST" },
        { type: "ProfessionalConnections", id: arg.connectionId },
        "ProfessionalProfile",
      ],
    }),
    block: builder.mutation<
      { success: boolean; data: ProfessionalConnection },
      { connectionId: string; action: "BLOCK" | "UNBLOCK" }
    >({
      query: ({ connectionId, action }) => ({
        url: `professional/connections/${connectionId}/block`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProfessionalConnections", id: "LIST" },
        { type: "ProfessionalConnections", id: arg.connectionId },
        "ProfessionalProfile",
      ],
    }),
    // See the note on the business module's withdraw: same server handler, same rule.
    withdraw: builder.mutation<{ success: boolean; message: string }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `professional/connections/${connectionId}/withdraw`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProfessionalConnections", id: "LIST" },
        { type: "ProfessionalConnections", id: arg.connectionId },
        "ProfessionalProfile",
      ],
    }),
    remove: builder.mutation<{ success: boolean; data: ProfessionalConnection }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `professional/connections/${connectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ProfessionalConnections", id: "LIST" },
        { type: "ProfessionalConnections", id: arg.connectionId },
        "ProfessionalProfile",
      ],
    }),
    profile: builder.query<{ success: boolean; data: Record<string, unknown> }, string | { userId: string }>({
      query: (arg) => {
        const userId = typeof arg === "string" ? arg : arg.userId;
        return { url: `professional/connections/${userId}/profile` };
      },
    }),
  }),
});

export const {
  useListQuery: useProfessionalConnectionsListQuery,
  useStatsQuery: useProfessionalConnectionsStatsQuery,
  useSearchDirectoryQuery: useProfessionalConnectionsSearchDirectoryQuery,
  useLazySearchDirectoryQuery: useLazyProfessionalConnectionsSearchDirectoryQuery,
  useRequestMutation: useProfessionalConnectionRequestMutation,
  useRespondMutation: useProfessionalConnectionRespondMutation,
  useBlockMutation: useProfessionalConnectionBlockMutation,
  useWithdrawMutation: useProfessionalConnectionWithdrawMutation,
  useRemoveMutation: useProfessionalConnectionRemoveMutation,
  useProfileQuery: useProfessionalConnectionProfileQuery,
} = professionalConnectionsApi;
