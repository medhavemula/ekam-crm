import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, TeamMember, PaginationParams } from "./types";

// Team-specific types
export type AddTeamMemberInput = {
  userId: string;
  roleCode: string;
  scope: "COUNTRY" | "REGION" | "CHAPTER";
  countryId?: string;
  regionId?: string;
  chapterId?: string;
  chapterIds?: string[];
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
};

export type UpdateTeamMemberInput = {
  status?: "ACTIVE" | "BLOCKED" | "INACTIVE";
  endDate?: string;
  isPrimary?: boolean;
  userId?: string;
  roleCode?: string;
  chapterId?: string;
  chapterIds?: string[];
  regionId?: string;
  area?: string;
};

export type TeamListParams = PaginationParams & {
  role_code?: string;
  scope?: string;
  region_id?: string;
  chapter_id?: string;
  status?: string;
  team?: string;
};

/**
 * Executive Director Team API
 * Handles team member management
 */
export const edTeamApi = createApi({
  reducerPath: "edTeamApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdTeam"],
  endpoints: (builder) => ({
    /**
     * List all team members
     */
    getEdTeamMembers: builder.query<
      PaginatedResponse<TeamMember>,
      TeamListParams | void
    >({
      query: (params) => ({
          url: "admin/ed/team",
        params: params ?? {},
      }),
      providesTags: ["EdTeam"],
    }),

    /**
     * Add a new team member
     */
    addEdTeamMember: builder.mutation<
      ApiResponse<TeamMember>,
      AddTeamMemberInput
    >({
      query: (body) => {
        const requestBody: any = {
          user_id: body.userId,
          role_code: body.roleCode,
          scope: body.scope,
          country_id: body.countryId,
          region_id: body.regionId,
          chapter_id: body.chapterId,
          chapter_ids: body.chapterIds,
          start_date: body.startDate,
          end_date: body.endDate,
          is_primary: body.isPrimary,
        };

        // Only send chapter_ids as array
        if (body.chapterIds && body.chapterIds.length > 0) {
          requestBody.chapter_ids = body.chapterIds;
        }

        return {
          url: "admin/ed/team",
          method: "POST",
          body: requestBody,
        };
      },
      invalidatesTags: ["EdTeam"],
    }),

    /**
     * Update team member
     */
    updateEdTeamMember: builder.mutation<
      ApiResponse<TeamMember>,
      { memberId: string; data: UpdateTeamMemberInput }
    >({
      query: ({ memberId, data }) => {
        const body: any = {
          status: data.status,
          end_date: data.endDate,
          is_primary: data.isPrimary,
          user_id: data.userId,
          role_code: data.roleCode,
          region_id: data.regionId,
          area: data.area,
        };

        // Only send chapter_ids as array
        if (data.chapterIds && data.chapterIds.length > 0) {
          body.chapter_ids = data.chapterIds;
        }

        return {
          url: `admin/ed/team/${memberId}`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["EdTeam"],
    }),

    /**
     * Remove team member
     */
    removeEdTeamMember: builder.mutation<ApiResponse<void>, string>({
      query: (memberId) => ({
        url: `admin/ed/team/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdTeam"],
    }),

    /**
     * Update team member status (soft remove)
     */
    updateEdTeamMemberStatus: builder.mutation<
      ApiResponse<TeamMember>,
      { memberId: string; status: "ACTIVE" | "BLOCKED" | "INACTIVE" | "ENDED" | (string & {}) }
    >({
      query: ({ memberId, status }) => ({
        url: `admin/ed/team/${memberId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { memberId }) => [
        { type: 'EdTeam', id: memberId },
        { type: 'EdTeam', id: 'LIST' }
      ],
    }),

    /**
     * Get team member by ID with overview details
     */
    getEdTeamMember: builder.query<ApiResponse<TeamMember>, { id: string; regionId?: string; chapterId?: string }>({
      query: ({ id, regionId, chapterId }) => {
        const params = new URLSearchParams();
        if (regionId) params.append('region_id', regionId);
        if (chapterId) params.append('chapter_id', chapterId);
        
        const queryString = params.toString();
        return `admin/ed/team/${id}/overview${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (_result, _error, { id }) => [{ type: 'EdTeam', id }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdTeamMembersQuery,
  useLazyGetEdTeamMembersQuery,
  useAddEdTeamMemberMutation,
  useUpdateEdTeamMemberMutation,
  useRemoveEdTeamMemberMutation,
  useUpdateEdTeamMemberStatusMutation,
  useGetEdTeamMemberQuery,
} = edTeamApi;
