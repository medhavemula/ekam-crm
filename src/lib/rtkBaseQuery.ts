import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { initializeTokenRefresh, clearTokenRefreshTimer, expireIdleSession } from "./tokenRefresh";
import { isSessionIdleExpired } from "./idleSession";

// Cookie-only auth base query: always send cookies; on 401, call refresh and retry once.
const baseUrl = import.meta.env.VITE_API_BASE_URL;

// Initialize token refresh monitoring
initializeTokenRefresh();

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers) => {
    // If caller already specified Authorization, don't override (e.g., refresh with refresh token)
    const hasAuth = headers.has("Authorization");
    if (!hasAuth) {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        try { console.debug("rtkBaseQuery: Authorization header set"); } catch {}
      } else {
        try { console.debug("rtkBaseQuery: no access token in localStorage"); } catch {}
      }
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

// Ensure only one refresh runs at a time across concurrent 401s
let refreshPromise: Promise<boolean> | null = null;

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api: BaseQueryApi,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // The other way back in. Without this check a single request from an idle tab would
    // refresh the token and revive a session that should already have ended.
    if (isSessionIdleExpired()) {
      expireIdleSession();
      return result;
    }
    try {
      const doStartRefresh = () => {
        const refreshToken = typeof localStorage !== "undefined" ? localStorage.getItem("refreshToken") : null;
        if (!refreshToken) return null;
        return (async () => {
          const refreshResponse = await rawBaseQuery(
            {
              url: "auth/refresh",
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${refreshToken}`,
              },
            },
            api,
            extraOptions
          );
          if (!refreshResponse.error) {
            const data: any = refreshResponse.data || {};
            if (data.accessToken) {
              localStorage.setItem("accessToken", data.accessToken);
              // Schedule proactive refresh for new token
              if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
                const { scheduleTokenRefresh } = await import("./tokenRefresh");
                scheduleTokenRefresh(data.accessToken, data.refreshToken);
              }
            }
            return true;
          } else {
            try {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("isLoggedIn");
              // Clear refresh timer
              clearTokenRefreshTimer();
            } catch {}
            return false;
          }
        })();
      };

      if (!refreshPromise) {
        const started = doStartRefresh();
        if (started) {
          refreshPromise = started.finally(() => {
            // allow subsequent refreshes after this settles
            refreshPromise = null;
          });
        } else {
          // no refresh token available
          return result;
        }
      }

      const ok = await refreshPromise;
      if (ok) {
        result = await rawBaseQuery(args, api, extraOptions);
      }
    } catch {}
  }

  return result;
};

