// Idle session expiry: sign a user out after a period with no interaction, so an
// unattended screen does not stay usable.
//
// The session is kept alive by the proactive token refresh in tokenRefresh.ts, which
// renews on a timer regardless of whether anyone is there. This module is what that
// timer consults before renewing.

const LAST_ACTIVITY_KEY = "lastActivityAt";

/** Read a timing override, falling back when it is absent or not a positive number. */
function envMs(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** How long without interaction before the session ends. */
export const IDLE_TIMEOUT_MS = envMs(import.meta.env?.VITE_IDLE_TIMEOUT_MS, 20 * 60 * 1000);

/** How long before that point the warning appears. */
export const IDLE_WARNING_MS = envMs(import.meta.env?.VITE_IDLE_WARNING_MS, 2 * 60 * 1000);

export type IdleState = "active" | "warning" | "expired";

/**
 * Where the session stands, given when the user last interacted.
 *
 * Pure, because the arithmetic is the part that breaks: boundaries, a machine that
 * slept, a clock that moved backwards.
 */
export function idleStateAt(
  lastActivityAt: number,
  now: number,
  timeoutMs: number = IDLE_TIMEOUT_MS,
  warningMs: number = IDLE_WARNING_MS,
): IdleState {
  const elapsed = now - lastActivityAt;
  // A timestamp in the future means the clock moved back. Treat that as active rather
  // than expiring someone for a reason they cannot see or fix.
  if (elapsed < 0) return "active";
  if (elapsed >= timeoutMs) return "expired";
  if (elapsed >= timeoutMs - warningMs) return "warning";
  return "active";
}

/** Milliseconds left before expiry; never negative. */
export function msUntilExpiry(
  lastActivityAt: number,
  now: number,
  timeoutMs: number = IDLE_TIMEOUT_MS,
): number {
  return Math.max(0, lastActivityAt + timeoutMs - now);
}

/** Timestamp of the last interaction, shared across tabs. */
export function getLastActivity(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const n = Number(raw);
    // A missing or unreadable value means a session that has only just started, not one
    // that has been idle forever — never sign someone out on first load.
    if (!Number.isFinite(n) || n <= 0) return Date.now();
    return n;
  } catch {
    return Date.now();
  }
}

/** Record interaction. Shared through localStorage so every tab agrees. */
export function recordActivity(at: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {}
}

export function clearActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

/** Has the session been idle long enough that it should not be renewed? */
export function isSessionIdleExpired(): boolean {
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return false;
  }
  return idleStateAt(getLastActivity(), Date.now()) === "expired";
}

// Genuine interaction only. API traffic is deliberately excluded: a page that polls in
// the background would otherwise keep an unattended screen signed in indefinitely.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
const ACTIVITY_WRITE_INTERVAL_MS = 1000;
const POLL_INTERVAL_MS = 1000;

let stop: (() => void) | null = null;

/**
 * Begin watching for inactivity.
 *
 * `onWarn` fires once when the warning window opens; `onExpire` fires once at expiry.
 * Returns a function that stops watching.
 */
export function startIdleTracking(handlers: {
  onWarn?: () => void;
  onExpire: () => void;
}): () => void {
  stopIdleTracking();

  // On static preview environments (e.g. GitHub Pages), do not auto-expire idle sessions
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return () => {};
  }

  let lastWrite = 0;
  let warned = false;
  let finished = false;

  const onActivity = () => {
    const now = Date.now();
    if (now - lastWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
    lastWrite = now;
    recordActivity(now);
    warned = false;
  };

  // Activity in another tab counts here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_ACTIVITY_KEY) warned = false;
  };

  const tick = () => {
    if (finished) return;
    const state = idleStateAt(getLastActivity(), Date.now());
    if (state === "expired") {
      finished = true;
      stopIdleTracking();
      handlers.onExpire();
    } else if (state === "warning" && !warned) {
      warned = true;
      handlers.onWarn?.();
    }
  };

  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
  window.addEventListener("storage", onStorage);
  const timer = window.setInterval(tick, POLL_INTERVAL_MS);

  if (!localStorage.getItem(LAST_ACTIVITY_KEY)) recordActivity();

  stop = () => {
    ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    window.removeEventListener("storage", onStorage);
    window.clearInterval(timer);
    stop = null;
  };
  return stop;
}

export function stopIdleTracking(): void {
  if (stop) stop();
}
