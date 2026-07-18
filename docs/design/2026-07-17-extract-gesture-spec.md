# 2026-07-17 — the extract gesture: grabbing a hole's rim

Daniel: "I want to add an extract movement where we pinch or move objects and extend them...
Looking at our splash page, the main aperture in the ceiling feels like it was first
excavated and then pulled on."

Nothing here is built. Concrete enough for Edward to build without a second conversation.
Do not edit source from this doc.

---

## READ FIRST — `apertureDeg` has no grammar rule, and this gesture can reach it

Senku's literature pass (`docs/research/2026-07-17-discrete-timber-assembly.md`) found it,
the team lead connected it to this spec, and I verified it directly: `grammar.ts:111-116`,
`deriveBounds()`'s `apertureDeg` bound is `{ min: 0, max: 359, minRule: '', maxRule: '' }`.
Confirmed — the only slider in the whole grammar with no fabrication or structural rule
attached, and it's already hand-draggable TODAY, in two places that predate this spec
entirely: a raw slider in `/studio` (`App.tsx:119`) and a direct-manipulation handle
(`directManip.ts:105`, `apertureFromPlanXZ`). `apertureDeg` governs how much of the eave
perimeter is open versus grounded — Senku's read, which I agree with: "exactly the kind of
parameter that would govern unsupported cantilever span... and it is the one slider in the
whole grammar that isn't constrained by anything."

**Does my collar gesture make this worse?** Only in one specific case, and it's worth being
precise about which one. A collar anchored to a hole entirely INTERIOR to the drawn plan
(Daniel's own stated reference — a skylight in the middle of a continuous canopy) has nothing
to do with this gap; it's held up by the field all around it, the same way `pushpull` already
is. The real overlap is a hole that reaches the plan's own outer boundary: excavating there
already removes real eave material with zero check TODAY (the pre-existing `hole` tool has
this problem independent of anything I'm adding — `generateGeometry`'s excavation pass,
`geometry.ts:570-589`, prunes members with no downstream structural check at all). My collar
gesture doesn't create that gap; it makes it more likely to matter, because pulling a lip at a
hole that touches the edge is functionally "hand-authoring an open aperture with a raised,
cantilevered rim" — the exact capability `apertureDeg`'s own missing rule was already meant
to govern, arrived at from a different direction.

**I am not inventing a threshold.** Senku's doc says so explicitly: no defensible number
exists in what she could source (the real candidate, Weinand/Robeller's EPFL IBOIS work on
variable dihedral-angle joints, is unread — lab-summary only). Inventing a degree or a
cantilever-span figure and presenting it as a structural rule would be the same error the
team lead already named for pricing: tuning a number to make the demo look solved. I'm not
doing that. What I'm shipping instead, and what I'm explicitly NOT shipping, is below —
**"Eave-reach: what this spec ships, and what it deliberately doesn't."** Read that before
the rest.

---

## First: a correction, not a confirmation

The team lead's brief asked me to verify, not assume, that "the aperture Daniel is pointing
at" is `eaveHeightAtM`'s single hardcoded lobe (`geometry.ts:151-155`, the eave's
lift-toward-one-bearing field, generalizable the same way `footPullAt` already is a
sum of user-drawn Gaussians). **I don't think it is, and the difference changes what gets
built.**

`eaveHeightAtM`'s aperture is a compass BEARING — the direction the canopy opens toward,
computed from the widest gap between feet (`fromDrawing.ts:241`, `"Widest gap between
contacts faces {apertureDeg}°, so the canopy opens there"`). It lives at the EAVE, near the
ground, and it doesn't perforate anything — it just makes the canopy's edge taller in one
direction. Nothing about it reads as "in the ceiling."

