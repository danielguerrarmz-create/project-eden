# SPLASH-PAGE-SPEC — the new home (`#/`)

Author: Sai · Date: 2026-07-05 · Status: ready for Edward to build from

A new full-bleed editorial landing that sits ABOVE the configurator, in the same
documentation-layer language as the Engine page: flat acid field colors, one field per
section, editorial serif + Bodoni pull quote, IBM Plex Mono annotations, live navy
hairline diagrams drawn by the real engine functions. The studio (the configurator app)
is untouched in substance; it only moves one route, from `#/` to `#/studio` (see
Routing, below). Nothing here invents new tokens, fonts, or diagram primitives: every
color, weight, and SVG helper below already exists in `tailwind.config.js` and
`src/pages/engine/{EngineSection,hairline}.tsx`.

## A note on reference docs, read this first

The brief for this task named two files as pre-existing context: `app/docs/DESIGN-DIRECTION.md`
and `app/docs/ENGINE-PAGE-SPEC.md`. Both were committed on the Eden-rename branch
(`05a4dde` and the Engine-page commit) but the studio side of that branch was superseded
during the Bower integration (`docs/handoffs/2026-07-05-bower-integration.md`); the two
markdown docs were not re-grafted onto the current trunk and are not in this working
tree. They are recoverable at `git checkout pre-bower-integration-2026-07-05` if wanted,
but this spec does not depend on them: it is written directly from the live, current
source of truth, which is stronger anyway, `tailwind.config.js`, `src/pages/engine/
EngineSection.tsx`, `src/pages/engine/hairline.tsx`, `src/pages/EnginePage.tsx`, and the
handoffs. Everything token/font/diagram-primitive-related cited below is read from that
code, not from the missing docs. Recommend re-committing DESIGN-DIRECTION.md from the
tag as a follow-up so it stops silently drifting out of the tree; not blocking this spec.

**One correction to the task brief:** the brief's example engine function, `ribProfile()`,
no longer exists. The Bower respec replaced the old dome/rib model with a gridshell
canopy, and the pure function the Engine page's diagrams now sample is
`canopyProfile(params, bearingDeg)` in `src/engine/geometry.ts`, alongside
`surfacePoint()`, `generateGeometry()`, `computeStrutField()`, `computeGrowth()`, and
`computeEcology()`. All diagram specs below cite the real, current function names.

## Open items that need a decision before/while building (flagging, not deciding)

1. **Naming collision.** Three names are in flight (Folly / Eden / Bower,
   `WORDMARK = 'bower'` in `src/data/config.ts` today, per the Day-3 call still open).
   Daniel's instruction this session locks the hero copy to literally say "Eden"
   ("Commission a living Eden."). I've kept that exact line as instructed. Everywhere
   else on this page I read the product name from `WORDMARK`/a `NAME` constant (exactly
   how `EnginePage.tsx` already does), so the page degrades correctly if the name
   resolves to Bower or anything else. If the Day-3 call lands on something other than
   Eden, the hero H1 needs a one-line rewrite; flag it back to me rather than silently
   swapping the word, the sentence was built around "Eden" specifically.
2. **Routing move.** `routes.configurator` currently equals `'#/'` and renders `App`
   (the studio) directly with no splash in front of it. Shipping this spec requires the
   route change described below. Small, mechanical, but it is a real change to
   `Root.tsx` / `routing.ts`, not just a new page file.
3. **Register-interest persistence.** `useDesign`'s store already has an unused
   `reserveEmail` / `submitReserve` / `reserved` mechanism (console-log capture, no
   backend) that nothing currently calls. This spec does NOT reuse that store slice
   (it's coupled to a specific configured design's price/species, and the splash's
   capture is top-of-funnel, design-agnostic). It specs a small standalone component
   with the same honesty pattern instead. Fine to unify later once there's a real
   backend for either.

---

## Routing (must ship with this spec)

`src/routing.ts`:
```
export const routes = {
  home: '#/',
  studio: '#/studio',
  engine: '#/engine',
} as const;
```
`src/Root.tsx`:
```
'/'        -> SplashPage   (new)
'/studio'  -> App          (unchanged component, new address)
'/engine'  -> EnginePage   (unchanged)
anything else -> SplashPage (fallback, so a stray hash never dead-ends)
```
Two one-line touches outside the new page itself:
- `EnginePage.tsx`'s "back to the studio" link currently reads `routes.configurator`;
  repoint to `routes.studio`.
