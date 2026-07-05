# Living Eden: Generative Engine Page — Build Spec

Status: approved direction, ready to build. Daniel signed off on `docs/DESIGN-DIRECTION.md`; this document turns that direction into a concrete, buildable spec for the `#/engine` route. Depends on Edward's parallel foundation work: hash routing (`#/` = configurator, `#/engine` = this page), the Tailwind tokens from the direction doc, and the three self-hosted fonts (Source Serif 4 variable as the Freight Big Pro stand-in, Bodoni Moda for the one high-contrast moment, IBM Plex Mono for annotation).

Audience: Restless Egg accelerator reviewers and future LPs. Job of the page: explain, honestly, what the generative engine actually computes. Every diagram on this page renders real output from the code in `src/engine/`, not illustration. Nothing on this page claims anything about pricing, margins, or certification: those are out of scope per the stress test and are handled elsewhere.

## 0. Data source: live engine, not authored numbers

Every number and diagram on this page must come from calling the real engine functions, not from copy hardcoded in this spec. The worked examples below (specific angles, percentages, densities) are illustrations computed by hand against the app's actual default parameters, so Edward can sanity-check the diagrams against them, but the shipped page must call the functions live.

**Default parameters to render against** (read from `src/state/store.ts`'s `initialParams`, so the page shows the same Eden a first-time visitor to the configurator would see): footprint radius 2.4m, height 3.0m, enclosure 55%, lattice density 0.6, opening facing south (180°), site latitude 51.5°N, species `lonicera` (common honeysuckle, twining), year 0.

**Recommended data approach:** the Engine page is a standalone route and may be opened cold (no prior visit to the configurator), so it should not assume the zustand store has been touched. Pattern:

```ts
import { useDesign } from '../state/store';
import { ENVELOPE } from '../data/config';
import { getSpecies, DEFAULT_SPECIES_ID } from '../engine/species';
import { runEngine } from '../engine'; // or the individual pure fns, whichever ../engine/index.ts exports

// Prefer the live store if the user arrived from the configurator; otherwise
// fall back to the same defaults store.ts uses on first load, so the page is
// never empty and never contradicts what Step 1-3 would have shown.
const storeOutputs = useDesign((s) => s.outputs);
const outputs = storeOutputs ?? runEngine(DEFAULT_PARAMS); // DEFAULT_PARAMS mirrors initialParams
```

If wiring the live store into a standalone route proves awkward given how Edward lands the router, the fallback alone (computing fresh from the default params on mount) is an acceptable simplification, since the page's job is to explain the mechanism, not to reflect a specific visitor's design. Do not, however, hand-type the four worked numbers below directly into JSX; call `computeSunPath`, `computeStrutField`, `computeGrowth`, `generateGeometry`, `computeEcology` and read their return values, formatted with `.toFixed()` at render time. That is the whole point of an honest engine page: if a constant in `data/config.ts` changes tomorrow, this page updates itself.

**One existing copy issue to flag, not silently fix:** `strutOptimizer.ts`'s `habitStrategy` strings use an em dash (e.g. `` `${species.common} twines — the engine spaces CLOSE VERTICAL battens...` ``). Daniel's standing rule is no em or en dashes in copy anywhere. Since this string is genuinely user-facing (both here and in the configurator's existing readout), Edward should swap the em dash for a colon or period in `strutOptimizer.ts` directly (four occurrences) as part of this build. Flagging here rather than fixing myself since it touches engine code, not a design file.

## 1. Page structure at a glance

Six full-bleed sections, alternating grounds so the page has rhythm rather than repeating a color back to back. Four hairline diagrams, each computed from the engine functions named above.

| # | Section | Ground | Diagram |
|---|---|---|---|
| 1 | Hero | `field-blue` | none (statement only) |
| 2 | The pipeline | `paper-vellum` | D1: Site & envelope drawing |
| 3 | Reads the site | `field-blue` | D2: Sun path arc |
| 4 | The strut field (the thesis) | `field-yellow` | D3: Strut density by habit |
| 5 | How it grows | `field-chartreuse` | D4: Growth phases, year 0/1/3 |
| 6 | What this guarantees | `paper-vellum` | none (honesty statement + CTA) |

Full-bleed means each `<section>` is `w-full`, background is the flat field color (`bg-fieldBlue`, `bg-fieldChartreuse`, `bg-fieldYellow`, `bg-paperVellum`), inner content constrained to a `max-w-[880px]` reading column centered, generous vertical padding (`py-24 md:py-32`). No section shows more than one field color; do not blend two fields in one section (per the direction doc's rule).

## 2. Shared primitives (build once, reuse across all four diagrams)

New file: `src/pages/engine/hairline.tsx`. Every diagram is built from these so the four stay visually identical in stroke weight and annotation style rather than four one-off SVGs.

- `<DimensionLine x1 y1 x2 y2 ink label />`: a 0.75px line with 2px open tick terminators at each end (a short perpendicular stroke, not a filled arrowhead), and a mono label centered above or beside it at 10px, uppercase, `+0.04em` tracking, using `ink` prop (`inkNavy` or `inkBlack`) for both the line and the label.
- `<ExtensionLine x y length angle ink />`: the thin 0.5px line running from a geometry point out to where a `DimensionLine` sits, per architectural convention.
- `<LeaderCallout from to label ink />`: 0.5px dashed line terminating in a small open circle (not an arrowhead), with a mono label at the free end.
- `<SectionHatch x y width height angle ink />`: repeated 0.5px parallel lines at 4px spacing minimum, for any implied cut plane.
- `<AccentMark>`: the one permitted `accentOlive` highlight per diagram, a filled dot, short stroke, or single tinted cell, used exactly once per diagram to mark the single most important element (the current growth year, the sunward sector, the emphasized strut cell).

Stroke color rule, applied inside each primitive via a required `ink` prop: `inkNavy` when the diagram sits on `field-blue`, `inkBlack` when it sits on `field-chartreuse`, `field-yellow`, or `paper-vellum`. Never hardcode a color per diagram; pass it down from the section wrapper so a future field-color change only touches one prop.

Also new: `src/pages/engine/EngineSection.tsx`, a thin wrapper taking `ground` (`'blue' | 'chartreuse' | 'yellow' | 'vellum'`), rendering the full-bleed background, the reading column, and computing the correct `ink` value for children to consume via context or a passed prop, so individual sections never choose their own ink color.

## 3. Section 1: Hero (`bg-fieldBlue`)

The only section using the Bodoni Moda stack (`font-displayHairline`), per the direction doc's rule of one high-contrast headline per page. Everything else on the page uses the Freight Big Pro stack (`font-display`, meaning Source Serif 4 in the shipped fonts).

**Eyebrow** (mono, `text-inkNavy`, uppercase, tracked): `THE GENERATIVE ENGINE`

**H1** (`font-displayHairline`, weight 700, `clamp(2.75rem, 6vw, 5.5rem)`, `text-inkNavy`, one italicized word per the specimen convention):

> Eden is *computed*, not chosen from a catalogue.

**Subhead** (body, Inter, `text-inkNavy` at reduced opacity, max-width ~60ch):

> Every Eden on this site comes out of a small pipeline of plain functions. A plot, a species, and the sun go in. A structure you could actually cut goes out. Nothing is selected from a range of preset shapes.

No diagram in this section. Keep it text only, generous whitespace, so the page opens calm and confident before the technical register begins in section 2.

## 4. Section 2: The pipeline (`bg-paperVellum`)

**Eyebrow:** `WHAT THE ENGINE ACTUALLY DOES`

**H2** (`font-display`, weight 600, `clamp(1.75rem, 3.5vw, 3rem)`, `text-inkBlack`):

> Four pure functions, one *Eden*.

**Body copy**, drawn directly from `types.ts`'s own pipeline comment, restated in plain language:

> One set of inputs (the plot, three sliders, a species, and a year) runs through the same functions every time, in this shape:
>
> Design parameters produce a geometry. That geometry produces a cut list, and separately a strut field once it is read against the sun path. The geometry and species together produce an ecology reading. The species and year together produce a growth state.
>
> None of these functions hold hidden state. Given the same plot and the same choices, the engine produces the same Eden, every time. That is what "generative" means here: not random, not AI generated art, a deterministic pipeline you could run on paper.

**Lightweight pipeline schematic** (not one of the four counted diagrams, a simple box-and-arrow graphic using the same hairline primitives): five boxes (`Design params`, `Geometry`, `Components`, `Strut field`, `Ecology`, `Growth`, six total) connected by `LeaderCallout`-style arrows matching the dependency graph in the `types.ts` header comment. Render at `paperVellum` ink-black, roughly 640px wide, centered, sitting between the body copy and D1.

**D1: Site & envelope drawing.** This is the plot-dimension drawing called for in the brief.

- Composition: a plan-view rectangle (the mapped plot, `plot.widthM` by `plot.depthM`, using live store values or the 8m by 6m default), with a `DimensionLine` along the top edge labeled with the width in meters and one along the left edge labeled with the depth, both pulling the live numbers via `.toFixed(1)` plus `M` suffix (mono).
- Inside the plot rectangle, a circle at the plot center representing `footprintRadiusM` (2.4m in the default case), with a radial `DimensionLine` from center to edge labeled `R 2.4M`.
- A small compass mark (N arrow, 8pt, hairline, rotated per `plot.northDeg`) at the top-right corner of the drawing, since orientation is a real input to the engine (it drives `openingOrientationDeg`).
- Below the plan, a small elevation/section sketch: a single vertical `DimensionLine` from ground to apex labeled with `heightM` (`H 3.0M` default), next to a simplified silhouette of the dome profile (reuse the `ribProfile()` curve from `geometry.ts`: sample `t` from 0 to 1, plot `(radius, y)` pairs as an SVG path, so the silhouette is the actual rib curve, not a freehand sketch).
- Mono annotation strip beneath both drawings: `ENCLOSURE 55% · LATTICE DENSITY 0.60 · RIBS 10 · RINGS 4`, values pulled live from `EdenGeometry` (`ribCount`, `ringCount`) and `DesignParams` (`enclosurePct`, `latticeDensity`).
- Ink: `inkBlack` (vellum ground). Fills: none, this diagram is line only, it is the most literal "technical drawing" moment on the page.

## 5. Section 3: Reads the site (`bg-fieldBlue`)

**Eyebrow:** `SOLAR GEOMETRY`

**H2** (`font-display`, `text-inkNavy`):

> The engine reads *where* the sun will be, not just where the plot is.

**Body copy:**

> Given a latitude and the day of year, the engine computes the sun's altitude and compass bearing hour by hour, using the same solar position astronomy an architect would use by hand: a declination angle for the date, an hour angle for the time, and standard trigonometry to resolve altitude and azimuth. It is deterministic. The same site, the same date, always gives the same arc, which is why the same Eden looks right in the render every time you come back to it.
>
> The engine then rolls that arc into eight compass sectors and finds which one gets the most daylight. That single number, the sunniest sector, is what the next section uses to decide where the structure needs the densest support.

**D2: Sun path arc.**

- Composition: a semicircular arc (the sky dome, simplified to the sun's path from sunrise to sunset) drawn above a horizon line, with the actual sampled points from `computeSunPath()` (hours 4 through 20, altitude in degrees) plotted as small ticks along the arc, one path connecting them.
- Solar noon marked as an `AccentMark` (the one `accentOlive` highlight in this diagram) at the peak altitude point, with a `DimensionLine`-style vertical from the horizon up to that point, labeled with the live `peakAltitudeDeg` value (worked example at the default site: latitude 51.5°N, day of year 172, is approximately 62 degrees at solar noon; render the real computed number, do not hardcode 62).
- Below the arc, an 8-segment compass ring (N at top, matching `SECTOR_NAMES` order) with each sector's fill opacity driven by its `exposureBySector` value (0 to 1, mapped to 8 to 40 percent `inkNavy` fill), and the sunniest sector additionally outlined in `accentOlive`.
- Mono annotation: `PEAK ALTITUDE {value}° · SUNNIEST FACE {sectorName}`, both live.
- Ink: `inkNavy` (blue ground). Secondary ticks at 60 to 70 percent opacity per the direction doc's rule for de-emphasized lines.

## 6. Section 4: The strut field (`bg-fieldYellow`)

This is the thesis section, per `strutOptimizer.ts`'s own comment ("THIS IS THE STAR"). It gets the highest-energy field color in the doc's role mapping (field-yellow reserved for "core mechanism" sections).

**Eyebrow:** `PLANTING-INFORMED PARAMETRICS`

**H2** (`font-display`, `text-inkBlack`):

> Change the species, and the *skeleton* changes with it.

**Body copy:**

> This is the one computation a printed catalogue cannot fake. The engine looks at two real things: how the chosen plant physically climbs (twining stems want close verticals to spiral around, tendrils want a fine mesh to grasp, scramblers want horizontal rails to be tied to, self-clinging roots want almost nothing), and where the sun falls hardest on the structure. It combines both into a density field: a rule-based pattern, not a black-box optimizer, that biases the support structure toward what this specific plant, on this specific site, actually needs.
>
> The load-bearing frame never changes. Only the fine support pattern the plant attaches to does. Changing the species reshapes the planting support, never the structure holding it up.

**D3: Strut density by habit, small multiples.**

- Composition: four small panels side by side (desktop), stacking to two-by-two (tablet) then a single column (mobile), one per climbing habit: twining, tendril, scrambler, clinging. Each panel is a simplified unrolled facet of the lattice (a rectangle representing one bay between two ribs), with the actual `StrutCell` grid for that habit rendered as short line segments oriented per `orientation` (`vertical`, `mesh`, `horizontal`) at a spacing inversely proportional to `density01` (denser field, tighter lines).
- Use the four species already in `species.ts` as the representative example for each habit, since the catalogue only has one clinging species and one scrambler: honeysuckle (twining), mountain clematis (tendril), climbing rose New Dawn (scrambler), common ivy (clinging). Compute each panel by calling `computeStrutField()` with that species against the same default geometry and sun path, so the four panels are a genuinely fair side-by-side comparison (same structure, same site, only the species changes).
- Below each panel, a one-line mono caption pulled live from `strutField.habitStrategy` (once the em dash fix above lands), e.g. for honeysuckle: `COMMON HONEYSUCKLE TWINES. CLOSE VERTICAL BATTENS.`
- One `AccentMark` per panel: highlight the single densest cell in `accentOlive`, so the reader's eye can compare where each habit concentrates its support at a glance across all four panels.
- Small mono footer beneath the row: `RECOMMENDED SPACING {value}M`, live from `recommendedSpacingM`, one per panel.
- Ink: `inkBlack` (yellow ground).

## 7. Section 5: How it grows (`bg-fieldChartreuse`)

**Eyebrow:** `ESTABLISHMENT, SHOWN, NOT CLAIMED`

**H2** (`font-display`, `text-inkBlack`):

> Year three is a *projection*, and the page says so.

**Body copy:**

> Coverage is modeled from one honest number per species: its typical rate of new growth per year, applied to a saturating curve so the structure approaches full coverage but is never guaranteed to reach it. This is a visual approximation of establishment, not a biological warranty. For the honeysuckle example above, on the standard-size Eden: newly planted coverage starts at roughly 4 percent. After one growing season it is roughly a third clothed. By year three it is roughly three quarters clothed, still visibly a living structure in progress, not a finished product photograph.

(The 4 percent, one third, three quarters figures above are the real output of `computeGrowth()` for honeysuckle at years 0, 1, and 3 against the default parameters, worked by hand for this spec. Render the live `coverageFraction` at build time; do not hardcode these percentages.)

**D4: Growth phases, year 0 / 1 / 3.**

- Composition: three simplified dome elevations side by side (reuse the same `ribProfile()` silhouette from D1), each labeled with its `growth.label` (`Year 0, just planted`, `Year 1, establishing`, `Year 3, grown in`).
- Foliage is represented as a scatter of small dots along the silhouette's surface, density proportional to `leafDensity01` for that year (sparse dots at year 0, denser at year 3), never a photographic render, keeping the hairline-diagram register consistent rather than switching to an illustrative style partway through the page.
- The year-3 panel gets one `AccentMark`-tinted flowering note: a small `LeaderCallout` pointing to the dome reading the species' `floweringMonths` (`JUN TO SEP` for honeysuckle), since flowering is the ecological payoff the engine is honest about promising.
- Mono strip beneath all three: `HABITAT {value} M² · POLLINATOR CELLS {value} · RAINWATER {value} L/YR`, live from `computeEcology()` at the year-3 state, since this is the section where the ecological argument (light, growth, water) lands.
- Ink: `inkBlack` (chartreuse ground).

## 8. Section 6: What this guarantees (`bg-paperVellum`)

Closing section. Calmer register, no diagram, states the honesty boundaries plainly rather than burying them in a disclaimer footer. This directly reflects the stress-test constraints already encoded as comments in the engine files.

**Eyebrow:** `WHAT IS REAL AND WHAT IS A RULE OF THUMB`

**H2** (`font-display`, `text-inkBlack`):

> Structural validity here means *inside a designed family*, not an engineer's sign-off on every shape.

**Body copy**, three short honest statements, each its own short paragraph rather than a bullet list (matching the fleet's own de-markdown convention of avoiding checkbox-style dumps on reader-facing surfaces):

> Every slider is clamped to a pre-engineered envelope before the geometry is built. That is what guarantees a buildable structure: not a live finite-element check on every configuration, but the shape's inability to leave a family that has already been engineered once. Push any control to its extreme and the Eden still reads as buildable, because it cannot leave the box.
>
> The ecology figures, habitat area, pollinator cells, rainwater capture, and carbon, are labeled rule-of-thumb formulas built from named constants, not an ecological survey. They move honestly with the design. They are not a certified environmental assessment.
>
> Growth is shown as a projection on a saturating curve, not a warranty. A real planting will vary with soil, aspect, and care. The page shows what the model predicts, clearly dated by year, never as a finished photograph.

**Closing CTA** (ghost-style link, mono, `text-inkBlack`, hover `accentOlive` underline): `Configure your own Eden →`, linking to `#/`.

## 9. Responsive behavior

- Reading column: `max-w-[880px]` centered, `px-6 md:px-10`.
- Section vertical rhythm: `py-20` on mobile, `py-32` on desktop, via Tailwind responsive classes rather than a single clamp, so section breaks stay legible at small viewports.
- D3's four-panel row: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, panels keep a fixed aspect ratio (`aspect-[3/4]`) so they don't distort as columns reflow.
- D4's three-panel row: `grid-cols-1 sm:grid-cols-3`, same aspect-ratio discipline.
- All SVG diagrams use a `viewBox` with no fixed pixel width or height, only a `max-width` in CSS, so stroke widths defined in SVG user units (0.5, 0.75) stay visually consistent at any render size rather than scaling with the container.
- Mono annotation floor: never render below 10px even at the smallest breakpoint; reduce the surrounding whitespace before reducing this type size.

## 10. Motion and reduced motion

Keep motion minimal and one-directional, in line with how this fleet already treats explainer and portfolio pages (a single entrance fade, no stagger, no ambient looping motion on a documentation surface).

- Each section fades in once when it enters the viewport: opacity 0 to 1 plus an 8px upward translate, 350ms, ease-out, triggered by an `IntersectionObserver` (threshold ~0.2), firing once per section.
- Within D2, D3, and D4, no continuous motion. The `AccentMark` highlights are static, not pulsing, since this is a reading surface, not a live status indicator; reserve pulse or breathe effects for surfaces that show working state, which this page does not have.
- Call the existing `useReducedMotion()` hook (`src/ui/useReducedMotion.ts`) at the page root. When it returns true, skip the `IntersectionObserver` entrance entirely and render every section at its final, settled state on mount, exactly the same pattern the 3D scene already uses to snap the growth animation instead of easing it.

## 11. Files

New:
- `src/pages/EnginePage.tsx` (the route's top-level component, composes the six sections)
- `src/pages/engine/EngineSection.tsx` (ground wrapper + ink-color context)
- `src/pages/engine/hairline.tsx` (DimensionLine, ExtensionLine, LeaderCallout, SectionHatch, AccentMark primitives)
- `src/pages/engine/SiteEnvelopeDiagram.tsx` (D1)
- `src/pages/engine/SunPathDiagram.tsx` (D2)
- `src/pages/engine/StrutFieldDiagram.tsx` (D3)
- `src/pages/engine/GrowthPhasesDiagram.tsx` (D4)
- `src/pages/engine/PipelineSchematic.tsx` (the lightweight box-and-arrow graphic in section 2)

Modified:
- `strutOptimizer.ts`: replace the four em-dash occurrences in `habitProfile()`'s `strategy` strings with a colon or period.
- Whatever router file Edward lands (routing `#/engine` to `EnginePage`).
- `tailwind.config.js`, `src/index.css`, font loading: per `DESIGN-DIRECTION.md`, assumed already landing in Edward's parallel foundation task, not repeated here.

## 12. Build order

1. `hairline.tsx` primitives and `EngineSection.tsx` wrapper, since all four diagrams and all six sections depend on them.
2. Section 1 and section 6 (no diagrams, validates the type system and copy rhythm end to end fastest).
3. D1 inside section 2 (simplest diagram: static plan and section, no live-computed curves beyond the rib silhouette already used elsewhere).
4. D2 inside section 3.
5. D3 inside section 4 (most complex: four computed panels).
6. D4 inside section 5.
7. Responsive pass, then reduced-motion pass.
