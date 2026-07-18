# 2026-07-17 — Round 4 PAUSED mid-flight: read this before touching anything

**START HERE if you are the next session.** Daniel paused round 4 to switch models. The
worktree holds an UNCOMMITTED, PARTIALLY VERIFIED fix layer on top of commit `5dea52c`.
Do not discard it and do not assume it works; the verification run was interrupted.
Round-4 brief: `2026-07-17-round-4-brief.md`. Round-3 spec and NPR research as before.

## State of the branch

- Worktree `C:\Users\danie\restless-egg\engine-session`, branch `engine-draw`.
- Tip: **`5dea52c`** "Lighter ink, a watercolour sky, and the round-3 QA fixes" — Edward's
  round-4 commit. Gates at that commit: tsc 0, vitest 619/619, build clean, three chunk
  1066.37 kB (ceiling 1100). BUT it carries two live regressions Daniel saw (below).
- **Nothing pushed** (repo PUBLIC, Daniel decides).
- Safety branch `backup-all-six-parts` still exists. Round 4 is NOT signed off — keep it.
- Stash list: stash@{0} and @{1} are UNRELATED older items (about-page work). The former
  engine stash was popped, fixed (bad `../engine/types` import → `../../engine/types`),
  verified green, and folded into `5dea52c` by Edward. Do not pop anything.
- Two Edward instances collided in this worktree earlier (a live round-3 teammate session
  plus a spawned agent). Both stood down; the worktree belongs to the team-lead session.
  Lain's leftover review worktree was removed. ONE writer at a time from now on.

## The working tree (uncommitted, on top of 5dea52c) — tsc 0 at pause

