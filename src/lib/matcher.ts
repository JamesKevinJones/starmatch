/**
 * Browser-side face matching.
 *
 * Everything here runs on the client, on purpose. The uploaded image is decoded
 * into a canvas, embedded, and compared against a static index that ships with
 * the site. No photo is ever uploaded anywhere, which is both the privacy story
 * and the reason this deploys to a static host with no inference budget.
 */

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

export type Calibration = {
  pairs: number;
  min: number;
  max: number;
  p01: number;
  p05: number;
  p50: number;
  p95: number;
  sameFaceThreshold: number;
  quantiles: number[];
};

export type Match = {
  entry: GalleryEntry;
  /** Euclidean distance in descriptor space. Lower is more similar. */
  distance: number;
  /**
   * Percentage of random stranger pairs this match beats, from the empirical
   * calibration table. This is NOT a probability that you "are" this person.
   */
  percentile: number;
};

export type MatchResult = {
  matches: Match[];
  /** The aligned face crop, as a data URL, for display next to the result. */
  faceChip: string;
  /** Detector confidence for the chosen face, 0-1. */
  confidence: number;
  /** How many faces were found in the source image. */
  facesFound: number;
  /** The raw 128-d descriptor, used for the embedding visualisation. */
  descriptor: Float32Array;
  /** Milliseconds spent in detection + embedding. */
  elapsedMs: number;
};

export class NoFaceError extends Error {
  constructor() {
    super('No face detected');
    this.name = 'NoFaceError';
  }
}

const MODEL_URL = '/models';

type FaceApi = typeof import('@vladmandic/face-api');

let faceapiPromise: Promise<FaceApi> | null = null;
let indexPromise: Promise<{
  entries: GalleryEntry[];
  embeddings: Float32Array;
  dim: number;
  calibration: Calibration;
}> | null = null;

/**
 * Load face-api and its three networks. ~12MB of weights, so this is only
 * triggered when the user actually reaches the matcher.
 */
export function loadEngine(onProgress?: (stage: string) => void): Promise<FaceApi> {
  faceapiPromise ??= (async () => {
    onProgress?.('Loading engine');
    const faceapi = await import('@vladmandic/face-api');

    onProgress?.('Loading detector');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    onProgress?.('Loading landmarks');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    onProgress?.('Loading descriptor');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    return faceapi;
  })();
  return faceapiPromise;
}

/** Load the static celebrity index. ~183KB of Float32 plus metadata. */
export function loadIndex() {
  indexPromise ??= (async () => {
    const [meta, bin, calibration] = await Promise.all([
      fetch('/data/gallery.json').then((r) => r.json() as Promise<{ dim: number; entries: GalleryEntry[] }>),
      fetch('/data/embeddings.bin').then((r) => r.arrayBuffer()),
      fetch('/data/calibration.json').then((r) => r.json() as Promise<Calibration>),
    ]);
    return {
      entries: meta.entries,
      embeddings: new Float32Array(bin),
      dim: meta.dim,
      calibration,
    };
  })();
  return indexPromise;
}

/** Warm both in parallel; used to prefetch while the user is still choosing. */
export function preload(onProgress?: (stage: string) => void) {
  return Promise.all([loadEngine(onProgress), loadIndex()]);
}

/**
 * Convert a descriptor distance into "closer than N% of stranger pairs" by
 * interpolating the empirical quantile table built at index time.
 *
 * The alternative - inventing a formula like `100 * (1 - d)` - would produce a
 * number that looks precise and means nothing.
 */
export function distanceToPercentile(distance: number, cal: Calibration): number {
  const q = cal.quantiles;
  if (distance <= q[0]) return 100;
  if (distance >= q[q.length - 1]) return 0;

  for (let i = 1; i < q.length; i++) {
    if (distance <= q[i]) {
      const span = q[i] - q[i - 1] || 1;
      const frac = (distance - q[i - 1]) / span;
      const pctOfStrangers = i - 1 + frac; // 0-100, share of pairs closer than this
      return Math.max(0, Math.min(100, 100 - pctOfStrangers));
    }
  }
  return 0;
}

/** Human-readable verdict bands, deliberately hedged. */
export function verdictFor(distance: number, cal: Calibration): string {
  if (distance < cal.sameFaceThreshold) return 'Strong resemblance';
  if (distance < cal.p05) return 'Notable resemblance';
  if (distance < cal.p50) return 'Some shared features';
  return 'Little in common';
}

/**
 * Run the full pipeline on an image element.
 *
 * @param topK how many ranked matches to return
 */
export async function matchFace(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  topK = 8,
): Promise<MatchResult> {
  const started = performance.now();
  const [faceapi, index] = await Promise.all([loadEngine(), loadIndex()]);

  const detections = await faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections.length) throw new NoFaceError();

  // If the photo has several people, take the largest face - that is almost
  // always the subject rather than a bystander.
  const chosen = detections.reduce((a, b) =>
    a.detection.box.area >= b.detection.box.area ? a : b,
  );

  const { entries, embeddings, dim, calibration } = index;
  const q = chosen.descriptor;

  const scored: Match[] = entries.map((entry, i) => {
    let sum = 0;
    for (let k = 0; k < dim; k++) {
      const diff = q[k] - embeddings[i * dim + k];
      sum += diff * diff;
    }
    const distance = Math.sqrt(sum);
    return { entry, distance, percentile: distanceToPercentile(distance, calibration) };
  });

  scored.sort((a, b) => a.distance - b.distance);

  return {
    matches: scored.slice(0, topK),
    faceChip: cropFace(image, chosen.detection.box),
    confidence: chosen.detection.score,
    facesFound: detections.length,
    descriptor: Float32Array.from(q),
    elapsedMs: performance.now() - started,
  };
}

export type FaceEmbedding = {
  descriptor: Float32Array;
  faceChip: string;
  confidence: number;
  facesFound: number;
};

/**
 * Embed a single face without ranking it against the gallery.
 *
 * Used by the doppelgänger comparison, which measures two user-supplied photos
 * against each other. Nothing here touches the gallery index, so comparing two
 * private individuals never enrols either of them anywhere.
 */
export async function embedFace(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<FaceEmbedding> {
  const faceapi = await loadEngine();

  const detections = await faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections.length) throw new NoFaceError();

  const chosen = detections.reduce((a, b) =>
    a.detection.box.area >= b.detection.box.area ? a : b,
  );

  return {
    descriptor: Float32Array.from(chosen.descriptor),
    faceChip: cropFace(image, chosen.detection.box),
    confidence: chosen.detection.score,
    facesFound: detections.length,
  };
}

/** Euclidean distance between two descriptors. Lower is more similar. */
export function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Square, padded crop of the detected face as a data URL. */
function cropFace(
  source: CanvasImageSource,
  box: { x: number; y: number; width: number; height: number },
  size = 320,
  pad = 0.4,
): string {
  const side = Math.max(box.width, box.height) * (1 + pad * 2);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, Math.max(0, cx - side / 2), Math.max(0, cy - side / 2), side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Decode a File into an <img> without ever leaving the page. */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}
