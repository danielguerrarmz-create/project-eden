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

---

# ROUND 4 — same day. The lockup, the founders' parenthesis, the growth, the species pool

**Branch:** `about-hybrid-sepia`. **`main` untouched, nothing pushed.** **Author:** Edward (round 4,
the third of the day). Rounds 1–3 are preserved above, unedited.

Four commits: `b0150ce` the hero lockup · `fa6258d` the founders' parenthesis (task F) ·
`c460bb9` the growth · `dd8a255` the species pool.

## What

### 1. The hero lockup: the mark comes up to the words (`b0150ce`)

Finishes the previous session's in-flight edit. Its diagnosis was right — round 2 put the centring
lift on the copy column ALONE, so the words rose and the mark (which sits at the SVG frame's centre)
did not. Measured at the pin: words 432, mark 492, **60px adrift**. The lift moved to the ROW, where
`items-stretch` shrinks both columns together.

**Changed from the inherited diff: 2.25rem → 3.25rem.** The lift is pb/2, so moving the padding from
the column to the row changes what it acts on and the same value is no longer the same nudge — at
2.25 the words came to rest 10px proud of the screen centre instead of the 18 they had been. 18 is
the position Daniel called *"perfectly aligned"*, so it is a fixed point: **the mark had to come up
to the words, not the words down to the mark.** (2.25 → 10 proud, 2.75 → 14, 3.25 → 18.)

### 2. Task F — the line arrives and opens (`fa6258d`)

One continuous line now runs the page: Oculus → spine → trunk across the seam → fork → a parenthesis
bracketing both founders, with the flowers on the arms. Replaces `FounderBower` (recover:
`git show b0150ce -- src/pages/AboutPage.tsx`).

**The shape is judged by eye**, per Daniel's *"It just has to look pretty"* — hand-placed anchors
tuned against screenshots, no derived-geometry system. What is derived is where it ATTACHES, and all
of it is measured, because every part was got wrong by reasoning first:

- **The arms read the rows' real rects.** The founders' content is left-aligned, so SeamBridge's
  page-centre plumb line landed in the facts column, on nothing.
- **The trunk starts where the line actually stops, and the modes differ.** Reduced: the drawing runs
  80 world units PAST its exit, so the line ends ~85px above the founders' wrapper (a floating stub
  over a gap). Motion: the sticky row bottoms out at the track's bottom, but **the row's own bottom
  padding — the lockup fix from the commit before — means the frame stops 134px short of it.** The
  two changes interact.
- **One line means one weight.** `SPINE_W` is authored in WORLD units and scales with the frame: it
  renders at **5.22 CSS px in motion and 7.96 in reduced**, neither of them 7.5. A hardcoded trunk
  matched the position exactly and still stepped 46% at the join.

