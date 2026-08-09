'use client';

import { useEffect, useState } from 'react';
import { matchFace } from '@/lib/matcher';

/**
 * Dev-only harness that runs the real matcher against a same-origin image and
 * prints the ranking as JSON.
 *
 * Exists so the browser inference path can be asserted end-to-end without
 * driving a file picker, which cannot be scripted reliably. Excluded from the
 * sitemap and noindexed; it renders nothing in production builds.
 */
export default function DebugMatch() {
  const [out, setOut] = useState('running…');

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      setOut('disabled in production');
      return;
    }
    const url = new URLSearchParams(window.location.search).get('src') ?? '/test/probe-keanu-2014.jpg';

    (async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error(`could not load ${url}`));
          img.src = url;
        });

        const result = await matchFace(img, 5);
        setOut(
          JSON.stringify(
            {
              ok: true,
              src: url,
              facesFound: result.facesFound,
              confidence: +result.confidence.toFixed(3),
              elapsedMs: Math.round(result.elapsedMs),
              descriptorLength: result.descriptor.length,
              top: result.matches.map((m) => ({
                name: m.entry.name,
                distance: +m.distance.toFixed(3),
                percentile: +m.percentile.toFixed(1),
              })),
            },
            null,
            2,
          ),
        );
      } catch (e) {
        setOut(JSON.stringify({ ok: false, error: (e as Error).message }, null, 2));
      }
    })();
  }, []);

  return (
    <pre id="debug-output" className="p-6 font-mono text-xs whitespace-pre-wrap">
      {out}
    </pre>
  );
}
