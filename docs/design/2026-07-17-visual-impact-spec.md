# 2026-07-17 — Visual impact spec: making `#/draw` look incredible on camera

Spec only. For Edward to build. Written against the current source, not a
screenshot — every number below is cited to a file and line, so nothing here
is a guess about what's on screen.

**The shot:** open on lawn, drag line 1 (arch stands), drag line 2 (canopy
raises, camera glides in), bake (lattice resolves, price appears), turntable
carries the last beat. Silent, ~10 s, 1440×900, `#/draw`. Audience is Restless
Egg — architecturally fluent (Jack Self is a founder) — so craft reads and
kitsch is instantly caught.

**Ranking rule:** impact-per-hour in a silent 10 s clip. Nothing here earns a
slot by being technically correct if it doesn't show at 1440×900.

**Governing principle — photographed, not decorated.** A review pass came
back proposing glassmorphism, blur, elevation shadow, and glow on the HUD
panels as a fix for them reading "flat/utilitarian." **That is rejected,
hard, by the team lead, and none of it is in this spec.** The flat cream
cards, flat pills, and solid-black active state ARE the brand — restrained,
calm, anti-Jarvis, ElevenLabs-light on vellum — and glass/blur/glow on a
£17k architectural tool reads as a crypto dashboard, which is the fastest
route to losing Daniel in one frame. The line that governs every item below:
**light, shadow, occlusion, and material response are photography — they
make a restrained scene look expensive. Glass, blur, glow, and elevation are
decoration — they make it look like a startup template.** Every proposal in
this doc sits on the photography side of that line. The HUD chrome itself is
finished and out of scope except where legibility on video genuinely fails
(none found).

**Budget constraint that shapes three of these six:** `vite.config.ts:10-12`
already carries a raised `chunkSizeWarningLimit: 1100` with a comment that the
three.js stack is "inherently ~1 MB minified." The `three` manual chunk
(`three` + `@react-three/fiber` + `@react-three/drei`) is already near that
ceiling. No `@react-three/postprocessing`, `postprocessing`, or `n8ao` is in
`package.json` today. Anything that adds a render pass has to earn that cost
tomorrow, not just be a nice-to-have.

---

## 1. Light, shadow, and material response — highest leverage, do this first

**Current rig** (`src/pages/DrawPage.tsx:201-209`):
```
ambientLight        intensity 0.8
directionalLight    position [6,10,5], intensity 1.35, castShadow, shadow-mapSize [2048,2048], shadow-bias -0.0002
hemisphereLight     ['#fbfaf5','#d8cfae', 0.7]
```
This is the same recipe as `HeroScene.tsx:227-229` (ambient 0.74, directional
1.55, same position, same hemisphere) — it's the house rig, reused
deliberately for brand consistency. That's exactly why it's thin here: **flat
fill (0.8 ambient + 0.7 hemisphere = 1.5) outweighs the key (1.35).** The
shadow the engine already computes never gets to read as dark, and no
shadow-camera frustum is specified anywhere in the JSX, so Three's default
ortho bounds (±5, near 0.5, far 500) apply to an object that's ~9 m wide —
most of the shadow map's texel budget is being spent on empty space the
camera never sees, which is why the cast shadow reads soft/washed rather than
crisp.

**Change, scoped to `DrawPage.tsx`'s `<Canvas>` only — not the house
default:**
- Drop `ambientLight` intensity 0.8 → **0.32**.
- Keep `hemisphereLight` as-is (0.7) — it's doing useful cool/warm bounce, not
  flattening.
- Raise `directionalLight` intensity 1.35 → **1.9**, and give it a raking
  angle rather than the current near-overhead one. `sunpath.ts` is not wired
  to `/draw` (no `latitudeDeg` in `state/store.ts`) — wiring live astronomy
  into one hero light is scope this doesn't need tomorrow. But the module's
  own numbers are a useful sanity check: `computeSunPath` at London-ish
  latitude on the demo's `dayOfYear=172` peaks around 62° altitude at noon
  (`sunpath.ts:69-86`). A **35-40° altitude** key is therefore honestly
  "late-afternoon," not an invented angle. Author it by eye at that altitude,
  azimuth swung so the shadow falls toward camera-left across open lawn (not
  into the lattice, not straight at the lens): try `position:[9, 6.5, -3]`
  as a start (recomputed relative to origin, altitude ≈ atan(6.5/√(81+9)) ≈
  35.6°) and nudge until the lattice's own shadow lands clean on the gravel
  apron item 4 adds.
