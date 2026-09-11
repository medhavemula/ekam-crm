import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../lib/rtkBaseQuery";

export type PushPreferences = {
  pushEnabled: boolean;
  chat: boolean;
  events: boolean;
  groups: boolean;
  feed: boolean;
  meetings: boolean;
  approvals: boolean;
  system: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  updatedAt?: string;
};

type PushPreferencesResponse = {
  success: boolean;
  data: PushPreferences;
};

type RegisterPushDeviceBody = {
  token: string;
  platform: "web";
  deviceId: string;
  deviceName?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
};

export const pushApi = createApi({
  reducerPath: "pushApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["PushPreferences"],
  endpoints: (builder) => ({
    registerPushDevice: builder.mutation<
      { success: boolean; data: { registered: boolean } },
      RegisterPushDeviceBody
    >({
      query: (body) => ({
        url: "web/push/register",
        method: "POST",
        body,
      }),
    }),
    unregisterPushDevice: builder.mutation<
      { success: boolean; data: { unregistered: boolean; count: number } },
      { token?: string; deviceId?: string }
    >({
      query: (body) => ({
        url: "web/push/unregister",
        method: "POST",
        body,
      }),
    }),
    getPushPreferences: builder.query<PushPreferencesResponse, void>({
      query: () => ({
        url: "web/push/preferences",
      }),
      providesTags: [{ type: "PushPreferences", id: "CURRENT" }],
    }),
    updatePushPreferences: builder.mutation<PushPreferencesResponse, Partial<PushPreferences>>({
      query: (body) => ({
        url: "web/push/preferences",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "PushPreferences", id: "CURRENT" }],
    }),
  }),
});

export const {
  useRegisterPushDeviceMutation,
  useUnregisterPushDeviceMutation,
  useGetPushPreferencesQuery,
  useUpdatePushPreferencesMutation,
} = pushApi;
