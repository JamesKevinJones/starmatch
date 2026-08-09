'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const STEPS = [
  {
    n: '01',
    title: 'Detect',
    body: 'An SSD-MobileNet pass finds every face in the frame and scores each box. If more than one person is present, the largest face wins.',
    tint: 'var(--color-volt)',
  },
  {
    n: '02',
    title: 'Landmark',
    body: '68 points are placed along the jaw, brows, eyes, nose and mouth. These are what let the crop be rotated and scaled to a canonical pose.',
    tint: 'var(--color-coral)',
  },
  {
    n: '03',
    title: 'Embed',
    body: 'A ResNet-34 maps the aligned crop to 128 numbers. Faces of the same person land close together in that space; different people land apart.',
    tint: 'var(--color-mint)',
  },
  {
    n: '04',
    title: 'Rank',
    body: 'Euclidean distance against all 366 gallery vectors, sorted ascending. 366 comparisons of 128 floats is trivial work — it finishes in milliseconds.',
    tint: 'var(--color-orchid)',
  },
];

/**
 * Scroll-scrubbed walkthrough of the pipeline (the GSAP layer).
 *
 * ScrollTrigger owns scroll-linked motion across the site; Motion and anime.js
 * are kept away from it so nothing fights over the same transform.
 */
export function PipelineScroll() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-step]');

      cards.forEach((card) => {
        gsap.from(card, {
          opacity: 0,
          y: 46,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
      });

      // The connector fills as the section scrolls past.
      gsap.fromTo(
        '[data-rail]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          transformOrigin: 'top',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 70%',
            end: 'bottom 70%',
            scrub: 0.6,
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="border-b-[3px] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="label opacity-60">The pipeline</p>
        <h2 className="mt-3 font-display text-4xl font-900 uppercase sm:text-6xl">
          Four steps, zero servers
        </h2>

        <div className="relative mt-14 pl-10 sm:pl-16">
          <div
            data-rail
            aria-hidden
            className="absolute left-[15px] top-2 h-full w-[3px] bg-[var(--line)] sm:left-[27px]"
          />
          <ol className="space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} data-step className="relative">
                <span
                  aria-hidden
                  className="absolute -left-10 top-5 grid h-8 w-8 place-content-center border-[3px] font-mono text-xs font-600 sm:-left-16 sm:h-10 sm:w-10 sm:text-sm"
                  style={{ background: s.tint, color: '#fff' }}
                >
                  {s.n}
                </span>
                <div className="brut p-6">
                  <h3 className="font-display text-2xl font-800">{s.title}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed opacity-85">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