- Add explicit shadow-camera bounds sized to the scene, not the default:
  `shadow-camera-left={-11}`, `-right={11}`, `-top={11}`, `-bottom={-11}`,
  `-near={1}`, `-far={26}`. This alone should visibly sharpen the shadow edge
  — same 2048 map, spent on an 11 m box instead of a 5 m one wasted on 500 m
  of far plane.
- Retune `shadow-bias`/add `shadow-normalBias` empirically once the frustum
  is tight — the current `-0.0002` was tuned against the old loose frustum
  and will likely need to move. Watch for acne (bias too small) vs.
  peter-panning, a shadow visibly detached from the foot (bias too large).
- Add one **rim** light, low intensity, no shadow: a second `directionalLight`
  from roughly behind/opposite the key (e.g. `position:[-7,4,6]`,
  `intensity:0.35`, no `castShadow`) to catch member edges and separate the
  timber from the vellum background. Costs one extra light, zero extra shadow
  map, zero bundle weight.

**Soft penumbra — confirmed finding, and it's why the shadow currently reads
as a hard-edged blob.** Two different shadows are stacked today: the
`directionalLight`'s own cast shadow, which is what SHOULD carry the
lattice's member pattern (the gaps, the raking silhouette — the genuinely
beautiful part), and `ContactShadows`' soft ambient blob underneath it. At
the current weak key/loose frustum, the directional cast shadow barely
registers, so the flat `ContactShadows` blob is the only shadow doing any
work — which is exactly the "hard-edged flat blob, no soft penumbra" note.
Fixing the frustum and key intensity above should already make the
lattice's own cast shadow the dominant, legible one. Two more things to get
right: explicitly set `<Canvas shadows="soft" ...>` rather than relying on
the bare `shadows` boolean (`DrawPage.tsx:192`) — confirm which
`WebGLShadowMap` type that currently resolves to before assuming it's
already `PCFSoftShadowMap`. And be honest about the ceiling: a directional
light has no true area-light penumbra (parallel rays), so the soft edge here
comes from the PCF filter kernel, not real distance-based softening. That's
the correct, cheap version — a real soft-edged penumbra would need an area
light and a much more expensive shadow pass, not worth it for tomorrow.

**Hub specular response — confirmed finding.** `Folly.tsx:164,177`'s steel
(`roughness 0.62, metalness 0.45`) is lit only by the directional key today,
which gives a metal surface one small, easy-to-miss specular hotspot rather
than the continuous reflected gradient that reads as "galvanized zinc" —
this is why the hubs look like flat grey discs through the turntable instead
of catching light as they rotate. The fix is real environment reflection,
not a material-only tweak: add `<Environment preset="studio" background={false} resolution={256} />`
(drei, already a dependency — this is a runtime HDR fetch, not new JS
bundle weight, so it doesn't touch the chunk-size budget item 2 is
protecting). `background={false}` is not optional — it must only feed
reflections/materials, never replace the vellum/fog background, or the
whole aesthetic breaks in one frame. Pick a **neutral, warm-leaning preset**
and keep intensity low (`environmentIntensity` ~0.4-0.6 once available in
this drei version, or scale via the material's `envMapIntensity`) —
several drei presets carry a strong blue sky dome, and a blue-tinted cast
across the steel would be its own small violation of "no decorative blue"
even though it's structural, not ornamental. Preview it before committing;
if every preset available carries too much color, a flat studio-grey
custom environment is safer than any preset with visible sky. Pair with
the steel material tweak: `roughness 0.5, metalness 0.58` for a crisper
highlight once there's something worth reflecting.

**Atmospheric depth — confirmed finding, one-line fix.** Fog IS configured
(`<fog attach="fog" args={['#F6F4EE', 24, 54]} />`, `DrawPage.tsx:200`) but
is invisible in practice: `near=24` is beyond almost everything that's ever
in frame (camera `maxDistance` is 18, the object tops out around 9-11 m, and
even the paper-sand surround item 4 adds is only r=26 — barely inside the
fog's own start distance). Retune to **`near≈10, far≈30`**: comfortably
beyond the object's own extent (so the lattice and timber never fog, which
would look like a rendering bug) but tight enough to soften the paper-sand
disc's outer edge and give real depth falloff into the vellum background —
the atmospheric cue the code clearly intended but currently can't reach.

**Counterargument:** a raking angle plus a real frustum is more surface area
to get wrong than the current safe, flat rig — if the shadow-camera bounds
are mistubed, part of the lattice can clip out of the shadow entirely, which
looks worse than a soft one. **Mitigation:** verify visually against the
*baked* geometry specifically (item 4's ground gives you a gravel apron edge
to check the shadow against), not just the empty lawn.

**What makes this look cheap:** an angle that's too steep (near-noon) kills
the shadow length and this whole item does nothing; too shallow and the
shadow runs off the paper-sand surround entirely and looks broken, not
dramatic. Tune against the actual bake, on the actual capture machine — GPU
shadow-map filtering varies.

---

## 2. Ambient occlusion — skip the real thing, take the cheap win

**Recommendation: do NOT add `@react-three/postprocessing` or `n8ao` for
tomorrow.** Neither is installed. `EffectComposer` adds a new dependency, a
full-screen render pass, and a real chance of a black canvas or a perf drop
on whatever machine records the capture, the night before a shoot. Given
items 1 and 4 (below) already put a raking shadow AND a color-differentiated
ground (gravel apron, dark soil beds) under the object, a real SSAO pass is
the last 10%, not the first 50%, and isn't worth the risk window.

**The cheap fake, in order of effort:**
1. **A second, tight `ContactShadows` pass.** The current one
   (`DrawPage.tsx:224-231`: `opacity 0.24, scale 22, blur 2.6, far 8`) is a
   soft, wide ambient shadow — good for grounding the whole object, bad at
   contact. Stack a second pass under it with `far≈1.3`, `blur≈0.6`,
   `opacity≈0.55`, tight `scale` (~4-5, just the footprint). Two
   `ContactShadows` render-to-texture passes, zero new dependencies, cost is
   one extra offscreen render — comfortably inside budget.
2. Item 4's gravel apron (`#d9d0b8`) and soil-bed roundels (`#5b4632`, nearly
   black) sitting directly under the feet already read as contact-darkening
   by color contrast alone, once wired in. This is doing real work for free.

