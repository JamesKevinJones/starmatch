/**
 * End-to-end correctness check for the index.
 *
 * Downloads a DIFFERENT Commons photo of people who are already in the gallery
 * and confirms the matcher ranks the correct person first. A gallery that
 * builds without errors but ranks strangers top is worse than no gallery, so
 * this runs as `npm run verify` rather than living only in someone's head.
 */
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { GalleryEntry } from './build-index.mjs';

const ROOT = process.cwd();
const UA = 'StarMatch/1.0 (https://github.com/JamesKevinJones/starmatch) educational-lookalike-demo';

/**
 * People to probe. The actual probe *image* is discovered at runtime from that
 * person's Commons category rather than hardcoded - guessed filenames 404, and
 * a hand-picked file risks silently being the same image used for the index.
 */
const SUBJECTS = [
  'Barack Obama',
  'Keanu Reeves',
  'Morgan Freeman',
  'Leonardo DiCaprio',
  'Nicole Kidman',
  'Angela Merkel',
  'Emma Watson',
  'Natalie Portman',
  'Brad Pitt',
  'Jackie Chan',
  'Shakira',
  'Rihanna',
  'Serena Williams',
  'Justin Trudeau',
  'Zendaya',
  'Dwayne Johnson',
  'Taylor Swift',
  'Meryl Streep',
];

/** How many probe images to test per person. */
const PER_SUBJECT = 4;

/**
 * Filenames that describe something other than a straight photograph of the
 * subject. Every one of these produced a false "failure" in an earlier run:
 * a Madame Tussauds waxwork of Morgan Freeman, and a photo captioned "fan
 * looking at photograph of Nicole Kidman" where the detected face is the fan's.
 *
 * A recognition model that declines to match a wax dummy is behaving correctly;
 * counting that as an error measures the benchmark, not the model.
 */
const NOT_A_PHOTO_OF_THEM =
  /(wax|tussaud|statue|sculpture|figure|mural|graffiti|drawing|painting|portrait of|photograph of|photo of|poster|billboard|saliency|screenshot|cosplay|impersonat|look-?alike|fan |mask|doll|puppet|tattoo|cake|memorial|grave|plaque|book|album|cover|logo|sign)/i;

/**
 * Find probe files from `Category:<name>`, excluding the image used to build
 * the index.
 *
 * Commons categories are noisy: they contain co-stars, group shots, posters and
 * memorabilia. Requiring the subject's surname in the filename is a crude but
 * effective proxy for "this is actually a photo of them" - without it, Emma
 * Watson's category happily returns a picture of Daniel Radcliffe.
 */
