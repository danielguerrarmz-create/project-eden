# Handoff — Configurator overhaul: Eden language app-wide

**Date:** 2026-07-05 (second handoff today; see `2026-07-05-eden-rename-and-engine-page.md` for the rename + Engine page)
**Repo:** `~/restless-egg/app` (GitHub `living-eden`) · **Commits:** `f034a5e`, `fedf737`, `3cae3c3` (local, NOT pushed; full unpushed stack is 8 commits back to `ebedd5f`)
**Fleet:** Sai (overhaul spec), Edward (build + patch, hit session limit mid-patch; team lead verified and committed his finished diff), Gojo (gate: GO)

## What

Daniel ordered the Eden language applied to the configurator as a full overhaul: pills, decision-steering flow, simulation scene appearance, copy de-AI-ing, geometric explanatory motion. Spec: `app/docs/CONFIGURATOR-OVERHAUL-SPEC.md`; DESIGN-DIRECTION.md scope note records that Daniel overrode the configurator exemption on 2026-07-05.

- **`f034a5e` (Phase A + A2):** vellum ground app-wide, single ink family via opacity ladder, accent-olive as the only accent (moss/bloom retired, amber kept for warnings), Fraunces retired. Navbar "Living Eden" wordmark, mono links, olive ring on the active step, decision tooltips on done steps. Step 1 Bodoni hero. Step 2: Size and Planting co-equal pill groups with recommended (olive ring + mono tag) and selected (ink fill) states, store tracks `touched`; live price line under the heading ("estimated £x · updates as you choose"); Openness demoted to a slim slider. Step 3: serif price figure, price disclosure and reserve copy rewritten out of dev jargon (the "Placeholder rate. TODO" leak is now a composed honest note). Scene respec: vellum background/fog, near-neutral plot plane with 1m ink grid, ink timber, olive north marker, heatmap glow replaced with an ink→olive lerp, foliage in the olive family.
- **`fedf737` (Phase B):** PlotMapper rebuilt as a technical drawing (hairline plot, real dimension lines with ticks, dotted compass ring); motion tokens in `:root`; step crossfades; plot rectangle draws itself in (stroke-dashoffset) on mount/sample-select, not during drag; Step-2 structure builds upward with per-member stagger on entry and size change, via a fixed-capacity instanced mesh (CAPACITY=260, true max 217) so openness morphs the shape WITHOUT replaying the build. All motion reduced-motion gated.
- **`3cae3c3` (patch round, Edward's diff, verified + committed by team lead):** two-part focus indicator (2px inkBlack outline + vellum box-shadow ring) replacing the olive outline that failed WCAG 1.4.11 at 1.91:1; recommended ring dropped when already selected; sticky CTA rows get vellum fill + hairline top border; dimension labels lowercase "8.0 m"; tooltip aria-describedby.

## Verify

- `npm run build` green (tsc + vite). Dev: http://localhost:5174 (5173 is Daniel's portfolio server).
- **EYES-VERIFIED end to end 2026-07-05** (chrome-devtools): all 3 steps in the Eden language; price reactivity (13,759 → 13,830 on Grand → 9,616 on airy); clamp note "clamped to your plot: max radius 2.4 m" appears for Grand on 8×6; species switch regenerates geometry + engine note; openness max is the legitimate dome→flat-screen morph (looks like a sliver edge-on, NOT a bug), morphs positions without replaying the build; focus ring, lowercase units, sticky CTA fill confirmed post-patch; zero console errors/warnings throughout.
- Gojo gate: **GO.** Store `touched` logic correct (resets on start-over), instanced mesh safe (no origin flash, no leak, bounds ok), reduced-motion fully correct, opacity utilities all generate, engine untouched except sanctioned pricing.ts dash fixes, gitleaks clean, zero Folly/dash/AI-vocab in rendered copy.

## Left

1. **Push**: 8 commits (`ebedd5f`..`3cae3c3`) local only, awaiting Daniel's word.
2. **Cosmetic**: the :focus-visible vellum box-shadow ring is overridden on elements carrying Tailwind ring/shadow utilities (element-level box-shadow wins); the ink outline alone still passes 3:1 on every ground, so WCAG holds, but the nicety is partial. Cheap fix: move the ring to an outline-only double indicator or bump specificity.
3. **Design calls for Daniel/Sai**: (a) once a non-recommended species is picked, the RECOMMENDED caption disappears entirely; keep the steer visible? (b) scene background still keeps a curved gray horizon mass, heavier than pure drawing-sheet; (c) north marker cone reads chunky at some angles; (d) black planting discs are heavy vs the hairline language.
4. **Confirmed non-bug to double-check with the engine someday**: price is identical across species at the same size/openness (member count is size/openness driven); flagged, not changed.
5. Zero test harness (Gojo, project-wide SHOULD-FIX): engine pure functions are ideal vitest targets before the Jul 17 deadline.
6. Edward's fleet memory may be missing this patch round's learnings (he hit his session limit before appending; the patch itself is committed).

## Files

- Spec: `app/docs/CONFIGURATOR-OVERHAUL-SPEC.md` (new), `app/docs/DESIGN-DIRECTION.md` (scope note).
- Code: `index.css`, `tailwind.config.js` untouched this round; steps (`StepSite/StepDesign/StepPreview`), `ui/` (Navbar, ProgressMarker, PlotMapper, CtaLink), `scene/` (Scene, Eden, GardenContext, overlays), `state/store.ts` (`touched`), `pages/engine/hairline.tsx` (uppercase prop), `engine/pricing.ts` (dash fixes only).
