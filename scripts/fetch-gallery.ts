/**
 * Step 1 of the gallery pipeline.
 *
 * Pulls a list of well-known public figures from Wikidata, then resolves each
 * one's portrait on Wikimedia Commons and keeps only the images under a licence
 * that actually permits redistribution. Anything without a free licence is
 * dropped rather than "used anyway" - the attribution page depends on this
 * filter being honest.
 *
 * Output: data/gallery-raw.json + data/portraits/*.jpg
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const UA = 'StarMatch/1.0 (https://github.com/JamesKevinJones/starmatch) educational-lookalike-demo';
const SPARQL = 'https://query.wikidata.org/sparql';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

const OUT_DIR = path.join(process.cwd(), 'data');
const PORTRAIT_DIR = path.join(OUT_DIR, 'portraits');

/** Licences we are willing to redistribute. Everything else is discarded. */
const FREE_LICENCE = /^(cc0|cc[ -]by([ -]sa)?([ -][0-9.]+)?|public domain|pd([ -]|$)|no restrictions)/i;

/**
 * Occupations that make for a recognisable, photographed public figure.
 *
 * These are queried one at a time. A single UNION over all of them makes WDQS
 * scan every human on Wikidata and reliably 504s; per-occupation queries with a
 * sitelink floor come back in ~40s each.
 */
const OCCUPATIONS: Array<{ qid: string; label: string }> = [
  { qid: 'wd:Q33999', label: 'actor' },
  { qid: 'wd:Q177220', label: 'singer' },
  { qid: 'wd:Q639669', label: 'musician' },
  { qid: 'wd:Q2526255', label: 'film director' },
  { qid: 'wd:Q82955', label: 'politician' },
  { qid: 'wd:Q937857', label: 'footballer' },
  { qid: 'wd:Q3665646', label: 'basketball player' },
  { qid: 'wd:Q11774891', label: 'screenwriter' },
];

type WikidataRow = {
  person: { value: string };
  personLabel: { value: string };
  image: { value: string };
  sitelinks: { value: string };
  occupationLabel?: { value: string };
};

export type RawEntry = {
  id: string;
  name: string;
  occupation: string;
  sitelinks: number;
  wikidataUrl: string;
  commonsFile: string;
  descriptionUrl: string;
  licence: string;
  licenceUrl: string;
  artist: string;
  localFile: string;
};

const queryFor = (qid: string) => `
SELECT ?person ?personLabel ?image ?sitelinks WHERE {
  ?person wdt:P106 ${qid} ;
          wdt:P18 ?image ;
          wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks > 110)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?sitelinks)
LIMIT 160
`;

/** Strip the HTML Commons returns in its metadata fields. */
function plain(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * WDQS routinely 502s / 429s on anything expensive, and the same query often
 * succeeds seconds later. Retry with backoff rather than failing the build.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = 2000 * 2 ** i;
      console.log(`  ${label} failed (attempt ${i + 1}/${attempts}), retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function fetchOccupation(qid: string, label: string): Promise<WikidataRow[]> {
  return withRetry(`wikidata:${label}`, async () => {
    const url = `${SPARQL}?query=${encodeURIComponent(queryFor(qid))}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
    });
    if (!res.ok) throw new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { results: { bindings: WikidataRow[] } };
    // Tag each row with the occupation we queried for, so the UI can show it.
    return json.results.bindings.map((r) => ({ ...r, occupationLabel: { value: label } }));
  });
}

