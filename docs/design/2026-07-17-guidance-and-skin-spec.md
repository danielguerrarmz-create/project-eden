# 2026-07-17 — Left-rail guidance, and the skin

Two specs from Daniel today: more direction on the left side of `#/draw`, and the soft
canopy's mesh "needs to be better looking." Both answered here, concrete enough to build
without a second conversation. Read `docs/handoffs/2026-07-17-redlining-direction.md` and
`docs/handoffs/2026-07-17-draw-visual-impact.md` first — this doc does not repeat their
diagnoses, it acts on them.

Nothing here is built. This is a spec for Edward.

---

## SPEC 1 — left-side guidance

### The four questions, answered

**Does guidance live in the nudge panel or a new rail? A new rail, not the nudge panel.**
`read.nudges` (`fromDrawing.ts:178-292`, rendered `DrawPage.tsx:522-541`) is the engine's
voice about *the drawing* — what it read, what it held, what it offers — and it only
speaks post-bake. Operating instructions ("scroll to zoom") are not a reading of the
design; folding them into that register would make the nudge panel say two unrelated
kinds of thing in one voice, and it would mean guidance never appears until after bake,
which is backwards — a first-timer needs it *while* sculpting, not after. Keep two voices,
each already-established: the nudge panel stays engine-about-your-drawing; the rail is
new, and plain.

**Progressive or upfront? Progressive, and reuse the mechanism that already exists rather
than inventing a second one.** `DrawPage.tsx:208-216` already has this pattern for exactly
one line (the orbit hint): appear once, at a trigger, hold, fade, never persisted to
localStorage. Extend it to two lines instead of building a tutorial overlay — which was
already correctly ruled out. Do not state all the moves up front; that IS the tutorial
overlay in a thinner suit.

**What happens on camera? Fades on either of two triggers, whichever comes first: a 6.5 s
hold (matching the existing timeout, so a static shot still clears), or the instant the
viewer actually orbits or zooms.** The second is the important one and it is not new
plumbing — `OrbitControls`'s `onStart` (`DrawPage.tsx:447`) already fires only on genuine
pointer/wheel input, never on the programmatic camera moves the framing effects make
(confirmed: that is the whole reason `onStart` was already safe to wire to
`setTurntable(false)`). Add `if (hintUp) setHintUp(false)` to the same handler. This is the
"obeyed, so it goes away" rule from `fromDrawing.ts:205-207` — written for the engine's
nudges — applied to UI chrome instead: the guidance answers to being followed, not to a
clock alone. A confident take clears the frame the moment the viewer acts, which is exactly
the case that matters most for filming.

**Is `slice(0, 3)` still right? Yes, leave it — it's a different, already-flagged problem.**
That's the post-bake nudge panel and the audit-trail gap the redlining doc already named
(`2026-07-17-redlining-direction.md`, "the nudge log's slice(0, 3)..."). It has no
relationship to the pre-bake guidance rail; solving it belongs to whoever builds redlining,
not this pass.

### What ships

**1. Move the existing orbit hint into a new left rail, and add one line to it.**

Delete `DrawPage.tsx:472-486` (the bottom-center hint block). In its place, a left-edge,
vertically centered, left-aligned block, same typographic family as everything else on
this screen — no new visual language:

