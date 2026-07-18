# 2026-07-17 — Round 3 brief: beauty pass (watercolor, vines, joinery, onboarding)

**START HERE if you are the next session.** This is Daniel's feedback on demo round 2,
recorded verbatim-in-intent, plus everything you need to pick the work up cold.

## Where things stand

- **Worktree:** `C:\Users\danie\restless-egg\engine-session`, branch **`engine-draw`**,
  tip `23e93a0` plus this doc's commit. **Nothing pushed** (deliberate; this repo is
  PUBLIC and the handoff chain contains candid pricing reasoning — Daniel decides when
  origin gets it).
- **Gates at tip:** `npx tsc --noEmit` 0 · `npx vitest run` 592/592 · `npm run build`
  clean · `three` chunk ~1058 kB against a hard 1100 kB ceiling (~41 kB headroom).
- **What round 1+2 shipped** (see `2026-07-17-demo-simplification.md` and
  `2026-07-17-demo-round-2.md`): panel simplified to one commission figure; figure made
  dynamic (area/pieces/species off a £150k anchor, £5k steps, floored, count-up
  animation); 7-card Samara-style species row top-center, post-bake; manufacturable kit
  pass (eased-arris members, dome nuts, ground screws, two-tone steel, 8mm disc hubs).
- Sai's build spec for round 2: `docs/design/2026-07-17-demo-round-spec.md`.
- Dev server habit: `npx vite --port 5199 --strictPort` in the worktree; demo arc is
  `#/draw`: drag two crossing lines → bake it → panel/species row → explode/reassemble.
- Fleet routing that worked: **Sai** writes the build-ready spec → **Edward** builds →
  team lead live-QAs in Chrome. Keep that shape.

## Daniel's round-3 feedback (2026-07-17, after seeing round 2 live)

1. **Species row: keep it, move it.** He likes the plants. Position the selector on the
   **right side of the screen**, somewhere it does not intervene with the drawing
   workflow (top-center currently collides with the dome at tight zoom).

2. **Plants must be visualized in the engine.** Selecting a species should show the
   actual vines growing around the structure — including a way to see **potential
   growth over time** (the growth data exists: `growthRateMPerYr`, `matureCoverageM2`
   in `src/engine/species.ts`; there is a `GrowthOverlay.tsx` in `src/scene/overlays/`
   to start from). Vegetation/flowers should be **botanically recognizable per species**
   (right flower color/form for clematis vs wisteria vs the rest), rendered in the same
   artistic style as the rest of the scene (below).

3. **Rendering quality is the headline ask.** His words: right now it looks **stale**,
   not beautiful, "not something you would want to buy." It should mimic the sense of
   beauty in the reference photos. Two directions he named, and he prefers the second:
   - More realistic materials (real textures, displacement, etc.) — mentioned as an
     option, not the pick.
   - **Enscape "artistic mode" watercolor style as the DEFAULT display mode** — playful,
     painterly, closer to a hand rendering. References he gave:
     - https://blog.chaos.com/enscape-artistic-mode-styles-tips-rendering-engineer
     - https://www.archdaily.com/catalog/us/products/36329/how-to-express-design-ideas-with-artistic-visual-modes-enscape
   This means an NPR (non-photorealistic) pass over the three.js scene: paper texture,
   edge lines, washed color, soft shadows. Research what is achievable inside the
   bundle ceiling (postprocessing passes, hatching/watercolor shaders) before speccing.
   He also said "draw in sketch mode" — the soft/pre-bake phase may want a pencil-sketch
   read with the watercolor arriving at bake.

4. **Joints: more beautiful, near-invisible.** Look into **Japanese joinery** — little
   to no visible fasteners — instead of the current plates/bolts/dome nuts. Also
   **curvature in the timber members** (curved/glulam-like members, not straight
   sticks). NOTE: this reverses round 2's "hardware reads as hardware" direction and
   the `Folly.tsx` discipline of only rendering parts the fabrication spec names. That
   is fine — Daniel's ruling, it is a demo, it does not have to be true — but record
   the reversal in the next handoff so the chain stays honest, and do not delete the
   hardware code path (flag it, keep it switchable if cheap).

5. **Scale figure: better configuration.** Needs to be displayed better or have a more
   interesting interaction; he does not know the solution — this is a design question
   for Sai to propose options on.

6. **The studio scene also needs the beauty pass** (`#/studio`). Underspecified; treat
   as: same artistic style, same quality bar.

7. **Guided onboarding.** First contact with the tool must be a guided tutorial. Today
   the only hint is "drag a line across the lawn" — nobody is taught to zoom, orbit
   (right-drag), pan, or what left vs right click does. Make navigation and the basic
   loop **explicit** — a step-by-step first-run guide (progressive hints or a short
   interactive walkthrough), skippable, in the house voice.

## Open questions carried from round 2 (fold into this round)

- Price anchor: draws at/below ~14 m² read a flat £150,000; species cannot move the
  floor. If the number must visibly move on camera, lower the anchor or film a large
  draw. Daniel has not ruled.
- 7 swatch hues vs one-colour restraint; and all 7 species vs featured trio. The
  species-row relocation (item 1) is the moment to re-decide both.

## Constraints that do not move

- Gates stay green; `three` chunk under **1100 kB** (watercolor postprocessing will
  fight this — measure early, an NPR pass may need the headroom).
- NO em/en dashes as punctuation in user-facing copy; no decorative blue marks.
- Panel register: serif figures, lowercase mono labels, paper vellum.
- `src/engine/*` solver logic untouched (additive plumbing fine).
- Repo is PUBLIC. Candid internal material goes to the private `bower-docs` repo.
- Commit locally in the repo's commit voice; **do not push without Daniel's say-so.**
- Explode/bake animations must stay smooth (instancing in use, 200+ pieces).

## Suggested build order (next session's call, not binding)

1. Senku or a research pass: NPR watercolor techniques in three.js/R3F within the
   bundle budget (this gates everything visual).
2. Sai: one spec covering style mode, species-row relocation, in-engine growth
   visualization, scale figure options, onboarding flow, joint/member art direction.
3. Edward: build in spec order; the watercolor pass first since every other visual
   decision reads differently under it.
4. Live QA in Chrome at 1440x900 before calling it filmable.
