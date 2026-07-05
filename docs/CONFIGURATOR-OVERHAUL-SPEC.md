# Living Eden: Configurator Overhaul Build Spec

Status: ready to build. Directed by Daniel on 2026-07-05, superseding the scope boundary in `DESIGN-DIRECTION.md`. The Eden documentation language (field colors, hairline linework, editorial serif, mono annotation) now governs the whole app, not just the Generative Engine page. `DESIGN-DIRECTION.md` §5 has been amended in place to record this rather than silently rewritten; see the amendment note there.

This spec covers the three configurator steps (Site, Design, Grow), the shared shell (Navbar, ProgressMarker, CtaLink, ReserveCTA, ErrorBoundary), the R3F simulation scene, and every user-facing string in the flow. `src/engine/` stays off-limits except display strings, the same exception already used for the `strutOptimizer.ts`/`growth.ts`/`species.ts` em-dash fixes.

## 0. Principles

- **One system, not two.** The configurator and the Engine page are now one visual language. A visitor who opens the Engine page from the configurator's Navbar, or arrives at the configurator from the Engine page's closing link, should feel zero seam.
- **Single chromatic accent, still.** `accentOlive` is the only color in the whole app that means "look here." It marks exactly two things in the configurator: the untouched recommended default (until the user actively chooses something), and the current active step in the progress marker. It never fills body text and it never appears twice in the same view region doing two different jobs.
- **Hairline vocabulary, reused, not reinvented.** `src/pages/engine/hairline.tsx` (`DimensionLine`, `ExtensionLine`, `LeaderCallout`, `AccentMark`) already exists and is battle-tested from the Engine page build. The configurator's interactive plot mapper adopts these same primitives instead of inventing new SVG. This is the literal, buildable version of "use geometric objects to explain the concept."
- **The flow IS the pipeline.** The Engine page explains the four-function pipeline as a diagram. The configurator now LIVES it: Step 1 (Site) is where the plot and sun enter the pipeline, Step 2 (Design) is where the geometry and strut field compute, Step 3 (Grow) is where growth and price resolve. Each step's one-time entrance motion literally re-enacts its own pipeline stage. This is the throughline for the whole motion spec in §7.
- **Calm architect voice, everywhere.** The copy audit in §8 found the existing copy is already mostly disciplined (no filler adjectives, no "seamless/elevate/delve/unleash"). The real violations are narrower than a full rewrite: two dev-language leaks (the price placeholder note, the reserve confirmation), a handful of em dashes living in `pricing.ts` (engine code, same category of fix Edward already made elsewhere), a heading case convention that hasn't caught up to the Engine page's, and two emoji that read as a notch too cute for the register everything else on the page now has.

## 1. Global tokens and typography migration

**Ground.** `paperVellum` (`#FBF9F3`) replaces `paper` (`#F6F4EE`) and `paperDeep` (`#EDE9DF`) as the app-wide background. It is the same neutral the Engine page's vellum sections already use, so the two surfaces stop looking like two different products glued together.

**Ink.** `inkBlack` (`#17160F`) replaces `ink` (`#1E1B17`), `inkSoft` (`#57514A`), and `inkFaint` (`#8B857B`) as the single ink family. Use opacity, not three separate hex values, for the weight ladder: `text-inkBlack` at 100% for primary text, `text-inkBlack/70` for secondary, `text-inkBlack/45` for tertiary/faint. This is the same discipline `EngineSection`'s `opacity-90`/`opacity-70`/`opacity-80` utilities already use; extend it here rather than keeping three named grays.

**Accent.** `accentOlive` (`#ACC13A`) replaces `moss` and `mossDeep` as the one functional accent. `bloom` (coral, `#E06A4E`) is retired from active use: the north/orientation marker that used to be coral becomes the accent-olive highlight instead, since an orientation marker is exactly the kind of single "functional highlight" `accentOlive` exists for.

**Accessibility guardrail, stated explicitly because it isn't in `DESIGN-DIRECTION.md` yet:** `accentOlive` is a light olive-yellow-green. It fails AA contrast as a text color on `paperVellum`. It is a fill, a ring, a dot, or an underline decoration, never a text color for anything longer than a single glyph. Every place this spec calls for an accent-olive "recommended" or "active" mark, it is paired with a plain-ink text label too (the fleet's existing never-color-alone rule), never relying on the ring or dot by itself.

