# 2026-07-16 — Engine session 2: gesture canopy shipped. READ THIS FIRST.

**Read this first if you are picking up the Eden engine.** Written for a reader with no
memory of either 2026-07-16 session. This supersedes `2026-07-16-engine-draw-and-sculpt.md`
as the current state of the world; read that one next for the full first-session arc, and
`2026-07-16-engine-gesture-canopy.md` for this session's change in detail.

**Branch `engine-draw`**, worktree `restless-egg/engine-session`, off `main`.
**Nothing pushed. `main` untouched.** Working tree clean at `e1c40b7`.

Gates on every commit — all green at `e1c40b7`:
**`npx tsc --noEmit` = 0 · `npx vitest run` = 387/387 (never fewer) · `npm run build` clean.**
(Baseline was 384 at session start; +3, none deleted.)

```bash
cd C:\Users\danie\restless-egg\engine-session
npm run dev -- --port 5344     # port 5344, NOT 5333 (another session owns 5333)
```

| branch | what it is | tests |
|---|---|---|
| **`engine-draw`** | **This work.** Draw/sculpt flow; engine obeys drawings; gesture-canopy surface model. | 387 |
| `engine-geometry` | Safe, shippable geometry fixes only (spider-disc hubs, overlay normals, HUD honesty). Mergeable as-is. | 277 |
| `engine-piecesolid-wip` | Clay's ring-fairing port @ `736c980`, parked pending the EC5 decision. Do not merge without Daniel. | — |
| `origin/manufacturable-component-model` | Clay's older paused arc. Prior art; skim before re-solving anything. | — |

## What (this session, all in `e1c40b7`)

- **Daniel settled the surface-model fork: (b) — the drawn arcs are the GESTURE, not the
  ribs.** Decided against (a) ribs-literal and against a hybrid, shown a before render.
- `surface.ts` raises the ENGINE'S OWN canopy over the drawn plan: feet, plan (faired
  hull) and crown height come from the lines; eave and cap come from the engine's rules.
  The eave stays up between the legs and dives only at the drawn feet. The dead
  ribs-interpolation model is documented in `surface.ts`'s header so nobody rebuilds it.
- **One rule, two resolutions:** `geometry.ts` exports `capProfile`, `eaveHeightAtM`,
  `footPullAt`; the parametric generator and the soft skin both call them. The parametric
  studio is untouched (byte-identical test still pins it).
- **The drawn arcs set the rise.** `arcRiseM` lives in `fromDrawing.ts`; `readDrawing`
  derives `riseM` from the longest line, holds it to headroom/cap, and says so in a nudge.
  Soft HUD, baked params and exports now agree on "tall".
- **The feet nudge stopped lying** ("so it rooted 4" while the bake rooted all 6 drawn
  contacts). Now a `read` nudge counts what it actually roots + an `offered` nudge carries
  the grammar's opinion. Tests pin the drawn path, not the parametric one.
- Ribbons ghost once the canopy stands; boundary epsilon in `surfaceHeight` kills the
  torn-teeth edge (the preview mesh's last ring sits exactly at r=1 and float noise flipped
  vertices between eave and lawn).
- `fairedRadius` moved to `surface.ts` (re-exported from `shapeFromDrawing.ts`); skin,
  preview mesh and baked net share one boundary. `insideHullM` deleted (dead).

## Why

(b) is what the engine's own geometry says an Eden is. The ribs-literal model dove the
whole boundary to the lawn (a rib is at zero near its own foot; hull edges run BETWEEN
feet) and read as a tent — it threw away the eave and the open sides. Only a render caught
it, twice.

## Verify

```bash
npx tsc --noEmit && npx vitest run && npm run build   # 0 / 387 / clean
```

Live-verified this session at http://localhost:5344/#/draw — two crossing lines → soft
canopy (eave up between feet, dives at feet, ghost ribbons) → small excavate opens a clean
window → bake → **4 feet where drawn, lifted eave, open front, £18,800**, nudge panel says
"each rooted where you drew it". `#/studio` still works (visually checked + byte-identical
test) and remains the safe fallback.

**Not verified:** whether a hole smaller than a bay removes any member at bake (the soft
skin shows a window either way — see Left); `export drawing` / `export everything` were not
re-exercised this session (tests cover the builders).

## Left — priority order for the next session

