# Splash polish — copy + design spec

Author: Sai (Product Designer) · 2026-07-08 · Docs-only, no source touched. Design and
copy only; Edward is the single writer against this spec so we never touch the same
files. Target surface: `src/pages/SplashPage.tsx`, `src/pages/splash/*`,
`src/pages/splash/copy.ts`. Branch: `integrate/manufacturing-engine`. Palette
throughout stays the existing documentation-layer contract: `paperVellum`, `inkBlack`,
`inkNavy`, `accentOlive` as the one functional accent, no decorative blue anywhere, no
em/en dashes in any copy (the house rule the `deDash`/copy tests already enforce).

Five items, ordered by the priority given: copy first, then the two visual/motion
signature moments (the becoming diagram, the Eden word), then the two chrome-level
polish items (nav, cursor).

## 1. Copy rewrites (highest priority)

### 1.0 What I did and didn't touch, and why

Daniel's approved two-sentence framing for the product ("Bower is a design engine that
grows buildable architecture from a single gesture...") describes where the product is
headed, spine-drawing and all (see `docs/interaction/hai-spine-drawing-concept.md`,
this session, explicitly faux/concept-only). The live splash still, correctly,
describes what's actually built today: four sliders, a fabrication grammar, direct
manipulation. I used Daniel's framing for **tone** (warm, plain, confident, one flowing
sentence at a time) and did not import its **claims** (drawing intent, gesture as
input) into copy that has to stay honest about the shipped engine. Flagging this
explicitly because it's exactly the kind of overclaim every prior spec on this branch
has been careful to avoid, and I didn't want the correct instinct (match Daniel's
voice) to accidentally smuggle in the wrong instinct (describe a feature that isn't
built).

I reviewed every heading and body paragraph SplashPage.tsx renders, `copy.ts` in full,
and RegisterInterest.tsx. What follows is everything that's genuinely the "rigid,
aphoristic, staccato" pattern Daniel named, not a rewrite of everything I could find to
touch. Left alone, deliberately: the hero headline and mission line in `HeroReveal.tsx`
(`Grow a living Eden in your garden.` / `Rewilding gardens through architecture anyone
can build.`) are already single flowing sentences, not fragments. The ritual list in
`copy.ts` (`ritualSteps`) is a numbered-step register, like a recipe, where a verb-less
fragment per line (`Days to raise, ground screws, no slab, no wet trades`) is the
*correct* form, not an accidental staccato lapse, so I left that list's register
alone (see 1.4 for the one line in it that's genuinely just poorly worded, not a
register issue). The two ecology/annotation-strip strings in `copy.ts` are mono-tag
lists, not prose, same reasoning.

### 1.1 The flagship line

`src/pages/SplashPage.tsx:77`

```
OLD: Not a catalogue of shapes. A grammar that computes <em className="italic">one</em>.
NEW: Instead of a catalogue of shapes to choose from, a grammar computes the <em className="italic">one</em> that's yours.
```

Keeps the antithesis (no shelf of preset shapes, a computed one instead) and keeps the
italic landing on the same word, `one`, so the existing `<em className="italic">`
markup barely moves. Reads as one breath, not two blunt halves.

### 1.2 The same pattern, one section down

`src/pages/SplashPage.tsx:80-83` (full paragraph for context, only the final clause
changes)

```
OLD (line 82, end of paragraph): ...time: geometry, cut list, nesting, sun path, ecology. Same choices, same pavilion.
NEW:                              ...time: geometry, cut list, nesting, sun path, ecology, so the same choices always mean the same pavilion.
```

Full paragraph after the change: "You shape four things: footprint, rise, lattice
spacing, and the way it opens. A fabrication grammar clamps them to what a cutter can
actually make, then the same functions run every time: geometry, cut list, nesting,
sun path, ecology, so the same choices always mean the same pavilion." One sentence
where there were two, the colon-introduced list untouched (that part already read
fine), only the bolted-on closer folded in with `so`.

### 1.3 The ritual section's closing line

`src/pages/SplashPage.tsx:123`

```
OLD: You shape it, we cut it, you plant it. This is the whole of it.
NEW: You shape it, we cut it, you plant it, and that's genuinely the whole of it.
```

Keeps the tricolon rhythm (shape / cut / plant, a good device, not the problem) and
removes the hard stop that turned the payoff line into a second, disconnected
fragment.

