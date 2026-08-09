'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Dithering } from '@paper-design/shaders-react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ScrambleText } from './scramble-text';

/**
 * The hero is the only place on the site where the shader layer is allowed to
 * appear. Everything in front of it stays hard-edged and flat so the WebGL
 * gradient reads as a backdrop, not as UI.
 */
export function Hero({ galleryCount }: { galleryCount: number }) {
  const [shaderOn, setShaderOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't spin up a WebGL context for users who asked for less motion, and
    // don't pay for it during first paint either.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setShaderOn(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden border-b-[3px]">
      {/*
        The dither pattern is high-contrast enough to swallow body text at full
        strength. It is held at 40% and covered by a scrim that fades from the
        page background, so the left column stays readable while the texture
        still reads on the right.
      */}
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
        {shaderOn && (
          <Dithering
            style={{ width: '100%', height: '100%' }}
            colorBack="#00000000"
            colorFront="#4d5bff"
            shape="swirl"
            type="4x4"
            size={2.4}
            speed={0.32}
          />
        )}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          className="inline-flex items-center gap-2 brut-sm bg-acid px-3 py-1.5 text-ink"
        >
          <ShieldCheck size={15} aria-hidden />
          <span className="label">Runs 100% in your browser</span>
        </motion.div>

        <h1 className="mt-6 font-display text-[clamp(2.75rem,10vw,7rem)] font-900 uppercase">
          <ScrambleText text="Which face" />
          <br />
          <span className="bg-ink px-3 text-paper dark:bg-paper dark:text-ink">
            <ScrambleText text="is yours" delay={220} />
          </span>
          <span className="text-coral">?</span>
        </h1>

        <p className="mt-8 max-w-xl text-lg leading-relaxed sm:text-xl">
          Drop in a photo. StarMatch embeds your face into 128 dimensions and ranks it
          against <strong>{galleryCount}</strong> public figures — without your picture ever
          leaving this tab.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/match"
            className="brut brut-press inline-flex items-center gap-2 bg-coral px-7 py-4 font-display text-lg font-800 text-white"
          >
            Find my match <ArrowRight size={20} aria-hidden />
          </Link>
          <Link
            href="/how-it-works"
            className="brut brut-press inline-flex items-center gap-2 px-7 py-4 font-display text-lg font-800"
          >
            How it works
          </Link>
        </div>

        <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['128', 'dimensions'],
            [String(galleryCount), 'public figures'],
            ['0', 'photos uploaded'],
            ['183 KB', 'index size'],
          ].map(([value, label]) => (
            <div key={label} className="brut-sm px-4 py-3">
              <dt className="font-display text-2xl font-900">{value}</dt>
              <dd className="label mt-1 opacity-70">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
