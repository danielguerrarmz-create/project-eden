# 2026-07-17 — The pointer scheme: you can finally turn the object

Session 3c. The deferred session-3 task 1, plus three bugs that were going to bite during
filming. **Engine untouched** (`src/engine/*` has no diff). This is a `DrawPage` /
`DrawStage` / camera change, as specified.

**Branch `engine-draw`**, worktree `restless-egg/engine-session`, off `main`.
**Nothing pushed. `main` untouched.**

Gates, all green:
**`npx tsc --noEmit` = 0 · `npx vitest run` = 443/443 · `npm run build` clean.**
(Floor was 416; +27, none deleted.)

## The scheme, as shipped

| gesture | does | why this one |
|---|---|---|
| left-drag | the active tool (draw / lift / excavate) | the product's promise, kept literal |
| **right-drag** | **orbit, anywhere, on or off the object** | Rhino's convention |
| **space-hold + left-drag** | **orbit** | the trackpad's only path (see below) |
| wheel / two-finger drag | zoom | already worked; verified unbroken |

## Why it was broken (both halves verified before touching anything)

Two independent faults, either one alone would have killed orbit:

1. **`OrbitControls` binds RIGHT to PAN by default** (`OrbitControls.js:112`,
   `RIGHT: MOUSE.PAN`) and `enablePan={false}` was set, so the handler hits
   `if (this.enablePan === false) return` at line 1271. The right button drove a disabled
   action and did nothing.
2. **`DrawStage.down` claimed EVERY pointerdown**, any button, then `stopPropagation()` +
   `controls.enabled = false`.

So the diagnosis handed to me was right but understated. Measured in a real browser on the
old code: a right-drag meant to orbit **drew a line** (2 lines -> 3). Space+left drew
another (3 -> 4). Azimuth moved 0.00° in both cases. The user could not turn the object AND
every attempt to try vandalised the drawing.

`enablePan` stays **false** deliberately: there is one object, it is at the origin, and the
framing code owns the target. Panning would only let you lose the thing. RIGHT is now
rebound to `ROTATE` rather than pan being re-enabled.

## Verify — driven in a real Chrome, real mouse, 1440x900, at `#/draw`

Camera read off the live rig (a temporary probe hook, since stripped: no diff in
`CinematicCamera.tsx`). Re-run after stripping via pixel diff; all green, zero console errors.

**Job 1, before -> after:**

| | before | after |
|---|---|---|
| right-drag on object | **0.00° orbit, and drew a line (2->3)** | **-118.5° orbit, drew nothing (2->2)** |
| right-drag off object | 0.00° | -82.0° |
| space+left on object | **0.00°, and drew a line (3->4)** | **-109.4°, drew nothing (2->2)** |
| plain left-drag | drew | **still draws (2->3), orbits 0.000°** |
| wheel zoom | worked | **still works, d 6.10 -> 4.72** |

- Context menu suppressed on the canvas (`defaultPrevented: true`); right-drag no longer
  pops a menu mid-gesture.
- Cursor: `crosshair` with a tool live -> `grab` on space -> `grabbing` while dragging ->
  back to `crosshair` on release -> `default` once baked. System cursors only.
- Space released mid-session, drawing returns (2->3). Blur while space is held, drawing
  still returns (2->3) — the focus-loss guard.
- Hint reads `RIGHT-DRAG, OR HOLD SPACE, TO TURN IT`, once, on one line, fading at 6.5 s.
- Bake still yields £17,000; turntable still turns (+26.9°/2 s) and still stops dead on a
  right-drag (-0.01°/2 s).

**Job 2:** min polar was **exactly 0.00°** (dead plan). Now clamped to **30.00°**.
`maxPolarAngle` unchanged at 87.80°.

**Job 3:** bare click with excavate, before: **0 edits -> 1**, a real 0.35 m hole from a
click. After: **0 -> 0, area 14.2 -> 14.2 m²**. A real drag still cuts (0 -> 1, 14.2 -> 13.4).
`lift` did **not** have the same bug (a click yields dy=0, already guarded) — pinned anyway.

**Job 4, both fixed, both A/B'd against the old behaviour on the identical gesture:**

| | old | new |
|---|---|---|
| excavate dragged off-surface to frame corner | radius **2.72 m**, canopy 14.2 -> **3.8 m²** (**73.2% eaten**) | radius **1.43 m**, 14.2 -> 9.7 m² (31.7%) |
| lift released off the surface | **0 -> 0 edits (lost)** | **0 -> 1 (commits)** |