**Counterargument:** a genuine AO pass would also darken the crevices
*between* lattice members, which neither fake touches — the tight
`ContactShadows` pass only darkens the ground plane, not member-to-member
occlusion. **Honest limit:** accept it. At 1440×900 in a 10 s clip, ground
contact is what a viewer's eye checks first; inter-member AO is a second
read this shot doesn't have time for anyway.

---

## 3. The scale figure — bake only, and here's exactly why

**Appears at bake, not in the soft phase.** The soft-phase ground stays bare
by design (item 4, Schumann et al. — loose ground invites editing). A fixed
human figure standing next to a still-forming, still-editable blob asserts a
commitment the design hasn't made yet, and undercuts that same rationale. The
figure is a "this is real now" signal — it belongs to the resolved moment,
entering alongside `<Folly />` and the resolved ground, ideally in the same
reveal window as item 5's dissolve.

**Geometry:** a flat silhouette — one `THREE.Shape` profile, extruded
~0.08-0.1 m thick (`ExtrudeGeometry`), not a full humanoid mesh. This is
cheaper AND lower-kitsch-risk than a rigged/skinned figure: flat reads as an
intentional device (an architectural entourage silhouette), a cheap 3D
person reads as SketchUp stock. Rounded silhouette head, no facial plane, no
clothing seams, no idle motion (static, no bone/morph animation at all).

**Material:** one matte material, neutral family — NOT pure black (a pure
black silhouette reads as a cutout/logo mark, too graphic for a scene with
real materials around it). Use a soft warm graphite, e.g. `#3a382f`,
`roughness 0.95`, `metalness 0` — close kin to `inkBlack` (`#17160F`,
`tailwind.config.js:45`) but soft enough to catch the rim light from item 1
and read as a body, not a decal.

**Height:** 1.78 m (inside the approved 1.75-1.8 m range).

**Position and orientation — the part that needs a rule, not a hardcoded
number.** The engine doesn't have an "entry" bearing — `footBearingsDeg`
(`engine/types.ts:188`) is just where the feet land for whatever two lines
get drawn, which varies with the live take. Hardcoding a position risks it
standing in an odd spot (or inside a member) if tomorrow's actual drag isn't
identical to rehearsal. Instead:
- At bake, read the camera's current azimuth the same way
  `CinematicCamera.tsx:88-89` already does (`camera.position` minus
  `controls.target`, projected to plan).
- Among `outputs.geometry.footBearingsDeg`, find the gap between two
  adjacent bearings that is (a) the widest gap and (b) within ±90° of the
  camera azimuth (i.e., facing roughly toward camera, not on the far side).
  Its angular midpoint is the entry bearing.