### 1.4 Two secondary, lower-priority fixes

These aren't the "aphoristic staccato" pattern Daniel named, but I noticed them while
reading closely and they're both genuinely rough on their own terms. Optional, include
if Edward's already in the file.

`src/pages/SplashPage.tsx:183-184`
```
OLD: See the reasoning in the engine section above, or put your name down. That takes ten
     seconds.
NEW: See the reasoning in the engine section above, or just put your name down, which
     takes about ten seconds.
```

`src/pages/splash/copy.ts:25` (ritual step 3 — the comma-interruption reads like a
stray aside, not a fragment-list problem)
```
OLD: `We cut, flat CNC-cut timber, ~${componentCount} components from the live cut list`
NEW: `We CNC-cut ~${componentCount} flat timber components from the live cut list`
```

## 2. "A structure that keeps becoming" — a real visual (#3)

### 2.0 What's actually wrong with what's there

`SeasonalBecomingDiagram.tsx` isn't a placeholder in the empty-div sense, it's a fully
built, live-data-driven three-panel SVG (real `canopyProfile` silhouette, foliage count
driven by the real `computeGrowth().leafDensity01`). What it lacks is craft: the
foliage is anonymous dots, and this is the ONE section SplashPage's own comments call
"the emotional core" of the page, sitting directly under a hero and directly above the
mechanically-precise engine section. A dot scatter is the right move for the Engine
page's `GrowthPhasesDiagram` (technical register, annotated with real numbers). It's
the wrong move here, where the copy above it ("a bare lattice and a young climber")
is making an emotional claim the diagram should visibly earn, not just gesture at.

### 2.1 The fix: real ink botanical linework, not photography

Two changes, both staying inline SVG (already the cheapest-and-highest-craft medium
available, zero new asset weight, and the only honest choice: there's no built Eden to
photograph yet, and a photoreal render here would overclaim exactly the way every other
spec on this branch is careful not to).

**Foliage: swap the dot primitive for a small hand-inked leaf/tendril vocabulary.**
Author 5-6 unique leaf/tendril `<path>` shapes at the same ink weight the hairline
diagrams already use (0.5-0.75px stroke, no fill, or a very light fill at 0.15-0.2
opacity so panel 3's fuller foliage reads as coverage rather than a wireframe cloud).
Keep the exact same placement algorithm (`foliageDots`'s deterministic
low-discrepancy scatter, unchanged, still driven by the real `leafDensity01` count) and
just change what gets drawn at each point: instead of `<circle r={0.85}>`, pick one of
the leaf variants deterministically off the same index (`i % 6`), scale it small
(roughly the same footprint the dot occupied) and rotate it a small deterministic
jitter amount for organic variety, not randomness (matches the file's own existing
"deterministic, not random" discipline in `foliageDots`).

**Understructure: draw the actual lattice, not just the silhouette outline.** Right
now panel 1 ("just placed") shows an empty rounded outline with almost no dots inside
it, which reads as "an empty shape," not "a bare lattice," undercutting the copy above
it. Add a light diagrid hint under the foliage in all three panels, a handful of
representative strut lines (not the full engine member list, a cheap sampled
approximation the same way the silhouette itself already is one) radiating from the
ground line to the crown, same ink weight as the silhouette stroke, lower opacity
(~0.35) so it reads as structure without competing with the foliage sitting on top of
it. This is the single highest-value addition: it makes panel 1 legibly "a bare
lattice and a young climber" instead of "an outline," which is the exact claim the
copy right above it is making.

**One accent mark, panel 3 only.** `hairline.tsx`'s own rule, already followed
everywhere else in this doc-layer: exactly one `accentOlive` mark per diagram, "olive
marks where life attaches, never decoration" (`OculusMark.tsx`'s own phrasing for the
same rule). Add one small accent mark at a flower position in the "in full leaf" panel
only, no leader line, no callout text (this diagram stays durationless and numberless
by its own existing constraint, unchanged) — just the single mark, the same restrained
payoff device `GrowthPhasesDiagram` already uses on the Engine page, toned down to fit
this page's quieter register.

**Lightweight, confirmed.** All of this stays inline SVG, computed from data already
in the component's props. Zero new network requests, zero raster assets, no change to
the page's load profile. The "cheapest high-craft way" the brief asks for is: better
ink, not a different medium.

