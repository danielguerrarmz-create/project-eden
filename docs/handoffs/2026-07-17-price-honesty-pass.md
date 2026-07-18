# 2026-07-17 — The price honesty pass, across every surface

Daniel's ruling, 2026-07-17: **state the commission range as a stated range; the engine stops
claiming its figure is the price; the BOM stays live because it is TRUE.**

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. **Nothing pushed. `main`
untouched.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 468 passing · `npm run build` clean.**
Bundle: `three` **1058.37 kB**, byte-identical to before (no imports added, 42 kB headroom intact).

> **5 tests fail in `src/pages/draw/entryBearing.test.ts`. They are NOT from this work.** They
> belong to the uncommitted scale-figure changes already in the tree (`entryBearing.ts` was
> rewritten to billboard the figure and retarget 150° → 110°; its test still asserts the old
> behaviour). Proven, not assumed: stashing those three files and re-running gives 15/15 green.
> They are left exactly as found, per instruction. **Whoever owns that work has a real failure
> to fix.**

## What

The demo had two numbers ~6x apart, neither grounded: a computed **~£17k** on camera, and a
deck claiming a **£75–150k** installed ladder. The fab-shop £/component quote never landed, so
every rate in `PRICING` is a placeholder. Nothing here closes that gap. **The gap is real and
stays visible.**

The fix is a distinction, now enforced in one place (`src/ui/priceCopy.ts`):

- **COMMISSION RANGE `£75k to £150k`** — STATED. The ladder's core-product tier (pavilion /
  studio / sauna, installed and planted). No code computes it; it does not move when you shape.
- **COST BUILD-UP (~£15–17k)** — COMPUTED. Real BOM × placeholder rates. It moves correctly.
  It is the cost of a kit and its install. **It is not a price.**

They are ~6x apart because they measure different things: one is cost-plus, one is value-based.
Rendering them as the same kind of number was the whole bug.

## The surface was 5 pages, not 2

The brief named `#/draw` and `#/studio`. The sweep found **three more**, and one of them carried
the strongest claim in the demo:

| Surface | Was | Now |
|---|---|---|
| `#/draw` HUD | `£17,000  indicative · pre-quote` | `194 pieces  cut list, live` + BOM line; stated range below a rule |
| `#/studio` `PricePanel` | **"YOUR PRICE, FIXED £15,200"** | Range headline; build-up moved into the disclosure |
| `CommissionSheet` | **"£15,200 FIXED"** / *"the number is a commitment, not an estimate"* | Range hero; build-up below, labelled, with its admission |
| `ReserveCTA` | **"Hold this design · £15,200"** | "Hold this design". Figure removed, not qualified. |
| `#/shape` | **"fixed price · grammar"** | "kit and install · grammar" + qualifier + stated range |
| `SplashPage` | "The price is computed from the same cut list a fabricator would quote from" | Keeps the true half (cut list is real), drops the implication the price is quote-grade |

**Found only by mutation-testing the new test** (the failure dumped the rendered HTML):
`pricing.ts` was emitting the line label **"Margin & fixed-price guarantee"** with the note
**"this is what makes the figure fixed"**, rendering straight into the build-up underneath a
panel that had just finished admitting the figure is not fixed. Grep for `fixed` never surfaced
it, because it reads as a label, not a claim. Now "Margin & contingency".

## Judgement call: the ~£17k is GONE from `#/draw`

Recommended and taken. It stays inspectable on `#/studio` and the sheet.

The hero shot's money moment is now *"your two crude drags became 194 real cut pieces"* — which
is the engine's actual claim and one it can fully support, since the counts are read off the
baked geometry.

Why the figure had to go rather than be scoped:

1. **At 26px in a hero frame, a number IS a price claim.** No 9px qualifier scopes it. The
   previous handoff records the money shot as "Final reads £17,000" — that is what a viewer
   takes away, qualifier or not.
2. **It is ~6x off what an Eden is actually commissioned for.** A viewer who sees £17k on
   camera and then hears £75–150k concludes the demo lied. The figure actively misinforms about
   the one thing it cannot support: magnitude.
