# Bower (project-eden) — working notes

Loaded automatically at the start of every session in this repo. Keep it short.

## Open task list — surface this at the start of a session

**LATEST (2026-07-16): the About HYBRID, ROUND 2, on branch `about-hybrid-sepia`** (handoff:
`docs/handoffs/2026-07-16-about-hybrid.md` — round 2 is the second half of that file; read it before
continuing). Seven commits, nothing on main, nothing pushed. Round 1's ruling stands (Daniel's About
is the shell; Clay's retired drafts are harvested as ORNAMENT; the page is sepia; the pigment
specimens are keepers). Round 2 is his next pass of notes:

- **The founders are Clay's page, ported wholesale** from `about-v2-nonflowers:src/pages/ascent/AscentPage.tsx`.
- **The work index is ROWS, not columns, and FLAT.** The hero was in a 505x557 PORTRAIT box against
  natively-landscape images; it is now 735x414..509. The discipline headers and their frontispieces
  are deleted (with `groupProjects` and three commissions).
- **THE PROJECTS ARE DECOUPLED FROM THE TIMELINE.** Nothing holds them: the branches, the calyx
  holders, and `unfurl()` are all gone (-298 lines). The entrance is a fade. The 2025 label collision
  round 1 flagged is gone with the branch that caused it.
- **The ornament is now an ENGINE**: space colonization (`src/pages/about/spaceColonization.ts`,
  Runions et al. 2007) grows sub-branches into the negative space. **Read the direction rule below.**

**THE ORNAMENT READS THE LAYOUT; THE LAYOUT NEVER READS THE ORNAMENT.** This is the load-bearing
lesson of round 1 and the thing most likely to be undone by accident. The old branches were
STRUCTURE — they carried the plates, so the layout depended on them, and every collision round 1
fought existed because ornament was allowed to dictate layout. The sub-branches are ORNAMENT: they
read `computePlates()` and nothing reads them back, they are painted before the clusters, and no
attractor is ever scattered on an occupied rect. If a branch and a plate disagree, the branch loses
by construction. Filling the whitespace and avoiding the plates are the SAME mechanism (a plate has
no attractors on it), which is why there is no collision test in the engine and must not become one.

