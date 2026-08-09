'use client';

import { scaleLinear } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import { motion } from 'motion/react';
import type { Match } from '@/lib/matcher';

/**
 * Ranked match distances as a horizontal bar chart.
 *
 * Built on visx with the Bklit chart tokens installed alongside it, rather than
 * Bklit's <LineChart>: that component is time-series shaped and expects a date
 * x-axis, and coercing ranked categorical data through a date scale would be a
 * lie about what the data is.
 */
export function DistanceChart({ matches, threshold }: { matches: Match[]; threshold: number }) {
  const rows = matches.slice(0, 8);
  const rowH = 30;
  const height = rows.length * rowH + 28;

  return (
    <div style={{ height }}>
      <ParentSize>
        {({ width }) => {
          if (width < 10) return null;
          const labelW = Math.min(140, width * 0.38);
          const plotW = Math.max(20, width - labelW - 44);

          const maxDist = Math.max(...rows.map((r) => r.distance), threshold) * 1.08;
          const x = scaleLinear({ domain: [0, maxDist], range: [0, plotW] });

          return (
            <svg width={width} height={height} role="img"
              aria-label="Descriptor distance for each ranked match, lower is closer">
              {/* Same-person threshold marker */}
              <line
                x1={labelW + x(threshold)}
                x2={labelW + x(threshold)}
                y1={0}
                y2={rows.length * rowH}
                stroke="var(--chart-crosshair, #4d5bff)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <text
                x={labelW + x(threshold)}
                y={rows.length * rowH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.6}
                fontFamily="var(--font-mono)"
              >
                {threshold} threshold
              </text>

              {rows.map((m, i) => {
                const y = i * rowH;
                const w = x(m.distance);
                const under = m.distance < threshold;
                return (
                  <g key={m.entry.id}>
                    <text
                      x={labelW - 8}
                      y={y + rowH / 2 + 4}
                      textAnchor="end"
                      fontSize={11}
                      fill="currentColor"
                      opacity={0.85}
                    >
                      {m.entry.name.length > 18 ? `${m.entry.name.slice(0, 17)}…` : m.entry.name}
                    </text>
                    <motion.rect
                      x={labelW}
                      y={y + 6}
                      height={rowH - 14}
                      initial={{ width: 0 }}
                      animate={{ width: w }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
                      fill={under ? 'var(--chart-1, #4d5bff)' : 'var(--chart-2, #ff5c4d)'}
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                    <text
                      x={labelW + w + 7}
                      y={y + rowH / 2 + 4}
                      fontSize={10}
                      fill="currentColor"
                      opacity={0.7}
                      fontFamily="var(--font-mono)"
                    >
                      {m.distance.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
}
