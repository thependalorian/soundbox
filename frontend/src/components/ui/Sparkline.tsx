import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Draw a soft area under the line. */
  filled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Gestural trend line — shape only, no axes, no gridlines, no tooltip.
 *
 * The point is peripheral: an operator scanning a list should register
 * "rising" or "collapsed" without stopping to read. Anything that invites
 * precise reading (ticks, labels, hover values) belongs in a real chart on
 * a detail page, not here.
 */
const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 96,
  height = 28,
  filled = true,
  className = '',
  label,
}) => {
  if (values.length < 2) {
    return <span className={`inline-block ${className}`} style={{ width, height }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  // 1px inset top and bottom so the stroke is never clipped at the extremes.
  const pt = (v: number, i: number) => [i * stepX, height - 1 - ((v - min) / span) * (height - 2)];
  const points = values.map(pt);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={label ?? 'Trend'}
      preserveAspectRatio="none"
    >
      {filled && <path d={area} fill="#E6136C" opacity={0.08} />}
      <path d={line} fill="none" stroke="#E6136C" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export default Sparkline;