```tsx
{hintShown && !baked && (
  <div
    className={`pointer-events-none absolute left-4 top-1/2 max-w-[22ch] -translate-y-1/2 space-y-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/40 transition-opacity duration-700 ${
      hintUp ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <p>right-drag, or hold space, to turn it</p>
    <p className="delay-500">scroll to zoom</p>
  </div>
)}
```

Copy, exact:
- `right-drag, or hold space, to turn it` — unchanged, proven, just relocated.
- `scroll to zoom` — new. Direction-agnostic on purpose (covers in and out, and covers
  trackpad pinch, which already arrives as a `wheel` event per the redlining doc's own
  navigation section) rather than "scroll to get closer," which is only half true.

Trigger stays exactly as coded today (`DrawPage.tsx:210-216`): `arcs.length >= 2 && !baked`,
`hintShown`/`hintUp` state unchanged, 6.5 s timeout unchanged. Only add the `onStart`
early-dismiss (above) and the re-arm fix (below).

**2. Fix the lift hint's copy — the actual bidirectionality fix, and it's one line.**

`DrawPage.tsx:89`:
```diff
- { id: 'lift', label: 'lift', hint: 'press on it and pull up' },
+ { id: 'lift', label: 'lift', hint: 'drag up to raise it, down to lower it' },
```

This is the higher-leverage fix of the two, and it should ship even if the rail is
deferred. The rail's two lines are things you can survive not knowing (you can still make
something). Not knowing lift goes both ways means a huge share of what the tool can do
(`gesture.ts:44`, `LIFT_MIN_M = -1.2`) is invisible, and it's shown continuously, at
top-center, the entire time the lift tool is selected — fixing the words in place beats
teaching it once and hoping it's remembered.

**3. Re-arm on "start over."** `hintShown`/`hintUp` today never reset once true, even
across `DrawPage.tsx:646-654`'s "start over" (I checked: it's a plain `useState`, and no
effect clears it). That's a latent bug independent of this spec — a second take filmed in
the same session, without a reload, silently loses the guidance the first take got. Fix it
in the same effect that already resets the camera on a fresh lawn (`DrawPage.tsx:282-287`):

```diff
  useEffect(() => {
    if (arcs.length === 0 && !baked) {
      setFraming(HOME);
      setTurntable(false);
+     setHintShown(false);
+     setHintUp(false);
    }
  }, [arcs.length, baked]);