/** Commons allows 50 titles per call, so batch them. */
async function fetchCommonsMeta(files: string[]) {
  const params = new URLSearchParams({
    action: 'query',
    titles: files.join('|'),
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    format: 'json',
    origin: '*',
  });
  const res = await withRetry('commons', async () => {
    const r = await fetch(`${COMMONS}?${params}`, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Commons ${r.status}`);
    return r;
  });
  const json = (await res.json()) as {
    query?: { pages?: Record<string, {
      title: string;
      imageinfo?: [{ url: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }];
    }> };
  };
  return Object.values(json.query?.pages ?? {});
}

async function main() {
  await mkdir(PORTRAIT_DIR, { recursive: true });

  console.log('Querying Wikidata (one request per occupation)...');
  const rows: WikidataRow[] = [];
  for (const { qid, label } of OCCUPATIONS) {
    const batch = await fetchOccupation(qid, label);
    console.log(`  ${label.padEnd(18)} ${batch.length} rows`);
    rows.push(...batch);
  }
  console.log(`  ${rows.length} candidates total`);

  // Wikidata can return one row per occupation; keep the highest-profile entry
  // per person and remember the first occupation we saw for them.
  const byPerson = new Map<string, WikidataRow>();
  for (const r of rows) {
    if (!byPerson.has(r.person.value)) byPerson.set(r.person.value, r);
  }
  const people = [...byPerson.values()];
  console.log(`  ${people.length} unique people`);

  // Commons title is the last path segment of the P18 URL, percent-decoded.
  const titleFor = (r: WikidataRow) =>
    'File:' + decodeURIComponent(r.image.value.split('/').pop()!).replace(/_/g, ' ');

  const metaByTitle = new Map<string, { url: string; descriptionurl: string; licence: string; licenceUrl: string; artist: string }>();

  for (let i = 0; i < people.length; i += 50) {
    const batch = people.slice(i, i + 50);
    const pages = await fetchCommonsMeta(batch.map(titleFor));
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const em = info.extmetadata ?? {};
      metaByTitle.set(p.title, {
        url: info.url,
        descriptionurl: info.descriptionurl,
        licence: plain(em.LicenseShortName?.value),
        licenceUrl: em.LicenseUrl?.value ?? '',
        artist: plain(em.Artist?.value) || 'Unknown',
      });
    }
    console.log(`  metadata ${Math.min(i + 50, people.length)}/${people.length}`);
    await new Promise((r) => setTimeout(r, 250)); // be polite to the API
  }

  const entries: RawEntry[] = [];
  let rejected = 0;

  for (const person of people) {
    const title = titleFor(person);
    const meta = metaByTitle.get(title);
    if (!meta) continue;

    if (!FREE_LICENCE.test(meta.licence)) {
      rejected++;
      continue;
    }

    const id = person.person.value.split('/').pop()!;
    const ext = (meta.url.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
    const localFile = `${id}.${ext}`;

    entries.push({
      id,
      name: person.personLabel.value,
      occupation: person.occupationLabel?.value ?? 'public figure',
      sitelinks: Number(person.sitelinks.value),
      wikidataUrl: person.person.value,
      commonsFile: title,
      descriptionUrl: meta.descriptionurl,
      licence: meta.licence,
      licenceUrl: meta.licenceUrl,
      artist: meta.artist,
      localFile,
    });
  }

  console.log(`\n  ${entries.length} free-licensed, ${rejected} rejected on licence`);

  // Download portraits at a capped width - we only need enough pixels for a
  // 150x150 face chip, and Commons originals are often 20MP.
  let downloaded = 0;
  for (const e of entries) {
    const dest = path.join(PORTRAIT_DIR, e.localFile);
    if (existsSync(dest)) {
      downloaded++;
      continue;
    }
    const thumb = `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(
      e.commonsFile.replace(/^File:/, ''),
    )}&w=640`;
    try {
      const res = await fetch(thumb, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      downloaded++;
      if (downloaded % 25 === 0) console.log(`  downloaded ${downloaded}/${entries.length}`);
    } catch {
      /* skip unreachable images; build-index will drop them */
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  await writeFile(path.join(OUT_DIR, 'gallery-raw.json'), JSON.stringify(entries, null, 2));
  console.log(`\nDone. ${downloaded} portraits in data/portraits, manifest at data/gallery-raw.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
