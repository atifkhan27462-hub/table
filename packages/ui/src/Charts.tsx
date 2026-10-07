import React from 'react';

// Responsive SVG Area Spline Chart
export interface AreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  fillColor?: string;
  className?: string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  labels,
  height = 140,
  color = '#2563EB',
  className = '',
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 15;
  const chartHeight = height - padding * 2;
  const width = 400; // viewBox width

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * chartHeight;
    return { x, y };
  });

  // Build SVG path
  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className={`w-full flex flex-col ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            className="fill-white dark:fill-slate-900 transition-all hover:r-5 cursor-pointer"
            stroke={color}
            strokeWidth="2"
          />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
          {labels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// Bar Chart for Hourly Kitchen Volume
export interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  highlightIndex?: number;
  className?: string;
}

export const BarChartMini: React.FC<BarChartProps> = ({
  data,
  height = 100,
  highlightIndex,
  className = '',
}) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`w-full flex items-end gap-2 pt-4 ${className}`} style={{ height }}>
      {data.map((item, idx) => {
        const percentage = (item.value / max) * 100;
        const isHighlight = highlightIndex === idx;

        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
            <span className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 text-slate-600 dark:text-slate-300 transition-opacity">
              {item.value}
            </span>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-sm h-full flex items-end overflow-hidden">
              <div
                style={{ height: `${percentage}%` }}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isHighlight
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-400'
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// Circular Progress / Donut Metric (e.g. Table Occupancy: 84%)
export interface DonutMetricProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  className?: string;
}

export const DonutMetric: React.FC<DonutMetricProps> = ({
  value,
  size = 110,
  strokeWidth = 9,
  label,
  sublabel,
  color = '#2563EB',
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {label ?? `${value}%`}
        </span>
        {sublabel && (
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
