import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { SmoothScroll } from '@/components/smooth-scroll';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SITE_URL as SITE } from '@/lib/site';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['600', '700', '800', '900'],
  display: 'swap',
});

const space = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const DESCRIPTION =
  'Upload a photo and find which public figure you most resemble. Face matching runs entirely in your browser — your photo is never uploaded, stored, or sent to a server.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'StarMatch — in-browser celebrity look-alike matching',
    template: '%s · StarMatch',
  },
  description: DESCRIPTION,
  keywords: [
    'face recognition',
    'celebrity look-alike',
    'browser machine learning',
    'privacy-preserving AI',
    'face embeddings',
    'TensorFlow.js',
  ],
  authors: [{ name: 'James Kevin Jones', url: 'https://github.com/JamesKevinJones' }],
  creator: 'James Kevin Jones',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'StarMatch',
    title: 'StarMatch — in-browser celebrity look-alike matching',
    description: DESCRIPTION,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'StarMatch' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarMatch — in-browser celebrity look-alike matching',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1ea' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
};

/** Structured data so search and AI crawlers can describe the app correctly. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'StarMatch',
  url: SITE,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any modern browser',
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Client-side face detection and embedding',
    'Look-alike ranking against a freely-licensed gallery of public figures',
    'No image upload or server-side storage',
  ],
  author: { '@type': 'Person', name: 'James Kevin Jones' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Required, not incidental: the theme script below writes data-theme and
      // .dark onto <html> before React hydrates, so the client markup
      // deliberately differs from the server's. Scoped to this element only.
      suppressHydrationWarning
      className={`${archivo.variable} ${space.variable} ${plexMono.variable}`}
    >
      <body>
        {/*
          Applies the stored/preferred theme before first paint. Doing this in an
          effect instead would render the wrong theme for a frame on every load.
          Sets `data-theme` (site tokens) and `.dark` (Bklit chart tokens).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('starmatch-theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-acid focus:px-4 focus:py-2 focus:text-ink brut-sm"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </SmoothScroll>
      </body>
    </html>
  );
}
