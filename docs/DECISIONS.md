# Decisions

## Inference runs in the browser, not on a server

The forked Python library (dlib) is ~100MB of compiled C++ and cannot be deployed
to a serverless function. A hosted API would also mean receiving users' faces.

Client-side WebGL inference removes both problems at once and turns the privacy
claim into an architectural fact rather than a policy promise.

## Euclidean distance, not cosine similarity

The first implementation used cosine similarity on L2-normalised descriptors.
Measured on real data, that put self-match at 0.997 and Obama-vs-a-stranger at
0.895 — every pair compressed into a 0.10 band, making any "% match" in the UI
meaningless.

These are dlib-lineage descriptors calibrated for **Euclidean distance** with a
~0.6 same-person threshold. Descriptors are now stored raw and matched with
Euclidean distance, which gives a usable dynamic range.

## The displayed score is an empirical percentile

Mapping distance to a percentage with a formula like `100 * (1 - d)` would look
authoritative and mean nothing.

The build computes all 66,795 stranger-pair distances and stores 101 quantiles.
The client interpolates against that table, so "closer than 99% of stranger
pairs" is a claim that can be checked.

## Motion is pinned to v12, not v13

`motion@13.0.0` ships an `AnimatePresence` that never completes its exit
animation: state updated and React re-rendered correctly, but the presence
wrapper kept rendering the outgoing child forever, leaving the matcher stuck on
its first phase. Reproduced with and without `mode="wait"`, on a clean build.

Pinned to `motion@^12`, where it works. Kokonut UI and Bklit UI are both built
against v12 as well.

## AnimatePresence receives exactly one child

Even on v12, `mode="wait"` requires a single child. The original code passed five
conditional expressions (four evaluating to `false`); the current view is now
selected in a `switch` and rendered as one keyed node.

## Charts use visx directly, not Bklit's `<LineChart>`

Bklit UI was installed from its shadcn registry and its chart tokens are used
throughout. But `<LineChart>` is time-series shaped and expects a date x-axis;
the results view plots ranked categorical distances. Coercing that through a date
scale would misrepresent the data, so the bars are built on visx — Bklit's own
underlying renderer — with its tokens retinted to the site palette.

Two registry bugs were fixed on install: `var(----chart-1)` (four dashes) in the
injected CSS, and an import of `../components/shimmering-text` that resolves to
`src/components/components/`.

## One animation library per layer

Four animation libraries coexist only because each owns a distinct job:

| Library | Owns |
| --- | --- |
| Lenis | scroll position (driven by the GSAP ticker so they share a clock) |
| GSAP + ScrollTrigger | anything scroll-linked |
| Motion | component state and layout transitions |
| anime.js | numeric counters and SVG stroke drawing |

Nothing animates a property owned by another layer. Every one of them checks
`prefers-reduced-motion`, and the CSS layer kills anything missed.

## Neo-brutalism over the shader layer

Shaders are confined to the hero backdrop. All UI chrome stays hard-edged and
flat — 3px borders, offset shadows, no blur, no soft gradients. Pairing a
halftone `Dithering` shader with brutalist chrome avoids the generic
glassmorphism-and-purple-gradient look.

## Per-occupation SPARQL queries

A single query with `?person wdt:P31 wd:Q5` plus a `VALUES` union over all
occupations makes WDQS scan every human on Wikidata and reliably 504s. One query
per occupation with a sitelink floor returns in ~40s each.

## Verification demands 70%, not 100%

`gallery:verify` sources probe images from Commons categories, which contain
co-stars, group shots and posters. An early run "passed" only because the probe
was the same file used to build the index. The script now asserts the probe is
not the indexed image, filters candidates by surname, and requires ≥70% top-1
across multiple probes per subject.
