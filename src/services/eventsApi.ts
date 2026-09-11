import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type EventItem = {
  id: string;
  slug?: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string;  // ISO
  location?: string;
  coverUrl?: string;
  summary?: string;
};

export type UpcomingEventsResponse = {
  success: boolean;
  data: EventItem[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type EventDetailResponse = {
  success: boolean;
  data: EventItem & Record<string, any>;
};

export const eventsApi = createApi({
  reducerPath: "eventsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Events"],
  endpoints: (builder) => ({
    upcoming: builder.query<UpcomingEventsResponse, { page?: number; limit?: number; search?: string; from?: string; to?: string } | undefined>({
      query: (params) => ({ url: "events/upcoming", params: params ?? undefined }),
      providesTags: [{ type: "Events" as const, id: "LIST" }],
    }),
    byIdOrSlug: builder.query<EventDetailResponse, { idOrSlug: string }>({
      query: ({ idOrSlug }) => ({ url: `events/${idOrSlug}` }),
      providesTags: (_r, _e, arg) => [{ type: "Events" as const, id: String(arg?.idOrSlug ?? "ONE") }],
    }),
    // WEB-BUS-27: Join is an advance RSVP. The server owns the capacity decision and
    // answers 409 EVENT_FULL when the cap is reached, so refetch both the list and
    // the event afterwards to pick up the new seat count.
    rsvp: builder.mutation<{ success: boolean; data?: any }, { eventId: string }>({
      query: ({ eventId }) => ({
        url: `events/${eventId}/rsvp`,
        method: "POST",
        body: { type: "MEMBER" },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Events" as const, id: "LIST" },
        { type: "Events" as const, id: String(arg.eventId) },
      ],
    }),
  }),
});

export const {
  useUpcomingQuery: useUpcomingEventsQuery,
  useByIdOrSlugQuery: useEventByIdOrSlugQuery,
  useLazyUpcomingQuery: useLazyUpcomingEventsQuery,
  useLazyByIdOrSlugQuery: useLazyEventByIdOrSlugQuery,
  useRsvpMutation: useEventRsvpMutation,
} = eventsApi as any;
