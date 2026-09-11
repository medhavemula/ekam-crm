// In-memory tokens. Cleared on tab refresh.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  set(access?: string | null, refresh?: string | null) {
    if (typeof access !== "undefined") accessToken = access;
    if (typeof refresh !== "undefined") refreshToken = refresh;
  },
  clear() {
    accessToken = null;
    refreshToken = null;
  },
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
};
