import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Table2, LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Panel from "./Panel";
import Figure from "./Figure";
import {
  AXIS_LINE,
  BEAT,
  EASE_OUT,
  GRID_LINE,
  TICK_INK,
  SURFACE,
  compactFor,
  fullFor,
  type MetricFormat,
} from "./chartTheme";

export interface TrendPoint {
  month: string;
  value: number;
}

export interface TrendChartProps {
  title: string;
  /** Raw total for the visible range; the chart formats it. */
  total: number;
  data: TrendPoint[];
  hue: string;
  format: MetricFormat;
  /** Dims the plot while a refetch is in flight, holding the previous render. */
  isRefreshing?: boolean;
  /** Entrance delay, in seconds, on the shared load timeline. */
  delay?: number;
  className?: string;
}

const PAD = { top: 12, right: 16, bottom: 26, left: 48 };

/**
 * Picks a clean axis maximum, trying 4/5/6 intervals and keeping whichever wastes
 * the least headroom. A fixed 5 intervals forces e.g. a peak of 22 onto a 0–50
 * axis, which throws away half the plot height.
 *
 * Counts get an integer ladder — a "2.5 chapters" gridline is nonsense — while
 * currency may use half-steps so ₹12.5L can be labelled exactly.
 */
function niceScale(maxValue: number, integerOnly: boolean, buffer = 0.2) {
  const ladder = integerOnly ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const target = Math.max(1, maxValue) * (1 + buffer);

  let best: { step: number; max: number; ticks: number } | null = null;
  for (const ticks of [4, 5, 6]) {
    const rough = target / ticks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    let step = 10 * magnitude;
    for (const n of ladder) {
      if (n * magnitude >= rough) {
        step = n * magnitude;
        break;
      }
    }
    if (integerOnly) step = Math.max(1, Math.round(step));
    const max = step * ticks;
    if (!best || max < best.max) best = { step, max, ticks };
  }
  return best as { step: number; max: number; ticks: number };
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  total,
  data,
  hue,
  format,
  isRefreshing = false,
  delay = BEAT.charts,
  className = "",
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const reduceMotion = useReducedMotion();

  const compact = compactFor(format);
  const full = fullFor(format);

  const points = useMemo(
    () => (Array.isArray(data) ? data.filter(Boolean) : []),
    [data],
  );
  const hasSeries = points.length > 0;

  // Calculate percentage change between last two recorded periods
  const pctChange = useMemo(() => {
    if (points.length < 2) return null;
    const last = Number(points[points.length - 1]?.value) || 0;
    const prev = Number(points[points.length - 2]?.value) || 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return ((last - prev) / prev) * 100;
  }, [points]);

  // Measure the container so the SVG can use real pixel coordinates. Stretching a
  // fixed viewBox with preserveAspectRatio="none" would distort stroke widths and
  // squash the round markers into ellipses.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [showTable]);

  const height = width > 0 && width < 420 ? 190 : 224;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = Math.max(0, height - PAD.top - PAD.bottom);

  const values = points.map((p) => Number(p?.value) || 0);
  const {
    step,
    max: chartMax,
    ticks: tickCount,
  } = niceScale(values.length ? Math.max(...values) : 0, format === "number");
  const yTicks = useMemo(
    () => Array.from({ length: tickCount + 1 }, (_, i) => step * (tickCount - i)),
    [step, tickCount],
  );

  const xAt = useCallback(
    (i: number) =>
      PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW),
    [plotW, points.length],
  );
  const yAt = useCallback(
    (v: number) => PAD.top + plotH - ((Number(v) || 0) / chartMax) * plotH,
    [plotH, chartMax],
  );

  const coords = useMemo(
    () => points.map((p, i) => ({ x: xAt(i), y: yAt(Number(p.value) || 0) })),
    [points, xAt, yAt],
  );

  // Midpoint cubics: smooth without the overshoot a naive Catmull-Rom introduces
  // between neighbouring points.
  const linePath = useMemo(() => {
    if (coords.length === 0) return "";
    if (coords.length === 1) {
      const p = coords[0];
      return `M ${p.x - 0.01},${p.y} L ${p.x + 0.01},${p.y}`;
    }
    let d = `M ${coords[0].x.toFixed(2)},${coords[0].y.toFixed(2)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cx = (prev.x + cur.x) / 2;
      d += ` C ${cx.toFixed(2)},${prev.y.toFixed(2)} ${cx.toFixed(2)},${cur.y.toFixed(2)} ${cur.x.toFixed(2)},${cur.y.toFixed(2)}`;
    }
    return d;
  }, [coords]);

  const areaPath = useMemo(() => {
    if (!linePath || coords.length === 0) return "";
    const baseY = PAD.top + plotH;
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${linePath} L ${last.x.toFixed(2)},${baseY} L ${first.x.toFixed(2)},${baseY} Z`;
  }, [linePath, coords, plotH]);

  // Redraw the line whenever the shape of the data changes, so a filter change
  // reads as the series being re-plotted rather than swapped underneath.
  const drawKey = useMemo(
    () => `${points.length}-${values.join(",")}`,
    [points.length, values],
  );

  // Thin the x-axis labels so they never collide on a narrow card.
  const labelStride = useMemo(() => {
    if (!points.length || plotW <= 0) return 1;
    const maxLabels = Math.max(2, Math.floor(plotW / 52));
    return Math.ceil(points.length / maxLabels);
  }, [points.length, plotW]);

  const nearestIndex = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || points.length === 0) return null;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left - PAD.left) / (plotW || 1);
      const i = Math.round(ratio * (points.length - 1));
      return Math.min(points.length - 1, Math.max(0, i));
    },
    [plotW, points.length],
  );

  const onPointerMove = (e: React.PointerEvent) => setActiveIndex(nearestIndex(e.clientX));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!points.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const start = prev ?? (e.key === "ArrowRight" ? -1 : points.length);
        const next = e.key === "ArrowRight" ? start + 1 : start - 1;
        return Math.min(points.length - 1, Math.max(0, next));
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(points.length - 1);
    } else if (e.key === "Escape") {
      setActiveIndex(null);
    }
  };

  const active = activeIndex != null ? points[activeIndex] : null;
  const activeCoord = activeIndex != null ? coords[activeIndex] : null;
  const lastCoord = coords.length ? coords[coords.length - 1] : null;
  const lastPoint = points.length ? points[points.length - 1] : null;

  const slug = title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const gradientId = `trend-fill-${slug}`;

  // Keep the tooltip inside the card on both edges.
  const tooltipLeft = activeCoord
    ? Math.min(Math.max(activeCoord.x, 74), Math.max(74, width - 74))
    : 0;

  return (
    <Panel delay={delay} className={className}>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
                  hue === "var(--ov-s1)" || hue === "#E85A14" || hue === "#B04513"
                    ? "ekam-heading-glass text-[#E85A14]"
                    : "bg-[rgba(24,72,96,0.06)] border border-[rgba(24,72,96,0.14)] text-[var(--ov-ink-3)]"
                }`}
              >
                {/* The line key carries series identity so the text can stay in ink. */}
                <span
                  aria-hidden="true"
                  className="h-[3px] w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: hue }}
                />
                <h3 className="ekam-eyebrow truncate text-[10px] font-bold tracking-wider uppercase">
                  {title}
                </h3>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2.5 flex-wrap">
              <Figure
                value={total}
                format={compact}
                title={full(total)}
                delay={delay}
                className="block text-[26px] font-semibold leading-none text-[var(--ov-ink)] sm:text-[30px]"
              />
              {pctChange !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    pctChange > 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                      : pctChange < 0
                      ? "bg-rose-50 text-rose-700 border border-rose-200/70"
                      : "bg-slate-50 text-slate-600 border border-slate-200/70"
                  }`}
                  title={`Change vs previous period: ${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`}
                >
                  {pctChange > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : pctChange < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>
                    {pctChange > 0 ? "+" : ""}
                    {pctChange.toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="shrink-0 rounded-lg p-2 text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            title={showTable ? "Show chart" : "Show values as a table"}
          >
            {showTable ? (
              <LineChartIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Table2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {showTable ? "Show chart" : "Show values as a table"}
            </span>
          </button>
        </div>

        {showTable ? (
          <div className="max-h-[224px] overflow-y-auto rounded-xl ring-1 ring-[color:var(--ov-line-faint)]">
            <table className="w-full text-left text-sm">
              <thead className="ekam-eyebrow sticky top-0 bg-[var(--ov-raised)] text-[10px] font-semibold text-[var(--ov-ink-3)]">
                <tr>
                  <th scope="col" className="px-3 py-2.5">
                    Period
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ov-line-faint)]">
                {hasSeries ? (
                  points.map((p, i) => (
                    <tr key={`${p.month}-${i}`} className="transition-colors hover:bg-[var(--ov-fill-subtle)]">
                      <td className="px-3 py-2 text-[13px] text-[var(--ov-ink-2)]">{p.month}</td>
                      <td className="ekam-figure px-3 py-2 text-right text-[13px] font-medium text-[var(--ov-ink)]">
                        {full(Number(p.value) || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-[13px] text-[var(--ov-ink-4)]">
                      Nothing recorded in this range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            ref={wrapRef}
            role="group"
            tabIndex={hasSeries ? 0 : -1}
            aria-label={`${title}. ${full(total)} across ${points.length} periods. Use the arrow keys to read each period, or switch to the table view.`}
            className={`relative rounded-lg outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
              isRefreshing ? "opacity-50" : "opacity-100"
            }`}
            style={{ height }}
            onPointerMove={hasSeries ? onPointerMove : undefined}
            onPointerLeave={() => setActiveIndex(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActiveIndex(null)}
          >
            {width > 0 && (
              <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="block"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={hue} stopOpacity="0.20" />
                    <stop offset="100%" stopColor={hue} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* An axis with no series behind it is scaffolding for data that
                    is not there, and on a currency axis it rounds a 0–1.2 range
                    into four gridlines all labelled "₹1". With nothing to plot,
                    only the baseline stays. */}
                {hasSeries ? (
                  <>
                    {/* Horizontal grid — solid hairlines, one step off the surface */}
                    {yTicks.map((_tick, i) => {
                      const y = PAD.top + (i / (yTicks.length - 1)) * plotH;
                      return (
                        <line
                          key={`grid-${i}`}
                          x1={PAD.left}
                          x2={PAD.left + plotW}
                          y1={y}
                          y2={y}
                          stroke={i === yTicks.length - 1 ? AXIS_LINE : GRID_LINE}
                          strokeWidth="1"
                          shapeRendering="crispEdges"
                        />
                      );
                    })}

                    {yTicks.map((tick, i) => {
                      const y = PAD.top + (i / (yTicks.length - 1)) * plotH;
                      return (
                        <text
                          key={`ytick-${i}`}
                          x={PAD.left - 10}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          style={{
                            fill: TICK_INK,
                            fontSize: 10,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {compact(tick)}
                        </text>
                      );
                    })}
                  </>
                ) : (
                  <line
                    x1={PAD.left}
                    x2={PAD.left + plotW}
                    y1={PAD.top + plotH}
                    y2={PAD.top + plotH}
                    stroke={AXIS_LINE}
                    strokeWidth="1"
                    shapeRendering="crispEdges"
                  />
                )}

                {hasSeries && (
                  <g key={drawKey}>
                    <motion.path
                      d={areaPath}
                      fill={`url(#${gradientId})`}
                      initial={reduceMotion ? undefined : { opacity: 0 }}
                      animate={reduceMotion ? undefined : { opacity: 1 }}
                      transition={{ duration: 0.55, delay: delay + 0.55, ease: EASE_OUT }}
                    />
                    <motion.path
                      d={linePath}
                      fill="none"
                      stroke={hue}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduceMotion ? undefined : { pathLength: 0 }}
                      animate={reduceMotion ? undefined : { pathLength: 1 }}
                      transition={{ duration: 0.95, delay, ease: EASE_OUT }}
                    />
                  </g>
                )}

                {/* Crosshair snaps to the nearest period */}
                {activeCoord && (
                  <line
                    x1={activeCoord.x}
                    x2={activeCoord.x}
                    y1={PAD.top}
                    y2={PAD.top + plotH}
                    stroke="var(--ov-crosshair)"
                    strokeWidth="1"
                    shapeRendering="crispEdges"
                  />
                )}

                {/* End marker — 9px, with a 2px surface ring */}
                {lastCoord && (
                  <motion.g
                    key={`end-${drawKey}`}
                    initial={reduceMotion ? undefined : { opacity: 0, scale: 0.4 }}
                    animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: delay + 0.85, ease: EASE_OUT }}
                    style={{ transformOrigin: `${lastCoord.x}px ${lastCoord.y}px` }}
                  >
                    <circle cx={lastCoord.x} cy={lastCoord.y} r="6.5" fill={SURFACE} />
                    <circle cx={lastCoord.x} cy={lastCoord.y} r="4.5" fill={hue} />
                  </motion.g>
                )}

                {activeCoord && (
                  <>
                    <circle cx={activeCoord.x} cy={activeCoord.y} r="6.5" fill={SURFACE} />
                    <circle cx={activeCoord.x} cy={activeCoord.y} r="4.5" fill={hue} />
                  </>
                )}

                {/* X-axis labels, thinned to fit the available width */}
                {points.map((p, i) => {
                  const isLast = i === points.length - 1;
                  if (!isLast && i % labelStride !== 0) return null;
                  // Skip a strided label that would collide with the always-shown last one.
                  if (!isLast && points.length - 1 - i < labelStride * 0.6) return null;
                  return (
                    <text
                      key={`xtick-${i}`}
                      x={xAt(i)}
                      y={height - 8}
                      textAnchor={isLast ? "end" : i === 0 ? "start" : "middle"}
                      style={{ fill: TICK_INK, fontSize: 10 }}
                    >
                      {p.month}
                    </text>
                  );
                })}
              </svg>
            )}

            {/* Endpoint direct label — the single value labelled inline */}
            {lastCoord && lastPoint && !active && (
              <motion.div
                className="ekam-figure pointer-events-none absolute rounded-md bg-[var(--ov-raised)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line-strong)]"
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.95, ease: EASE_OUT }}
                style={{
                  left: Math.max(0, Math.min(lastCoord.x - 8, width)),
                  top: Math.max(0, lastCoord.y - 26),
                  transform: "translateX(-100%)",
                }}
              >
                {compact(Number(lastPoint.value) || 0)}
              </motion.div>
            )}

            {/* Tooltip — value leads, period follows */}
            {active && activeCoord && (
              <div
                className="pointer-events-none absolute z-10 min-w-[7rem] -translate-x-1/2 rounded-xl bg-[var(--ov-deep)] px-3 py-2 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line-faint)]"
                style={{ left: tooltipLeft, top: Math.max(0, activeCoord.y - 62) }}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-[3px] w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: hue }}
                  />
                  <span className="ekam-figure text-[14px] font-semibold text-[var(--ov-deep-ink)]">
                    {full(Number(active.value) || 0)}
                  </span>
                </div>
                <div className="mt-0.5 pl-5 text-[11px] text-[var(--ov-deep-ink-2)]">{active.month}</div>
              </div>
            )}

            {!hasSeries && width > 0 && (
              <div className="absolute inset-0 grid place-items-center px-4 text-center">
                <div>
                  <p className="text-[13px] text-[var(--ov-ink-2)]">Nothing recorded in this range</p>
                  <p className="mt-1 text-[11px] text-[var(--ov-ink-5)]">
                    Widen the dates or clear a filter to see more
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live region so keyboard users hear the period they land on */}
        <p className="sr-only" aria-live="polite">
          {active ? `${active.month}: ${full(Number(active.value) || 0)}` : ""}
        </p>
      </div>
    </Panel>
  );
};

export default TrendChart;
