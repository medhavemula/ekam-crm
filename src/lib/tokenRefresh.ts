// Token refresh utilities for proactive token management
import { isSessionIdleExpired, stopIdleTracking } from "./idleSession";

/**
 * End a session that has gone idle and send the user back to sign in.
 *
 * The reason travels in the query string so the login screen can say what happened,
 * rather than leaving someone staring at a login form wondering why.
 */
export function expireIdleSession() {
  try {
    stopIdleTracking();
    clearTokenRefreshTimer();
    // The last-activity timestamp is deliberately left in place. Clearing it would read
    // as "no record, so treat as fresh" in every other open tab, and they would carry on
    // as though nothing had happened. Signing in records a new one.
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("isLoggedIn");
  } catch {}
  const basePath = import.meta.env.BASE_URL || "/";
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    window.location.href = `${normalizedBase}login?expired=1`;
  }
}

// Token expiration monitoring
let tokenRefreshTimer: number | null = null;
let isRefreshing = false;

const baseUrl = import.meta.env.VITE_API_BASE_URL;

// Function to decode JWT token and get expiration time
export function getTokenExpiration(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

// Function to schedule token refresh before expiration
export function scheduleTokenRefresh(accessToken: string, refreshToken: string) {
  // Clear any existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }

  const expirationTime = getTokenExpiration(accessToken);
  if (!expirationTime) return;

  const now = Date.now();
  const timeUntilExpiry = expirationTime - now;
  
  // Refresh 2 minutes before expiration
  const refreshTime = Math.max(timeUntilExpiry - 2 * 60 * 1000, 5000);
  
  tokenRefreshTimer = setTimeout(async () => {
    if (isRefreshing) return;

    // The whole point of the idle rule. This timer used to renew unconditionally, so an
    // unattended tab kept itself signed in indefinitely. If nobody has interacted within
    // the window, stop renewing and let the session end.
    if (isSessionIdleExpired()) {
      expireIdleSession();
      return;
    }

    isRefreshing = true;
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // Schedule next refresh
        if (data.accessToken && data.refreshToken) {
          scheduleTokenRefresh(data.accessToken, data.refreshToken);
        }
      } else {
        // Refresh failed, clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isLoggedIn');
        const basePath = import.meta.env.BASE_URL || "/";
        const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
        window.location.href = `${normalizedBase}login`;
      }
    } catch (error) {
      console.error('Proactive token refresh failed:', error);
      // Clear tokens on error
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      const basePath = import.meta.env.BASE_URL || "/";
      const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
      window.location.href = `${normalizedBase}login`;
    } finally {
      isRefreshing = false;
    }
  }, refreshTime);
}

// Function to clear token refresh timer
export function clearTokenRefreshTimer() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

// Initialize token refresh monitoring
export function initializeTokenRefresh() {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      scheduleTokenRefresh(accessToken, refreshToken);
    }
  }
}
