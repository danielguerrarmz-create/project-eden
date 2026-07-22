# 2026-07-21 — the engine comes off the live site

## What

The public site is now **two pages**: the home at `#/` and the about page at `#/about`. Nothing else.

Every engine-facing route is **dev-only**, gated on `import.meta.env.DEV`:

| route | what it is |
|---|---|
| `#/studio` | the draw tool (the engine) |
| `#/draw` | the same page, alias |
| `#/engine` | the six-section walkthrough |
| `#/shape` | direct-manipulation prototype |
| `#/sculpt` | form-finding spike |
| `#/lab/botanical` | procedural botanical preview |
| `#/lab/gongbi` | gongbi curation room |

They all still work under `npm run dev`. In a production build every one of them falls through to the
home splash.

Removed from the surfaces that stay live:

- **Nav** (`SplashHeader.tsx`): `how it works` and `studio` are out of `NAV_LINKS`, which is the one
  array both the desktop pill and the `md`-breakpoint hamburger dropdown render from, so both lost
  them together. `about` is the whole nav now.
- **Footer** (`ui/Footer.tsx`): the same two links, gone.
- **Home** (`SplashPage.tsx`): the `#/engine` link out of band 2, the `id="how-it-works"` anchor on
  band 2, and the "Commission one" door in the close.
- **Hero** (`splash/HeroReveal.tsx`): both CTAs, "Shape your Eden" (`#/studio`) and "See how it
  works" (`#/engine`).

## Why

Daniel's ruling: the Studio/Engine "is not something to be proud of at this time", so it comes off
production entirely and stays hidden while it is rebuilt.

**A gate, not a deletion.** Not one line of engine code was removed — the whole point is to keep
building it locally. The mechanism is the ternary at the top of `Root.tsx`:

```tsx
const DevRoutes = import.meta.env.DEV
  ? lazy(() => import('./DevRoutes').then((m) => ({ default: m.DevRoutes })))
  : null;
```

Vite folds `import.meta.env.DEV` to `false` when it builds, the dead branch takes its `import()` with
it, and the engine is never emitted into the production bundle at all. That is stronger than an
unlinked route: the code is not merely unreachable, it is not there.

**Two decisions worth naming, because they are the ones a future reader will question:**

1. **Band 2 of the home stays.** The brief said "remove the condensed how-it-works band", and the
   doc comments did describe it that way — but the 2026-07-17 reduction had already stripped the
   engine diagrams out of it, and what is left is one of the two product photographs the brief also
   says must stay. So the band and its photo stayed; its engine *link* and its `#how-it-works`
   *anchor* went. Removing the whole section would have deleted a product photo to satisfy a stale
   comment.
2. **The hero now has no CTA.** Both of its buttons pointed into hidden routes. A hero button that
   lands you on the page you are already on is worse than no button, so they were removed rather than
   repointed at `#register`. **This is a live product gap**: the register-interest form in the
   "Begin." section is the home's only conversion point until the engine returns. Repointing or
   relanding is Daniel's call, not a mechanical one, and the removal is commented at the site.

## Verify

All run in `C:\Users\danie\restless-egg\engine-session` on `feat/hide-engine`.

| gate | result |
|---|---|
| `npm run typecheck` (both programs) | clean |
| `npm run test` | **834 passed, 56 files — five separate runs**, per CLAUDE.md's "a single green run is not evidence" |
| `npm run build` | clean |
| `npm run qa:nav` | 14/14 |
| `gitleaks detect` | 248 commits, no leaks |

**The gate was verified in a real browser, both ways** (throwaway puppeteer probe over `qa/lib.mjs`,
17 checks each):

- against `vite dev` — all seven engine routes still render their own page; home nav is `#/about`
  only; no engine href anywhere on the home; no orphan `#how-it-works`; `#/about` timeline intact.
- against `vite preview` of the real production build — all seven fall through to the home.

**The new regression test was sabotage-checked**, not just observed green. Three deliberate breaks,
three failures:

- a static `import { DrawPage }` added to `Root.tsx` → the static-import guard fails
- `resolveRoute` changed to ignore `dev` → the dev-only truth table fails
- `/studio` dropped from `ENGINE_ROUTES` → the coverage list fails

