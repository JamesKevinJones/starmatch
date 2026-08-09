'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';

const NAV = [
  { href: '/match', label: 'Match' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/ethics', label: 'Ethics' },
];

export function SiteHeader() {
  const pathname = usePathname();

  /**
   * The theme lives in the DOM, not in React state.
   *
   * An inline script in the document head applies it before first paint, so
   * there is no flash of the wrong theme. Mirroring it into state here would
   * only reintroduce that flash (state starts wrong, corrects after hydration)
   * and force a setState inside an effect. The button toggles the attributes
   * directly and CSS swaps the icon.
   *
   * Both `data-theme` and `.dark` are set: the site's tokens key off the former,
   * the Bklit chart tokens from the shadcn registry key off the latter.
   */
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme !== 'dark';
    root.dataset.theme = next ? 'dark' : 'light';
    root.classList.toggle('dark', next);
    localStorage.setItem('starmatch-theme', next ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 border-b-[3px] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-900 tracking-tight">
          <span className="inline-block bg-acid px-2 py-0.5 text-ink border-[3px] border-[var(--line)]">
            STAR
          </span>
          <span>MATCH</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`label px-3 py-2 border-[3px] transition-colors ${
                  active
                    ? 'bg-volt text-white border-[var(--line)]'
                    : 'border-transparent hover:border-[var(--line)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Icons swap via CSS on the root's data-theme, so no state is needed. */}
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle light and dark theme"
          className="ml-auto md:ml-0 brut-sm brut-press p-2"
        >
          <Moon size={18} aria-hidden className="theme-icon-moon" />
          <Sun size={18} aria-hidden className="theme-icon-sun" />
        </button>

        <Link href="/match" className="brut-sm brut-press bg-coral px-4 py-2 label text-white hidden sm:block">
          Try it
        </Link>
      </div>

      {/* Mobile nav row */}
      <nav className="flex overflow-x-auto border-t-[3px] md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`label whitespace-nowrap px-4 py-2 ${
              pathname === item.href ? 'bg-volt text-white' : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
