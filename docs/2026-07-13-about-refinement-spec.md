# About page refinement spec — round 3 (2026-07-13)

For Edward. Six changes, all on top of the shipped v2 timeline
(`src/pages/about/CrossPathsTimeline.tsx`, spec `docs/2026-07-13-timeline-v2-composition-spec.md`,
handoff `docs/handoffs/2026-07-13-timeline-v2-implemented-and-new-projects.md`) and the project
list (`AboutPage.tsx`, `about/projects.ts`). Everything reused from v2 that isn't explicitly
changed below stays exactly as built: the piecewise axis, the seam fix, the spine and branch-edge
mechanics, the plate tiers and no-overlap cluster packing, the one-colour `INK_BLUE` rule. The two
100svh section spacers are explicitly **not** kept as-is — see section 4, corrected below; an
earlier pass through this doc said they stayed unchanged, that was wrong.

Scope: (1) replace the seed finale with a woven arch that frames the wordmark in the brand's own
mono lettering, plus a cleanup of the 2021 merge region, (2) give every branch edge a small
ornamental leaf where it meets its plate, (3) make the year labels heavy and guarantee they're
never occluded, (4) actually tighten the founders section's vertical whitespace, (5) standardize
the project detail hierarchy and pack its images by their real aspect ratios, (6) real draft founder
bios built from the facts already in this repo, (7) timeline autoplay on entry.

---

## 1. The finale: from seed to weave

**Kill the seed entirely.** `seedPath`, `embryoPath`, the ovoid outline, the dashed inner line, the
embryo curl, and the base dot in `growth.ts` and `CrossPathsTimeline.tsx` are all removed. Daniel's
instruction is explicit: no egg, no teardrop. Those shapes read as an egg regardless of the
botanical rationale in the code comments, and the fix is not a rounder or pointier ovoid, it's a
different idea entirely.

**The replacement is literal, not decorative: a bower.** A bower is a shelter made by weaving
branches together into an archway. The timeline already has two lineages merging into one spine at
the top; the finale is the mirror of that gesture, one spine forking back into two arms that weave
over and under each other and frame the wordmark, the way real branches would frame the doorway of
an actual bower. This is the payoff earning its name, not an icon standing in for it.

### Geometry

Replace `SEED_A`/`SEED_B`/`CONVERGE_Y`'s seed math with a weave zone directly below where the spine
currently ends:

```
WEAVE_START_Y = CONVERGE_Y                    // 3030, unchanged — where the spine forks
WEAVE_ZONE_H  = 300
WEAVE_END_Y   = WEAVE_START_Y + WEAVE_ZONE_H  // 3330 — where the two arms rejoin
WORDMARK_Y    = lerp(WEAVE_START_Y, WEAVE_END_Y, 0.48)
PAYOFF_Y      = WEAVE_END_Y + 90
H             = PAYOFF_Y + 60                 // 3480, ~4 units off the old 3484 — pacing unchanged
WEAVE_AMPLITUDE = 88
```

At `WEAVE_START_Y` the spine forks at its own last sampled point (the same shared-coordinate
discipline as the 2021 lineage merge, just run in reverse: one point splitting into two). Each arm
is parameterised by `t ∈ [0,1]`:

```
y(t)     = lerp(WEAVE_START_Y, WEAVE_END_Y, t)
AMP(t)   = WEAVE_AMPLITUDE * sin(π·t)            // 0 at both ends, peaks at t=0.5
θ(t)     = 3π·t                                   // three half-turns → 2 interior crossings
x_L(t)   = CX + AMP(t) · sin(θ(t))
x_R(t)   = CX − AMP(t) · sin(θ(t))
```

Zeros of `sin(θ(t))` fall at `t = 0, 1/3, 2/3, 1`. The two interior zeros (`t = 1/3` and `t = 2/3`,
`Y = 3130` and `Y = 3230`) are where the arms actually cross; the endpoints are where they meet the
shared fork and rejoin points, not lattice crossings. Sample each arm with `sample()`/`lineGen`
exactly like every other strand in the file.

