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
import { mkdir, writeFile } from 'node:fs/promises';
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
  { qid: 'wd:Q2252262', label: 'rapper' },
  { qid: 'wd:Q2526255', label: 'film director' },
  { qid: 'wd:Q82955', label: 'politician' },
  { qid: 'wd:Q937857', label: 'footballer' },
  { qid: 'wd:Q3665646', label: 'basketball player' },
  { qid: 'wd:Q10871364', label: 'boxer' },
  { qid: 'wd:Q10833314', label: 'tennis player' },
  { qid: 'wd:Q245068', label: 'comedian' },
  { qid: 'wd:Q4610556', label: 'model' },
  { qid: 'wd:Q947873', label: 'television presenter' },
  { qid: 'wd:Q17125263', label: 'youtuber' },
  { qid: 'wd:Q13590141', label: 'streamer' },
  { qid: 'wd:Q11774891', label: 'screenwriter' },
];

/**
 * Sitelink floor and per-occupation cap.
 *
 * The first pass used `> 110` with a cap of 160, which quietly excluded most
 * living pop-culture figures: sitelink counts favour historical and political
 * subjects, so the top 160 "actors" filled up with Shakespeare and Reagan
 * before reaching anyone contemporary. Zendaya sits at 100 sitelinks and was
 * cut by the floor; Dwayne Johnson at 112 cleared the floor but fell outside
 * the cap. Both now qualify.
 */
const SITELINK_FLOOR = 45;
const PER_OCCUPATION = 320;

/**
 * Parallel portrait downloads. Deliberately modest: Wikimedia runs on donated
 * infrastructure and thumb.php renders each thumbnail on demand.
 */
const DOWNLOAD_CONCURRENCY = 5;

type WikidataRow = {
  person: { value: string };
  image: { value: string };
  sitelinks: { value: string };
  /** Filled in locally from the occupation we queried for. */
  occupationLabel?: { value: string };
};

/** Name, gloss and article URL, all from the entity API. */
type Enriched = { label: string; description: string; wikipediaUrl: string };

