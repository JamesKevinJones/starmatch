<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# StarMatch — agent context

In-browser celebrity look-alike matcher. Next.js 16 + React 19 + Tailwind v4,
deployed static to Vercel. All face inference runs client-side.

## Ground rules

- **Never hand-edit `public/data/*`.** Those are build outputs. Use the
  `gallery-curation` skill in `.claude/skills/`.
- **Never add a server-side inference path.** The privacy claim on the site is
  architectural: no upload endpoint exists. Keep it that way.
- **Never widen the licence filter** in `scripts/fetch-gallery.ts` to admit an
  image. Unlicensed portraits do not go in the gallery.
- **`motion` is pinned to v12 deliberately.** v13's `AnimatePresence` never
  completes its exit animation and freezes the matcher. See `docs/DECISIONS.md`.
- Match with **Euclidean distance**, never cosine — `docs/DECISIONS.md` has the
  measured reason.

## Layout

```
scripts/           gallery pipeline (fetch -> build -> verify), run with tsx
src/lib/matcher.ts browser inference + scoring; the core of the project
src/components/    UI; charts/ came from the Bklit shadcn registry
src/app/           routes; ethics + attribution read the index at build time
public/data/       derived index (committed)
public/models/     ~12MB face-api weights, lazy-loaded on /match only
data/portraits/    48MB of source images (gitignored, regenerable)
```

## Animation layers

Four libraries coexist; each owns one job and must not touch another's
properties. Lenis (scroll, on the GSAP ticker) · GSAP+ScrollTrigger
(scroll-linked) · Motion (component/layout state) · anime.js (counters, SVG
draw). All honour `prefers-reduced-motion`.

## Verifying

See `docs/VERIFY.md`. The command that actually matters is
`npm run gallery:verify` — it must hold **≥60%** top-1 on held-out photos. The
gate is `expected` in `scripts/verify-index.mts`; it sits at 60 rather than 80
because the clean probe set is small enough that a stricter gate would fail on
sampling noise. Last run: 8/10 across 18 subjects.

## Frontend

See `docs/FRONTEND.md` for frontend engineering rules.