- Place the figure along that bearing at radius
  `max(planA, planB) + 0.9` (just outside the gravel apron, which sits at
  `planA/planB + 0.45` — `GardenContext.tsx:51`), at ground level.
- Rotate it to face **inward** — `rotation.y = bearing + 180°` — so the shot
  reads the figure's back or three-quarter profile walking toward the
  structure, never a face turned toward the lens. This is also what buys the
  "no face" rule its cover: nobody's looking for a face on a figure that's
  facing away.

**Counterargument:** the entry-detection rule adds real logic for a figure
that, in practice, only needs to work for whatever Daniel actually draws once
tomorrow — a hardcoded position tuned to the rehearsed take would be less
code. **Why the rule wins anyway:** it's maybe 15 extra lines over a
hardcoded position, and it's the difference between the figure surviving a
last-minute change of mind about which two lines to draw versus needing a
re-tune at the worst possible time.

**What makes this look cheap:** any hint of catalog entourage — a visible
gait pose, a bag, a silhouette recognizable as a stock asset — is instant
kitsch and loses Daniel on sight. Keep it as close to a blocked-out
architectural scale figure (the kind used in section drawings) as possible.

---

## 4. The ground resolves at bake — near-zero cost, do it

`GardenContext.tsx` already exists, already reads live geometry off the store
(`useDesign((s) => s.outputs.geometry)`, line 19), already sizes its lawn,
gravel apron, and soil-bed roundels to the real `planA`/`planB`/
`footBearingsDeg` — and is **already proven in production** at
`HeroScene.tsx:231`: `<GardenContext showNorthMarker={false} />`. `/draw`
just never mounts it. The fix, in shape, is one line:

```
{baked && <Folly />}
{baked && <GardenContext showNorthMarker={false} />}
```

**One real gotcha, and it will bite if skipped.** `DrawStage.tsx:166-180`
unconditionally renders its own flat lawn disc (`circleGeometry` r=6.5,
`#8fa06a`) — it's not gated on `resolved` today, only the arcs/soft-mesh are.
`GardenContext`'s own lawn mesh (`#8ea060`, sized to `lawnRadius`) sits at the
same y=0 plane. Two opaque coplanar disks at the same height is a textbook
**z-fighting flicker** — two near-identical greens fighting for the same
pixels, which is about as bad as a hero shot can look. Gate DrawStage's lawn
mesh on `!resolved` (wrap the existing `<mesh>` at `DrawStage.tsx:166` the
same way the arcs are already gated at line 197) so at bake `GardenContext`
is the sole ground.

**Keep the soft phase exactly as it is today** — the plain green disc, no
gravel, no beds. That's the correct half of Schumann et al. (CHI '96, 54
architects): loose ground invites editing, polished ground stops it. Same law
already cited for "bake is a resolution, not a jump-cut" — don't undercut it
by polishing the ground before the design is committed.

**Counterargument:** none really — this is existing, shipped code with a
known-good precedent. The only real cost is the z-fighting gate, which is
one boolean.

---

## 5. The bake transition — the money shot, spec'd, with the honest risk flagged

Right now bake is a jump-cut: `SurfaceMesh` (soft skin) unmounts, `Folly`
(lattice) mounts, one frame apart (`DrawPage.tsx:216-222`). If the lattice
instead **resolved out of the skin** — the skin dissolving as the members
fade up from the ground — that's the two seconds that best dramatizes the
whole thesis (a gesture becoming a real kit), and it's the one item on this
list that's actually **new work**, not wiring up something that already
exists.

**Mechanism — buildable in the time available, no new dependencies:**
1. **Keep `SurfaceMesh` mounted through the transition** instead of
   unmounting it the instant `baked` flips. Drive its material's `opacity`
   from a ref via `useFrame`, tweening 1 → 0 over ~800 ms, then unmount.
   `SurfaceMesh.tsx:93-102` already supports `transparent`/`opacity` (used
   today for the `ghost` prop) — this just needs the value to come from an
   animated ref instead of the static `ghost` boolean.