What Daniel is describing — round, at the crown, looks like it was cut and its lip pulled up
— is `GRAMMAR.crownFraction` (`config.ts:75`, `0.22`): the radius inside which the diagrid
simply doesn't exist (`geometry.ts:293`, `r0 = GRAMMAR.crownFraction`). That's the real
oculus, literally in the ceiling, and it's what the hero shot's opening top-down camera pose
(`HeroScene.tsx:37`, `CAM_TOP`, looking straight down the Y axis) is staring into. It's also
a plain scalar constant today, not a field at all — no bearing dependence, same radius on
every design, and (I checked `capProfile` at r=0.22: ≈0.96 of the crown-to-eave range) the
height field itself doesn't bump up there. **The "pulled" look Daniel sees is almost
certainly the crown ring PIECE** — a real depth-180mm timber blank (`geometry.ts:552`,
`ringPieces(0, 'crown', ...)`), visibly thicker than the diagrid struts around it, sitting at
a hole's edge. The material reads as gathered up because the ring member has real section
depth, not because the surface bulges.

**So the target isn't "generalize `eaveHeightAtM`."** It's a genuinely new capability: a
hand-drawn hole whose rim can be grabbed and pulled into a raised lip — which the soft
height field (a flat single surface with no member depth at all) has no way to fake with
section thickness, and has to actually model as a bump. The underlying INSIGHT in the team
lead's framing is still right and still the spine of this spec — the engine already proved
the pattern once (`footPullAt`: one hardcoded thing became a sum of user-authored things) —
it's just pointed at a different hardcoded thing than the one named.

---

## The four rulings

### 1. What IS the gesture — no new tool, no new mode

**Location decides meaning, not a toolbar pill.** When `sculpt` (id `pushpull`) is the active
tool and a press lands within a tolerance band of an EXISTING hole's rim, that same
press-drag-release becomes a collar grab instead of an ordinary point push. Anywhere else on
the skin, it's the point push it already is. This is the identical design law the redlining
doc already settled for scribble vs. trace — "no mode-select before drawing, the SHAPE (here:
the LOCATION) of the stroke is the meaning" — applied one level down, and it costs the
toolbar nothing: DRAW / SCULPT / EXCAVATE stays three pills.

This also matches Daniel's own two-step description exactly: excavate makes the hole (the
existing `hole` tool, untouched), then a *separate* grab-and-pull — sculpt, aimed at the
rim — raises it. Two gestures, one already existing, one new discrimination inside a tool
that already existed.

### 2. Where it lives in the seam — a third `Edit.kind`, and the actual cost

A third kind, `'collar'`, not a flag bolted onto `'pushpull'`. Reason: `pushpull`'s falloff
is a function of distance from a POINT; a collar's is a function of distance from a RING (the
hole's own rim). Different shapes need named, separate math, the same way `hole` and
`pushpull` already don't share a branch.

**The actual spend, checked against every real consumer of `Edit.kind`** (grepped the whole
`src/` tree — there are exactly two):
- `surface.ts:283` (`surfaceHeight`'s edit loop) — needs a new branch. ~8 lines.
- `surface.ts:298` (`isHole`) — **needs nothing.** It already reads `if (e.kind !== 'hole')
  continue`, so a `collar` edit is correctly ignored as a mask source with zero changes.
- `DrawStage.tsx`'s `DrapedRing` — already being touched for the preview (below); no
  additional cost beyond that.
- `exportProject.ts` — doesn't switch on `Edit.kind` at all; nothing to update.

That's the whole ledger. No change to `isHole`, no change to `shapeFromDrawing.ts` (see
"inherited free" below), no new field on `Edit` beyond widening the `kind` union — `at` and
`radiusM` are reused, just re-meaning them as **the anchor hole's** `at`/`radiusM`, not the
press point. Document that reuse with a comment; it's the one place a reader could get
confused.

### 3. Legibility — inherit `drape.ts`, don't reinvent it

The collar preview is `DrapedRing` (`DrawStage.tsx:106-151`), already draped on the skin,
already broken correctly across hole boundaries, unchanged. The only new move: while a collar
grab is in flight, feed it a **synthetic surface with the pending collar edit already
summed in** (`{ arcs, edits: [...edits, pendingCollarEdit] }`), the same trick
`previewY`/`previewHeightM` already use for the point-pushpull's floating sphere
(`DrawStage.tsx:289-299`, `drape.ts:161`, `"asks the engine rather than reimplementing
it"`). Because the ring is drawn exactly at the hole's own radius — where the collar's
falloff is at its peak — the draped ring rises with the drag for free, inheriting the real
cap and the real summing with any other edits nearby. No new geometry code.

