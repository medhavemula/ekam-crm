import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";

interface ChartDataPoint {
  month: string;
  value: number;
}

interface ImprovedChartCardProps {
  title: string;
  amount: string;
  data: ChartDataPoint[];
  color: string;
  gradientFrom?: string;
  gradientTo?: string;
  yAxisFormatter?: (value: number) => string;
  buffer?: number; // Y-axis buffer multiplier (default 0.2 for 20%)
  className?: string;
}

export const ImprovedChartCard: React.FC<ImprovedChartCardProps> = ({
  title,
  amount,
  data,
  color,
  gradientFrom,
  gradientTo,
  yAxisFormatter,
  buffer = 0.2,
  className = "",
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; month: string } | null>(null);
  
  const values = (Array.isArray(data) ? data : []).map((d) => Number(d?.value) || 0);
  const maxValue = Math.max(1, ...values);
  const hasSeries = Array.isArray(data) && data.length > 0;
  
  // Dynamic Y-axis domain using a "nice" scale (same logic as ChartCard)
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
  
  // Format Y-axis labels
  const formatYAxis = (value: number) => {
    if (yAxisFormatter) return yAxisFormatter(value);
    return value.toString();
  };
  
  // Create smooth curve path using quadratic bezier
  const createSmoothPath = (isFill: boolean = false) => {
    if (!data || data.length === 0) return "";
    
    const points = data.map((point, index) => ({
      x: (index / (data.length - 1 || 1)) * 300,
      y: 150 - ((Number(point?.value) || 0) / chartMax) * 150
    }));
    
    if (points.length === 1) {
      const p = points[0];
      return isFill ? `M 0,150 L ${p.x},${p.y} L 300,150 Z` : `M ${p.x},${p.y}`;
    }
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      
      path += ` Q ${current.x},${current.y} ${midX},${(current.y + next.y) / 2}`;
      path += ` Q ${next.x},${next.y} ${next.x},${next.y}`;
    }
    
    if (isFill) {
      path += ` L 300,150 L 0,150 Z`;
    }
    
    return path;
  };

  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`;

  return (
    <GradientContainer className={className}>
      <div className="rounded-2xl p-4 md:p-6">
        <h3 className="text-sm text-white mb-2">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-orange-500 mb-6">{amount}</p>

        {/* Chart Container */}
        <div className="relative" style={{ height: '250px' }}>
          <svg 
            className="w-full h-full" 
            viewBox="0 0 300 150" 
            preserveAspectRatio="xMidYMid meet"
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

            {/* Subtle grid lines */}
            {yAxisTicks.map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={(i / (yAxisTicks.length - 1)) * 150}
                x2="300"
                y2={(i / (yAxisTicks.length - 1)) * 150}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))}

            {/* Area fill with gradient or solid color */}
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
            {hasSeries && data.map((point, index) => {
              const x = (index / (data.length - 1 || 1)) * 300;
              const y = 150 - ((Number(point?.value) || 0) / chartMax) * 150;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color}
                  stroke="#0d1117"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: rect.left + (x / 300) * rect.width,
                        y: rect.top + (y / 150) * rect.height,
                        value: Number(point.value),
                        month: point.month
                      });
                    }
                  }}
                />
              );
            })}
          </svg>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
            {yAxisTicks.map((tick, i) => (
              <span key={i}>{formatYAxis(tick)}</span>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div 
              className="absolute z-10 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white shadow-lg"
              style={{ 
                left: `${tooltip.x}px`, 
                top: `${tooltip.y - 50}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-semibold mb-1">{tooltip.month}</div>
              <div style={{ color }}>{formatYAxis(tooltip.value)}</div>
            </div>
          )}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          {(hasSeries ? data : []).map((point, index) => (
            <span key={index}>{point.month}</span>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">Months</div>
      </div>
    </GradientContainer>
  );
};

export default ImprovedChartCard;
