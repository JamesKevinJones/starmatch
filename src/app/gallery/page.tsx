import type { Metadata } from 'next';
import { getGallery } from '@/lib/gallery';
import { GalleryGrid } from '@/components/gallery-grid';

export const metadata: Metadata = {
  title: 'The gallery',
  description:
    'Every public figure StarMatch can match against, with the photographer and licence for each portrait.',
  alternates: { canonical: '/gallery' },
};

export default async function GalleryPage() {
  const gallery = await getGallery();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <p className="label opacity-60">{gallery.entries.length} faces</p>
      <h1 className="mt-3 font-display text-5xl font-900 uppercase sm:text-6xl">The gallery</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed">
        These are the only faces StarMatch can return. Each was pulled from Wikimedia Commons
        under a licence that permits reuse, cropped to the detected face, and reduced to a
        128-number descriptor.
      </p>

      <GalleryGrid entries={gallery.entries} />
    </div>
  );
}
