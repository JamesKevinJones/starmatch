import type { MetadataRoute } from 'next';

import { SITE_URL as SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // Model weights and the dev-only inference harness have no value in an index.
      { userAgent: '*', disallow: ['/models/', '/data/', '/debug-match', '/test/'] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
