/**
 * Canonical origin, in one place.
 *
 * Vercel exposes the production domain as NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
 * so previews and prod both emit correct canonical/OG/sitemap URLs without this
 * being hardcoded. The literal is only the local-dev fallback.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://starmatch-liard.vercel.app';
