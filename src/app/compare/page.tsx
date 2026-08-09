import type { Metadata } from 'next';
import { CompareClient } from '@/components/compare-client';
import { getCalibration } from '@/lib/gallery';

export const metadata: Metadata = {
  title: 'Doppelgänger check',
  description:
    'Compare two photos and see how close the two faces are in descriptor space, measured against real stranger-pair distances. Both photos stay in your browser.',
  alternates: { canonical: '/compare' },
};

export default async function ComparePage() {
  const calibration = await getCalibration();
  return <CompareClient calibration={calibration} />;
}
