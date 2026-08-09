import Link from 'next/link';
import { Hero } from '@/components/hero';
import { FaceMarquee } from '@/components/face-marquee';
import { PipelineScroll } from '@/components/pipeline-scroll';
import { SpotlightCard } from '@/components/spotlight-card';
import { getCalibration, getGallery } from '@/lib/gallery';
import { ArrowRight, Cpu, EyeOff, Scale, ScrollText } from 'lucide-react';

export default async function Home() {
  const [gallery, calibration] = await Promise.all([getGallery(), getCalibration()]);

  // A spread of faces for the two marquee rows.
  const rowA = gallery.entries.slice(0, 24);
  const rowB = gallery.entries.slice(24, 48);

  return (
    <>
      <Hero galleryCount={gallery.entries.length} />

      <section className="py-4">
        <FaceMarquee entries={rowA} />
        <FaceMarquee entries={rowB} reverse />
      </section>

      {/* Bento feature grid (Aceternity pattern) */}
      <section className="border-y-[3px] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label opacity-60">Why it is built this way</p>
          <h2 className="mt-3 font-display text-4xl font-900 uppercase sm:text-6xl">
            Nothing leaves<br />your browser
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <SpotlightCard className="p-7 md:col-span-2">
              <EyeOff size={30} aria-hidden />
              <h3 className="mt-4 font-display text-3xl font-800">No upload, no storage</h3>
              <p className="mt-3 max-w-xl leading-relaxed opacity-85">
                Detection and embedding both run in WebGL on your own device. There is no
                upload endpoint to secure, no bucket to leak, and no retention policy to
                trust — because the photo is never transmitted in the first place.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-7" tint="var(--color-coral)">
              <Cpu size={30} aria-hidden />
              <h3 className="mt-4 font-display text-2xl font-800">183 KB index</h3>
              <p className="mt-3 leading-relaxed opacity-85">
                {gallery.entries.length} faces stored as {gallery.dim}-float vectors. Small
                enough to ship as a static asset.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-7" tint="var(--color-mint)">
              <Scale size={30} aria-hidden />
              <h3 className="mt-4 font-display text-2xl font-800">Honest scoring</h3>
              <p className="mt-3 leading-relaxed opacity-85">
                Scores come from{' '}
                {calibration.pairs.toLocaleString()} measured stranger pairs, not an
                invented percentage.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-7 md:col-span-2" tint="var(--color-orchid)">
              <ScrollText size={30} aria-hidden />
              <h3 className="mt-4 font-display text-3xl font-800">Every portrait is licensed</h3>
              <p className="mt-3 max-w-xl leading-relaxed opacity-85">
                The gallery is built from Wikimedia Commons and filtered to CC and
                public-domain images only. Photographer and licence are recorded for each
                one and listed on the{' '}
                <Link href="/attribution" className="underline underline-offset-4">
                  attribution page
                </Link>.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      <PipelineScroll />

      {/* The honest bit, given real estate rather than buried in a footer. */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="brut overflow-hidden">
            <div className="hazard h-4" aria-hidden />
            <div className="p-8">
              <h2 className="font-display text-3xl font-900 uppercase sm:text-4xl">
                This is a similarity toy, not an ID system
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed">
                In this gallery the two <em>most similar different people</em> sit{' '}
                {calibration.min.toFixed(2)} apart — below the {calibration.sameFaceThreshold}{' '}
                distance conventionally read as &ldquo;same person&rdquo;. That single number is
                the whole argument against using face matching to decide anything that matters.
              </p>
              <Link
                href="/ethics"
                className="brut-sm brut-press mt-7 inline-flex items-center gap-2 bg-ink px-6 py-3 font-display font-800 text-paper"
              >
                Read the limitations <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
