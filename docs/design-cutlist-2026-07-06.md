# Bower home page — design cut-list (2026-07-06)

Authoritative, implement verbatim. Baseline: 17 screens / 1,868 words / 12 content sections.
Target after this pass: **~8 screens, ~7 content beats, ≤ 900 words of hand-authored prose.**
All three evaluators converged; this is not more critique, it is the exact decision on every
open question they raised.

---

## 1. HERO — copy visible at p=0

> **DANIEL OVERRIDE 2 (2026-07-06, FINAL — supersedes both the split layout AND the
> copy-visible-from-mount overlay):** the hero keeps its ORIGINAL choreography. p=0 shows only
> the centered Oculus logo, full-bleed, no copy. Scroll reveals logo → gridshell → render across
> the full page. The copy/CTAs arrive at the END of the scrub over the finished render
> (COPY_IN reinstated at [0.8, 0.94] on the 210vh wrapper for real pinned dwell; STATS_IN
> arrives with the copy). The evaluators' "no value prop at p=0" finding is consciously
> overruled by Daniel's taste: the reveal IS the pitch. Retuned thresholds, intro smoothing,
> 7-beat structure, /engine route, copy text, and cosmetic fixes all stand.
>
> **DANIEL OVERRIDE 1 (2026-07-06, superseded the split-layout decision below):** the 2D Oculus →
> 3D → render scrub stays FULL-PAGE, exactly as built (absolute inset-0 layers). No split
> layout, no 42% right pane, no HeroScene camera reframing. The p=0 fix is delivered by
> overlay instead: HeroCopy renders in its existing bottom-left gradient overlay, visible from
> mount (one-time 400ms opacity 0→1 / y 12→0 entrance), persisting over the full-bleed visual
> for the whole scrub. COPY_IN is still removed. The STATS_IN annotation strip lives inside
> that same copy overlay block, fading in at p ≥ 0.76. All threshold values in the table below
> still apply. The split-layout text below is kept for the record only.

