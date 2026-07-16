# Handoff — the About hybrid: Daniel's spine, Clay's ornament, in sepia

**Date:** 2026-07-16
**Branch:** `about-hybrid-sepia` (off `about-v2-nonflowers`). **Nothing committed. `main` untouched. Nothing pushed.**
**Route:** `#/about` (the shipped page). `#/lab/gongbi` kept. `#/about/scroll` and `#/about/ascent` **deleted**.
**Author:** Edward. **Next editor: Daniel.**

---

## What

Daniel's ruling, built: his About page stays the shell; Clay's Ascent and Scroll drafts lose as
*pages* and their generative engine is harvested as **ornament**. "Our structural spine, with Clay's
flower ornamentation and details."

### 1. The colour lane — INK_BLUE is retired from About

`INK_SEPIA = #8A6A4A` (warm sepia/timber, drawn from the splash hero's structure) replaces
`INK_BLUE = #3E7CA8` on the spine, branches, holders, the Oculus mark, the wordmark, the founder
roots and the seam. **Nothing blue survives on the page.**

**Contrast — the brief said "derive a darker variant *if* `#8A6A4A` fails at label size". It fails,
but not where you'd look.** `#8A6A4A` measures **4.70:1** on bare vellum, which passes AA. But the
selected project row paints itself `${tint}14` — 8% of INK_SEPIA — and on *that* ground, which is
exactly where the sepia small text lives, it drops to **4.28:1** and fails. So `INK_SEPIA_TEXT =
#6F5439` (6.64:1 on vellum, 5.94:1 on the tinted row) carries the glyphs, mirroring the existing
`INK_BLUE`/`INK_BLUE_TEXT` pattern. `authorColor()` returns structure colour, `authorTextColor()`
glyph colour. The tests compute WCAG rather than pinning hexes, so re-tuning the sepia re-derives
the claim instead of silently invalidating it.

Flowers are **full pigment** (the genome palette). The one-colour law in `CLAUDE.md` is amended:
sepia, pigment on the botanical specimens only, and the prohibition on colour-coding by person is
untouched.

### 2. The garland, grafted onto Daniel's spine

`engine/gongbi/garland.ts` grows along arbitrary polylines — so it is fed **`spinePts()`**, this
page's own geometry. Clay's organs, Daniel's line.

- **New `GarlandOpts.tube` (default true).** Set `false` and the composer paints organs only. The
  spine stays Daniel's drawn SVG line at `SPINE_W`; the composer contributes foliage and nothing
  else. Organ placement and the rng sequence are unchanged, so the ornament lands where it would
  have grown had the composer drawn the stem itself. (`geoHash` in `painter.ts` now keys on `tube`,
  or a tubed and tubeless garland at the same seed collide in the cache.)
- **`garlandStations()`** is pure and tested: it claims a y-band around every branch anchor and every
  year tick, merges them, and grows only in the gaps — so foliage can never bury a fork or a numeral.
- **`GARLAND_REACH = 90`** (< `OFFSET_X` 110) means foliage provably cannot touch a plate.

**Two measured tuning findings**, both worth knowing:
- **Scale.** The genome's organ sizes are tuned for a whole plant on a 1200px canvas; dropped onto
  the spine at that scale they measure ~12px — invisible specks (coverage 0.003). Measured sweep:
  0.62 → reach 26, invisible · **1.5 → reach 63, reads at the spine's weight** · 3+ → clipped by the
  strip. Pinned 1.5, and the strip widened 64→90 so nothing clips (a clipped leaf reads as a broken
  drawing).
- **Seed.** The genome aims organs with a random 3D rotation, so a bad take lands its leaves
  **edge-on** and they render as curled grey-green slivers — a smudge on the line. `bower/spine` was
  the worst of six takes. **Pinned `bower/spine-2`**: a broad sage leaf with a legible midrib arching
  off the spine, and a pink blossom. Rejected `bower/spine-5` (a *blue* bell flower — pigment is not
  a licence to walk blue back in).

### 3. Founder specimens — seeds I pinned

`FounderNode` now renders portrait · role · **the founder's own specimen** · facts on the stem.

**The curation pass (12 takes per family in `#/lab/gongbi`) — the brief's warning was right:**
`passesGate` is a floor (`coverage >= 0.02 && ink >= 0.005`), not a parity check, and the two
defaults were **not** a pair. `bower/daniel-guerra` passed the gate and still rendered as a spindly
two-bud weed beside Clay's full lilac plant.

| slot | seed | coverage / ink / chroma | |
|---|---|---|---|
| Clay | `bower/clay-seifert` | 0.023 / 0.009 / 0.103 | **kept** — a full lilac specimen |
| Daniel | `bower/daniel-guerra` | 0.028 / 0.018 / 0.134 | **retired** — spindly, reads as a weed |
| Daniel | **`bower/daniel-guerra-5`** | 0.021 / 0.012 / 0.102 | **pinned** — violet blooms, same build, nearly the same measured triple as Clay's |

Rejected on doctrine: `bower/clay-seifert-8/2` (cornflower **blue**) and `bower/daniel-guerra-3/3`
(ink 0.040, far darker than anything on Clay's sheet).

Specimens are keyed on a new stable `TeamMember.id` via `FOUNDER_SPECIMENS`, not matched out of
display copy — the retired draft used `member.name.startsWith('Clay')`, which grows the wrong plant
the day someone rewords a name.

### 4. Discipline frontispieces

`PAINTINGS.Architecture` / `'Product Design'` / `Software` now sit beside the ListView nav headings
as chapter-break marks. **At 44px, not 28** — below ~40 the aged-paper mount swallows the plant and
the frontispiece reads as a beige swatch. **No BowerMark overlay**, per Sai's root cause (`matRect`
base-anchors every plant onto the mat's bottom row; anything at `bottom-[5%]` collides by
construction, for every seed).

### 5. The year-label collision — **the brief's diagnosis was wrong; here is the real one**

**2021 does not collide.** Measured live: 44 units of clearance, and the twist-fuse reads cleanly.
`Y_2021 == CONV_JUNCTION_Y` is not a defect. The labels that actually collided were **2023 and 2025**
(gap −2.5 each): numerals sitting *on* a photograph with the label's vellum halo cutting the branch
underneath in half.

**Real root cause: `YEAR_LABEL_OFFSET (56) + YEAR_LABEL_W (78) = 134 > OFFSET_X (110)`.** The label
was 24 units wider than the gutter it lives in, so it poked into the plate lane at *every* year that
had a plate on its side. It was arithmetic, not the fuse.

Two fixes:
- **`YEAR_LABEL_OFFSET` 56 → 24.** The label now lives entirely inside the gutter, clearing every
  plate on every side by 8 units, and its inner edge lines up with `YEAR_TICK_INNER` so numeral and
  tick read as one lockup. (It sits *above* its tick, so they share an x and never a y.)
- **`yearLabelSide` now reads the laid-out geometry** (`computeBranches()`) instead of authored
  cluster years. `packSide` *moves* plates: a cluster authored at 2022.6 has its plates packed down
  into 2023's band, and the old same-year rule could not see that. The concept is unchanged — the
  label steps aside — but "clear" is now derived from where the plates and branches actually are.

Result: 2021 +12.0 · 2022 +16.3 · **2023 −2.5 → +9.3** · 2024 +16.3 · 2026 +16.3.

## Why

Daniel's ruling after the design critique (see the team-lead brief). The hero is warm gold Austin
light, timber, foliage and wisteria purple — blue was the one colour the practice does not own.

## Verify

- Gates green: `npm run typecheck` **0** · `npx vitest run` **320 pass** (was 303; +17 net) ·
  `npm run build` clean.
- **Live QA in headless Chrome at 1440×900** against the running dev server, walking the whole
  page so every lazy surface mounts: **zero console errors, zero failed requests**, all 5
  commissions paint, the garland mounts.
- **A computed-style sweep for the retired blue across every element on the page returns NONE.**
  This is the check that earned its keep: it caught the FanPainting **underdrawing** still
  sketching in `#3E7CA8`. `growWild` comes from the shared botanical module, which keeps its own
  blue for other pages, so the sketch arrived blue — and the underdrawing is *fully visible* for
  the seconds before each painting lands. Every test passed while the page showed blue. Fixed by
  re-colouring at FanPainting's render register (the same move `sprigPathStyle` makes), with a
  regression test that asserts both halves: the module really does hand us blue, and the render
  register really does neutralise it.
- Collisions measured, not eyeballed: a DOM probe samples every stroked path via
  `getPointAtLength` and every year label via `getBBox`, in the SVG's own user units, and reports
  the closest approach. Numbers above are from that probe. Photographed at 3× before and after.
- The garland was measured by driving `paintGarland` through Vite's real module graph and counting
  visible pixels (the scale/seed sweeps above), then photographed on the page.
- New tests worth knowing: the contrast lane (computes WCAG, incl. the composited active row); the
  gutter contract (`YEAR_LABEL_OFFSET + YEAR_LABEL_W <= OFFSET_X`); "no label on a plate, any year,
  either side"; garland stations never land on a fork or a numeral; garland reach < gutter.
- The one-colour doctrine test was **re-pointed**: it asserted `calyxSprig`'s raw paths, which carry
  the shared botanical module's blue and are re-coloured by `sprigPathStyle` at render. It would have
  passed green through this entire re-key while the page rendered blue. It now asserts the render
  register.

## Left (open) — for Daniel

1. **The 2025 label still crosses a branch** (−2.5, pinned by a test so it cannot get worse). No side
   choice fixes it: `packSide` pushes `llo`'s plate (right) and `dougherty`'s (left) far below their
   anchor years, so **both** sides carry a long branch descending through 2025's band. The fix is a
   composition call — shorten those branches, or let a crowded label sit below its tick — not a
   constant. **Flagged rather than decided.**
2. **The spine garland is the piece I'd most expect you to overrule.** It is faithful to the brief
   (his organs, your polyline, ornament not replacement) and it is defensible now that the seed is
   curated — but gongbi is a soft, painterly, semi-transparent hand, and it earns its keep composed
   as a *whole plant on an aged-paper mount* (the founder specimens and frontispieces look genuinely
   good). A lone painted leaf floating on bare vellum next to a hard sepia line is a weaker read. It
   is behind two constants (`GARLAND_SEED`, `GARLAND_SCALE`) and one component; deleting
   `SpineGarland` is a clean revert if you don't want it.
3. **Founder seeds want your eye.** I matched them by measurement + contact sheet; you may simply
   prefer a different pair. Sweep with `#/lab/gongbi`.
4. `TEAM_CODA.kicker` is literally `'Crossed paths, 2021'` — the phrase in the brief. It renders in
   the founders coda, is a *different element* from the timeline's 2021 year label, and I found no
   collision on it at 1440×900. If that is what you saw, tell me the viewport.
5. Mobile/Firefox/WebKit unverified. Reduced-motion is the only mode in which the timeline camera is
   deterministic (intro + 24s autoplay otherwise race) — QA scripts pin it.
6. Daniel's specimen caption wraps awkwardly (`bower/daniel-guerra-` / `5`). Cosmetic.

## Files

**Deleted:** `src/pages/scroll/*`, `src/pages/ascent/*` (routes dropped from `routing.ts`, `Root.tsx`).
**Moved:** `scroll/FanPainting.tsx` + `scroll/paintings.ts` (+ test) → `src/pages/about/`.
**New:** `docs/handoffs/2026-07-16-about-hybrid.md`.
**Modified:** `src/pages/about/CrossPathsTimeline.tsx` (sepia constants, garland graft + stations,
year-label gutter + geometry-aware side rule), `src/pages/AboutPage.tsx` (sepia split, founder
specimens, frontispieces, shared `groupProjects`), `src/pages/about/projects.ts` (`FounderId` +
`TeamMember.id`), `src/pages/about/paintings.ts` (ledger trimmed to five, seeds curated,
`FOUNDER_SPECIMENS`), `src/engine/gongbi/garland.ts` (`tube` option),
`src/engine/gongbi/painter.ts` (`geoHash` keys `tube`), `src/pages/lab/GongbiLab.tsx` (imports),
`src/pages/about/CrossPathsTimeline.test.ts`, `src/pages/about/paintings.test.ts`, `CLAUDE.md`.

**Contested files touched:** none of the parallel session's Eden-geometry list. `src/routing.ts` and
`src/Root.tsx` were touched (route removal only — unavoidable, the drafts had to be unwired).
`src/engine/botanical/*` was **not** touched: `sprigPathStyle` re-colours its output at render, so
the sepia re-key needed no change there and other pages keep its blue.

---

# ROUND 2 — same day. Clay's founders, rows, the decoupling, and the growth engine

**Branch:** `about-hybrid-sepia`, seven commits (`85c8ab5` … `aff12cd`). **`main` untouched, nothing pushed.**
**Author:** Edward (round 2). **Round 1 is preserved above, unedited.**

Round 1 shipped and Daniel liked it: *"It's looking great and the colors are amazing"*, *"it already
looks better without the extra leaves."* The sepia lane and the pigment specimens are keepers and are
not touched. This round is his next pass of notes.

## What

| # | Ask | Commit |
|---|---|---|
| 1 | Founders: copy Clay's page wholesale | `85c8ab5` |
| 2 | Projects: columns to rows; flat index | `ea819ae` |
| 3 | Project entrance: fade, don't grow | `74f7bce` |
| 4 | Decouple the projects from the timeline | `74f7bce` |
| 5 | The sub-branch growth engine | `39fc982` + `5f018a4` |
| 6 | Founder ornamentation: flowers, by eye | `aff12cd` |
| 7 | Hero lockup sits too low | `ad232f7` |

### 1. The founders are Clay's, wholesale

`git show about-v2-nonflowers:src/pages/ascent/AscentPage.tsx` then `Founders()`, ported entire: the
5/7/5 measure, the bordered 4:5 portrait with its caption under it, facts as a real `<dl>` at 17px on
a 52ch measure, the specimen hung at 340 on the outer edge, at Clay's own `max-w-page`. The old
`FounderNode` (112px circular crop, olive role line, 13.5px facts on leader lines) is gone.

Three departures, all deliberate and commented at the site:

- Clay's draft forced `voice: 'ink'` on the specimen because his page rationed pigment to two events.
  This page's law is the inverse and Daniel likes the colours, so the commissions hang in **pigment**.
- Kept the stable `TeamMember.id` keying. The draft used `member.name.startsWith('Clay')`.
- Dropped the draft's `flex-col-reverse` wrappers — they existed only to invert DOM order for the
  ascent's column-reverse scroller. Reading order is already visual order here, so Clay's intended
  sequence (kicker, Clay, Daniel) survives unchanged.

**The nav-pill collision cannot recur.** Clay's `<main>` had no `pt-header` (only `Summit()` added one
locally). This page's `<main>` carries `pt-[calc(var(--header-h)+2rem)]` globally and the founders sit
mid-page. Verified at 1440x900.

