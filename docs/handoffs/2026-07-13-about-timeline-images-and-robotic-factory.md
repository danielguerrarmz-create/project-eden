# 2026-07-13 — About: one blue, a timeline made of pictures, and the Robotic Factory

## What

**The About timeline was rebuilt around images rather than prose.**

- **One colour.** The Clay-blue / Daniel-green / shared-olive split is gone from the whole page —
  strands, project list, seed. Everything is `INK_BLUE` (`#3E7CA8`). Strands now differ by weight
  and opacity, not hue. The Clay/Daniel/Together key was deleted.
- **The sequence starts immediately**, in the same frame as the title. The preamble screen, the
  grey rules, and the "It started as one line, in Dallas, in 2020" line are all removed.
- **The two questions moved into the title's column** and surface as the camera travels, instead
  of being handed over before anything has happened.
- **Every event carries a picture.** flowerfield for Architecture, Dougherty for Building
  together, the saliency heatmaps for Research, the Plentify courtyard for Making, the KUKA
  long-exposure for Robotics. Years were given far more vertical room (`YEAR_H` 300 → 560) so the
  plates never collide; two events that really did begin in the same season (Plentify and the
  research, spring 2023) keep their true dots and step only their plates aside via `labelDy`.
- **Lines arrive from off-frame.** Every strand, trunk included, has a run-up (`LEAD`) above the
  year it is named, so it descends into view already drawing rather than popping into being at a
  dot in an empty field. Strokes are heavier (trunk 5, tributaries 3.6).
- **The camera window is fitted to the panel's real aspect** (`useFrameAspect`, a ResizeObserver).
  It used to be a fixed 1440x460 slot, which on a portrait panel scaled the drawing down to
  spidery lines and cut labels in half. The drawing's coordinate space is also narrower now
  (W 1440 → 900), which is what made the type legible.
- **The egg is a seed.** Pointed tip where the strands gather, a dashed endosperm contour, a
  folded embryo up in the taper, a hilum, and "Bower / 2026" set inside the body. `eggPath` was
  replaced by `seedPath` + `embryoPath` in `growth.ts`.

**Projects**

- "Search by Assembly" → **Archipedia**. "Synergy with the Cosmos" → **Plentify**.
- Plentify's hero is now the real video (mp4/webm, not the GIF) at **0.72x**.
- **Robotic Factory** added as project `03`: the `.mov` transcoded to mp4 + webm as the hero at
  0.85x, plus three stills. The black backdrop was keyed out of the interior-hall render.
  **Its copy, author and year are PLACEHOLDER** — inferred from the renders, pending Daniel's notes.
- The list is renumbered reverse-chronologically: Archipedia, KUKA, Robotic Factory, Synthetic
  Vision, Patterns, Dougherty, Plentify, flowerfield.

## Why

Daniel's redlines (2026-07-13): the drawing read as thin spidery lines cropped out of frame, the
questions arrived before they were earned, and a year plus a name is not something anyone stops
for — the thing you actually made that year is.

## Bugs fixed on the way through

- **The project detail panel was frozen** — clicking a project moved the list highlight but the
  panel kept showing whichever project rendered first. Pre-existing on `main` (confirmed by
  stashing). `AnimatePresence mode="wait"` deadlocks against the `layoutId` shared-element images
  inside it: the exit animation never completes, so the incoming panel never mounts. Replaced with
  a keyed `motion.div`.
- **Videos would not autoplay.** Two causes, both needed: React sets `muted` as a property only
  after the node is in the document, so Chrome had already judged the autoplay policy against an
  unmuted video; and calling `play()` in an effect refuses because no `<source>` has been selected
  yet. Playback is now kicked from the element's own `canplay` / `loadeddata`.

## Verify

- `npx vitest run` — 124 tests, 16 files, all pass.
- `npm run build` — clean.
- `npm run dev` → http://localhost:5333/#/about — scroll the timeline end to end; select Plentify
  and Robotic Factory in The Work and confirm both videos loop at their slowed rates.

## Left

See the task list in `CLAUDE.md`: **Resia Images**, **Drafted** (the Practice plate), **Robot
Images** (real Robotic Factory copy), **fix linework**. Plus the New York placeholder.

## Files

- `src/pages/AboutPage.tsx` — one colour, video tiles + lightbox video, detail-panel fix.
- `src/pages/about/CrossPathsTimeline.tsx` — rewritten: title + questions column, image plates,
  off-frame lead-ins, aspect-fitted camera, the seed.
- `src/pages/about/growth.ts` — `seedPath` and `embryoPath` replace `eggPath`.
- `src/pages/about/projects.ts` — renames, video support, Robotic Factory, renumbering.
- `public/assets/projects/10-robotic-factory/` — new.
- `public/assets/projects/01-synergy/synergy-cosmos-growth-loop-poster.webp` — new.
- `CLAUDE.md` — new; carries the open task list.