Color: reuse `pushpull`'s existing `#7d8e5b`, not a third hue. A collar IS a pushpull
operation; the visual grammar doc already ruled "reuse what exists, don't invent a confidence
indicator" and the same logic applies to inventing a tool-identity color.

### 4. The form rule — the hard one

`surfaceHeight`'s edits loop (`surface.ts:280-288`) sums independent local lobes, and a
lobe today is shaped by distance from a POINT: `(1 - (d/radiusM)²)²`. A collar needs the
same falloff SHAPE, applied to distance from a RING instead of a point — the natural
generalization, not a new mechanism:

```ts
// surface.ts — new module-level constant, next to the edits loop, not exported
// (pure field math, never touched by the pointer layer — same reasoning that
// keeps `sigma` inside footPullAt in geometry.ts private).
const COLLAR_WIDTH_M = 0.55;

// inside surfaceHeight's edit loop, alongside the existing pushpull branch:
for (const e of input.edits) {
  if (e.kind === 'pushpull') {
    const d = Math.hypot(p.x - e.at.x, p.y - e.at.y);
    if (d >= e.radiusM) continue;
    const u = d / e.radiusM;
    h += (e.amountM ?? 0) * (1 - u * u) ** 2;
    continue;
  }
  if (e.kind === 'collar') {
    // `e.at`/`e.radiusM` are the ANCHOR HOLE's, not a press point — distance
    // from the hole's own rim circle, not from its centre.
    const dCentre = Math.hypot(p.x - e.at.x, p.y - e.at.y);
    const dRing = Math.abs(dCentre - e.radiusM);
    if (dRing >= COLLAR_WIDTH_M) continue;
    const u = dRing / COLLAR_WIDTH_M;
    h += Math.max(0, e.amountM ?? 0) * (1 - u * u) ** 2; // pull only, see below
    continue;
  }
}
```

**Why this needs no reconciliation with `isHole`, rather than a special case.** The mask
(`isHole`) and the field (`surfaceHeight`) are already orthogonal by design — the file's own
header says so ("Excavation is a mask, not a dent"). The collar's ring straddles the hole's
boundary: the HALF of the raised ring that falls inside `radiusM` still gets masked away by
`isHole` (invisible, unrendered, as it should be — nothing should try to "fill" the hole),
and the half that falls OUTSIDE is what actually renders — which is exactly a lip, for free,
because the two systems were never coupled to begin with. This is the payoff of the height
field's own architecture, not a workaround.

**Pull-only, on purpose, for this pass.** `Math.max(0, e.amountM ?? 0)` — a downward drag on
a rim commits nothing (falls under the same `MIN_PUSHPULL_AMOUNT_M` "a click is a click"
gate the point tool already uses). A sinking collar (a moat around a hole) is a real, and
plausibly good, capability — but it's a different one Daniel didn't ask for, and shipping it
unasked is exactly the kind of scope creep the redlining doc's own two-marks-not-six
discipline argues against. Flag it, don't build it.

**`COLLAR_WIDTH_M = 0.55` is a starting number, not a ruling.** It's proportioned against
`PUSHPULL_RADIUS_M = 1.5` (tighter, because a lip should read as a rim, not a second dome)
but it hasn't been seen rendered. Watch it first on a small hole (radius near
`MIN_HOLE_RADIUS_M = 0.35`) — at that size the ring's inner half (masked) and outer half
(visible) are comparable to the hole's own radius, and it may read as a fat donut rather than
a thin lip. Tighten if so; I'm not inventing a size-scaled formula without having seen one
render first.

### 5. Eave-reach — what this spec ships, and what it deliberately doesn't

The team lead asked for a third answer: what does the engine SAY when a pulled aperture goes
too far? The honest answer has two tiers, and only one of them is mine to ship today.

