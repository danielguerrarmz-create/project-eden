# Front-end shipped and LIVE — 2026-07-17

The Bower/Eden front-end is finalized for now and **live on `main` → bowerbuild.org**
(`origin/main` at `8e4da0f`). The site auto-deploys on push to `main` via an external host
(Vercel/Netlify-style — there is no CNAME or GitHub Actions workflow in the repo). Front-end work
pauses here; focus moves to finishing the engine, then merging engine ↔ front-end for the demo.

## What shipped this session

- **Home (`SplashPage.tsx`)** — cut to hero + two product-photo bands + Begin + the monument footer.
  The two product photographs carry the middle bands as an alternating split. Two late copy removals
  (Daniel): the confusing "You shape four things … the same choices always mean the same pavilion"
  line, and the "~158" component count in the CNC-cut ritual step (`ritualSteps` no longer takes the
  count).
- **How it works (`splash/HowItWorks.tsx`, rendered by `engine/EnginePage.tsx`)** — rewritten for a
  complete layperson: four plain beats (shape it → it's real & buildable → a plant grows into it →
  we keep it alive), **two** graphics only (a live "kit of real parts" schematic + a render of a
  grown-in Eden at dusk; the growth video was swapped out per Daniel). **No pricing on this page** by
  ruling — product and process only.
- **Contact email removed** (`data/config.ts`) — no inbox yet, so the two `mailto:` doors went with it;
  the two real doors (Commission one → studio, Who is behind this → about) stayed.
- **About page** — header goes fully transparent (`SplashHeader` `transparent` prop) with a page-wide
  top **fade mask** so scrolling content dissolves before it touches the nav; the duplicated
  image-frame ternary was deduped into one helper; the **2026 graduation photo was removed** (timeline
  ends at 2025, year geometry + tests followed); the "Clay pitching Resia" photo was **swapped to the
  real FFPC landscape shot** (ratio 0.75→1.9025, alt/comments updated, ornament re-baked); a small
  footer closes the page.
- **Small shared `Footer`** (`src/ui/Footer.tsx`) on About + the engine page; home keeps its big
  monument. Skipped on the studio (no-scroll instrument) and the off-nav prototypes/labs.
- **Logos** — four files in `bower-docs/brand/exports/`: `bower-oculus-300.png` / `-hq.png` (main
  Oculus, 300 + 2048 transparent) and `bower-flowermark-300.png` / `-hq.png` (the flowered "branch"
  mark, 300 + 1024, on vellum). The flowered mark was rendered from the About finale mark via a
  throwaway `#/lab/flowermark` route, pinning the lush `pool-a` species; that harness was reverted.
- **Branch cleanup** — Daniel's merged `about-redesign-wip` and `form-finding-core` archived to
  `stale/*` (verified SHA-for-SHA before deletion; their commits also live in `main`). Clay's branches
  (`about-v2-nonflowers`, `bower-respec`, `manufacturable-component-model`) and the active
  `engine-draw` were left untouched, per Daniel.

## Verify

- **Live site checked directly** on bowerbuild.org: reduced home with product photos present, old
  "keeps becoming" band gone, both late copy removals confirmed live.
- Gates green at each push: typecheck (both programs), `npm run test` (529 pass), `vite build`,
  gitleaks. `hero-lockup.mjs` is green for the right reason now (reads `[data-timeline-viewport]`,
  stroke-invariant check added).

## Left / open (none blocking the live site)

- **About spine → founders disconnect (item 1) — NOT fixed.** The unraveled-logo spine sweeps across
  the top and never drops into the founders' vines (~100px above them). It is NOT the 0px trunk-fork.
  Assigned to Edward (`edward-round-11b`) at his session-limit reset; needs measuring at the true
  end-of-track scroll, in motion, at a wide viewport — the About renderer stalls in headless capture.
- **Bower base foliage** — Daniel's by-eye call: leave the closed bower's base a clean binding, or add
  a leaf/bud partway down each side toward the join.
- **Flowered-mark hi-res** — currently 1024 on vellum (screenshot capture; Chrome blocked repeat
  downloads). Can be redone bigger/transparent if wanted.
- **Pack mean floor** was re-baselined 0.90→0.89 for the landscape Resia tile (documented in
  `pack.test.ts`; restore 0.90 if that asset reverts).

## Not ours — kept out of `main`

The splash/seeds WIP (`src/Root.tsx`, `src/pages/splash/HeroScene.tsx`, `src/routing.ts`,
`src/scene/util.ts`, `src/pages/seeds/`) is **another agent's uncommitted work**. It was deliberately
excluded from every commit and push this session and still sits uncommitted in the working tree. Do
not `git add -A`; commit About/home files by explicit path only.

## Next (roadmap — the reason this session closes)

1. **Finish the engine on `engine-draw`** (the commission model, explode / money-hop, stewardship, the
   cost-vs-£150k-floor split). It is diverged from `main` (~31 ahead, behind) and **carries the ACM
   DIS lie in its `src/pages/about/projects.ts` — that MUST be killed before it merges**, or it
   republishes the falsehood we removed on the front-end.
2. **Merge engine ↔ front-end.** Reconcile `engine-draw` onto the current `main` (front-end wins the
   About/Home conflicts; kill the lie), verify, then merge.
3. **Build the demo.**

## Process notes for the next session

- Deploy is external + automatic on push to `main` (rebuild lag ~1–2 min).
- **git state-changes (merge, push, branch delete) are gated by the permission classifier** — Daniel
  approves them or runs them himself with `!`. Branch-create/push went through; the initial merge did
  not.
- **One writer per worktree.** This session spun up two "Edward" builders into the same tree (the
  two-Edwards collision); assign ONE writer and have others hold. Now a standing rule in memory.

## Files (key)

`src/pages/SplashPage.tsx` (+test), `src/pages/splash/HowItWorks.tsx`, `src/pages/splash/copy.ts`,
`src/pages/splash/SplashHeader.tsx`, `src/pages/engine/EnginePage.tsx` (+test), `src/pages/AboutPage.tsx`,
`src/pages/about/{clusters,projects,CrossPathsTimeline}.ts(x)` (+tests), `src/pages/about/pack.test.ts`,
`src/pages/about/subBranches.generated.json`, `src/data/config.ts`, `src/ui/Footer.tsx`,
`public/assets/product/*`, `public/assets/about/timeline/resia-pitch.webp`,
`public/assets/projects/12-resia/resia-clay-pitching.webp`, `bower-docs/brand/exports/*` (logos, private repo).
