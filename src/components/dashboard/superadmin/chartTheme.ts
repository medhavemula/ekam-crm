/**
 * Super Admin overview design tokens.
 *
 * Colour values live in `src/index.css` as `--ov-*` custom properties; this file
 * re-exports only the handful the components need as JavaScript strings, because
 * an SVG `fill` computed in JS and a Tailwind class cannot both read the same
 * variable. Change a colour in the CSS block and here, and nowhere else.
 *
 * PALETTE NOTE — the three series hues below are validated as a categorical
 * palette against the panel surface: OKLCH lightness band (dark 0.48–0.67),
 * chroma floor, all-pairs CVD separation (worst 13.7 ΔE protan), normal-vision
 * separation (worst 24.6 ΔE) and WCAG contrast all pass. Replacing one is not a
 * taste decision — re-run the validator, or a pair collapses for colourblind
 * readers. The obvious warm trio (ember/rose/jade) fails: rose and jade sit
 * 1.6 ΔE apart under deuteranopia, which is indistinguishable.
 */

/* ---- Surfaces ----
   The page floor darkens as it descends so a panel reads as lighter than the
   ground at every scroll position. The previous shared gradient brightened
   downward and panels turned into holes near the bottom of a long page. */

/** Page floor. Supplied by the active theme class rather than baked in here. */
export const FLOOR = "var(--ov-floor)";

/** Raised card surface — must match `--ov-panel`; SVG markers punch holes in it. */
export const SURFACE = "var(--ov-panel)";

/** Recessed surface for the cascade rail — below the floor, not above it. */
export const TROUGH = "var(--ov-trough)";

/* ---- Accent ---- */
export const EMBER = "var(--ov-ember)";
export const EMBER_FILL = "var(--ov-ember-fill)";

/** Fixed categorical order — never cycled, never reassigned by rank. */
export const SERIES_HUES = ["var(--ov-s1)", "var(--ov-s2)", "var(--ov-s3)"] as const;

/** Hue per metric key, so filtering or reordering never repaints a series. */
export const METRIC_HUE: Record<string, string> = {
  chaptersGrowth: SERIES_HUES[0],
  businessOpportunity: SERIES_HUES[1],
  businessClosed: SERIES_HUES[2],
  // ED dashboard keys reuse the same fixed order.
  memberGrowth: SERIES_HUES[0],
  businessOpportunities: SERIES_HUES[1],
};

export const hueForMetric = (key: string, fallback = SERIES_HUES[0]) =>
  METRIC_HUE[key] ?? fallback;

/** Recessive chrome — warm hairlines, never pure white on this ground. */
export const GRID_LINE = "var(--ov-line-faint)";
export const AXIS_LINE = "var(--ov-line-strong)";

/** Axis tick ink. Measured at 4.7:1 against SURFACE. */
export const TICK_INK = "var(--ov-ink-5)";
/** Text tokens. Data colour never gets applied to text. */
export const INK = {
  primary: "text-[var(--ov-ink)]",
  secondary: "text-[var(--ov-ink-2)]",
  muted: "text-[var(--ov-ink-4)]",
} as const;

/* ---- Motion ----
   One easing curve and one load timeline for the whole screen, so the sequence
   reads as a single orchestrated moment rather than a pile of separate effects. */

/** Decelerating ease used by every entrance on this screen. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Start offsets, in seconds, for each band of the load sequence. */
export const BEAT = {
  bar: 0,
  cascade: 0.08,
  node: 0.18,
  nodeStagger: 0.07,
  flow: 0.4,
  charts: 0.5,
  chartStagger: 0.08,
} as const;

const INR = "₹";

/**
 * Formats a scaled number with the fewest decimals that still distinguish it from
 * its neighbours. Fixed decimal counts produce mixed units along one axis
 * ("₹5.0L" next to "₹10L") and round half-steps into a lie ("₹12.5L" as "₹13L").
 */
function trimDecimals(n: number): string {
  const abs = Math.abs(n);
  const dp = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return String(parseFloat(n.toFixed(dp)));
}

/** Compact Indian-numbering currency: 1.2Cr / 3.4L / 56K. */
export function formatCurrencyCompact(value: number): string {
  const n = Number(value) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}${INR}${trimDecimals(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}${INR}${trimDecimals(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}${INR}${trimDecimals(abs / 1e3)}K`;
  return `${sign}${INR}${Math.round(abs).toLocaleString("en-IN")}`;
}

/** Full-precision currency for tooltips and the table view. */
export function formatCurrencyFull(value: number): string {
  return `${INR}${(Number(value) || 0).toLocaleString("en-IN")}`;
}

/** Compact counts: 1,284 / 12.9K / 4.2M. */
export function formatNumberCompact(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${trimDecimals(n / 1e6)}M`;
  if (abs >= 1e4) return `${trimDecimals(n / 1e3)}K`;
  return Math.round(n).toLocaleString("en-IN");
}

export function formatNumberFull(value: number): string {
  return Math.round(Number(value) || 0).toLocaleString("en-IN");
}

export type MetricFormat = "number" | "currency";

export const compactFor = (format: MetricFormat) =>
  format === "currency" ? formatCurrencyCompact : formatNumberCompact;

export const fullFor = (format: MetricFormat) =>
  format === "currency" ? formatCurrencyFull : formatNumberFull;

/**
 * Density between two levels of the network, e.g. regions per country.
 * Returns null when the parent level is empty — "0 chapters per region" with no
 * regions is a division by nothing, not a zero.
 */
export function densityRatio(child: number, parent: number): number | null {
  if (!parent || !Number.isFinite(parent)) return null;
  return child / parent;
}

/** One decimal, but only when the decimal carries information. */
export function formatRatio(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
