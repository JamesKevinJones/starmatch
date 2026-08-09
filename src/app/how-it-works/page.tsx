import type { Metadata } from 'next';
import Link from 'next/link';
import { getCalibration, getGallery } from '@/lib/gallery';
import { CalibrationChart } from '@/components/calibration-chart';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The full StarMatch pipeline: face detection, 68-point landmarks, a 128-dimensional ResNet descriptor, and Euclidean ranking calibrated on measured stranger distances.',
  alternates: { canonical: '/how-it-works' },
};

export default async function HowItWorksPage() {
  const [cal, gallery] = await Promise.all([getCalibration(), getGallery()]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl font-900 uppercase sm:text-6xl">How it works</h1>

      <p className="mt-6 text-xl leading-relaxed">
        StarMatch is a face <em>similarity</em> search. It turns a photo into a point in
        128-dimensional space and finds the nearest points among {gallery.entries.length}{' '}
        pre-computed public figures.
      </p>

      <H2>Why it runs in the browser</H2>
      <P>
        The original library this project grew out of —{' '}
        <a href="https://github.com/ageitgey/face_recognition" className="underline underline-offset-4">
          ageitgey/face_recognition
        </a>{' '}
        — is Python on top of dlib, roughly 100MB of compiled C++ and model weights. That will not
        fit in a serverless function, and putting it behind a server would mean accepting uploads
        of people&rsquo;s faces.
      </P>
      <P>
        Moving inference to the client solves both at once. The same descriptor lineage — a
        ResNet-34 producing 128 floats — runs in WebGL through TensorFlow.js, so the photo stays
        on the device and the host stays a static CDN.
      </P>

      <H2>Building the gallery</H2>
      <P>
        A SPARQL query against Wikidata returns well-known people, ranked by how many Wikipedia
        language editions cover them. Each portrait is resolved on Wikimedia Commons and{' '}
        <strong>rejected unless its licence permits redistribution</strong>. The surviving images
        are embedded offline and packed into a single {(gallery.entries.length * gallery.dim * 4 / 1024).toFixed(0)}KB
        binary of Float32 vectors.
      </P>

      <H2>Why the score is a percentile</H2>
      <P>
        A raw distance means nothing to a reader, and mapping it to a percentage with an invented
        formula would be worse — it would look precise while meaning nothing.
      </P>
      <P>
        Instead, every pair of different people in the gallery was measured:{' '}
        <strong>{cal.pairs.toLocaleString()}</strong> stranger distances. Your score is where your
        match falls in that real distribution. &ldquo;Closer than 98% of stranger pairs&rdquo; is a
        claim that can actually be checked.
      </P>

      <div className="brut mt-8 p-6">
        <p className="font-display text-xl font-800">Distance between different people</p>
        <p className="mt-2 text-sm opacity-75">
          All {cal.pairs.toLocaleString()} pairs in the gallery. Everything left of the dashed line
          is a pair of strangers that the conventional threshold would call the same person.
        </p>
        <div className="mt-6">
          <CalibrationChart calibration={cal} />
        </div>
      </div>

      <H2>What the numbers cannot do</H2>
      <P>
        The overlap visible above is the important result. A threshold tuned to catch the same
        person also catches strangers, and no amount of interface polish fixes that.{' '}
        <Link href="/ethics" className="underline underline-offset-4">
          The ethics page
        </Link>{' '}
        covers what follows from it.
      </P>

      <H2>Reproducing it</H2>
      <P>The whole index is rebuildable from scratch in three commands:</P>
      <pre className="brut-sm mt-4 overflow-x-auto p-4 font-mono text-sm">
        <code>{`npm run gallery:fetch   # Wikidata + Commons, licence-filtered
npm run gallery:build   # embed portraits, pack vectors, calibrate
npm run gallery:verify  # rank a held-out photo per subject`}</code>
      </pre>
    </article>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 font-display text-3xl font-900 uppercase">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed opacity-90">{children}</p>;
}