```

### Deliberately not added, and why

- **Nothing for "second line grows it."** Already taught, correctly and transiently, by
  the existing caption at `arcs.length === 1` ("one more, crossing it"). Duplicating it
  onto the rail is noise for no gain.
- **Nothing for excavate.** Only lift was flagged as having a hidden mode; excavate's hint
  ("press on it and drag out a hole") already states its one behavior fully. Don't invent a
  gap to fill the rail with a third line.
- **No dismiss-during-active-drag special case.** The existing hint doesn't special-case a
  drag in progress and there's no evidence it needs to; the gesture halos already own that
  moment visually.

### Needs Daniel — flagged, not decided here

**Should the "lift" tool be relabeled?** The team lead's brief names the tool's own name as
part of why nobody discovers the down direction — "lift" only says one direction. My
recommendation: rename the pill label to **`sculpt`** (`DrawPage.tsx`'s `TOOLS[1].label`
only — the internal `Tool = 'lift'` id and `Edit.kind: 'lift'` stay untouched, so this is a
pure copy change with zero engine risk). "Sculpt" doesn't imply a direction, and it's
already the product's own word for the phase (`DrawPage.tsx:1-34`'s header comment: "keep
going... lift raises it under your hand... the thing stays SOFT the whole time"). But a
toolbar label is brand-visible and worth Daniel's own eye before it ships — the hint-copy
fix above should go regardless of this call.

---

## SPEC 2 — the skin

### The constraint, restated precisely

Better-looking, not more-finished. The redlining doc's own citations (Schumann, Strothotte,
Raab & Laser, CHI '96; Tohidi et al., CHI 2006) are about non-photorealistic rendering
specifically — sketch-style reads as open to revision, photoreal reads as final. That is
not a constraint I have to work around; it's a design brief. **The fix below is itself an
NPR technique** — contour hachure over a wash, the literal vocabulary of an architect's
study sketch — so it satisfies "better AND unfinished" by construction rather than by
restraint.

### The recommendation: two shader-side ink passes, zero bundle cost

Both are `onBeforeCompile` injections into `SurfaceMesh`'s existing
`meshStandardMaterial` — the exact pattern already proven in this codebase at
`src/scene/revealShader.ts` (used by `Folly.tsx`). No new dependency, no texture asset: the
entire cost is a few hundred bytes of GLSL string literal, which does not touch the `three`
chunk's 1058 kB against the 1100 kB ceiling. This is the only lane that fits the 42 kB of
headroom without spending it.

**New file: `src/scene/skinShader.ts`**, mirroring `revealShader.ts`'s shape exactly (a
`VERTEX_HEAD`/`VERTEX_BODY`, fragment injection strings, an `apply*` function, a
`customProgramCacheKey`).

**1. Contour ink — the direct fix for "illegible from above."** A thin dark line every
`0.25 m` of world height. This is the real fix the visual-impact handoff named ("Texture on
the skin would be the real fix") and it specifically answers the top-down failure: a smooth
vertex-color gradient reads as nothing from directly above, but contour rings read as
elevation from *any* angle, including straight down — it's literally a topographic map, the
oldest trick for conveying 3D form in a 2D/near-orthographic view. `0.25 m` is not
arbitrary: it's the standard interval architects draw contours at on a site section, and
against this engine's own height range (`ENVELOPE.riseM`: 1.9-2.5 m, plus local lift down to
-1.2 m and up to +1.6 m relative — so a practical field of roughly 0-3 m) it produces 8-12
rings across the whole model, dense enough to read as texture, sparse enough to stay quiet.

```glsl
// vertex — world Y, computed the same way revealShader.ts already does it for the
// reveal sweep (modelMatrix, not local Y, so this is correct even if SurfaceMesh
// ever gets a transform it doesn't have today).
varying float vSkinWorldY;
...
#include <begin_vertex>
vec4 skinWp = modelMatrix * vec4( transformed, 1.0 );
vSkinWorldY = skinWp.y;
```

```glsl
// fragment — injected AFTER `#include <color_fragment>` (that's where
// diffuseColor is set from the existing lo/hi vertex-color gradient; this
// composites the ink on top of it, so lighting still shades the ink like real
// material, not like a HUD overlay glowing over the lit result).
float ph = vSkinWorldY / uContourStepM;              // uContourStepM = 0.25
float phFrac = abs( fract( ph ) - 0.5 ) * 2.0;         // 0 at the ring, 1 mid-band
float lineW = fwidth( ph ) * uContourLinePx;           // uContourLinePx = 1.1 (screen px)
float contourLine = 1.0 - smoothstep( 0.0, lineW, phFrac );
diffuseColor.rgb = mix( diffuseColor.rgb, uContourColor, contourLine * uContourOpacity );
```
`uContourColor = #4a3d29` (a darkened version of the skin's own `lo` color, `#8f7c56` —
ink, not a new hue). `uContourOpacity = 0.30`. `fwidth` keeps the line a constant *screen*
width regardless of camera distance — without it, lines thicken on a pulled-back shot and
vanish on a close orbit, which reads as a broken texture rather than a drawn line.

