# 2026-07-17 — `#/draw` demo round: hardware, a dynamic figure, a species row

Spec-only. No `src/` edits made by this doc. Written for Edward against the
`engine-draw` worktree (`restless-egg/engine-session`), current state per
`docs/handoffs/2026-07-17-demo-simplification.md`, `2026-07-17-draw-visual-impact.md`,
`2026-07-17-explode-and-money-hop.md`.

Three asks, one governing constraint each already stated by the team lead and
repeated here because it disciplines every item below:

- `src/engine/*` (the geometry solver) does not change. Everything here is
  `src/scene/*`, `src/pages/draw/*`, or `src/ui/*` — presentation.
- `three` chunk ceiling 1100 kB, ~41 kB headroom. Nothing here adds a
  dependency, so the ceiling number does not move; where an item costs
  something it costs **GPU buffer**, not bundle, and I've done that
  arithmetic per item rather than asserting "cheap."
- Stay performant through the explode (141+ pieces, instancing).

I checked `scratch-ring`'s commit `47b6676` ("Hardware reads as hardware:
spider disc hubs, overlays on the skin") in parallel via a background agent
and derived item 1 independently from `connectors.ts` before its findings
landed — the two converge on the same diagnosis (undifferentiated grey
instances read as debris, not a joint) but I did not blindly port that
branch's shapes. See **"Why not just invent hardware," below** — I dropped
one of my own early ideas (a cosmetic hub "boss") for the same reason I'd
reject anything from that branch that adds a shape with no line in
`JOINTS`/`FOUNDATION`. If Edward pulls working code from `47b6676` directly,
run it through that same test before shipping it.

---

## Governing rule for item 1: only render parts that are already named

`Folly.tsx`'s own header says it: *"the joints you see are the joints the saw
and CNC make."* `jointGeometry.ts`: *"What you see IS the cut."* That
discipline is why this spec does **not** propose new invented steel shapes
(no cosmetic bosses, no decorative ribs). Every geometry change below is one
of two kinds:

1. **A real named part `JOINTS`/`FOUNDATION` already specs, that Folly
   currently draws as nothing** (the dome nut, the ground screw shaft). This
   is the same category of fix as the reveal shader needing a matching depth
   material — completing what the spec already promises.
