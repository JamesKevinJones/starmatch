'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { GalleryEntry } from '@/lib/matcher';

/** Searchable, filterable view of the whole index. */
export function GalleryGrid({ entries }: { entries: GalleryEntry[] }) {
  const [query, setQuery] = useState('');
  const [occupation, setOccupation] = useState('all');

  const occupations = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.occupation))).sort()],
    [entries],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (occupation === 'all' || e.occupation === occupation) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [entries, query, occupation]);

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-3">
        <div className="brut-sm flex flex-1 items-center gap-2 px-4 py-2.5 min-w-64">
          <Search size={17} aria-hidden className="opacity-60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            aria-label="Search the gallery by name"
            className="w-full bg-transparent outline-none placeholder:opacity-50"
          />
        </div>
        <select
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          aria-label="Filter by occupation"
          className="brut-sm bg-[var(--panel)] px-4 py-2.5 capitalize"
        >
          {occupations.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <p className="label mt-4 opacity-60" role="status">
        Showing {shown.length} of {entries.length}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((e, i) => (
          <motion.figure
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(i, 24) * 0.012 }}
            className="brut-sm overflow-hidden"
          >
            <Image
              src={e.thumb}
              alt={e.name}
              width={256}
              height={256}
              className="aspect-square w-full border-b-[3px] object-cover"
            />
            <figcaption className="p-2.5">
              <p className="truncate font-display text-sm font-800" title={e.name}>{e.name}</p>
              <p className="label mt-1 truncate opacity-55" title={e.artist}>
                {e.licence}
              </p>
            </figcaption>
          </motion.figure>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="brut mt-8 p-8 text-center font-display text-xl font-800">
          Nobody in the gallery matches that.
        </p>
      )}
    </>
  );
}
