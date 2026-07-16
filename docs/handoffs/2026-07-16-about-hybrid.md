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
