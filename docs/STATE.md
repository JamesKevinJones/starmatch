# State

_Last updated: 2026-08-10_

## Status: shipped

- Repo: https://github.com/JamesKevinJones/starmatch (`main`)
- Live: https://starmatch-liard.vercel.app

`starmatch.vercel.app` is taken by another Vercel account, hence the `-liard`
suffix. The canonical origin is derived from
`NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`, so attaching a custom domain later
needs no code change.

## What is done

- **2,066 faces**, every one carrying a Wikidata description and a Wikipedia
  link; zero entries showing a bare QID as a name
- Gallery pipeline reproducible end to end: fetch → build → verify
- Browser inference verified: a held-out photo of Keanu Reeves ranks him first
- Hover panel on every gallery card: description, photographer, licence,
  Wikipedia link
- Doppelgänger comparison at `/compare`
- Lint, typecheck and site build all clean; 14 routes prerendered static
- `gallery-curation` Claude Skill in `.claude/skills/`

## Doppelgänger mode (`/compare`)

Compares two user-supplied photos against each other. Deliberately does not
touch the gallery index, so two private individuals can be compared without
either being enrolled, searched for, or stored.

Verified: two photos of Keanu Reeves five years apart measure 0.371. The closest
pair of different people in the gallery is 0.377. Those are effectively the same
number, which is the clearest demonstration of the threshold problem in the
whole project — it is now cited on the ethics page.

## Accuracy degrades as the gallery grows

The single most useful result in the project, measured twice:

| Gallery | closest stranger pair |
| --- | --- |
| 366 faces | 0.377 |
| 2,066 faces | 0.3096 |

Top-1 accuracy is **80%** at 2,066 faces on a cleaned probe set. The earlier
57% figure was benchmark noise (waxworks, bystanders, surname collisions), not
a size effect - see `DECISIONS.md`.

At 2,066 faces the closest pair of *different* people (0.3096) is nearer than
two photos of Keanu Reeves five years apart (0.371). Face matching gets **less**
reliable as its database grows, which is the opposite of the common assumption.

`gallery:verify` scales its pass mark with gallery size for exactly this reason
— a fixed gate would fail on growth alone, which is the finding rather than a
regression.

## Deliberately not built

A "match against every named face online" index. Technically the false-match
rate scales with gallery size (the 0.377 finding above is from only 366 faces);
legally that product is Clearview AI, fined under GDPR in France, Italy, Greece
and the Netherlands and ruled unlawful in the UK and Australia. The gallery
stays limited to public figures with freely-licensed portraits.

## Outstanding — needs the user

**Deleting the old fork.** `JamesKevinJones/face_recognition` is still live. The
current `gh` token lacks the `delete_repo` scope and the refresh flow is
interactive, so it could not be done from an automated session:

```bash
gh auth refresh -h github.com -s delete_repo
gh repo delete JamesKevinJones/face_recognition --yes
```

This is irreversible. It was confirmed as intended; worth re-reading before
running. The fork had zero commits of its own, so nothing original is lost.

## Known limitations

- Gallery skews male, Western and historical — inherited from Wikipedia
  sitelink ranking. Documented on `/ethics` rather than corrected.
- `verify` failures are two-person film stills where the detector picks the
  co-star, not matcher errors.
- `motion` is pinned to v12; v13's `AnimatePresence` freezes the matcher.

## Sensible next steps

- Lower the `sitelinks > 110` floor and add occupations to broaden the gallery,
  which would also improve its demographic balance
- Add a denylist in `fetch-gallery.ts` so takedowns survive a re-fetch
- Attach a real custom domain
