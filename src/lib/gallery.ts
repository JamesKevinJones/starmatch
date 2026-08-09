import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Calibration, GalleryEntry } from './matcher';

/**
 * Server-side reads of the static index.
 *
 * These files are also fetched by the browser at match time; reading them here
 * lets pages render real counts and the attribution table at build time instead
 * of shipping a loading state for data that never changes.
 */
const DATA = path.join(process.cwd(), 'public', 'data');

export async function getGallery(): Promise<{ dim: number; entries: GalleryEntry[] }> {
  return JSON.parse(await readFile(path.join(DATA, 'gallery.json'), 'utf8'));
}

export async function getCalibration(): Promise<Calibration> {
  return JSON.parse(await readFile(path.join(DATA, 'calibration.json'), 'utf8'));
}