2. **A finishing operation on real stock that changes no dimension, no BOM
   line, no price** (eased arris on a beam is something every timber shop
   does; it doesn't change the cut list). Purely a render-time bevel of the
   same 8 corners `memberPrism()` already returns.

Nothing here moves a number in `config.ts`. If a number below (a nut's
diameter, a screw stub's visible length) isn't sourced from a `JOINTS`/
`FOUNDATION` constant, I've said so and flagged it as my own proportioned
guess for Edward to eyeball against a render, not a fabrication fact.

---

## Part 1 — manufacturability + beauty of the built kit

**1. Eased-arris member profiles.** `Folly.tsx`'s `prismsToGeometry` takes
each member's 8-corner rectangular prism (from `memberPrism()`, unchanged,
still the real cut solid the BOM prices) and currently tessellates it as a
flat 6-face box. Change the *tessellation only*: chamfer the 4 long running
edges (start-face corner *i* to end-face corner *i*), turning the box section
into an octagon in cross-section, cap faces included.

   - Chamfer depth by stock: **C24 struts/feet (45×70) → 4 mm. LVL blanks
     (eave/crown, 180×45) → 3 mm. LVL lamella (45×120) → 3 mm.** Named
     constants (`CHAMFER_STRUT_MM`, `CHAMFER_BLANK_MM`, `CHAMFER_LAMELLA_MM`)
     next to `sectionFor`'s call site in `Folly.tsx`, not `config.ts` — this
     is a render bevel, not a stock spec.
   - Do **not** chamfer the two end-cap (cut) faces themselves — those are
     the honest thing in the frame (the actual joint), and softening them
     visually would blur the "this is the real cut" claim the header makes.
     Bevel only the 4 side edges between them.
   - Triangle cost, worked: today a member is 2 caps × 2 tri + 4 sides ×
     2 tri = **12 tri**. Octagonal: 2 caps × 6 tri (fan-triangulated 8-gon) +
     8 sides × 2 tri = **28 tri**, ×2.33. Every per-vertex attribute this
     geometry already carries (`position`, `normal`, `aExplodeOffset`,
     `aExplodeDelay`, `aPieceIndex`) scales the same ×2.33. The explode
     handoff measured the *current* timber+steel attribute buffer at
     **~270 KB total** on a 180-member / 158-piece design; ×2.33 on the
     timber share puts the new total near **~590–630 KB**. That is GPU
     buffer, not bundle — still trivial on any GPU this ships to, but it's
     the actual number, not a wave of the hand. **Someone should confirm on
     a real GPU frame-timing capture before calling it free**, same caveat
     every prior handoff here has carried.

**2. Render the dome nut.** `JOINTS.hub.boltSpec = 'M12×70 8.8 HDG + dome
nut'` — the nut is already named and currently invisible; `connectors.ts`
draws the bolt as a bare rod. Add one small cylinder cap per bolt end at the
strut's OUTER face (away from the fin, where a nut would actually thread on):
**Ø22 mm × 12 mm**, proportioned off the 12 mm bolt diameter, not sourced
from a spec line — flagged as my own proportion, cheap to eyeball-correct.
Reuses `cylMat`, one more cylinder instance per existing bolt loop iteration
in `buildSteel` (2 bolts per strut end already loop there — this adds 1 cap
each, so cylinder instance count goes from *bolts* to *bolts + caps*, roughly
×1.5 on that pool, a few hundred instances at most).

**3. Render the ground screw.** `FOUNDATION.groundScrewSpec = 'Ø76 × 865 mm
HDG ground screw'` — also already named, also currently invisible (only the
flat 200×200×8 base plate draws today). Add a short visible stub at each
ground node: **Ø76 mm** (real, from the spec) **× ~100 mm visible height**
(my proportion — most of the 865 mm is driven below grade; ~100 mm reads as
"a screw collar above the plate" without implying the whole shaft is
exposed). One more cylinder per ground node (there are only 3–4 per design;
free).

**4. Differentiate steel BY ROLE, not by adding geometry.** This is the
actual fix for "loose grey rectangles": every steel part today shares one
box material and one cylinder material (`#aab0b4`, roughness 0.5, metalness
0.58 — already tuned per the 2026-07-17 visual-impact pass, don't re-litigate
that number). Use `InstancedMesh.setColorAt` (`instanceColor`, built into
three, zero new geometry, zero new draw calls, ~4 bytes/instance — call it
free) to split by role:

   - **Structural steel** (hub discs, ring flanges, fins, base plates, fish
     plates) keeps the current bright galvanized tone.
   - **Fasteners** (bolts, the new dome-nut caps, the new ground-screw
     stubs) go **darker and less reflective** — proportion, not sourced:
     `#3a382f`, roughness 0.7, metalness 0.3. Real hardware photographs this
     way (fasteners read as shadow-recessed against bright galvanized plate)
     and it is the single cheapest move that turns "a cluster of identical
     grey boxes" into "a plate with bolts in it."
   - Implementation note: `boxes`/`cylinders` are each ONE instanced mesh
     today with ONE material. `instanceColor` needs
     `<meshStandardMaterial>` to read `vertexColors` — set that prop and
     call `mesh.instanceColor` in the same `useInstanceMatrices` pass that
     already writes `aExplodeOffset`/`aExplodeDelay`, tagged by whether the
     `SteelOwner` came from a bolt/cap/stub push vs. a plate/disc push (the
     same "tag at the loop boundary" pattern `buildSteel` already uses for
     `owner`, just a second parallel array).

**5. Verify against the existing light rig, don't re-tune it.** The 36°
raking key + the studio-cube env reflections are already dialed
(2026-07-17 visual-impact pass). This item is a **confirm, not a build**:
once 1–4 are in, someone needs to actually look at a bake at 1440×900 and
check the two-tone steel and the eased timber edges both read under that
rig before calling this done. I have not seen any of this rendered; every
number above is reasoned from the code, not from a frame.

---

## Part 2 — the commission figure, made dynamic

**Where it lives:** `src/ui/priceCopy.ts` (pure, testable, no DOM — matches
the module's own stated reason for existing) gets a new function alongside
`COMMISSION_DEMO_FIGURE`/`COMMISSION_DEMO_LABEL`, which stay as the fallback
constants documenting the anchor. **Do not delete them** — they're the
literal 150k Daniel stated; the function below is calibrated to return
exactly that value at the reference bake, so they stay true as prose even
once the number moves.

**6. The formula.** Anchored to the ONE bake this demo has actually been
described against (14.3 m², 194 pieces, `#/draw`'s reference take, per the
2026-07-17 handoffs) so that a typical first bake still reads £150,000, and
moves in named, weighted proportion to area, real piece count, and the
selected species' `stemLoad01` (already a real per-species number in
`engine/species.ts` — wisteria 0.95, sweet pea 0.1). This does not touch
`pricing.ts`'s cost model on purpose: that machinery answers a different,
already-honest question (cost to construct) and mixing the two would be
exactly the "reverse-engineer evidence to fit a number" move `priceCopy.ts`'s
own header refuses to make for the real floor. This is a **separate, openly
demo-only** function.

```ts
export const COMMISSION_ANCHOR_GBP = 150_000;
// The reference bake this demo has been shown against — 14.3 m², 194 pieces,
// clematis (stemLoad01 0.5). Calibrated so THAT design reads exactly
// £150,000; anything drawn differently reads a different, still-clean number.
export const COMMISSION_ANCHOR_AREA_M2 = 14.3;
export const COMMISSION_ANCHOR_PIECES = 194;
export const COMMISSION_AREA_WEIGHT = 0.5;
export const COMMISSION_PIECE_WEIGHT = 0.35;
export const COMMISSION_SPECIES_WEIGHT = 0.15;
// speciesFactor ranges 0.85 (stemLoad01=0) to 1.15 (stemLoad01=1); clematis
// (0.5) lands it at exactly 1.0, so the reference bake's species term is a
// no-op and the anchor calibration above holds.
export const COMMISSION_SPECIES_FLOOR = 0.85;
export const COMMISSION_SPECIES_SPAN = 0.3;
export const COMMISSION_STEP_GBP = 5_000;

export function commissionDemoFigureGBP(kit: {
  footprintM2: number;
  pieceCount: number;
  speciesStemLoad01: number;
}): number {
  const areaFactor = kit.footprintM2 / COMMISSION_ANCHOR_AREA_M2;
  const pieceFactor = kit.pieceCount / COMMISSION_ANCHOR_PIECES;
  const speciesFactor =
    COMMISSION_SPECIES_FLOOR + kit.speciesStemLoad01 * COMMISSION_SPECIES_SPAN;
  const multiplier =
    COMMISSION_AREA_WEIGHT * areaFactor +
    COMMISSION_PIECE_WEIGHT * pieceFactor +
    COMMISSION_SPECIES_WEIGHT * speciesFactor;
  const stepped =
    Math.round((COMMISSION_ANCHOR_GBP * multiplier) / COMMISSION_STEP_GBP) *
    COMMISSION_STEP_GBP;
  // Never show less than Daniel's own stated floor ("core commissions from
  // £150k") — the demo figure moves UP from the anchor, never below it.
  return Math.max(COMMISSION_ANCHOR_GBP, stepped);
}

export function commissionDemoLabel(gbp: number): string {
  return `£${gbp.toLocaleString('en-GB')}`;
}
```

   Worked check: wisteria (0.95) at the reference bake → speciesFactor 1.135
   → £155,000 (+£5k, one step). Sweet pea (0.1) → speciesFactor 0.88 →
   raw £147,300, but the floor clamps it back to **£150,000** — species alone
   can only ever move the figure UP from the anchor in this design, never
   down, on purpose (see the floor-clamp comment). **Flag for Daniel**: if he
   wants a lighter species to read as visibly *cheaper*, drop the
   `Math.max` floor — I kept it because "from £150k" is stated elsewhere in
   this same file as a hard floor and a demo figure dipping under it, even
   in a scoped-off panel, reads as contradicting the brand's own stated
   number.

**7. The count-up.** New hook, `src/ui/useCountUp.ts` (same folder/register
as `useReducedMotion.ts`, `useCanvasSizeGuard.ts` — small, focused, one job):

```ts
export function useCountUp(target: number, durationMs: number): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (reduced) { setDisplay(target); return; }
    fromRef.current = display; // tween from wherever it currently sits —
    // interruptible, so a fast double-switch doesn't restart from a stale value.
    let raf: number;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return display;
}
```

   **This is plain DOM, not R3F** — the "refs, not state, because a
   re-render fights the animation" rule that governs `BakeReveal`/
   `ExplodeReveal` is specifically about writes inside the Canvas subtree.
   The price panel is outside the `<Canvas>`; a React state write per frame
   here is completely normal and does not touch the 3D render loop at all.
   Don't let that rule migrate somewhere it doesn't apply.

**8. Wire it into `DrawPage`.**

```ts
const commissionTarget = commissionDemoFigureGBP({
  footprintM2: outputs.geometry.params.footprintM2,
  pieceCount: outputs.geometry.pieces.length,
  speciesStemLoad01: getSpecies(outputs.geometry.params.speciesId).stemLoad01,
});
// Longer on the moment that matters (right after bake, alongside the
// dissolve — reuses the EXISTING `dissolving` boolean, no new state), 550ms
// for every later change (a species swap).
const commissionDisplay = useCountUp(commissionTarget, dissolving ? 1100 : 550);
```

   `1100 ms` sits just under `REVEAL_S` (1.15 s) so the figure settles right
   as the lattice finishes sweeping up — the number arrives with the object,
   not before or after it. Render
   `commissionDemoLabel(Math.round(commissionDisplay))` where
   `COMMISSION_DEMO_FIGURE` sits today, same `font-serif text-[26px]
   leading-none` — **add `tabular-nums`** to that class list explicitly
   (Daniel's stated taste; the figure changing width per frame while
   counting would read as jitter without it). Label stays
   `COMMISSION_DEMO_LABEL` = `commission`, unchanged register.

   The geometry meta line (`priceMetaLine`) already reads live off
   `outputs.geometry` — it updates for free the instant species changes the
   strut field, no extra wiring.

---

## Part 3 — a species row, Samara-clear

**9. Where it sits, and why.** Same real estate the draw toolbar occupies
today (`absolute left-1/2 top-14 -translate-x-1/2`, `top-14` = 56 px below
the header) — mutually exclusive by construction, since the toolbar is
gated on `soft` (pre-bake) and this gates on `baked`. That single slot
changes MEANING the instant you bake: tools become options. It cannot
collide with the nudge panel (top-left), the commission panel (bottom-left)
or the action chips (bottom-right) because it's a different row entirely,
and at 1440 px wide with 7 cards ≈120 px + 6×6 px gaps ≈ **876 px**, it sits
centered with ~280 px clear on each side.

   **Post-bake only, not pre-bake.** Species changes the REAL strut field
   (support spacing) only once there's a baked lattice to apply it to — the
   soft skin phase has no armature at all. Showing the picker earlier would
   be exactly the "control with no legible effect" this codebase's own
   nudge-panel philosophy argues against (`fromDrawing.ts`: don't speak
   unless it changes something the viewer can see).

   **Hidden while `exploded || dissolving`**, same pattern already used for
   the explode chip (`{!dissolving && <Chip>...}`) rather than a new
   "disabled" visual vocabulary — one fewer state to design, matches a
   precedent already shipped.

**10. The card.** All 7 real species from `engine/species.ts` (not just the
featured trio — the demo has room and every one of them is a real, structural
option, not a placeholder). Each card:

```
┌──────────────────────┐
│ ● Mountain clematis   │   ← 10px swatch dot + font-serifDisplay 12px name
│ tendril · apr–may     │   ← font-mono 8px uppercase, habit · flowering
└──────────────────────┘
```

   `min-w-[104px]`, `rounded-lg border px-2.5 py-1.5 backdrop-blur`. Selected
   state: `border-accentOlive bg-accentOlive/10` — reusing the EXACT tokens
   `App.tsx`'s existing `SpeciesPicker` (on `#/studio`) already uses for the
   same job, and the same `accentOlive` `DrawPage.tsx` already uses for the
   explode readout text. Not a new color decision, a repeated one. Unselected:
   `border-inkBlack/20 bg-paperVellum/80 hover:border-inkBlack/40`.

   `onClick={() => setSpecies(sp.id)}` — that's the whole wire-up; the store
   already recomputes the real engine on the same drawn shape (see
   `store.ts`'s `setSpecies`), so the strut field and the commission figure
   both update from one call, no new plumbing.

**11. The swatch colors.** New file, `src/pages/draw/speciesSwatch.ts`
(presentation only, keyed by `Species.id`, testable the same bare-node way as
`priceCopy.ts`). **These are my own color calls, not sourced from anything**
— flagged plainly, same as this file flags every unsourced number:

```ts
export const SPECIES_SWATCH: Record<string, string> = {
  clematis: '#C98F82',        // warm terracotta-pink, spring blossom
  wisteria: '#8B7398',        // muted mauve — warm-shifted off the real
                               // blue-violet on purpose, same reasoning
                               // StudioEnvironment already used to avoid a
                               // blue-tinted env cast on steel
  trachelospermum: '#6E7C52', // star jasmine's flower is white (no contrast
                               // against paperVellum); leans on its
                               // evergreen character instead
  lonicera: '#C97B4A',        // honeysuckle, warm coral
  'rosa-newdawn': '#C97286',  // dusty rose
  lathyrus: '#B98CA6',        // sweet pea, pale orchid-pink
  hedera: '#4F5A3A',          // ivy, deep evergreen
};
```

   **Open question for Daniel**: seven distinct hues is a real deviation from
   the house's strict one-colour-accent restraint. My read is that this is
   informational (identifying 7 different plants, the same job a nursery tag
   does) rather than decorative chrome, and each dot is 10 px and desaturated
   — but it's a judgment call, not a rule I can derive, and it's the kind of
   thing that either reads as "clear" or "busy" only once it's actually on
   screen. Look at it before locking it.

**12. New component**, `src/pages/draw/SpeciesRow.tsx` (mirrors
`PlacedScaleFigure.tsx`/`BakeReveal.tsx` — one small file, one job), wired
into `DrawPage` as `{baked && !exploded && !dissolving && <SpeciesRow />}`.

---

## Non-goals — explicit, so nobody scopes-creeps a very short demo

- **No morph between species-driven lattices.** The geometry swap on
  `setSpecies` is instant (the store already re-runs the real engine
  synchronously); only the commission figure animates. A real morph between
  two different node-graph topologies is a genuinely hard problem this demo
  does not need — an instant, confident re-solve reads as MORE impressive
  than a tween would, and costs nothing to build.
- **No true hex/dome nut mesh.** The nut cap is a flat cylinder
  approximation, not a faceted hex head. Reads fine at demo viewing distance;
  don't spend a triangle budget on it.
- **No per-piece steel picking, no extending the money-hop.** Out of scope,
  matches the existing shipped limitation ("steel is not clickable").
- **No new bundled dependency** anywhere in this doc — no postprocessing, no
  texture maps, no drei imports beyond what's already used. Every visual
  move here is procedural geometry, vertex color, or DOM/CSS.
- **No change to any `config.ts` / `JOINTS` / `FOUNDATION` constant.** Real
  dimensions stay real; only unrendered-but-already-named parts get drawn,
  and only cosmetic bevels get added.
- **No touching `#/studio`'s honest panel or `COMMISSION_FROM`.** The dynamic
  figure is scoped to `#/draw`'s demo-only panel exactly like
  `COMMISSION_DEMO_FIGURE` already was — this doc extends that boundary, it
  doesn't move it.
- **No pre-bake species selection**, per item 9's reasoning.

## Open questions only Daniel can answer

1. Should the demo commission figure ever read BELOW £150,000 (a lighter
   species / smaller draw), or should it stay floored at the stated number
   the way I've spec'd it? (Part 2, item 6.)
2. Seven swatch colors vs. the house's one-colour restraint — my call is
   "informational, not decorative," but it needs an eyes-on look before
   Edward locks the hex values. (Part 3, item 11.)
3. Should the species row show all 7 species, or only the featured trio
   (clematis/wisteria/jasmine) the original demo-spec called out, with the
   rest held back for a future "designer follow-up" surface? I spec'd all 7
   because the screen has room and every one is a real structural option,
   but this is a scope call, not a technical one.

## Files this touches (build order)

1. `src/scene/Folly.tsx` — chamfered tessellation in `prismsToGeometry`;
   `instanceColor` wiring for the fastener/structural split.
2. `src/scene/connectors.ts` — dome-nut cap instances, ground-screw-stub
   instances, the second `SteelOwner`-parallel array tagging fastener vs.
   structural.
3. `src/ui/priceCopy.ts` — `commissionDemoFigureGBP`, `commissionDemoLabel`,
   and the named constants above; keep `COMMISSION_DEMO_FIGURE`/
   `COMMISSION_DEMO_LABEL` as documentation of the calibration point.
4. `src/ui/priceCopy.test.ts` — pin the reference-bake case at exactly
   £150,000, the floor clamp, and monotonic species ordering.
5. `src/ui/useCountUp.ts` — new hook, plus a small test if it can be pinned
   without a DOM (reduced-motion branch at minimum).
6. `src/pages/draw/speciesSwatch.ts` — new, `SPECIES_SWATCH` map + a test
   that every `SPECIES` id has an entry (same "new export → add it here"
   invariant `priceCopy.test.ts` already uses for `ALL_COPY`).
7. `src/pages/draw/SpeciesRow.tsx` — new component.
8. `src/pages/DrawPage.tsx` — wire the count-up into the commission figure,
   mount `<SpeciesRow />`, add `tabular-nums`.

Everything here is additive to files already open this session; nothing
requires touching `src/engine/*`.