**Over-under weave.** Split each arm into three segments at the two crossing `t`-values (`[0, 1/3]`,
`[1/3, 2/3]`, `[2/3, 1]`) and alternate which arm paints on top per segment, so it reads as a real
basket weave rather than two lines crossing flat. Literal SVG child order, back to front:

```
armL-seg1, armR-seg1,   // R on top approaching crossing 1
armR-seg2, armL-seg2,   // L on top approaching crossing 2
armL-seg3, armR-seg3    // R on top into the rejoin
```

Each arm segment shares its exact endpoint coordinate with the next segment of the same arm (no
hand-placed joins, same rule as everywhere else in this file). Stroke: `strokeWidth 5.5` per arm,
`INK_BLUE`, full opacity, round caps. Add a small `INK_BLUE` dot (`r 4.5`) at the fork point
(`CX, WEAVE_START_Y`) and a matching one at the rejoin point (`CX, WEAVE_END_Y`) so the gesture
visibly opens and visibly closes, the same dot language used at every branch anchor elsewhere in
the drawing.

**Two small leaf ornaments, not more.** At each of the two crossing points, place one instance of
the leaf motif from section 2 at 0.7× scale. This is the only place the weave gets ornament beyond
the arms themselves; it ties the finale back to the branch-connection language used the rest of the
way down without turning the payoff into clutter.

### The wordmark, framed by the weave

**Correction to an earlier pass of this spec:** the wordmark must NOT stay in the serif-italic
treatment the old seed used. Daniel's instruction is explicit — it goes in the brand font, the same
one the header logo actually uses. That's `BowerMark`/`SplashHeader.tsx:117-119`: `font-mono`,
lowercase, `font-semibold`, `tracking-[0.1em]`, paired with the `OculusMark` glyph at a fixed
size ratio (icon 30px : wordmark 19px in the header, roughly 1.6:1). At `WORDMARK_Y`, render that
exact pairing scaled up ~1.7x for the payoff: `OculusMark`-equivalent icon at `ICON_R = 50`
(reuse the existing `markScale = ICON_R / 100` circle-scaling technique already in this file for
the old faint backdrop, just crisp and full-opacity instead of faint), then "bower" as an SVG
`<text>` (matching how every other label in this file is drawn, not a foreignObject) at
`fontSize 32`, `fontWeight 600`, `letterSpacing '0.1em'`, lowercase, `INK_BLUE`, `fill-opacity 1`,
positioned `LOCKUP_GAP = 10` units right of the icon. Both render in `INK_BLUE`, not neutral ink —
this is the last mark the practice's own drawn line produces, it stays in the line's colour, which
also keeps the one-colour rule intact through the very last pixel.

This is the widest point of the weave (`AMP(0.5) = WEAVE_AMPLITUDE`), so the arms are physically
furthest apart there and the icon+wordmark lockup sits in the actual open space between them, the
way a name would sit under a real archway. Keep the small mono "2026" caption beneath it at the
existing size and treatment.

**Payoff line copy needs a re-look.** "Everything above, folded up and waiting." was written for a
seed (a plan that hasn't happened yet). That metaphor no longer matches a bower (a place that's
already built and sheltering something). Proposed replacement, for Daniel's sign-off, not shipped
as final: **"Everything above, grown into one place."** Keep the same position (`PAYOFF_Y`), size
(19px serifDisplay), and reveal timing.

### Reveal

The spine still dash-reveals up to `WEAVE_START_Y` exactly as today. The weave itself does not
dash-draw (splitting six segments into an arc-length reveal is fiddly for no visible gain); instead
it blooms in as one opacity fade, reusing the existing three-beat window shape:

```
weaveOpacity   = drawnAt(MAX_YEAR-0.75, MAX_YEAR-0.15)   // was seedIn
wordmarkOpacity = drawnAt(MAX_YEAR-0.25, MAX_YEAR)        // was seedName
payoffOpacity   = wordmarkOpacity                          // same beat, no seedCore beat needed
```