**2. Fresnel rim — the fix for "the eave goes edge-on."** A grazing-angle darkening,
strongest exactly where the surface normal turns away from the camera — which is precisely
the eave, seen from above. This inverts the liability: the thing that made the eave
disappear (it's edge-on to the view) is the same condition a Fresnel term detects, so the
one region the surface's own shading gives up on is the one region this rule marks darkest.

```glsl
// fragment — injected AFTER `#include <normal_fragment_maps>`, not after
// color_fragment: `normal` is not finalized until here (color_fragment runs
// BEFORE the normal chunk in three's standard chunk order). Verify this
// against three@0.169.0's actual meshphysical_frag chunk order before wiring
// — print `shader.fragmentShader` once and confirm — the same diligence
// revealShader.ts's own header already asks for.
vec3 skinViewDir = normalize( vViewPosition );          // already points toward camera
float fresnel = pow( 1.0 - max( dot( normalize( normal ), skinViewDir ), 0.0 ), uFresnelPower );
diffuseColor.rgb = mix( diffuseColor.rgb, uFresnelColor, fresnel * uFresnelOpacity );
```
`uFresnelColor = #3a2f1d`, `uFresnelOpacity = 0.45`, `uFresnelPower = 2.5`.

**Apply it the same way `Folly.tsx:114-122` applies the reveal** — a ref callback on the
material, called once:

```tsx
const setMat = useCallback((m: THREE.MeshStandardMaterial | null) => {
  matRef.current = m;
  if (m) applySkinInk(m); // idempotent internally, or guard with a ref flag
}, []);
// <meshStandardMaterial ref={setMat} .../>
```

**WebGL1 fallback note:** `ui/webgl.ts` tries `webgl2` first but falls back to `webgl`/
`experimental-webgl`. `fwidth` is core GLSL ES 3.00 (free on the WebGL2 path) but needs the
`OES_standard_derivatives` extension on WebGL1. Set
`material.extensions = { derivatives: true, ... }` inside `applySkinInk` so the fallback
path doesn't silently render flat lines (or nothing).

### Why this doesn't fight the anti-Jarvis rule

Both passes modify `diffuseColor.rgb` — the material's own albedo, read and shaded by the
existing lighting like any other surface detail. Neither is emissive, neither is a
screen-space overlay, neither reads as glow. It's ink on vellum under the rig's own key
light, which is the whole point: the product's material identity gets more legible, not
more electronic.

### The camera follow-on — recommend, don't rule

`MIN_POLAR` (`DrawPage.tsx:128`, currently `Math.PI / 6`, 30°) exists specifically because
the soft skin is unreadable above roughly 50° elevation. Once the skin reads from directly
above (which contour rings are built to do), the clamp is very likely tighter than it needs
to be. I'm not giving Edward a new number to plug in blind: **re-run the same measurement
pass that produced the current comment** (`DrawPage.tsx:109-127`, shot across the range)
after the shader ships, and set `MIN_POLAR` to whatever that pass actually supports —
plausibly as low as 12-15°, clear of the true singularity at 0°. This is exactly the kind
of "worth real money on camera" unlock the material fix was for, but it should be set from
a photographed measurement, not a guess, the same way 30° itself was derived.

### Optional, P2 — flagged, not specced for this pass

A slight spatial jitter on the contour phase (hand-drawn wobble instead of
machine-precision rings) would push the sketch quality further. **If it's ever built: the
jitter must be a pure function of object-space position, never of time or frame count.**
A slow turntable sampling per-frame noise reads as a flickering, unstabilized texture on
camera — the one failure mode this entire brief exists to prevent. Cheap, deterministic,
position-only noise (e.g. a few sine terms of `vSkinWorldY` and plan angle) or nothing; no
`iTime`-style input, ever.

---

## Open for Daniel

1. Rename the lift tool's pill label to "sculpt"? (Spec 1, "Needs Daniel.") The copy fix to
   the hint text should ship either way.
2. Once the skin ships, re-measure and relax `MIN_POLAR` — a build/verify step, not a design
   call, but flagging so it doesn't get forgotten as a follow-on.

## Files referenced (none edited)

- `src/pages/DrawPage.tsx` — `TOOLS` (:82-91), `MIN_POLAR` (:128), the hint state and effect
  (:208-216), the bottom hint JSX (:472-486), the start-over effect (:282-287), `OrbitControls`
  and `onStart` (:420-448)
- `src/pages/draw/gesture.ts` — `LIFT_MIN_M`/`LIFT_MAX_M` (:44-45)
- `src/pages/draw/SurfaceMesh.tsx` — the `lo`/`hi` vertex-color gradient (:64-66, :84), the
  material and `matRef` (:45, :113-128)
- `src/scene/revealShader.ts` — the `onBeforeCompile` pattern this spec reuses
- `src/scene/Folly.tsx` — the ref-callback application pattern (:114-122)
- `src/data/config.ts` — `ENVELOPE.riseM`, `GRAMMAR.pdHeightCapM`/`minHeadroomM` (:52-54, :174)
- `src/engine/fromDrawing.ts` — the `read`/`held`/`offered` registers and the "reads as a
  validator" rule (:205-207)
