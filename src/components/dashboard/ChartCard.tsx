import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";

interface ChartDataPoint {
  month: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  amount: string;
  data: ChartDataPoint[];
  color: string; // hex or css color
  gradientFrom?: string;
  gradientTo?: string;
  yAxisFormatter?: (value: number) => string;
  buffer?: number; // default 0.2
  className?: string;
  showMonthsLabel?: boolean; // Show "Months" label below x-axis
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  amount,
  data,
  color,
  gradientFrom,
  gradientTo,
  yAxisFormatter,
  buffer = 0.2,
  className = "",
  showMonthsLabel = false,
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; month: string } | null>(null);

  const values = (Array.isArray(data) ? data : []).map((d) => Number(d?.value) || 0);
  // Extract numeric value from amount string (handles plain numbers and currency like "₹ 3,39,001")
  const amountNumeric = Number(String(amount).replace(/[^0-9.-]/g, "")) || 0;
  const maxValue = Math.max(1, ...values, amountNumeric);
  const hasSeries = Array.isArray(data) && data.length > 0;
  // Plot area height used for SVG coordinate calculations and Y-axis tick spacing
  const chartAreaPx = 150;

  // Dynamic Y-axis domain using a "nice" scale (0,1,2.. or 0,2,4.. etc.)
  const rawMax = Math.max(1, maxValue);
  const targetMax = rawMax * (1 + buffer);
  const roughStep = targetMax / 5 || 1;
  const safeStep = Math.max(1, roughStep);
  const magnitude = Math.pow(10, Math.floor(Math.log10(safeStep)));
  const residual = safeStep / magnitude;
  let niceStep: number;
  if (residual <= 1) niceStep = 1 * magnitude;
  else if (residual <= 2) niceStep = 2 * magnitude;
  else if (residual <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const chartMax = niceStep * 5;
  const yAxisTicks = Array.from({ length: 6 }, (_, i) => niceStep * (5 - i));

  const formatYAxis = (value: number) => (yAxisFormatter ? yAxisFormatter(value) : value.toString());

  const createSmoothPath = (isFill: boolean = false) => {
    if (!data || data.length === 0) return "";
    const points = data.map((point, index) => ({
      x: (index / (data.length - 1 || 1)) * 300,
      y: chartAreaPx - ((Number(point?.value) || 0) / chartMax) * chartAreaPx,
    }));
    if (points.length === 1) {
      const p = points[0];
      // Draw a tiny horizontal segment so the line is visible for single-point series
      return isFill
        ? `M 0,${chartAreaPx} L ${p.x},${p.y} L 300,${chartAreaPx} Z`
        : `M ${p.x},${p.y} L ${p.x + 0.1},${p.y}`;
    }
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      path += ` Q ${current.x},${current.y} ${midX},${(current.y + next.y) / 2}`;
      path += ` Q ${next.x},${next.y} ${next.x},${next.y}`;
    }
    if (isFill) path += ` L 300,${chartAreaPx} L 0,${chartAreaPx} Z`;
    return path;
  };

  const gradientId = `gradient-${title.replace(/\s+/g, "-")}`;

  return (
    <GradientContainer className={className}>
      <div className="rounded-2xl p-4 md:p-6">
        <h3 className="mb-2 text-sm text-[var(--ov-ink-2)]">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-orange-500 mb-6">{amount}</p>

        {/* Chart Container */}
        <div className="relative flex" style={{ height: chartAreaPx + 50 }}>
          {/* Y-axis labels - use same height as SVG plot area for perfect alignment */}
          <div className="flex flex-col justify-between text-xs text-[var(--ov-ink-4)] pr-3" style={{ minWidth: "40px", height: chartAreaPx }}>
            {yAxisTicks.map((tick, i) => (
              <span key={i} className="text-right">
                {formatYAxis(tick)}
              </span>
            ))}
          </div>

          {/* Chart SVG */}
          <div className="flex-1 relative">
            <svg
              className="w-full"
              viewBox={`0 0 300 ${chartAreaPx}`}
              preserveAspectRatio="none"
              style={{ height: chartAreaPx }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Define gradient if provided */}
              {gradientFrom && gradientTo && (
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={gradientFrom} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={gradientTo} stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              )}

              {/* Horizontal grid lines */}
              {yAxisTicks.map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={(i / (yAxisTicks.length - 1)) * chartAreaPx}
                  x2="300"
                  y2={(i / (yAxisTicks.length - 1)) * chartAreaPx}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              ))}

              {/* Vertical grid lines */}
              {hasSeries &&
                data.map((_, index) => {
                  const x = (index / (data.length - 1 || 1)) * 300;
                  return (
                    <line
                      key={`v-${index}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={String(chartAreaPx)}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  );
                })}

              {/* Area fill */}
              {hasSeries && (
                <path
                  d={createSmoothPath(true)}
                  fill={gradientFrom && gradientTo ? `url(#${gradientId})` : color}
                  opacity={gradientFrom && gradientTo ? "1" : "0.2"}
                />
              )}

              {/* Smooth line */}
              {hasSeries && (
                <path
                  d={createSmoothPath(false)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive data points */}
              {hasSeries &&
                data.map((point, index) => {
                  const x = (index / (data.length - 1 || 1)) * 300;
                  const y = chartAreaPx - ((Number(point?.value) || 0) / chartMax) * chartAreaPx;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={color}
                      stroke="#0d1117"
                      strokeWidth="2"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => {
                        setTooltip({
                          x: (x / 300) * 100, // Convert to percentage
                          y: (y / chartAreaPx) * 100, // Convert to percentage
                          value: Number(point.value),
                          month: point.month,
                        });
                      }}
                    />
                  );
                })}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg bg-[var(--ov-deep)] px-3 py-2 text-xs text-[var(--ov-deep-ink)] shadow-lg ring-1 ring-[color:var(--ov-deep-line)]"
                style={{
                  left: `${tooltip.x}%`,
                  top: `${tooltip.y}%`,
                  transform: "translate(-50%, -120%)",
                  marginTop: "-8px",
                }}
              >
                <div className="font-semibold mb-1">{tooltip.month}</div>
                <div style={{ color }}>{formatYAxis(tooltip.value)}</div>
              </div>
            )}

            {/* X-axis labels - aligned directly under data points */}
            <div className="mt-2 flex justify-between text-xs text-[var(--ov-ink-4)]">
              {(hasSeries ? data : []).map((point, index) => (
                <span key={index} className="text-center" style={{ minWidth: 0 }}>
                  {point.month}
                </span>
              ))}
            </div>

            {/* Months label - only shown when showMonthsLabel is true */}
            {showMonthsLabel && <div className="mt-1 text-center text-xs text-[var(--ov-ink-5)]">Months</div>}
          </div>
        </div>

        {/* <div className="mt-4 text-xs text-gray-500 text-center">Months</div> */}
      </div>
    </GradientContainer>
  );
};

export default ChartCard;