### 2. Rows, and a flat index

Daniel was right and it was measurable. The hero sat in the left column of a `[1.55fr_1fr]` split
beside its text: **505x557 at 1440 — portrait — against images that are natively 1.23 to 2.09.**

Now: **row 1 = the pictures** (hero + supporting filmstrip), **row 2 = the information band**. The hero
box measures **735x414..509 (1.44 to 1.77)** — the source images' own range. Box-vs-native mismatch
across all twelve fell from **~50% to 0-25%, median ~17%**.

Two non-obvious things, both measured, both commented because the naive version is wrong:

- **The supporting strip is VERTICAL.** The detail is height-locked to the viewport, so a horizontal
  strip under the hero spends the hero's height: that version measured 875x306..401 (2.2:1 to 2.9:1),
  the same wrong-aspect complaint from the other side. Standing it on its end spends width, which this
  panel has.
- **The information band is three columns, and the split is a HEIGHT BUDGET.** A grid row is as tall as
  its tallest column and that height comes out of the hero. Stacking description + recognition in one
  column made it 319px (hero fell to 254, a 3.4:1 letterbox). Splitting into FOUR columns made it
  *worse* (465px) — narrower columns wrap more and every column grows at once. Three columns with the
  description paired with the title balances at ~195/~180.
- The band is **not capped and not scrollable**. An earlier cut capped it at 240 with `overflow-y-auto`
  and silently hid up to 61px of seven projects' awards behind a scrollbar nobody would find.