**Ships: an honest, zero-invented-numbers detector and a spoken nudge. No clamp. No felt
resistance.**

A hole "reaches the eave" if any point on its own rim sits at or past the plan's own faired
boundary at that bearing — a closed-form containment test against geometry the engine already
computes (`fairedRadius`, `footprintHull`, `planCentre` all exist in `surface.ts` today), not
a structural claim. It reuses the exact ring-sampling idiom `drapeRing` already uses for
rendering:

```ts
// surface.ts — pure, testable, no new geometric primitives.
/**
 * Does an excavated hole touch the plan's own drawn boundary? Sampled around
 * the hole's own rim, checked against the SAME faired radius the skin and the
 * baked net already agree on. This answers one narrow, exact question: does
 * this hole touch the edge of the drawn plan. It says nothing about whether
 * what's left standing there can carry a load — that is a different, unsolved
 * question, and the nudge below says so rather than pretending otherwise.
 */
export function holeReachesEaveM(input: SurfaceInput, hole: Edit, stations = 24): boolean {
  if (hole.kind !== 'hole' || input.arcs.length < 2) return false;
  const centre = planCentre(input.arcs);
  const hull = footprintHull(input.arcs);
  if (hull.length < 3) return false;
  const radiusAt = fairedRadius(hull, centre);
  for (let i = 0; i < stations; i++) {
    const t = (i / stations) * Math.PI * 2;
    const dx = hole.at.x + Math.sin(t) * hole.radiusM - centre.x;
    const dy = hole.at.y + Math.cos(t) * hole.radiusM - centre.y;
    if (Math.hypot(dx, dy) >= radiusAt(Math.atan2(dx, dy)) - 1e-6) return true;
  }
  return false;
}
```

`readDrawing` (`fromDrawing.ts`) doesn't know about `edits` today — it only ever sees
`spines`. **I'm not importing `Edit` into `fromDrawing.ts` to fix that**: `surface.ts` already
imports FROM `fromDrawing.ts` (`apertureFromFeet`, `bearingDeg`, `convexHull`), so the reverse
import would be circular. Instead `Drawing` gains one optional primitive, computed by the one
place that already sees both layers:

```ts
// fromDrawing.ts — Drawing gains one field, a plain boolean, no Edit import:
export interface Drawing {
  // ...existing fields...
  /** True if any excavated hole reaches the plan's own boundary. Computed by
   *  the caller (DrawPage), which is the one place that already has both the
   *  drawing and the edits — keeps this file decoupled from surface.ts. */
  holesReachEave?: boolean;
}
```

```ts
// DrawPage.tsx — one line at the call site:
const read = useMemo(
  () => readDrawing({
    spines: arcs,
    outline: undefined,
    holesReachEave: edits.some((e) => e.kind === 'hole' && holeReachesEaveM(surface, e)),
  }),
  [arcs, edits, surface],
);
```

```ts
// fromDrawing.ts — one new nudge, register 'read': it's a true statement
// about what you did, not a correction and not a suggestion, the same
// register "your lines enclose 21 m², it stands exactly as drawn" uses.
if (d.holesReachEave) {
  nudges.push({
    kind: 'read',
    text: `This hole reaches the edge. Nothing here checks how much unsupported eave that leaves standing. Real gap, not a rule.`,
  });
}
```

**Does not ship: any numeric clamp, any felt resistance, on this axis.** The redlining doc's
own resistance rule reserves felt stiffness for physical facts with a real number behind them
(the height cap IS `pdHeightCapM`, a planning-law figure). There is no equivalent figure here
— Senku checked and said so plainly. Applying resistance anyway would be worse than a silent
clamp, not better: force is felt before it can be explained, and "felt and spoken must arrive
in the same frame" is the same doc's own rule. A spring with no real number behind it is
lying with your hand instead of your mouth.

**What this doesn't do, named so it isn't mistaken for solved:** it doesn't stop a hole from
reaching the eave, doesn't stop a collar from being pulled there, and doesn't check whether
the REST of the structure still stands once it does. It only makes the gap SPEAK instead of
staying silent. That is a real, if narrow, improvement — narrating the gap where the product
previously said nothing at all still moves it toward its own stated philosophy — but it is
not the fix Senku's finding is actually asking for.

