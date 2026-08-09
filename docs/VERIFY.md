# Verify

Proof commands, in the order worth running.

## Types and build

```bash
npm run typecheck
npm run build
```

Expect: clean typecheck, and all routes prerendered as static.

## Index correctness (the one that matters)

```bash
npm run gallery:verify
```

Downloads a *different* Commons photo for each of several people already in the
gallery and checks they rank first. Asserts ≥70% top-1 over ≥5 usable probes.

Last run: **10/14 (71%)** across 8 subjects. Correct matches show clear margins,
e.g. Obama 0.440 vs runner-up 0.616; Kidman 0.358 vs 0.552. The failures are
two-person film stills where the detector picked the co-star.

A probe that duplicates the indexed image is reported as a failure, not a pass —
that mistake made an early run look like 4/4 when it proved nothing.

## Browser inference

```bash
npm run dev
```

Then open `/debug-match`. It runs the real client pipeline against the held-out
fixture and prints JSON:

```json
{
  "ok": true,
  "facesFound": 1,
  "confidence": 0.994,
  "elapsedMs": 2273,
  "descriptorLength": 128,
  "top": [{ "name": "Keanu Reeves", "distance": 0.512, "percentile": 99.4 }]
}
```

The 0.512 here vs 0.520 from the Node build is the WebGL/WASM backend
difference, and is expected.

## Full UI flow

On `/match`, the phase machine exposes `[data-probe-phase]` for assertions
(`idle → working → done`). Drop in any portrait; the result view should show the
detected face chip beside the matched portrait, a percentile ring, ranked
runners-up, the 128-bar descriptor, and the distance chart.

## Accessibility spot-checks

- Every animation path checks `prefers-reduced-motion`; the CSS layer also kills
  anything missed.
- `ScrambleText` renders the real string in an `sr-only` span so screen readers
  and crawlers never see scrambled glyphs.
- Focus rings are 3px and never removed.