**Diagnosis accepted:** `HeroReveal.tsx` currently gates `HeroCopy` behind `COPY_IN:[0.9,1.0]`
(scroll-linked opacity in `ScrubHero`'s effect, `HeroReveal.tsx:190-193`). Nothing but the
Oculus mark is visible until 90% of a 280vh scrub. This is the #1 risk (Lelouch, Senku both
rank it #1/#2).

**Decision: SPLIT LAYOUT, not "copy fades in earlier."** Reuse `PosterHero`'s existing
proportions (`HeroReveal.tsx:130`: `flex md:flex-row items-center justify-between`, copy left,
`OculusPlate` right at `md:w-[42%]`) as the persistent frame for `ScrubHero` too. Concretely:

- Wrap the sticky stage's content in the same `mx-auto flex max-w-[1120px] flex-col
  md:flex-row items-center justify-between px-6 md:px-10` container `PosterHero` uses.
- Left slot: `HeroCopy`, **unchanged text**, rendered at opacity 1 from mount. Replace the
  scroll-linked `copyRef` opacity/transform block (`HeroReveal.tsx:190-193`) with a single
  one-time entrance: opacity 0→1, y 12→0, 400ms ease-out, on mount — not tied to
  `scrollYProgress`. No stagger (matches the portfolio-site "instant load, single hero fade"
  convention already in use elsewhere).
- Right slot (`md:w-[42%]`): the existing layered `oculusRef` + `canvasRef` stack, resized
  into this slot instead of `absolute inset-0` full-bleed. The scroll-driven fade/tilt/resolve
  logic is unchanged, just confined to this pane.
- Mobile (`<md`): stacks copy-then-visual in normal flow (same as `PosterHero`'s mobile
  behavior) — copy is the first thing read, no scroll required.
- Flag for Edward: `HeroScene.tsx` camera framing currently assumes a full-width canvas;
  confirm the pavilion still reads clearly composed inside a ~42%-wide pane (may need a
  narrower FOV or tighter default zoom). This is the one non-trivial follow-up, not pure CSS.

**HERO_THRESHOLDS — final values** (`HeroReveal.tsx:31-44`):

| constant | old | new |
|---|---|---|
| `WRAPPER_VH` | 280 | **210** |
| `OCULUS_OUT` | [0.12, 0.25] | **[0.08, 0.2]** |
| `CANVAS_IN` | [0.12, 0.25] | **[0.08, 0.2]** |
| `TILT` | [0.25, 0.6] | **[0.2, 0.5]** |
| `RESOLVE` | [0.6, 0.9] | **[0.5, 0.76]** |
| `COPY_IN` | [0.9, 1.0] | **removed** (copy is no longer scroll-gated) |
| new: `STATS_IN` | — | **[0.76, 0.88]** |

Mirror `TILT`/`RESOLVE` in `SCENE_THRESHOLDS` (`HeroScene.tsx:27`) exactly as Edward proposed.

**`STATS_IN` reward strip (new, small):** once the render resolves (p ≥ 0.76), fade in one
`AnnotationStrip` beneath the right-pane visual — this is the scroll's payoff *and* the honest
price anchor Senku asked for, without inventing a "from £" range we haven't verified as a
minimum. Reuse the exact live values already computed for `outputs` (same pattern as
`SplashPage.tsx:96-98`):

```
footprint {geometry.footprintM2.toFixed(1)} m² · rise {geometry.riseM.toFixed(2)} m · this shape, priced live: {gbp(price.fixedTotalGBP)}
```

No new copy string, no new data — literal reuse of numbers already on the page.

---

## 2. INTRO — smoothing spec (accept Edward's params, final numbers below)

`BowerIntro.tsx`. Total intro time: **3800ms → 3000ms** (21% shorter, lands in the 2.4–3.0s
target at the top of the range because it's the safest cut that still reads as considered,
not rushed).

- **Drop letter blur+rotate+x, opacity+y only** (`BowerIntro.tsx:188-203`): remove
  `filter: 'blur(4px)'→'blur(0px)'`, remove `rotate`/`x` from both `initial` and `animate`.
  Keep `y` offset (`OFFSETS[i].y` unchanged), keep the `0.07 * i` stagger delay and `0.72`
  duration — letters still finish ~1.0s in, now with zero repainted blur.
- **`T.travel: 1600 → 1150`** (`BowerIntro.tsx:60`). Cuts the ~600ms dead hold after letters
  finish assembling (~1.0s) down to a ~150ms beat, which reads as a deliberate pause, not lag.
- **`LOGO.settleDur: 1.35 → 1.25`** (`BowerIntro.tsx:53`). Settle now runs 1150→2400.
- **`T.fade: 2900 → 2500`** (`BowerIntro.tsx:60`). Fade now starts 100ms after settle
  completes (2400) — logo is fully still before the backdrop starts clearing (fixes Edward's
  "logo still moving as veil lifts" finding).
- **Backdrop fade transition duration: `0.9 → 0.5`** (`BowerIntro.tsx:153`, the
  `motion.div` backdrop `transition`). Fade now completes at 2500+500 = 3000.
- **`T.done: 3800 → 3000`** (`BowerIntro.tsx:60`) — matches fade completion exactly.
- **`scrollRestoration` fix**: in the effect that calls `setActive(true)`
  (`BowerIntro.tsx:81-90`), when the intro is about to play also set
  `window.history.scrollRestoration = 'manual'` and `window.scrollTo(0, 0)`; restore
  `scrollRestoration = 'auto'` in the `T.done` cleanup (`BowerIntro.tsx:112-119`, the same
  `setActive(false)` timeout) so normal back/forward scroll restoration resumes once the
  one-time intro is over. Fixes the "coincident logos don't coincide" bug on reload.

---

## 3. PAGE STRUCTURE — final section order (12 → 7 content beats)

**Resolution of the 6→2 vs "promote earlier" tension:** rather than keeping HowItWorks as a
2-section island, its two surviving pieces of content (pipeline mechanics + honesty) get
**folded into a single new section promoted to position 3** (right after Becoming), and its
strut-field content merges into the existing Habitat section. Sun-path and Growth-phases move
fully behind a restored `/engine` route. Net result: same 2 credibility payloads Lelouch wants
kept, positioned exactly where Senku wants them (near the top, ~150 words), with fewer total
sections than either memo proposed alone.

**Final order:**

1. **Hero** (scrub, ~2.1 screens — see §1)
2. **Becoming** (chartreuse) — trimmed, one paragraph (see §4)
3. **The Engine** (vellum, `id="how-it-works"`) — NEW merged section: pipeline mechanics +
   `PipelineSchematic` + `SiteEnvelopeDiagram` (single instance) + condensed honesty coda +
   one `/engine` deep-link. Replaces: old pitch sec 3, HowItWorks secs 1, 2, and 6.
4. **The Commission Ritual** (blue) — unchanged, kept verbatim (Lelouch: keep, "tight, numbered")
5. **Habitat** (yellow) — kept, BNG paragraph cut, strut-field content from HowItWorks sec 4
   merged in, single `StrutFieldDiagram` instance (was 2)
6. **Close / Register** (vellum, `id="register"`) — trimmed to one purpose: register email
7. **Footer monument** (unchanged)

**Cut entirely from the home page (content, not just diagram):**
- HowItWorks sec 1 (generative-engine intro banner) — folded into section 3's opening.
- HowItWorks sec 3 (Solar geometry / `SunPathDiagram`) — moves to `/engine` only.
- HowItWorks sec 5 (Growth phases / `GrowthPhasesDiagram`) — moves to `/engine` only.
- Compact ritual restatement in Close (`SplashPage.tsx:191-194`) — deleted, not moved.
- Repeated `#how-it-works` CTA in Close (`SplashPage.tsx:196-201`) — deleted, not moved.
- Becoming's second paragraph (`SplashPage.tsx:62-65`) — deleted.
- Habitat's Biodiversity Net Gain paragraph (`SplashPage.tsx:143-148`) — deleted.

**`/engine` route (restored):** the *entire, unmodified* 6-section `HowItWorks` component
(all six original sections, verbatim, including sun-path and growth) becomes a real standalone
page at `routes.engine` (add this route constant next to `routes.studio` if it doesn't exist).
Wrap it in a thin `EnginePage` component that restores the `min-h-screen` page chrome the
original comment says was stripped when it got folded into the home scroll
(`HowItWorks.tsx:8-9`). This is where "See the full engine walkthrough" points — full detail
for whoever wants it, zero content lost, just not gating the home page.

**CTA count: 3 → 2 distinct destinations.** Nav "how it works" + Hero's primary CTA both point
to `#how-it-works` (now section 3, much closer than before). Section 3 itself carries the one
`/engine` deep-link for full detail. Close carries zero CTA back up the page — just the
register form. No CTA is repeated verbatim twice.

---

## 4. COPY — exact replacement text, section by section

**House rules applied throughout:** no em/en dashes (mid-clause pauses become a period or a
comma); the "not X, Y" chiasmus appears **at most twice on the whole page** (both uses below
are marked ⟨CHIASMUS 1/2⟩ — every other instance across the cut sections is gone because those
sections are cut or rewritten as plain declaratives); "cannot fake," "prices itself as you
do," "no finished photograph," and "not AI generated art" are gone everywhere; no page as a
moral agent ("the page would rather say so than pretend"); the honest-placeholder-price
admission survives, once, in section 3's coda.

### Becoming (`SplashPage.tsx:56-65`)
Delete the second paragraph entirely. Replace the first paragraph with:

> Every Eden is planted the day it is built. It arrives quiet, a bare lattice and a young
> climber at its feet. Each season after, it holds more leaf, more flower, more shade than the
> season before.

Headline unchanged: "A structure that keeps *becoming*."

### The Engine (NEW section, replaces `SplashPage.tsx:73-100` + `HowItWorks.tsx:37-89`)

Eyebrow: `What the engine actually does`

Headline ⟨CHIASMUS 1 — the sanctioned reframe of Senku's "false dichotomy" flag⟩:
> Not a catalogue of shapes. A grammar that computes **one**.

Body:
> Four things you shape, footprint, rise, lattice spacing, and the direction it opens, pass
> through a fabrication grammar before they reach the geometry: a set of stated cutting rules
> that recomputes each control's limits for the design in front of you. A small footprint
> pulls the rise cap down, because a flatter crown keeps every component inside the cutter's
> tolerance. Widen the footprint far enough and the engine adds a fourth foot, because an edge
> blank would otherwise run longer than a CNC sheet. What the grammar allows then runs through
> the same functions every time: geometry, cut list, nesting, sun path, ecology. Given the
> same choices, the engine produces the same pavilion, every time.

Diagrams: `PipelineSchematic` + one `SiteEnvelopeDiagram` (keep HowItWorks's richer
annotation strip, `HowItWorks.tsx:82-88`, footprint/rise/spacing/feet/rings/spokes + grammar
note — this is the version Edward flagged to keep).

Honesty coda, same section, hairline-divided beneath the diagrams (folds HowItWorks sec 6,
`HowItWorks.tsx:171-194`):

Sub-eyebrow: `What is real and what is a rule of thumb`

> Structural validity here means inside a designed family, not an engineer's sign-off on
> every shape. Every control is clamped to the grammar before the geometry is built, which is
> what guarantees a buildable structure. The honest limit: widening that family still takes a
> chartered engineer, one sign-off at a time. The ecology figures are rule-of-thumb formulas,
> not a certified survey, and move honestly with the design. The price recalculates correctly
> from the same cut list a fabricator would quote from; the per-component rate itself is still
> a placeholder until a fabrication shop returns a real quote.

Deep-link, same mono-underline style as elsewhere:
> `See the full engine walkthrough →` → `routes.engine`

### The Commission Ritual (`SplashPage.tsx:105-127`)
Unchanged verbatim. Kept per Lelouch's explicit "keep."

### Habitat (`SplashPage.tsx:130-169`)
Keep the opening paragraph verbatim ⟨CHIASMUS 2 — the only other sanctioned instance⟩:
> The lattice is not just a frame, it is a living armature. [...same as current, unchanged...]

Delete the Biodiversity Net Gain paragraph (`SplashPage.tsx:143-148`) entirely. Replace its
slot with the merged strut-field paragraph (folds HowItWorks sec 4, `HowItWorks.tsx:130-143`,
cuts the "cannot fake" line and the black-box-optimizer aside per Senku's "diagram beats
prose"):

> The support pattern is computed for how the chosen plant physically climbs: twining stems
> want close verticals, tendrils want a fine mesh, self-clinging roots want almost nothing,
> layered against where the sun falls hardest on the structure. Change the species and the
> fine support pattern changes with it. The load-bearing frame itself never does.

Diagram: single `StrutFieldDiagram` (was 2 across the page). `StaysRow` / `PD_FACT` /
`EcoFacts` row unchanged.

### Close / Register (`SplashPage.tsx:180-204`)
Headline unchanged: "Two ways to *begin*."

Body, trimmed:
> If you want to see the reasoning first, the engine section above lays out exactly what is
> computed and what is a rule of thumb. If you would rather put your name down, that takes
> ten seconds.

Delete the compact ritual line (`SplashPage.tsx:192-194`) and the repeated `#how-it-works`
link (`SplashPage.tsx:196-201`) entirely. `RegisterInterest` stays, unchanged content, id/name
fix per §6.

---

## 5. Constraints honored

- **No photography spec here.** Senku's #1 lever (real/planted precedent photography near the
  hero) is real and important, but no photography exists yet. This is a **recommendation for
  Daniel + Clay** to source or commission photography of a built precedent, not a design spec
  for fake/placeholder photos. Flag to Lelouch/Nami as a pre-Jul-17 action item outside this
  cut-list's scope.
- **Price anchor**: the `STATS_IN` hero strip (§1) and the honesty coda (§4) are the only two
  price mentions kept; both use the live `fixedTotalGBP` for the current default shape, worded
  as "this shape, priced live," not "from £X" — we have not verified fixedTotalGBP is a true
  minimum across the footprint range, so "from" would be an unverified claim.
- **Design language stays**: field ground colors, hairline diagrams, serif/mono type system
  (`typeScale.ts`) all untouched. No new tokens, no new fonts.
- **`#/studio` untouched.**

---

## 6. Cosmetic fixes

- **Green edge sliver** — not a layout bug. This is the styled webkit scrollbar thumb
  (`index.css:63-69`, `rgba(122, 139, 60, 0.35)`, 7px, transparent track). It reads as a stray
  artifact in static screenshots because the thumb happened to be mid-track when captured.
  Recommend Edward confirm this in a live scroll (thumb moves, auto-hides per OS/browser) — no
  code change needed. If it still reads as too present against the pale vellum grounds, drop
  opacity 0.35 → 0.22, nothing more.
- **Orange pennant cone** — real bug, found: `GardenContext.tsx:62-66`, a coral (`#E06A4E`)
  `coneGeometry` north-marker rendered unconditionally in the shared ground context, which
  `HeroScene.tsx` and `Scene.tsx` (Studio) both mount. It's a wayfinding aid for the Studio's
  aperture-bearing slider and is meaningless in the passive hero render, which is why it pokes
  into frame bottom-left mid-scrub with no explanation. Fix: add a `showNorthMarker?: boolean`
  prop to `GardenContext` (default `true`), wrap the cone mesh (`GardenContext.tsx:62-66`) in
  `{showNorthMarker && (...)}`, and pass `showNorthMarker={false}` from `HeroScene.tsx`. Studio
  keeps the marker; Hero loses it entirely.
- **`RegisterInterest` input** (`RegisterInterest.tsx:41-48`): add `id="register-email"
  name="email" autoComplete="email"` to the `<input>`. Clears the console warning; the
  existing `<label>` wrapping already handles a11y association, this is purely the
  autofill/name-attribute fix.

---

## Summary of scroll-length impact

Baseline 17 screens / 1,868 words / 12 sections → **~8 screens / ~850-900 words / 7 sections**
after this pass (hero counted at its new ~2.1-screen scrub length). Every cut is either a
duplicate (diagram or CTA shown twice), a personification/rhyme flagged by the language audit,
or content demoted to the restored `/engine` route rather than deleted outright.