## Why the polar clamp is 30° and not 50°, which is the tempting mistake

Shot across the whole range. The **soft canopy** does not read from above ~50°: its eave is
edge-on and the skin is untextured beige, so 40° and 15° are equally a blob. That argues for
50°. **It would be the wrong fix.** The skin is illegible from above because it has no
detail — a material question, and Sai's — while the **baked lattice**, the thing actually on
camera, reads beautifully steep: at 25° the oculus, the diagrid and every node are crisp.
Clamping to 50° would spend the kit's best views paying for the skin's missing texture.

The real reason to clamp is that polar 0 is **degenerate, not merely unflattering**: the
view direction goes parallel to the rig's up vector, azimuth stops being defined, and the
object can spin under a gesture that only meant to tilt. It is also a trap with no handle.
30° deletes the singularity and costs nothing that measured well.

## Design calls I made (not Daniel's to arbitrate, but say so if wrong)

- **The hole halo now appears exactly when the drag becomes a hole**, and is the size of the
  hole. The old `Math.max(0.35, drag)` floor meant the ring lied under a sub-threshold
  gesture. No ring = no hole.
- **`onPointerLeave={up}` deleted from the lawn.** It committed the gesture the instant the
  cursor crossed the lawn's edge, so a stroke drawn to the far side landed short, at the rim.
  The window owns the release now.
- **An interrupted gesture is discarded, not committed** (`pointercancel` / window blur).
- The hint is **not** persisted to localStorage: a take has to be reproducible with a
  reload, the same reason "start over" returns to the opening pose.

## Left

- **Trackpad is NOT verified and cannot be**: two-finger drag is a `wheel` event, so it
  cannot be simulated with a mouse. Reasoned: two-finger drag -> wheel -> zoom (untouched,
  verified); pinch -> ctrl+wheel -> zoom (untouched); there is no right-button habit, so
  **space-hold is the trackpad's orbit and it is the only one**. It is wired to
  `PointerEvent.button === 0`, which a trackpad tap-drag reports, so it should hold — but
  Daniel should put a hand on a trackpad before filming.
- Selection/repair (session-3 task 2) untouched: undo is still a stack pop, so fixing the
  first line still loses everything after it.
- Everything else from the session-2 handoff's Left list stands (EC5, ring-count bug,
  pointy-corner feet, sub-bay holes).
- ESC to cancel a stroke in flight still does not exist (blur/pointercancel do cancel).
- `docs/design/2026-07-17-visual-impact-spec.md` and
  `docs/handoffs/2026-07-17-redlining-direction.md` appeared in this worktree from another
  agent and are deliberately **left uncommitted** — not mine to commit.

## Files

- `src/pages/draw/gesture.ts` — NEW. Pure gesture rules: `toolClaimsPointer`,
  `commitGesture`, `liftAmountM`, `holeRadiusM`, thresholds. Pure so the DOM-less suite can
  reach it (same reason as `framing.ts` / `priceCopy.ts`).
- `src/pages/draw/gesture.test.ts` — NEW. 27 tests, incl. the job-3 regression.
- `src/pages/draw/useSpaceHeld.ts` — NEW. Window keydown/keyup + blur/visibility guard.
- `src/pages/draw/DrawStage.tsx` — button gate, off-surface guard, window-level pointerup,
  honest halo.
- `src/pages/DrawPage.tsx` — `mouseButtons`, `minPolarAngle`, context menu, cursor, hint.

## Gotchas earned here

- **`innerText` returns CSS-TRANSFORMED text.** The HUD is `uppercase`, so it reads
  `14.2 M²`, never `14.2 m²`. A case-sensitive probe regex silently returned `undefined` and
  a passing assertion compared `undefined > undefined * 0.55`.
- **Fixed screen coordinates are meaningless after an orbit.** Two "failures" were the probe
  dragging where the lawn no longer was. Re-derive coordinates, or reload, before judging.
- **`enableDamping` coasts ~1.3° after pointerup.** An azimuth read immediately after a drag
  is not the resting value; a strict "did not orbit" assertion fails on the tail. Settle
  ~1.5 s first. (A plain left-drag orbits **0.000°**, so the check is still exact.)
- **`undo` pops an ARC when there are no edits**, which silently removed the canopy and made
  every subsequent trial in a loop meaningless (`area: null`). Reload between trials.
- **R3F fires pointermove for EVERY object under the ray**, not just the front one, so the
  lawn's handler fires alongside the canopy's on the same move (measured: 28 accepted, 28
  ignored). That is exactly why comparing `e.eventObject` to the press's target works.
