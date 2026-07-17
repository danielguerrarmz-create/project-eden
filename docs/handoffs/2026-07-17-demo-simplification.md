# 2026-07-17 — The `#/draw` panel, simplified for a short demo video

Daniel's ruling, 2026-07-17, for a **very short demo video**: *"assume a general
£150,000 (British pounds) figure and do not get into specifics of pricing. This is
for a very short demo, does not have to be true."*

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. **Nothing pushed.
`main` untouched.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 574/574 passing · `npm run build`
clean.** Bundle: `three` **1058.38 kB**, unchanged (no imports added), 41.6 kB of
headroom under the 1100 kB ceiling. App chunk 381.2 → **378.0 kB** (removed JSX and
three imports).

## What

The bottom-left baked-state panel on `#/draw` was the honest cost-vs-commission
panel: a computed cost-to-construct figure, an itemized `<details>` build-up, the
per-piece money-hop attribution, the cost-to-commission bridge paragraph, the
stewardship line, and the demo-scope note. For the demo it is now **minimal and
filmable**:

- **`£150,000`** in the serif hero, mono label **`commission`**.
- One quiet supporting line: the geometry meta line (`14.3 m² · 4 feet · 194 pieces
  · 108 nodes`), which is TRUE, counted off the baked kit, and reads well on camera.
- The explode sequence readout (`ground up · N rings · crown last`) is kept, gated on
  `exploded` — it is part of the explode star, not a pricing claim.

Everything else in that panel was removed.

The **per-piece money hop** was dropped at the wiring level too, not just visually:
`onSelectPiece` is no longer passed to `Folly`, so R3F does not raycast the members
and a stray click on the kit cannot select a part that has nowhere to report to. The
`selectedPiece` state and the `attributionFor` / `selectionLabel` imports went with
it. Side benefit for filming: with no mesh pointer handler, a click-drag on the kit
goes straight to OrbitControls instead of being intercepted.

## Why this is not a silent reversal of the price-honesty pass

**It consciously supersedes the honesty pass FOR THE DEMO, and the honest copy is not
gone.** The whole argument — cost to construct vs stated floor, the ~10x gap on screen
on purpose, the bridge that names the categories and prices none of them — still lives
in git history (commits `dbaaa2a`, `118c233`, `8d1c304`, `dfa8d15`) and, crucially,
**still renders on `#/studio`** (PricePanel + CommissionSheet), which the demo does not
film. When the demo is cut, the honest panel comes back: none of its machinery was
deleted.

- `ui/priceCopy.ts` keeps every constant (`COST_SUMMARY_LABEL`, `COST_BUILDUP_*`,
  `COST_TO_COMMISSION_BRIDGE`, `STEWARDSHIP_*`, `COMMISSION_FROM`, `DEMO_SCOPE_NOTE`,
  …) and its full header. Added two demo constants: `COMMISSION_DEMO_FIGURE`
  (`£150,000`) and `COMMISSION_DEMO_LABEL` (`commission`), each with a note saying
  they are demo-only and why.
- `ui/costAttribution.ts` (the money-hop tiering) is untouched and still tested.
- Same reasoning as `engine/exportProject.ts` being kept: **rollup drops the now-unused
  exports**, so the `three` chunk is byte-identical and there is zero cost to keeping
  the honest machinery in the tree.

## Tests

- **`priceCopy.test.ts`**: added `COMMISSION_DEMO_FIGURE` / `COMMISSION_DEMO_LABEL` to
  the `ALL_COPY` dash-check array (the module's "new export => add it here"
  invariant), plus a small block pinning the demo figure is `£150,000` and the label
  is short lowercase mono. The existing blocks that pin the honest copy (floor,
  stewardship, build-up, bridge, scope) are **unchanged and still pass** — those
  constants still serve `#/studio`, so their assertions did not move.
- **`PricePanel.test.ts`**: untouched and green. It pins the `#/studio` surfaces,
  which this change does not touch.
- No `#/draw`-panel JSX test exists (never did), so nothing there needed narrowing.

## Verify — static only, and honest about it

- **`tsc` 0, `vitest` 574/574, `vite build` clean.** `three` 1058.38 kB, unchanged.
- **NOT verified live in a browser.** No puppeteer in this worktree and no Chrome MCP
  in this agent's context. Chrome is installed but nothing was driven through it.
  These are copy + JSX-removal changes, so the residual risk is visual, not logical:
  the panel got SHORTER (a hero line + one meta line + an optional readout), and it is
  bottom-anchored, so it can only shrink upward. **Someone should glance at `#/draw`
  after bake and after explode at 1440x900 before filming**, but there is no layout
  growth to fear.

## Left / for Daniel to decide

- **Do not film `#/studio` alongside `#/draw`.** `#/studio` still shows the honest
  cost-to-construct build-up (~£15k) beside the `from £150k` floor. On its own that is
  correct and defensible; on camera next to the `£150,000` demo panel it would put a
  ~£15k and a £150,000 in the same cut. The demo arc is `#/draw` only, so this is a
  don't-film note, not a change to make. Say the word and I will narrow `#/studio` to
  the floor for the demo too.
- **`£150,000` vs `from £150,000`.** Shipped the flat figure — one clean number films
  best and Daniel authorised a general figure. If he prefers the open-ended read,
  it is one string in `COMMISSION_DEMO_FIGURE`.
- The pricing questions the honesty pass surfaced (the fab quote, the ~10x cost/floor
  gap, the margin line) are all still real and still deferred. This demo pass does not
  touch them; it steps around them for the video.

## Files

- `src/pages/DrawPage.tsx` — panel rewritten to the minimal demo form; money-hop
  selection state + `onSelectPiece` removed; unused price/text imports trimmed.
- `src/ui/priceCopy.ts` — added `COMMISSION_DEMO_FIGURE` / `COMMISSION_DEMO_LABEL`
  with a demo-only note; everything else kept.
- `src/ui/priceCopy.test.ts` — cover the two new constants; honest-copy blocks intact.