| File | What | Status |
|---|---|---|
| `src/scene/npr/inkShader.ts` | Sketch mode masks hatching to geometry via depth (background pixels sit at the far plane and stay paper). Without it the new sky's mid luma cross-hatched the ENTIRE frame into grey plaid pre-bake. | Verified live: pre-bake paper sky + hatched lawn restored. KEEP. |
| `src/scene/npr/GradientSky.tsx` | Sky palette moved to zenith `#4a7ab5` / mid `#8fb5d9` / horizon `#d8e6ef` (Edward's `#6f9fd0` set rendered near-grey through the wash). Debug hook removed. | Palette still NOT final — see "Sky calibration". |
| `src/scene/npr/InkPass.tsx` | **THE BIG ONE.** Composer no longer recreated when the camera changes; RenderPass retargeted per frame (`renderPass.camera = cam`). Plus TEMPORARY console.log instrumentation (`[InkPass]` mount/dispose/heartbeat + `window.__inkFrames`). | UNVERIFIED — the pause landed before the verification bake. Verify first, then strip the console.logs. |
| `src/pages/SplashPage.tsx` | Removed the "You shape four things…" paragraph (Daniel: confusing). | Done per Daniel's instruction. |
| `src/scene/SkyGradient.tsx` (deleted) | Duplicate sky module from the two-Edwards race; unimported. Deletion is intentional. | Commit the deletion. |

## BUG 1 (blocker): the watercolour pass dies at bake → raw render

Symptom (Daniel saw it live and hated it, reasonably): at bake completion the whole frame
falls back to the RAW three.js render — saturated navy sky band, green lawn, tan timber,
bulbous joint spheres, hard shadows. That raw look IS the bug, not the round-4 art
direction. The "terrible joints" are the naked geometry the wash normally paints over.

Root-cause evidence (instrumented live session):
- `InkPass.tsx` built its EffectComposer in a `useMemo` with deps `[gl, scene, camera]`.
- At bake, DrawPage's CinematicCamera swaps the camera object → the memo tears down and
  rebuilds the composer mid-flight → the ink `useFrame` heartbeat stops for good
  (`window.__inkFrames` frozen, 0 frames in 5 s) while R3F auto-renders raw frames in the
  gap. Reproduced on a fully clean load; NOT caused by dev-tooling noise.
- Accompanied once by a 45+ s main-thread freeze (CDP eval timeout) around the same
  moment; presumed shader/program churn or repeated teardown, not separately diagnosed.
- No WebGL context loss (`isContextLost() === false`), no THREE console errors, no
  Suspense/loaders anywhere in `src/pages`.

The uncommitted `InkPass.tsx` change is the fix candidate: composer created once per
`[gl, scene]`, camera retargeted per frame. **Verification recipe:** clean reload of
`#/draw` (foreground window), draw two crossing lines, BAKE, and confirm (a) the wash
SURVIVES bake — structure stays watercolour, sky fades in blue; (b) console shows exactly
one `[InkPass] composer created` and the heartbeat keeps logging past bake; (c) YR 0/1/3
and EXPLODE keep the wash and stay smooth. Then measure explode FPS (still never
measured!) via `window.__inkFrames` deltas, then REMOVE the instrumentation lines.

## BUG 2 (Daniel feedback): pre-bake draw page is now illegible

Daniel, verbatim intent: the beginning page visuals are terrible, you can't tell what the
mesh / arch / spine is; revert to the previous look. Two compounding causes, both from
round 4's global changes:

1. The ink thinning (EDGE_LO/HI 0.30/0.62, weights 0.42/2.4, `line*0.8`, lighter INK)
   applies in BOTH modes, so the pre-bake pencil strokes went ghostly.
2. The fog recolour to `SKY_HORIZON_COLOR` (#dde9ef) darkened the far lawn enough that
   the sketch cross-hatch now covers the WHOLE ground plane instead of the bounded inner
   ellipse — the full-frame plaid Daniel screenshotted.

**Fix direction (not yet implemented): make the constants mode-dependent.** Sketch mode
(uMode→0, pre-bake) returns to the round-3 values — EDGE_LO 0.16, EDGE_HI 0.42, weights
0.55/3.2, full `line` opacity, INK `#2f2a1f` — and the fog stays paper `#F6F4EE` until
bake (swap on `baked`, or lerp fog colour with reveal progress). Wash mode keeps the new
thin-line values (that part of round 4 Daniel liked: "progressively better"). In GLSL,
mix each constant by the same `uMode` float the modes already crossfade on.

## Sky calibration (open)

The wash pipeline heavily lightens/desaturates whatever the background texture holds
(likely the ACES tone mapping + 10 % desat + granulation + partial sketch mix). Source
`#6f9fd0` rendered ≈ `#c3cede` (near-grey). Current source is one step deeper
(`#4a7ab5`); NOT yet seen through a healthy pass end-to-end because Bug 1 kept killing
the wash before judgment. Calibrate ONLY after Bug 1's fix is verified, with Daniel's
eyes on it. Target: Enscape's default blue, watercolour-soft. `WASH_SHADOW_COOL` at
`inkShader.ts` line ~34 still untouched (open call). Note `GradientSky.tsx` is NOT
fast-refresh-compatible: every edit to it forces a FULL page reload — re-draw and re-bake
after each tweak, and wait for the reload before dragging (drags that race the reload
orbit the camera instead of drawing).

## QA gotchas (hard-won this session, do not relearn)

- Chrome window must be visibly foregrounded for animation/FPS; stills are fine hidden.
- After any `location.reload()` or GradientSky edit, WAIT and screenshot-confirm the page
  is interactive before dragging; early drags orbit or vanish.
- The demo arc: `#/draw` → two crossing drags → BAKE IT → species rail → YR 0/1/3 →
  EXPLODE. Dev server `npx vite --port 5199 --strictPort` (reuse if 200).
- "message channel closed" console exceptions are Chrome-extension noise, ignore.

## Also done this session

- `SplashPage.tsx`: "You shape four things…" paragraph deleted (Daniel: confusing).
- Lain's stale review worktree removed; both extra Edward instances stood down.

## Left / order of work when resuming

1. Verify the InkPass camera fix (recipe above). If green → strip instrumentation.
2. Implement the mode-dependent ink constants + fog (Bug 2) → pre-bake matches round 3.
3. Re-run gates (tsc / vitest 619 / build, chunk < 1100 kB) → commit locally, repo voice.
4. Sky palette calibration with Daniel. Then explode FPS at filming size.
5. Only after Daniel signs off round 4: delete `backup-all-six-parts`. Never push unasked.
