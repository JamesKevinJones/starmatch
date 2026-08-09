'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import type { GalleryEntry } from '@/lib/matcher';

/**
 * A single gallery face.
 *
 * Reveals a summary panel with a Wikipedia link on hover or keyboard focus.
 *
 * This was originally gated behind an active search, on the theory that a panel
 * on every card would be noise. In practice it just made the feature
 * undiscoverable - hovering a face did nothing and looked broken - so it now
 * applies to every card. Only the hovered card opens, so there is no noise to
 * speak of.
 */
export function GalleryCard({ entry, index }: { entry: GalleryEntry; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index, 24) * 0.012 }}
      className="brut-sm relative overflow-visible"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Keyboard and touch users get the same panel; hover alone would exclude them.
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <div className="overflow-hidden">
        <Image
          src={entry.thumb}
          alt={entry.name}
          width={256}
          height={256}
          className="aspect-square w-full border-b-[3px] object-cover"
        />
      </div>

      <figcaption className="p-2.5">
        <p className="truncate font-display text-sm font-800" title={entry.name}>
          {entry.name}
        </p>
        {/*
          The Wikidata gloss, not the licence and not `occupation`.

          `occupation` records which query found the person, not what they are
          known for - everyone with any acting credit lands in the "actor"
          bucket because that query runs first, which rendered "Donald Trump /
          actor." Licence and photographer still appear on the hover panel and
          in full on /attribution.
        */}
        {entry.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug opacity-65" title={entry.description}>
            {entry.description}
          </p>
        )}
      </figcaption>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="brut absolute left-0 right-0 top-full z-30 mt-2 p-3 text-left"
            role="tooltip"
          >
            <p className="font-display text-base font-800 leading-tight">{entry.name}</p>

            {/* No occupation fallback: a wrong claim is worse than no claim. */}
            {entry.description && (
              <p className="mt-1.5 text-sm leading-snug opacity-85">{entry.description}</p>
            )}

            <p className="label mt-2 opacity-55">
              Photo: {entry.artist} · {entry.licence}
            </p>

            {entry.wikipediaUrl ? (
              <a
                href={entry.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="brut-sm mt-3 inline-flex items-center gap-1.5 bg-volt px-2.5 py-1.5 text-xs font-600 text-white"
              >
                Wikipedia <ExternalLink size={12} aria-hidden />
              </a>
            ) : (
              <a
                href={entry.wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="brut-sm mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-600"
              >
                Wikidata <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.figure>
  );
}
