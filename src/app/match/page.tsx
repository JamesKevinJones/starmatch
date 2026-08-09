import type { Metadata } from 'next';
import { MatchClient } from '@/components/match-client';
import { getCalibration } from '@/lib/gallery';

export const metadata: Metadata = {
  title: 'Match your face',
  description:
    'Upload a photo or use your webcam to find your closest look-alike among 366 public figures. Runs entirely in your browser.',
  alternates: { canonical: '/match' },
};

export default async function MatchPage() {
  const calibration = await getCalibration();
  return <MatchClient calibration={calibration} />;
}