- `Navbar.tsx` (the studio's floating pill) is unaffected; its copy-link/reset logic is
  query-string based, not hash based, so moving the studio to `#/studio` does not touch
  the design-persistence mechanism in `state/store.ts` at all.

No change to `App.tsx`, the engine, the studio UI, or any engine test. This is purely
additive plus a two-line route table edit.

## Shared conventions this page reuses (zero new primitives)

- **Field grounds**, one per section, never blended: `bg-fieldBlue` `#C3DEF2`,
  `bg-fieldChartreuse` `#D8F27E`, `bg-fieldYellow` `#F0CE1B`, `bg-paperVellum` `#FBF9F3`.
  Ink resolves per ground exactly as `EngineSection.tsx`'s `GROUND` map already does
  (navy `#232C5E` on blue, black `#17160F` on chartreuse/yellow/vellum).
- **Type**: `font-quote` (Bodoni Moda) for exactly one pull-quote moment (the hero H1
  only, matching the Engine page's rule of one Bodoni moment per page). `font-serifDisplay`
  (Source Serif 4 Variable) for every other heading. `font-mono` (IBM Plex Mono) for
  eyebrows, annotations, captions, nav. Recommend extracting the `H1` / `H2` / `BODY`
  class-string constants currently local to `EnginePage.tsx` into a shared
  `src/pages/typeScale.ts` so both pages import the identical scale instead of drifting
  copies; zero visual change, just de-duplication.
- **One italic word per heading**, the Eden heading convention already in use
  (`computed`, `geometry`, `skeleton`, `projection`, `habitat` in the Engine page).
  Every H1/H2 below names its one italic word explicitly.
- **Hairline diagram vocabulary**: `DiagramSvg`, `DimensionLine`, `ExtensionLine`,
  `LeaderCallout`, `AccentMark`, `useInk` from `src/pages/engine/hairline.tsx`. 0.75px
  primary strokes, 0.5px secondary/extension, open tick dimension terminators (not
  filled arrowheads), exactly one `AccentMark` (accent-olive `#ACC13A`) per diagram.
  Every diagram below is either a direct reuse of an existing Engine-page diagram
  component or a new component built from these same primitives.
- **Motion**: reuse `EngineSection`'s own fade-in-on-intersect (`IntersectionObserver`,
  350ms opacity+translateY, `useReducedMotion()` from `src/ui/useReducedMotion.ts`
  snaps to settled with no observer). No new motion vocabulary.
- **Copy rule**: no em/en dashes or spaced hyphen-as-dash anywhere in this page's copy.
  All strings below are already written clean; nothing here needs to route through
  `deDash()` (that utility exists for the engine's own generated strings, this page's
  copy is hand-authored).
- **No margin, certification, or insurer claims anywhere** (stress-test discipline,
  same as the Engine page's honesty close). Where this page touches Biodiversity Net
  Gain (section 4) it is framed as market context, never as a certification the product
  carries; see that section's copy for the exact line.

## New files

- `src/pages/SplashPage.tsx` — the page shell, mirrors `EnginePage.tsx`'s structure.
- `src/pages/splash/SplashHero.tsx` — hero-specific section (full viewport, two-zone
  layout; distinct from `EngineSection` because it needs a background diagram layer and
  a taller frame, but shares its ground-color map and `InkProvider`).
- `src/pages/splash/HeroCanopyMark.tsx` — D-hero, the live plan+elevation mark.
- `src/pages/splash/SeasonalBecomingDiagram.tsx` — D2, the durationless growth strip.
- `src/pages/splash/RegisterInterest.tsx` — the email capture, used once (closing
  section), anchor-linked from the hero's secondary CTA.
- Reused unchanged: `src/pages/engine/EngineSection.tsx` (for sections 2 to 5),
  `src/pages/engine/hairline.tsx`, `src/pages/engine/SiteEnvelopeDiagram.tsx` (section 3),
  `src/pages/engine/StrutFieldDiagram.tsx` (section 4).

---

## Section 1 — Hero

**Purpose:** state the product in one warm, buyer-facing line, prove immediately that
the page is backed by a real generative engine (not a render), and split traffic two
ways: straight to the proof (`#/engine`) or a low-key demand signal (register interest).

**Ground:** `bg-fieldBlue` (`#C3DEF2`), ink navy.

**Layout:** `SplashHero`, full-bleed, `min-h-screen`. Desktop (`lg:`): two-zone flex/grid,
text column left (`max-w-[46ch]`, left-aligned, vertically centered), `HeroCanopyMark`
right zone (roughly 42% width, vertically centered, diagram drawn large, ~70% of the
zone's height). Mobile: single column, text first, diagram below at reduced scale
(same component, smaller `viewBox` frame via the existing `DiagramSvg` responsive
`viewBox`, no separate mobile diagram needed). Section padding matches `EngineSection`'s
`px-6 md:px-10`, but vertical padding is `py-24 md:py-0` with `min-h-screen` flex
centering instead of the standard `py-20 md:py-32`, since this section owns the full
viewport rather than a reading-column block.

**Header (inside the hero ground, top of section, non-sticky, matches the Engine
page's own header pattern):**
```
[mono, uppercase, tracking-wide, opacity-80]  {WORDMARK} · living architecture for the garden
                                        [mono, underlined, quiet]  the studio →   (routes.studio)
```

**Copy:**
- Eyebrow: `Living architecture for the garden`
- H1 (Bodoni Moda, `font-quote`, exact locked copy, one italic word: *living*):
  > Commission a *living* Eden.
- Sub (revised per the durationless constraint; no year, no number, no timeline):
  > A timber pavilion computed for your plot, its lattice built to carry climbing
  > plants rather than just stand over them. It is never finished on installation day.
  > It gets more alive, and more beautiful, with every season it grows.
- Primary CTA (filled, the one filled action on this page, matches the studio's
  ink-filled pill convention): **See how the engine works →** → `routes.engine`
- Secondary CTA (quiet, underlined mono text, never a second filled button): **Register
  interest ↓** → anchor scroll to `#register` (section 5's capture form; see Register
  Interest, below, for why the form itself lives only in the close).

**Diagram — `HeroCanopyMark` (new component):**
A large, ambient version of the same plan-plus-elevation drawing the Engine page
already teaches (`SiteEnvelopeDiagram.tsx`), built from the identical live data: the
default `useDesign().outputs.geometry` (the store initializes its outputs eagerly, same
pattern `EnginePage.tsx` relies on). Concretely: ellipse plan (`planA`/`planB`) with
`footBearingsDeg` feet dropped on their real bearings, plus the elevation silhouette
from `canopyProfile(params, apertureDeg)` / `canopyProfile(params, apertureDeg + 180)`,
exactly as `SiteEnvelopeDiagram` draws it. Differences from the Engine-page version,
because this is a brand mark, not a teaching diagram:
- No `DimensionLine` callouts inline on the drawing itself (a hero mark reads as an
  emblem, not an instruction sheet).
- One `AccentMark` only, on the aperture bearing, same convention as every other
  diagram on the site.
- Strokes at slightly lower opacity (0.55 rather than the Engine page's ~0.75-1.0) so
  the mark sits quietly behind/beside the text rather than competing with it.
- A single `AnnotationStrip` beneath (mono, 10px, matches the Engine page's convention
  of always closing a diagram with a real number so it never reads as decoration):
  `span {spanM} m · rise {riseM} m · fixed price {gbp(price.fixedTotalGBP)}` — the one
  place on this page a live number appears without a diagram lesson attached to it,
  planting the "this is real" proof before the visitor has scrolled at all.

Not a static image, not a 3D scene: same constraint as the locked brief, satisfied by
reusing the exact SVG hairline pipeline the Engine page already ships.

---

## Section 2 — Always becoming (the emotional core)

**Purpose:** replace the old "finished in year three" line with its durationless
version. This is the section Daniel named as the emotional core: sell the temporal
beauty of the object (always growing, never finished, more alive every season) without
stating any duration.

**Ground:** `bg-fieldChartreuse` (`#D8F27E`), ink black. Reuses the Engine page's own
color-to-meaning mapping (chartreuse = the growth/living beat there too, section 5 "How
it grows"), so the two pages read as one system.

**Layout:** standard `EngineSection` reading column (`max-w-[880px]`, centered,
`px-6 md:px-10 py-20 md:py-32`).

**Copy:**
- Eyebrow: `Always growing, never finished`
- H2 (one italic word: *becoming*):
  > A structure that keeps *becoming*.
- Body:
  > Every Eden is planted the day it is built. It arrives quiet: a bare lattice and a
  > young climber at its feet. Then it starts to change, and it does not stop. Each
  > season it holds more leaf, more flower, more shade than the one before. There is no
  > finished photograph, only the next one.
- Second paragraph:
  > You are not buying an object placed on a lawn. You are commissioning a place that
  > keeps arriving, growing more alive and more beautiful with every season it stands.

**Diagram — `SeasonalBecomingDiagram` (new component, adapted from
`GrowthPhasesDiagram.tsx`):** Same underlying real data (`canopyProfile` silhouette +
`computeGrowth(species, year).leafDensity01` foliage-dot scatter, sampled internally at
year 0/1/3 exactly as the Engine page does), but:
- **Captions carry no numbers and no "year" word**, per the locked constraint: `just
  placed` · `taking hold` · `in full leaf` (mono, lowercase, replacing the Engine page's
  `Year 0 — just planted` / `Year 1 — establishing` / `Year 3 — grown in` labels, which
  stay as-is on the Engine page; that page is the honest technical explainer and is
  allowed to be explicit about the projection, this page is the emotional pitch and is
  not, per this session's instruction).
- The third panel's right edge fades out under a soft opacity gradient mask (a linear
  `<linearGradient>` from opaque to transparent over the last ~20% of the panel width)
  rather than terminating in a hard outline, a small visual cue that growth continues
  past the frame rather than completing inside it.
- Beneath the three panels, one mono line instead of the Engine page's ecology
  annotation strip (ecology numbers move to section 4, so they are not duplicated):
  `always becoming, never finished` — a quiet restatement, not a caption on data.
- No `AccentMark`/flowering leader-callout in this version (that beat belongs to the
  Engine page's more technical framing); keep this diagram to silhouette + foliage
  density only, so it stays legible as a mood image rather than a spec sheet.

---

## Section 3 — The certainty of a catalog with the singularity of a commission

**Purpose:** the "why it is technology, not joinery" argument from the one-pager,
compressed to one section: shape it like clay, it is buildable and priced live at every
position of every slider.

**Ground:** `bg-paperVellum` (`#FBF9F3`), ink black. Matches the Engine page's own
"what the engine actually does" section, same ground, same register (explanatory, not
emotional).

**Layout:** standard `EngineSection` reading column.

**Copy:**
- Eyebrow: `Why it is technology, not joinery`
- H2 (one italic word: *prices*):
  > Shape it like clay. It *prices* itself as you do.
- Body:
  > Every Eden comes out of a small, honest engine, not a catalogue of ten shapes.
  > Footprint, rise, the spacing of the lattice, the direction it opens: four things
  > you can shape, and every shape you reach is something a fabricator can actually
  > cut. The form cannot leave what its own fabrication grammar allows, which is what
  > makes it buildable at every position of every slider, not just the one in the
  > brochure.
- Second paragraph:
  > That constraint is what makes the price real, not a fixed range with a footnote.
  > Move a control and the price recalculates from the same cut list a fabricator
  > would quote from, live, in front of you. Complex, organic form was never expensive
  > because of material. It was expensive because of uncertainty. Remove the
  > uncertainty, and a shape this alive becomes something you can simply commission.

**Diagram:** direct reuse, unchanged, of `<SiteEnvelopeDiagram outputs={outputs} />`
(the same component the Engine page's section 2 already renders: live plan ellipse,
feet on their real bearings, aperture leader, elevation silhouette, `DimensionLine`
span/rise). Append one `AnnotationStrip` beneath it that this section owns and the
Engine page's instance does not need duplicated: the live fixed price, formatted
exactly like `PricePanel.tsx`'s `gbp()` helper (`£${n.toLocaleString('en-GB')}`), e.g.
`footprint {footprintM2} m² · rise {riseM} m · fixed price {gbp(price.fixedTotalGBP)}`.
This is the one hairline diagram this section needs; no second diagram.

---

## Section 4 — Living, not placed on

**Purpose:** the defensibility argument: this is a structure that contributes to its
garden's ecosystem, not a garden room. Covers the living-armature idea, rainwater
routing, ground screws, and Biodiversity Net Gain as market context, never as a
certification claim.

**Ground:** `bg-fieldYellow` (`#F0CE1B`), ink black. Matches the Engine page's own
"planting-informed parametrics" section, same ground, same thesis (species-specific
armature), so the two pages share the yellow-equals-the-living-layer convention.

**Layout:** standard `EngineSection` reading column.

**Copy:**
- Eyebrow: `Contributing to its garden, not just standing in it`
- H2 (one italic word: *habitat*):
  > A structure with a *habitat* built in.
- Body:
  > The lattice is not just a frame, it is a living armature. Its density and
  > orientation are computed for the climbing habit of the species you choose, so the
  > plant has exactly the support it physically needs: twining stems close verticals to
  > spiral around, tendrils a fine mesh to grasp, self-clinging roots almost nothing at
  > all. The roof does not shed water to a drain, it channels it down to the beds it
  > shelters. It stands on ground screws, not a poured slab, so the soil beneath it
  > stays alive.
- Second paragraph (market context, explicitly not a certification claim):
  > The UK made Biodiversity Net Gain a legal requirement for new development in 2024:
  > adding habitat to a site is moving from a nice idea to something that is measured.
  > An Eden is built to sit on the right side of that line, honestly, without
  > pretending to be an ecological survey.

**Diagram:** direct reuse, unchanged, of `<StrutFieldDiagram outputs={outputs} />` (the
Engine page's section 4: four small multiples, one per climbing habit, each a real
`computeStrutField()` call against the same geometry and sun path, only the species
varies). This is the visual proof of "living, not placed on," reused verbatim.

**Ecology facts row (the numbers that were NOT shown in section 2):** a small 4-up
strip beneath the diagram, styled like the studio's own `EcologyStrip` (`App.tsx`) but
in mono/hairline register rather than rounded cards: `habitat {ecology.habitatAreaM2} m²`
· `pollinator cells {ecology.pollinatorCells}` · `rainwater {ecology.rainwaterLitresPerYr}
L / yr` · `flowering {ecology.floweringMonths}`, read straight off the live default
`outputs.ecology` (no special-cased growth year, just whatever the store's default
session state is, same "live default design" convention as everywhere else on this
page).

---

## Section 5 — Close

**Purpose:** repeat the two calls to action from the hero (they should not require
scrolling back up), and give the "Register interest" secondary CTA its one real form.

**Ground:** `bg-paperVellum` (`#FBF9F3`), ink black. Bookends the page on the same
ground it opened its explanatory register on (section 3), and matches the Engine page's
own closing section, which is also vellum.

**Layout:** standard `EngineSection` reading column. `id="register"` on the section
root so the hero's `#register` anchor lands here.

**Copy:**
- Eyebrow: `Start here`
- H2 (one italic word: *begin*):
  > Two ways to *begin*.
- Body:
  > If you want the proof first, the engine page walks through exactly what is real and
  > what is a rule of thumb, with every diagram computed live. If you would rather just
  > put your name down, that takes ten seconds.

**Primary CTA (repeated from hero, identical underlined-mono link style the Engine
page already closes every one of its own pages on, e.g. `Shape your own {NAME} →`):**
> See how the engine works → (`routes.engine`)

**Register Interest (`RegisterInterest.tsx`, new, the ONLY instance of this form on
the page; hero only links down to it):**
- Idle state: one-line inline form, mono label `register interest`, a single-line email
  input (1px navy/black border, no radius or 4px max, matches the hairline drafting
  aesthetic rather than the studio's rounded-pill inputs), submit as a quiet
  thin-bordered rectangular button (not the studio's filled pill; this page keeps
  exactly one filled action, the hero/close engine CTA).
- Submit handler: local component state only (`email`, `submitted`), no backend, logs
  the captured intent to console in the same honesty pattern the store's existing
  (currently unused) `submitReserve()` already establishes in `state/store.ts`
  (`console.log('[REGISTER] interest captured', { email, source: 'splash' })`). This
  keeps the mechanism consistent with the rest of the app's "real as a shape, not yet
  wired to a backend, and says so" posture, without touching the store.
- Submitted state: swaps the form for a single quiet line, `Noted. We will be in
  touch.`, no confetti, no modal.

---

## Build order (suggested, cheapest-safe-diagram-first)

1. Routing (`routing.ts` + `Root.tsx` two-line change, `EnginePage.tsx` one-line
   repoint). Verify `#/studio` renders the untouched studio and `#/engine` still works.
2. `SplashPage.tsx` shell with all five sections as plain copy (no diagrams yet) on the
   correct grounds, to get the reading rhythm and type scale right first.
3. Sections 3 and 4 (`SiteEnvelopeDiagram` / `StrutFieldDiagram` reused verbatim, plus
   their two small annotation additions), zero new SVG code.
4. `SeasonalBecomingDiagram` (section 2), adapted from `GrowthPhasesDiagram` (relabel +
   fade mask + drop the ecology strip + drop the flowering leader).
5. `HeroCanopyMark` (hero), the one genuinely new diagram, built from the same
   `canopyProfile`/`footBearingsDeg` data `SiteEnvelopeDiagram` already proves out.
6. `RegisterInterest.tsx` + hero anchor link.
7. Full-scroll eyes-on pass, both routes, reduced-motion on and off, per the Engine
   page's own verify convention.

## Explicitly out of scope

Backend for the register-interest capture (console-log only, matches the rest of the
MVP's honesty posture). Any change to the studio's visual language, the configurator
flow, or the commission sheet. Any margin, certification, or insurer claim. Any
specific duration, year, or timeline anywhere in this page's copy.
