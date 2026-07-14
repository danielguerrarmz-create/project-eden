# Handoff — About page round 3 (weave finale, project merge, autoplay) — 2026-07-13

## What
Three-phase About-page pass (Edward), on top of the shipped v2 timeline.

- **Phase 1 (projects.ts content):** fixed the broken DAC physical-model reference; DAC image order
  is now wall-section drawing (hero) → cardboard model photo → catenary money shot → north facade →
  axonometric → site plan → ground floor plan (plans `fit:'contain'`). Renamed "Origami
  Wound-Prevention Device" → "Origami Medical Device" and "Large Language Object" → "LLO: Dream
  Machine". Re-attributed Resia `by:'clay'`. **Merged** KUKA Robotics + Texas Robotics into one
  project, "Robots as Instruments" (n:02, robots-as-instruments framing), carrying both image sets
  (incl. two new KUKA images) and both videos. Added the new Archipedia system-pipeline image.
  Re-numbered n 01..11, reverse-chronological, no gaps.
- **Phase 2 (timeline round-2 redlines):** added the DAC cardboard-model photo to the dougherty
  cluster; swapped the Plentify `making` node from the AI render to the real MTS compression-test
  photo; added the Robotic Factory section-assembly video so all three videos play in the timeline;
  thinned hints to four required ones, rest hintless; 2021 merge shows only "Clay"/"Daniel" (dropped
  the kicker, firm line, and the whole "Architecture Practice" plate); cleaner tangent merge.
- **Phase 3 (Sai's round-3 spec):** retired the seed for a **woven bower** finale (two arms weaving
  over/under, framing the wordmark in the header's mono face + Oculus mark, INK_BLUE); **ornamental
  leaves** on every branch edge and at the two weave crossings; **heavy year labels** with a
  data-driven side flip; **autoplay on entry** (14s eased scrollTo, cancel-on-any-input,
  reduced-motion gated); founder block tightened to 38svh + bordered panel + divider + 128px
  portraits; project detail hierarchy standardized (title / credits / description /
  awards+publications / lessons learned, `awards?` field added); Gallery now a balanced CSS
  multi-column pack at intrinsic aspect ratios; real founder bio drafts.

## Why
Daniel's round-2 red-scribbles (merge lines, AI renders, empty founder space, missing videos) plus
Sai's round-3 spec (`docs/2026-07-13-about-refinement-spec.md`): the seed read as an egg regardless
of the botanical rationale, and the payoff needed to literally be a bower.

## Verify
- Static gates green: `npx tsc --noEmit` (0), `npx vitest run` (128 pass), `npx vite build` (ok).
- New assets converted with ffmpeg to webp (cwebp unavailable); ugly originals (HERO.png, spaced
  filenames, imagehhhkkk.jpg) removed. All referenced asset paths verified present on disk.
- **NOT live-QA'd**: no MCP/browser connected this pass. Gojo owns the live Chrome pass (task #13).

## Left (TODO / flags for Daniel)
- Payoff-line wording ("Everything above, grown into one place.").
- "What we learned" vs "Lessons learned" kicker.
- Bio facts: Rick Wright / TestFit years, Clay's Resia verb, Rogers Partners dates, "Dream Machine".
- Robotic Factory (n:03) still PLACEHOLDER copy; Texas Robotics year in the merged project.
- Live watch items: weave reads as woven and the wordmark lockup is centred without touching the
  arms; year-label side flips clear every plate; autoplay/cancel behaves; 38svh spacers still keep
  the finale and founders out of the same frame.

## Files
- `src/pages/about/CrossPathsTimeline.tsx` (weave, leaves, year labels, autoplay, merge cleanup)
- `src/pages/about/growth.ts` (seedPath/embryoPath removed)
- `src/pages/about/projects.ts` (content pass, `awards?`, bios)
- `src/pages/AboutPage.tsx` (founder panel, project hierarchy, Gallery pack, spacers)
- `public/assets/projects/05-dougherty/*`, `06-kuka-robotics/*` (new webp; ugly originals removed)
- Nothing committed.
