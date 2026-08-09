import type { Metadata } from 'next';
import { getCalibration, getGallery } from '@/lib/gallery';

export const metadata: Metadata = {
  title: 'Ethics & limitations',
  description:
    'What StarMatch measures, what it cannot do, how its gallery is biased, and why face matching should not be used to decide anything consequential.',
  alternates: { canonical: '/ethics' },
};

export default async function EthicsPage() {
  const [cal, gallery] = await Promise.all([getCalibration(), getGallery()]);

  // Compute the real composition of the gallery rather than asserting a vibe.
  const byOccupation = gallery.entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.occupation] = (acc[e.occupation] ?? 0) + 1;
    return acc;
  }, {});
  const occupations = Object.entries(byOccupation).sort((a, b) => b[1] - a[1]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="label opacity-60">Read this part</p>
      <h1 className="mt-3 font-display text-5xl font-900 uppercase sm:text-6xl">
        Ethics &amp; limitations
      </h1>

      <p className="mt-8 text-xl leading-relaxed">
        StarMatch ranks visual similarity between your face and a fixed gallery. That is all it
        does. It is not an identification system, and the numbers it shows should not be read as
        confidence that you <em>are</em> anyone.
      </p>

      <Section title="The threshold does not hold">
        <p>
          Face descriptors are conventionally treated as matching the same person below a distance
          of {cal.sameFaceThreshold}. Across the{' '}
          <strong>{cal.pairs.toLocaleString()}</strong> pairs of genuinely different people in this
          gallery, the closest pair sits just <strong>{cal.min.toFixed(3)}</strong> apart — well
          inside that threshold.
        </p>
        <p>
          In other words: a rule that is supposed to mean &ldquo;this is the same person&rdquo;
          fires on strangers within a set of only {gallery.entries.length} faces. Scale that to a
          national database and false matches stop being a curiosity and start being someone&rsquo;s
          afternoon in a police station.
        </p>
        <p>
          For scale: two photographs of Keanu Reeves taken five years apart measure{' '}
          <strong>0.371</strong> apart in this same descriptor space — you can reproduce that on
          the <a href="/compare" className="underline underline-offset-4">doppelgänger page</a>.
          The closest pair of <em>different</em> people in the gallery is{' '}
          <strong>{cal.min.toFixed(3)}</strong>. Those numbers are effectively the same. Two
          strangers can sit as close together as two photos of one person.
        </p>
        <Stat rows={[
          ['Same person, 5 years apart', '0.371'],
          ['Closest stranger pair', cal.min.toFixed(3)],
          ['5th percentile', cal.p05.toFixed(3)],
          ['Median stranger pair', cal.p50.toFixed(3)],
          ['Furthest pair', cal.max.toFixed(3)],
        ]} />
      </Section>

      <Section title="The gallery is not representative">
        <p>
          Faces were drawn from Wikidata, ranked by how many Wikipedia language editions cover the
          person, and filtered to those with a freely-licensed portrait on Wikimedia Commons. Every
          one of those steps inherits Wikipedia&rsquo;s well-documented skew toward men, toward the
          West, and toward the recent past.
        </p>
        <p>
          The breakdown below is by the occupation each person was <em>queried</em> under, not
          what they are best known for: anyone with a single acting credit lands in
          &ldquo;actor&rdquo; because that query runs first. It is a fair picture of how the
          gallery was assembled, not a biography. No correction is applied for gender, ethnicity
          or era — the bias is stated rather than quietly smoothed over.
        </p>
        <Stat rows={occupations.map(([k, v]) => [k, String(v)])} />
      </Section>

      <Section title="Accuracy is not uniform across faces">
        <p>
          Published evaluations of face recognition — most prominently NIST&rsquo;s FRVT work —
          repeatedly find error rates vary by skin tone, sex and age, often by more than an order
          of magnitude. The descriptor used here is a 2017-era ResNet trained on a
          web-scraped dataset and inherits those disparities.
        </p>
        <p>
          If StarMatch performs worse on your face, that is a property of the model, not of your
          face.
        </p>
      </Section>

      <Section title="What is deliberately not built">
        <ul className="list-disc space-y-2 pl-5">
          <li>No image is uploaded, so none can be retained or subpoenaed.</li>
          <li>No enrolment: you cannot add a private individual to the gallery.</li>
          <li>No search by name to reverse-look-up a face.</li>
          <li>No analytics on results, and no record that a match happened.</li>
        </ul>
        <p>
          The gallery contains only public figures who already have a freely-licensed portrait
          published about them. That boundary is the point.
        </p>
      </Section>

      <Section title="If you want it gone">
        <p>
          Everyone in the gallery is a public figure with a Commons portrait, but inclusion is
          still automated and unasked-for. Open an issue on the repository naming the entry and it
          will be removed from the index on the next build — no justification required.
        </p>
      </Section>

      <p className="brut-sm mt-12 bg-[var(--panel)] p-5 text-sm leading-relaxed">
        Built as a portfolio project. It is a demonstration of how face embeddings behave and of
        what a privacy-preserving architecture looks like — not a product, and not a tool for
        identifying anybody.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-3xl font-900 uppercase">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed [&_p]:opacity-90">{children}</div>
    </section>
  );
}

function Stat({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="brut-sm mt-5 divide-y-[3px] divide-[var(--line)]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-sm capitalize opacity-80">{k}</dt>
          <dd className="font-mono text-sm font-600">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