Reduced motion: the weave renders at full opacity immediately, same contract as before.

### The 2021 merge region — names only

Not covered in an earlier pass of this doc, and Daniel called it out specifically. The `ORIGINS`
array in `CrossPathsTimeline.tsx` currently carries a `kicker` field ("the line comes from") and
Clay's entry includes his firm ("Clay · Rick Wright Architects, Dallas"). Both go:

```ts
const ORIGINS: Array<{ id: string; lineage: Lineage; side: Side; name: string }> = [
  { id: 'origin-clay', lineage: 'clay', side: 'left', name: 'Clay' },
  { id: 'origin-daniel', lineage: 'daniel', side: 'right', name: 'Daniel' },
];
```

Drop the `kicker` field entirely and its render (the `<text>` at `yearToY(2021) - 84`). The merge
region shows exactly two words, "Clay" and "Daniel," nothing else — no firm name, no explanatory
phrase, no image plate at this point.

---

## 2. Ornate, leaf-like branch connections

Every branch edge currently ends as a plain constant-width line touching a plate's corner. Give it
a real leaf where it meets the plate: a small lanceolate blade with a visible midrib and a couple of
lateral veins, like a botanical plate, not a UI connector.

**Geometry**, appended to the last `BRANCH_LEAF_LEN` units of every branch edge, replacing the bare
line for that stretch (the earlier part of the branch, from the spine anchor up to where the leaf
starts, stays the current thin stroke):

```
BRANCH_LEAF_LEN   = 46   // length of the leafed stretch, measured along the branch
BRANCH_LEAF_WIDTH = 20   // max blade width, at 55% along the leafed stretch
```

The blade outline is two symmetric quadratic curves bulging out to `±BRANCH_LEAF_WIDTH/2` at 55%
of the leafed stretch and tapering back to the centerline at the plate-facing end. Fill
`INK_BLUE` at `0.04` opacity (a whisper of tone, not a solid shape), outline `INK_BLUE` at `0.5`
opacity, `1px`. A midrib runs straight down the center at `0.5` opacity, `1px`. Two pairs of side
veins (`8` to `10px` long) branch off the midrib at roughly 35% and 65% along the blade, angled 30°
toward the plate, `0.35` opacity, `1px` — the one genuinely "ornate" touch, kept thin enough to
read as a diagram accent rather than decoration competing with the photograph beside it.

**Size does not scale with plate tier.** Showcase plates get the exact same leaf as standard
plates. This is the same discipline `OFFSET_X` already followed in v2 (fixed regardless of local
geometry): the connective tissue keeps one calm rhythm no matter how big the destination image is.

**Reveal.** The leaf buds in only once its stem has nearly finished drawing:
`leafOpacity = clamp01((uStem - 0.7) / 0.3)`, so it appears as the very last beat of the branch's
own growth, right before the plate unfurls. This reads as the branch producing the leaf, then the
leaf holding the picture.

---

## 3. Heavy year labels, never occluded

Current ticks are quiet mono 15px at 0.4 opacity, sized for a linework-only drawing. With plates
now dominating, they read as an afterthought and, at their current size, would start clipping into
right-side plates if simply enlarged. Two changes: make them heavier, and make their side dynamic so
they are structurally guaranteed to clear whatever cluster shares that year.

```
YEAR_LABEL_FONT     = 30   // was 15
YEAR_LABEL_WEIGHT   = 700  // was unset (inherits 400)
YEAR_LABEL_TRACKING = 0.05em  // was 0.12em — bigger+bold needs less spacing to stay calm
YEAR_LABEL_OPACITY  = 0.55 // was 0.4
YEAR_TICK_LEN       = 22   // was 14
YEAR_TICK_WIDTH     = 2    // was 1.2
YEAR_TICK_OPACITY   = 0.32 // was 0.28
YEAR_LABEL_OFFSET   = 56   // distance from spine to label baseline, was fixed at CX+46 one-sided
```