2. **Reveal `Folly` bottom-up via a shader discard, not a scale/fade of the
   whole mesh.** `Folly.tsx` merges all members of each stock (`c24Geo`,
   `lvlGeo`) into one `BufferGeometry` with world-space positions
   (`prismsToGeometry`, `Folly.tsx:34-85`) — that's exactly the data a
   height-based reveal needs for free. Attach an `onBeforeCompile` to each
   `meshStandardMaterial` that injects a fragment-shader discard:
   `if (vWorldPosition.y > uRevealY) discard;`, with `uRevealY` a uniform
   driven 0 → (structure peak height + margin) over the same ~800 ms-1 s
   window, on the same clock as the skin fade. On a roughly-radial dome this
   reads exactly as asked: the lattice filling in ring by ring from the
   ground.
3. Let this run **concurrent with** the camera's existing zoom-to-fit tween
   (`CinematicCamera.tsx`, 1.6 s, already fires on the geometry update that
   follows bake) rather than gating one behind the other — the skin
   dissolving while the camera glides to the new frame should read as one
   continuous confident move, not two sequential events. If the real capture
   reads busy rather than fluid, the fallback is a single named constant
   (e.g. `REVEAL_DELAY_MS`) to stagger the camera start by ~300 ms — cheap to
   add, don't build it preemptively.

**Effort and risk, said plainly:** this is genuinely more work than items 1
and 4 — a custom shader injection on a merged mesh is the riskiest single
piece in this spec. The known failure mode is a `discard` that doesn't
account for members whose bounding geometry crosses the reveal plane at an
angle — a diagonal strut can visually "pop" rather than sweep if its own
extent is large relative to the reveal step, since discard is per-fragment
with no soft edge. **If time runs short, the acceptable fallback is a flat
0 → 1 opacity fade on the whole lattice** (no discard, no bottom-up sweep) —
still removes the jump-cut, loses the "resolving" read, but is a fifteen-
minute change instead of a shader. **Do not ship a version that looks like a
glitch** — if the discard sweep isn't clean on the first pass, fall back
rather than iterate against the clock the night before a shoot.

---

## 6. The HUD — rejected as a target, and here's why explicitly

**Do not touch the HUD tonight.** A review proposed glassmorphism, blur,
elevation shadow, or glow on the cream cards / pills / price panel as a fix
for them reading "flat." The team lead rejected that outright and it stays
rejected in this spec: the flat cards, flat pills, and solid-black active
state (`DrawPage.tsx:273-346`) are the restrained, anti-Jarvis register the
whole product is built on, and any glass/blur/glow on a £17k architectural
tool is the single fastest way to read as a startup template rather than a
crafted one. See the governing principle at the top of this doc.

The steel-hub material tweak that would have lived here instead moved to
item 1, because it's actually a lighting/material-response question (an
`envMapIntensity` companion to the environment map), not a HUD question —
same "photography, not decoration" line, just applied to the object instead
of the chrome around it.

Explicitly **not worth it for tomorrow, HUD or otherwise**: chip hover/press
micro-animations (invisible in a silent clip cut from a live take), timber
roughness retuning (marginal next to the lighting change), any new HUD
chrome of any kind.

---

## Summary for Edward — build order

1. Light, shadow, and material response: rig retune + shadow frustum +
   `shadows="soft"` + fog retune + `Environment` for hub specular, all
   scoped to `DrawPage.tsx` (item 1).
2. Wire `GardenContext` in at bake + gate `DrawStage`'s lawn on `!resolved`
   (item 4) — do this alongside item 1 so you're tuning the shadow against
   the real ground, not the placeholder green disc.
3. Tight second `ContactShadows` pass (item 2).
4. Scale figure (item 3) — depends on item 4 for the apron radius it
   positions against.
5. Bake dissolve (item 5) — highest payoff, highest risk, budget the most
   time, have the flat-fade fallback ready.
6. HUD — out of scope. Do not touch (item 6).

Nothing here touches `src/engine/*`'s generation, pricing, or nesting logic,
and nothing here touches HUD chrome. Everything is render-layer: lights, an
environment map, one new mesh mount, one material tweak, one shader
injection with a named fallback.

## Verification note, for whoever drives this live tomorrow

If you script the interaction (rather than a real hand on the trackpad):
**synthetic JS `PointerEvent`s do not register with this app.** R3F's event
system appears to require trusted (real, OS-generated) input events —
scripted DOM dispatch silently no-ops rather than erroring, which is a
confusing failure mode if you don't know to expect it going in. Use a real-
input driver (an actual mouse/trackpad, or an automation tool that generates
OS-level input, not `element.dispatchEvent(new PointerEvent(...))`). This
cost real time on a prior verification pass — worth knowing before, not
after, you've spent twenty minutes wondering why a scripted drag draws
nothing.
