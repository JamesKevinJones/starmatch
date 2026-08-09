# State

_Last updated: 2026-08-09_

## Status: shipped

- Repo: https://github.com/JamesKevinJones/starmatch (`main`)
- Live: https://starmatch-liard.vercel.app

`starmatch.vercel.app` is taken by another Vercel account, hence the `-liard`
suffix. The canonical origin is derived from
`NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`, so attaching a custom domain later
needs no code change.

## What is done

- Gallery pipeline end to end: 374 licence-filtered portraits fetched, 366
  embedded (8 rejected — paintings and statues where no face was detected)
- Browser inference verified end to end: held-out 2014 photo of Keanu Reeves
  ranks him first at distance 0.512 / 99.4th percentile, ~2.3s including the
  first-run 12MB model download
- `gallery:verify` holding 71% top-1 on noisy held-out Commons probes
- All 13 routes prerendered static; typecheck and build clean
- Ethics, attribution, how-it-works pages read the real index at build time
- `gallery-curation` Claude Skill in `.claude/skills/`
- Lint clean (vendored Bklit chart code excluded, see `DECISIONS.md`)
- Verified in-browser: light and dark themes, mobile at 375px with zero
  horizontal page overflow, gallery search filtering 366 → 1, no console errors
- Theme applies pre-paint via an inline script, so there is no flash of the
  wrong theme and no hydration mismatch

## Doppelgänger mode (`/compare`)

Compares two user-supplied photos against each other. Deliberately does not
touch the gallery index, so two private individuals can be compared without
either being enrolled, searched for, or stored.

Verified: two photos of Keanu Reeves five years apart measure 0.371. The closest
pair of different people in the gallery is 0.377. Those are effectively the same
number, which is the clearest demonstration of the threshold problem in the
whole project — it is now cited on the ethics page.

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
