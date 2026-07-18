# 2026-07-17 — The ladder moved, stewardship arrives, export leaves

Three changes from Daniel, late round, RE going in today.

**Branch `engine-draw`**, on top of `90b0fe0`. **Nothing pushed.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 528/528 · `npm run build` clean.**
Bundle: `three` **1058.37 kB, unchanged.** App chunk 374.9 → 375.2 kB.

## 1. The ladder moved: £150k is the FLOOR now

Daniel's own words supersede the written ladder we shipped this morning: *"core commissions from
£150k, landmark and hospitality pieces into the mid six figures, then for stewardship... roughly
6-10% of install value each year."*

`COMMISSION_RANGE = '£75k to £150k'` → **`COMMISSION_FROM = 'from £150k'`**. One place, as
designed. The £25-50k entry tier is gone from his model; **swept the codebase and no shipped copy
implies one** (the only `75k`/`25k`/`50k` strings left are comments recording the change). No tier
logic built.

**The property that survived the change, deliberately:** a floor cannot be mistaken for a quote,
the same way the old range could not. Both say "at least this"; neither says "this". The tests
that pinned "is a range, never a single figure" now pin "is open-ended, never a single definite
figure" — the assertion moved because the FACT moved, which is the only reason it is allowed to.

**Stewardship is new and it is the most on-thesis number in the model:** recurring revenue that
exists BECAUSE the thing is alive. A pavilion does not need stewarding. It is surfaced beside the
commission on all three surfaces, because it is the same KIND of number — stated, a rate, not
computed. A test asserts it names what the money is FOR, so it can never decay into a maintenance
contract on a shed.

## 2. Export removed — and `exportProject.ts` deliberately KEPT

The two chips are gone from `#/draw`, with the `download()` helper and the imports.

**I did not delete `engine/exportProject.ts` or its tests, and the lead's instinct to check first
was right.** Daniel said *"we will have that later"* — deferred, not cancelled. Keeping it costs
**zero bundle bytes** (nothing imports it, so rollup drops it; the `three` chunk is unchanged and
the app chunk moved only by the copy). What it buys: the drawing format is VERSIONED and is the
contract a future importer must read, and its tests pin the genuinely hard part — tolerant
parsing, junk lines dropped rather than the file thrown away, a missing crown pull defaulting
instead of yielding NaN. Deleting that to rewrite it in a fortnight is pure waste.

The module header now says it has no caller, why, and when to actually delete it. **Nothing in the
test suite pins engine behaviour through export**, so no coverage was lost or relocated — I
checked before deciding.

## 3. Summary cost to construct → expandable itemized

Daniel: *"a summary cost to construct, and then the user can expand it and see their itemized
costs. These numbers will not be accurate but should be faked for the sake of the demo."*

`#/draw`'s post-bake panel now leads with **£15,200 · cost to construct · indicative · pre-quote**,
the BOM line under it, an **itemized** disclosure listing every real build-up line, and below a
rule: the commission floor and stewardship.

**Why this is not a reversal of this morning, and the distinction is exact.** I dropped the £17k
from this panel today arguing that at 26px in a hero frame a number IS a price claim no qualifier
can scope. That argument stands, and it does not apply here, because of the LABEL. Daniel asked
for a *cost to construct*, and a cost is a different KIND of claim from a price. A cost may sit
beside a price and differ from it — the difference is the business. What was indefensible was a
bare figure reading as what the client pays. Nothing about the provenance changed: the rates were
already placeholders, and showing the build-up invents nothing new.

**No rate was moved.** Daniel authorised fake numbers; he did not authorise fabricated evidence.
Choosing rates so the total lands on £150k and then showing that output as evidence FOR £150k is
circular and dies to one question from a technical reader — and he is the one who would be holding
it on camera.

## THE GAP IS NOW ~10x, IT IS ON SCREEN, AND DANIEL SHOULD LOOK AT IT

Flagged, not papered, per the lead.

**~£15k cost to construct against a £150k floor implies ~90% gross margin. The brief's own target
is 35-45%.** Those cannot both be true. This is not resolvable from the UI, and I did not try:

- **Most likely: the placeholder rates are far too low.** Nobody has quoted them — that is the
  demo's loudest TODO. A £15k timber-and-steel garden pavilion, installed and planted, is cheap
  against a market where the brief itself says buyers pay £20-60k *for rectangles*.
- **Or** the cost base and the ladder were built from different assumptions and have never been
  reconciled.

**A related artifact:** `PRICING.marginRate = 0.28` produces a £3,303 margin line, which is
displayed inside the itemization. Under a value-based £150k ladder that line is meaningless — the
real margin would be ~£135k. It is left visible and unmoved because hiding it would be worse and
changing it would be inventing. **It is the clearest single symptom that the cost model and the
ladder have not met.** That is Clay's fab quote landing, or a decision, not a code change.

## Verify

- **528/528**, +7. New: stewardship copy (4), the entry-tier sweep, cost-summary labelling,
  stewardship rendering on both commissioning surfaces.
- **A test caught a real flaw in itself**: the entry-tier assertion `not.toContain('50k')` failed
  against `'from £150k'`, because `50k` is a SUBSTRING of `150k`. Anchored on the currency symbol
  (`£50k`). It would have been just as wrong later, quietly passing on `£250k`.
- **NOT verified live.** No browser tooling here. Layout risk worth one glance: the `#/draw` panel
  grew (summary + a `<details>` + two stated lines) and is bottom-anchored, so the expander grows
  UPWARD — capped at `max-w-[300px]`. It is post-bake (`{baked && ...}`), so it never coexists
  with the guidance rail (`!baked`) or the soft-phase panel.

## Left

- **The margin line / the ~10x gap**: Daniel's, above. Nothing to build until the quote lands.
- The lawn-armed `commitGesture` bug: still held, still post-RE.
- `MIN_POLAR` still 30°, awaiting a photographed measurement now that the skin ships.

## Files

- `src/ui/priceCopy.ts` + `.test.ts` — the floor, stewardship, the cost-summary label, and the
  header explaining what the ~10x gap implies and why no rate was moved.
- `src/pages/DrawPage.tsx` — export chips + `download()` removed; summary/itemized/floor/stewardship.
- `src/ui/PricePanel.tsx` · `CommissionSheet.tsx` · `PricePanel.test.ts` · `src/pages/ShapePage.tsx`.
- `src/engine/exportProject.ts` — header only: kept deliberately, no caller, why, when to delete.
