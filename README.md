# StarMatch

A celebrity look-alike matcher that runs **entirely in your browser**. Drop in a
photo, and it ranks your face against 366 public figures — without the image ever
leaving the tab.

[Live site](https://starmatch.vercel.app) · [How it works](https://starmatch.vercel.app/how-it-works) · [Ethics](https://starmatch.vercel.app/ethics)

---

## Why this exists

This repository replaces a fork of
[`ageitgey/face_recognition`](https://github.com/ageitgey/face_recognition) that
sat untouched with zero commits. The goal was to make that idea actually *run*,
and deploy it.

The original is Python on dlib: ~100MB of compiled C++ and model weights. It does
not fit in a serverless function, and hosting it would mean accepting uploads of
people's faces. Both problems disappear if inference moves to the client:

- the photo stays on the device, so there is no upload endpoint to secure
- the host is a static CDN, so it runs on a free tier with no inference cost

The descriptor is the same lineage as the original — a ResNet-34 producing 128
floats — running in WebGL via TensorFlow.js.

## The pipeline

```
photo → detect (SSD-MobileNet) → 68 landmarks → align
      → embed (ResNet-34, 128-d) → Euclidean rank vs 366 gallery vectors
```

The whole gallery is a 183KB `Float32Array` plus a JSON manifest.

## Honest scoring

A raw distance means nothing to a reader, and mapping it to a percentage with an
invented formula would look precise while meaning nothing.

Instead the build measures **every pair of different people** in the gallery —
66,795 stranger distances — and stores the quantiles. Your score is where your
match falls in that real distribution.

That measurement also produced the most interesting result in the project:

| Stranger-pair distance | Value |
| --- | --- |
| Closest pair | **0.377** |
| 5th percentile | 0.648 |
| Median | 0.808 |
| Furthest pair | 1.174 |

dlib's conventional "same person" threshold is **0.6**. The two most similar
*different* people in a gallery of only 366 sit at 0.377 — comfortably inside it.
A rule meant to mean "same person" fires on strangers. That is the argument
against using face matching for anything consequential, and it is on the
[ethics page](https://starmatch.vercel.app/ethics) rather than buried here.

## Gallery provenance

Portraits come from Wikimedia Commons via a Wikidata SPARQL query, and are
**rejected unless their licence permits redistribution**. Photographer, licence
and source URL are recorded for every image and published on the
[attribution page](https://starmatch.vercel.app/attribution).

The gallery inherits Wikipedia's well-documented skew toward men, the West, and
the recent past. This is stated on the ethics page rather than smoothed over.

## Rebuilding the index

```bash
npm run gallery:fetch    # Wikidata + Commons, licence-filtered, downloads portraits
npm run gallery:build    # embed, pack vectors, compute calibration quantiles
npm run gallery:verify   # rank held-out photos, asserts top-1 accuracy
```

`gallery:verify` pulls a *different* Commons photo of people already in the
gallery and checks they rank first. Probe images come from noisy Commons
categories (co-stars, group shots), so it demands ≥70% top-1 rather than
perfection. Current run: **71%**, with correct matches showing clear margins.

`data/portraits/` (48MB of source images) is gitignored and regenerable; the
derived index in `public/data/` is committed.

## Local development

```bash
npm install
npm run dev
```

`/debug-match` is a dev-only harness that runs the real browser pipeline against
a held-out fixture and prints the ranking as JSON — used to assert inference
without scripting a file picker.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16, React 19, Tailwind v4 |
| Inference | `@vladmandic/face-api` on TensorFlow.js |
| Scroll | Lenis, driven by the GSAP ticker |
| Scroll-linked motion | GSAP + ScrollTrigger |
| Component/layout motion | Motion |
| Counters, SVG draw | anime.js |
| Shader backdrop | Paper Shaders (`Dithering`) |
| Charts | visx + Bklit UI chart tokens |
| Component patterns | shadcn registry, Kokonut UI, Magic UI, Aceternity, React Bits |
| Design language | Neo-brutalism |

Each animation library owns exactly one layer so none of them fight over the same
property. See [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Licence

MIT. Portraits remain © their photographers under the licences listed on the
attribution page.
