import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "./types";

// Events-specific types
export type Venue = {
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  eventType?: "NETWORKING" | "TRAINING" | "SOCIAL" | "CONFERENCE" | "OTHER";
  chapterId: string;
  chapterName?: string;
  regionId?: string;
  regionName?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: Venue | string;
  maxAttendees?: number;
  registeredCount?: number;
  attendedCount?: number;
  status: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  organizerId?: string;
  organizerName?: string;
  fee?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventInput = {
  title: string;
  description?: string;
  eventType?: "NETWORKING" | "TRAINING" | "SOCIAL" | "CONFERENCE" | "OTHER";
  chapterId: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: Venue | string;
  maxAttendees?: number;
  fee?: number;
  // Additional fields accepted by backend variations and used by UI
  startsAt?: string;
  endsAt?: string;
  mode?: string;
  type?: string;
  link?: string;
  banner?: string | File;
  contactPerson?: string;
  costForMembers?: number;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  address?: string;
  regionId?: string;
  category?: string;
};

export type UpdateEventInput = Partial<CreateEventInput> & {
  status?: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "CANCELLED";
};

export type EventsListParams = EdFilterParams & {
  chapterId?: string;
  eventType?: string;
  status?: string;
};

/**
 * Executive Director Events API
 * Handles event management and tracking
 */
export const edEventsApi = createApi({
  reducerPath: "edEventsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EdEvents", "EdEventDetails"],
  endpoints: (builder) => ({
    /**
     * List all events
     */
    getEdEvents: builder.query<
      PaginatedResponse<Event>,
      EventsListParams | void
    >({
      query: (params) => ({
        url: "admin/ed/events",
        params: params ?? {},
      }),
      providesTags: ["EdEvents"],
    }),

    /**
     * Get single event details
     */
    getEdEvent: builder.query<ApiResponse<Event>, string>({
      query: (eventId) => ({
        url: `admin/ed/events/${eventId}`,
      }),
      providesTags: (_result, _error, eventId) => [
        { type: "EdEventDetails", id: eventId },
      ],
    }),

    /**
     * Create a new event
     */
    createEdEvent: builder.mutation<ApiResponse<Event>, CreateEventInput>({
      query: (body) => {
        // If banner is a File object, convert to FormData
        if (body.banner instanceof File) {
          const formData = new FormData();
          
          // Add all fields to FormData
          formData.append("title", body.title);
          if (body.description) formData.append("description", body.description);
          if (body.category) formData.append("category", body.category);
          if (body.type) formData.append("type", body.type);
          if (body.mode) formData.append("mode", body.mode);
          if (body.banner) formData.append("banner", body.banner);
          if (body.contactPerson) formData.append("contactPerson", body.contactPerson);
          if (body.costForMembers !== undefined) formData.append("costForMembers", String(body.costForMembers));
          if (body.startsAt) formData.append("startsAt", body.startsAt);
          if (body.endsAt) formData.append("endsAt", body.endsAt);
          if (body.location) formData.append("location", body.location);
          // Serialize nested venue if provided
          if (typeof body.venue === "object" && body.venue) {
            if (body.venue.address1) formData.append("venue[address1]", body.venue.address1);
            if (body.venue.city) formData.append("venue[city]", body.venue.city);
            if (body.venue.state) formData.append("venue[state]", body.venue.state);
            if (body.venue.country) formData.append("venue[country]", body.venue.country);
            if (body.venue.postcode) formData.append("venue[postcode]", body.venue.postcode);
          } else if (typeof body.venue === "string") {
            formData.append("venue", body.venue);
          }
          // Backwards-compat: include flat fields if present
          if (body.address) formData.append("address", body.address);
          if (body.country) formData.append("country", body.country);
          if (body.state) formData.append("state", body.state);
          if (body.city) formData.append("city", body.city);
          if (body.pincode) formData.append("pincode", body.pincode);
          if (body.regionId) formData.append("regionId", body.regionId);
          if (body.maxAttendees !== undefined) formData.append("maxAttendees", String(body.maxAttendees));
          if (body.link) formData.append("link", body.link);
          if (body.chapterId) formData.append("chapterId", body.chapterId);
          if (body.startDate) formData.append("startDate", body.startDate);
          if (body.endDate) formData.append("endDate", body.endDate);
          if (body.eventType) formData.append("eventType", body.eventType);
          if (body.fee !== undefined) formData.append("fee", String(body.fee));
          
          return {
            url: "admin/ed/events",
            method: "POST",
            body: formData,
          };
        }
        
        // Regular JSON payload without file
        return {
          url: "admin/ed/events",
          method: "POST",
          body,
        };
      },
      invalidatesTags: ["EdEvents"],
    }),

    /**
     * Update event details
     */
    updateEdEvent: builder.mutation<
      ApiResponse<Event>,
      { eventId: string; data: UpdateEventInput }
    >({
      query: ({ eventId, data }) => {
        const anyData: any = data;

        // If banner is a File, convert to FormData (similar to createEdEvent)
        if (anyData.banner instanceof File) {
          const formData = new FormData();

          if (anyData.title) formData.append("title", anyData.title);
          if (anyData.description) formData.append("description", anyData.description);
          if (anyData.category) formData.append("category", anyData.category);
          if (anyData.type) formData.append("type", anyData.type);
          if (anyData.mode) formData.append("mode", anyData.mode);
          if (anyData.banner) formData.append("banner", anyData.banner);
          if (anyData.contactPerson) formData.append("contactPerson", anyData.contactPerson);
          if (typeof anyData.costForMembers === "number")
            formData.append("costForMembers", String(anyData.costForMembers));
          if (anyData.startsAt) formData.append("startsAt", anyData.startsAt);
          if (anyData.endsAt) formData.append("endsAt", anyData.endsAt);
          if (anyData.location) formData.append("location", anyData.location);

          const v: any = anyData.venue;
          if (v && typeof v === "object") {
            if (v.address1) formData.append("venue[address1]", v.address1);
            if (v.city) formData.append("venue[city]", v.city);
            if (v.state) formData.append("venue[state]", v.state);
            if (v.country) formData.append("venue[country]", v.country);
            if (v.postcode) formData.append("venue[postcode]", v.postcode);
          }

          if (anyData.address) formData.append("address", anyData.address);
          if (anyData.country) formData.append("country", anyData.country);
          if (anyData.state) formData.append("state", anyData.state);
          if (anyData.city) formData.append("city", anyData.city);
          if (anyData.pincode) formData.append("pincode", anyData.pincode);
          if (anyData.regionId) formData.append("regionId", anyData.regionId);
          if (anyData.chapterId) formData.append("chapterId", anyData.chapterId);
          if (anyData.maxAttendees !== undefined)
            formData.append("maxAttendees", String(anyData.maxAttendees));
          if (anyData.link) formData.append("link", anyData.link);

          return {
            url: `admin/ed/events/${eventId}`,
            method: "PUT",
            body: formData,
          };
        }

        // JSON payload path (no file)
        return {
          url: `admin/ed/events/${eventId}`,
          method: "PUT",
          body: data,
        };
      },
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: "EdEventDetails", id: eventId },
        "EdEvents",
      ],
    }),

    /**
     * Delete event
     */
    deleteEdEvent: builder.mutation<ApiResponse<void>, string>({
      query: (eventId) => ({
        url: `admin/ed/events/${eventId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EdEvents"],
    }),

    /**
     * Export events data
     */
    exportEdEvents: builder.mutation<Blob, EventsListParams | void>({
      query: (params) => ({
        url: "admin/ed/events/export",
        method: "GET",
        params: params ?? {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEdEventsQuery,
  useLazyGetEdEventsQuery,
  useGetEdEventQuery,
  useLazyGetEdEventQuery,
  useCreateEdEventMutation,
  useUpdateEdEventMutation,
  useDeleteEdEventMutation,
  useExportEdEventsMutation,
} = edEventsApi;
