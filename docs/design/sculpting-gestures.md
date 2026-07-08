# Sculpting gestures — the form-finding shaping vocabulary

Author: Sai (Product Designer) · 2026-07-07 · Docs-only, no source touched.
Supersedes the handle-cage model in `docs/design/direct-manipulation.md` (§1–§3,
§12–§13 — three discrete handles on the grammar's four scalar params). That spec's
non-negotiables carry forward unchanged and are the spine of this one: buildability
routes through the grammar every frame, limits read as resistance not errors, one
accent color means "alive," no onboarding wall of text. What changes is the *nature*
of the grab: not three fixed points on a rig, but the membrane itself, anywhere you
touch it, settling under a real constrained-relaxation solve.

Target surface: `src/pages/ShapePage.tsx` (`#/shape`) and its scene layer
(`src/scene/CageHandles.tsx` → replaced by a new sculpt-handle system), which already
wear the **documentation-layer** tokens (`paperVellum` `#FBF9F3`, `inkBlack` `#17160F`,
`inkNavy` `#232C5E`, `accentOlive` `#ACC13A`, IBM Plex Mono) and the `hairline.tsx`
drafting vocabulary (`DimensionLine`, `LeaderCallout`, `AccentMark`). Sculpting is a
graduation of this exact page, not a new visual system — reuse continues.

## 0. What changed and why it changes the gesture set

The old model: four scalar knobs (footprint, rise, aperture, spacing), three of them
wearing a handle. Grab a point, it moves one number, the grammar clamps the number,
the handle sticks. Legible, but it can only ever produce *variations on one shape
family* — an ellipse with a lift and a height. It cannot carve an oculus, cantilever
an edge, or root a second leg, because there is no number for those things.

The new model: the shell is a **relaxation mesh**, not a parameter bundle. You push
or pull *regions* of it; a real-time constrained solver (Edward/Senku's form-finding
core) relaxes the whole membrane toward the nearest shape that is simultaneously (a)
close to what you asked for and (b) inside the buildable family — panel curvature,
span, node spacing, headroom, all still hard grammar limits, just applied per-region
instead of per-scalar. The three old handles were a rig glued to the shape. This is
the shape itself, obeying rules you can feel.

This is a strictly harder authenticity claim than the old spec's, and the payoff is
proportional: Gaudí's hanging-chain models, Frei Otto's soap-film and hanging-cloth
studies, Heinz Isler's inverted membranes — every canonical form-finding method *is*
this gesture, materialized. Sculpting a gridshell by pushing and letting it settle
under constraint is not a metaphor borrowed from clay. It is, historically, the most
literal way this exact structural type has always been designed. The stiffness
language in §4 is not flavor text — it is what a fabric or a chain net actually does
under your hand.

## 1. The core gesture: grab-and-pull with a falloff radius

The one motion everything else is a variant of. Press anywhere on the shell surface
and drag; a circular **influence radius** centered on the contact point moves with
your cursor, and every mesh point inside it is pulled toward the drag target with a
weight that falls off from 1.0 at the center to 0 at the radius edge (smoothstep, not
linear — a linear falloff creases the membrane at the radius boundary; smoothstep
keeps the transition tangent-continuous, which is the difference between "sculpted"
and "dented"). The solver relaxes every other point in the mesh to keep it a
continuous, tensioned, buildable surface.

```
   before                          mid-drag                        settled
                                                                  
  ─────────────                  ─────╮   ╭─────                ──────╮  ╭──────
           ╲                          ╲ ↑ ╱                            ╲╱
            ╲___________              ●   ↑pull              ─────╮  ╱╲  ╱╲
                                    (falloff ring,                  ╲╱  ╲╱
                                     dashed, shown                (ripple settles
                                     only while active)             smoothly outward)
```

- **Contact point**: any point on the visible shell surface, found by raycast against
  the live mesh (not a fixed handle set — this is the headline change from the cage
  model). No pre-registered "grabbable node" list; the whole membrane is grabbable.
- **Falloff radius**: shown only during hover/drag, a thin dashed ink circle (same
  0.5px/`opacity 0.65` weight as `ExtensionLine` in `hairline.tsx`) projected onto the
  surface, following the cursor before you commit to a drag so you always know how
  much of the shell a pull will move before you move it.
- **Pressure**: on devices with pressure/force input (trackpad force click, stylus,
  or a synthetic "hold longer = more" ramp on plain mouse/touch — see §2 mapping),
  pressure scales the radius outward and the pull depth, not the *rate* — a harder
  press touches more of the shell, gently, rather than punching the same patch
  further. This mirrors real clay: more of your hand on the material, not a faster
  finger.
- **Direction**: drag toward the camera-facing normal at the contact point = pull the
  region outward (raise/extend); drag away = push it inward (carve). The mapping is
  always relative to the *local surface normal*, not a fixed world axis — pulling
  "up" on a point that's already near-vertical (a cantilevered edge) extends it
  further along its own lean, not straight up. This is what keeps §5 (root a column)
  and §6 (extend a cantilever) feeling like the same underlying gesture at different
  surface angles, rather than separate tools.

## 2. Gesture vocabulary

Six named gestures. All six are the same underlying grab-and-pull primitive (§1) with
a different **contact context** (where you grab, and what's already there) — this is
deliberate: six behaviors, one motor pattern, so the vocabulary stays learnable in one
sitting instead of six unrelated tools.

### 2.1 Push-in — carve negative space / an oculus

**Grab**: shell surface, away from any edge. **Drag**: inward (away from the local
outward normal), past a depth threshold. Past that threshold the solver doesn't just
dimple the surface, it opens a **through-hole**, ringed by the same eave-blank grammar
that bounds the main perimeter (a cut oculus edge is still curved sheet stock cut to
`maxComponentLengthM`, so the ring gets its own mini blank-count, exactly like
`feetCountFor` adds a foot). Below the depth threshold, it's a dimple / skylight
recess, not a hole — the through-cut is a distinct, deliberate commitment, not
something you can trigger by accident mid-drag.

```
   push in, shallow              push in, past threshold
   (dimple / recess)             (oculus opens)

    ────╮   ╭────                ────╮       ╭────
         ╲ ╱                          ╲     ╱
          ▽  (surface dips,             ○   (through-hole,
              stays closed)             │    ringed edge,
                                        mono label appears:
                                        "oculus · Ø0.6m")
```

Storyboard: hover shows the falloff ring as normal. Drag inward — the readout that
rides beside the cursor (§8, same anchored-at-the-point-of-contact pattern as the old
spec's live handle readout) reads `carving · 0.18 m` while shallow. Cross the
threshold and it re-labels to `oculus · Ø0.6 m`, the ring edge resolves with a
hairline `DimensionLine` diameter callout, and a short settle animation (150ms) shows
the freed material relaxing away from the new edge. Release: the readout fades, the
oculus stays, dimensionable like any other feature in the spec strip.

### 2.2 Pull-out / pinch — extend or cantilever an edge

**Grab**: at or very near a free (eave) edge. **Drag**: outward along the surface
tangent at that edge. This is the same outward pull as §1, but because the contact
point is already at the boundary rather than mid-membrane, the falloff has nothing to
pull *toward* it on the outside — so the solver responds by growing the edge itself:
new mesh is added at the perimeter and the whole local patch leans out, cantilevering
past the last row of feet the further you pull, until the grammar's cantilever-ratio
limit (moment at the last support vs. member depth — same family of rule as
`maxRisePerHalfSpan`, applied to horizontal reach instead of vertical rise) resists
you (§4).

**Pinch** (two-point variant, trackpad/touch only): two simultaneous contact points
near the same edge, dragged apart — narrows the local eave curvature between them,
visually "pinching" the edge inward at that span, the inverse-width move a single
outward pull can't express cleanly. Mouse-only fallback: hold a modifier
(documented, not required — pinch is an enhancement, not the only way to narrow an
edge; a single pull-in per §1 at that edge achieves the same net shape more slowly).

```
   free edge, at rest         pull outward along tangent        past cantilever limit

   ───────────╮               ───────────╮                     ───────────╮
              │                          ╲___                             ╲___resistance
              │  (eave, feet              ╲   ╲___pull                     ╲   ●(rubber-band,
              │   below, out                ●                                    §4)
              │   of frame)          (edge grows, leans          amber caption: "cantilever
                                       out past support)           beyond the last foot would
                                                                    exceed the flat-piece
                                                                    moment limit here"
```

### 2.3 Root a new column/leg — drag down to the ground plane

**Grab**: shell surface (mid-span works; doesn't have to be near an existing foot).
**Drag**: straight down, toward the ground plane, past a commit threshold (roughly
the same "this is deliberate" distance as the oculus depth threshold in §2.1, so a
stray downward tug while sculpting the general form doesn't accidentally root a leg).
Once committed, a leg grows from the contact point to the ground, and — the important
part — the solver **re-runs the whole-shell relaxation** with the new support in
place, so the surrounding shell visibly settles and redistributes onto the new
column exactly as a real membrane would when you slide a prop under it. This is the
gesture that most directly demonstrates "one pull ripples through the whole
membrane" (§9): everyone watching the demo sees the entire canopy shift, not just
the touched point.

```
   grab mid-span, drag down            past threshold: leg roots, shell resettles

        ─────╮   ╭─────                    ─────╮   ╭─────
              ╲   ╱                              ╲ ╱ ╲
               ╲ ╱                                 ╲   (whole shell subtly
                ●                                    ▼    re-relaxes around
                ↓ (drag continues,                   │     the new support —
                   ghost leg preview,                │     visible ripple,
                   dashed, follows)                       not just local dip)
```

New legs obey the same `minFeet`/`maxFeet` family and foot-spacing rules the grammar
already enforces on the perimeter (§5 of `direct-manipulation.md`'s note: "the count
is a consequence, not a control" carries forward exactly — you can *propose* a new
leg by dragging one down, but the solver may refuse to root it if it would violate
minimum foot spacing, giving the same rubber-band resistance instead of planting it).

### 2.4 Press-to-flatten — relax a region toward planar

**Grab**: any patch of visibly curved shell. **Gesture**: press and hold (no drag
distance required — a stationary press, distinguishing it from every other gesture
here, all of which are drag-based) with a small downward "flattening" easing that
relaxes the local curvature toward planar over the hold duration, like smoothing a
crease out of cloth with a flat palm rather than a fingertip. Release at any point to
stop; the flattening is continuous and reversible mid-hold (a quick tap-and-release
barely moves it, a full 1–2s hold flattens further, up to the grammar's own minimum
curvature — you cannot press a region fully flat if it's load-bearing span the
grammar requires some rise on, same resistance-not-error treatment as §4).

This is the one gesture that reads as a distinct *hand shape* (flat palm vs.
fingertip pull) rather than a drag vector, which is appropriate — it's doing a
categorically different thing (removing curvature) than the other five (adding or
redirecting it).

### 2.5 Twist the aperture — rotate the opening

**Grab**: the aperture edge itself (the lifted opening the canopy faces, inherited
directly from the old rim-handle concept in `direct-manipulation.md` §1 — this is the
one gesture that keeps a near-literal handle, because "which way does the mouth of
the canopy face" is inherently a single bearing, not a region to relax). **Drag**:
tangentially around the shell's rim, exactly as the old rim handle's tangential axis
worked, with the same 16-point soft compass snap (±4° pull, `COMPASS`/`compassName()`
reused) and the same `S · 178°`-style anchored readout. The difference from the old
spec is only that this now visibly *twists* the whole aperture geometry (the opening
has depth and a curved reveal, not just a bearing on a flat ellipse), so the settle
after release shows the reveal's curvature following the new bearing, not just a
number changing.

### 2.6 Falloff and pressure as one indicator, always

Every gesture above shares one on-canvas indicator so a user only has to learn to
read it once: a dashed ink ring at the current falloff radius (or, for the aperture
twist, a dashed compass arc), present during hover *and* drag, filled at low opacity
(`accentOlive` at `0.10` alpha) inside the boundary only while actively dragging, so
"how much of the shell is under my hand right now" is always answerable at a glance
without a legend.

## 3. What's grabbable — the affordance surface

Unlike the cage model (a fixed enumerable set: `HANDLE_KINDS = [rim, crown,
footprintEast, footprintWest]`), the sculptable surface is continuous. That is the
whole point, but it means affordance has to be communicated differently — nothing can
sit there pre-lit as "here are your four dots."

- **Idle state**: the shell renders exactly as it does today, no dots, no markers, no
  hint geometry. This is deliberate — see §2.6 of `direct-manipulation.md` ("quiet
  until touched") pushed one step further: there is nothing *to* mark, because every
  point qualifies.
- **Hover** (cursor over any point of the mesh, no button down): the falloff ring
  fades in centered on the raycast hit point (150ms), cursor becomes `grab`. This is
  the sole affordance signal, and it has to do more work than the old spec's per-
  handle hover state, because it's the only thing telling you "yes, this counts."
- **Edge proximity** (within ~2 falloff-radii of a free eave edge): the ring picks up
  a secondary thin outward arrow glyph hinting "pull here to extend" — the one
  contextual hint in the system, because §2.2's cantilever gesture is otherwise
  indistinguishable from §1's generic pull until you're already mid-drag.
- **Downward drag mid-span** (within the first ~threshold/2 of travel, before the
  column-root commits): a faint dashed ghost leg previews where a leg *would* land if
  you kept going, so the commit threshold in §2.3 isn't a cliff-edge surprise.
- **Active drag**: handled per-gesture in §2; the shared thread is the anchored mono
  readout riding beside the contact point (never a fixed-position HUD — carried
  forward unchanged from `direct-manipulation.md` §4/§8's "attention never splits
  from where your hand is" rule).

## 4. Fabrication limits as stiffness — "clay with a grain"

This is the load-bearing metaphor for the whole system and it has to be authentic,
not decorative. A real form-found shell — hanging chain, soap film, fabric under
tension — has *anisotropic* resistance: it gives easily along some directions and
stiffens hard along others, and that stiffness pattern is exactly what makes the
converged shape buildable (a chain net naturally finds pure-tension/compression
paths; that's the whole reason Gaudí used one). So "the grammar clamps you" should not
read as a wall — it should read as **material grain**:

- **Soft give, early**: for the first portion of any drag's travel, resistance is
  near zero — the membrane moves freely, matching real cloth/clay's initial slack.
- **Progressive stiffening**: as a proposed local deformation approaches a grammar
  limit (panel curvature tolerance, cantilever moment, minimum node spacing, headroom,
  the crown-curvature-caps-rise relationship already in `grammar.ts`'s `riseCapM`),
  drag response eases from 1:1 toward the same ≈1/4-speed rubber-band the old spec
  specified for its scalar handles (§5 there) — but now evaluated *per mesh region*
  each frame against the live solve, not once against a single scalar bound.
- **Directional**: pulling a point along a direction the current shell form already
  wants to go (e.g., extending an edge further along its existing lean) meets less
  resistance than pulling it against its grain (e.g., trying to yank a compression
  member into tension geometry) — this is the literal "grain" in "clay with a grain,"
  and it is not invented flavor: it falls directly out of running the real solver's
  energy gradient at the contact point rather than a synthetic distance-to-limit
  function. Cheapest correct implementation: resistance ∝ the solver's own local
  stiffness/residual at that node, already computed each relaxation step — nothing
  new to author, just surfaced.
- **The moment of contact with a hard limit**: identical presentation to
  `direct-manipulation.md` §5 — amber dot, one-line grammar caption, anchored at the
  point of contact, `aria-live="polite"`, e.g. `● this span would exceed the
  flat-piece curvature tolerance here`. Amber, never red/`bloom` (reserved for
  species identity elsewhere in the app, per that spec's existing rule). On release
  past a limit, ease back to the nearest valid settled state over 200ms (instant
  under reduced motion).
- **Never a disabled state, never a wall**: exactly the old rule, extended — there is
  no gesture that is ever simply refused. Push hard enough against the grain and you
  feel it stiffen asymptotically; you never hit a flat "no."

## 5. Shell settling — showing the solve, not hiding it

The relaxation is not instant, and that is a feature, not latency to hide. Real
form-finding is iterative (soap film settles, hanging chain sways to rest); showing a
brief, damped settle after each release is the single most honest "this is computed"
signal in the whole system — stronger than any UI chrome, because it's the actual
math resolving in front of you.

- **During drag**: the solver runs a fast, low-iteration relaxation every frame (or
  every few frames, whatever the engine spike settles on) so the shell visibly
  follows the cursor with the "soft give / progressive stiffen" feel of §4 — not a
  rigid handle snapping to a proposed value, but a continuous material response.
- **On release**: 2–4 additional relaxation passes run over ~150–250ms with light
  damping (critically-damped, not bouncy — a bouncy settle reads as a physics toy,
  not an engineering solve; Daniel's anti-Jarvis line runs directly through motion
  choices like this one). The mesh visibly stops moving on its own once settled; no
  indefinite idle jiggle.
- **No "computing…" spinner, no recompute flash.** Identical rule to
  `direct-manipulation.md` §8: the geometry changing in front of you, continuously,
  already reads as computed. A loading affordance on top of a real-time solve would
  be redundant chrome — the Jarvis tell.
- **Ripple legibility**: because one pull can move the whole membrane (most visibly
  in §2.3's column-root), the settle pass should complete fastest near the contact
  point and slowest at the far side of the shell — a real damped-wave falloff, not a
  uniform fade — so a viewer's eye can actually track "this one action moved that far
  edge" rather than seeing an undifferentiated shimmer.

## 6. Camera-orbit vs. sculpt disambiguation

Carried forward from `direct-manipulation.md` §7 with one addition made necessary by
continuous-surface grabbing (vs. a handful of enumerable handle hit-targets):

- Empty space (raycast misses the mesh entirely) is always orbit — unchanged.
- **On-mesh but non-committal contact** (a tap/click with near-zero drag distance) is
  treated as neither sculpt nor orbit — it's a no-op selection tap. Only a drag past
  a small commit threshold (~6–8px, matching the old spec's touch threshold) engages
  sculpt mode and pauses `OrbitControls`. This matters more here than in the cage
  model because *any* point on the mesh is now a valid grab start, so "I meant to
  orbit and grazed the shell" has to fail gracefully into orbit, not into an
  accidental micro-pull.
- Implementation continuity: keep the old spec's HTML-overlay-vs-raycast reasoning
  under review, but note the tradeoff has flipped. The cage model favored HTML
  overlays because there were only 3–4 discrete points to project. A continuous
  surface-grab gesture is naturally a raycast-against-the-live-mesh problem (there is
  no small fixed set of DOM nodes to place) — so this system is expected to be R3F
  raycast-driven, with keyboard/screen-reader access provided by the discrete
  fallback control set in §10 rather than an invisible DOM node under every possible
  contact point (there is no way to enumerate "every possible contact point" as
  focusable elements). This is flagged as an open engineering question for Edward,
  not a design decision — the a11y guarantee in §10 has to hold regardless of which
  way this goes.
- `pointerdown` past commit → `stopPropagation`, `orbitControls.enabled = false`,
  `setPointerCapture`. `pointerup`/`pointercancel` → release, re-enable orbit,
  settle pass runs (§5) independent of orbit state.

## 7. Touch vs. mouse

- **Touch**: single-finger drag on the mesh past the commit threshold = sculpt
  (same threshold logic as §6). Single-finger drag on empty space = orbit, unchanged.
  Two-finger gestures reserved for camera zoom/pinch-to-scale-view (existing) *except*
  the two-point pinch variant in §2.2, which only engages when both contact points
  land on the mesh near the same free edge simultaneously — camera pinch (both points
  moving apart in open space or over the mesh interior, not near an edge) takes
  priority whenever that condition isn't met, so there's no ambiguity between "zoom
  out" and "pinch this edge narrower."
- **Falloff radius on touch**: fixed at a slightly larger default than the mouse
  radius (fingers are imprecise; compensate with radius, not with a harder-to-hit
  smaller target), with the pressure-scales-radius behavior from §1 driven by
  synthetic pressure (a hold-to-ramp, since most touch hardware has no true force
  sensing) rather than requiring 3D Touch/stylus hardware.
- **Minimum hit affordance**: even though there's no fixed handle to size, the
  *effective* grab area at any hover point must clear 44px screen-space at the
  falloff ring's center (WCAG 2.5.5) — practically, this just means the raycast
  tolerance around the literal cursor pixel should have a small forgiving radius on
  touch, matching the drag-commit-threshold pattern already used for orbit
  disambiguation.

## 8. Live feedback

- Per-gesture anchored readout (§2's per-section descriptions) is the only new
  always-visible numeric surface during a drag, exactly as in
  `direct-manipulation.md` §8 — appears at the point of contact, disappears on
  release.
- The read-only spec strip pattern from that spec (§8, §9.1 — footprint/rise/
  lattice/aperture, permanently visible, un-editable) still applies, but the field
  set grows to include whatever the form-finding core exposes as summary numbers for
  a freehand shape (likely: footprint, peak rise, max cantilever reach, oculus count
  + diameter if any, leg count) — final field list depends on what Edward's spike
  actually outputs; flagged as a coordination point once the engine's output shape
  is known, not a design blocker.
- `PricePanel` keeps ticking live off whatever the engine returns, unchanged in
  principle from the old spec — sculpting still routes through the same "every drag
  is a real param/mesh change → real recompute → real price" loop.

## 9. Cohesion — how one pull reads as a membrane, not five features

The six gestures in §2 have to feel like one material responding six ways, not six
separate modes with a mode switch. Three concrete devices carry that:

1. **One motor pattern.** Every gesture is grab + drag (only §2.4's press-hold
   breaks the pattern, and it's the one gesture doing something categorically
   different — removing curvature rather than adding/redirecting it, so it earning a
   different hand shape is itself a legibility cue, not an inconsistency).
2. **One indicator vocabulary.** The dashed falloff ring/arc (§2.6) is present for
   every gesture, in the same weight, same fade timing, same fill behavior. A user
   never has to learn "this gesture shows a ring, that one shows a box."
3. **One settle behavior.** Every gesture, on release, triggers the same damped
   relaxation pass (§5) with the same easing curve. Carving an oculus and rooting a
   column look like different actions with the same physical aftermath — which is
   exactly what they are (the same continuum solver settling from two different
   pokes).
4. **One accent.** `accentOlive` is still the single color that means "interactive /
   being touched / alive," reused from the falloff ring fill through the amber-only
   exception for hard grammar limits (§4) — no new color introduced anywhere in this
   spec.

## 10. Accessibility and reduced-motion fallback

Continuous-surface sculpting cannot be made keyboard-navigable point-by-point (there
is no finite list of "points" to Tab through) — so, honoring
`direct-manipulation.md` §10's non-negotiable ("a fully keyboard-usable studio even
with zero 3D, at zero extra design/engineering surface"), the fallback here is not a
keyboard-driven version of sculpting itself. It is a **discrete parametric control
set** standing in for the same underlying design space:

- The engine's summary outputs (§8's field list — footprint, rise, cantilever reach,
  oculus, legs) each get one keyboard-operable stepper/slider control, in a collapsed
  panel reachable by a skip-link ("shape controls" — same register as
  `ParamSlider.tsx`'s existing accessible list). This is materially the same solution
  the old spec already committed to keeping `ParamSlider.tsx` alive as "the explicit,
  permanent no-WebGL fallback" — extended to also serve as the no-pointer-sculpting
  fallback, since both cases share the same requirement (a discrete, accessible proxy
  for a continuous/visual system).
- Each stepper announces grammar resistance the same way as a mouse drag hitting a
  limit: the amber caption, `aria-live="polite"`, same copy voice as §4.
- **No WebGL**: unchanged from the old spec — falls all the way back to the
  accessible control list, the sculpting canvas simply doesn't render.
- **Reduced motion** (`useReducedMotion`, app-wide): the settle pass (§5) collapses
  to an instant snap to the resolved geometry (no damped animation), the falloff
  ring's fade-in becomes instant, the column-root ghost-leg preview (§3) still shows
  (it's informational, not decorative motion) but without any easing on its opacity,
  and `autoRotate` stays off during any active interaction exactly as today.
- Focus-visible states on every fallback control: 2px solid `accentOlive` outline,
  2px offset — matching the "focus, hover, and drag-active read as the same state
  family" rule from the old spec, translated to this token set.

## 11. Reset

Unchanged in spirit from `direct-manipulation.md` §11: a single mono text link
(`reset shape`, matching the register already used for `how the engine works →` in
`ShapePage.tsx`), visible only when the current mesh differs from the last-committed
buildable default, easing the whole shell back over one synchronized settle pass
(not per-region animations racing each other) rather than jumping.

## Open questions for Daniel / Edward / Senku

- **Commit thresholds** (oculus depth, column-root drag distance, drag-vs-orbit pixel
  threshold) are proposed starting points, not tuned values — they need a hands-on
  pass once the solver is real and has actual frame-time characteristics.
- **Raycast-vs-overlay** for hit-testing (§6) is flagged as Edward's call, not mine —
  I've stated the a11y guarantee that has to hold either way.
- **Multi-touch pinch (§2.2)** is proposed as an enhancement; confirm it's in scope
  for the spike or should be documented but deferred to a later pass, since it's the
  one gesture requiring genuine multi-touch handling rather than single-pointer drag.
- **Summary field list (§8)** depends on what shape Edward's form-finding output
  actually takes (mesh-only vs. mesh + derived scalars) — needs a short sync once the
  spike has a real output shape to react to.