## 3. The hand-drawn "Eden" (#2)

### 3.0 Two tracks, ordered by craft

The brief explicitly offers both: bigger-but-same-font as the floor, an SVG
stroke-drawn path as the ceiling. Given this is the one cursive word in the whole
system (`data/config.ts`'s own `fontFamily.handwrite` comment: "the one 'Eden' word in
the hero headline") and it's the emotional payoff of the whole hero reveal, I'd build
the ceiling, not the floor. Both are specified below so Edward can choose based on
time budget; Track A is a genuine, valid improvement on its own if Track B doesn't fit
this pass.

### 3.1 Track A — bigger Dancing Script, restructured to fit

Today `Eden` sits inline at `text-[1.15em]` inside the h1 sentence
(`HeroReveal.tsx:74-86`). Scaling that multiplier up much further inside the same
inline flow risks exactly the "not well-fit" failure the brief is warning against, an
oversized glyph colliding with the line above or below at narrow viewports.

Fix: break the word out of the inline sentence flow onto its own line, three-part
stack instead of one wrapped paragraph:

```
Grow a living
        Eden          ← drastically larger, its own line
in your garden.
```

- `Eden` gets its own `clamp(3.5rem, 11vw, 8rem)` (roughly 2.3-2.7× the surrounding
  `H1`/hero clamp at any given viewport), `leading-[0.85]` to keep the tall cursive
  ascenders/descenders from forcing extra line-height everywhere else.
- The two plain-text lines stay at the existing hero size, keeping the sentence
  legible and grammatically whole (accessibility: the semantic `<h1>` text content is
  still one real sentence, only the visual line-breaks change).
- `CopyBand`'s current `pt-28 pb-10/12` padding was sized for the current one-line
  headline; flag for Edward that the band needs roughly one extra line-height of
  headroom to fit the taller stacked layout without the gradient mask clipping the
  glyph's ascenders — a padding adjustment, not a structural change.
- Keep `font-handwrite` (Dancing Script) and the existing `animate-write-on` /
  `edenRef`-driven clip-path reveal exactly as built; only the size and line placement
  change.

### 3.2 Track B — a true stroke-drawn SVG path (recommended)

**The word becomes an SVG, not a font glyph.** One (or a few, per-letter) `<path>`
with real pen-stroke geometry: at minimum, extracted path data from the Dancing Script
glyph outlines as an interim asset; ideally, an actual hand-lettered "Eden" (Daniel's
own hand, or a quick commission) traced to a clean single-stroke path, since a true
signature has natural weight variation a font-outline conversion won't have. Either
way, `stroke="currentColor"` (inherits `inkBlack`), `stroke-width` proportional to the
Track A size (roughly 3-4px at the large scale, tune live), `stroke-linecap="round"`
`stroke-linejoin="round"` for an authentic pen feel, `fill="none"` while drawing.

**The draw-on, mechanically.** Classic `stroke-dasharray`/`stroke-dashoffset`: set
`stroke-dasharray` to the path's total length (`path.getTotalLength()` at mount, or
precomputed if the path is a static authored asset), animate `stroke-dashoffset` from
that length down to `0`. This directly replaces what `clipPath` currently drives in
`AutoHero`'s `apply()` (`HeroReveal.tsx:179-183`) — same `edenRef`, same
`HERO_THRESHOLDS.EDEN_IN` window (`[0.85, 0.97]`, unchanged), the only implementation
change is which CSS property the imperative per-frame write targets.

**Settle into weight at the end.** A pure outline stays a little thin and hard to read
once static. Right as the stroke-draw completes (the last ~10% of the `EDEN_IN`
window), cross-fade in a filled version of the same path (`fill-opacity` 0 → 1) sitting
under the stroke, so the word visibly firms up from a drawn line into a solid,
legible wordmark, the same "resolves into a finished state" beat the sculpt canvas's
own RESOLVE stage uses elsewhere on this branch (`docs/interaction/hai-spine-drawing-concept.md`
§1.4), not a new device invented for this one word, a house pattern reused.

