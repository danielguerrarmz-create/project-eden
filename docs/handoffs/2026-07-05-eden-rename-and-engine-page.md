# Handoff — Eden rename + Engine page (Eden design language, v1)

**Date:** 2026-07-05 · **Session model:** Fable 5
**Repo:** `~/restless-egg/app` (public GitHub **`living-eden`**, renamed from `living-folly` this session; old URL redirects) · **Commits:** `ebedd5f` → `54f6453` (5 new, local, NOT pushed)
**Fleet:** Edward (rename, foundation, page build), Sai (design direction + page spec), Gojo (QA gate: GO, no blockers)

## What

1. **Product renamed Folly → Eden everywhere.** `ebedd5f`: 21 files, `Folly.tsx` → `Eden.tsx`, `FollyGeometry` → `EdenGeometry`, title/meta/OG, package `living-eden-commissioner`, README, out-of-repo docs. GitHub repo renamed to `living-eden` with Daniel's explicit OK; local remote repointed. Zero residual "folly" mentions (the stress-test doc's term-of-art line now says "ornamental-garden-structure lane").
2. **Eden design language documented** (`05a4dde`, `app/docs/DESIGN-DIRECTION.md`, Daniel signed off): editorial high-contrast serif + flat acid fields + hairline technical linework, per the accelerator founder's hint ("hairline technical style drawings and diagrams for internal + LP facing materials") and three type-specimen references (kept in Downloads, NOT in repo). Tokens: field-blue `#C3DEF2`, field-chartreuse `#D8F27E`, field-yellow `#F0CE1B`, ink-navy `#232C5E`, ink-black `#17160F`, accent-olive `#ACC13A`, paper-vellum `#FBF9F3`. Type: Freight Big Pro is the licensed target; shipped with Source Serif 4 Variable (display), Bodoni Moda (single hero/pull-quote voice), IBM Plex Mono (annotations), Inter stays for UI. Scoped as a coexisting layer: the configurator keeps its paper/moss identity.
3. **Foundation** (`ea25468`): Tailwind field/ink tokens added alongside the untouched paper/moss set; three fonts self-hosted via @fontsource; dependency-free hash router (`src/routing.ts`, useSyncExternalStore on hashchange), `#/engine` route, quiet "the engine" navbar link.
4. **Engine page** (`912d76e` + copy reframe `54f6453`, from Sai's `app/docs/ENGINE-PAGE-SPEC.md`): six full-bleed field sections, one italic word per heading, and four hairline SVG diagrams that render LIVE engine output (no hand-typed numbers): D1 pipeline + dimensioned plan/elevation from `ribProfile()`, D2 `computeSunPath()` arc + 8-sector compass from `exposureBySector`, D3 four `computeStrutField()` species small multiples, D4 year 0/1/3 growth from `leafDensity01` + `computeEcology()` strip. Closing honesty section states envelope-clamp / rule-of-thumb / projection boundaries; no margin, certification, or insurer claims anywhere (stress-test discipline).

## Why

Founder gave a direct style steer for the generative engine page and LP materials; the rename to Eden is the Day-3 name decision landing. The page doubles as the LP-facing "the engine is real" proof: every diagram is computed by the same functions the configurator uses.

## Verify

- `cd ~/restless-egg/app && npm run build` — green (tsc + vite).
- `npm run dev` → http://localhost:5174/#/engine (5173 is Daniel's portfolio dev server). EYES-VERIFIED full-scroll 2026-07-05: all six sections, fonts, and all four diagrams render; compass E-sector highlight correct; configurator route unregressed; zero console errors/warnings on both routes. Screenshots delivered in-session.
- Gojo QA gate on the full diff: **GO, no blockers.** Notables: the dash removal in shared engine strings (strutOptimizer/growth/species) is safe because a runtime `deDash` layer in `src/ui/text.ts` already neutralized dashes for the configurator and nothing parses the old format; "sunniest face = E" at the symmetric solstice default is a first-wins argmax tie artifact, not a bug (page copy now explains it as an insight).

## Left

1. **Push to GitHub `living-eden`** — all 5 commits local; awaiting Daniel's word (his standing preference).
2. **Zero test harness** (Gojo's one SHOULD-FIX, project-wide): the engine's pure functions are ideal vitest targets; worth a pass before the Jul 17 deadline crunch.
3. Freight Big Pro licensing decision (Adobe Fonts) if the LP materials should use the real face; Source Serif 4 is the shipped stand-in.
4. The three non-code proofs still gate everything (stress-test §9): stamp call, insurer call, real CNC fab quote → `PRICING.ratePerComponentGBP`.
5. Dev-server gotcha worth remembering: a running Vite does NOT pick up `tailwind.config.js` edits made by another process; restart the dev server after token changes (bit us this session, fixed by restart; production build unaffected).

## Files

- New: `app/docs/DESIGN-DIRECTION.md`, `app/docs/ENGINE-PAGE-SPEC.md`, `src/routing.ts`, `src/pages/` (Engine page modules, 8 new), this handoff.
- Renamed: `src/scene/Folly.tsx` → `src/scene/Eden.tsx`.
- Touched: `tailwind.config.js`, `main.tsx`, `App.tsx`, `ui/Navbar.tsx`, `index.html`, `package.json`/`package-lock.json` (3 @fontsource packages), shared engine strings (`strutOptimizer.ts`, `growth.ts`, `species.ts`), README, out-of-repo docs under `~/restless-egg/docs/`.