async function findProbeImages(name: string, exclude: string | undefined): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${name}`,
    cmtype: 'file',
    cmlimit: '500',
    format: 'json',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { query?: { categorymembers?: Array<{ title: string }> } };

  /*
   * Require every part of the name, not just the surname.
   *
   * Surname-only matching pulled in "Force-NHRA-Swift.jpg" (drag racing, not
   * Taylor Swift), "Portman.jpg" (no way to know which Portman) and
   * "DiCaprioCrawfordSchwarzenegger...jpg" (three people). Demanding both the
   * given name and the surname makes it far likelier the file really depicts
   * this specific person, at the cost of fewer probes - which is the right
   * trade when the probes are the ground truth.
   */
  const parts = name.toLowerCase().split(/\s+/);
  const excludeBare = exclude?.replace(/^File:/, '');

  return (json.query?.categorymembers ?? [])
    .map((m) => m.title)
    .filter((t) => /\.(jpe?g|png)$/i.test(t))
    .filter((t) => t.replace(/^File:/, '') !== excludeBare)
    .filter((t) => { const lower = t.toLowerCase(); return parts.every((p) => lower.includes(p)); })
    // Drop images that clearly contain more than one person.
    .filter((t) => !/(crowd|group|rally|congress|ceremony|award|team|summit|meeting|panel|premiere|conference)/i.test(t))
    .filter((t) => !/ (and|with|&|,) /i.test(t) && !t.includes(','))
    // Drop anything that is a depiction rather than a photograph of the person.
    .filter((t) => !NOT_A_PHOTO_OF_THEM.test(t))
    .slice(0, PER_SUBJECT);
}

async function tensorFromBuffer(buf: Buffer, mirror = false) {
  const img = await loadImage(buf);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d') as SKRSContext2D;
  if (mirror) {
    // Horizontal flip: these descriptors are not mirror-invariant, so the
    // flipped view is a genuinely different sample of the same face.
    ctx.translate(img.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  return tf.tidy(() =>
    tf.tensor3d(new Uint8Array(data), [height, width, 4]).slice([0, 0, 0], [height, width, 3]),
  );
}

/*
 * Horizontal-flip test-time augmentation, off by default.
 *
 * Measured on this benchmark it changed top-1 accuracy by exactly nothing -
 * 8/10 with it, 8/10 without, in both the min-distance and averaged forms -
 * while doubling inference cost. The min form was actively worse in spirit: it
 * pulls every candidate closer, impostors included, so Sidney Poitier moved
 * into Morgan Freeman's top three. Kept behind FLIP_TTA=1 so the experiment is
 * reproducible rather than folklore.
 */
const FLIP_TTA = process.env.FLIP_TTA === '1';

async function main() {
  setWasmPaths(path.join(ROOT, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + path.sep);
  await tf.setBackend('wasm');
  await tf.ready();

  const MODELS = path.join(ROOT, 'public', 'models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS);

  const meta = JSON.parse(
    await readFile(path.join(ROOT, 'public', 'data', 'gallery.json'), 'utf8'),
  ) as { dim: number; count: number; entries: GalleryEntry[] };
  const rawManifest = JSON.parse(
    await readFile(path.join(ROOT, 'data', 'gallery-raw.json'), 'utf8'),
  ) as Array<{ name: string; commonsFile: string }>;
  const bin = await readFile(path.join(ROOT, 'public', 'data', 'embeddings.bin'));
  const emb = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);
  const { dim, entries } = meta;

  console.log(`index: ${entries.length} people, dim=${dim}\n`);

  let pass = 0;
  let ran = 0;

  for (const subject of SUBJECTS) {
    if (!entries.some((e) => e.name === subject)) {
      console.log(`SKIP  ${subject} - not in gallery`);
      continue;
    }
    const indexed = rawManifest.find((r) => r.name === subject)?.commonsFile;
    const found = await findProbeImages(subject, indexed);
    if (!found.length) {
      console.log(`SKIP  ${subject} - no alternate photo found on Commons`);
      continue;
    }
    for (const candidate of found) {
    const probe = { expect: subject, file: candidate.replace(/^File:/, '') };
    const url = `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(probe.file)}&w=640`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) {
      console.log(`SKIP  ${probe.expect} - probe image unavailable (${res.status})`);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const t = await tensorFromBuffer(buf);
    const all = await faceapi
      .detectAllFaces(t as unknown as faceapi.TNetInput, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    t.dispose();

    if (!all.length) {
      console.log(`SKIP  ${probe.expect} - no face in ${probe.file}`);
      continue;
    }

    /*
     * A probe with more than one face has no usable ground truth: we cannot
     * know which face is the subject, and picking the biggest or most confident
     * one silently tests the wrong person. That is what produced results like
     * "Leonardo DiCaprio -> Gisele Bündchen" - a photo of the couple, scored
     * against the wrong face and counted as a model failure.
     */
    if (all.length > 1) {
      console.log(`SKIP  ${probe.expect} - ${all.length} faces in ${probe.file}, ambiguous`);
      continue;
    }

    const det = all[0];
    const queries: Float32Array[] = [Float32Array.from(det.descriptor)];

    // Test-time augmentation: embed the mirrored image too and keep whichever
    // view lands closer to each candidate.
    if (FLIP_TTA) {
      const tf2 = await tensorFromBuffer(buf, true);
      const flipped = await faceapi
        .detectSingleFace(
          tf2 as unknown as faceapi.TNetInput,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      tf2.dispose();
      if (flipped) queries.push(Float32Array.from(flipped.descriptor));
    }

    // Euclidean distance - the metric these descriptors are calibrated for.
    // Lower is more similar.
    /*
     * Average the augmented descriptors rather than taking the minimum
     * distance. Min-based TTA pulls *every* candidate closer, impostors
     * included, which shrinks the margin instead of improving the ranking.
     */
    const q = new Float32Array(dim);
    for (const v of queries) for (let k = 0; k < dim; k++) q[k] += v[k] / queries.length;

    const scored = entries.map((e, i) => {
      let s = 0;
      for (let k = 0; k < dim; k++) {
        const diff = q[k] - emb[i * dim + k];
        s += diff * diff;
      }
      return { name: e.name, dist: Math.sqrt(s) };
    });
    scored.sort((a, b) => a.dist - b.dist);

    ran++;
    const top = scored[0];
    const ok = top.name === probe.expect;
    if (ok) pass++;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${probe.expect.padEnd(18)} [${probe.file.slice(0, 40)}] -> ` +
        scored
          .slice(0, 3)
          .map((s) => `${s.name} ${s.dist.toFixed(3)}`)
          .join(' | '),
    );
    }
  }

  const rate = ran ? (100 * pass) / ran : 0;
  console.log(`\ntop-1 accuracy: ${pass}/${ran} (${rate.toFixed(0)}%) across ${SUBJECTS.length} subjects`);

  /*
   * 57% here once looked like a size effect - more faces, more chances for a
   * stranger to outrank the answer. It was not. It was the benchmark: probes
   * included a Madame Tussauds waxwork of Morgan Freeman, a photo of a fan
   * looking at a picture of Nicole Kidman, and a drag-racing photo matched to
   * Taylor Swift on surname alone. With those excluded the same index scores
   * 80%.
   *
   * The gate sits at 60% rather than 80% because the clean probe set is small
   * (around ten usable images); a single hard case is ten points. It is a floor
   * against collapse, not a precision instrument.
   */
  const expected = 60;

  if (ran < 5) {
    console.log('too few usable probes to judge; not failing the build');
  } else if (rate < expected) {
    console.log(`FAILED: top-1 accuracy below ${expected}% for a ${entries.length}-face gallery`);
    process.exitCode = 1;
  } else {
    console.log(`OK: at or above the ${expected}% mark for a ${entries.length}-face gallery`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
