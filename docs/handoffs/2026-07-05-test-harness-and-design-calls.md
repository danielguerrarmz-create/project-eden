# Handoff — Engine test harness, focus-ring fix, design-calls memo

**Date:** 2026-07-05 (third handoff today; follows `2026-07-05-configurator-overhaul.md`)
**Repo:** `~/restless-egg/app` (GitHub `living-eden`) · **Commits:** `f416c14`, `31dac9a`, plus this docs commit (local, NOT pushed; full unpushed stack now 11 commits back to `ebedd5f`)
**Fleet:** Edward (vitest harness + focus fix), Sai (design-calls decision memo), lead verified independently

## What

1. **Vitest harness + 41 engine unit tests (`f416c14`)** — closes Gojo's project-wide SHOULD-FIX. Node env, pure functions only, no DOM/R3F; `npm run test`; tests colocated as `src/**/*.test.ts` and typechecked by the build's tsc. Coverage: geometry (clamp envelope, orientation wrap, member count swept over the full input space against CAPACITY 260 with the true peak 217 locked so an envelope bump fails loudly, brace threshold, determinism), pricing (density and footprint reactivity, totals reconcile, plant counts, species-invariance characterization test flagged for future engine review), sunpath (determinism, latitude, normalized exposure, the exact E over W solstice tie resolved by lower index, intended), growth (monotonic year 0 < 1 < 3, capped), store (Grand on 8x6 clamps to 2.4 m), text (deDash strips every em and en dash from rendered copy).
2. **Focus-ring fix (`31dac9a`)** — closes handoff Left item 2. `:focus-visible` bumped to specificity (0,2,0) via doubled pseudo-class so the vellum gap-ring survives Tailwind ring/shadow utilities. The WCAG 3:1 inkBlack outline was never at risk (utilities set box-shadow, not outline).
3. **Design-calls memo (Sai)** — `app/docs/design-calls-2026-07-05.md`: recommendations plus exact file and value changes for the 4 open calls: (a) keep a plain-text recommended tag on the pill after touch, ring still retires; (b) lighten the ground disc toward vellum and tighten fog, do not remove (ContactShadows needs it); (c) north cone becomes a thin unlit pole-and-pennant, meshBasicMaterial; (d) planting discs become thin ring outlines per the open-circle convention. Bonus flag: audit any 3D mesh meant to read as a hairline mark for unlit meshBasicMaterial, possibly Eden's timber cylinders.

## Verify

- `npm run test`: 41/41 green in ~1.3 s (lead re-ran independently).
- `npm run build`: green (tsc + vite), tests tree-shake out of the bundle.

## Left

1. **Push**: 11 commits (`ebedd5f`..HEAD) local only, awaiting Daniel's word.
2. **Daniel rules on the 4 design calls** in `app/docs/design-calls-2026-07-05.md`; Edward can execute directly from the memo.
3. Surfaced by tests, flagged not changed: price is fully species-invariant at fixed geometry (species only drives the planting label; planting is flat £55/plant); member count depends only on latticeDensity.
4. RE application deadline **Jul 17 2026**; remaining app-side risk items live in `docs/stress-test-2026-07-03.md`.

## Files

- Tests: `src/engine/*.test.ts`, `src/state/store.test.ts`, `src/ui/text.test.ts`, `src/engine/_fixtures.ts`, `package.json` (vitest, test script).
- Focus fix: `src/index.css`.
- Memo: `app/docs/design-calls-2026-07-05.md`.