Add `font-variant-numeric: tabular-nums` explicitly (house rule for numerals; the mono stack should
already have it, state it so it isn't lost in a font swap).

**Dynamic side.** For each tick year `Y ∈ {2021…2025}`, check `CLUSTERS` for any cluster with
`|cluster.year − Y| < 0.15`. If the nearest such cluster is on the right, draw the tick and label on
the **left** (`CX − YEAR_LABEL_OFFSET`, tick from `CX − 22` to `CX − 40`, `textAnchor 'end'`); if
it's on the left, draw on the right as today; if there's no cluster within that window, default to
the right. This is a general rule, not a hardcoded flip: with the current `CLUSTERS` data only 2024
(`making`, right side) needs to flip to the left, but the rule must be evaluated from the data so it
stays correct as clusters are added or moved. Keep the existing vertical rule too (label baseline
sits above the tick) with a bigger clearance now that the type is heavier: `20px` instead of `9px`.

**Checkable rule.** At every tick year, the label's bounding box (text plus tick) must not intersect
any plate's bounding box, at any tier, on either side. Verify by scrolling past each of the five
tick years in the live build and confirming no label sits over or touches a picture.

---

## 4. Founder-block framing

**The actual complaint, addressed first.** Daniel's note is "too much empty vertical space above
and below it right now" — that's the two `min-h-[100svh]` spacers bracketing this section
(`AboutPage.tsx:649` and `:668`), not a lack of container styling. An earlier pass of this doc
skipped straight to adding a bordered panel and missed the spacing fix entirely; both are worth
doing, but the spacer reduction is the one that actually answers what Daniel flagged.

The spacers exist for a real reason, documented in the code: guarantee the timeline's finale and
the founders heading are never in view together, on any screen. But `sticky` release doesn't
depend on the spacer's height — release happens automatically once the track's own bottom scrolls
past. The spacer only controls how much *extra* scroll happens after release before the next
heading can appear, and `100svh` is far more than that needs. **Reduce both spacers to
`min-h-[38svh]`** — still comfortably more than any real viewport needs to fully release the
sticky frame before "The two of us" enters, so the non-overlap guarantee holds, while roughly
halving the dead scroll on both sides. Tighten the reduced-motion fallback to match, `h-16` (from
`h-24`).

**Then, the container treatment**, which gives the section presence once it's no longer swimming
in empty scroll: "The two of us" currently renders as bare grid items floating in page flow — a
mono kicker, then a two-column grid of `TeamCard`s with no container. Give it the presence of an
actual block, the way the timeline's finale and the Work section already read as deliberate,
framed moments.

- Wrap the two-founder grid in a single bordered panel: `border border-inkBlack/12`, generous
  internal padding (`p-10`, up from none). The section kicker ("The two of us") stays above the
  panel, unchanged position and style, so the panel reads as the block the kicker introduces.
- Add a vertical hairline divider between the two founders on the desktop two-column layout
  (`sm:divide-x sm:divide-inkBlack/12`, or an explicit `1px` middle rule), so the block visibly
  contains two framed halves rather than two cards that happen to sit side by side.
- Each portrait gets a slightly heavier, more deliberate mat: grow from `96/112px` to `128px`,
  border bumped from the currently-unset default to `1.5px border-inkBlack/20` (a shade heavier
  than the plate borders elsewhere, since this is a portrait, not a picture plate). Where a portrait
  is pending (`image: null`), keep the existing quiet `OculusMark` placeholder treatment, just at the
  new size.
- Role line stays exactly where it is (mono uppercase, `text-accentOlive`, directly under the name);
  don't move it into a separate "meta" row, it already reads as a caption.

---

## 5. Project detail hierarchy + dynamic aspect-ratio image stacking

### Hierarchy

Standardize every project's detail panel (`ProjectText` in `AboutPage.tsx`) into five explicit
stages, in this order: **title, credits, description, awards and publications, lessons learned.**
This reorders the current layout, where the paper's venue and authors float above the description
(effectively mid-stream) and the paper download link is stranded at the very bottom after the
takeaway, disconnected from its own citation.

1. **Title.** Unchanged: `h3`, `font-serifDisplay`, 22px.
2. **Credits.** The existing `Meta` component (`{AUTHOR_LABEL[project.by]} · {project.year}`)
   already sits directly under the title in the same row — keep that position exactly, it already
   reads as a byline. No structural change needed here, just naming it as its own stage for
   documentation.
3. **Description.** Unchanged paragraph, unlabeled, directly under credits.
4. **Awards and publications — new, consolidated section.** Currently the paper's venue/authors line
   sits above the description and its download link sits below "What we learned"; both move here,
   into one section, positioned after the description and before the takeaway. Kicker style matches
   "Lessons learned" below it (mono uppercase, but neutral tone, `text-inkBlack/45`, not the olive
   accent — keep olive reserved for the one payoff line so it isn't diluted by using it twice on the
   same panel). Add an optional `awards?: string[]` field to the `Project` interface in `projects.ts`
   (none populated yet; render as a plain list above the publication line when present). **If a
   project has neither `awards` nor `paper`, omit this section entirely** — no empty label ever
   shows.
5. **Lessons learned.** The existing "What we learned" block, unchanged treatment (olive kicker,
   serifDisplay payoff line). Proposed rename of the kicker text itself to "Lessons learned" to match
   the hierarchy's own naming; either wording is a one-line change, flagged for Daniel same as the
   copy calls elsewhere in this doc.

### Dynamic aspect-ratio image stacking

Replace `Gallery`'s current rigid layout (hero forced to `aspect-[3/2]`, remaining images forced
into a uniform `grid-cols-3` row each capped `max-h-[15vh]`) with a layout that respects each
image's real proportions and fills the column's actual available height, the way a proper photo
essay lays out mixed portrait and landscape images rather than cropping everything to one shape.

