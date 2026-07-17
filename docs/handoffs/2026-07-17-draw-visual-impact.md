# 2026-07-17 — Making `#/draw` look photographed

Session 3d, second pass. Built to Sai's spec (`docs/design/2026-07-17-visual-impact-spec.md`),
in Sai's order. All five buildable items shipped; item 6 (HUD) was rejected as a target and
was not touched. **`src/engine/*` has no diff.**

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. **Nothing pushed. `main`
untouched.**

Gates, all green:
**`npx tsc --noEmit` = 0 · `npx vitest run` = 458/458 · `npm run build` clean.**
Bundle: `three` chunk **1058 kB** against the 1100 kB ceiling. **42 kB of headroom** — the
next person to add a drei import should check this first.

Commits: `539b881` light+ground+AO+env · `5b25c77` scale figure · `2582a36` bake dissolve.

## What shipped

1. **The rig.** Fill outweighed the key (0.8 ambient + 0.7 hemisphere against 1.35), and no
   shadow-camera frustum was set anywhere, so a 2048 map was spread over Three's default
   ±5/far-500 instead of the ~9 m object. Ambient → 0.32, key → 1.9 raked to ~36° altitude,
   frustum sized to 11 m, `shadows="soft"` explicit, plus a rim light. **The lattice's raked
   shadow across the gravel is now the best thing in the frame.** It was always there, unlit.
2. **Fog** was configured and invisible (`near=24`, beyond everything ever in frame).
   `near=10 / far=30`.
3. **Ground at bake.** `GardenContext` mounts with the kit; `DrawStage`'s lawn gated on
   `!resolved` (the z-fight Sai caught). Soft phase keeps its bare green disc.
4. **AO** as a second tight `ContactShadows` pass. No new dependency, no postprocessing pass.
5. **Scale figure**, bake only, flat silhouette, computed placement.
6. **Bake dissolve.** Skin fades while the lattice sweeps up through it on one clock,
   concurrent with the camera tween. **The discard sweep is clean; the fallback was not
   needed.**

## Judgement calls that departed from the spec, and why

- **No `<Environment preset="studio" />`.** Per the lead: it fetches an HDR from a
  third-party CDN at runtime. Instead `StudioEnvironment.tsx` renders **local children** into
  drei's cube target — same reflections, `frames={1}`, one 128 px render at mount.
  **Verified: zero external requests during a full bake.** Nothing can pop mid-take.
- **`GardenContext` bed colour is now a prop, defaulted to the original.** Under the retuned
  rig the old `#5b4632` bottomed out near black and read as craters punched in the lawn, the
  darkest thing in frame. `/draw` passes `#7d6b52`. The default keeps every other consumer
  identical.
- **The figure's placement rule is not Sai's.** See below. This one is worth reading.
- **The reveal also needs a depth material.** Not in the spec, and it would have been the
  visible bug: `castShadow` renders three's own `MeshDepthMaterial`, not ours, so the
  finished structure's shadow would lie on the gravel while the structure was still a stump.

## The figure: three failures, each found only by photographing it

Sai flagged this as the highest taste risk and was right, but the risk was not where the
spec expected.

- **The first silhouette was an Easter Island moai.** It ran hip-to-ground as one slab. A
  silhouette reads as a PERSON on two cues, **the gap between the legs and the notch under
  the jaw**, and reads as a tombstone without them. Everything else is refinement.
- **"The widest foot gap facing the camera" is wrong twice.** Photographed across the range:
  at **~0° off** the camera axis it stands between the lens and the building at half its
  distance, so perspective blows it into a monolith **taller than the dome** and the frame
  (fitted to the lattice) crops it at the knee. At **~90°** it goes **edge-on** — a 9 cm
  extrusion on its edge is a black fencepost. At **~180°** a leg cuts through it. The
  readable window is **~150°**: broadside, beyond the structure, at the object's own depth.
  **The far side is right**, which is the opposite of the spec's reasoning: the lattice is
  legs and air, it hides nothing at 150°, and standing beyond it says the pavilion is
  something you walk through.
- **Gaps could not deliver it anyway.** Four feet at 90° spacing offer midpoints 90° apart,
  so the achievable angles off camera are a fixed set like `{5, 85, 95, 175}` — at many
  camera angles **none** is readable. A unit test caught exactly that, landing the figure at
  175°, the occluded case. So the angle is **taken, not searched**; the feet only break the
  tie between the two sides. The gap search was solving a problem that does not exist: the
  figure stands at `plan + 0.9`, outside the footprint, and cannot hit a leg.