export type RawEntry = {
  id: string;
  name: string;
  /** Short Wikidata gloss, e.g. "American actress and singer". May be empty. */
  description: string;
  /** English Wikipedia URL, if the person has an article. May be empty. */
  wikipediaUrl: string;
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

/**
 * Kept deliberately minimal.
 *
 * Adding an OPTIONAL join for the English Wikipedia article, on top of the
 * lower sitelink floor, pushed this query past the WDQS timeout and it 504'd on
 * every retry. Descriptions and Wikipedia URLs are cheap to fetch in bulk from
 * the entity API instead (50 entities per call), so SPARQL only does what only
 * SPARQL can: find people by occupation who have a portrait.
 *
 * The label service is not requested here either - it is the thing that
 * silently returns bare QIDs. `enrichEntities` is the single source of names.
 */
const queryFor = (qid: string) => `
SELECT ?person ?image ?sitelinks WHERE {
  ?person wdt:P106 ${qid} ;
          wdt:P18 ?image ;
          wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks > ${SITELINK_FLOOR})
}
ORDER BY DESC(?sitelinks)
LIMIT ${PER_OCCUPATION}
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

/**
 * Resolve entity IDs to English name, short description and Wikipedia URL.
 *
 * This replaces `SERVICE wikibase:label`, which silently returns the bare QID
 * when it cannot resolve a label - that is how "Q873" ended up rendered as a
 * person's name in the gallery, and why Meryl Streep could not be found by
 * searching for her. The entity API returns the label, the gloss and the enwiki
 * sitelink in one batched call, so all three come from the same authoritative
 * source and a missing name is detectable rather than disguised as a QID.
 */
async function enrichEntities(ids: string[]) {
  const out = new Map<string, Enriched>();

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'labels|descriptions|sitelinks/urls',
      // `mul` is not optional. Wikidata is migrating personal names - which are
      // identical across languages - into a single multilingual `mul` label and
      // deleting the per-language `en` one. Meryl Streep (Q873) and Taylor
      // Swift (Q26876) already have no `en` label at all. Asking for `en` alone
      // is what made `SERVICE wikibase:label` return a bare "Q873" as a name,
      // and later made those people vanish from the gallery entirely.
      languages: 'en|mul|en-gb',
      sitefilter: 'enwiki',
      format: 'json',
    });
    try {
      const res = await withRetry('wbgetentities', async () => {
        const r = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
          headers: { 'User-Agent': UA },
        });
        if (!r.ok) throw new Error(`wbgetentities ${r.status}`);
        return r;
      });
      const json = (await res.json()) as {
        entities?: Record<string, {
          labels?: Record<string, { value: string } | undefined>;
          descriptions?: Record<string, { value: string } | undefined>;
          sitelinks?: { enwiki?: { url?: string } };
        }>;
      };
      for (const [qid, ent] of Object.entries(json.entities ?? {})) {
        // Prefer an explicit English label, then the multilingual one.
        const label =
          ent.labels?.en?.value ?? ent.labels?.mul?.value ?? ent.labels?.['en-gb']?.value;
        if (!label) continue;
        out.set(qid, {
          label,
          description: ent.descriptions?.en?.value ?? ent.descriptions?.mul?.value ?? '',
          wikipediaUrl: ent.sitelinks?.enwiki?.url ?? '',
        });
      }
    } catch {
      /* leave unresolved; caller drops them */
    }
    console.log(`  enriched ${Math.min(i + 50, ids.length)}/${ids.length}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  return out;
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

  console.log('Resolving names, descriptions and Wikipedia links...');
  const enriched = await enrichEntities(people.map((p) => p.person.value.split('/').pop()!));
  console.log(`  ${enriched.size}/${people.length} resolved`);

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
  let unnameable = 0;

  for (const person of people) {
    const id = person.person.value.split('/').pop()!;
    const info = enriched.get(id);

    // No resolvable English name means no entry. Better a smaller gallery than
    // one that shows "Q873" where a person's name belongs.
    if (!info || /^Q\d+$/.test(info.label)) {
      unnameable++;
      continue;
    }

    const title = titleFor(person);
    const meta = metaByTitle.get(title);
    if (!meta) continue;

    if (!FREE_LICENCE.test(meta.licence)) {
      rejected++;
      continue;
    }

    const ext = (meta.url.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
    const localFile = `${id}.${ext}`;

    entries.push({
      id,
      name: info.label,
      description: info.description,
      wikipediaUrl: info.wikipediaUrl,
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

  console.log(
    `\n  ${entries.length} free-licensed, ${rejected} rejected on licence, ${unnameable} unnameable`,
  );

  // Download portraits at a capped width - we only need enough pixels for a
  // 150x150 face chip, and Commons originals are often 20MP.
  //
  // Fetched through a small worker pool. Strictly sequential downloads measured
  // 34 files/minute, because thumb.php has to render each thumbnail server-side
  // and the round trip dominates; that made a 2,000-portrait rebuild a 40-minute
  // wait. DOWNLOAD_CONCURRENCY is kept low deliberately - this is someone
  // else's donated infrastructure, not a resource to saturate.
  const pending = entries.filter((e) => !existsSync(path.join(PORTRAIT_DIR, e.localFile)));
  let downloaded = entries.length - pending.length;
  const cached = downloaded;
  console.log(`  ${cached} already cached, ${pending.length} to fetch`);

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const e = pending[cursor++];
      const dest = path.join(PORTRAIT_DIR, e.localFile);
      const thumb = `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(
        e.commonsFile.replace(/^File:/, ''),
      )}&w=640`;
      try {
        const res = await fetch(thumb, { headers: { 'User-Agent': UA } });
        if (res.ok) {
          await writeFile(dest, Buffer.from(await res.arrayBuffer()));
          downloaded++;
          if (downloaded % 50 === 0) {
            console.log(`  downloaded ${downloaded}/${entries.length}`);
          }
        }
      } catch {
        /* skip unreachable images; build-index will drop them */
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  };

  await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));

  await writeFile(path.join(OUT_DIR, 'gallery-raw.json'), JSON.stringify(entries, null, 2));
  console.log(`\nDone. ${downloaded} portraits in data/portraits, manifest at data/gallery-raw.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
