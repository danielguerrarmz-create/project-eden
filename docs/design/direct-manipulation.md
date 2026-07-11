# Direct-manipulation interaction spec — the studio

Author: Sai (Product Designer) · 2026-07-07 · Docs-only, no source touched.
Target surface: the studio configurator (`src/App.tsx`, `src/scene/Scene.tsx`,
`src/ui/ParamSlider.tsx`) — the warm-paper product system (`paper`/`ink`/`moss`/
`bloom`/`amber` tokens), **not** the field-color documentation layer. Keep that
boundary: nothing here touches `EngineSection`, `accentOlive`, or `inkNavy`.

## 0. Thesis, restated as a design constraint

Eden's whole pitch is that there is no catalogue: the grammar computes *one*
buildable pavilion from what you did. A slider is a UI convention for picking
a number. The number was never the point — the shape was. So the fix isn't
"nicer sliders," it's removing the number-picking layer entirely and letting
the user push on the thing itself. Every handle in this spec is a real point
on the actual generated geometry (an aperture point, an apex, a bay on the
real diagrid) — never a synthetic gizmo bolted on top. If it looks grabbable,
it has to be real geometry, or the whole "this is computed, not decorated"
claim breaks the first time someone touches it.

**Four real degrees of freedom, three handles** (species/year are categorical
choices, already pickers not sliders in `App.tsx` today — out of scope, no
change):

| Handle | Grabs | Drives | Existing engine hook |
|---|---|---|---|
| **Rim handle** | the aperture point on the eave edge (already drawn as an `AccentMark` in `SiteEnvelopeDiagram`) | `apertureDeg` (drag around the rim) **and** `footprintM2` (drag in/out along the radius) | `planDims()`, `feetCountFor()` — the ellipse never rotates, aperture is a bearing on a fixed-aspect ellipse (confirmed in `geometry.ts`); radial drag scales the whole ellipse, not just one edge |
| **Crown handle** | the apex, dead center at the top of the cap | `riseM` (vertical drag only) | `riseCapM()` — the live, footprint-dependent cap |
| **Density gauge** | a short hairline rail laid along one real bay near a foot, reusing the `DimensionLine` tick vocabulary | `strutSpacingM` | `deriveBounds().strutSpacingM` |

Grabbing the rim to make the canopy bigger, or pulling the crown up to raise
it, or sliding a gauge along the actual weave to loosen it, is a stronger
mental model than "footprint: 15.2 m²" on a rail beside the viewport — and it
matches how someone actually thinks about shaping a garden structure.

## 1. Rim handle — footprint + aperture, one grab, two axes

Sits exactly where the diagrams already put the aperture `AccentMark`: on the
eave edge, at the bearing the canopy currently opens toward. It is a real
point on the ellipse boundary, at r=1, θ=`apertureDeg`.

- **Tangential drag** (around the rim) → `apertureDeg`. The whole ellipse
  stays put; only the lift/aperture bearing moves, exactly like today's
  aperture slider — you're swinging the "mouth" of the canopy around the
  compass.
- **Radial drag** (toward/away from the plan center) → `footprintM2`. Because
  the plan aspect (`GRAMMAR.planAspect`, 1.25) is fixed and not user-facing,
  a radial pull scales the *entire* ellipse uniformly — both semi-axes grow
  together, area ∝ radius². Map screen drag distance to `√footprintM2` (not
  linear to area) so the handle's felt travel-to-growth rate stays even near
  the top of the range instead of ballooning.
- Decomposing a single grab into two axes is a known, legible pattern (any
  resize+rotate corner handle) — don't build two separate handles for this;
  one point, two guide cues, is calmer.

Guide ring (hover/drag only, not idle): a thin dashed ellipse at the current
plan boundary, with 16 small ticks at the 22.5° compass points (reusing
`compassName()` already in `ParamSlider.tsx`). Radial guide: two short
hairline arrows along the drag axis, in from and out to the current bound.

## 2. Crown handle — rise

A small hairline finial mark centered above the apex, offset a fixed few
centimeters above the actual crown ring so it never occludes the real
geometry. Vertical-drag only — deliberately the single most legible gesture
in this whole system (pull up = taller), so give it the least ambiguity of
the three.

Guide (hover/drag): a thin vertical dashed line from the apex up to the
grammar's live max for the *current* footprint (not the absolute 2.5 m
planning cap — the real, footprint-dependent `riseCapM()` value), so the
ceiling you can see is the ceiling you'll actually hit.

## 3. Density gauge — lattice spacing