**What is kept, deliberately:** `amber` (`#B8842A`) survives as the one semantic warning color, distinct from the brand accent, used only for honest caveats (the plot-clamp warning, the price disclosure dot). It is not decorative and it is not the brand accent; it is doing the same job Job Watch's amber does elsewhere in this fleet's other products. `line` (`#DED8CB`) survives as the neutral hairline border color; it reads correctly on `paperVellum` without changes. `bark` (`#9c8466`) is dropped from the 3D scene per §6 below but the hex can stay defined in Tailwind for now since nothing else depends on removing it.

**Typography.** Fraunces (`font-display`) is retired as the app's display face. Every heading in the configurator migrates to the same two-tier system the Engine page already uses:

- `font-quote` (Bodoni Moda) is reserved for exactly one moment across the *entire* product: the Step 1 hero H1, since Step 1 is the true front door of the configurator the same way the Engine page's own hero is its front door. Using it more than once dilutes the one deliberate high-contrast moment into wallpaper, so Steps 2 and 3 do not get it.
- `font-serifDisplay` (Source Serif 4, the Freight Big Pro stand-in) is the workhorse for the Step 2 and Step 3 H1s, the Navbar wordmark, the price figure, and every other display moment. This exactly mirrors how the Engine page uses `font-serifDisplay` repeatedly across sections 2 through 6.
- `font-mono` (IBM Plex Mono) picks up every small utility string: eyebrows, pill habit tags, dimension labels, the progress marker's step labels, the Navbar's "the engine" / "start over" links. Where the Navbar currently renders these as plain sans text, they move to `font-mono text-[11px] uppercase tracking-[0.14em]`, matching the Engine page's own header link treatment exactly, so the two surfaces' chrome reads as one continuous system.

**Case convention.** The lowercase display headings ("where's your garden?", "design your eden", "watch it grow") were a "Folly"-era stylistic tic. They migrate to sentence case, matching the Engine page's headings. Pill and chip labels (size presets, sample plots, species names) stay sentence case (already correct in `species.ts`). Small mono utility strings (eyebrows, nav links, dimension labels) stay lowercase, matching the established Engine page convention for that specific role. The Navbar wordmark becomes "Living Eden" (title case), matching how the docs and the price card already write the product name.

## 2. Pill vocabulary

One control family, used for every discrete choice in the app (size presets, species chips, growth-year toggle, sample-plot chips, CTAs). Continuous sliders (openness) are not pills; see the note at the end of this section.

