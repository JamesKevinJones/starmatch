'use client';

import { useRef, useState } from 'react';

/**
 * Pointer-tracking spotlight (Aceternity family), adapted to brutalism.
 *
 * The usual version uses a soft radial glow, which fights hard borders. Here the
 * highlight is a flat tinted wash clipped inside the card, so it reads as a
 * printed spot colour rather than a drop shadow.
 */
export function SpotlightCard({
  children,
  className = '',
  tint = 'var(--color-volt)',
}: {
  children: React.ReactNode;
  className?: string;
  tint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      className={`brut relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: active ? 0.16 : 0,
          background: `radial-gradient(220px circle at ${pos.x}% ${pos.y}%, ${tint}, transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