- **Hero.** Full column width, height set by its own intrinsic aspect ratio
  (`height = width / naturalAspectRatio`), no more forced `aspect-[3/2]`. Cap at `max-h-[46vh]`
  (down slightly from the current 48vh, to leave room for the pack below). `object-fit` stays
  `cover` for photos/renders and `contain` on white for anything with baked-in text, exactly as
  today.
- **Supporting images.** Flow into a CSS multi-column pack below the hero:
  `columns: 2 16px; column-fill: balance` when there are 3 or more supporting images, or
  `columns: 1` (a single stacked column) when there are 1 or 2 — don't force two skinny columns for
  a couple of images. Each image: `w-full h-auto block mb-4 break-inside-avoid border
  border-inkBlack/12`, `bg-white p-1.5` only when `fit === 'contain'` (unchanged rule), no forced
  aspect class, no `object-fit` crop — the image renders at its true intrinsic proportions.
  `column-fill: balance` is what makes this "fill the vertical space": the browser distributes
  images across both columns to even out their total heights instead of stacking everything into
  the first column and leaving the second empty.
- **Videos count as images here.** Several projects' hero and supporting slots are loop videos
  (`ProjectVideoEl`), not stills — Plentify's growth loop, Texas Robotics, Robotic Factory's
  section assembly. They already render as a normal block element with a poster still, so they
  need no special-casing in the pack: give them the same intrinsic-aspect-ratio, no-forced-crop
  treatment as a still image, sized by their poster's real proportions.
