import Link from 'next/link';
// lucide-react v1 removed brand marks, so the source link uses a generic glyph.
import { Code2 } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t-[3px] bg-[var(--panel)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-3xl font-900">STARMATCH</p>
          <p className="mt-3 max-w-sm text-sm opacity-80">
            A look-alike matcher that runs entirely in your browser. Built on a 128-dimensional
            face descriptor and a gallery of freely-licensed portraits from Wikimedia Commons.
          </p>
          <p className="mt-4 label opacity-60">Not an identification system. Read the ethics page.</p>
        </div>

        <div>
          <p className="label mb-3">Project</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/match" className="underline underline-offset-4">Try the matcher</Link></li>
            <li><Link href="/gallery" className="underline underline-offset-4">Browse the gallery</Link></li>
            <li><Link href="/how-it-works" className="underline underline-offset-4">How it works</Link></li>
            <li><Link href="/ethics" className="underline underline-offset-4">Ethics &amp; limits</Link></li>
          </ul>
        </div>

        <div>
          <p className="label mb-3">Credits</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/attribution" className="underline underline-offset-4">Image attribution</Link></li>
            <li>
              <a
                href="https://github.com/JamesKevinJones/starmatch"
                className="inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                <Code2 size={14} aria-hidden /> Source
              </a>
            </li>
            <li>
              <a
                href="https://github.com/ageitgey/face_recognition"
                className="underline underline-offset-4"
              >
                Descriptor lineage
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t-[3px] px-4 py-4 text-center label opacity-70 sm:px-6">
        Portraits © their photographers, reused under CC / public domain licences.
      </div>
    </footer>
  );
}
