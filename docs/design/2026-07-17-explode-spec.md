# 2026-07-17 — the explode: "here's what each of these is, and here's what it costs"

Daniel: *"if we can get that itemized list that says OK this cost about this much to make —
that's really the money if we see the geometry and we see a price after whatever is vibe
made."*

Nothing here is built. Do not edit source from this doc. Repo is public — no pricing analysis,
no accelerator material in what follows; only mechanism.

---

## Scope check, up front, as asked

**The core of this — explode the kit, show real pieces, show a real sequence — is one spec
and it's fully buildable from data the engine already computes. Nothing needs inventing.**
That much I can say with confidence and it's the main body of this doc.

**One real gap, found while checking, named so it isn't glossed over:** the "money hop" — a
part connects to its price line — is NOT uniformly exact across every part, because the
pricing model itself isn't uniform. Some costs are genuinely per-piece (docking, install,
every hardware item) and a specific selected part can honestly show an exact number. One cost
category — CNC sheet profiling — is genuinely SHARED across whatever pieces get nested onto
one sheet, and (a separate, sharper finding) **`nesting.ts` doesn't preserve which original
`Piece.id` ends up on which sheet at all** — it re-explodes the ROUNDED, TALLIED cut list, not
`geometry.pieces` directly. So "click this exact lamella, see its exact rectangle on its exact
CNC sheet" is not buildable today without a small, real change to `nesting.ts` (carry piece
IDs through the pack). That's not a blocker for this spec — it's scoped out below, precisely,
rather than faked. Everything else in "what does this part cost" is real and exact.

---

## The four rulings

### 1. When does it happen

Post-bake only, and it does NOT extend the bake reveal's clock. The reveal (`BakeReveal.tsx`)
is a one-shot narrative beat — skin dissolves, lattice sweeps up, once, at bake. The explode is
an exploratory, repeatable toggle someone reaches for AFTER the kit exists, to go look at it —
different intent, different trigger, and conflating them would tie a one-time story beat to a
thing that needs to run forwards and backwards on demand. **New action chip, same row as
`export drawing` / `export everything` / `keep sculpting`** (`DrawPage.tsx`'s baked chip row):
`explode`, which becomes `reassemble` while exploded. One boolean, `exploded`, toggled.

They DO share a technique — see below — because it's the same problem (move real geometry
along a real axis, driven by one clock) the reveal already solved once.

### 2. What explodes, and along what

**Each piece's own already-computed outward surface normal**, not an invented axis.
`CanopyNode.normal` / `Member.normal` are already "outward (upward) unit surface normal"
(`types.ts:58`, `:110`) — the same normal that already orients the timber's section and the
connector's core. Near the crown that normal points mostly UP; near the eave/ground it points
mostly OUTWARD. Reusing it means the explode direction is free, exact, and — because it's the
real surface normal — crown pieces lift, eave pieces spread, with no separate "radial vs.
vertical" decision to author. The dome explodes the way a dome's own geometry already points.