- **Column height budget.** The gallery column should target the same rendered height as the text
  column beside it (both already sit inside the same `h-full min-h-0` panel per the "one page, no
  scroll" rule). This is a QA checkpoint for Gojo's live pass (task #13), not a formula to hard-code:
  if the packed gallery visibly falls short of or overruns the text column's height on a
  representative project (try Archipedia, four images, and Flowerfield, six images), adjust the
  column width or the hero's max-height rather than force a fixed pixel target.

---

## 6. Quirky founder bios — real drafts, from facts already in this repo

**Correction to an earlier pass of this doc:** it declined to draft real copy on the grounds that
the specific details "have to come from Daniel and Clay." They already did — Daniel supplied a
fact list for exactly this purpose (papers, employers, real projects, real numbers), and the brief
asked for one candidate draft per founder built from it, not a structural placeholder. Drafting
below, using only facts already in this repo (`projects.ts`, `CrossPathsTimeline.tsx`'s
`CLUSTERS`). No em/en dashes, per house style — commas, periods, colons only.

**Data conflict to flag before this ships.** The brief states Resia is **Clay's** startup, but
`projects.ts` (`n: '08'`) currently attributes it to `by: 'daniel'`, with a TODO on role. Clay's
draft below includes Resia per today's correction; `projects.ts`'s `by` field and its Work-list
placement need a matching fix, flagged for task #10's content pass since it changes attributed
authorship on a real credit, not something to silently swap here.

**Clay — candidate draft:**

> Clay trained as an architect at UT Austin, then spent two years teaching a computer to tell a
> groin vault from a barrel vault, which became two published papers (AAG 2025, ACADIA 2025).
> Before that: years at Rick Wright Architects in Dallas, and a stretch at TestFit, drawing and
> building software for buildings in roughly that order. He also cofounded Resia, an AI
> remodeling platform, either a detour from architecture or the same problem in a different hat.
> TODO(Daniel): confirm years at Rick Wright and TestFit, and the right verb for Clay's role at
> Resia (cofounded, advised, something else).

**Daniel — candidate draft:**

> Daniel has built a $0.25 medical device with fourteen students in Kenya, taught a KUKA arm to
> draw with light, and given a language model a body it can sit on a desk with, a lamp, mostly,
> that runs something called Dream Machine. He spent a stint at Rogers Partners in New York before
> deciding architecture needed an engine, not another renderer, so at Bower he built one.
> TODO(Daniel): confirm your role and dates at Rogers Partners, and whether "Dream Machine" is the
> name you want printed.

**Direction note.** Both lean on one odd, specific, verifiable detail rather than a resume list,
matching the dry, specific voice already established in the project descriptions on this page
(e.g. "It stays deliberately unfinished," `projects.ts:498`, on the Large Language Object). These
are ready to ship as the `bio` field on `TEAM` in `projects.ts` once Daniel confirms the TODOs;
they are not placeholders in need of a different structural treatment.

---

## 7. Timeline autoplay on entry

Not covered in an earlier pass of this doc. Today the camera (`p`, 0-1 in `CrossPathsTimeline.tsx`)
is driven purely by real `window.scrollY` via `getBoundingClientRect` (lines 592-635) — there is no
autoplay. Daniel's ask: entering the timeline should animate downward on its own; once it reaches
the bottom, hand back manual control; any user scroll input cancels the autoplay immediately.

Add this on top of the existing scroll-driven camera, not as a replacement, so the two systems
never fight each other:

- **Trigger, once per page load.** When `trackRef`'s top edge first reaches within ~2px of the
  sticky pin point (`header-h`), and only if `!reduced`, start autoplay. Guard with a
  `hasAutoplayedRef` so scrolling back up and re-entering the section doesn't retrigger it.
- **Motion.** Autoplay animates the *real* scroll position, `window.scrollTo(0, y)` inside a
  `requestAnimationFrame` loop, from the track's start to its end
  (`travel = trackHeight - innerHeight`) over **14 seconds**. Because the existing scroll listener
  (`kick()`) already responds to any change in `window.scrollY`, programmatic or not, it picks up
  autoplay's movement for free through the same lerped camera it already uses for user scroll — no
  second camera system, no duplicated state.
- **Easing**, piecewise, not linear (linear autoplay reads as a video stuck on fast-forward):
  ```
  autoplayEase(t) =
    t < 0.08  →  cubicIn(t / 0.08) * 0.08                    // ease in, first 8%
    t > 0.92  →  0.92 + cubicOut((t - 0.92) / 0.08) * 0.08   // ease out, last 8%
    else      →  t                                            // steady cruise, middle 84%
  ```
  14s at this pacing gives roughly 1.3s of average dwell across the eleven clusters, enough to
  register each branch's unfurl without feeling stalled.
- **Cancellation.** Attach `wheel`, `touchstart`, `touchmove`, and `keydown` listeners for the
  duration of the autoplay run only. The *first* such event stops the rAF loop immediately (a ref
  flag, no scroll-position snap or correction) and hands control back exactly where autoplay left
  it — the existing user-driven camera logic takes over on the very next real scroll event with no
  visible seam, since it was already tracking the same `window.scrollY` throughout.
- **Bottom handoff.** When the animated target reaches `travel` (p = 1), the rAF loop simply stops
  looping — there's no scroll lock to release, since scroll was never disabled, only driven. Manual
  control is available the instant autoplay stops calling `scrollTo`.
- **Reduced motion.** Autoplay never triggers when `reduced` is true — that branch already renders
  the full-height static layout with no scroll-driven camera at all, so this is a no-op gate, not
  new logic.

---

## Build order

1. Growth math: delete `seedPath`/`embryoPath`, add the weave arm parameterization to `growth.ts`
   or inline in `CrossPathsTimeline.tsx` (either is fine; keep it next to `gompertz`/`lateral` if it
   stays reusable math, inline if it's specific to this one drawing).
2. The weave finale end to end: fork, three-segment crossing with correct z-order, rejoin dot, the
   mono icon+wordmark lockup (not serif italic), payoff line, reveal timing. Verify the crossing
   reads as woven (screenshot at the final scroll position, confirm alternating over-under, not two
   flat crossing lines).
3. The 2021 merge region cleanup: drop `kicker`, trim `ORIGINS` names to "Clay" / "Daniel" only.
   Small, do it in the same pass as step 2 since it's the same file and the same data block.
4. The leaf motif on branch edges, rolled out once, reused by every cluster automatically (it's a
   property of the branch-edge renderer, not per-cluster data).
5. Year label weight, tracking, tick size, and the dynamic side rule; verify all five years clear
   every plate at multiple scroll positions.
6. Founder-block framing: reduce both `100svh` spacers to `38svh` first (that's the actual
   complaint), then apply the bordered-panel/divider/portrait treatment (CSS/layout only, no data
   changes).
7. Project detail hierarchy reorder + `awards` field + Gallery multi-column pack; verify on a
   4-image project and a 6-image project per section 5's QA checkpoint, and on one video-hero
   project (Plentify or Texas Robotics) to confirm the video tile packs the same as a still.
8. Founder bio copy: the drafts in section 6 are ready to ship as-is pending Daniel's sign-off on
   the flagged TODOs (years, exact roles, "Dream Machine" naming) and the Resia authorship
   correction — this is no longer a placeholder-structure-only task.
9. Timeline autoplay: trigger, 14s eased scroll, cancel-on-any-input, bottom handoff, reduced-motion
   gate, per section 7. Build and verify last — it layers on top of the existing scroll-driven
   camera and shouldn't block anything above it from shipping independently.

## Flags for Daniel

- Payoff line copy: "Everything above, grown into one place." replacing "folded up and waiting,"
  proposed in section 1, needs sign-off (or a different line entirely — the seed metaphor is what's
  being retired, any replacement just needs to fit an already-built shelter rather than a plan
  waiting to happen).
- "Lessons learned" vs the current "What we learned" kicker wording, section 5: either is a one-line
  change, pick one.
- Founder bios, section 6: real candidate drafts are written and ready; the TODOs called out inline
  (Rick Wright / TestFit years, Clay's exact role at Resia, Daniel's role/dates at Rogers Partners,
  whether "Dream Machine" is the name to print) need Daniel's confirmation before shipping.
- Resia authorship: brief says it's Clay's; `projects.ts` currently has it under Daniel with a TODO.
  Needs a decision, then a matching fix in `projects.ts` (task #10).
