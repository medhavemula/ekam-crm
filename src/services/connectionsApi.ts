import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type ConnectionCardApi = {
  id: string;
  user: { id: string; name: string; headline?: string; chapter?: string; avatarUrl?: string };
  meta?: {
    strength?: number;
    lastActivityAt?: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
    badge?: "REQUEST_SENT" | "REQUEST_RECEIVED" | null;
  };
};

export type ListConnectionsParams = {
  type?: "my" | "sent" | "received" | "blocked";
  q?: string;
  page?: number;
  limit?: number;
  sort?: "recency" | "strength" | "name";
  refreshKey?: number;
};

export type ListConnectionsResponse = {
  success: boolean;
  data: ConnectionCardApi[];
  page: number;
  pageSize: number;
  total: number;
};

export type ConnectionsStats = { my: number; sent: number; received: number; blocked: number };

// Directory Search Types (C9)
export type DirectoryCard = {
  id: string;
  name: string;
  headline?: string;
  chapter?: string;
  avatarUrl?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  location?: string;
  connectionsCount?: number;
  connection: {
    status: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | "BLOCKED" | "SELF";
    actionAllowed: boolean;
    reason?: string;
    connectionId?: string;
  };
};
export type SearchDirectoryParams = {
  q?: string;
  chapterId?: string;
  regionId?: string;
  category?: string;
  excludeConnected?: boolean;
  page?: number;
  limit?: number;
  sort?: "relevance" | "name";
};

export const connectionsApi = createApi({
  reducerPath: "connectionsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Connections"],
  endpoints: (b) => ({
    list: b.query<ListConnectionsResponse, ListConnectionsParams | void>({
      query: (params) => {
        const { refreshKey: _refreshKey, ...requestParams } = params ?? {};
        return { url: "connections", params: requestParams };
      },
      providesTags: [{ type: "Connections", id: "LIST" }],
    }),
    stats: b.query<{ success: boolean; data: ConnectionsStats }, void>({
      query: () => ({ url: "connections/stats" }),
    }),
    searchDirectory: b.query<
      { success: boolean; data: DirectoryCard[]; page: number; limit: number; total: number },
      SearchDirectoryParams | void
    >({
      query: (params) => ({ url: "connections/search", params: params ?? {} }),
    }),
    request: b.mutation<{ success: boolean; data: DirectoryCard }, { userId: string; message: string }>({
      query: ({ userId, message }) => ({
        url: `connections/${userId}/request`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: [{ type: "Connections", id: "LIST" }],
    }),
    respond: b.mutation<
      { success: boolean; data: ConnectionCardApi },
      { connectionId: string; action: "ACCEPT" | "REJECT" }
    >({
      query: ({ connectionId, action }) => ({
        url: `connections/${connectionId}/respond`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Connections", id: "LIST" },
        { type: "Connections", id: arg.connectionId },
      ],
    }),
    block: b.mutation<
      { success: boolean; data: ConnectionCardApi },
      { connectionId: string; action: "BLOCK" | "UNBLOCK" }
    >({
      query: ({ connectionId, action }) => ({
        url: `connections/${connectionId}/block`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Connections", id: "LIST" },
        { type: "Connections", id: arg.connectionId },
      ],
    }),
    // Retracting a request you sent is its own operation, not a connection removal:
    // the server checks that you are the requester before clearing it.
    withdraw: b.mutation<{ success: boolean; message: string }, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `connections/${connectionId}/withdraw`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Connections", id: "LIST" },
        { type: "Connections", id: arg.connectionId },
      ],
    }),
    remove: b.mutation<{ success: boolean; data: ConnectionCardApi }, { connectionId: string }>({
      query: ({ connectionId }) => ({ url: `connections/${connectionId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Connections", id: "LIST" },
        { type: "Connections", id: arg.connectionId },
      ],
    }),
    profile: b.query<{ success: boolean; data: Record<string, unknown> }, string | { userId: string }>({
      query: (arg) => {
        const userId = typeof arg === "string" ? arg : arg.userId;
        return { url: `connections/${userId}/profile` };
      },
    }),
    syncChapterConnections: b.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: "account/me/sync-chapter-connections",
        method: "POST",
      }),
      invalidatesTags: [{ type: "Connections", id: "LIST" }],
    }),
  }),
});

export const {
  useListQuery: useConnectionsListQuery,
  useStatsQuery: useConnectionsStatsQuery,
  useSearchDirectoryQuery: useConnectionsSearchDirectoryQuery,
  useLazySearchDirectoryQuery: useLazyConnectionsSearchDirectoryQuery,
  useRequestMutation: useConnectionRequestMutation,
  useRespondMutation: useConnectionRespondMutation,
  useBlockMutation: useConnectionBlockMutation,
  useWithdrawMutation: useConnectionWithdrawMutation,
  useRemoveMutation: useConnectionRemoveMutation,
  useProfileQuery: useConnectionProfileQuery,
  useSyncChapterConnectionsMutation: useSyncChapterConnectionsMutation,
} = connectionsApi;
