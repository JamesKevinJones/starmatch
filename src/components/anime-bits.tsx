'use client';

import { useEffect, useRef } from 'react';
import { animate, stagger, svg } from 'animejs';

/**
 * The anime.js layer: numeric readouts and SVG drawing.
 *
 * Motion handles component state and layout, GSAP handles scroll. anime.js is
 * scoped to the things it is genuinely best at here - counting a number up and
 * stroking an SVG path - so the three libraries never animate the same property.
 */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from 0 to `value` on mount. */
export function Counter({
  value,
  decimals = 0,
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.textContent = value.toFixed(decimals) + suffix;
      return;
    }
    const state = { n: 0 };
    const anim = animate(state, {
      n: value,
      duration: 900,
      ease: 'out(3)',
      onUpdate: () => {
        el.textContent = state.n.toFixed(decimals) + suffix;
      },
    });
    return () => {
      anim.pause();
    };
  }, [value, decimals, suffix]);

  return <span ref={ref} className={className}>{value.toFixed(decimals) + suffix}</span>;
}

/**
 * Ring gauge that draws itself. `percent` is the percentile from the calibration
 * table, not a confidence - the label alongside it must say so.
 */
export function ConfidenceRing({ percent, size = 132 }: { percent: number; size?: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
    if (reduced()) {
      el.style.strokeDashoffset = String(target);
      return;
    }
    const anim = animate(el, {
      strokeDashoffset: [circumference, target],
      duration: 1100,
      ease: 'out(4)',
    });
    return () => {
      anim.pause();
    };
  }, [percent, circumference]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`Closer than ${percent.toFixed(0)} percent of random face pairs`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth="10" opacity="0.15" />
      <circle
        ref={ref}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-volt)"
        strokeWidth="10"
        strokeLinecap="butt"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/**
 * Renders a 128-d descriptor as a bar field.
 *
 * This is the actual vector the match was computed from, not decoration - it
 * makes the abstract "embedding" step concrete for anyone reading the page.
 */
export function EmbeddingBars({ descriptor }: { descriptor: Float32Array }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const anim = animate(el.querySelectorAll('[data-bar]'), {
      scaleY: [0, 1],
      duration: 620,
      delay: stagger(6),
      ease: 'out(3)',
    });
    return () => {
      anim.pause();
    };
  }, [descriptor]);

  // Descriptor values sit roughly in [-0.25, 0.25]; normalise for display.
  const max = Math.max(...Array.from(descriptor, Math.abs)) || 1;

  return (
    <div
      ref={ref}
      className="flex h-24 items-center gap-[2px]"
      role="img"
      aria-label="Visualisation of the 128-dimensional face descriptor"
    >
      {Array.from(descriptor).map((v, i) => (
        <div
          key={i}
          data-bar
          className="flex-1 origin-center"
          style={{
            height: `${Math.max(4, (Math.abs(v) / max) * 100)}%`,
            background: v >= 0 ? 'var(--color-volt)' : 'var(--color-coral)',
          }}
        />
      ))}
    </div>
  );
}

/** Draws an SVG path on scroll-in; used for the pipeline connector lines. */
export function DrawPath({ d, className }: { d: string; className?: string }) {
  const ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const anim = animate(svg.createDrawable(el), {
      draw: ['0 0', '0 1'],
      duration: 1400,
      ease: 'inOut(2)',
    });
    return () => {
      anim.pause();
    };
  }, [d]);

  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path ref={ref} d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