**Escalated, not solved here — see "Flagged for Daniel" below.** Closing `apertureDeg`'s
actual gap (a real fabrication or structural bound on how much eave can be open) is an
engineering task, not a design-spec task: it needs either a sourced number (the unread
Weinand/Robeller EPFL IBOIS dihedral-angle work is the most promising real lead Senku found)
or an explicit ruling from Daniel that the honest-nudge-only version above is the permanent
answer, not a stopgap. That task is bigger than this gesture, predates it, and shouldn't be
quietly folded in here as if a design doc closed it.

---

## Exact implementation

**`src/pages/draw/gesture.ts`** — new pure function, screen/pointer layer:

```ts
/**
 * How close a press has to land to an existing hole's rim to grab it instead
 * of starting an ordinary point push. Generous on purpose — missing a grab and
 * silently placing a decoy point-pushpull nearby is a worse failure than
 * occasionally eating a press that was meant to land just past the rim.
 * Verify against a small (~0.4 m) hole once built; tighten if it steals clicks.
 */
export const COLLAR_GRAB_TOLERANCE_M = 0.4;

/** Is `p` near an existing hole's rim? Returns the hole being grabbed, or null. */
export function nearestHoleRim(
  edits: Edit[],
  p: Pt,
  toleranceM: number = COLLAR_GRAB_TOLERANCE_M,
): { at: Pt; radiusM: number } | null {
  let best: { at: Pt; radiusM: number } | null = null;
  let bestD = Infinity;
  for (const e of edits) {
    if (e.kind !== 'hole') continue;
    const d = Math.abs(Math.hypot(p.x - e.at.x, p.y - e.at.y) - e.radiusM);
    if (d <= toleranceM && d < bestD) {
      bestD = d;
      best = { at: e.at, radiusM: e.radiusM };
    }
  }
  return best;
}
```

`commitGesture` gains one optional param and the pushpull branch splits in two:

```ts
export function commitGesture({
  tool, from, to, amountM, collarAnchor,
}: {
  tool: Tool;
  from: Pt | null;
  to: Pt | null;
  amountM: number;
  /** Set when the press landed on an existing hole's rim (pushpull only). */
  collarAnchor?: { at: Pt; radiusM: number } | null;
}): Commit {
  if (!from || !to) return null;
  if (tool === 'draw') { /* unchanged */ }

  if (tool === 'pushpull') {
    if (collarAnchor) {
      return amountM > MIN_PUSHPULL_AMOUNT_M
        ? { kind: 'edit', edit: { kind: 'collar', at: collarAnchor.at, radiusM: collarAnchor.radiusM, amountM } }
        : null;
    }
    return Math.abs(amountM) > MIN_PUSHPULL_AMOUNT_M
      ? { kind: 'edit', edit: { kind: 'pushpull', at: from, radiusM: PUSHPULL_RADIUS_M, amountM } }
      : null;
  }
  /* hole branch unchanged */
}
```

**`src/engine/surface.ts`** — widen `Edit.kind` to `'pushpull' | 'hole' | 'collar'`; the loop
change above; the new `holeReachesEaveM` export (eave-reach section above).

**`src/engine/fromDrawing.ts`** — `Drawing` gains `holesReachEave?: boolean`; `readDrawing`
gains the one new `'read'` nudge (eave-reach section above). No new import — this file stays
decoupled from `surface.ts`'s types on purpose.

**`src/pages/DrawPage.tsx`** — the `read` call site gains `holesReachEave`, computed from
`edits` and `holeReachesEaveM` (eave-reach section above).

**`src/pages/draw/DrawStage.tsx`**:
- New ref, mirrored to state the same way `start`/`now` already are:
  `collarAnchorRef` / `[collarAnchor, setCollarAnchor]`.