## Verify — driven in a real Chrome, real input, 1440x900

Puppeteer drives CDP-level **trusted** events, so Sai's verification note (synthetic
`PointerEvent`s no-op against R3F) does not apply to this harness; the drags register.

Full shot driven end to end: lawn → line → canopy → **right-drag to turn** → bake → reveal →
resolved → turntable. Final reads **£17,000**. **Zero console errors.**

- **Dissolve** photographed frame by frame at ~130 ms: members are sliced exactly at the
  plane, no pop, no stutter. The shadow on the gravel matches the *revealed* portion.
- **Cycle**: bake → keep sculpting → re-bake → start over → re-bake. All price £17,000, skin
  restored each time, nothing left armed.
- **Shared scene unaffected**: `#/studio` mounts the same `Folly` with no reveal and renders
  as before (`customProgramCacheKey` keeps the shaders from sharing a program). Splash
  renders. `HeroScene` is tabled and mounts nowhere, so the "don't touch the house rig"
  constraint was moot in practice — but the rig change is scoped to this Canvas regardless.

## Left / honest limits

- **The figure is composed for the resolve moment and drifts.** Its bearing is fixed at bake
  (deliberately: a figure that slides round the building to stay in front of the camera is
  worse than any of this). The turntable raises the camera azimuth, so the angle decays from
  150° at ~13.8°/s and reaches edge-on after **~4.3 s of turntable**. A sub-10 s clip with
  bake near the end runs ~2-3 s of turntable, so it holds — verified readable at bake and
  still readable 5.7 s later. **If Daniel holds the turntable past ~4 s the figure degrades.**
  Cut before then, or re-open this.
- **The soft canopy is illegible from above** (~50°+): its eave goes edge-on and the skin is
  an untextured mass. That is a material question, not a camera one, and it is why the polar
  clamp is 30° and not 50° (see `MIN_POLAR` in `DrawPage.tsx`). Texture on the skin would be
  the real fix.
- **AO darkens ground only**, never member against member. Accepted: at 1440x900 for ten
  seconds the eye checks ground contact first.
- **`#/studio` still says "YOUR PRICE, FIXED £15,200".** The 2026-07-17 honesty pass fixed
  `#/draw` only. Different page, out of scope tonight, but it is the same claim that was
  judged indefensible on camera.
- 42 kB of bundle headroom left under the ceiling.

## Files

- `src/pages/draw/StudioEnvironment.tsx` — NEW. Local env, no CDN.
- `src/pages/draw/ScaleFigure.tsx` — NEW. The silhouette.
- `src/pages/draw/PlacedScaleFigure.tsx` — NEW. Reads the live camera; solves once at mount.
- `src/pages/draw/entryBearing.ts` + `.test.ts` — NEW. Placement rule, pure. 15 tests.
- `src/pages/draw/BakeReveal.tsx` — NEW. The one clock the dissolve runs on.
- `src/scene/revealShader.ts` — NEW. Discard injection + the depth material.
- `src/scene/Folly.tsx` — optional `revealUniforms`; steel 0.5/0.58.
- `src/scene/GardenContext.tsx` — `bedColor` prop, default unchanged.
- `src/pages/draw/SurfaceMesh.tsx` — `fadeRef`.
- `src/pages/draw/DrawStage.tsx` — lawn gated on `!resolved`; skin outlives `resolved`.
- `src/pages/DrawPage.tsx` — rig, fog, ground, AO, figure, dissolve wiring.

## Gotchas earned here

- **`castShadow` does not use your material.** It renders `MeshDepthMaterial`. Any
  vertex/fragment trick that changes a mesh's silhouette must be injected into
  `customDepthMaterial` too, or the shadow tells the truth your geometry is hiding.
- **`customProgramCacheKey` is mandatory with `onBeforeCompile`.** three caches programs by
  type + defines; two identical materials differing only in their injection silently share
  one program, and which one wins depends on compile order.
- **`instanceMatrix` in an injected vertex shader.** An InstancedMesh's `transformed` is the
  untransformed unit-box corner. Guard with `#ifdef USE_INSTANCING` or every steel hub tests
  the wrong height.
- **A material flipped to `transparent` mid-animation recompiles and blinks.** Set it for the
  whole life of the fade.
- **A flat silhouette has a degenerate viewing angle.** Anything that orbits will find it.
