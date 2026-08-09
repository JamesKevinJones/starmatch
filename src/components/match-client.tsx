'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, RotateCcw, Users } from 'lucide-react';
import { Dropzone } from './dropzone';
import { SpotlightCard } from './spotlight-card';
import { Counter, ConfidenceRing, EmbeddingBars } from './anime-bits';
import { DistanceChart } from './distance-chart';
import { WebcamCapture } from './webcam-capture';
import {
  fileToImage,
  matchFace,
  NoFaceError,
  preload,
  verdictFor,
  type Calibration,
  type MatchResult,
} from '@/lib/matcher';

type Phase =
  | { kind: 'idle' }
  | { kind: 'webcam' }
  | { kind: 'working'; stage: string }
  | { kind: 'done'; result: MatchResult }
  | { kind: 'error'; message: string };

export function MatchClient({ calibration }: { calibration: Calibration }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const run = useCallback(
    async (image: HTMLImageElement | HTMLCanvasElement) => {
      try {
        setPhase({ kind: 'working', stage: 'Loading engine' });
        await preload((stage) => setPhase({ kind: 'working', stage }));

        setPhase({ kind: 'working', stage: 'Detecting face' });
        const result = await matchFace(image);

        setPhase({ kind: 'done', result });
      } catch (err) {
        setPhase({
          kind: 'error',
          message:
            err instanceof NoFaceError
              ? "No face found in that image. Try a clearer, front-facing photo with good lighting."
              : err instanceof Error
                ? err.message
                : 'Something went wrong',
        });
      }
    },
    [],
  );

  const onFile = useCallback(
    async (file: File) => {
      try {
        const img = await fileToImage(file);
        await run(img);
      } catch {
        setPhase({ kind: 'error', message: 'Could not read that image' });
      }
    },
    [run],
  );

  const reset = () => setPhase({ kind: 'idle' });

  /*
   * AnimatePresence with mode="wait" must receive exactly one child. Passing
   * five conditional expressions (four of which evaluate to `false`) leaves the
   * exit animation unresolved and the component stuck on its first phase, so
   * the current view is selected here and rendered as a single keyed node.
   */
  const view = (() => {
    switch (phase.kind) {
      case 'idle':
        return (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="font-display text-5xl font-900 uppercase sm:text-7xl">Find your match</h1>
            <p className="mt-4 max-w-xl text-lg">
              One photo, one face. Everything below happens on your device.
            </p>
            <div className="mt-10">
              <Dropzone onFile={onFile} onWebcam={() => setPhase({ kind: 'webcam' })} />
            </div>
          </motion.div>
        );

      case 'webcam':
        return (
          <motion.div key="cam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WebcamCapture
              onCapture={(canvas) => run(canvas)}
              onCancel={reset}
            />
          </motion.div>
        );

      case 'working':
        return (
          <motion.div
            key="working"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="brut px-8 py-20 text-center"
          >
            <div className="mx-auto h-3 w-56 overflow-hidden border-[3px]">
              <motion.div
                className="h-full bg-volt"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              />
            </div>
            <p className="mt-6 font-display text-2xl font-800">{phase.stage}…</p>
            <p className="label mt-3 opacity-60">First run downloads ~12MB of model weights</p>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="brut bg-coral px-8 py-12 text-white">
              <AlertTriangle size={40} aria-hidden />
              <p className="mt-4 font-display text-3xl font-900">Could not match that</p>
              <p className="mt-3 max-w-lg">{phase.message}</p>
            </div>
            <button onClick={reset} className="brut brut-press mt-6 inline-flex items-center gap-2 px-6 py-3 font-display font-800">
              <RotateCcw size={17} aria-hidden /> Try another photo
            </button>
          </motion.div>
        );

      case 'done':
        return (
          <Results
            key="done"
            result={phase.result}
            calibration={calibration}
            onReset={reset}
          />
        );
    }
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <AnimatePresence mode="wait" initial={false}>
        {view}
      </AnimatePresence>
      {/* Test hook: lets the phase machine be asserted without scripting a file picker. */}
      <div data-probe-phase={phase.kind} className="sr-only">
        {phase.kind}
      </div>
    </div>
  );
}

function Results({
  result,
  calibration,
  onReset,
}: {
  result: MatchResult;
  calibration: Calibration;
  onReset: () => void;
}) {
  const top = result.matches[0];
  const verdict = verdictFor(top.distance, calibration);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl font-900 uppercase sm:text-6xl">Your closest match</h1>
        <button onClick={onReset} className="brut-sm brut-press inline-flex items-center gap-2 px-5 py-2.5 font-display font-800">
          <RotateCcw size={16} aria-hidden /> New photo
        </button>
      </div>

      {result.facesFound > 1 && (
        <p className="brut-sm mt-6 inline-flex items-center gap-2 bg-acid px-4 py-2 text-ink text-sm">
          <Users size={16} aria-hidden />
          Found {result.facesFound} faces — matched the largest one.
        </p>
      )}

      {/* Headline result */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-4">
            {/*
              The aligned face chip, not the raw upload: fileToImage revokes its
              object URL once decoded, and comparing crop-to-crop is a fairer
              side-by-side than a full photo next to a tight portrait.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.faceChip} alt="The face detected in your photo" className="h-24 w-24 border-[3px] object-cover" />
            <span className="font-display text-4xl font-900">↔</span>
            <Image
              src={top.entry.thumb}
              alt={top.entry.name}
              width={96}
              height={96}
              className="h-24 w-24 border-[3px] object-cover"
            />
          </div>

          <p className="label mt-6 opacity-60">You most resemble</p>
          <p className="font-display text-4xl font-900 leading-tight">{top.entry.name}</p>
          <p className="mt-1 text-sm capitalize opacity-70">{top.entry.occupation}</p>

          <p className="brut-sm mt-5 inline-block bg-volt px-3 py-1.5 text-sm font-600 text-white">
            {verdict}
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-6" tint="var(--color-mint)">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <ConfidenceRing percent={top.percentile} />
              <div className="absolute inset-0 grid place-content-center text-center">
                <Counter value={top.percentile} className="font-display text-3xl font-900" suffix="%" />
              </div>
            </div>
            <div>
              <p className="font-display text-xl font-800">What this number means</p>
              <p className="mt-2 text-sm leading-relaxed opacity-80">
                Your face is closer to {top.entry.name} than{' '}
                <strong>{top.percentile.toFixed(0)}%</strong> of the{' '}
                {calibration.pairs.toLocaleString()} random pairs of different people in this
                gallery.
              </p>
              <p className="label mt-3 opacity-60">
                Distance {top.distance.toFixed(3)} · not a probability
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Ranked runners-up */}
      <h2 className="mt-14 font-display text-3xl font-900 uppercase">Runners-up</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {result.matches.slice(1, 9).map((m, i) => (
          <motion.div
            key={m.entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.28 }}
          >
            <SpotlightCard className="p-4">
              <Image
                src={m.entry.thumb}
                alt={m.entry.name}
                width={220}
                height={220}
                className="aspect-square w-full border-[3px] object-cover"
              />
              <p className="mt-3 font-display text-lg font-800 leading-tight">{m.entry.name}</p>
              <p className="label mt-1 opacity-60">
                {m.percentile.toFixed(0)}% · d={m.distance.toFixed(2)}
              </p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* The evidence */}
      <h2 className="mt-14 font-display text-3xl font-900 uppercase">The evidence</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="brut p-6">
          <p className="font-display text-xl font-800">Your face as 128 numbers</p>
          <p className="mt-2 text-sm opacity-75">
            The descriptor the match was computed from. Blue is positive, coral negative.
          </p>
          <div className="mt-5">
            <EmbeddingBars descriptor={result.descriptor} />
          </div>
        </div>

        <div className="brut p-6">
          <p className="font-display text-xl font-800">Distance to each match</p>
          <p className="mt-2 text-sm opacity-75">
            Lower is closer. The dashed line is the {calibration.sameFaceThreshold} threshold
            conventionally treated as &ldquo;same person&rdquo;.
          </p>
          <div className="mt-5">
            <DistanceChart matches={result.matches} threshold={calibration.sameFaceThreshold} />
          </div>
        </div>
      </div>

      <p className="brut-sm mt-10 bg-[var(--panel)] px-5 py-4 text-sm">
        <strong>Remember:</strong> this ranks visual similarity against {' '}
        a fixed gallery. It cannot tell you who someone is, and a high score means
        &ldquo;closest available face&rdquo;, not &ldquo;related to&rdquo;.{' '}
        <a href="/ethics" className="underline underline-offset-4">Read the limitations</a>.
      </p>

      <p className="label mt-4 opacity-50">
        Matched in {(result.elapsedMs / 1000).toFixed(2)}s · detector confidence{' '}
        {(result.confidence * 100).toFixed(0)}%
      </p>
    </motion.div>
  );
}