- In `down()`: `const anchor = tool === 'pushpull' ? nearestHoleRim(edits, p) : null;` — set
  both the ref and the state. **Decided once, at press, locked for the drag** — the same
  pattern `downObjRef` already uses for the off-surface guard, and it matches the mental
  model: you grab something by touching it, then the drag decides how much.
- In `clear()`: reset `collarAnchorRef.current = null` / `setCollarAnchor(null)`.
- In `up()`: pass `collarAnchor: collarAnchorRef.current` into `commitGesture`.
- Rendering, inside the existing `tool === 'pushpull'` block: if `collarAnchor` is set, render
  ONE `DrapedRing` at `collarAnchor.at`/`collarAnchor.radiusM`, fed
  `{ arcs, edits: [...edits, { kind: 'collar', at: collarAnchor.at, radiusM: collarAnchor.radiusM, amountM: Math.max(0, amount) }] }`
  as its `input`, `kind="pushpull"` for color. Else, render exactly what's there today (the
  point ring + floating sphere).

**Tests to extend** (Edward's call on exact cases, not mine to write): `gesture.test.ts`
already has one assertion per `Edit.kind` (`kind === 'hole'`, `kind === 'pushpull'`) — add the
collar-anchor branch and a `nearestHoleRim` unit. `surface.test.ts` already exercises
`amountM: -99` for the pushpull clamp; mirror that discipline for a collar's pull-only floor.

---

## Discovery

No new toolbar surface means this is genuinely invisible without a nudge — the same problem
Spec 1 solved for lift/orbit/zoom, and the same mechanism, extended rather than duplicated.

**A third, independent rail line**, own state (`holeHintShown`/`holeHintUp`), own trigger:
first time `edits` contains a `hole`. Stacks visually in the same left-4 column the rail
already occupies, doesn't touch the existing nav-hint's timer.

Copy: `grab its rim with sculpt to raise a collar`

Dismiss: the same 6.5 s hold, OR immediately when a `collar` edit actually commits (wire it
into the same `onEdit` handler that already routes edits into state — check
`e.kind === 'collar'` and clear the hint). Re-arm on "start over," folded into the SAME reset
effect Spec 1 already extended (`DrawPage.tsx:280-287`) — one more pair of `setState(false)`
calls, not a new effect.

If three lines stacking briefly (nav hint still fading as a fast take excavates its first
hole) reads as busy once it's actually on screen, the fallback is to queue rather than
overlay — hold the hole-hint until the nav-hint's own window has closed. Flagging as a
build-time call, not deciding it blind.

---

## What's free, and why it's actually free (not just unexamined)

**Undo can't orphan a collar.** `edits` is append-only and a collar can only be created
AFTER its anchor hole already exists in the array (you can't grab a rim that isn't there
yet) — so a collar's array index is always strictly greater than its anchor hole's. Undo
(`DrawPage.tsx`'s `edits.slice(0, -1)`) is strict LIFO. A hole can therefore never be removed
while a collar referencing it still remains — the collar is always popped first. No
bookkeeping, no orphan check, no dangling reference is possible by construction.

**Bake inherits this for free.** `shapeFromDrawing.ts:60` — `heightAtM: (x, z) =>
surfaceHeight(input, toWorld(x, z))` — calls the real `surfaceHeight` directly, so any new
edit kind handled there is automatically live in the baked lattice too, with no adapter
change. A baked collar will show up as real timber undulation around the hole's members,
inherited the identical way `pushpull` already is.

---

## Constraints, checked

- **Soft phase only.** Nothing here touches anything gated on `!resolved`/`!baked` — the
  tool only exists while sculpting, same as `hole` and `pushpull` today.
- **No PBD fusion.** Nothing added here needs `formFinding.ts`. The collar is one more
  independent local lobe summed the same way `pushpull` already is — exactly "share the LAW,
  not the solver."
- **Bundle.** A handful of pure functions across two existing files. No dependency, no
  shader, no asset. Negligible against the 42 kB headroom.
- **Legibly unfinished.** The collar is a bump in a hand-sketched height field, not a modeled
  architectural detail — it stays exactly as sketchy as everything else on the soft skin. It
  does not add polish; it adds one more thing the surface can be asked to do.

---

## Flagged for Daniel

0. **The real `apertureDeg` fix is a separate, larger, pre-existing engineering task — not
   closed by this doc.** It predates this spec (the slider and the direct-manip handle are
   both already live and already unbounded, in `/studio`, today) and needs one of two things
   this spec cannot supply: a sourced structural number (Weinand/Robeller's unread EPFL IBOIS
   thesis is Senku's best real lead), or an explicit ruling from Daniel that "an honest nudge,
   forever, no clamp" is the permanent answer rather than a placeholder. Recommend this becomes
   its own task, owned by Edward, informed by Senku's research doc directly
   (`docs/research/2026-07-17-discrete-timber-assembly.md`), rather than riding in on this
   gesture's back.
1. **The aperture correction above** — worth a look before Edward builds, since it changes
   the target from "generalize the eave's opening direction" to "let a hole's rim be pulled
   into a collar." If Daniel actually meant the eave-opening generalization too, that's a
   separate, smaller spec (a straightforward N-lobe version of `eaveHeightAtM`, following
   `footPullAt`'s exact pattern) and can be scoped after this one.
2. **Sinking a collar (a moat) is out of scope for this pass**, deliberately. Worth asking
   whether it's wanted, since the mechanism above would extend to it cheaply (drop the
   `Math.max(0, ...)` and the pull-only gate) if so.
3. **`COLLAR_WIDTH_M` and `COLLAR_GRAB_TOLERANCE_M`** are both starting numbers reasoned from
   proportion to existing constants, not verified against a render. Both need a look once
   built, called out explicitly above rather than buried.

## Files referenced (none edited)

- `src/engine/grammar.ts` — `deriveBounds()`'s empty `apertureDeg` bound (:111-116), the
  only ungoverned slider in the grammar
- `src/engine/directManip.ts` — the existing, already-unbounded aperture drag handle (:105)
- `docs/research/2026-07-17-discrete-timber-assembly.md` — Senku's literature pass; §2's
  aperture-slider finding and §"What needs Daniel" are the basis for the eave-reach section
- `src/engine/surface.ts` — `Edit` (:59-65), the pushpull/collar edit loop target
  (:280-288), `isHole` (:296-302), `planCentre`/`footprintHull`/`fairedRadius` (reused by
  `holeReachesEaveM`)
- `src/engine/geometry.ts` — `eaveHeightAtM` (:151-155), `crownFraction`'s use as `r0`
  (:293), `ringPieces(0, 'crown', ...)` (:552)
- `src/engine/shapeFromDrawing.ts` — `heightAtM` calling `surfaceHeight` directly (:60), why
  bake inherits this free
- `src/data/config.ts` — `GRAMMAR.crownFraction` (:75)
- `src/pages/splash/HeroScene.tsx` — `CAM_TOP` (:37), the top-down opening pose looking into
  the oculus
- `src/pages/draw/drape.ts` — `projectToSkin`, `drapeRing`, `skinRuns`, `previewHeightM`
  (:78-163), the pattern this spec reuses wholesale
- `src/pages/draw/DrawStage.tsx` — `DrapedRing` (:106-151), the pushpull preview block
  (:369-386), `down`/`up`/`clear` (:214-260)
- `src/pages/draw/gesture.ts` — `commitGesture`, `PUSHPULL_RADIUS_M`, `MIN_PUSHPULL_AMOUNT_M`,
  `PUSH_LIMIT_M`/`PULL_LIMIT_M` (:37-58, :104-133)
- `src/pages/draw/toolCopy.ts` — `RAIL_LINES`, the pattern the discovery hint extends
- `src/pages/DrawPage.tsx` — the rail's hint state and its re-arm-on-start-over effect
  (:199-207, :280-287), `onEdit` wiring (:367-369 in the version this doc was read against)
- `docs/handoffs/2026-07-17-redlining-direction.md` — the scribble/trace "shape decides
  meaning" law this spec reapplies; the "Not yet reached" note that (correctly) named the
  generalization pattern, on the (I think) wrong target