**Bundle**, measured against a stashed build of `origin/main` on the same machine:

| | before | after |
|---|---|---|
| `index-*.js` | 556.06 kB | 428.17 kB |
| 3D vendor chunk | 1,067.40 kB | 146.46 kB |
| **total JS** | **1,623 kB / 496.7 kB gzip** | **575 kB / 200.9 kB gzip** |

The home page ships **65% less JavaScript**. Three.js is gone from production entirely — grepping the
production bundle finds no draw tool, no walkthrough, no labs.

That is also why `vite.config.ts`'s manual chunk was renamed `three` → `vendor`: with every three.js
importer behind the gate, rollup shakes the 3D stack out and what is left in that chunk is react-dom.
The chunk kept working and its *name* had become a lie.

`tsconfig.json` gained `vite/client` in `types` (for `import.meta.env`). The narrow `types` array is
load-bearing in this repo — it is what keeps node globals out of browser code — so it was re-verified
the way that file's own comment describes: `const x: string = process.cwd()` dropped into a component
still errors. `vite/client` brings no node globals.

## Left

- **The hero has no call to action.** See decision 2 above. Needs a product call.
- **The home's copy still narrates the engine** — band 2 says "An engine computes a one of a kind
  timber structure", and ritual step 1 is "Shape it in the studio". Neither is a link, and both were
  left alone: rewriting the product story is Daniel's/Sai's call, not a side effect of hiding a
  route. Worth a look if the site should stop implying a tool you can use today.
- **RULED 2026-07-21, both of the two above: LEAVE THEM.** Daniel was shown the choice (leave it /
  rewrite the copy with Sai / put a register CTA back in the hero) and chose to leave it and revisit
  when the engine returns. So the hero stays CTA-less, the engine language stays in band 2 and in
  ritual step 1, and the register form remains the home's only door. **This is a decision, not an
  oversight — do not "fix" it as a drive-by.** Reopen it only if Daniel does, or if the engine comes
  back and the copy is then telling the truth again.
- The "Begin." close now has one door where it had two; the grid is still `sm:grid-cols-2`, so the
  single door sits in the left column. Fine, but it was not redesigned.
- `qa/capture-matrix.mjs` still captures `#/engine`. That is correct — it runs against dev, where the
  route lives — but it will never again reflect anything a visitor can see.
- `/lab/seeds` is NOT covered here: it does not exist on `main`, it is uncommitted WIP on the
  `about-round-10` branch. Whoever lands that branch must add it to `ENGINE_ROUTES` **and**
  `DevRoutes`, or it ships. The coverage test in `routing.test.ts` is where that will be noticed.

## Files

Changed:

- `src/Root.tsx` — the gate; doc comment rewritten to describe the two-page site
- `src/DevRoutes.tsx` — **new**; every engine route, in the module production never loads
- `src/routing.ts` — `ENGINE_ROUTES`, `RouteTarget`, `resolveRoute()`; doc comment rewritten
- `src/routing.test.ts` — **new**; the dev-only truth table + the Root wiring guard
- `src/pages/splash/SplashHeader.tsx` — `NAV_LINKS` is `about` only
- `src/ui/Footer.tsx` — same two links removed
- `src/pages/SplashPage.tsx` — engine link, `#how-it-works` anchor, "Commission one" door
- `src/pages/splash/HeroReveal.tsx` — both CTAs, and the now-unused imports
- `src/pages/SplashPage.test.ts` — rewritten to the new truth; adds an href sweep that fails on *any*
  link off the two public routes, rather than naming the ones we remembered removing
- `src/pages/splash/HeroReveal.test.ts` — asserts the CTAs are gone
- `src/pages/engine/EnginePage.test.ts` — the nav assertion, which asserted the removed entries
- `qa/header-nav.mjs` — read the dropdown's expected links off the inline pill instead of a hardcoded
  `3`, and fail on any nav href that is not a public route
- `vite.config.ts` — manual chunk `three` → `vendor`, with the measurement in the comment
- `tsconfig.json`, `tsconfig.tests.json` — `vite/client` in `types`