**Flat index:** the three discipline headers and their 44px frontispieces are gone. Deleted with them,
not left inert: `PAINTINGS.Architecture` / `'Product Design'` / `Software` (the ledger is now the two
founder specimens, with a new test pinning that it holds nothing else), and `groupProjects` /
`WorkGroup`. **Each project keeps its `discipline`; nothing draws it** — that field is authored content
and removing it is Daniel's call, not mine. Titles are bigger in both index and detail.

### 3 + 4. The decoupling, and why the fade is the same change

`unfurl()` opened every plate from `scale(0.92, 0.64)` about the branch junction — it squashed each
image to 64% height and stretched it back. **That is the "weird initial distortion"**, and it existed
only because it was miming a bloom opening off the branch that carried it. Kill the branch and the
reason for the transform goes with it. Composite opacity only now.

**Deleted (not left inert), net -298 lines in `CrossPathsTimeline.tsx`:**
`SEPAL_DEFS`, `sepalLen`, `CALYX_LEAF_PROFILES`, `calyxSprig`, `sprigPathStyle`, `SprigOrgan`,
`branchAttachY`, `branchPts`, `branchPath`, `BRANCH_WAVE_AMP`, `BRANCH_WAVE_WAVES`, `BRANCH_W`,
`unfurl`, `easeUnfurl`, `boxGapToPoly`, `LabelObstacle.pts`, the cluster node dot, the timeline's
import of `engine/botanical` entirely, and `computeBranches` became `computePlates`.