Two things only the screenshots caught: the arms left the fork nearly horizontal and read as a **coat
hanger** (fixed at the shoulder anchor — the spline's tangent at the root points at it); and they
ended in blunt full-width caps in open paper, so they now **taper root to tip** (SVG cannot taper a
stroke; `taperRuns` strokes overlapping runs).

**The stems are sepia and the organs pigment** (`tube:false`), where FounderBower painted the whole
vine. The connection requires it: a painterly tapering gongbi vine and a hard sepia line cannot meet
without a seam whatever the geometry does. This **settles round 2's flagged colour-law question
conservatively** — structure sepia, botanicals pigment, nothing extended. Daniel's *"quite beautiful"*
was about the flowers, and the flowers are untouched.

### 3. The growth (`c460bb9`)

Daniel: *"we could actually see the plants and the branches being assembled as it is coming down...
both of those emissions should match each other."*

**The sync chose the mechanism.** The plates fade on `clamp01((cardLineY - y - 10) / UNFURL_SPAN)` —
the camera's card line. So the branches reveal on the SAME line, span and ramp, read at their own
root. One expression at two places; they cannot drift.

**The brief's entry-triggered IntersectionObserver is the one thing that could not work here:** the
plates are scroll-driven, so an observer would make the branch a *different event* from the plate
beside it — the thing the note rules out. Nor is it the expensive kind of scroll-scrubbing: the camera
already re-renders every frame and the plates already do this. Nothing about painting is deferred.

Does **not** regress "fade, don't grow" — that rule governs the PLATES, whose objection was a
layout-affecting transform distorting the image. A stroke revealing along its own path distorts
nothing.

**The organ reveal is the part worth reading.** The first cut was a soft horizontal wipe trailing the
card line: one rect, cheap, wrong. It assumed foliage sits below its root. **Measured: 195 of 332
organs sit ABOVE their own branch's root, by up to 278 world units** — space colonization grows in
every direction. The wipe uncovered blossoms whose twig had not drawn, and the page showed **flowers
floating on bare paper**. The screenshot caught it; every frame-count number looked fine. No lag value
fixes it. Each disc is now keyed to its branch's own `grow`, which cannot have the bug by construction.

### 4. The species pool (`dd8a255`)

Positions deterministic, species rolled per load. **One plant per page, not one per station** — the
per-station reading would make the ornament a crowd of plants sharing a stem, which is what
`garland.ts` batches vines to avoid, and would need a composer rewrite.

**The brief's cache concern is moot.** `painter.ts`'s cache is `new Map()` — in-memory, per session.
The page **already repaints every garland on every load**; there is no cross-load cache to lose, so
the roll is free.

Three of twelve, each signed off by eye; rejections recorded in the ledger. **The measurements do not
pick:** `pool-m` had the most ink of all twelve and is cream-washed mush; the best take of one sweep
had the lowest chroma of its six; and **`pool-d` scored blueFrac 0.000 while rendering pale blue-grey
daisies** — a desaturated steel-blue slips under any saturation threshold, so the one prohibited
colour is the one the metric is worst at seeing.

`reach` is the exception — a real invariant, measured per member, with a test (53 / 84 / 54 against
`GARLAND_REACH` 90). `pool-a` leaves **6px of headroom**.

Also fixes a claim the page had been making falsely: the suffixed seeds (`/coda`, `/founders`) were
never other takes of one plant — `createFlora` derives the **species** from the seed, so the page was
quietly growing **three species** while its comments said one.

## Verify

- Gates: `npm run typecheck` **0** · `npx vitest run` **350** (was 340) · `npm run build` clean.
- `qa/hero-lockup.mjs` — drives a real scroll to the pin. Verified by reverting: the harness reports
  the mark 60px below the words, then 0.00 with the fix.
- `qa/founder-parenthesis.mjs` (+`--motion`) — the join in both modes: **2px overlap, 0.00px jog, 0%
  width step.**
- `qa/growth-frames.mjs` — **motion ON**, emits a frame sequence, because the reduced-motion harness
  structurally cannot see the feature. Inked stems rise 18 to 219 across frac 0.06 to 0.54, foliage
  trails (10 to 187 discs), **0 orphans at every stop**.
- `qa/species-pool.mjs` — two species, identical structure and stations (284 stems).
- Reduced motion: 284 stems, 0 dashed, mask off — settles instantly, fully grown.

## Left (open) — for Daniel

1. **THE COLD PAINT IS ~30s, and it is the biggest thing on this page.** Measured: the sub-branch
   garland alone is **6.7–7.6s**, the parenthesis 378ms, and the page paints four garlands per load
   through the worker pool. A 13s wait screenshotted the founders with **stems and no flowers**. This
   is pre-existing and species-independent (spine-2 6777ms vs pool-a 7582ms — 12%), and round 1's
   note says 20-25s cold is *"what sank the rejected draft"*. **The page is at that number now.** The
   cache is session-only, so every visitor pays it every load. Not fixed here — it is a real piece of
   work (an organ atlas, or persisting the cache) and it wants your call.
2. **The pool is 3 members, not the 6-10 the brief wanted.** Nine of twelve were duds. More members
   need more sweeping, and `reach` leaves only 6px of headroom for a lusher plant.
3. **`pool-g` is a live judgement call** — violet blooms, handsome, arguably your wisteria, cut
   because a pool member is a coin toss rather than a choice. Say the word and it goes back in.
4. **The arms pass close to "THE FOUNDERS." and the lower role line.** Clears them at 1440x900; it is
   tight, and it is a composition call, not a constant.
5. The year labels were **not touched** — the `spreadSide` / `yearToY` distortion is still awaiting
   your ruling.
6. Mobile / Firefox / WebKit unverified, as in rounds 1–3.

## Files

**New:** `src/pages/about/parenthesis.ts` (+test), `src/pages/about/species.ts` (+test),
`qa/hero-lockup.mjs`, `qa/founder-parenthesis.mjs`, `qa/growth-frames.mjs`, `qa/species-pool.mjs`.

**Modified:** `src/pages/AboutPage.tsx` (FounderParenthesis replaces FounderBower, the arrival
wrapper, PAGE_SPECIES), `src/pages/about/CrossPathsTimeline.tsx` (the lockup lift, growth,
`DESCENT_EXIT_FRAC`, `TIMELINE_W`/`SPINE_W` exported, datums).

**Datums added:** `data-timeline-track`, `data-timeline-frame`, `data-mark-center`,
`data-descent-exit`, `data-paren-trunk`, `data-founder-row`.

**Contested files touched:** `src/engine/gongbi/*` **not** touched this round. None of the Eden
geometry, scene or engine-page files touched. `src/routing.ts` / `src/Root.tsx` untouched.

---

# ROUND 5 — same day. Collisions, the founder frame, the bio, the media regions, the coda

**Branch:** `about-hybrid-sepia`. **`main` untouched, nothing pushed.** **Author:** Edward (round 5).
Rounds 1–4 are preserved above, unedited.

Five commits: `38d6784` the frame + the collisions · `ef11345` the media regions ·
`e2e92a6` the coda · `f4c4a5a` the bio.

## What

### 1 + 2. The founders fit one frame, and the vines are off the text (`38d6784`)

**THE BUDGET IS 816, NOT 900**, and that is why this fix had landed twice and not worked. The header
is `position: fixed` and 84px tall, so it covers the top of the viewport at every scroll position.
`814 <= 816` is TRUE — and it is also 2px of air, which is not "one frame" on a real screen.
`qa/founder-frame.mjs` now demands 90px to spare, so passing means what Daniel means. **814 → 647.**

**What sets the row's height keeps swapping, and that is the actual trap:**

| | portrait | dl | tallest |
|---|---|---|---|
| round 3 | 375 | 444/472 | the **DL** — so shrinking the pictures alone would have moved nothing, and the type came down (17→15) |
| round 5 | 372 | 301/322 | the **PORTRAIT** — and shrinking it alone stops dead at ~322, where the dl takes over again |

So this pass takes both down together. The columns are also **re-proportioned rather than scaled**:
3.7/7/4 → 2.6/9.1/3. The portrait and the specimen give their width to the FACTS, because a wider
measure costs fewer LINES and lines are the height — the one move here that makes the row shorter
without making anything smaller. Daniel's dl went 322 → 251 on that alone.

**Cost, accepted:** the role caption now wraps to two lines in the narrower portrait column (+18px).
Un-wrapping it needs the column back at ~233px, which costs 81px of frame. He has asked three times
for smaller.

**THE COLLISION WAS THE TAIL, NOT THE BOW.** Every arm anchor is a fraction of `reach` — the whole
trip from the trunk, ~620px — so the "small" 22% inward curl came back 137px and landed at x=235 with
the content column starting at 170: straight through "Cofounder · engine & systems". **A fraction of
a big number is a big number.** The arms now KEEP OUT: while alongside the founders they live outboard
of the rows' real measured edge, clamped, whatever the anchor arithmetic wanted. The fork also rises
(0.22 → 0.10 of the band) so the arms open above the kicker rather than grazing it. Clamping the
arrival anchors closed a hole nobody had hit: they sit inside the rows' y-span and missed the text by
luck of the current numbers rather than by rule.

**THE PROBE MEASURES GLYPHS, NOT BOXES.** "The founders." is a `<p>` in a full-width column — its box
is 1100px wide for a ~110px string, so a box test reports the arm "crossing text" while it sails
through empty paper a foot away, and would fail forever wherever the arms went. **The kicker crossing
was a false positive; there was exactly ONE real collision.** Clearance is 16px, not 0: "does not sit
extremely close" means a stroke that merely misses still reads as a collision.

**The nav pill** is resolved by the framing, not by a special case: the specimen column sits under the
pill's x-range, so it passes beneath it while scrolling — inherent to a fixed header over scrolling
content. What matters is that it does not REST there, and with the founders framed the captions sit at
y=346 and y=664. Measured.

### 5. The hero alone in region 1, everything supporting in region 2 (`ef11345`)

Daniel overriding his own earlier note ("below AND to the right"): the bottom strip stranded a lone
thumbnail at the bottom-left of the hero's region. Strip gone, one rail, everything on it.
`dealSupporting` went with it.

**THE HERO WAS BEING CROPPED.** Every hero is `fit: 'cover'`, and `fill` mode hands a picture a box of
someone else's shape and resolves the disagreement with object-fit — cover CROPS, contain LETTERBOXES.
Removing the strip made it worse: the region grew taller, its ratio fell to 1.40 against a 1.78 hero,
and **Plentify lost 21% of its width off the sides.** Measured across all twelve now: **0%**. The fix
is to stop giving the picture a box at all — a replaced element sizes itself from its own intrinsic
ratio under max-width/max-height, so the element IS the picture, as large as fits, cropped nowhere.
That is what "fit WITHIN square 1" says.

The hero also loads **eagerly** now: an auto-sized replaced element has no size until its bytes land,
and the default project's hero measured **0x0**.

Region 2 keeps `stackRatio`, which is what makes it a designed column and not a pile: the rail's WIDTH
derives from the stack it must hold, so cells share one width, keep exact heights, and land flush.
Measured across twelve: **no slivers, narrowest cell 148px**. The trade is real and commented — the
rail narrows as a project gains images, because the height is fixed. Full-width cells do not fit
(Archipedia's three would stack 745px into a 510px rail).

### 3. The bio (`f4c4a5a`)

**The ledger was already right; only the sentence was wrong** — `LLO` (n:06) has carried `by: 'clay'`
since 2026-07-15. Nothing authored was rewritten.

**The real defect: the bios RESTATE project facts by hand and nothing links them to the project set**,
so a re-attribution updates one place and not the other. Flagged at the site, not fixed structurally.

### 4. The coda (`e2e92a6`)

`kicker` and `line` deleted from `TEAM_CODA` (quoted at the site with a recovery ref). The `line` was
an inventory of the project set, which is immediately below it in full — it said, worse, what the work
says itself. **"In between" is measured:** from the flowers' bottom the kicker sat at +56 and the
payoff at +199; halfway is +128 = `mt-32` exactly. Verified live at +128.

## Verify

- Gates: `npm run typecheck` **0** · `npx vitest run` **352** (+2 keep-out tests) · `npm run build` clean.
- **New:** `qa/founder-frame.mjs` — the frame budget AND every vine against every glyph run.
- Whole suite green: founder-frame · founder-parenthesis (+`--motion`) · species-pool · hero-lockup ·
  growth-frames (still 0 orphans, stems 18 → 219).
- Full-page live sweep at 1440x900, all 12 projects clicked: **0 console errors, 0 failed requests**.
- Measured: section 647 ≤ 726 · 0 vine/text crossings over 29 text runs · hero crop 0% across all 12
  (was 21%) · rails no slivers, min cell 148px · coda payoff at +128.

## Left (open) — for Daniel

1. **THE HERO "WHITE MARGINS" ARE THE ASSET, NOT THE LAYOUT, and this one needs you.** Measured on the
   real pixels: Plentify's 1920x1080 poster has 451 fully-white columns left and 478 right — **48.4% of
   the picture is white paper.** Resia's hero is **34.6%**, Patterns 9.2%. No box can remove white that
   is inside the image, and cropping it out is the one thing "do not lose context" forbids doing
   silently. **It wants a re-export of those assets.** Not touched.
2. **The composite is `Plentify` (n:10) = `clay+daniel`, not `daniel`.** You said "the biogenic
   composite I made", so it is in your bio — worded as a thing you built rather than sole authorship,
   because the quiet opposite is the same error class as the desk lamp. Say if you want it stronger.
3. **CONFIRM THE FORSITE CLAUSE.** "Forsite" appears nowhere in this repo. Nothing is invented beyond
   your own words — no dates, no scale, no client detail. Correct "an AI operations layer for an
   architecture studio" if it is wrong or says too much.
4. **The founder role caption wraps to two lines** — the price of the smaller frame (see above). Say
   the word and it un-wraps for 81px.
5. **The cold paint is still ~30s** (round 4, item 1). Unchanged and still the biggest thing here.
6. Year labels still untouched, still awaiting your ruling. Mobile / Firefox / WebKit unverified.

## Files

**New:** `qa/founder-frame.mjs`.
**Modified:** `src/pages/AboutPage.tsx` (founder frame, FIT_FRAME + the `fit` mode, the two regions,
the coda), `src/pages/about/parenthesis.ts` (`rowLeft`/`rowRight`, `TEXT_CLEARANCE`, `keepOut`),
`src/pages/about/parenthesis.test.ts`, `src/pages/about/projects.ts` (the bio, `TEAM_CODA`).
**Deleted:** `dealSupporting`, `TEAM_CODA.kicker`, `TEAM_CODA.line`.

**Contested files touched:** none. `src/engine/*`, `src/scene/*`, `src/routing.ts`, `src/Root.tsx`
untouched this round.

---

# ROUND 6 — one motion everywhere, and the low-compute pass

**Branch:** `about-hybrid-sepia`. **`main` untouched, nothing pushed.** **Author:** Edward.
Rounds 1–5 preserved above, unedited.

Two commits: `83a8f42` one motion · `c8d7ed6` the painters encode their own work.

## 1. One motion, in one place (`83a8f42`)

Daniel: *"Make sure that all flowers on site, the founder ones and the ones below, appear in the same
motion as the timeline ones."*

The reveal now lives in **`about/reveal.ts`** and the three regions call it. Not copied into three
call sites — that is how they drift on the next change, and the page's whole claim is that it is one
plant growing. `growAt(cardLine, y, span, lag)` is the one expression; the timeline reads it against
its camera's card line, the founders and the coda against the **viewport's** (`usePageCardLine`).
Same 52% fraction, same span, same ramp.

**Three things this had to get right, each the same rule in a different shape:**

- **The span is not 175 on the page.** The timeline draws in world units and scales them into its
  frame, so its 175-unit reveal is ~122 CSS px on screen. A page region reusing the raw constant
  reveals over a visibly longer stretch — the same number, a **different motion**. `revealSpanPx`
  converts through the timeline's measured scale.
- **The founders' arms read PER-RUN.** An arm is ~650px; keyed to its root it would shoot out whole
  the moment the line cleared the fork. Safe because the arms are monotone in y — unlike the
  space-colonization branches.
- **The coda reads PER-VINE, and that is the point.** Its vines are horizontal swags: every point at
  nearly one height, so a y-driven reveal uncovers the whole thing in one frame. It would **pop** —
  precisely the defect. Root-keying (what the timeline's branches already do) draws each vine
  root → tip: a stem growing sideways.

The coda's stems are **painted** (`tube: true`), so there is no path to dash — the stem is revealed by
dashing a **mask stroke** along the vine's own polyline instead. Same expression, different layer.

Station lists are hoisted so the painter that stamps an organ and the reveal that uncovers it read
**one array** — a disc keyed to a station the composer did not use is a hole in the drawing.

`usePageCardLine` coalesces to one rAF (this drives a mask with hundreds of discs; a scroll listener
calling setState re-renders the ornament far more often than the compositor can paint). Reduced
motion returns **Infinity**, so every `growAt` saturates to 1 and the page settles instantly, fully
grown — expressed once instead of at every call site.

**`qa/motion-one.mjs`** pins the claim that matters: each region must be caught **mid-growth**. A
region that is 0 then 1 with nothing between is popping. All three caught partial.

## 2. The low-compute pass (`c8d7ed6`)

**MEASURED FIRST, and the profile named the culprit in one run:** `toBlob` was **6,291ms of
main-thread self time — 51.9% of everything**.

The painting was already off-thread. **The page was not.** Every caller wanted a URL, so a worker
handing back an `ImageBitmap` made all four draw and PNG-encode it by hand — four garlands, up to
1200x3525, encoded on the thread that answers the scroll, while the painters idled.
`OffscreenCanvas.convertToBlob` does the identical encode in the worker. `requestGarland` returns a
**URL** now; the main thread's whole job is `createObjectURL`.

**Measured, same harness both sides (`qa/perf-about.mjs <throttle>`):**

| throttle | main-thread blocked | scroll FPS | ornament ready |
|---|---|---|---|
| 1x (this machine) | 4722 → **1571ms** (−67%) | 138 → 200 | 5672 → 6783 |
| **4x (mid laptop)** | 23336 → **7342ms** (−69%) | 10.9 → **48.2** | 25003 → **12339** (−51%) |
| 6x (phone) | 36270 → **23310ms** (−36%) | 6.1 → 3.6 | 37611 → **24148** (−36%) |

**4x is the one that matters and it is transformed** — 23s of blocking to 7s, 11fps to 48. Same
seeds, same pixels, same determinism, so it is invisible at the top end, which was the constraint.

**Method note, honestly:** these are **dev-server** numbers, before/after on the same harness, so the
comparison is fair. A clean production before/after was not obtained — the first attempt measured a
**stale app on an already-occupied port** (caught it; `vite preview` had failed to start and
something else answered). Production absolutes on a real preview are 1x ready≈11.6s / blocked≈1.0s,
4x blocked≈14.8s, 6x blocked≈25.2s, and they are noisy run to run. **6x is still not good.**

## THE BAKE — measured, not built. This is the next move and it wants your call.

The lead's instinct is right and the numbers support it. Positions are deterministic and only the
**species** rolls, so the sub-branch garland is a **fixed, finite set of images**:

| species | canvas | paint | as PNG |
|---|---|---|---|
| `bower/spine-2` | 1200x3525 | **7,084ms** | **685 KB** |
| `bower/pool-a` | 1200x3525 | **7,567ms** | **859 KB** |
| `bower/pool-k` | 1200x3525 | **7,217ms** | **593 KB** |

**The trade: ~7.2s of CPU on every single load, against ~700KB downloaded once.** And the asymmetry
that makes it a rout — **the paint cache is `new Map()`, in-memory, per session, so a visitor pays
the 7.2s on every reload forever. An HTTP-cached PNG is paid once, ever.** A visitor rolls ONE
species per visit, so it is ~700KB per visit, not 2.1MB.

**What is bakeable and what is not** (this is the part that needs care):
- **The sub-branch garland — yes, and it is the whole prize.** Its geometry is `subBranchPolylines()`,
  deterministic, on a fixed 1200x3525 canvas. 3 PNGs.
- **The coda — yes.** Fixed 1000x300 band, hand-authored vines. Cheap either way.
- **The spine garland — yes.** Fixed `GARLAND_BOX`.
- **The founders' parenthesis — NO.** Its arms are derived from the **measured founder rows**, which
  move with the viewport and with the text. It cannot be baked without pinning the layout, and
  pinning the layout would invert the page's load-bearing rule (ornament reads layout; layout never
  reads ornament). It is only 378ms, so it does not matter.

Not built because it is a real pipeline (a build step, an asset budget, a fallback when a bake is
missing) and an architectural commitment — the kind of thing to decide, not to slip in at the end of
a session.

## Left (open)

1. **6x (phone) is still ~23s of blocking.** The bake is the answer; nothing else on the list moves
   it by an order of magnitude. Levers already checked and NOT worth taking: the worker pool is
   already hardware-aware (`min(3, cores-2)`, so it scales *down* correctly and raising the cap only
   helps big machines, which are not the problem); the garlands are painted at fixed canvas sizes,
   not DPR-scaled, so there is no DPR cap to take.
2. `SUB_ATTRACTOR_STEP` (52) remains a legitimate device-aware cost dial — fewer organs on weak
   hardware is a better failure mode than jank. Not taken: it is visible, and the constraint was that
   the optimisation must not cost the look.
3. Everything from rounds 4–5 still open (the asset re-export, Forsite clause, year labels).

---

# ROUND 7 — the growth arrives on time, and the intro gets its hook back

**Branch:** `about-hybrid-sepia`. **`main` untouched, nothing pushed.** **Author:** Edward.
Rounds 1–6 preserved above, unedited.

Two commits: `39bb3aa` the growth's timing · `d6da7b6` the setup line.

## 1. The parenthesis finishes growing before the reader arrives (`39bb3aa`)

Daniel: *"Let the flowers and vine make their loading animation earlier in the cycle, so they are
fully visualized before being out of frame, like it currently is now."*

**MEASURED, and it was worse than "late": the parenthesis first reached fully-grown at scrollY 10440,
at which point its own top was 636px ABOVE the viewport.** It never existed finished and on screen at
the same time. The animation was playing to nobody. Now it completes at scrollY 9960 with its box at
**top 42 / bottom 689** — framed, with both founders.

**The cause was mine, from round 6.** Each taper run was keyed to its OWN y, so a 650px arm's tail
only drew when the card line reached the tail — by which time its head was long gone. That was a
local fix for "a long arm should not shoot out whole", and it traded one failure for a worse one.
**The timeline's own rule was right all along: a stem draws root → tip as ONE event.** An arm is just
a long stem.

**The fix is the START, not the duration.** Compressing the growth to fit the window would trade
"invisible" for "too fast to see". So: one progress for the whole ornament, which
- **begins** when the wrapper's top first appears at the BOTTOM of the screen (`readerLead`), and
- **ends** when the founders are framed — the reader looks up and it is already done.

Both ends derive from the measured layout and the **live** viewport (height and the real
`--header-h`). Measured ramp: 0.04 → 0.21 → 0.49 → 0.77 → 0.94 → **0.99 exactly as the founders
reach the frame**.

`readerLead` is the card-line equivalent of an IntersectionObserver's `rootMargin`. The brief
suggested `rootMargin`; there is no observer here — the reveal is a **line**, so "start earlier" is a
distance rather than a threshold. Same idea in this page's own mechanism. It is also "paint ahead of
the reader, not on top of them", from the other end.

**THE TIMELINE IS UNTOUCHED, DELIBERATELY, and that is what keeps the plates in sync.** Its branches
are short — each draws over `UNFURL_SPAN` as it crosses the card line and completes at ~38% of the
frame, well inside — and its plates fade on exactly the same line. Pulling the branches earlier
without the plates would break the one thing Daniel has been consistent about. **The autoplay also
stops at the pin, inside the track, so it never reaches the founders**: the two traverse rates do not
interact, which is why one trigger works for both.

One bug found on the way: the last arm run starts at `t0`≈0.9 with only `OVERLAP` (0.34) of runway,
so it topped out at 0.29 and **the arm's tail never finished**. The ramp is stretched by
`(1 + OVERLAP)` so the arm is complete when its progress hits 1.

## 2. The setup line (`d6da7b6`)

    Bower is new.
    We've been chasing it for five years.

**They QUEUE, they do not cross, and that is not a taste call.** The setup and the title share ONE
box — that is the whole continuity, the title's first line lands exactly where the setup line was —
and both render at that box's TOP. The first cut crossfaded them and put "Bower is new." directly on
top of "We've been chasing it for": two lines stacked, neither readable, for 360ms. **Photographed
it**, then delayed the title's fade by exactly the setup's exit. The original had the same overlap
and only got away with it because its two lines were different lengths.

Timing tuned by watching, not pasted (the original's numbers paced a seven-word sentence; this is
three words): setup in at 0, out at 800, title fades up at 1160, flies at 2000, lands at 2960, done
at 3560.

`qa/title-alignment.mjs` still passes. Reduced motion: no veil, no setup line.

## A MEASUREMENT TRAP, twice in one round — worth naming

**The intro's t=0 is the component's MOUNT, and in the dev build the module graph takes ~1.8s to get
there.** Sampling against wall-clock-from-navigation reports the wrong beat entirely: it looked
"stuck on the setup at 3200ms" when that was really intro-time ~1400. **Sample by STATE, not by
clock.** The sibling of it: a screenshot costs ~300ms, so sampling a single page load drifts late and
every frame after the first lies about when it was taken — take one fresh load per sample.

This is the third time this session a confident measurement has been wrong in a way that looked
right (see also: the stale preview port, and the bounding-box text probe). The pattern: **when a
number surprises you, check the instrument before you change the code.**

## Left (open)

Unchanged from rounds 4–6: the hero asset re-export (Plentify 48.4% / Resia 34.6% dead white), the
Forsite clause confirmation, the year labels, the bake, and 6x-throttle compute.
