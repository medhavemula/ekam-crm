import { lazy, useEffect, useState, useSyncExternalStore } from "react";
import type { ComponentType } from "react";
import { ADMIN_THEME, activeThemeClass } from "../theme/themeScope";

/**
 * The route loading state, and the `lazy()` wrapper it is timed against.
 *
 * The two live in one file because their timings have to agree. The screen
 * stays invisible for REVEAL_MS, so the wrapper only holds a page back when the
 * screen was actually up, and then only long enough that it does not read as a
 * flash.
 *
 * What it shows depends on where you are going. Arriving at the application —
 * the sign-in screen, and the dashboard you land on after signing in — is a
 * start, and gets the wordmark. Moving between pages inside it is not, so those
 * get the shape of the page that is coming instead: a header, a toolbar and a
 * table, blocked out. A branded takeover on every tab made each one feel like a
 * fresh start of the whole application, and it covered the navigation bar — or
 * rather it did not, since the bar outranks it on z-index and drew straight
 * over the top of it. The skeleton starts below the real bar and leaves it
 * alone.
 *
 * Why an overlay rather than the Suspense fallback: react-router v7 runs every
 * navigation inside startTransition, so React keeps the page you are leaving on
 * screen and never renders the fallback. The page you were on simply froze
 * until the chunk arrived. A store the wrapper writes to is independent of
 * that, and because it sits above the page rather than in place of it, it can
 * fade out over the page it has just revealed.
 *
 * None of it can paint until the application bundle has mounted. Before that
 * there is no application, so a cold start shows the browser's blank page for
 * as long as the bundle takes; ArrivalScreen below is what App.tsx hands to
 * <Suspense> the moment there is something to render it with.
 */

/** Under this, a chunk is fast enough that showing anything would be a flash. */
const REVEAL_MS = 120;
/** One full pass of the bar on the branded opening. */
const SWEEP_MS = 900;
/** Once up, it stays at least this long, so it is never a blink. */
const MIN_ON_SCREEN = 500;
/** The fade the page is revealed through. */
const FADE_MS = 260;

/**
 * Landing on one of these is an arrival at the application rather than a move
 * within it. Both post-login destinations end in /dashboard — see
 * ROLE_DEFAULT_ROUTES in src/config/routeConfig.ts.
 */
const isArrival = (path: string) => /\/dashboard\/?$/.test(path);

/** Where the load that is currently in flight is heading. */
let pendingPath = "/";
let pending = 0;
const listeners = new Set<() => void>();

// lazy()'s loader runs during render, so notifying synchronously would update
// the overlay while another component is rendering. A microtask still lands
// before the browser paints, so nothing is lost by deferring.
const notify = () => queueMicrotask(() => listeners.forEach((l) => l()));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const snapshot = () => pending;

/** Whether a page — any page — is committed and painted. */
const appIsPainted = () =>
  (document.getElementById("root")?.childElementCount ?? 0) > 0;

const signedIn = () => {
  try {
    return !!localStorage.getItem("accessToken");
  } catch {
    return false;
  }
};

/**
 * The palette the line is drawn in: the theme of the page it is drawn over,
 * which is also the theme of the page arriving, so it belongs to both.
 */
const screenTheme = (): string => activeThemeClass();

/** The height of the navigation bar currently on screen, or 0 if there is none. */
const navHeight = () => {
  const el = document.querySelector("[data-ekam-nav]");
  return el ? Math.round(el.getBoundingClientRect().height) : 0;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * `lazy`, plus the loading state and the hold.
 *
 * React caches what the loader resolves, so a route pays this once per session:
 * returning to a page you have already opened neither fetches nor waits.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    // Read as the load starts: react-router has already put the destination in
    // the address bar by the time it renders the route that suspends here.
    if (pending === 0) pendingPath = window.location.pathname;
    pending += 1;
    notify();
    const started = performance.now();
    try {
      const mod = await load();
      const onScreenFor = performance.now() - started - REVEAL_MS;
      // Nothing to hold if the screen never appeared.
      if (onScreenFor > 0 && onScreenFor < MIN_ON_SCREEN && !prefersReducedMotion()) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, MIN_ON_SCREEN - onScreenFor);
        });
      }
      return mod;
    } finally {
      // Released before React renders the page, so the fade out runs over it
      // rather than after it.
      pending -= 1;
      notify();
    }
  });
}

type Phase = "idle" | "waiting" | "shown" | "leaving";

type Look = {
  /** The theme class, "" for the app's own dark chrome. */
  theme: string;
  /** The wordmark rather than the skeleton: an arrival, not a page change. */
  brand: boolean;
  /** Height of the navigation bar on screen, which this must not cover. */
  nav: number;
};