**Magnitude and TIMING both come from `Member.v`** (already computed, `types.ts:134`, "0 =
eave/ground edge, 1 = crown") — which is exactly Senku's recommended sequence, already sitting
in the data: ground/eave is assembled first (`v≈0`), crown last (`v≈1`). Two different roles
for the same number:
- **Timing (the sequence, the thing Senku's finding says is the actual concept):** pieces
  start moving in `v` order — ground/eave first, crown last — staggered across the explode's
  duration, so watching it play IS watching an assembly order (in reverse: explode plays the
  install sequence backwards, which is the standard convention for exploded-assembly
  animation).
- **Magnitude (how far, at full explode):** roughly UNIFORM per piece once it has started
  moving — the point isn't "crown flies further," it's "every piece ends up legibly separated
  from its neighbours." Scaling distance by `v` too would leave ground pieces barely moved at
  full explode, which reads as broken, not as a diagram.

By component class: not a separate rule. Struts, lamellae, blanks and steel all move along
their own normal on the same clock — "by component class" falls out of the fact that a strut's
normal and its neighbouring hub's normal already differ, so the kit visibly separates into its
real families without a class-specific rule needing to exist.

### 3. How a part connects to its price line — tiered, honestly

**Exact, for real:** `dockingPerPieceGBP` (£5, every linear piece), `installPerComponentGBP`
(£6.50, every piece of every kind), and every hardware line (`hub`, `hubGroundShoe`,
`boltSet`, `fishPlate`, `groundScrew`) — because `pricing.ts`/`joints.ts` define these as a
flat rate × a real count built from real per-node/per-piece kinds (`grammar.ts`'s own
`computeHardware`, `config.ts:217-232`). There is no batching or shared waste in these lines:
every individual instance of that kind really does cost exactly that rate, by the model's own
definition. A clicked strut can honestly say "£5 docking + £6.50 install," exact, no
approximation, no invented precision.

**Shared, labelled as shared:** the sheet-stock lines. `sheetCncGBP` (£65) is charged per
SHEET, split across however many parts got nested onto it — real, but not separable to one
piece without an allocation rule the pricing model doesn't have. A clicked lamella shows "cut
from one of N sheets, £X CNC'd, shared across its sheet-mates" — true, not a false split.

**Timber stock (both stocks) is the same shape of "shared":** `nesting.stockPlan` buys whole
standard lengths via bin-packing, so an individual piece's exact share of the timber line
includes shared offcut waste that isn't cleanly assignable. Same honest framing: "roughly
`lengthM × £7`, before the batch's own waste."

**Not built here, flagged, not faked:** which exact sheet a specific `Piece.id` ended up on.
See the scope note above — `nesting.ts` would need to carry `Piece.id` through
`sheetBlanks`/`NestedPart` for that to be true. Worth doing (it's a small, real fix — see
"Flagged for Daniel"), not worth faking with an invented ID.

### 4. What stops it being a toy

Senku's own answer, and it's the spine: **traceable.** Every part in the explode has to
resolve to a real BOM row, and the order has to match how it would actually go together on
site. Both are already true of the underlying data (`Piece.id`, `CanopyNode.id`,
`Member.v`/ring order) — the explode's whole job is to not lose that on the way to the screen.
Concretely, "believe it" means: (1) every moving thing is a real piece or a real connector,
never a decorative copy; (2) the order it separates in is the real ground-up assembly order,
not an arbitrary or merely pretty one; (3) where a price is shown, it's either exact or
honestly marked shared — never a confident-looking number the model can't back.

---

## The technical foundation — read this before the file list

**Timber has no per-piece identity in the scene today, and that's the one thing this spec has
to fix to work at all.** `Folly.tsx`'s `prismsToGeometry` (:35-86) merges every member's
clipped prism into ONE flat `BufferGeometry` per stock (`c24Geo`, `lvlGeo`) — positions and
normals only, no per-vertex piece reference. That's exactly right for a static render and
exactly wrong for an explode: there's nothing to move independently.

**The fix follows the pattern this codebase already uses for exactly this class of problem**
(`revealShader.ts`): bake per-vertex data in at BUILD TIME (once, in JS, from data the engine
already has), animate it with ONE uniform per frame. Extend `prismsToGeometry` to accept, per
prism, an offset direction (the member's own normal), a delay scalar (`member.v`), and a piece
index — write all three as extra `Float32BufferAttribute`s alongside `position`/`normal`,
repeated per vertex the same way those already are. A vertex shader injection (same
`onBeforeCompile` technique, same file shape as `revealShader.ts`) adds
`aExplodeOffset * localT(uExplodeT, aExplodeDelay)` to the vertex position before the standard
transform. **This is not a new technique for this codebase — it's the second use of one.**

**Steel is cheaper.** `connectors.ts`'s `buildSteel` already builds one `Matrix4` per real
node/connector instance (`boxes`/`cylinders`), and `THREE.Raycaster` already returns
`instanceId` for free against an `InstancedMesh` — no new attribute needed for CLICK
identification, only for the offset/delay, which `buildSteel` can emit as parallel
`InstancedBufferAttribute`s the same shape as the timber's per-vertex ones (one value per
instance instead of per vertex).

**`CanopyNode` doesn't store a ring index the way `Member` stores `v`.** Two ways to get it:
parse `node.id` (format `n-{i}-{j}`, `geometry.ts:311` — the ring index is literally already
encoded in the string, works today, fragile if the id format ever changes) or add a real
`ringIndex`/`v` field to `CanopyNode` (small, clean, zero behaviour change elsewhere).
**Recommend the field.** The parse trick is a shortcut worth naming, not the thing to ship.

---

## Exact implementation

**`src/scene/explodeShader.ts`** — NEW, mirrors `revealShader.ts`'s shape exactly:

```ts
export interface ExplodeUniforms { uExplodeT: { value: number } }
export function makeExplodeUniforms(): ExplodeUniforms { return { uExplodeT: { value: 0 } }; }

const VERTEX_HEAD = `
attribute vec3 aExplodeOffset;
attribute float aExplodeDelay; // 0 (ground/eave) .. 1 (crown)
uniform float uExplodeT;
uniform float uExplodeStagger; // fraction of the timeline spent staggering vs moving
uniform float uExplodeDistanceM;
`;
const VERTEX_BODY = `#include <begin_vertex>
  float localT = clamp((uExplodeT - aExplodeDelay * uExplodeStagger) / max(1e-4, 1.0 - uExplodeStagger), 0.0, 1.0);
  transformed += aExplodeOffset * uExplodeDistanceM * localT;`;
```

Applied via `material.onBeforeCompile`, injected after `#include <begin_vertex>` — same
insertion point `revealShader.ts` already uses, so the two can coexist on the same material if
a future pass ever needs both (they don't need to run simultaneously here: the reveal finishes
at bake, the explode is toggled afterward).

**`src/scene/Folly.tsx`** — `prismsToGeometry` gains two more parallel arrays it already has
the loop shape for (offset = the member's own `.normal`, delay = `.v`, piece index = the
piece's position in `geometry.pieces`), written as `Float32BufferAttribute`s the same way
`position`/`normal` already are. `Folly` takes an optional `explodeUniforms` prop, applied via
`onBeforeCompile` the same way `revealUniforms` already is.

**`src/scene/connectors.ts`** — `buildSteel` returns two more parallel arrays,
`boxOffsets`/`boxDelays` and `cylOffsets`/`cylDelays` (`node.normal`, and `node.id`-derived —
or field-derived, per the ranking above — ring position), same length as `boxes`/`cylinders`.

**`src/engine/types.ts`** — recommend adding `ringIndex: number` (or `v: number`, matching
`Member`'s own naming) to `CanopyNode`, set at generation the same place `kind` already is
(`geometry.ts:314`, the ring loop already has `i` in scope). Zero behaviour change to anything
that reads `CanopyNode` today.

**`src/pages/draw/ExplodeReveal.tsx`** — NEW, same shape as `BakeReveal.tsx`: a `useFrame`
component owning the tween, `active` (the `exploded` boolean), driving `uExplodeT` 0→1 (toggle
on) or 1→0 (toggle off) over a fixed duration, refs not state (same reasoning `BakeReveal`
already states — a per-frame write, and a re-render per frame would fight the animation).
Suggested durations: **2.2 s explode, 1.6 s reassemble** — asymmetric on purpose, the same way
the bake's own skin-fade and sweep are tuned to feel like arriving rather than a stepper
motor; reassembly reading faster and snappier (a magnet snapping back) is a deliberate choice,
not an unexamined default, but it hasn't been seen animated — treat as a starting point.

**`src/pages/DrawPage.tsx`**:
- `[exploded, setExploded] = useState(false)`, gated `baked && !dissolving` (don't let someone
  explode a structure still mid-reveal).
- New chip in the baked action row: label `explode` / `reassemble` toggling the state.
- Re-frame on toggle: reuse `Framing`'s existing `{ kind: 'fit', points, margin }` — compute
  the exploded point set analytically (`node.position + node.normal * EXPLODE_DISTANCE_M` for
  every node), no live measurement needed, same `surfaceSamples`-adjacent machinery already in
  `framing.ts`.
- `EXPLODE_DISTANCE_M` — recommend size-relative, not a flat metre figure, so it scales across
  the 12-18 m² footprint range: `0.5 * geometry.planB` (the minor semi-axis, already computed,
  `types.ts:193`). Starting number, not a ruling — watch it on the largest and smallest
  buildable footprint before trusting it.

**`src/ui/costAttribution.ts`** — NEW, pure, testable (same reasoning `priceCopy.ts` already
states for keeping copy logic out of components). Exports one function per the tiering above:

```ts
export interface CostLine { label: string; valueGBP: number; exact: boolean; note?: string }

/** What a specific piece or hardware item costs, tiered honestly. Exact where
 *  the pricing model defines a flat per-unit rate; shared/approximate where
 *  it doesn't (sheet CNC, bulk timber-length purchase) — see the spec. */
export function attributionFor(
  selection: { kind: 'piece'; piece: Piece } | { kind: 'hardware'; itemId: string },
  price: PriceBreakdown,
  nesting: NestingResult,
): CostLine[]
```

Wired to selection via `Piece index` (timber, from the baked-in vertex attribute + raycast hit)
or `instanceId` (steel, free from `InstancedMesh` raycasting) — resolved by `DrawPage.tsx`,
displayed in the SAME visual language the existing cost panel already uses (no new panel
system): a line or two appended below whatever's selected, not a new HUD element.

---

## Sequence readout — quiet, textual, no floating 3D labels

**Numbered callouts floating in 3D space were considered and ruled out.** They're the literal
IKEA-manual reading of "assembly sequence," and they're also the reading that risks the most
visual clutter on a filmed take — exactly the anti-Jarvis failure mode. The sequence is told
through TIME (the cascade itself, ground-up, crown-last) the same way the bake reveal already
tells its story through motion, not labels.

The one textual concession, extending the EXISTING baked bottom-left panel (`DrawPage.tsx`,
the one already showing `"138 pieces · cut list, live"` and the cost build-up) rather than
adding a new panel: while exploding, it gains a third quiet line, same typographic register —

`ground up · ring {n} of {ringCount}`

— live-computed from `uExplodeT` against the ring count, updating as the cascade plays.
Nothing new to look at, one more fact in a place the eye is already looking.

---

## Constraints, checked

- **Bundle.** No dependency, no shader asset, no postprocessing pass — a handful of pure
  functions and one more `onBeforeCompile` injection, the same shape as the reveal shader
  already shipped. Negligible against the 42 kB headroom.
- **Zero CDN, ever.** Nothing here fetches anything. All geometry is computed locally from data
  already in the store.
- **Filmable, no chrome.** The explode/reassemble chip is one more chip in a row that already
  exists. The sequence readout is one more line in a panel that already exists. No new visual
  system introduced anywhere in this spec.
- **Post-bake, so precision is licensed.** Unlike every earlier spec today, nothing here needs
  to "stay legibly unfinished" — the kit is resolved by the time this exists, and it's allowed
  to read as exactly what it is: a real shop drawing. Used that licence for the price panel's
  honesty tiering above rather than softening it.

---

## Flagged for Daniel

1. **The nesting-identity gap (scope note above) is worth its own small task.** Carrying
   `Piece.id` through `nesting.ts`'s pack (`sheetBlanks`/`NestedPart` gain an `id` field,
   threaded from `components.items` back to the real `geometry.pieces` instead of exploding
   the rounded tally) is what would let a clicked lamella point at its exact sheet position.
   Small, real, not done here — Edward's call on priority against everything else open.
2. **Adding `ringIndex`/`v` to `CanopyNode`** (technical foundation, above) is a one-line
   generation-time addition with no behaviour change — recommend doing it as part of this
   work rather than parsing `node.id` strings, but the parse works if time is short.
3. **`EXPLODE_DISTANCE_M`, the stagger fraction, and both durations** are starting numbers
   reasoned from proportion to what's already tuned (the bake reveal's own timings, the
   structure's own plan radius) — none have been seen animated. Watch on the smallest and
   largest buildable footprint before trusting them.
4. **Whether the price-attribution hop belongs in the filmed take at all**, or is purely for
   someone driving the page live afterward. My assumption above: the explode motion itself is
   the filmable beat; the click-to-see-cost-line is the "the money" claim made GOOD on
   demand, not necessarily something a 10-second clip needs to show happening.

## Files referenced (none edited)

- `src/scene/Folly.tsx` — `prismsToGeometry` (:35-86), the merge this spec extends
- `src/scene/connectors.ts` — `buildSteel` (:76-225), per-node instance construction
- `src/scene/revealShader.ts` — the `onBeforeCompile` pattern this spec reuses a second time
- `src/pages/draw/BakeReveal.tsx` — the "one clock, refs not state" pattern `ExplodeReveal`
  copies
- `src/engine/types.ts` — `CanopyNode` (:55-67, no ring index today), `Member` (:97-136,
  `.v` at :134), `Piece` (:143-153)
- `src/engine/geometry.ts` — the ring generation loop where `i` is already in scope
  (:302-319), `uv()` computing `Member.v` (:325-328)
- `src/engine/joints.ts` — `computeHardware` (:21-108), the flat-rate-times-real-count
  hardware lines this spec's exact/shared tiering is read directly off
- `src/engine/pricing.ts` — `priceDesign` (:23-97), the six build-up lines and which rates
  are per-unit vs. batch
- `src/engine/nesting.ts` — `nestComponents` (:26-121), where individual `Piece.id` identity
  is lost (re-explodes `components.items`, the rounded tally, not `geometry.pieces`)
- `src/ui/priceCopy.ts` — the existing pattern for keeping copy/attribution logic pure and
  out of components, extended by the new `costAttribution.ts`
- `docs/research/2026-07-17-discrete-timber-assembly.md` — §4, the exploded-assembly-drawing
  literature this spec builds directly off
