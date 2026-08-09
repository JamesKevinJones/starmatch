'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftRight, RotateCcw, Upload } from 'lucide-react';
import { Counter, ConfidenceRing } from './anime-bits';
import {
  descriptorDistance,
  distanceToPercentile,
  embedFace,
  fileToImage,
  loadEngine,
  NoFaceError,
  verdictFor,
  type Calibration,
  type FaceEmbedding,
} from '@/lib/matcher';

type Slot = 'a' | 'b';

/**
 * Doppelgänger mode: compare two photos the user supplies against each other.
 *
 * Deliberately does NOT touch the gallery index. Two private individuals can be
 * compared without either being enrolled, searched for, or stored anywhere -
 * both images are decoded, embedded and discarded inside this tab.
 */
export function CompareClient({ calibration }: { calibration: Calibration }) {
  const [faces, setFaces] = useState<{ a?: FaceEmbedding; b?: FaceEmbedding }>({});
  const [busy, setBusy] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(async (slot: Slot, file: File) => {
    setError(null);
    setBusy(slot);
    try {
      await loadEngine();
      const img = await fileToImage(file);
      const face = await embedFace(img);
      setFaces((prev) => ({ ...prev, [slot]: face }));
    } catch (err) {
      setError(
        err instanceof NoFaceError
          ? `No face found in photo ${slot.toUpperCase()}. Try a clearer, front-facing shot.`
          : err instanceof Error
            ? err.message
            : 'Something went wrong',
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const both = faces.a && faces.b;
  const distance = both ? descriptorDistance(faces.a!.descriptor, faces.b!.descriptor) : null;
  const percentile = distance === null ? null : distanceToPercentile(distance, calibration);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl font-900 uppercase sm:text-6xl">Doppelgänger check</h1>
      <p className="mt-4 max-w-2xl text-lg">
        Drop in two photos. StarMatch measures the distance between the two faces and shows where
        that sits among {calibration.pairs.toLocaleString()} measured pairs of different people.
      </p>
      <p className="label mt-3 opacity-60">
        Neither photo is uploaded, stored, or added to the gallery
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <FaceSlot slot="a" face={faces.a} busy={busy === 'a'} onFile={handle} />
        <div className="hidden place-content-center sm:grid">
          <ArrowLeftRight size={30} aria-hidden />
        </div>
        <FaceSlot slot="b" face={faces.b} busy={busy === 'b'} onFile={handle} />
      </div>

      {error && (
        <p role="alert" className="brut-sm mt-6 bg-coral px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}

      <AnimatePresence>
        {both && distance !== null && percentile !== null && (
          <motion.section
            key="result"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10"
          >
            <div className="brut p-7">
              <div className="flex flex-wrap items-center gap-8">
                <div className="relative shrink-0">
                  <ConfidenceRing percent={percentile} />
                  <div className="absolute inset-0 grid place-content-center">
                    <Counter value={percentile} className="font-display text-3xl font-900" suffix="%" />
                  </div>
                </div>

                <div className="min-w-56 flex-1">
                  <p className="label opacity-60">Verdict</p>
                  <p className="font-display text-4xl font-900">
                    {verdictFor(distance, calibration)}
                  </p>
                  <p className="mt-3 leading-relaxed opacity-85">
                    These two faces sit <strong>{distance.toFixed(3)}</strong> apart. That is closer
                    than <strong>{percentile.toFixed(0)}%</strong> of measured pairs of different
                    people.
                  </p>
                </div>
              </div>

              {/*
                The threshold line is the point of the whole feature: two
                different people landing under 0.6 is exactly the failure mode
                the ethics page describes, made tangible.
              */}
              <div className="mt-8 border-t-[3px] pt-6">
                <div className="flex items-center justify-between label opacity-60">
                  <span>identical 0.0</span>
                  <span>threshold {calibration.sameFaceThreshold}</span>
                  <span>{calibration.max.toFixed(1)} unrelated</span>
                </div>
                <div className="relative mt-2 h-8 border-[3px]">
                  <div
                    className="absolute inset-y-0 left-0 bg-volt/20"
                    style={{ width: `${(calibration.sameFaceThreshold / calibration.max) * 100}%` }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-y-0 w-[3px] bg-[var(--line)]"
                    style={{ left: `${(calibration.sameFaceThreshold / calibration.max) * 100}%` }}
                    aria-hidden
                  />
                  <motion.div
                    className="absolute -top-1 h-10 w-[5px] bg-coral"
                    initial={{ left: 0 }}
                    animate={{ left: `${Math.min(100, (distance / calibration.max) * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
                    aria-hidden
                  />
                </div>
                <p className="mt-4 text-sm leading-relaxed opacity-80">
                  {distance < calibration.sameFaceThreshold
                    ? `Below ${calibration.sameFaceThreshold}, a face recognition system would typically call these the same person. If they are not, that is a false match — and it is why this technology should not decide anything consequential.`
                    : `Above ${calibration.sameFaceThreshold}, a face recognition system would treat these as different people.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setFaces({});
                setError(null);
              }}
              className="brut brut-press mt-6 inline-flex items-center gap-2 px-6 py-3 font-display font-800"
            >
              <RotateCcw size={17} aria-hidden /> Start over
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaceSlot({
  slot,
  face,
  busy,
  onFile,
}: {
  slot: Slot;
  face?: FaceEmbedding;
  busy: boolean;
  onFile: (slot: Slot, file: File) => void;
}) {
  const id = `compare-file-${slot}`;

  return (
    <div className="brut p-5 text-center">
      <p className="label opacity-60">Photo {slot.toUpperCase()}</p>

      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={face.faceChip}
          alt={`Detected face in photo ${slot.toUpperCase()}`}
          className="mx-auto mt-4 h-40 w-40 border-[3px] object-cover"
        />
      ) : (
        <div className="mx-auto mt-4 grid h-40 w-40 place-content-center border-[3px] border-dashed opacity-50">
          <Upload size={30} aria-hidden />
        </div>
      )}

      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(slot, f);
        }}
      />
      <label
        htmlFor={id}
        className="brut-sm brut-press mt-5 inline-block cursor-pointer px-5 py-2.5 font-display font-800"
      >
        {busy ? 'Reading…' : face ? 'Replace' : 'Choose photo'}
      </label>

      {face && face.facesFound > 1 && (
        <p className="label mt-3 opacity-60">{face.facesFound} faces — used the largest</p>
      )}
    </div>
  );
}
