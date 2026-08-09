import type { Metadata } from 'next';
import { getGallery } from '@/lib/gallery';

export const metadata: Metadata = {
  title: 'Image attribution',
  description:
    'Photographer, licence and source for every portrait in the StarMatch gallery, as required by their CC licences.',
  alternates: { canonical: '/attribution' },
};

export default async function AttributionPage() {
  const gallery = await getGallery();
  const entries = [...gallery.entries].sort((a, b) => a.name.localeCompare(b.name));

  const byLicence = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.licence] = (acc[e.licence] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl font-900 uppercase sm:text-6xl">Attribution</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed">
        Every portrait below came from Wikimedia Commons under a licence permitting reuse.
        Attribution is a condition of most of those licences, so it is published in full rather
        than tucked into a footer.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {Object.entries(byLicence)
          .sort((a, b) => b[1] - a[1])
          .map(([licence, count]) => (
            <span key={licence} className="brut-sm px-3 py-1.5 text-sm">
              {licence} <span className="opacity-60">× {count}</span>
            </span>
          ))}
      </div>

      <div className="brut mt-10 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-[3px] text-left">
              <th scope="col" className="p-3 label">Subject</th>
              <th scope="col" className="p-3 label">Photographer / author</th>
              <th scope="col" className="p-3 label">Licence</th>
              <th scope="col" className="p-3 label">Source</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--line)]/25">
                <th scope="row" className="p-3 text-left font-600">{e.name}</th>
                <td className="p-3 opacity-80">{e.artist}</td>
                <td className="p-3">
                  {e.licenceUrl ? (
                    <a href={e.licenceUrl} className="underline underline-offset-4" rel="license">
                      {e.licence}
                    </a>
                  ) : (
                    e.licence
                  )}
                </td>
                <td className="p-3">
                  <a href={e.sourceUrl} className="underline underline-offset-4">Commons</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