**Anatomy:**
- Radius: fully rounded, `rounded-full`, no exceptions.
- Height: 40px for compact chips (species, sample plots), 44px for the size-preset segmented group, 48px for primary CTAs (`CtaLink` solid variant already uses this height, unchanged).
- Border: 1px `border-line` when unselected.
- Unselected fill: `bg-paperVellum` (or `bg-white/60` where it needs to read as elevated above the vellum ground, e.g. floating over the 3D stage), text `text-inkBlack/85`.
- Selected fill: `bg-inkBlack`, text `text-paperVellum`, no border. This is the single "this is chosen" signal used everywhere: species, size, growth year. It deliberately does not use `accentOlive`, because that color is reserved for the narrower "recommended" and "current step" jobs below, and if every selection in the app turned olive it would stop meaning anything.
- Recommended-but-untouched state: same visual as unselected, plus a 1.5px `ring-accentOlive/70` and a small mono tag reading `recommended` (10px, uppercase, `text-inkBlack/70`, positioned as a trailing label beside or below the pill, never as a leading mark before the pill's own text, per the standing no-decorative-mark-before-text rule). This state disappears the moment the user actively changes that control and returns to the same option; at that point it is just a normal selected pill. Practically: track one boolean per control, `touched`, flip to `true` on the first `onClick`/`onChange`, and only render the ring/tag when `!touched && isDefaultOption`.
- Hover (unselected): border shifts to `border-inkBlack/40`.
- Disabled: `opacity-40`, no hover.
- Focus-visible: 2px `accentOlive` outline, 2px offset, app-wide (see `:focus-visible` rule below, replacing the current `moss` outline in `src/index.css`).

**Inventory, mapped:**
- `StepSite.tsx` sample-plot chips: pill, compact height, no recommended state (there is no single "best" sample; the loaded default plot already stands in for a recommendation, see §4).
- `StepDesign.tsx` size presets: currently three stacked boxy cards (`rounded-2xl`, two lines of text each). Rebuilt as a segmented pill row (like the existing Year 0/1/3 toggle), each pill showing only the label ("Intimate" / "Standard" / "Grand"). The blurb ("a garden centrepiece") moves to a single line below the whole group that updates to show only the active option's blurb, so only one blurb is visible at a time instead of three competing for attention. "Standard" carries the recommended ring/tag on first load, since it is already `initialPreset` in `store.ts`.
- `StepDesign.tsx` species chips: pill, compact height, wrapped flex row (replacing the current 2-column scrollable grid). Each pill shows the common name; habit moves from an italic subordinate line inside the card to a small mono uppercase tag inside the pill's trailing edge (e.g. `Common honeysuckle` `TWINING`), matching the mono-annotation convention used throughout the Engine page. `lonicera` (honeysuckle) carries the recommended ring/tag on first load, since it is `DEFAULT_SPECIES_ID`.
- `StepPreview.tsx` growth-year toggle: already a pill group; just recolor (selected `bg-inkBlack`/`text-paperVellum` instead of `bg-moss`/`text-paper`).
- `CtaLink.tsx` solid variant: already a pill; recolor hover from `bg-mossDeep` to a subtle `accentOlive` ring/glow-free treatment: keep the fill `bg-inkBlack`, on hover add `ring-2 ring-accentOlive/60` rather than swapping the fill color, so the CTA doesn't compete with the recommended-pill visual language (a filled color change on hover would read as "this button is now the recommended one," which is the wrong signal). Ghost variant: underline changes from `border-ink/40` to `border-accentOlive/60` on hover.

**Continuous slider note:** the openness slider stays a native range input (`input[type=range].botanical` in `src/index.css`), not a pill. Recolor the thumb from `moss` to `accentOlive` fill with an `inkBlack` border (was `paper` border), and the track from `#ded8cb` (already close to `line`, no change needed). Add one small static tick mark on the track at the 0.5 (default) position, a 2px `accentOlive` mark, so the slider itself carries a quiet "here's the sensible starting point" signal without needing a text badge, consistent with the hairline tick-mark vocabulary used everywhere else in the system.

## 3. Per-step reskin and decision steering

### Step 1: Site

- Ground: `bg-paperVellum` (was `bg-paper`).
- Eyebrow: `step one · site`, unchanged copy, now `font-mono`, `text-inkBlack/70`. Add a 16px hairline glyph beside it: a tiny rectangle-with-compass-tick icon (reusing the same visual grammar as the Engine page's D1 site-envelope diagram, just at icon scale), `stroke-inkBlack`, `fill-none`. This is the "geometric object explains the concept" touch: the same shape language the Engine page uses to explain the pipeline shows up here as a small recurring glyph, so a returning visitor recognizes it.
- H1: "Where's *your* garden?" (sentence case, `font-quote`, the one reserved high-contrast moment for the whole flow, italic on "your").
- Subhead: tightened to two short sentences: "Map the patch of ground your Eden will live on. We'll design a pollinator pavilion that fits it and faces the sun."
- Sample-plot chips: per §2, sentence case labels ("Town courtyard", "Suburban lawn", "Walled garden"), no recommended badge (see rationale above).
- PlotMapper: see §6 for the full hairline rebuild. The instruction line above it changes from "drag the edges to size · drag the coral dot to orient" to "drag the edges to size · drag the marker to set north" (removing the color reference entirely, since the marker's color may not always be the most robust way to describe it, and the function-first phrasing reads better anyway).
- Primary CTA: "design your Eden →" stays worded as is (already good, active verb, no giveaway language), becomes `sticky bottom-4` (see below).

### Step 2: Design

- Ground: `bg-paperVellum`.
- H1: "Design *your* Eden." (`font-serifDisplay`, sentence case, italic on "your", continuing the thread from Step 1).
- Eyebrow: `step two · design` with a small hairline dome/strut glyph (echoing the Engine page's D3 strut-field diagrams).
- **Layout change, the core steering move:** the current three equal-width columns (Size, Openness, Planting) become a two-tier hierarchy. Size and Planting are the two primary decisions (each visibly reshapes the render, each gets equal visual weight, side by side, roughly 55/45 width split favoring Planting slightly since species is literally the thesis of the whole product). Openness moves below both, full width, visually smaller (a slim slider row, not a column with its own heading weight), since it is a fine-tune, not a headline decision. This directly implements "one primary decision per view region."
- **Price surfaces early:** a new quiet line directly beneath the H1: `font-mono text-[12px] text-inkBlack/70`, reading `estimated £{price} · updates as you choose`, sourced live from `useDesign((s) => s.outputs.price.incVatGBP)`. By the time a visitor reaches Step 3, the number is already familiar, so the big price card becomes a confirmation with full breakdown rather than a first reveal.
- The "engine:" strategy callout (top-right of the stage) stays exactly where it is functionally; just restyle its box from `border-line bg-paper/85` to `border-line bg-paperVellum/90`, and its "engine:" label color from `text-mossDeep` to `text-accentOlive` (this is a legitimate, sparse, single accent use: the one thing in this view that says "the engine did something, look here").
- Primary CTA copy: "see it grow →" becomes "grow your Eden →", tying the same verb into Step 3's new H1.

### Step 3: Grow

- Ground: `bg-paperVellum`.
- H1: "Watch *your* Eden grow." (`font-serifDisplay`, replacing the vaguer pronoun "watch it grow").
- Eyebrow: `step three · grow` with a small hairline growth-arc/leaf glyph.
- Growth-year pill toggle: recolor per §2.
- Ecology readout cards: unchanged structurally, recolor borders/fills to the vellum system, keep the four labels as is (already concrete, no copy issue found).
- Price card: unchanged structurally except the disclosure copy fix in §8, and background/border recolor to vellum system. Price figure in `font-serifDisplay` (was `font-display`).
- Reserve panel: unchanged structurally except the confirmation copy fix in §8.
- Primary CTA (the reserve button) stays where it is inside the reserve panel; it does not need the sticky treatment since it is already inside a scrollable side panel with its own natural visibility, but the "back to design" ghost link at the page bottom does get the same sticky treatment as the other steps' primary CTAs for consistency.

### Sticky primary CTA, all three steps

Every step's primary forward action becomes `position: sticky; bottom: 1rem` within its scroll container, with a `bg-paperVellum/90 backdrop-blur` pill background so it reads clearly once it is pinned over content scrolling beneath it. This is a pure CSS change (`sticky bottom-4 z-20` Tailwind classes on the existing CTA row), no JavaScript viewport detection needed: sticky elements naturally pin once the page scrolls past them, which is exactly "always reachable without extra scrolling," and on tall viewports where the content never scrolls past the CTA in the first place, sticky positioning is a no-op and nothing looks different from today.

## 4. Progress marker and Navbar

- Wordmark: "Living Eden" (title case), `font-serifDisplay`, unchanged size/position.
- "the engine" / "start over" links: move to `font-mono text-[11px] uppercase tracking-[0.14em]`, matching the Engine page header's link treatment exactly.
- Sprout glyph: recolor from moss greens + coral berry to `inkBlack` line strokes with one `accentOlive` fill for the single berry dot (was coral), keeping the glyph's silhouette but bringing it into the one-accent system.
- ProgressMarker states:
  - Upcoming: `bg-line` dot, `text-inkBlack/45` number, no ring.
  - Done: `bg-inkBlack` dot, `text-paperVellum` checkmark, no ring.
  - Active (current step): `bg-inkBlack` dot, `text-paperVellum` number, plus a 2px `ring-accentOlive` and its label visible, exactly the single sparse accent use the progress marker gets.
- **Decisions, not just position:** each completed step's dot gets a `title`/tooltip-style caption (a small `role="tooltip"` popover on hover/focus, not permanently visible, to keep the floating pill slim by default) summarizing the decision made there:
  - Step 1: `{width}×{depth}m, {north}°` (e.g. "8×6m, 0°")
  - Step 2: `{sizeLabel} · {speciesCommon}` (e.g. "Standard · Common honeysuckle")
  - Step 3 has no summary (it's the last step; the price card already shows everything).
  This satisfies "shows what you decided" without adding permanent visual weight to the navbar.

`:focus-visible` in `src/index.css` changes from `outline: 2px solid #5e6e2b` (moss) to `outline: 2px solid #ACC13A` (accentOlive), and the two `role="slider"` focus rules (the SVG plot-mapper handles) move from moss to accentOlive/inkBlack to match: `stroke: #17160F` structural ring color, `fill: #ACC13A` for the actual focused knob fill, replacing the current moss-ring/coral-fill split, so a keyboard user sees the same one-accent language everywhere.

## 5. Simulation scene (R3F canvas) respec

This is the section addressing the "beige gradient sky, saturated green plot plane, salmon/yellow blobs" clash directly. Every color below is drawn from the existing token sheet, nothing invented.

**Background and fog** (`Scene.tsx`): `<color attach="background" args={['#FBF9F3']} />` (was `#F6F4EE`), `<fog attach="fog" args={['#FBF9F3', 20, 46]} />`, matching background exactly so distant geometry fades to flat vellum, not a beige haze.

**Lighting mood:** flatten toward an even, quiet "studio" light rather than the current warm golden-hour feel, since a technical drawing is presented in even light, not dramatic light. `ambientLight` intensity 0.95 (was 0.85). `directionalLight` intensity 1.2 (was 1.35), position unchanged. `hemisphereLight` sky color `#FBF9F3` (was `#fbfaf5`, negligible change), ground color `#E4E0D2` (was `#d8cfae`, this is the single biggest contributor to the "beige gradient sky" complaint since it was a warm tan bounce color; the replacement is a cooler, closer-to-vellum neutral), intensity 0.6 (was 0.7).

**Ground plane** (`GardenContext.tsx`): the plot rectangle currently fills with saturated `rgba(122,139,60,0.14)` (moss-tinted green) and strokes `#7A8B3C` (moss). Replace with a flat, nearly-neutral fill (`rgba(23,22,15,0.03)`, i.e. a whisper of inkBlack, not a color at all) and an `inkBlack` stroke. Add a hairline 1m grid across the plot's interior: the existing grid-tick lines in `PlotMapper`'s 2D SVG already do this at `strokeOpacity={0.12}` in moss; the 3D ground plane gets the equivalent treatment, thin `inkBlack`-colored line segments at 1m spacing, opacity 0.10, recreating the "drawing-sheet grid" the brief calls for. Note for implementation: WebGL line width is not reliably controllable across GPUs/browsers (`THREE.Line` materials mostly ignore `linewidth` outside a few platforms), so the primary-vs-secondary weight distinction that stroke width does in the 2D hairline system is expressed here as opacity tiers instead: the plot boundary edge (primary) renders at full `inkBlack` opacity, the interior 1m grid (secondary) renders at 0.10 opacity. This is not a compromise; it is the correct 3D translation of the same "primary line, secondary line" idea `hairline.tsx` already encodes as stroke-width for SVG.

The surrounding ground disc (`#e7e1d1`) becomes `#EFEBDD` (a touch cooler, closer to the vellum family). The gravel apron under the Eden (`#d9d0b8`) becomes `#E5DFC9`. Planting-bed circles (`#5b4632`) darken slightly toward the ink family, `#2A2419`, since they are a literal soil material, not a brand color, and should recede rather than compete.

**North marker** (`GardenContext.tsx`): the coral cone (`#E06A4E`) becomes `accentOlive` (`#ACC13A`). This is exactly the "functional highlight" role Daniel names explicitly (selected face / orientation mark), and it retires `bloom` from the 3D scene entirely.

**Structure** (`Eden.tsx`): the timber cylinders recolor from `#9c8466` (literal brown timber) to `#17160F` (inkBlack), roughness raised slightly to `0.62` (a touch more matte, reads closer to a drawn line than a glossy rod), metalness stays 0. Cylinder radius tightens from `0.03` to `0.024` so the structure reads thinner, closer to "linework," at typical camera distance. Implementation note for whoever's worried this undercuts the "genuinely cuttable real timber" honesty argument: that argument is carried by the copy (component counts, the cut list, "115 timber pieces," the disclosure text), not by literal wood-brown coloring, so recoloring the mesh doesn't weaken it.

**Strut density heatmap** (`scene/util.ts` `heatColor()`, used by `StrutHeatmap.tsx`): this is the direct source of the "salmon/yellow blobs" complaint. The current ramp sweeps hue 130° (green) down to 0° (red) as density rises, an unrelated three-color rainbow with an emissive glow (`emissiveIntensity: 0.45`) on top. Replace with a two-stop interpolation from `inkBlack` (sparse, t=0) to `accentOlive` (dense, t=1):

```ts
const SPARSE = new THREE.Color('#17160F');
const DENSE = new THREE.Color('#ACC13A');
export function heatColor(t: number): THREE.Color {
  return SPARSE.clone().lerp(DENSE, Math.min(1, Math.max(0, t)));
}
```

Drop the emissive glow entirely (`emissiveIntensity: 0` or remove the `emissive` prop), since a glowing sphere reads as neon/HUD, which is exactly the register this whole system is moving away from. The result: sparse cells are nearly invisible dark specks, dense cells glow with the one accent color the rest of the app already uses to mean "look here," so the strut field visualization now uses exactly one hue in the entire scene instead of a rainbow sweep.

**Growth foliage** (`scene/util.ts` `leafColor()`): currently hue 95 to 120 (yellow-green to green), disconnected from the token sheet. Retune to sit in the same hue family as `accentOlive` (`#ACC13A` is roughly hue 74°, saturation 51%) but with organic variation so foliage doesn't look like flat UI paint on a living shape: hue range 66 to 80, saturation 0.45 to 0.6, lightness 0.30 to 0.45 (richer/darker than the flat UI accent, appropriate for a material rather than a chip). This is "muted foliage tones that agree with the field palette" stated as an exact HSL range Edward can drop straight into the existing `setHSL()` call.

## 6. PlotMapper: full hairline rebuild

`PlotMapper.tsx` is rebuilt to import and reuse `DimensionLine`, `ExtensionLine`, and `AccentMark` from `src/pages/engine/hairline.tsx`, wrapped in an `InkProvider value={INK.inkBlack}` (also imported from `hairline.tsx`) so every primitive resolves to the right ink automatically.

- Compass ring: dashed `stroke="#DED8CB"` stays as the neutral hairline dash it already is (that part was never the problem), but the plot rectangle's fill (`rgba(122,139,60,0.14)`, moss) and stroke (`#7A8B3C`, moss) both change to `inkBlack` at the weights described in §5.
- Grid ticks inside the plot (`GridTicks`): currently `stroke="#7A8B3C" strokeOpacity={0.12}` (moss); recolor to `stroke="#17160F" strokeOpacity={0.10}`, matching the 3D ground plane's grid exactly so the 2D mapper and the 3D stage read as the same drawing at two different moments.
- Width/depth labels: currently raw `<text>` elements. Replace with actual `<DimensionLine>` components (from `hairline.tsx`) running along the top and right edges of the rectangle, each labeled with the live value (`{plot.widthM.toFixed(1)}M`, uppercase per the mono convention), so the plot mapper becomes a literal instance of the same dimension-line language the Engine page's D1 diagram uses, not just a similarly-colored rectangle.
- North marker: the coral line + coral knob circle become `accentOlive`. The knob keeps its interactive `role="slider"` ARIA exactly as built (no accessibility regression); only its fill color changes, from `fill="#E06A4E"` to `fill="#ACC13A"`, with the stroke/border changing from `stroke="#F6F4EE"` to `stroke="#FBF9F3"` (paperVellum).
- Edge handles (`EdgeHandle`): currently `fill="#F6F4EE" stroke="#5E6E2B"` (moss-deep); recolor to `fill="#FBF9F3" stroke="#17160F"`.
- Readout labels (width/depth/area/orientation beneath the SVG): font changes from `font-display` to `font-mono` with `tabular-nums`, matching the Engine page's own annotation-strip convention for live numeric readouts.

## 7. Motion language

The throughline: each step's one-time entrance animation is a lived version of its own pipeline stage from the Engine page's diagram. All of it is CSS/Tailwind transitions or R3F `useFrame` easing, no new dependency, and every motif has an explicit reduced-motion fallback via the existing `useReducedMotion()` hook, matching the pattern already established in `GrowthOverlay.tsx`.

**Duration/easing tokens**, proposed as new CSS custom properties in `src/index.css` (currently this repo has none; add them so both the configurator and any future Engine-page revision share one vocabulary):

```css
:root {
  --dur-instant: 120ms;
  --dur-fast: 200ms;
  --dur: 350ms;      /* matches EngineSection's existing 350ms entrance fade */
  --dur-slow: 700ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

**Step 1, plot draws itself:** on first mount, and whenever a sample-plot chip is clicked (a discrete, non-drag change), the plot rectangle's four edges animate in via the classic SVG stroke-dasharray/stroke-dashoffset draw-in technique: `stroke-dasharray` set to the path's total length, `stroke-dashoffset` animated from that length to 0 over `--dur-slow` (700ms) with `--ease-out`. This does not run while the user is actively dragging an edge handle, since drag interaction needs to feel immediate. Reduced motion: render the rectangle at full opacity with no dash animation, `stroke-dashoffset: 0` immediately.

**Step 2, struts rise:** on entering Step 2, and whenever the size preset changes (a discrete change, not the continuous openness slider), the structure's timber members animate upward from their base rather than snapping into place. Implementation: a single `buildProgress` scalar animates 0 to 1 over `--dur-slow` (700ms, `--ease-out`) via `useFrame`; each member's matrix is computed as a lerp between a collapsed position (the member's own start point, so it looks like it extrudes upward from the ground) and its full end point, gated by a small per-member delay keyed on the member's `v` (height parameter, 0 at ground, 1 at apex) so lower rings and rib segments complete first and the dome visibly builds upward, the same bottom-up logic `GrowthOverlay.tsx` already uses for foliage coverage. Reduced motion: `buildProgress` is always 1, no staggering, members render at final position immediately, exactly how `GrowthOverlay` already snaps instead of easing.

**Step 3, foliage fills:** this motion already exists correctly in `GrowthOverlay.tsx` (the eased coverage animation toward the target growth stage, with reduced-motion snap). No new logic needed here, only the recoloring in §5.

**Step transitions:** the current `{step === 1 && <StepSite />}` conditional render swaps instantly with no transition. Add a simple crossfade: the leaving step fades out over `--dur-fast` (200ms), the entering step fades in plus an 8px upward translate over `--dur` (350ms, `--ease-out`), matching the Engine page's own section entrance fade exactly so moving between configurator steps and scrolling through the Engine page feel like the same motion language. Reduced motion: instant swap, no fade, no translate, matching the existing app-wide reduced-motion convention in `src/index.css`.

**Recommended-badge entrance:** optional, low priority. If built, the ring and "recommended" tag fade in over `--dur-fast` (200ms) after their pill has rendered, rather than appearing instantly. Not required for the first pass.

**Pill state changes:** formalize the existing ad hoc `transition` classes to `transition-all duration-150` (using `--dur-instant`-equivalent), so hover/press/select feedback across every pill in the app shares one timing.

## 8. Copy pass

**Voice rules, restated for this pass:** no em or en dashes as punctuation anywhere, ever, at the source (the runtime `deDash()` in `src/ui/text.ts` exists as a safety net for engine strings and should become redundant for anything newly written here, not relied upon). Never "Folly." No "seamless," "elevate," "delve," "unleash," "effortless," "empower," no "it's not just X, it's Y" constructions, no exclamation-mark enthusiasm, no generic wonder-copy. A calm architect who shows their working: concrete nouns, short sentences.

**Audit finding:** the existing copy is already close to compliant. No instance of the banned AI-giveaway vocabulary was found anywhere in the flow. The real fixes are narrower:

1. **Two genuine dev-language leaks**, both need composed rewrites:
   - `StepPreview.tsx`'s price disclosure: `"Placeholder rate. TODO: wire a real fabrication quote against this cut geometry."` becomes: **"This is an estimate built from a placeholder rate, not a confirmed fabrication quote yet. The price moves correctly as the design changes. We will confirm the true cost once a fabricator quotes this exact cut list."** Same honesty, composed prose instead of a literal engineering TODO.
   - `ReserveCTA.tsx`'s reserved-confirmation footnote: `"MVP: intent logged to the console, no backend wired."` becomes: **"This reserves your interest for our records. No backend is connected in this demo yet, so nothing has actually been sent."** Keeps the same disclosure (appropriate for an accelerator-facing prototype, reviewers should know this) without the dev jargon.

2. **Em dashes at the source, in `pricing.ts` (engine code), same category of fix Edward already made in `strutOptimizer.ts`/`growth.ts`/`species.ts`:**
   - `` `Planting — ${plantCount}× ${species.common}` `` → `` `Planting: ${plantCount}× ${species.common}` ``
   - `'PLACEHOLDER rate — TODO: wire real fab quote'` → `'Placeholder rate, not yet a confirmed fabrication quote'`
   - `'mandatory — counted as COGS'` → `'mandatory, counted as cost of goods'`

   These three lines are genuinely user-facing (rendered in the "how this is priced" disclosure), so they need the source-level fix, not a `deDash()` patch.

3. **Heading case and H1 copy**, per §3: all three step H1s move to sentence case with the "your Eden" thread: "Where's *your* garden?" / "Design *your* Eden." / "Watch *your* Eden grow."

4. **Two small tightenings**, not required but recommended: Step 1's subhead splits into two sentences (§3). CTA copy: "see it grow →" becomes "grow your Eden →".

5. **Emoji swap.** `ErrorBoundary.tsx`'s 🌱 and `Scene.tsx`'s `NoWebGL` fallback's 🌿 both read a notch too cute for the register the rest of the system now has. Replace both with a small inline hairline SVG glyph (a simple line-drawn sprout, reusing the same visual grammar as the existing `Navbar` sprout icon, just simplified to a single-color `inkBlack` line-art version), 32 to 40px, `stroke-inkBlack`, `fill-none`. The wording in both ("something snapped a twig", "this browser can't render the 3D stage") stays, just move to sentence case where it isn't already ("This browser can't render the 3D stage.").

6. **Sample-plot and pill labels** move to sentence case per §1/§2: "Town courtyard", "Suburban lawn", "Walled garden".

7. **PlotMapper instruction line**, per §6: "drag the edges to size · drag the coral dot to orient" → "drag the edges to size · drag the marker to set north".

Everything else already reads correctly and does not need to change: the "how this is priced" / "cut list, is this real?" disclosure summaries, the structural-validity paragraph in the cut-list disclosure (already phrased almost identically to the Engine page's own honesty section), the ecology labels, the "Reserves a slot for a site visit. No payment taken." line, all of `ProgressMarker`'s step labels.

## 9. Keep list, confirmed unchanged

- The guided 3-step structure (Site → Design → Grow), no new steps, no step removal.
- `src/engine/` untouched except the three display-string fixes named in §8.2, following the exact precedent Edward already set.
- All existing keyboard accessibility and ARIA on `PlotMapper`'s handles (`role="slider"`, `aria-valuemin/max/now/text`, keyboard nudge via arrow keys): only colors change, no attribute or interaction logic is touched.
- `ErrorBoundary.tsx` and the `NoWebGL` fallback path: only the emoji swap and case fix from §8.5, logic untouched.
- The Engine page cross-links (`routes.configurator`, `routes.engine`): unchanged, just restyled per §4.
- `useReducedMotion()` as the single source of truth for every motion fallback in §7, no new mechanism introduced.

## 10. Phase plan

Given the scope, split into three slices with a clean seam, in this order:

**Phase A (do first): steps, pills, copy, progress marker, price timing.** Pure React/Tailwind, zero `three.js`/R3F changes. Covers §1 through §4 and §8. This is the highest-value, lowest-risk slice and is fully buildable in one focused pass.

**Phase A2 (bundle with A, cheap, ship together): scene color-only respec.** Covers §5 and the north-marker/ground-plane recolors, excluding the new motion logic. This is a small diff, mostly hex-value and material-property changes in `Scene.tsx`, `GardenContext.tsx`, `Eden.tsx`, and `scene/util.ts`'s `heatColor()`/`leafColor()`. It should ship alongside Phase A rather than after it: shipping A without A2 would leave the new vellum/pill UI sitting on top of the old beige/moss/salmon 3D scene for a visible window, which is exactly the mismatch this whole overhaul exists to fix.

**Phase B (second pass): geometric motion.** Covers §6 (PlotMapper hairline rebuild, which includes its own small motion-adjacent behavior) and §7's new motion additions (plot draw-in, strut build-in-rise, step-transition crossfade). This is genuinely new interaction logic with more testing surface than A/A2, so it is the right place to draw the seam if one focused pass can't cover everything.

## 11. Open items for Daniel

- The "recommended" pill treatment assumes the current defaults (Standard size, honeysuckle species) are in fact what should be recommended. If the accelerator wants a different steering target, only the `isDefaultOption` check changes, not the mechanism.
- The Step 2 primary-decision reweighting (Size and Planting as co-equal primaries, Openness demoted) is my read of "one primary decision per view region." If the actual steering priority is different (for instance, if Openness should be elevated because it is the cheapest way to change the silhouette), that is a one-line layout change, not a rebuild.