**Reduced motion and the non-driven fallback.** `PosterHero`/`StaticRenderHero` render
`<HeroCopy />` without `edenRef`, which today falls back to the CSS `animate-write-on`
utility unconditionally. Worth flagging while touching this component: that class has
no `motion-reduce:` guard today, so it's animating even where `useReducedMotion()`
already fires elsewhere on this same page. Under Track B, the non-driven fallback
should render the FINISHED state directly (full stroke + fill, no animation), matching
the reduced-motion rule every other spec on this branch already holds, and closes a
small pre-existing gap while the file's open.

## 4. Glass pill nav (#5)

### 4.1 Shape: one capsule, not three floating pills

`SplashHeader.tsx`'s three links (`how it works` / `engine` / `about`) become one
unified glass capsule housing all three, not three separate pills. A single restrained
capsule reads calmer and closer to the "liquid glass" reference (a lens you look
through, one continuous surface) than three small independent chips would, which would
add visual noise the header currently, correctly, doesn't have (no background
rectangle at all today).

### 4.2 The glass base

```css
.nav-pill {
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(23, 22, 15, 0.10); /* hairline off inkBlack, not a new color */
  backdrop-filter: blur(14px) saturate(1.4) brightness(1.08);
  -webkit-backdrop-filter: blur(14px) saturate(1.4) brightness(1.08);
  box-shadow: 0 1px 2px rgba(23, 22, 15, 0.06), 0 8px 24px rgba(23, 22, 15, 0.08);
}
```

Blur + saturate + a touch of brightness is the frosted-glass base on its own,
already a real improvement over the current transparent header (the header currently
has no surface at all, so nav text can go low-contrast over busy field grounds; the
brief's ask solves a real legibility problem, not just a decoration one).

### 4.3 The lens-refraction morph

The "looking through a magnifying glass" part is a real, documented technique: an SVG
`feDisplacementMap` fed a bump-map texture, chained into the CSS `backdrop-filter`.

```html
<svg width="0" height="0" style="position:absolute">
  <filter id="lensWarp" x="-20%" y="-20%" width="140%" height="140%">
    <!-- A radial gradient standing in for a convex-lens height map: white center
         (undisplaced) fading to mid-gray at the edges (max displacement), so the
         warp is strongest at the pill's rim and calm at its center. -->
    <feImage
      href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><radialGradient id='g'><stop offset='0%' stop-color='%23808080'/><stop offset='75%' stop-color='%23a0a0a0'/><stop offset='100%' stop-color='%23e8e8e8'/></radialGradient><rect width='200' height='60' fill='url(%23g)'/></svg>"
      result="bump"
    />
    <feDisplacementMap in="SourceGraphic" in2="bump" scale="16" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```

```css
.nav-pill {
  backdrop-filter: blur(10px) saturate(1.4) brightness(1.08) url(#lensWarp);
  -webkit-backdrop-filter: blur(10px) saturate(1.4) brightness(1.08);
  /* Safari historically drops SVG filter references inside backdrop-filter even
     where -webkit-backdrop-filter otherwise works; the line above is the safe
     Safari fallback (plain frosted glass, no warp), the line before it is the
     full effect for browsers that support chaining an SVG filter into
     backdrop-filter (current Chrome/Edge). Feature-detect, don't sniff UA. */
}
```

`scale="16"` is a starting point, tune live, higher pushes further into the "obvious
lens bulge" register, lower reads as a subtle waviness. Keep it on the subtle end,
Daniel's anti-Jarvis line runs through effects like this one exactly as much as it
runs through motion.

### 4.4 Interaction states and performance

| State | Treatment |
|---|---|
| Resting | glass base (§4.2) + warp (§4.3), static, no animation |
| Link hover | existing left-origin underline grow, unchanged, plus the pill's local background nudges to ~0.42 alpha under the hovered link only (a soft backlight, not a glow) |
| No-support fallback | Safari / any browser that can't chain the SVG filter into `backdrop-filter`: plain frosted glass (§4.2 alone), no warp, still fully on-brand, never a broken or invisible nav |
| Reduced motion | no change needed, the effect is static (no animation to reduce), only the link-hover backlight transition (~120ms) collapses to instant |

**Cost control**: keep the pill's footprint small (wraps the three links tightly, not
full-width) — `backdrop-filter` cost scales with filtered area, and this sits inside a
`position: fixed` header that repaints on every scroll frame as different field-color
grounds pass underneath it, which is the whole point of "morphs the background" but
also the whole cost. A compact capsule keeps that cost bounded regardless of viewport
width.