1. **Sculpt-gesture robustness** (no Daniel needed; small, well-understood):
   - Excavate radius blows up if the drag crosses off the surface mid-drag (plan-space
     jump → one gesture eats the whole canopy). Clamp the radius or ignore off-surface moves.
   - A lift is LOST if pointer-up lands off the surface (R3F pointerup never reaches the
     mesh; refs stay armed until the next pointerdown). Window-level pointerup listener.
2. **EC5 compliance decision** (Clay/Daniel — engineering call, not rendering). Preserved on
   `engine-piecesolid-wip` @ `736c980`. The port works but moves the fabrication standard
   (bolt insets [40,85]→[85,145] etc.), lifting minimum millable strut ~260→420 mm; at
   studio defaults **50 of 144 struts (34.7%)** fall below it (shortest 218 mm — they
   predate the port; it revealed them). The `subMillableStrutCount` test is restored there
   and correctly fails. **It was deleted once to go green. Do not delete it again.**
3. **Ring-count bug** (needs Daniel's approval; price delta never measured).
   `geometry.ts` `radialRunM = Math.hypot(meanR, H) * 1.05` uses the full radius but `rAt`
   spans only `crownFraction (0.22) → 1`, so bays are ~25% denser than the `lattice`
   slider claims. Two lines to fix; moves geometry AND price. Measure the delta first.
4. **Smaller / parked:**
   - A pointy-corner foot stands outside the faired plan (soft AND bake — ground nodes sit
     at the faired radius). Candidate AI nudge rather than a silent fix.
   - A hole smaller than a bay may open a soft window yet remove no member at bake.
     Honesty gap: warn, or floor the hole radius at the bay size.
   - Import drawings: `parseDrawingExport` exists and is tested; only UI missing.
   - Year 3 foliage reads as faceted green rocks; untouched.
   - Site step parked, not deleted (`engine/site.ts`, `draw/SiteMap.tsx`, tests kept).
   - Overlays default ON in the studio store (`strutHeatmap`, `growth`); `#/draw` unaffected.

## Gotchas — cost real time across both sessions; don't rediscover

- **LOOK AT THE RENDER.** Both sessions' biggest catches (tent boundary, torn-teeth edge,
  lying feet nudge) were invisible to a green suite and obvious in one screenshot. Show
  Daniel before/after renders, not descriptions.
- **A failing test is information.** The millability test was deleted once to go green and
  it was the most valuable finding of that day.
- **WebGL + unfocused tabs:** plain screenshots come back blank; an unfocused tab throttles
  rAF so HUDs look dead. Click the page to focus before judging any 3D.
- **Drags right after a reload don't register** (page still hydrating) — wait for the
  settled page, then gesture. And a drag that STARTS on the lawn draws a line; orbit by
  starting the drag on the vellum background outside the lawn circle.
- **Vite HMR lies after files move between modules** — hard-reload before debugging
  anything weird.
- **React batching eats gestures:** refs are the truth, state only mirrors for painting
  (`DrawStage`). Same bug bit twice in session 1.
- **ONE WORKTREE PER AGENT.** A shared worktree cost session 1 real time (stash/checkout
  destroyed uncommitted edits twice). If you delegate, the lead holds no uncommitted state.
- The About-page session owns `src/pages/AboutPage.tsx`, `src/pages/about/*`,
  `src/pages/ascent/*`, `src/pages/scroll/*`, `src/engine/gongbi/*`,
  `src/vendor/nonflowers/*`, `src/pages/lab/GongbiLab.tsx` — do not touch.
  **Contested (keep edits additive, signatures stable):** `src/engine/botanical/*`,
  `src/engine/index.ts`, `src/routing.ts`, `src/Root.tsx`.

## Files (this session)

- `src/engine/surface.ts` — canopy model; fairedRadius; boundary epsilon; dead-model header
- `src/engine/geometry.ts` — exports `capProfile` / `eaveHeightAtM` / `footPullAt`
- `src/engine/fromDrawing.ts` — `arcRiseM`; riseM from drawn arcs; honest feet nudges
- `src/engine/shapeFromDrawing.ts` — re-exports `fairedRadius`
- `src/engine/surface.test.ts`, `src/engine/fromDrawing.test.ts` — canopy + drawn-path pins
- `src/pages/draw/DrawStage.tsx` — ribbons ghost once the canopy stands
- `src/pages/DrawPage.tsx` — stale DEMO SCOPE header replaced with the settled model

Commit range this session: `c557d1c..e1c40b7` (one work commit, `e1c40b7`).
