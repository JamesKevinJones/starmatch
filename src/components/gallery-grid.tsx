'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { GalleryCard } from './gallery-card';
import type { GalleryEntry } from '@/lib/matcher';

/** Searchable, filterable view of the whole index. */
export function GalleryGrid({ entries }: { entries: GalleryEntry[] }) {
  const [query, setQuery] = useState('');
  const [occupation, setOccupation] = useState('all');

  const occupations = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.occupation))).sort()],
    [entries],
  );

  /**
   * The hover detail panel is reserved for search results. Enabling it for the
   * full grid would pop a panel every time the pointer crossed the page.
   */
  const searching = query.trim().length > 0;

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
        {searching && ' · hover a result for details'}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((e, i) => (
          <GalleryCard key={e.id} entry={e} index={i} showDetail={searching} />
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