**THE 2025 COLLISION IS GONE.** Round 1 fought it to a draw (-2.5 both sides), shipped it
grandfathered at `> -6` ("must not get worse"), and flagged it to you as a composition call. It had
exactly one cause — a branch — and there is no branch at 2025 now. The test asserts **> 0 clearance at
every year including 2025**, and passes.

`packSide` survives doing much less: two plates in one lane still cannot share paper.

### 5. The sub-branch engine — space colonization

**`src/pages/about/spaceColonization.ts`** is the paper's algorithm (Runions et al. 2007), pure,
deterministic, 16 tests, no page knowledge. **This does not reverse #4**, and the inversion is the
whole design:

> The old branches were STRUCTURE — they carried plates, the layout depended on them, and a pile of
> rules existed to arbitrate the collisions that caused. The new ones are ORNAMENT — they read a
> layout that is already final. **If a branch and a plate disagree, the branch loses**, not by a rule
> but because the plate was placed before `colonize()` ran and cannot hear the answer.

That is expressed three times over: the ornament reads `computePlates()` and nothing reads it back; it
is painted before the clusters; and no attractor is ever scattered on an occupied rect. Filling the
whitespace and avoiding the plates are **the same mechanism** — a plate has no attractors on it, so
nothing grows there. There is no collision test in any of it.

