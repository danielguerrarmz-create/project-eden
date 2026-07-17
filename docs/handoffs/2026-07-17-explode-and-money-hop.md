# 2026-07-17 — The explode, and the money hop

Built to Sai's spec (`docs/design/2026-07-17-explode-spec.md`). Two commits: `26ce2e7` (the
motion) and this one (the hop).

**Branch `engine-draw`**, on top of `90b0fe0`. **Nothing pushed.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 572/572 · `npm run build` clean.**

## Bundle and GPU, measured (the lead asked specifically)

| | before | after | delta |
|---|---|---|---|
| **`three` chunk** | 1058.37 kB | **1058.38 kB** | **+~10 bytes** |
| app chunk | 375.2 kB | 381.2 kB | +6.0 kB |

**~41.6 kB of headroom remains** under the 1100 kB ceiling. The worry about per-vertex
attributes was about the right thing but the wrong budget: **attributes are RUNTIME GPU memory,
not bundle.** Measured on a real design (180 members, 987 steel instances, 158 pieces):

- **+116.7 KB of GPU attributes** (timber 101.3 + steel 15.4) against a 151.9 KB
  position+normal baseline. So the timber buffer grows ~67%, and the absolute number is
  negligible.

## What shipped

**The motion** (`26ce2e7`): a post-bake `explode`/`reassemble` chip on its own clock. Each piece
travels along its own already-computed outward normal — crown lifts, eave spreads, with no
radial-vs-vertical rule authored, because a dome's normal field already encodes one. `v` staggers
the starts so the cascade plays the real install order backwards. Timber gets per-vertex
offset+delay baked at build time and animated by ONE uniform (`revealShader`'s trade, second
use); steel rides parallel `InstancedBufferAttribute`s. Framing re-fits analytically to the
exploded point set, so the camera and the pieces glide to a frame that already fits.

**The hop** (this commit): click a timber piece, get its rows from the same build-up, in the same
panel, same register. No new HUD.

## THREE THINGS THE SPEC WOULD HAVE SHIPPED BROKEN

Recorded because each is invisible until it is catastrophic.

1. **The instanced offset cannot be the raw normal.** `transformed` is INSTANCE-LOCAL —
   `project_vertex` applies `instanceMatrix` after the injection — and steel plates carry
   non-uniform scale (~`[0.2, 0.008, 0.2]`). A raw `node.normal` gets that scale applied to it:
   the piece slides 8 mm on one axis and 200 mm on another instead of moving along its normal.
   Undone with `inverse(mat3(instanceMatrix))` under `USE_INSTANCING`. Timber is a plain mesh
   with world coords baked in and needs none of it.
2. **It must CHAIN, not assign.** `applyReveal` ASSIGNS `onBeforeCompile`, and `Folly` puts both
   passes on the SAME materials. A second assignment silently destroys the first: the reveal
   stops cutting, the bake reverts to a jump cut, **and nothing errors**. `applyExplode`
   composes, guarded by a WeakSet — chaining is only safe if it happens exactly once, and
   `Folly`'s ref callbacks fire on every re-render.
3. **`customProgramCacheKey` is never undefined.** three defines it on `Material.prototype` and
   the default returns `this.onBeforeCompile.toString()`. Chaining that would splice this
   function's own source into its own key, and would hide whether anyone had set one — so only an
   OWN property counts. That default is also precisely WHY the explicit key is mandatory here:
   every material `applyReveal` touches gets an `onBeforeCompile` with IDENTICAL source, so the
   default key is identical too, and materials differing only in closed-over uniforms would
   silently share one compiled program.

## The studio scene: safe STRUCTURALLY, and checked

`Folly` is genuinely shared, so the skin's argument ("`SurfaceMesh` is unreachable from studio")
does NOT transfer. What holds instead:

- **Both shader passes are no-ops without their uniforms**, which only `#/draw` passes — the same
  gate `useReveal` already relied on. Studio compiles exactly the shaders it always did.
- **The click handler is gated on `onSelectPiece`.** R3F only raycasts objects that carry a
  handler, so without the prop those meshes are not interactive at all in studio.
- The extra geometry attributes exist in studio but no shader reads them: unused VBO data, no
  render change. That is the one real (tiny) cost, ~117 KB of GPU buffer.
- **NOT verified live** — see below. This is the constraint that bit before, and I have reasoned
  it rather than observed it.

## The money hop, and where it stops

`ui/costAttribution.ts` (pure, 11 tests). Sai found the pricing model's own dividing line and it
is respected exactly:

- **EXACT** — docking (£5/piece), install (£6.50/piece), every hardware line. Flat rate × real
  count, in the model's own definition, no batching, no shared waste. A clicked strut says the
  number and is right.
