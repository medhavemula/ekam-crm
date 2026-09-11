import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";

interface ChartDataPoint {
  month: string;
  value: number;
}

interface DualLineChartCardProps {
  title: string;
  amount: string;
  data1: ChartDataPoint[];
  data2: ChartDataPoint[];
  label1: string;
  label2: string;
  color1: string;
  color2: string;
  total1?: number; // Total count for data1
  total2?: number; // Total count for data2
  className?: string;
}

export const DualLineChartCard: React.FC<DualLineChartCardProps> = ({
  title,
  amount,
  data1,
  data2,
  label1,
  label2,
  color1,
  color2,
  total1,
  total2,
  className = "",
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value1: number; value2: number; month: string } | null>(null);
  
  const values1 = (Array.isArray(data1) ? data1 : []).map((d) => Number(d?.value) || 0);
  const values2 = (Array.isArray(data2) ? data2 : []).map((d) => Number(d?.value) || 0);
  const maxValue = Math.max(1, ...values1, ...values2);
  const hasSeries1 = Array.isArray(data1) && data1.length > 0;
  const hasSeries2 = Array.isArray(data2) && data2.length > 0;
  
  // Dynamic Y-axis domain using a "nice" scale
  const rawMax = Math.max(1, maxValue);
  const targetMax = rawMax * 1.1; // small headroom
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
  
  // Create smooth curve path using quadratic bezier
  const createSmoothPath = (data: ChartDataPoint[], isFill: boolean = false) => {
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

  return (
    <GradientContainer className={className}>
      <div className="rounded-2xl p-4 md:p-6">
        <h3 className="text-sm text-white mb-2">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-orange-500 mb-6">{amount}</p>

        {/* Chart Container */}
        <div className="relative" style={{ height: '170px' }}>
          <svg 
            className="w-full h-full" 
            viewBox="0 0 300 150" 
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setTooltip(null)}
          >
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

            {/* Area fill 1 */}
            {hasSeries1 && (
              <path
                d={createSmoothPath(data1, true)}
                fill={color1}
                opacity="0.2"
              />
            )}

            {/* Area fill 2 */}
            {hasSeries2 && (
              <path
                d={createSmoothPath(data2, true)}
                fill={color2}
                opacity="0.2"
              />
            )}

            {/* Smooth line 1 */}
            {hasSeries1 && (
              <path
                d={createSmoothPath(data1, false)}
                fill="none"
                stroke={color1}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Smooth line 2 */}
            {hasSeries2 && (
              <path
                d={createSmoothPath(data2, false)}
                fill="none"
                stroke={color2}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive data points */}
            {hasSeries1 && data1.map((point, index) => {
              const x = (index / (data1.length - 1 || 1)) * 300;
              const y = 150 - ((Number(point?.value) || 0) / chartMax) * 150;
              return (
                <circle
                  key={`d1-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color1}
                  stroke="#0d1117"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => {
                    setTooltip({
                      x: (x / 300) * 100, // Convert to percentage
                      y: (y / 150) * 100, // Convert to percentage
                      value1: Number(point.value),
                      value2: data2[index]?.value || 0,
                      month: point.month
                    });
                  }}
                />
              );
            })}

            {hasSeries2 && data2.map((point, index) => {
              const x = (index / (data2.length - 1 || 1)) * 300;
              const y = 150 - ((Number(point?.value) || 0) / chartMax) * 150;
              return (
                <circle
                  key={`d2-${index}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color2}
                  stroke="#0d1117"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </svg>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
            {yAxisTicks.map((tick, i) => (
              <span key={i}>{tick}</span>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div 
              className="absolute z-10 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
              style={{ 
                left: `${tooltip.x}%`, 
                top: `${tooltip.y}%`,
                transform: 'translate(-50%, -120%)',
                marginTop: '-8px'
              }}
            >
              <div className="font-semibold mb-1">{tooltip.month}</div>
              <div style={{ color: color1 }}>{label1}: {tooltip.value1}</div>
              <div style={{ color: color2 }}>{label2}: {tooltip.value2}</div>
            </div>
          )}
        </div>

        {/* X-axis labels - aligned directly under data points */}
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          {(hasSeries1 ? data1 : hasSeries2 ? data2 : []).map((point, index) => (
            <span key={index} className="text-center" style={{ minWidth: 0 }}>
              {point.month}
            </span>
          ))}
        </div>

        {/* <div className="mt-4 text-xs text-gray-500 text-center">Months</div> */}

        {/* Legend with counts */}
        <div className="flex justify-center items-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: color1 }}
            />
            <span className="text-xs text-gray-400">
              {label1} {total1 !== undefined && `(${total1})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: color2 }}
            />
            <span className="text-xs text-gray-400">
              {label2} {total2 !== undefined && `(${total2})`}
            </span>
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default DualLineChartCard;
