/**
 * Audits how much of the gallery may carry the wrong face.
 *
 * The build embeds each portrait with `detectSingleFace`, which returns the
 * highest-confidence face in the image. If a portrait contains more than one
 * person - a co-star, an interviewer, someone in the background - the stored
 * descriptor may belong to somebody other than the person named on the card.
 *
 * That is the one error mode a user cannot see and cannot correct for, so it is
 * worth an actual number rather than an assurance.
 */
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SAMPLE = Number(process.env.SAMPLE ?? 300);

type RawEntry = { id: string; name: string; localFile: string };

async function main() {
  setWasmPaths(path.join(ROOT, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + path.sep);
  await tf.setBackend('wasm');
  await tf.ready();

  const M = path.join(ROOT, 'public', 'models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(M);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(M);

  const raw = JSON.parse(
    await readFile(path.join(ROOT, 'data', 'gallery-raw.json'), 'utf8'),
  ) as RawEntry[];

  // Evenly spaced sample so the estimate is not biased toward one occupation
  // block (the manifest is grouped by the query that found each person).
  const step = Math.max(1, Math.floor(raw.length / SAMPLE));
  const sample = raw.filter((_, i) => i % step === 0).slice(0, SAMPLE);

  let single = 0;
  let multi = 0;
  let none = 0;
  let unreadable = 0;
  const examples: string[] = [];

  for (const e of sample) {
    try {
      const img = await loadImage(path.join(ROOT, 'data', 'portraits', e.localFile));
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d') as SKRSContext2D;
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
      const t = tf.tidy(() =>
        tf.tensor3d(new Uint8Array(data), [height, width, 4]).slice([0, 0, 0], [height, width, 3]),
      );
      const faces = await faceapi.detectAllFaces(
        t as unknown as faceapi.TNetInput,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
      );
      t.dispose();

      if (faces.length === 0) none++;
      else if (faces.length === 1) single++;
      else {
        multi++;
        if (examples.length < 8) examples.push(`${e.name} (${faces.length} faces)`);
      }
    } catch {
      unreadable++;
    }
  }

  const scored = single + multi;
  const pct = (n: number) => ((100 * n) / scored).toFixed(1);

  console.log(`\nsampled ${sample.length} of ${raw.length} portraits`);
  console.log(`  exactly one face : ${single} (${pct(single)}%)`);
  console.log(`  more than one    : ${multi} (${pct(multi)}%)  <- may carry the wrong face`);
  console.log(`  no face found    : ${none} (dropped at build time)`);
  console.log(`  unreadable       : ${unreadable}`);
  if (examples.length) console.log(`\n  examples: ${examples.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
