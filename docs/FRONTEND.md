# Frontend engineering rules

Hard-won defaults for building web UI. Every rule here comes from a specific
failure, and the failure is named so you can judge whether it applies to you.

This file is the canonical copy. Claude Code, Cursor, Codex and Antigravity all
read it â€” see `_agent-framework/frontend/README.md`. Edit it here, re-run the
installer, never edit the copies.

---

## 1. Motion: one library per layer

Four animation libraries can coexist. Two libraries animating the same property
cannot. Assign each a job and hold the line:

| Layer | Owns |
| --- | --- |
| Lenis / smooth scroll | scroll position |
| GSAP + ScrollTrigger | anything scroll-linked |
| Motion (Framer) | component state and layout transitions |
| anime.js | numeric counters, SVG stroke drawing |

**Drive smooth scroll from the GSAP ticker**, not its own rAF loop. Two loops on
different clocks disagree by a frame, which shows up as jitter on pinned
sections:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

**Every animation checks `prefers-reduced-motion`**, and the CSS layer catches
whatever the JS missed:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Don't spin up a WebGL context at all for reduced-motion users.

### AnimatePresence takes exactly one child

`mode="wait"` with several conditional expressions â€” most evaluating to `false` â€”
leaves the exit animation unresolved and the component frozen on its first state
forever. Select the view in a `switch` and render one keyed node.

### Pin the animation library, and prove it swaps

`motion@13.0.0` shipped an `AnimatePresence` that never completed its exit
animation. State updated, React re-rendered, and the presence wrapper kept
rendering the outgoing child indefinitely â€” a matcher UI sat permanently on its
loading state. Pinned to v12.

The symptom is indistinguishable from "my state isn't updating." Diagnose it by
rendering the state to a `data-*` attribute outside the presence wrapper: if the
attribute changes and the visible child doesn't, it's the wrapper.

---

## 2. Theme lives in the DOM, not React state

`useState` + `useEffect` renders the wrong theme for one frame on every load, and
trips `react-hooks/set-state-in-effect`.

Apply it in a blocking inline script before first paint, let the toggle mutate
the attribute directly, and swap the icon in CSS. No state, no flash:

```html
<script dangerouslySetInnerHTML={{ __html:
  `(function(){try{var s=localStorage.getItem('theme');
   var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
   var r=document.documentElement;r.dataset.theme=d?'dark':'light';
   r.classList.toggle('dark',d)}catch(e){}})()` }} />
```

- `suppressHydrationWarning` on the element the script mutates â€” the mismatch is
  deliberate, and without it React logs a hydration error on every load.
- **Set both `data-theme` and `.dark`** if any third-party tokens key off a
  class. Mixing conventions puts charts in light mode on a dark page.

---

## 3. Decoration must never cost legibility

Confine shaders, gradients and generative backdrops to a background layer. UI
chrome stays flat and hard-edged.

A full-strength dither shader behind hero body copy made the paragraph unreadable
â€” and I only caught it by taking a screenshot. Fix: cap the layer's opacity and
lay a scrim that fades from the page background across the text column.

```jsx
<div className="absolute inset-0 -z-10 opacity-40">{/* shader */}</div>
<div className="absolute inset-0 -z-10
     bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
```

**Look at the rendered page.** Contrast bugs are invisible in code review and
obvious in a screenshot.

---

## 4. Build one primitive, then compose

Pick a visual language and express it as a single class plus tokens, rather than
scattering values:

```css
.brut {
  border: 3px solid var(--line);
  background: var(--panel);
  box-shadow: 6px 6px 0 0 var(--ink);
}
```

Dark mode inverts surfaces via CSS variables while the structure stays fixed.
Brutalism in the dark means bright rules on near-black, not grey-on-grey.

Keep a visible focus ring. A hard-edged design has no excuse for poor a11y:

```css
:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
```

---

## 5. The UI must not state things the data doesn't support

Three distinct failures, one principle.

**Don't render a bucket as a claim.** A gallery tagged each person with whichever
query matched them first. Anyone with a single acting credit landed in "actor",
so a card read *"Donald Trump â€” actor."* The field was real; the claim was not.
Use it to filter, label it "category", never present it as fact.

**Don't invent precision.** Mapping a distance to a percentage with
`100 * (1 - d)` produces a number that looks authoritative and means nothing.
Derive from measured data â€” an empirical percentile against a real distribution â€”
or show the raw value with its units.

**Show nothing rather than a wrong fallback.** `{description || occupation}`
looks defensive and quietly emits falsehoods. If the good field is missing, omit
the line.

---

## 6. A feature nobody can find is a broken feature

A hover panel was deliberately gated behind an active search. Hovering a card did
nothing, which reads as a bug, and it was reported as one.

If a feature only appears under a condition the user can't see, either surface
the condition or drop it. Discoverability beats tidiness.

Anything revealed on hover needs a keyboard path â€” `onFocus`/`onBlur` alongside
`onMouseEnter`/`onMouseLeave`, and a real `tabIndex`.

---

## 7. Vendored registry code is not yours

Components pulled from a registry (shadcn and friends) are third-party source
that happens to live in your tree.

- **Exclude them from lint.** Rewriting 58 files or burying them in inline
  disables both turn the next registry update into a merge conflict.
- **Expect them to ship broken.** One install produced `var(----chart-1)` (four
  dashes) and an import of `../components/x` that resolved outside the tree. Fix
  at the seam and comment why.
- **Retint their tokens** to your palette so they don't look bolted on.

**Never coerce your data into a component whose shape misrepresents it.** A
time-series chart wants a date axis; ranked categorical data forced through one
is a lie about the data. Drop to the underlying primitive (visx, d3) and keep the
registry's tokens.

---

## 8. Verify by looking, and measure before claiming

**A green test that tests the wrong thing is worse than no test.** A face
benchmark reported 57% accuracy. The failures turned out to be a Madame Tussauds
waxwork, a photo of a fan looking at a picture of the subject, and a surname
collision. Same code, corrected test set: 80%. The number was measuring the
benchmark, not the system.

Before trusting a metric, print the inputs that produced each failure.

**Measure both sides of an "improvement."** Flip-augmentation is a standard cheap
win, so it looked obviously worth adding. Measured: identical accuracy, double
the cost â€” and the naive form pulled impostors closer too. It was rejected on the
numbers and kept behind a flag so the negative result stays reproducible.

**State the uncertainty.** 8/10 is a 95% CI of roughly 49â€“94%. Quoting "80%" from
ten samples implies rigour the sample doesn't support.

For UI specifically: scripted synthetic events lie. Dispatching `mouseenter`
directly does not trigger React's delegated `onMouseEnter`, so a broken hover can
test green. Drive a real pointer, or take the screenshot.

---

## 9. Accessibility that survives the visual concept

- Decorative text effects (scramble, split, decrypt) render the **real string in
  an `sr-only` span** and the effect in an `aria-hidden` one. Screen readers and
  crawlers never see scrambled glyphs.
- Skip link first in the DOM.
- Icon-only buttons get a stable `aria-label` that doesn't change with state; let
  CSS swap the glyph.
- Wide content (tables, charts, marquees) scrolls inside its own
  `overflow-x: auto` container. The page body never scrolls horizontally â€” check
  at 375px.

---

## 10. Deploying is not pushing

A CLI-created Vercel project is not necessarily linked to the repo. Three
commits sat pushed and undeployed while the feature "wasn't working."

After shipping a user-visible change, **fetch the live URL and confirm the change
is in the response** â€” not just that the build passed.