/**
 * Which of the two treatments, and how it is dressed.
 *
 * The wordmark is for arriving at the application: a reload of any page, the
 * sign-in screen, and the dashboard you land on after it. Nothing of the
 * application is on screen in those cases, and a bare ground with a hairline on
 * it reads as a page that failed to load. Moving between pages is not an
 * arrival — the chrome is already there and staying — so that gets the line,
 * and the page draws its own placeholders where its own data goes.
 */
const readLook = (): Look => {
  const reloaded = !appIsPainted();
  const brand = reloaded || !signedIn() || isArrival(pendingPath);
  return {
    // The arrival screen is the same one wherever it appears, so its palette is
    // fixed rather than taken from whatever it is handing over to. The line
    // still wears the surface it is drawn over.
    theme: brand ? ADMIN_THEME : screenTheme(),
    brand,
    nav: navHeight(),
  };
};

/**
 * The arrival screen: the wordmark over an indeterminate bar.
 *
 * A mark that is on screen again a moment later reads as continuity rather than
 * as a separate loading state, which is why this is the opening and not a
 * spinner. Cropped the way the navbar crops it.
 */
function BrandScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <span
          aria-label="E.K.A.M"
          role="img"
          className="block h-8 w-[128px] shrink-0 select-none bg-no-repeat"
          style={{
            backgroundImage: "var(--nav-logo)",
            backgroundSize: "contain",
            backgroundPosition: "center",
          }}
        />
        <span
          aria-hidden="true"
          className="relative block h-[3px] w-32 overflow-hidden rounded-full bg-[var(--ov-fill-subtle)]"
        >
          <span
            className="ekam-sweep-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--ov-ember-fill)]"
            style={{ animationDuration: `${SWEEP_MS}ms` }}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * The same screen, on its own ground, for Suspense to fall back to.
 *
 * This is where the loading screen lived before: App.tsx handed one to
 * <Suspense>. React cannot render it until the bundle has mounted, so the wait
 * before that is a blank page — which is why a copy of it briefly lived in
 * index.html instead.
 */
export function ArrivalScreen() {
  return (
    <div
      className={`${ADMIN_THEME} flex min-h-screen flex-col`}
      style={{ background: "var(--ov-floor)" }}
      role="status"
      aria-live="polite"
    >
      <BrandScreen />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function RouteLoadingOverlay() {
  const loading = useSyncExternalStore(subscribe, snapshot) > 0;
  const [phase, setPhase] = useState<Phase>("idle");
  // Read once at the start of a cycle and held through the fade, so the page
  // arriving underneath cannot repaint or reposition the screen on its way out.
  const [look, setLook] = useState<Look | null>(null);

  useEffect(() => {
    if (loading) {
      setLook((l) => l ?? readLook());
      setPhase((p) => (p === "shown" ? "shown" : "waiting"));
      const t = window.setTimeout(() => setPhase("shown"), REVEAL_MS);
      return () => window.clearTimeout(t);
    }
    // A chunk that resolved inside REVEAL_MS was never seen, so there is
    // nothing to fade — drop it in the same frame the page arrives.
    setPhase((p) => (p === "waiting" || p === "idle" ? "idle" : "leaving"));
    const t = window.setTimeout(() => {
      setPhase("idle");
      setLook(null);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [loading]);

  if (phase === "idle" || !look) return null;

  const shown = phase === "shown";
  const fade = `opacity ${shown ? 200 : FADE_MS}ms ease-out`;

  // Moving between pages: the page's own code is on its way, which is not the
  // same thing as its records being on their way, and it is not worth a screen.
  // A line under the navigation bar says the click landed; the page then draws
  // its own placeholders where its data goes.
  if (!look.brand) {
    return (
      <div
        className={`${look.theme} pointer-events-none fixed inset-x-0 z-[110] h-[3px] overflow-hidden`}
        style={{ top: look.nav, opacity: shown ? 1 : 0, transition: fade }}
        role="status"
        aria-live="polite"
      >
        <span
          className="ekam-sweep-bar absolute inset-y-0 left-0 w-1/3 bg-[var(--ov-ember-fill)]"
          style={{ animationDuration: `${SWEEP_MS}ms` }}
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <div
      className={`${look.theme} fixed inset-0 z-[120] flex flex-col overflow-hidden`}
      style={{
        background: "var(--ov-floor)",
        opacity: shown ? 1 : 0,
        transition: fade,
        // The page beneath is half-swapped and covered; it should not take a
        // click, but an invisible overlay must not eat one either.
        pointerEvents: shown ? "auto" : "none",
      }}
      role="status"
      aria-live="polite"
    >
      <BrandScreen />
      <span className="sr-only">Loading</span>
    </div>
  );
}
