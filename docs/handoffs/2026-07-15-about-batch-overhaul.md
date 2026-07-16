# Handoff — About page batch overhaul + site-wide botanicals

**Date:** 2026-07-15
**Branch/commit:** `main` @ `208bf77` (pushed to `origin`)
**Author:** Daniel (via Claude Code, multi-agent). **Next editor: Clay** (Daniel is handing this off for Clay to pick up and refine).

---

## What

One large batch across the About page (`#/about`), plus a new procedural botanical
system wired site-wide.

**Intro (`about/AboutIntro.tsx`)**
- The narration title enters at the **complete centre of the page** (both axes, text
  left-aligned throughout so lines never reflow), then flies to the header slot. The
  earlier settle glitch (a mid-flight `textAlign` snap + a mistimed veil clear that
  showed a ghost/double) is fixed: the veil now clears only after the title lands
  (`TRAVEL_S`).

**Timeline (`about/CrossPathsTimeline.tsx`)**
- Removed the "Clay" / "Daniel" strand labels at the top (the twist-fuse strands stay).
- **Autoplay** entry descent is now **constant/linear (`AUTOPLAY_MS = 24000`)** — it
  never accelerates. Gentle opening pace held the whole way; fast-forward-on-gesture and
  the pin landing (`PIN_FRAC`) are unchanged.
- **Finale:** the wound Bower **mark is the original right-flank logo** (do NOT re-mirror
  it). The post-pin **unravel is a MIRROR of the ravel**, not a rewind: `tailPtsUnravel(w)`
  morphs `tailPts → tailPtsMirror` (`m = 1 - w`), and `spineLeanPtsTo(tail[0].x)` re-aims
  the lean at the tail's current top **every frame** so the line is one continuous stroke
  from spine → mark → descent → founders handoff (`pageCenterVX` / `DESC_BOTTOM_Y`) at
  every scroll position. This continuity is locked by junction tests — keep them.
- **KUKA robot loop** added to the `robotics` cluster (2024) alongside Clay's Texas robot.

**Projects (`AboutPage.tsx` + `about/projects.ts`)**
- Detail layout: **hero fills the top half**, supporting images fill the bottom half via a
  justified flex row (each cell's aspect = its image's aspect, so `cover`/`contain` both
  fill — no dead space). **≤4 images per project.** No "Fig." tags, no white container.
- Text column hierarchy (no divider lines — spacing/type only): title + byline →
  2–3 sentence description with an outcome → Awards and publications → Collaborators →
  **"What we learned" as a rounded olive pill** pinned at the bottom.
- **Menu grouped by discipline** — Architecture / Product Design / Software
  (`Discipline` field on `Project`, `DISCIPLINE_ORDER`), smaller type so all 12 fit with
  no scroll.
- **Robots as Instruments** = KUKA video + Texas robot as the two mains (rest ducked).
- **Robotic Factory** and **LLO: Dream Machine** set `by: 'clay'` (per Daniel).
- **Clay's headshot** added to the founders (`/assets/about/clay-seifert.jpg`).
- **Hydraulic Commons** added (n:09, 2024, `by:'daniel'`) — data + 4 images pulled from
  Daniel's Burondono portfolio (`OneDrive/Desktop/TBD Website/Portfolio website design`,
  project `03-hydraulic-commons`).

**Botanicals (`src/engine/botanical/`, wired into 3 surfaces)**
- A nonflowers-derived (LingDong-, MIT — attribution in the module header) procedural
  plant generator: seeded/deterministic, gene-parameterised, outputs single-colour
  `INK_BLUE` SVG paths. Retuned per Daniel: **more flowers, looser, no dense "blob" genomes.**
- Wired into: the splash growth strip (`splash/SeasonalBecomingDiagram.tsx`), the engine
  growth diagram (`engine/GrowthPhasesDiagram.tsx` via `engine/botanicalFoliage.tsx`), and
  the **timeline plate holders** (`calyxSprig` replaces the old sepal calyx in
  `CrossPathsTimeline.tsx`).
- **Lab preview** at `#/lab/botanical` (`pages/lab/BotanicalLab.tsx`) — reseed + wild-count
  slider to browse the generator.

## Why

Daniel's direct requests over the session (batch 1 = the initial 6 edits; batch 2 = 7
numbered comments; plus follow-ups on the menu, the image fill, the unravel gap, and the
botanical retune). He approved the botanical look before it went site-wide, and asked to
push to `main` so Clay could pick it up and edit.

## Verify

- Gates (run in `app/`): `npm run typecheck` → 0; `npx vitest run` → **277 pass**;
  `npm run build` → clean. All green at the pushed commit.
- Live (`npm run dev`, http://localhost:5333/#/about):
  - Intro title centres then nests onto the header, no glitch.
  - Autoplay descends at a steady slow pace, never speeds up; any gesture fast-forwards.
  - Finale: original right-side logo; unravel is a continuous mirrored line down through
    the founders into the projects (no gap).
  - Projects: discipline menu fits with no scroll; images fill their cells; pill lesson.
  - Botanicals: `#/`, `#/how-it-works`, timeline holders, and `#/lab/botanical`.

## Left (open — for Clay / Daniel to decide)

1. **Botany colour on the diagrams** — on the splash/engine diagrams the plants render in
   `INK_BLUE` while the structural linework stays each diagram's own ink (black). One-line
   flip available (`FoliageLeaves`/`CrownFlower` accept an `ink` prop) if single-tone is
   preferred.
2. **Dougherty hero** — swapped from the wall-section *drawing* (letterboxed as a hero) to
   the catenary *render*; the drawing is now an uncropped supporting tile. Move `hero: true`
   back one line if the drawing should lead.
3. **Robotic Factory + LLO attribution** — now `by: 'clay'` per instruction, but their copy
   still reads as Daniel's robotics work; confirm/adjust.
4. **Diagram-heavy projects** (Synthetic Vision, Patterns, Archipedia) — supporting images
   fill their cells but read small (wide diagrams → thin strips); trim to fewer/less-wide
   images to enlarge. Content call.
5. **`TODO(Daniel)` markers** in `projects.ts`: some `discipline` assignments, several
   `collaborators/professors`, and the Hydraulic Commons "learned" pill wording are drafts.
6. **Deferred:** the deep 3D generative-engine plants (the "refine the generative engine"
   phase) were NOT touched — only the 2D diagram/ornament surfaces.

## Files

Modified: `src/pages/AboutPage.tsx`, `src/pages/about/{AboutIntro,CrossPathsTimeline,
projects}.tsx|ts` (+ tests), `src/pages/splash/SeasonalBecomingDiagram.tsx`,
`src/pages/engine/GrowthPhasesDiagram.tsx`, `src/Root.tsx`, `src/routing.ts`.
New: `src/engine/botanical/*` (generator, single source), `src/pages/engine/botanicalFoliage.tsx`,
`src/pages/lab/BotanicalLab.tsx`, `public/assets/about/clay-seifert.jpg`,
`public/assets/projects/06-kuka-robotics/kuka-robotics-robot-loop.{webm,mp4}` +
`-poster.webp`, `public/assets/projects/17-hydraulic-commons/*.webp`.

Asset sources (not in repo): KUKA loop from `Downloads/IMG_2074.MOV` (sped 4× → 9.5s);
Hydraulic Commons images + copy from the Burondono portfolio repo.