The one DOF that isn't naturally "a point to pull," because strut spacing is
a uniform density, not a single node's position. Don't invent an abstract
slider for it — extend the diagram vocabulary that's already on the page.
Lay a short `DimensionLine`-style rail directly along one real bay near a
foot (pick the bay closest to camera at the current orbit angle, front-most,
so it's never on the far/hidden side of the mesh), with a small tab riding
it. Dragging the tab along the rail — closer to one tick = denser, further =
coarser — is literally "spread the weave apart with your finger," and it
borrows the exact hairline/mono-label grammar already used for read-only
annotations elsewhere in the app, so it reads as the same drawing coming
alive rather than a new UI element.

Label on the rail (mono, tabular, always visible at idle, matching
`AnnotationStrip`'s register): `lattice · 340mm`.

## 4. Affordance states

Everything is quiet until touched. No persistent glow, no pulsing, no drop
shadow ring — this system already has a restrained hairline vocabulary
(`hairline.tsx`'s 0.5–0.75px lines, small filled dots); handles are built
from the *same* primitives, just made interactive.

| State | Visual | Cursor |
|---|---|---|
| Idle | Small filled ink dot / finial / rail-tab, ~4–6px, same weight as the existing `AccentMark` — present, not shouting | `grab` on hover-capable devices |
| Hover | Scale to ~1.15×, guide ring/line/rail fades in (150ms), handle fill shifts from `ink` to `mossDeep` (the studio's one functional accent — same color already marking "engine:" and the commission button) | `grab` |
| Active (dragging) | Handle solid `mossDeep`, guide stays visible, a small mono tabular readout appears anchored *at the handle* (e.g. `18.4 m²`, `SSE · 154°`, `rise 2.31 m`, `lattice 340 mm`) — not in a fixed corner HUD, so attention never splits from where your hand is | `grabbing` |
| Disabled/unreachable | N/A — every handle is always draggable somewhere in its range; grammar limits are communicated as resistance (§5), never a disabled state |

One color carries all of "interactive, alive, being touched": `mossDeep`.
Nothing here introduces a new accent color, and nothing here is decorative —
it only appears at the point of contact.

## 5. Grammar limits as resistance, not errors

This is the one place the existing `ParamSlider` copy and logic must survive
completely intact — only the presentation moves from an HTML range input to
an in-scene drag. `deriveBounds()` and its `minRule`/`maxRule` strings are
untouched; Edward wires the same values to a different input surface.

- As a drag approaches a live bound, add rubber-band easing: motion past the
  true limit continues at a fraction of drag speed (≈1/4) up to a small
  fixed overtravel (a few px of screen space), the same overscroll feel as a
  native scroll view. It communicates "you can keep pulling, but it isn't
  going anywhere" physically, without a modal or a red flash.
- The instant a handle is within its bound's epsilon, the existing
  amber-dot + one-line caption pattern from `ParamSlider` appears, anchored
  beside the handle (not the old fixed control-rail position): e.g. `● crown
  curvature would exceed the flat-piece cutting tolerance at this
  footprint`. Same color (`amber`), same copy, same `aria-live="polite"`
  announcement — just relocated to the point of contact.
- On release, the handle eases back from the overtravel position to the true
  clamped value (200ms ease-out; instant under reduced motion).
- This is a fact, not an error: amber, never red/`bloom`. `bloom` stays
  reserved for species selection identity, so it doesn't get muddied into
  meaning "warning" in one place and "selected plant" in another.

## 6. Snapping

- **Aperture** (tangential drag on the rim handle): soft magnetic snap to the
  16-point compass, ±4° pull radius, using the same `COMPASS`/`compassName()`
  table already in `ParamSlider.tsx`. Ticks show on the guide ring only while
  dragging. A firm drag overrides the pull — this is a landing aid, not a
  hard step.
- **Footprint / rise**: no artificial snap points; the grammar bound is the
  only thing that ever stops the drag.
- **Lattice**: the gauge's live readout rounds for *display* only (to the
  nearest 5mm, matching the visual register of `cutListRoundingM` elsewhere
  in the engine) — the underlying continuous value driving the geometry is
  never stepped, so the mesh doesn't visibly "detent" while dragging.

## 7. Camera vs. drag disambiguation

Default state: `OrbitControls` behaves exactly as it does today (drag empty
canvas space = orbit, `enablePan={false}`, pinch/scroll = zoom, unchanged).

- Recommended implementation: build handles as **HTML overlay elements**
  projected each frame from their 3D world point (camera-project → screen
  x/y), not as raycast-hit 3D meshes. This buys three things at once: (1) a
  real, focusable, native `<input type="range">`-equivalent DOM node can sit
  invisibly under each visible handle graphic, which is what makes keyboard
  and screen-reader support fall out for free (§10) instead of being a
  second implementation; (2) hit-testing and a guaranteed 44px+ target don't
  depend on getting raycasting/occlusion right; (3) z-index/pointer-events
  gives clean control over "handle wins over orbit" without touching R3F's
  raycaster priority. The one thing to get right: hide/fade a handle whose
  3D point is currently occluded by the mesh (a simple depth check against
  the last render), so you can't "cheat-grab" a handle through the back of
  the canopy.
- On `pointerdown` on a handle: `stopPropagation`, set `orbitControls.enabled
  = false`, `setPointerCapture` so a fast drag that leaves the handle's
  visual bounds keeps tracking.
- On `pointerup`/`pointercancel`: release capture, `orbitControls.enabled =
  true` again.
- Empty-space drag is always orbit, exactly as today — no mode switch, no
  "edit mode" toggle to explain.

**Touch**: same handles, 48px minimum hit target (WCAG 2.5.5). Because touch
has no hover state, give handles a small drag-commit threshold (~8px of
initial movement) before committing to "this is a handle drag" vs. falling
through to orbit — the standard drag-threshold pattern, so a finger landing
near a handle while trying to orbit doesn't accidentally grab it. One-finger
elsewhere = orbit (unchanged); pan stays disabled everywhere, matching
today's config.

## 8. Live feedback — calm, not a HUD

- The per-handle readout during a drag (§4) is the *only* new always-visible
  numeric surface. It appears at the point of contact and disappears with
  the handle on release.
- `PricePanel` keeps doing exactly what it already does — it re-renders on
  every param change, ticking the fixed price live. No change needed there;
  it already IS the honesty readout, and it already sits beside the
  viewport, not on top of it.
- **Consolidate, don't add**: today's `StagePane` has an engine-strategy
  chip, a growth chip, a dimensions strip, and the year toggle — already a
  lot of surface. Retire the standalone bottom-left dimensions strip and
  replace it with a read-only mono spec strip (same visual register as
  `AnnotationStrip`) that shows all four numbers — footprint, rise, lattice,
  aperture — permanently, quietly, un-editable. This one move is also the
  strongest teaching device (§9): once the numbers on screen are no longer
  attached to anything draggable *except* the model itself, there's nowhere
  else to look for "how do I change this."
- Do not add a pulsing "computing…" indicator or a recompute flash. The
  numbers changing in front of you, in real time, as you drag, already reads
  as "this is computed" — an extra animation cue would be the Jarvis tell
  Daniel doesn't want.

## 9. Teaching the anti-slider point without a wall of text

No onboarding modal, no coachmark boxes, no tooltip walkthrough.

1. **Remove the option to be wrong.** Delete the four `ParamSlider` rows from
   the default control rail. Replace with the read-only spec strip (§8). If
   dragging the geometry is the *only* way to change the shape, nobody needs
   telling — the affordance is unambiguous by elimination, not by
   explanation.
2. **One micro-gesture whisper, once per session.** ~800ms after the stage
   settles on first visit this session (localStorage flag, same
   session-scoped pattern as `BowerIntro`'s `SESSION_KEY`), the crown handle
   nudges up 4px and eases back (600ms ease-out) — a "this moves" hint with
   no text at all. Skipped entirely under reduced motion or once already
   seen.
3. **One hover, one caption, ever.** The very first hover of *any* handle
   this session may show a 2–3 word mono caption near the cursor — `drag to
   shape` — fading after 1.5s, never shown again this session. Every hover
   after that is silent (§4's scale + guide ring only). Repeating even a
   one-line tooltip on every hover would itself become the wall of text over
   a real session.
4. The actual explanation ("You shape four things... A fabrication grammar
   clamps them...") already lives in prose on the splash's engine section —
   that's the one place words carry this idea. The studio should not repeat
   it.

## 10. Accessibility + fallbacks

- Each handle's underlying control is a real, focusable element (native
  range input or an ARIA `role="slider"` with `aria-valuenow/min/max/text`),
  reusing the exact `label`/`step`/format values already defined per-param
  in `ParamSlider.tsx`'s `SPECS` table. Arrow keys nudge by `step`, Home/End
  jump to the live bound's min/max, and the grammar caption announces via
  the same `aria-live="polite"` region already in use. Because the handle
  IS an HTML overlay control (§7), this isn't a parallel accessibility
  layer bolted on after the fact — it's the same element, skinned.
- Focus-visible: 2px solid `mossDeep` outline, 2px offset — the one accent
  used for "interactive" everywhere else in this spec, so focus, hover, and
  drag-active all read as the same state family.
- Reduced motion (`useReducedMotion`, already wired app-wide): the rubber-
  band overtravel and the ease-back-to-bound animation both collapse to an
  instant snap; the crown-handle onboarding nudge (§9.2) is skipped; the
  existing `autoRotate={!reducedMotion}` on `OrbitControls` is untouched.
- **No WebGL** (`NoWebGL` already exists in `Scene.tsx`): direct manipulation
  cannot render at all here. Do not delete `ParamSlider.tsx` — it becomes
  the explicit, permanent no-WebGL fallback: a plain accessible list of the
  same four controls, unchanged from today. This keeps the "never imply an
  unbuildable shape" guarantee and a fully keyboard-usable studio even with
  zero 3D, at zero extra design/engineering surface (the component already
  exists and already works).

## 11. Reset

A single mono text link, `reset shape`, 11px, `ink/60` opacity — same
register as the existing "grammar:" caption line, not a floating button.
Appears only when the current params differ from `ENVELOPE` defaults (dirty
detection); on click, all three handles tween back to their default
positions together (400ms ease, one synchronized tween — not three
independent animations racing each other). Lives beside the price panel,
where a "start over" instinct already looks.

## 12. Control cage — sketch

```
                         ‸  crown handle
                         │  (drag ↕ → rise)
                         │
                   ______|______
                .-'             '-.
              .'                   '.
             /                       \      ← eave edge (grammar-drawn ellipse,
            |            ×            |         fixed aspect, never rotates)
            |         plan center     |
             \                       /
              '.                   .' ●  ← rim handle, at the aperture point
                '-.._________..-''        (drag around rim → aperture bearing
                        |                   drag in/out → footprint area)
                        |
                   ▲    ▲    ▲   ← feet — engine OUTPUT (grammar-chosen
                  (3 or 4, not draggable — the count is a consequence,
                   not a control)

        |—•••••••○••••••—|   ← density gauge: hairline rail on one real bay
          lattice · 340mm       (drag tab along rail → strut spacing)
```

Rim handle close-up (hover/drag guide state):

```
              guide ring, dashed, ticked at
              the 16 compass points (drag only)
             ╭╌╌╌N╌╌╌╮
            ╌         ╌
           ╌   ↻ tangential   ╌
          ╎      = aperture     ╎
          ╎        ●╾╾╾ radial = footprint (in = smaller, out = bigger)
          ╎     (rim handle)    ╎
           ╌                   ╌
            ╌               ╌
             ╰╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯
```

## 13. Interaction storyboard

1. **Rest.** Pavilion sits on its ground plane, slowly auto-rotating (as
   today). Three quiet ink marks are visible on the geometry: a small dot at
   the crown, a small dot at the current aperture point on the rim, a short
   hairline rail near one foot. Spec strip reads the current numbers,
   un-editable, beside the live price.
2. **Grab.** Cursor moves over the rim handle: it scales up slightly, tints
   `mossDeep`, cursor becomes `grab`, a dashed compass-ticked guide ring
   fades in around the current plan boundary. Auto-rotate pauses.
3. **Drag.** Pointer goes down and moves outward and clockwise at once: the
   plan visibly grows (both semi-axes, aspect held) while the lift point
   swings from, say, SSE toward S. A small mono readout rides beside the
   handle: `19.6 m² · S · 178°`. The price panel ticks upward in real time.
   Two rows above the feet, the grammar quietly adds a fourth foot the
   moment the eave blank would exceed the cut-sheet length — narrated,
   exactly as today, by the amber caption anchored at the rim handle.
4. **Limit.** Continuing to drag outward past `maxFootprintM2`: the handle
   keeps moving but at a quarter speed, the amber caption appears (`the
   engineer-validated span family covers up to 18 m²...`), and letting go
   eases the handle back to the true 18 m² boundary.
5. **Release.** Pointer up: handle relaxes to its idle dot, guide ring fades
   out over 150ms, orbit controls re-enable, auto-rotate resumes after a
   short pause. The spec strip and price panel are already showing the
   settled numbers — nothing "catches up" after release, because nothing
   was ever decoupled from the live drag.

## 14. Scope note for Edward

- Files this spec expects to change: `src/scene/` (new handle components,
  likely `src/scene/handles/RimHandle.tsx`, `CrownHandle.tsx`,
  `DensityGauge.tsx`), `src/scene/Scene.tsx` (mount handles, wire
  `orbitControls.enabled` toggling), `src/App.tsx` (`ControlRail`: remove the
  four `ParamSlider` rows, add the read-only spec strip), `src/ui/
  ParamSlider.tsx` (kept, becomes the explicit no-WebGL fallback list — no
  behavior change needed there).
- `src/engine/grammar.ts`, `geometry.ts`, `types.ts`, `data/config.ts`: **zero
  changes**. This spec is entirely an input-mapping change; the engine
  doesn't know or care whether a number came from a range input or a 3D
  drag.

## Open questions for Daniel

- Rubber-band overtravel distance and rate (I've proposed ~1/4 speed, small
  fixed px cap) — worth a hands-on feel pass once built; numbers here are a
  starting point, not final tuning.
- Whether the density gauge should pick the front-most bay dynamically as
  the camera orbits, or stay pinned to one fixed bay regardless of view
  angle (I recommend dynamic/front-most so it's never grabbing something on
  the far, hidden side of the mesh, but it's a slightly more involved build
  than a fixed bay).
