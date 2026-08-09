---
name: gallery-curation
description: Curate the StarMatch face gallery — add or remove a public figure, rebuild the embedding index and calibration, and verify top-1 accuracy before committing. Use when asked to add someone to the gallery, remove someone (including takedown requests), refresh the gallery, or investigate why a match looks wrong.
---

# Gallery curation

The gallery is a static index: `public/data/gallery.json` (metadata),
`public/data/embeddings.bin` (packed `Float32` descriptors, row `i` belongs to
`entries[i]`), and `public/data/calibration.json` (stranger-distance quantiles).

All three are **derived**. Never hand-edit them — regenerate.

## Non-negotiables

1. **Licence first.** A portrait may only enter the gallery if its Commons
   licence permits redistribution. `scripts/fetch-gallery.ts` enforces this via
   `FREE_LICENCE`. Do not widen that pattern to make an image fit.
2. **Public figures only.** The gallery exists because these people already have
   freely-licensed portraits published about them. Never add a private
   individual, and never add a way for users to enrol faces.
3. **Takedowns are honoured without argument.** If someone asks to be removed,
   remove them. No justification is required and none should be requested.
4. **Rebuild calibration whenever membership changes.** The displayed percentile
   is derived from every stranger pair in the gallery. Changing membership
   without re-running the build leaves the UI quoting stale statistics.

## Removing someone

```bash
# 1. Drop them from the fetched manifest
node -e "const fs=require('fs');const p='data/gallery-raw.json';const g=JSON.parse(fs.readFileSync(p));fs.writeFileSync(p,JSON.stringify(g.filter(e=>e.name!=='FULL NAME'),null,2))"

# 2. Regenerate index + calibration, then confirm nothing else broke
npm run gallery:build
npm run gallery:verify
```

Also delete `public/gallery/<QID>.jpg`. If `data/portraits/` is absent (it is
gitignored), run `npm run gallery:fetch` first — but note that will re-add the
removed person, so apply step 1 *after* fetching.

For a permanent block, add the QID to a denylist in `fetch-gallery.ts` rather
than relying on manual deletion surviving the next fetch.

## Adding someone

Prefer widening the query over hand-adding: lower the `sitelinks > 110` floor or
add an occupation QID in `OCCUPATIONS`, then re-run the pipeline. Hand-added
entries drift out of sync with the automated build.

If a specific person is genuinely needed, append an entry to
`data/gallery-raw.json` matching the `RawEntry` shape — including real
`licence`, `artist` and `descriptionUrl` values read from Commons, not invented
ones — put the image at `data/portraits/<id>.jpg`, then rebuild.

## After any change

```bash
npm run gallery:build     # re-embeds, repacks, recalibrates
npm run gallery:verify    # must stay >= 70% top-1
npm run build             # attribution + ethics pages read the index at build time
```

`gallery:verify` printing a *lower* count than before is a signal, not noise —
check whether portraits failed face detection (`noFace` in the build output).

## Debugging a suspicious match

- `/debug-match?src=/some-image.jpg` runs the real browser pipeline and prints
  the ranking as JSON.
- Distances cluster around 0.8 for strangers; anything under 0.6 is "same
  person" territory by convention, and the gallery contains stranger pairs as
  close as 0.377. A wrong-looking match near 0.6 is the model behaving normally,
  not a bug.
- If a gallery portrait is a painting, statue or group shot, the descriptor is
  unreliable. Removing it is usually the right fix.
