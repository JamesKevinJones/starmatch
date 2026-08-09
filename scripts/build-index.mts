/**
 * Step 2 of the gallery pipeline.
 *
 * Runs the same detect -> landmark -> descriptor chain the browser runs, over
 * every downloaded portrait, and emits the static index the site ships:
 *
 *   public/data/gallery.json   metadata + licence/attribution per figure
 *   public/data/embeddings.bin packed Float32 descriptors (N x 128)
 *   public/gallery/<id>.jpg    face-cropped thumbnail
 *
 * Descriptors are stored RAW (not L2-normalised). These are dlib-lineage
 * ResNet descriptors calibrated for Euclidean distance with a ~0.6 same-person
 * threshold. Cosine similarity on them compresses every pair into 0.89-1.00,
 * which would make any "% match" shown in the UI meaningless.
 */
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RawEntry } from './fetch-gallery.js';

const ROOT = process.cwd();
const PORTRAITS = path.join(ROOT, 'data', 'portraits');
const MODELS = path.join(ROOT, 'public', 'models');
const OUT_DATA = path.join(ROOT, 'public', 'data');
const OUT_THUMBS = path.join(ROOT, 'public', 'gallery');

/** Face chip size written to public/gallery. */
const THUMB = 256;
/** Padding around the detected box, as a fraction of box size. */
const PAD = 0.4;

export type GalleryEntry = {
  id: string;
  name: string;
  /** Short Wikidata gloss, shown on hover in the gallery. May be empty. */
  description: string;
  /** English Wikipedia URL, linked from the hover card. May be empty. */
  wikipediaUrl: string;
  occupation: string;
  thumb: string;
  licence: string;
  licenceUrl: string;
  artist: string;
  sourceUrl: string;
  wikidataUrl: string;
};

/** Decode a file to the RGB tensor face-api expects, skipping canvas patching. */
async function toTensor(file: string) {
  const img = await loadImage(file);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d') as SKRSContext2D;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  const rgb = tf.tidy(() =>
    tf.tensor3d(new Uint8Array(data), [height, width, 4]).slice([0, 0, 0], [height, width, 3]),
  );
  return { rgb, img, canvas, ctx };
}

async function main() {
  await mkdir(OUT_DATA, { recursive: true });
  await mkdir(OUT_THUMBS, { recursive: true });

  setWasmPaths(path.join(ROOT, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + path.sep);
  await tf.setBackend('wasm');
  await tf.ready();
  console.log(`tfjs backend: ${tf.getBackend()}`);

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS);
  console.log('models loaded');

  const raw = JSON.parse(await readFile(path.join(ROOT, 'data', 'gallery-raw.json'), 'utf8')) as RawEntry[];

  const entries: GalleryEntry[] = [];
  const descriptors: Float32Array[] = [];
  let noFace = 0;
  let failed = 0;

  for (let i = 0; i < raw.length; i++) {
    const e = raw[i];
    const file = path.join(PORTRAITS, e.localFile);

    let rgb: tf.Tensor3D | undefined;
    try {
      const decoded = await toTensor(file);
      rgb = decoded.rgb;

      const det = await faceapi
        .detectSingleFace(rgb as unknown as faceapi.TNetInput, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        noFace++;
        continue;
      }

      const unit = Float32Array.from(det.descriptor);

      // Crop a padded square face chip for the UI.
      const { x, y, width, height } = det.detection.box;
      const side = Math.max(width, height) * (1 + PAD * 2);
      const cx = x + width / 2;
      const cy = y + height / 2;
      const sx = Math.max(0, cx - side / 2);
      const sy = Math.max(0, cy - side / 2);
      const sSide = Math.min(side, decoded.img.width - sx, decoded.img.height - sy);

      const out = createCanvas(THUMB, THUMB);
      out.getContext('2d').drawImage(decoded.img, sx, sy, sSide, sSide, 0, 0, THUMB, THUMB);
      await writeFile(path.join(OUT_THUMBS, `${e.id}.jpg`), out.toBuffer('image/jpeg', 82));

      entries.push({
        id: e.id,
        name: e.name,
        description: e.description ?? '',
        wikipediaUrl: e.wikipediaUrl ?? '',
        occupation: e.occupation,
        thumb: `/gallery/${e.id}.jpg`,
        licence: e.licence,
        licenceUrl: e.licenceUrl,
        artist: e.artist,
        sourceUrl: e.descriptionUrl,
        wikidataUrl: e.wikidataUrl,
      });
      descriptors.push(unit);
    } catch {
      failed++;
    } finally {
      rgb?.dispose();
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${raw.length}  indexed=${entries.length} noFace=${noFace} failed=${failed}`);
    }
  }

  // Pack descriptors contiguously: row i of the matrix belongs to entries[i].
  const dim = descriptors[0]?.length ?? 128;
  const packed = new Float32Array(descriptors.length * dim);
  descriptors.forEach((d, i) => packed.set(d, i * dim));

  await writeFile(
    path.join(OUT_DATA, 'gallery.json'),
    JSON.stringify({ dim, count: entries.length, entries }, null, 0),
  );
  await writeFile(path.join(OUT_DATA, 'embeddings.bin'), Buffer.from(packed.buffer));

  console.log(`\nindexed ${entries.length}/${raw.length}  (noFace=${noFace} failed=${failed})`);
  console.log(`embeddings.bin: ${(packed.byteLength / 1024).toFixed(1)} KB  dim=${dim}`);

  // Calibration: every pair here is a DIFFERENT person, so this is the
  // "stranger" distance distribution. The UI maps distance to a score against
  // these percentiles rather than an invented constant.
  const dists: number[] = [];
  for (let a = 0; a < descriptors.length; a++) {
    for (let b = a + 1; b < descriptors.length; b++) {
      let s = 0;
      for (let k = 0; k < dim; k++) {
        const diff = descriptors[a][k] - descriptors[b][k];
        s += diff * diff;
      }
      dists.push(Math.sqrt(s));
    }
  }
  dists.sort((x, y) => x - y);
  const pct = (p: number) => dists[Math.floor((p / 100) * (dists.length - 1))];
  // 101 quantiles let the client interpolate "closer than N% of stranger pairs"
  // exactly, instead of hardcoding a made-up distance-to-percentage curve.
  const quantiles = Array.from({ length: 101 }, (_, i) => +pct(i).toFixed(4));

  const stats = {
    pairs: dists.length,
    min: +dists[0].toFixed(4),
    max: +dists[dists.length - 1].toFixed(4),
    p01: +pct(1).toFixed(4),
    p05: +pct(5).toFixed(4),
    p50: +pct(50).toFixed(4),
    p95: +pct(95).toFixed(4),
    /** dlib/face-api's conventional same-person threshold, kept for reference. */
    sameFaceThreshold: 0.6,
    quantiles,
  };
  await writeFile(path.join(OUT_DATA, 'calibration.json'), JSON.stringify(stats, null, 2));
  console.log('stranger-distance distribution:', stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
