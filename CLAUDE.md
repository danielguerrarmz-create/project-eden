# Bower (project-eden) — working notes

Loaded automatically at the start of every session in this repo. Keep it short.

## Open task list — surface this at the start of a session

1. **Resia Images** — the Startups event on the About timeline (`Resia AI, and TestFit`, 2023)
   is showing a dashed "IMAGE TO COME" plate. Daniel's Drive folder for Resia was not reachable
   from the connected Google account (shared by link, not added to the Drive). Add the shortcut
   to Drive, or drop the files locally, then fill in the `image` field on the `startups`
   tributary in `src/pages/about/CrossPathsTimeline.tsx`.
2. **Drafted** — the trunk's own event (`Practice`, Rick Wright Architects, Dallas, 2020) has no
   picture yet and shows the same placeholder plate. Needs a drafting-era image.
3. **Robot Images** — the Robotic Factory project (`src/pages/about/projects.ts`, n: '03') shipped
   with PLACEHOLDER copy inferred from the renders, and a guessed author/year (Daniel · 2025).
   Real project info and any further images are still to come. Do not treat that copy as final.
4. **Fix linework** — the timeline strands still want a pass. They arrive from off-frame and draw
   in, but the lead-ins read as straight vertical stubs before they curve, and the merge into the
   trunk could be bolder and more continuous (see Daniel's 2026-07-13 redlines).

Also outstanding, lower priority: the **New York** event (Rogers Partners, 2025) carries the same
"IMAGE TO COME" placeholder.

## Things worth knowing

- **This repo is PUBLIC.** Candid internal material (audits, stress tests, accelerator drafts,
  reviews of Clay's work) belongs in the private `bower-docs` repo. See `.gitignore`.
- **The About page is one colour.** Blue, `INK_BLUE` in `CrossPathsTimeline.tsx`. The old
  Clay-blue / Daniel-green / shared-olive split was removed on 2026-07-13 — do not reintroduce
  colour-coding by person.
- **Do not wrap the project detail panel in `AnimatePresence mode="wait"`.** It deadlocks against
  the `layoutId` shared-element images inside it: the exit never completes, the incoming panel
  never mounts, and the detail silently freezes on whichever project rendered first while the list
  highlights another. It shipped that way once. There is a comment at the site.
