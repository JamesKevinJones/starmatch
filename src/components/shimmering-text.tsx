'use client';

import { cn } from '@/lib/utils';

/**
 * Shimmering loading label.
 *
 * Bklit's chart-loading chrome imports this from the project rather than
 * shipping it, so it lives here. Implemented as a masked sweep over the text
 * so it inherits whatever colour the surrounding chart is using.
 */
export function ShimmeringText({
  text,
  className,
  duration = 1.6,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  return (
    <span
      className={cn('relative inline-block bg-clip-text text-transparent', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, currentColor 0%, currentColor 40%, rgba(255,255,255,0.85) 50%, currentColor 60%, currentColor 100%)',
        backgroundSize: '250% 100%',
        color: 'inherit',
        animation: `shimmering-text ${duration}s linear infinite`,
      }}
    >
      {text}
      <style jsx>{`
        @keyframes shimmering-text {
          from { background-position: 150% 0; }
          to { background-position: -150% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
