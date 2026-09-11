import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../lib/rtkBaseQuery";

export type EventDonationItem = {
  id: string;
  donorUserId: string | null;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
};

export type ListEventDonationsParams = {
  eventId: string;
  page?: number;
  limit?: number;
  search?: string;
};

export type ListEventDonationsResponse = {
  success: boolean;
  data: {
    items: EventDonationItem[];
    page: number;
    limit: number;
    total: number;
    totalAmount: number;
  };
};

export type CreateEventDonationParams = {
  eventId: string;
  donorUserId?: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  amount: number;
  currency?: string;
  note?: string;
};

export type UpdateEventDonationParams = {
  donationId: string;
  eventId: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  amount?: number;
  currency?: string;
  note?: string;
};

export type EventDonationDetail = EventDonationItem & {
  eventId: string;
  updatedAt: string;
};

export type GetEventDonationResponse = {
  success: boolean;
  data: EventDonationDetail;
};

export const socialDonationsApi = createApi({
  reducerPath: "socialDonationsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["EventDonations", "SocialDashboard"],
  endpoints: (builder) => ({
    listEventDonations: builder.query<ListEventDonationsResponse, ListEventDonationsParams>({
      query: ({ eventId, ...params }) => ({
        url: `/social/events/${eventId}/donations`,
        method: "GET",
        params,
      }),
      providesTags: (_res, _err, arg) => [{ type: "EventDonations" as const, id: arg.eventId }],
    }),

    createEventDonation: builder.mutation<
      { success: boolean; data: { id: string } },
      CreateEventDonationParams
    >({
      query: ({ eventId, ...body }) => ({
        url: `/social/events/${eventId}/donations`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "EventDonations" as const, id: arg.eventId },
        "SocialDashboard",
      ],
    }),

    getEventDonation: builder.query<GetEventDonationResponse, string>({
      query: (donationId) => ({
        url: `/social/donations/${donationId}`,
        method: "GET",
      }),
    }),

    updateEventDonation: builder.mutation<
      { success: boolean; data: { id: string } },
      UpdateEventDonationParams
    >({
      query: ({ donationId, eventId: _eventId, ...body }) => ({
        url: `/social/donations/${donationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "EventDonations" as const, id: arg.eventId },
        "SocialDashboard",
      ],
    }),

    removeEventDonation: builder.mutation<
      { success: boolean },
      { donationId: string; eventId: string }
    >({
      query: ({ donationId }) => ({
        url: `/social/donations/${donationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: "EventDonations" as const, id: arg.eventId },
        "SocialDashboard",
      ],
    }),
  }),
});

export const {
  useListEventDonationsQuery,
  useCreateEventDonationMutation,
  useUpdateEventDonationMutation,
  useGetEventDonationQuery,
  useRemoveEventDonationMutation,
} = socialDonationsApi;