3. **It has no audience.** It is not a quote, not the commission price, not a number any client
   pays. On `#/studio`, inside a disclosure, a technical reader has room to read what kind of
   number it is. In a hero HUD there is no such room.
4. **The decomposition survives, and it was always the credible part.** Footprint / feet /
   pieces / nodes are counted off the real kit and are true right now.

## Verify — and the honest limit

- **Both commissioning surfaces genuinely render** and are asserted at the SURFACE, not just as
  string constants: `src/ui/PricePanel.test.ts` renders `PricePanel` + `CommissionSheet` to a
  string in the DOM-free node env (same trick `SplashPage.test.ts` uses) and asserts the range
  is present, the admissions travel with the figure, and the word "fixed" appears **nowhere a
  client can read it** (tags stripped, so Tailwind's `class="fixed inset-0"` cannot false-pass).
- **The test has teeth, proven by mutation**: reintroducing "your price, fixed" fails it; the
  same run is what exposed the `pricing.ts` labels above.
- **NOT verified live in a browser.** No browser tooling was reachable from this context
  (no puppeteer installed, no Chrome MCP in this agent). The dev server answers 200 on
  http://localhost:5333 but **nothing was driven through it.** These are copy + layout changes,
  so **the residual risk is visual, not logical**: the `#/draw` HUD grew from 2 lines to 4 (a
  rule + 2), and `£75k to £150k` in the sheet hero is a longer string than the figure it
  replaced (hero clamp reduced 3.75rem → 3rem to compensate, `flex-wrap` already present).
  **Someone should look at those two panels at 1440x900 before this goes on camera.**

## Left / open for Daniel

- **The ladder itself is still marked "proposed, DECISION open"** in the private brief. That is
  why every string says "typically" and none says "your price". If you settle it, the bounds
  live in exactly one place: `COMMISSION_RANGE` in `src/ui/priceCopy.ts`.
- **£75–100k is not written anywhere.** The brief says core product **£75–150k**; the `~£100k`
  is a separate competitive claim ("a third of the architect-led route"). I shipped £75k to
  £150k, which is what the ladder actually says.
- **Which tier is the drawn object?** The ladder splits entry piece (screen / arbor / **small
  open bower**) £25–50k from core product (pavilion) £75–150k. `#/draw` can build things that
  read as either, and the engine cannot tell which tier a form is. I did **not** make the range
  tier-aware: that would be inventing a rule with no basis. It states the core-product range
  flat. **If the demo draws entry-tier objects, this range is too high for them.**
- The fab quote. Everything above is scaffolding around its absence.

## Files

- `src/ui/priceCopy.ts` + `.test.ts` — **MOVED** from `src/pages/draw/` (it now serves four
  surfaces, and `ui/` importing from `pages/draw/` was backwards). Carries the stated-vs-computed
  distinction and the "do not close the gap in code" warning. 15 tests.
- `src/ui/PricePanel.test.ts` — **NEW.** The surface-level pin. 7 tests.
- `src/ui/PricePanel.tsx` · `CommissionSheet.tsx` · `ReserveCTA.tsx` — rehomed hero, honest build-up.
- `src/pages/DrawPage.tsx` · `ShapePage.tsx` · `SplashPage.tsx` — HUD, readout, coda.
- `src/engine/pricing.ts` · `types.ts` · `data/config.ts` — labels + headers that argued FOR "fixed".
- **`PriceBreakdown.fixedTotalGBP` → `costBuildUpGBP`** (13 sites, tsc-verified). The identifier
  was how "fixed" kept regenerating in the copy: a dev reading `fixedTotalGBP` writes "fixed".

## Gotcha earned here

**zustand + `renderToString` serves `getServerSnapshot`, which is the store's INITIAL state.**
`setState` before an SSR render is silently ignored, so `CommissionSheet` (gated on
`commissionOpen`) rendered as `''` and every assertion passed vacuously against an empty string.
A module mock that reads the real initial state and flips the one flag is the way. **Any future
SSR-string test of a state-gated component will hit this**, and it fails quietly — the component
returns null and `not.toContain` assertions all pass.
