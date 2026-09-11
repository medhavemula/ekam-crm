import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";
import type { ApiResponse, PaginatedResponse, EdFilterParams } from "../ed/types";

export type SaVenue = {
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

export type SaEvent = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  startsAt?: string;
  endsAt?: string;
  mode?: string; // SA uses mode instead of type
  link?: string;
  bannerUrl?: string;
  venue?: SaVenue | string;
  maxAttendees?: number;
  pricing?: { member?: number; nonMember?: number; currency?: string };
  counters?: { registrationsTotal?: number };
};

export type SaEventsListParams = EdFilterParams;

export const saEventsApi = createApi({
  reducerPath: "saEventsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["SaEvents", "SaEventDetails"],
  endpoints: (builder) => ({
    getSaEvents: builder.query<PaginatedResponse<SaEvent>, SaEventsListParams | void>({
      query: (params) => ({
        url: "admin/events",
        params: params ?? {},
      }),
      providesTags: ["SaEvents"],
    }),

    getSaEvent: builder.query<ApiResponse<SaEvent>, string>({
      query: (eventId) => ({
        url: `admin/events/${eventId}`,
      }),
      providesTags: (_res, _err, eventId) => [{ type: "SaEventDetails", id: eventId }],
    }),

    // Create SA event (Super Admin)
    createSaEvent: builder.mutation<ApiResponse<SaEvent>, any>({
      query: (raw) => {
        // If banner is a File object, convert to FormData
        if (raw.banner instanceof File) {
          const formData = new FormData();
          
          // Add all fields to FormData
          formData.append("title", raw.title);
          if (raw.description) formData.append("description", raw.description);
          if (raw.category) formData.append("category", raw.category);
          if (raw.type) formData.append("type", raw.type);
          if (raw.mode) formData.append("mode", raw.mode);
          if (raw.banner) formData.append("image", raw.banner);
          if (raw.contactPerson) formData.append("contactPerson", raw.contactPerson);
          if (raw.costForMembers !== undefined) formData.append("costForMembers", Number(raw.costForMembers).toString());
          if (raw.startsAt) formData.append("startsAt", raw.startsAt);
          if (raw.endsAt) formData.append("endsAt", raw.endsAt);
          if (raw.location) formData.append("location", raw.location);
          if (raw.visibility) formData.append("visibility", raw.visibility);
          // Skip maxAttendees in FormData to avoid type validation issues
          // TODO: Need to handle this properly - possibly with separate image upload
          // if (raw.maxAttendees !== undefined && raw.maxAttendees !== null && raw.maxAttendees !== "") {
          //   formData.append("maxAttendees", Number(raw.maxAttendees).toString());
          // }
          // Serialize nested venue if provided
          if (typeof raw.venue === "object" && raw.venue) {
            if (raw.venue.address1) formData.append("venue[address1]", raw.venue.address1);
            if (raw.venue.city) formData.append("venue[city]", raw.venue.city);
            if (raw.venue.state) formData.append("venue[state]", raw.venue.state);
            if (raw.venue.country) formData.append("venue[country]", raw.venue.country);
            if (raw.venue.postcode) formData.append("venue[postcode]", raw.venue.postcode);
          } else if (typeof raw.venue === "string") {
            formData.append("venue", raw.venue);
          }
          // Backwards-compat: include flat fields if present
          if (raw.address) formData.append("address", raw.address);
          if (raw.country) formData.append("country", raw.country);
          if (raw.state) formData.append("state", raw.state);
          if (raw.city) formData.append("city", raw.city);
          if (raw.pincode) formData.append("pincode", raw.pincode);
          if (raw.link) formData.append("link", raw.link);
          
          return {
            url: "admin/events",
            method: "POST",
            body: formData,
          };
        }
        
        // Regular JSON payload without file
        const body = {
          ...raw,
          // Ensure numeric types
          maxAttendees: typeof raw?.maxAttendees === 'string' ? Number(raw.maxAttendees) : raw?.maxAttendees,
          costForMembers: typeof raw?.costForMembers === 'string' ? Number(raw.costForMembers) : raw?.costForMembers,
        };
        
        return { url: "admin/events", method: "POST", body };
      },
      invalidatesTags: ["SaEvents"],
    }),

    // Update SA event (Super Admin)
    updateSaEvent: builder.mutation<
      ApiResponse<SaEvent>,
      { eventId: string; data: Partial<SaEvent> & { costForMembers?: number } }
    >({
      query: ({ eventId, data }) => {
        // If banner is a File, use multipart FormData similar to createSaEvent
        const anyData: any = data;
        if (anyData.banner instanceof File) {
          const formData = new FormData();

          if (anyData.title) formData.append("title", anyData.title);
          if (anyData.description) formData.append("description", anyData.description);
          if (anyData.category) formData.append("category", anyData.category as any);
          if (anyData.type) formData.append("type", anyData.type as any);
          if (anyData.mode) formData.append("mode", anyData.mode as any);
          if (anyData.banner) formData.append("image", anyData.banner);
          if (anyData.contactPerson) formData.append("contactPerson", anyData.contactPerson as any);
          if (typeof anyData.costForMembers === "number")
            formData.append("costForMembers", String(anyData.costForMembers));
          if (anyData.startsAt) formData.append("startsAt", anyData.startsAt as any);
          if (anyData.endsAt) formData.append("endsAt", anyData.endsAt as any);
          if (anyData.locationLabel || anyData.location)
            formData.append("locationLabel", (anyData.locationLabel || anyData.location) as any);
          if (anyData.visibility) formData.append("visibility", anyData.visibility as any);

          const v: any = anyData.venue;
          if (v && typeof v === "object") {
            if (v.address1) formData.append("venue[address1]", v.address1);
            if (v.city) formData.append("venue[city]", v.city);
            if (v.state) formData.append("venue[state]", v.state);
            if (v.country) formData.append("venue[country]", v.country);
            if (v.postcode) formData.append("venue[postcode]", v.postcode);
          }

          if (anyData.address) formData.append("address", anyData.address as any);
          if (anyData.country) formData.append("country", anyData.country as any);
          if (anyData.state) formData.append("state", anyData.state as any);
          if (anyData.city) formData.append("city", anyData.city as any);
          if (anyData.pincode) formData.append("pincode", anyData.pincode as any);
          if (anyData.link) formData.append("link", anyData.link as any);

          return {
            url: `admin/events/${eventId}`,
            method: "PATCH",
            body: formData,
          };
        }

        // JSON payload path (no file)
        const payload: any = { ...data };

        // Normalize costForMembers into pricing.member if provided
        if (typeof (data as any).costForMembers === "number") {
          const costForMembers = (data as any).costForMembers;
          const currentPricing = ((data as any).pricing ?? {}) as any;
          payload.pricing = {
            ...currentPricing,
            member: costForMembers,
            nonMember:
              typeof currentPricing.nonMember === "number"
                ? currentPricing.nonMember
                : 0,
          };
          delete payload.costForMembers;
        }

        // If caller passes pricing, ensure it is valid for backend (member + nonMember required when pricing is present)
        if (payload.pricing && typeof payload.pricing === "object") {
          if (typeof payload.pricing.member !== "number") payload.pricing.member = 0;
          if (typeof payload.pricing.nonMember !== "number") payload.pricing.nonMember = 0;
        }

        return {
          url: `admin/events/${eventId}`,
          method: "PATCH",
          body: payload,
        };
      },
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: "SaEventDetails", id: eventId },
        "SaEvents",
      ],
    }),
  }),
});

export const {
  useGetSaEventsQuery,
  useLazyGetSaEventsQuery,
  useGetSaEventQuery,
  useLazyGetSaEventQuery,
  useCreateSaEventMutation,
  useUpdateSaEventMutation,
} = saEventsApi;
