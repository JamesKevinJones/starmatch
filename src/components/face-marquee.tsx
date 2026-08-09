'use client';

import Image from 'next/image';
import type { GalleryEntry } from '@/lib/matcher';

/**
 * Infinite marquee of gallery faces (Magic UI pattern).
 *
 * The track is duplicated once and translated by exactly -50%, which is what
 * makes the loop seamless. Pausing on hover matters here: the strip doubles as
 * a way to actually browse who is in the gallery.
 */
export function FaceMarquee({ entries, reverse = false }: { entries: GalleryEntry[]; reverse?: boolean }) {
  const track = [...entries, ...entries];

  return (
    <div className="group relative overflow-hidden border-y-[3px] py-4">
      <div
        className="flex w-max gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{
          animation: `marquee-${reverse ? 'rev' : 'fwd'} 48s linear infinite`,
        }}
      >
        {track.map((e, i) => (
          <figure key={`${e.id}-${i}`} className="w-28 shrink-0 sm:w-32" title={e.name}>
            <Image
              src={e.thumb}
              alt={e.name}
              width={128}
              height={128}
              className="aspect-square w-full border-[3px] object-cover"
            />
            <figcaption className="label mt-1.5 truncate opacity-60">{e.name}</figcaption>
          </figure>
        ))}
      </div>

      {/* Hard-edged masks rather than a soft fade, to stay in the brutalist register. */}
      <style jsx>{`
        @keyframes marquee-fwd {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes marquee-rev {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
