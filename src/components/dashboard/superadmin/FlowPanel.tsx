import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Briefcase, CheckCircle2 } from "lucide-react";
import Panel from "./Panel";
import Figure from "./Figure";
import { BEAT, EASE_OUT, SURFACE } from "./chartTheme";

export interface FlowLeg {
  key: string;
  label: string;
  value: number;
  /** Compact formatter used for the headline figure. */
  format: (n: number) => string;
  /** Full-precision string for the title attribute. */
  valueTitle?: string;
  hue: string;
  iconSrc?: string;
  /** Trailing series for the sparkline; the last 12 points are drawn. */
  series?: Array<{ month: string; value: number }>;
  /** One line of plain-language context under the figure. */
  note: string;
}

interface FlowPanelProps {
  legs: FlowLeg[];
  /** Derived readout for the panel header, e.g. average value per opportunity. */
  derived?: { label: string; value: string } | null;
  delay?: number;
}

const SPARK_W = 220;
const SPARK_H = 44;

/**
 * Inset on every edge so the end marker is never clipped by the SVG viewport.
 * The marker is drawn with a non-scaling stroke, so it keeps its pixel radius no
 * matter how the viewBox is squeezed — a path that ends exactly on x = SPARK_W
 * loses the right half of its dot.
 */
const SPARK_PAD_X = 8;
const SPARK_PAD_Y = 5;

/** Sparkline path plus its end coordinate, or null when there is too little to draw. */
function buildSpark(series: Array<{ value: number }> = []) {
  const points = series.slice(-12);
  const values = points.map((p) => Number(p?.value) || 0);
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const plotW = SPARK_W - SPARK_PAD_X * 2;

  const coords = values.map((v, i) => ({
    x: SPARK_PAD_X + (i / (values.length - 1)) * plotW,
    y: SPARK_H - SPARK_PAD_Y - ((v - min) / span) * (SPARK_H - SPARK_PAD_Y * 2),
  }));

  // Midpoint cubics: smooth without the overshoot a naive Catmull-Rom introduces.
  let d = `M ${coords[0].x.toFixed(2)},${coords[0].y.toFixed(2)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const cx = (prev.x + cur.x) / 2;
    d += ` C ${cx.toFixed(2)},${prev.y.toFixed(2)} ${cx.toFixed(2)},${cur.y.toFixed(2)} ${cur.x.toFixed(2)},${cur.y.toFixed(2)}`;
  }

  const end = coords[coords.length - 1];
  const area = `${d} L ${SPARK_W - SPARK_PAD_X},${SPARK_H} L ${SPARK_PAD_X},${SPARK_H} Z`;
  return { d, area, end };
}

/**
 * The two business metrics, shown as the sequence they are.
 *
 * Opportunity is raised and then business is closed against it — one leads to the
 * other, so they get one panel and an arrow rather than two cards side by side.
 * The header carries value per opportunity, the only honest figure derivable from
 * a count on the left and a rupee amount on the right; a "conversion rate"
 * between those two units would be a fabrication.
 */
export const FlowPanel: React.FC<FlowPanelProps> = ({
  legs,
  derived,
  delay = BEAT.flow,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <Panel delay={delay} className="mb-4">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
          <Briefcase className="h-3.5 w-3.5" />
          <h2 className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
            Business flow
          </h2>
        </div>
        {derived && (
          <p className="truncate text-[11px] text-[var(--ov-ink-4)]">
            <span className="ekam-figure font-semibold text-[var(--ov-ink-2)]">
              {derived.value}
            </span>{" "}
            {derived.label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {legs.map((leg, index) => {
          const spark = buildSpark(leg.series);
          const gradientId = `flow-fill-${leg.key}`;
          const legDelay = delay + index * 0.1;

          return (
            <div key={leg.key} className="group relative px-5 py-5 sm:px-6 sm:py-6">
              {index > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-5 top-0 h-px bg-[var(--ov-line)] md:inset-x-auto md:inset-y-6 md:left-0 md:h-auto md:w-px"
                  />
                  {/* The arrow states the direction of the relationship. */}
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--ov-panel)] text-[var(--ov-ink-5)] ring-1 ring-[color:var(--ov-line)] md:left-0 md:top-1/2 md:-translate-y-1/2"
                  >
                    <ArrowRight className="h-3 w-3 rotate-90 md:rotate-0" strokeWidth={2.5} />
                  </span>
                </>
              )}

              <div className="mb-3 flex items-center gap-2.5">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg shadow-xs ${
                  leg.key === "businessClosed" 
                    ? "bg-teal-50 text-[#0D9488] ring-1 ring-teal-200/80" 
                    : "bg-orange-50 text-[#E85A14] ring-1 ring-orange-200/80"
                }`}>
                  {leg.key === "businessClosed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Briefcase className="h-3.5 w-3.5" />
                  )}
                </span>
                <h3 className="ekam-eyebrow truncate text-[11px] font-bold uppercase tracking-wider text-[var(--ov-ink-3)]">
                  {leg.label}
                </h3>
                {/* The swatch keys the sparkline. With no sparkline it keys
                    nothing, so it does not appear. */}
                {spark && (
                  <span
                    aria-hidden="true"
                    className="ml-auto h-[3px] w-6 shrink-0 rounded-full"
                    style={{ backgroundColor: leg.hue }}
                  />
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <Figure
                    value={leg.value}
                    format={leg.format}
                    title={leg.valueTitle}
                    delay={legDelay}
                    className="block text-[34px] font-semibold leading-none text-[var(--ov-ink)] sm:text-[44px]"
                  />
                  <p className="mt-2 text-[11px] leading-5 text-[var(--ov-ink-4)]">{leg.note}</p>
                </div>

                {spark && (
                  <svg
                    className="h-11 w-[42%] max-w-[220px] shrink-0"
                    viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={leg.hue} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={leg.hue} stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <motion.path
                      d={spark.area}
                      fill={`url(#${gradientId})`}
                      initial={reduceMotion ? undefined : { opacity: 0 }}
                      animate={reduceMotion ? undefined : { opacity: 1 }}
                      transition={{ duration: 0.5, delay: legDelay + 0.5, ease: EASE_OUT }}
                    />
                    {/* non-scaling-stroke keeps the 2px line true under the non-uniform fit */}
                    <motion.path
                      d={spark.d}
                      fill="none"
                      stroke={leg.hue}
                      strokeOpacity="0.85"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      initial={reduceMotion ? undefined : { pathLength: 0 }}
                      animate={reduceMotion ? undefined : { pathLength: 1 }}
                      transition={{ duration: 0.8, delay: legDelay, ease: EASE_OUT }}
                    />
                    {/* Surface ring under the accent dot, as round-capped zero-length lines */}
                    <motion.g
                      initial={reduceMotion ? undefined : { opacity: 0 }}
                      animate={reduceMotion ? undefined : { opacity: 1 }}
                      transition={{ duration: 0.3, delay: legDelay + 0.75, ease: EASE_OUT }}
                    >
                      <line
                        x1={spark.end.x}
                        x2={spark.end.x}
                        y1={spark.end.y}
                        y2={spark.end.y}
                        stroke={SURFACE}
                        strokeWidth="9"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={spark.end.x}
                        x2={spark.end.x}
                        y1={spark.end.y}
                        y2={spark.end.y}
                        stroke={leg.hue}
                        strokeWidth="5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </motion.g>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default FlowPanel;
