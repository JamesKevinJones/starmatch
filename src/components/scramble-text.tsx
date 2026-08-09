'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$?/\\';

/**
 * Decrypt-on-mount text effect (React Bits family).
 *
 * The real text is rendered in the DOM from the first frame and the scramble is
 * layered on top via state, so screen readers and crawlers always see the final
 * string - a scrambled h1 would otherwise be an accessibility and SEO own-goal.
 */
export function ScrambleText({
  text,
  delay = 0,
  speed = 34,
}: {
  text: string;
  delay?: number;
  speed?: number;
}) {
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let interval = 0;

    const start = window.setTimeout(() => {
      frame.current = 0;
      interval = window.setInterval(() => {
        frame.current += 1;
        // Reveal roughly one character every two ticks, scramble the rest.
        const revealed = Math.floor(frame.current / 2);
        setDisplay(
          text
            .split('')
            .map((ch, i) => {
              if (ch === ' ') return ' ';
              if (i < revealed) return ch;
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
            .join(''),
        );
        if (revealed >= text.length) {
          window.clearInterval(interval);
          setDisplay(text);
        }
      }, speed);
    }, delay);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [text, delay, speed]);

  return (
    <span className="inline-block">
      <span aria-hidden>{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