- **SHARED, labelled** — sheet CNC is charged per SHEET; bulk timber buys whole lengths by
  bin-packing so a piece's share carries unassignable offcut. Both show their **real basis with
  the sharing named**, never divided by a count. `exact: false` is the finding, not a hedge.
  Inventing an allocation would look precise and be fiction — the same error as tuning a rate to
  match the deck.

**A test caught the exact claim breaking:** `gbp()` used `Math.round`, so the £6.50 install
rate — one of the figures this module exists to state exactly — rendered as **"£7"**. A 7.7%
error under an `exact: true` flag. Rounding that is fine on a £14,000 total is a lie on a £6.50
line. Fixed, and the fix removed a smell: lines now carry `valueGBP` and totals sum that instead
of re-parsing their own display string.

**Where it stops, not faked:**
- **Steel is not clickable.** `instanceId` is free from the raycast, but mapping an instance to
  the right hardware line needs to know what that instance IS (a fin? a bolt? a base plate?), and
  `SteelOwner` records the node, not the part kind. Real work, not done. Timber is where "158
  pieces" lives and is the line Daniel quoted.
- **Which sheet a lamella landed on: still not knowable.** `nesting.ts` re-explodes the ROUNDED,
  TALLIED cut list rather than `geometry.pieces`, so individual identity is lost in the pack.
  Sai's finding, unchanged, and the honest framing is shipped instead of a synthesised id.

## Also found

**The LAMELLA system emits ZERO steel at its 18 crown nodes** (hub emits 144), because the
lamella crown is woven timber blanks closing on shared mitres, not a hub. So the explode's last
beat is timber-only in that system. Correct, structural, and it looks exactly like a bug from the
outside ("the steel stops at v=0.75") — pinned by a test so the next person does not go hunting.

## Deviations from the spec

- **Sequence readout is STATIC** (`ground up · N rings · crown last`), not a live "ring n of N"
  ticker. A ticking counter needs a React state write per frame, and this page's own rule —
  `BakeReveal`'s, which `ExplodeReveal` follows — is refs-not-state, because a re-render per
  frame fights the animation. It would re-render the whole Canvas subtree for a 2.2 s counter.
  The sentence is true for every frame of the cascade anyway.
- **Distance is baked into the attribute** (direction × metres) rather than carried as a
  `uExplodeDistanceM` uniform: it only changes when the design changes, which is when the
  geometry is rebuilt regardless. One less uniform. Stagger is a GLSL constant for the same
  reason (`revealShader` has a uniform because `uRevealY` animates; these do not).
- **`CanopyNode.v` added**, per Sai's own recommendation over parsing `n-{i}-{j}` ids. A parsed
  id is a format nobody declared a dependency on.

## Verify

- **572/572**, +29. `explodeShader.test.ts` (15) pins the cascade's shape — nothing moves before
  its turn, everything arrives together, ground leads crown, monotonic, clamped — plus the chain,
  the cache key, and the instancing guard. `connectors.test.ts` (14) pins that the owner arrays
  stay exactly parallel to the instance arrays, which is the invariant the loop-boundary backfill
  rests on. `costAttribution.test.ts` (11) pins the tiering against every real piece in both
  systems.
- **NOT verified live, and this one has the most surface of anything today.** No browser tooling
  in my context. Unverified: whether the cascade READS as an assembly order at 2.2 s; whether
  `EXPLODE_DISTANCE_FRAC = 0.5` separates legibly on the smallest and largest buildable footprint
  (Sai flagged both durations and the distance as starting numbers never seen animated); whether
  the re-framed camera holds the exploded kit; whether picking hits the piece you aimed at; and
  **whether `#/studio` still renders identically**. All the constants are one-liners at the top of
  `explodeShader.ts` / `ExplodeReveal.tsx`.

## Files

- `src/scene/explodeShader.ts` + `.test.ts` — NEW. The injection, the chain, the cascade rule.
- `src/scene/connectors.ts` + `.test.ts` — `SteelOwner` per instance; NEW test.
- `src/scene/Folly.tsx` — per-vertex explode + piece-index attributes, both passes, gated picking.
- `src/pages/draw/ExplodeReveal.tsx` — NEW. The clock.
- `src/ui/costAttribution.ts` + `.test.ts` — NEW. The honest tiering.
- `src/engine/types.ts` · `geometry.ts` — `CanopyNode.v`.
- `src/pages/DrawPage.tsx` — chip, clock, framing, readout, selection.
- `src/pages/draw/toolCopy.ts` — `explodeReadout`.
