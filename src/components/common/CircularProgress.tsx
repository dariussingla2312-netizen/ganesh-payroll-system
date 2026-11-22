import React from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string; // e.g. '#00b884' or '#10b981'
  bgColor?: string;
  trackColor?: string; // alias for bgColor
  centerText?: string;
  label?: string; // alias for centerText
  centerSubtext?: string;
  sublabel?: string; // alias for centerSubtext
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 72,
  strokeWidth = 6,
  color = '#00b884',
  bgColor,
  trackColor,
  centerText,
  label,
  centerSubtext,
  sublabel,
}) => {
  const actualBgColor = trackColor || bgColor || '#e6f7f0';
  const actualLabel = label !== undefined ? label : centerText;
  const actualSublabel = sublabel !== undefined ? sublabel : centerSubtext;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={actualBgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="transition-all duration-500"
        />
        {/* Progress bar */}
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
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {actualLabel !== undefined ? (
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{actualLabel}</span>
        ) : (
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{Math.round(percentage)}%</span>
        )}
        {actualSublabel && (
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{actualSublabel}</span>
        )}
      </div>
    </div>
  );
};
