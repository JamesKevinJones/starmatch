import type { MetadataRoute } from 'next';

import { SITE_URL as SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE}/match`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/gallery`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/how-it-works`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${SITE}/ethics`, lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE}/attribution`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
