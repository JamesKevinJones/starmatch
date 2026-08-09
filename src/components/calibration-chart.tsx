'use client';

import { useMemo } from 'react';
import { scaleLinear } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { motion } from 'motion/react';
import type { Calibration } from '@/lib/matcher';

/**
 * Density of stranger distances, reconstructed from the stored quantiles.
 *
 * The quantile table is the compressed form of the full distribution; taking
 * the derivative of the quantile function recovers the shape of the density
 * without shipping all 66k raw pairs to the browser.
 */
export function CalibrationChart({ calibration }: { calibration: Calibration }) {
  const points = useMemo(() => {
    const q = calibration.quantiles;
    const out: { x: number; y: number }[] = [];
    for (let i = 1; i < q.length; i++) {
      const width = q[i] - q[i - 1];
      // Each quantile step covers 1% of the mass; density = mass / width.
      out.push({ x: (q[i] + q[i - 1]) / 2, y: width > 0 ? 1 / width : 0 });
    }
    return out;
  }, [calibration]);

  return (
    <div className="h-56 w-full">
      <ParentSize>
        {({ width, height }) => {
          if (width < 10) return null;
          const m = { top: 8, right: 8, bottom: 28, left: 8 };
          const w = width - m.left - m.right;
          const h = height - m.top - m.bottom;

          const x = scaleLinear({
            domain: [calibration.min * 0.95, calibration.max * 1.02],
            range: [0, w],
          });
          const y = scaleLinear({
            domain: [0, Math.max(...points.map((p) => p.y))],
            range: [h, 0],
          });

          const thresholdX = x(calibration.sameFaceThreshold);

          return (
            <svg width={width} height={height} role="img"
              aria-label="Distribution of descriptor distances between different people">
              <g transform={`translate(${m.left},${m.top})`}>
                {/* Region where strangers are closer than the same-person threshold */}
                <rect
                  x={0}
                  y={0}
                  width={Math.max(0, thresholdX)}
                  height={h}
                  fill="var(--chart-2, #ff5c4d)"
                  opacity={0.12}
                />

                <AreaClosed
                  data={points}
                  x={(d) => x(d.x)}
                  y={(d) => y(d.y)}
                  yScale={y}
                  curve={curveMonotoneX}
                  fill="var(--chart-1, #4d5bff)"
                  opacity={0.22}
                />
                <LinePath
                  data={points}
                  x={(d) => x(d.x)}
                  y={(d) => y(d.y)}
                  curve={curveMonotoneX}
                  stroke="var(--chart-1, #4d5bff)"
                  strokeWidth={3}
                />

                <motion.line
                  x1={thresholdX}
                  x2={thresholdX}
                  y1={0}
                  y2={h}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                />
                <text
                  x={thresholdX + 6}
                  y={14}
                  fontSize={11}
                  fill="currentColor"
                  fontFamily="var(--font-mono)"
                >
                  {calibration.sameFaceThreshold} &ldquo;same person&rdquo;
                </text>

                {/* x-axis ticks */}
                {[calibration.min, calibration.p05, calibration.p50, calibration.max].map((t) => (
                  <text
                    key={t}
                    x={x(t)}
                    y={h + 18}
                    fontSize={10}
                    textAnchor="middle"
                    fill="currentColor"
                    opacity={0.6}
                    fontFamily="var(--font-mono)"
                  >
                    {t.toFixed(2)}
                  </text>
                ))}
              </g>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
}
