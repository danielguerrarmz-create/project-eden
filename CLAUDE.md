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
  - **PIGMENT is permitted on the BOTANICAL SPECIMENS ONLY** — the founder specimens, the spine
    garland's organs, and (2026-07-16 round 2) the sub-branches' organs and the founder vines (the
    gongbi genome's own palette). Structure — spine, sub-branch stems, the mark, rules, labels — is
    always sepia. The discipline frontispieces were deleted in round 2.
    - **TODO(Daniel): the founder vines are an EXTENSION of this law, not an application of it.** A
      painted vine is a botanical in the specimens' own register, but it is a vine, not a specimen on
      a mount. Flagged in the handoff; say the word and they go sepia.
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
- **An image in a box the wrong shape is this page's recurring bug.** It has now shipped three ways:
  the hero in a 505x557 portrait box (Daniel: "natively landscape but displayed in portrait mode"),
  `unfurl()` opening every plate from `scale(0.92, 0.64)`, and a founder vine upscaled 1.8x by
  `object-cover`. Before sizing any image region, check the aspect against the real asset — the
  ratios are authored in `projects.ts` and there are QA probes in the round-2 handoff.
- **A grid row is as tall as its tallest column, and in the work detail that height comes out of the
  hero.** So `ProjectInfoBand`'s column split is a height budget, not a style choice — and MORE
  columns makes it taller, not shorter (narrower columns wrap more). Measured: 3 cols stacked wrong
  = 319px, 4 cols = 465px, 3 cols balanced = ~195px.
- **Do not overlay the BowerMark on a painting.** `matRect` (`engine/gongbi/quality.ts`)
  base-anchors every plant so its densest region sits on the mat's bottom pixel row; anything
  placed at the frame's bottom collides with it by construction, for every seed.
- **Do not wrap the project detail panel in `AnimatePresence mode="wait"`.** It deadlocks against
  the `layoutId` shared-element images inside it: the exit never completes, the incoming panel
  never mounts, and the detail silently freezes on whichever project rendered first while the list
  highlights another. It shipped that way once. There is a comment at the site.