## 5. Adaptive cursor (#6)

### 5.1 The core trick, and the one detail that's easy to get backwards

`mix-blend-mode: difference` computes `abs(top - bottom)` per channel. A **pure white**
(`#FFFFFF`) circle blended this way against any background color `B` renders as
`255 - B`, a true full color invert, readable against literally anything. A circle
filled with `inkBlack` (or any dark color) would do the opposite of what's wanted:
difference against black is the identity, so a dark-filled cursor would go invisible
over dark content. **The circle's fill must be pure white**, not a brand ink color,
for the auto-inverting effect to actually work.

```css
.cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #ffffff;
  mix-blend-mode: difference;
  pointer-events: none;
  z-index: 200; /* above BowerIntro's z-100 */
  transform-origin: 50% 50%;
  will-change: transform;
}
```

### 5.2 Following the pointer, cheaply

Framer Motion is already a dependency, already used on this exact page for smooth
tracked motion (`BowerIntro.tsx`'s letter/logo travel). Reuse it here rather than
hand-rolling a `requestAnimationFrame` loop: `useMotionValue` for raw pointer x/y,
`useSpring` (a light spring, not a hard snap, matching the file's own existing easing
vocabulary) driving the dot's `translateX`/`translateY`. This keeps the whole cursor
component's positioning logic as declarative `motion.div` props, no manual per-frame
DOM writes needed, and it's the idiomatic pattern this codebase already reaches for.

Position math: the div's untransformed top-left sits at `(0,0)`; translate by
`pointerX - radius, pointerY - radius` so the circle's CENTER tracks the pointer, not
its corner (a common bug: translating to the raw pointer coordinate puts the circle's
corner, not its middle, under the cursor).

### 5.3 States

| State | Trigger | Treatment |
|---|---|---|
| Resting | default | 14px, spring-follows the pointer |
| Hover | pointer over `a`, `button`, `[role=button]`, or an explicit `[data-cursor-hover]` opt-in | scales to ~44px (`transform: scale(1) → scale(3.14)` on the same base div, centered via `transform-origin`, not a size change, so the spring-follow math never needs to know the current scale) |
| prefers-reduced-motion | OS setting | keep the color-invert (a static visual property, not motion), drop the spring lag entirely, snap directly to the pointer position and the hover-scale transition to instant, matching the reduced-motion rule every other spec on this branch already holds |
| Touch / coarse pointer | `matchMedia('(pointer: coarse)')` or `!matchMedia('(hover: hover)').matches` | don't mount the custom cursor at all, native cursor stays untouched. Use the media-query test, not touch-event presence, since hybrid devices (touchscreen laptops) have a real mouse too and a naive touch-event check would wrongly hide the effect for them |

**Hover detection, cheaply**: one delegated listener on `document`
(`pointerover`/`pointerout`), checking `event.target.closest(selector)` against a
single shared selector string, not per-element listeners. Works for anything rendered
later without re-binding.

**Hiding the native cursor, fail-safe not fail-dangerous**: `cursor: none` is applied
to `<html>` only by the mounted component itself, in an effect, removed on unmount.
Never a static CSS rule. If the JS fails to run for any reason, the native cursor is
the default and the user is never left with no cursor at all.

**Scope boundary**: this ships on `#/` (`SplashPage`) only. `#/sculpt`, `#/shape`, and
`#/studio` already drive `document.body.style.cursor` directly for their own drag
affordances (`grab`/`grabbing` in `SculptShell.tsx` and `CageHandles.tsx`); the
adaptive-cursor component must not mount on those routes, so it never fights an
existing, working interaction.

## Open questions for Daniel

- Whether the "Eden" restructure (§3.1/3.2, breaking it onto its own stacked line) is
  the right shape, or whether Daniel would rather keep it inline and just accept a
  smaller size increase than "drastically larger" implies — worth a quick look at both
  once built, this reads very differently live than in a spec.
- Whether Track A or Track B (§3) is worth the time this pass; Track A alone is a real,
  shippable improvement if Track B's asset work (the hand-lettered path) doesn't fit.
- Whether the nav capsule (§4) should carry a current-route highlight (a filled segment
  behind whichever of `how it works` / `engine` / `about` matches the live route) — not
  speced here as it's a small scope addition beyond what was asked, flagging it as an
  easy follow-up if wanted.