The About page was reworked to **round 3** on 2026-07-13 (spec:
`docs/2026-07-13-about-refinement-spec.md`; handoff: `docs/handoffs/2026-07-13-about-round3-*.md`).
It builds on v2 (`docs/2026-07-13-timeline-v2-composition-spec.md`), keeping the one-spine + short
branch-edges node graph, piecewise axis, seam fix, plate tiers, `packSide`, one-colour INK_BLUE.
Round-3 changes shipped (static-verified only, NOT live-QA'd yet):

- **The seed is retired; the finale is a woven bower.** `seedPath`/`embryoPath` deleted from
  `growth.ts`. The spine now forks at `WEAVE_START_Y` into two arms that weave over/under (three
  segments each, alternating z-order) and rejoin at `WEAVE_END_Y`, framing the wordmark rendered in
  the header's own mono face + the eight-circle Oculus mark (crisp, INK_BLUE). Payoff line is now
  "Everything above, grown into one place." (TODO(Daniel) sign-off).
- **Ornamental leaves** on every branch edge (last `BRANCH_LEAF_LEN` units become a lanceolate blade
  with midrib + veins, fixed size, `leafOpacity` budding after the stem draws) and at the two weave
  crossings (0.7x).
- **Year labels** heavy (30px/700, tabular-nums) with a data-driven side flip (opposite whichever
  cluster shares the year); 2024 and 2025 flip left.
- **Autoplay on entry** (§7): 14s eased `window.scrollTo` from the track's pin to its end, once per
  load, cancelled instantly by any wheel/touch/keydown, reduced-motion gated.
- **projects.ts content pass** (round 2): DAC hero is now the big wall-section drawing then the new
  cardboard model photo then plans (site + ground floor, `fit:'contain'`); KUKA + Texas Robotics
  MERGED into one "Robots as Instruments" (n:02) carrying both image sets + both videos; renames
  (Origami Medical Device, LLO: Dream Machine); Resia re-attributed `by:'clay'`; Archipedia gains the
  system-pipeline image. n runs 01..11 with no gaps.
- **Timeline** (round 2): DAC physical-model photo added to the dougherty cluster; the Plentify
  `making` node swapped from the AI render to the real MTS compression-test photo; Robotic Factory
  section-assembly video added (all three videos now play in the timeline); hints thinned to four
  (Research Paper, LLO: Dream Machine, Resia: AI-Remodel Software, NYC: Rogers Partners), rest
  hintless; the 2021 merge shows only "Clay" / "Daniel", the "Architecture Practice" plate removed;
  cleaner tangent merge (vertical run-in along the spine).
- **AboutPage** (§4/§5): founder spacers cut from 100svh to 38svh; founders now in a bordered panel
  with a hairline divider and 128px portraits; `ProjectText` reordered to title / credits /
  description / awards+publications / lessons learned (`awards?: string[]` field added, empty);
  `Gallery` supporting images now a balanced CSS multi-column pack at intrinsic aspect ratios.
- **Founder bios** in `TEAM` are two sentences each (one repo-sourced quirky fact + the role
  sentence); Sai's fuller drafts with unconfirmed facts are held in a TODO(Daniel) comment, not shipped.

Still open / TODO(Daniel): payoff-line wording; "What we learned" vs "Lessons learned"; bio facts
(Rick Wright / TestFit years, Clay's Resia verb, Rogers Partners dates, "Dream Machine" naming);
Robotic Factory n:03 still PLACEHOLDER copy; Texas Robotics year in the merged project.

LIVE-QA'd in Chrome on 2026-07-13 (team lead) + Gojo static pass (no blockers), then a fix round,
re-verified live. Fix round: year labels now paint AFTER the clusters with a vellum halo
(paint-order stroke) so timestamps are never occluded (elementFromPoint sweep: zero occlusions);
the flip rule extracted as exported `yearLabelSide` + 4 unit tests (132 vitest now); 2026 got the
same heavy year treatment above the weave fork (tiny lockup label removed); autoplay also cancels
on pointerdown (scrollbar grab); founder spacers 38svh → 24svh; stale seed comments rewritten.
Verified live: autoplay runs 14s and any input cancels instantly; all 3 timeline videos play;
all assets 200. Gates green (tsc 0, 132 vitest, vite build). Open for Daniel: (1) payoff-line
wording TODO; (2) the weave rejoin's pointed bud + dot can read teardrop-adjacent — TODO at the
site offers an open-tuck alternative; (3) at 24svh the payoff line's tail can share a frame edge
with the founders (only 100svh spacers fully prevented that — tight framing won); (4) 5 orphan
assets (~1.08MB) are deletion candidates: synergy biocore-axon / building-elevation /
eidetic-aerial / living-walls + testfit-clay-desk-recording-setup. Nothing committed; Daniel
reviews before any commit.

## Things worth knowing

- **This repo is PUBLIC.** Candid internal material (audits, stress tests, accelerator drafts,
  reviews of Clay's work) belongs in the private `bower-docs` repo. See `.gitignore`.
- **The About page is one colour: SEPIA.** `INK_SEPIA` (`#8A6A4A`) in `CrossPathsTimeline.tsx`,
  with `INK_SEPIA_TEXT` (`#6F5439`) for small text — the same colour at reading weight, because
  `INK_SEPIA` does not clear AA on the selected list row's own 8% tint. Amended 2026-07-16: the
  page was `INK_BLUE` (`#3E7CA8`), which appears nowhere in the splash hero (warm gold Austin
  light, timber, green foliage, wisteria purple). **Nothing blue survives on About.**
  - **PIGMENT is permitted on EVERY PAINTED BOTANICAL** — the founder specimens, the spine garland's
    organs, the sub-branches' organs, the founders' arms and the coda garlands (the gongbi genome's
    own palette). **RULED 2026-07-16**: this was "the botanical specimens only", and whether a
    painted *vine* counted was flagged rather than widened quietly. Daniel extended it. If the
    gongbi brush painted it, it may be in pigment.
    - **STRUCTURE IS ALWAYS SEPIA** — the spine, the sub-branch stems, the founders' arms' stems,
      the mark, rules, labels. That half is unchanged and is what the law is actually for. The line
      is: *the composer's brush may have colour; the page's own pen may not.*
    - The discipline frontispieces were deleted in round 2.
  - The old Clay-blue / Daniel-green / shared-olive split was removed on 2026-07-13 — **do not
    reintroduce colour-coding by person.** That prohibition stands unchanged.
- **A seed is a design review, not a constant.** Every commission in `about/paintings.ts` and the
  spine garland's `GARLAND_SEED` was curated by sweeping takes and comparing them, because
  `passesGate` (`engine/gongbi/quality.ts`) is a FLOOR, not a parity check: two seeds can both
  "pass" and still hang as a full plant next to a weed. Curate in `#/lab/gongbi` before pinning.
- **A year label must fit its gutter.** `YEAR_LABEL_OFFSET + YEAR_LABEL_W <= OFFSET_X` in
  `CrossPathsTimeline.tsx` (there is a test). When it didn't, every year with a plate on the
  label's side put the numerals on the photograph and the label's vellum halo cut the branch
  underneath in half. No choice of side can save a label wider than the space it lives in.
- **STOP FORCING GEOMETRY ONTO SOMETHING THAT ALREADY KNOWS ITS OWN SHAPE.** This is the page's
  most repeated bug and the answer has been the same every time: give the thing its own shape back.
  It has now shipped five ways — the hero in a 505x557 portrait box (Daniel: "natively landscape but
  displayed in portrait mode"); `unfurl()` opening every plate from `scale(0.92, 0.64)`; a founder
  vine upscaled 1.8x by `object-cover`; every project hero on `fit: 'cover'` in a region of the
  wrong ratio, silently cropping (Plentify lost **21% of its width** off the sides, and a cropped
  photo still looks like a photo, so nobody notices); and a trunk with a hardcoded stroke that
  matched the spine's position exactly and still stepped 46% in width at the join.
  - The fix is never a better number. `fill` hands a picture a box and resolves the disagreement
    with object-fit (cover crops, contain letterboxes); `FIT_FRAME` lets the replaced element size
    itself from its intrinsic ratio under max-width/max-height, so the element IS the picture and
    object-fit has nothing left to resolve.
  - **THIS LINE USED TO SAY "Measured: hero crop 0% across all twelve" AND IT WAS FALSE FOR ROUNDS.**
    It was true about object-fit, which is genuinely 0, and the word it used was "crop". Round 10
    measured the other way the page can hide a picture and found **all TWELVE heroes clipped at
    1440x760, worst 47.7% of Synthetic Vision; three at 900, worst 22.3% of Origami.** Not by
    object-fit. By the button's own `overflow-hidden`: `FIT_FRAME`'s `max-h-full` resolves against the
    button, `items-start` left the button's height `auto`, and **a percentage max-height against an
    indefinite containing block computes to `none`** — so the constraint silently evaporated and the
    image took its full natural height behind a clip. Fixed by stretching the button (`items-stretch`
    on `[data-project-hero]`); verified 0 clipped and 0 ratio deviation at both heights.
  - **AND THE PROBE AGREED WITH THE COMMENT, WHICH IS WHY IT SURVIVED.** `qa/project-media.mjs`
    computes crop from `|rect.width/rect.height − naturalRatio|`, and **a clipped `<img>` keeps its
    natural ratio in `getBoundingClientRect()`** — the element reports the size it wants to be and
    the clip happens on an ancestor's paint. So the instrument was not broken; it was answering a
    different question and its answer was quoted for the question nobody asked. Overflow clipping is
    only visible by comparing the IMAGE's rect to the **button's** rect: `qa/hero-clip.mjs`.
  - The clip depends on the REGION's ratio, which rises as the window shortens, which is why Daniel
    saw this and a 1440x900 harness never did. **Check a short viewport.**
  - **`project-media.mjs` NO LONGER SAYS "crop" (round 10), because that word was the bug.** It is now
    `heroRatioPct` (object-fit: the element's own rect vs natural) and `heroClipPct` (overflow: the
    IMAGE's rect vs the **BUTTON's**). Two mechanisms; **neither implies the other**; name the question
    in the variable or the next person quotes one answer for the other question. It takes a viewport
    height and width now.
  - **AND THE BANNED PATTERN WAS STILL LIVE ON MOBILE THE WHOLE TIME — reported THREE times, measured
    zero times, fixed round 10.** `Gallery` passed its hero neither `fit` nor `fill`, so it hit
    ProjectImg's default `object-cover` inside a hardcoded `aspect-[3/2]`. **Measured at 390x844:
    ELEVEN of twelve heroes cropped, worst 28.4% (Patterns), Robotic Factory 22.6%, Flowerfield 21.4%
    — MORE than the 21% Plentify loss that banned `cover` in the first place.** It survived because
    every instrument on this page runs at 1440, where that tree is `lg:hidden` and its rects are
    meaningless. **It was not hidden by subtlety. It was hidden by a viewport nobody measured.**
    `qa/mobile-hero.mjs` now guards it and takes a width.
  - **A HERO MAY CROP ONLY IF IT NAMES ITSELF: `ProjectImage.fillHero`, and exactly ONE asset has it**
    (Robots' KUKA loop, 20.1% of width, licensed by Daniel twice, explicitly, to hold the uniform
    region). **It is a LICENCE, NOT A PRECEDENT** — the number is a whisker off the banned 21%, so the
    only thing separating them is that it stays on one asset. `projects.test.ts` pins it BY SRC (a
    moved licence keeps the count at 1 — the count alone will not catch it), and
    `data-licensed-crop` lets the probes allow it there and nowhere else. **A second one is Daniel's
    decision, not yours.**
  - Before sizing any image region, check the aspect against the real asset — the ratios are
    authored in `projects.ts`, and `qa/` has probes.
- **THE DIVIDER IS PINNED BY GEOMETRY, NOT BY A NUMBER (round 10, item 7).** The band is `shrink-0`
  and the media region is the REMAINDER (`flex-1`), so `dividerY = detail.bottom − band.height` and
  **no hero change can move it** — chasing it by cropping heroes is the fake fix. Every project's band
  renders into ONE grid cell with the inactive ones `invisible` (NOT `display:none`, which collapses
  the cell and pins nothing; NOT `min-h-[302px]`, because 302.1 was a measurement at ONE viewport and
  re-wraps at any other width). Daniel ruled **pin at the longest, lose no text**, and accepted that
  Archipedia's line rises ~74px from where he called it correct. **Clamping the band is FORBIDDEN** —
  tried and reverted once; it hid 61px of awards behind an undiscoverable scrollbar. Guard:
  `qa/divider.mjs` (takes a height AND a width; verified 0.00px spread at 1280/1440/1680/1920).
- **`Project` HAS NO STABLE KEY.** `n` is display order and renumbers on merge; `title` is display
  copy and has been rewritten twice. Round 10 wrote a bio guard keyed on **`p.id`, a field that does
  not exist** — every lookup returned undefined and it passed green while checking nothing, inside the
  file written to catch exactly that. **Match on `src`**, or author a real `id`. See the note above
  `interface Project`.
- **OPEN, AND `qa/project-media.mjs` IS RED ON IT RIGHT NOW: Origami's rail is EIGHT sheets at 53px.**
  NEEDS DANIEL (editorial). `railWidth` divides the region by `sum(1/ratio)`, so eight ~1.29 sheets
  give **53px cells at 900 and 30px at 760** — visually confirmed as illegible postage stamps. The
  arithmetic is correct and the guard is right to fail; **the input is the problem** (eight assembly
  sheets in one vertical rail cannot be legible at any width), so the fix is dropping sheets or a
  different rail, not a smaller `MIN_CELL`. **The guard has failed since the commit that wrote it**
  (`b96fc85` added the sheets and hardened the sliver check *in the same commit*), 17 commits ago.
  **A guard nobody runs is not a guard** — this is the fourth variant of the session's trap: not a test
  passing while measuring nothing, but a test failing while nobody looks.
- **WHITE MARGINS AROUND A HERO MAY BE THE ASSET, NOT THE LAYOUT — measure before "fixing" it.**
  Measured on the real pixels: Plentify's 1920x1080 hero poster has 451 fully-white columns on the
  left and 478 on the right — **48.4% of the picture is white paper**. Resia's hero is **34.6%**,
  Patterns 9.2%. No box can remove white that lives inside the image, and cropping it out is exactly
  what "no cropping, do not lose context" forbids. This was diagnosed twice as a layout bug and is
  not one. **It wants a re-export of the asset (Daniel's call, his files).** Do not "fix" it in CSS.
- **A BOUNDING BOX IS NOT WHERE THE TEXT IS.** The no-go rule (ornament must not touch text) is only
  as good as its idea of "occupied". "The founders." is a `<p>` in a full-width column — its box is
  1100px wide for a ~110px string, so a box-based probe reports a vine "crossing text" while it
  sails through empty paper a foot away, and would fail forever wherever the ornament went. Measure
  the **glyph runs** (a `Range` over the text node, `getClientRects()`), as `qa/founder-frame.mjs`
  does. With that, one reported collision was a false positive and exactly one was real.
- **A grid row is as tall as its tallest column, and in the work detail that height comes out of the
  hero.** So `ProjectInfoBand`'s column split is a height budget, not a style choice — and MORE
  columns makes it taller, not shorter (narrower columns wrap more). Measured: 3 cols stacked wrong
  = 319px, 4 cols = 465px, 3 cols balanced = ~195px.
- **Do not overlay the BowerMark on a painting.** `matRect` (`engine/gongbi/quality.ts`)
  base-anchors every plant so its densest region sits on the mat's bottom pixel row; anything
  placed at the frame's bottom collides with it by construction, for every seed.
- **THE FOUNDER BIOS RESTATE PROJECT FACTS BY HAND, AND NOTHING LINKS THEM TO THE LEDGER.** This is
  live and it will bite again. `LLO: Dream Machine` was re-attributed to Clay in `projects.ts` on
  2026-07-15; the sentence claiming it sat in **Daniel's** bio until round 5 found it. One fact, two
  places, one owner. Misattributing a cofounder's work on the company's own About page is the worst
  class of bug this page has, and it is silent — nothing fails, it just reads wrong.
  - **Whenever you touch a `by:` attribution, grep `TEAM` for the project's nouns.**
  - Cheap fix if it recurs (proposed, not built): a test asserting no `TEAM` fact mentions a project
    whose `by:` excludes that founder — a noun list per project is enough to catch the class.
  - The mirror of it is just as bad: wording a **shared** project (`by: 'clay+daniel'`, e.g.
    `Plentify`) as sole authorship in one founder's bio. Say what someone did, not what they own.
- **`toBlob` ON THE MAIN THREAD WILL EAT THE PAGE.** "The painting is in a worker" is not the same
  as "the page is off-thread". Handing back an `ImageBitmap` made all four callers draw and
  PNG-encode it themselves: **6,291ms of main-thread self time, 51.9% of everything**, while the
  painters idled. The worker encodes now (`OffscreenCanvas.convertToBlob`) and `requestGarland`
  returns a **URL**, which is session-cached and **must not be revoked by callers** — the next mount
  would get a dead URL. Measured at 4x CPU throttle: blocking 23.3s → 7.3s, scroll 11fps → 48fps.
  Profile with `qa/perf-about.mjs <throttle>` before optimising anything here; the CPU profile named
  this in one run and no amount of guessing would have.
- **Do not wrap the project detail panel in `AnimatePresence mode="wait"`.** It deadlocks against
  the `layoutId` shared-element images inside it: the exit never completes, the incoming panel
  never mounts, and the detail silently freezes on whichever project rendered first while the list
  highlights another. It shipped that way once. There is a comment at the site.