**Measured: 0 of 1217 branch points land on a real plate.** Pinned as a test *with its reason*, because
the algorithm does **not** promise this on its own: it declines to grow *toward* an empty region, but
nothing in it stops a branch crossing a plate to reach an attractor beyond. What holds is
`SUB_PLATE_PAD` (18) > `SUB_SEGMENT` (9).

**The hint lines are obstacles too**, and that had to be found by looking — they have no box of their
own, and foliage grew straight through "LLO: DREAM MACHINE" and "NYC: ROGERS PARTNERS".

**`garland.ts` gains `vines`** (many vines, one canvas, ONE genome, ONE rng sequence). Not an
optimisation — it is the only way to get a garland: `createFlora` derives the *species* from the seed,
so a request per branch either needs a seed per branch (different species per branch) or reuses one
seed (each request restarts the same rng and stamps identical organs). Keyed into `geoHash`.

**Parameters** (all in `CrossPathsTimeline.tsx`, tuned by looking over three passes — the first was
wallpaper at attractor step 46, the second overshot to sparse):

| constant | value |
|---|---|
| `SUB_SEED` | `bower/spine-2` (shares the spine's species: one plant) |
| `SUB_SEGMENT` / `SUB_INFLUENCE` / `SUB_KILL` | 9 / 130 / 26 |
| `SUB_WOBBLE` | 0.34 |
| `SUB_ATTRACTOR_STEP` | 60 — **the density dial** |
| `SUB_SPINE_CLEAR` / `SUB_PLATE_PAD` | 30 / 18 |
| `SUB_BRANCH_W` / `SUB_ORGAN_SCALE` | 2.2 / 0.95 |
| density ramp | `lerp(0.18, 0.92, t)` with y |

Stems are **sepia SVG** (structure is one colour); the composer contributes **pigment foliage** only
(`tube: false`) — the same graft the spine garland already uses.

### 6. Founder ornamentation — by eye, and note the brief is the OPPOSITE of #5

Four gongbi vines painted down the open margins either side of the founders. **No derived geometry,
deliberately**: he said "It doesn't have to be a specific mathematical pattern. It just has to look
pretty." The curves are drawn by hand in a 160x1500 strip and tuned by looking. They are vines, not
lines (`tube: true`) — "choppy... just random lines on top of it" describes a bare bezier with nothing
growing on it.

Two things measurement caught: the strip is drawn **1:1, never scaled** (the first cut stretched a
1100-tall strip to `h-full object-cover`, upscaling the painting 1.8x — an image at the wrong size,
which is the one mistake this whole round is about); and the wrapper reaches out past the section into
the page's own margin (section 1181x1401, content column 1100, so ~169px of real air each side)
because at -64px the vine grew across Clay's portrait.

### 7. The hero lockup

Arithmetic, not taste. The copy column is `justify-center` inside a box starting **below** the fixed
header, so it centred on that band's middle — exactly `--header-h / 2` below the middle of the screen.
Measured at 1440x900: **before** centre 492 vs screen centre 450 (290px above, 206 below); **after**
centre 432 (230 above, 266 below), 18px proud, the optical nudge. Correction is
`lg:pb-[calc(var(--header-h)+2.25rem)]`, twice the lift because `justify-center` splits it, written
against the token because `SplashHeader` re-measures it at runtime.

## Verify

- Gates green: `npm run typecheck` **0** · `npx vitest run` **330 pass** (was 320) · `npm run build` clean.
- Live QA in headless Chrome at **1440x900** against the running dev server: **zero console errors,
  zero failed requests**, all twelve projects walked, both specimens paint, the garlands mount.
- **Measured, not eyeballed:** hero box vs native aspect per project (0-25% mismatch, was ~50%); band
  height and hidden-content per project (0 hidden on all twelve); branch points on plates (0 of 1217);
  lockup centre vs screen centre (432 vs 450).
- New tests worth knowing: the space-colonization suite (16), incl. "it never grows into a region with
  no attractors" — the property the page leans on instead of a collision test; the sub-branch contract
  (0 points on a plate, no attractor on an obstacle, the density ramp is real, determinism); the plate
  contract that replaced the branch no-overlap contract (no two plates overlap, no plate touches the
  spine's sampled polyline); and the year-label rule now asserting > 0 at every year.

## Left (open) — for Daniel

1. **"Makes them grow as the timeline continues" is an INTERPRETATION and you have not seen it yet.**
   Built as a *density ramp* — the ornament's own lushness carries the growth metaphor, sparse at 2021
   and lush at 2026. It could instead mean **animating growth on scroll**. Deliberately not built: it
   is a much bigger commitment and the wrong thing to guess at. Look, then tell me which you meant.
2. **The sub-branch density is the thing most likely to want your eye.** It is one constant
   (`SUB_ATTRACTOR_STEP`, currently 60). Three passes: 46 was wallpaper, 82 was too sparse. If you want
   "substantially more" still, drop it toward 50 and the cost is CPU, not correctness.
3. **Colour-law call, flagged not decided:** CLAUDE.md permits pigment on "the botanical specimens
   only" and lists them. The founder vines are a painted botanical in the specimens' own register but
   are not on that list. This is an extension of the law. Say the word and they go ink/sepia.
4. **`Project.discipline` is now inert** — authored, validated by a test, drawn nowhere, since the
   index went flat. Kept because deleting authored content is your call. Say and it goes.
5. **The blue tripwire lost a half.** It asserted both that `engine/botanical` hands this page blue AND
   that the render register neutralises it, via `calyxSprig` then `sprigPathStyle`. Both are deleted,
   and FanPainting (now the page's only botanical borrower) re-colours inline in JSX with no pure
   function to call. The first half now tests `growWild` directly; **the render half is covered only by
   the live computed-style sweep.** If a third borrower ever appears, give it a pure style function.
6. **Archipedia's hero cover-crops its left panel** (native 1.83 in a 1.51 box). That is content
   tuning, not layout — `fit: 'contain'` on that one image would letterbox it instead.
7. **`SeamBridge` now lands on nothing.** It carried the spine's line down to the founders' convergence
   node, which was part of the deleted leader-line scaffolding, and Clay's founders are left-aligned
   rather than centred. It is a plumb line to a left-aligned block. Needs a composition call.
8. Mobile / Firefox / WebKit unverified, as in round 1.

## Files

**New:** `src/pages/about/spaceColonization.ts` (+ test).

**Modified:** `src/pages/AboutPage.tsx` (Clay's founders, rows, flat index, FounderBower),
`src/pages/about/CrossPathsTimeline.tsx` (decoupling, fade, sub-branches, `YEAR_TICKS`, lockup lift),
`src/pages/about/CrossPathsTimeline.test.ts`, `src/pages/about/paintings.ts` (+ test) (ledger trimmed
to two, `groupProjects` deleted), `src/engine/gongbi/garland.ts` (`vines`),
`src/engine/gongbi/painter.ts` (`geoHash` keys `vines`), `.gitignore`.

**Contested files touched:** `src/engine/gongbi/*` (garland + painter, for `vines`; not on the parallel
session's Eden list). `src/engine/botanical/*` **not** touched. None of the Eden geometry, scene, or
engine-page files touched.
