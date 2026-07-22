/**
 * routing.ts — a deliberately tiny hash router (no dependency).
 *
 * THE PUBLIC SITE IS TWO PAGES: the home at `#/` and the about page at `#/about`.
 * Everything engine-facing (the studio/draw tool, the engine walkthrough, the shape
 * and sculpt spikes, the labs) is DEV-ONLY as of 2026-07-21 — Daniel's ruling: the
 * engine "is not something to be proud of at this time", so it comes off production
 * and stays hidden until it is worth showing. The code is untouched and every one of
 * those routes still works under `npm run dev`; see `ENGINE_ROUTES` / `resolveRoute`
 * below and `src/DevRoutes.tsx`. This is a gate, not a deletion.
 *
 * We subscribe to `hashchange` via useSyncExternalStore so back/forward and manual URL
 * edits all work, then normalize the hash to a clean path (`#/about` -> `/about`,
 * empty -> `/`).
 *
 * Note: an in-page anchor like `#register` normalizes to the path `/register`, which is
 * not a known route, so Root falls through to the home splash and the browser scrolls to
 * the matching element id. That is intentional.
 */
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getHash(): string {
  return window.location.hash;
}

/** Current route path, e.g. `/`, `/engine`. SSR-safe fallback of `/`. */
export function useRoute(): string {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const path = hash.replace(/^#/, '');
  return path === '' ? '/' : path;
}

/** Hash hrefs, so links stay real anchors (openable in new tab, no JS needed).
 *  Only `home` and `about` may be linked from a surface that ships to production —
 *  everything below them is dev-only (see `ENGINE_ROUTES`). */
export const routes = {
  home: '#/',
  engine: '#/engine',
  studio: '#/studio',
  about: '#/about',
  /** The drawing flow: pick a site, scribble the plan, drag the spines. The
   *  sliders become a readout of what you drew rather than the design act. */
  draw: '#/draw',
  /** Direct-manipulation shaping prototype (draggable cage, no sliders). */
  shape: '#/shape',
  /** Form-finding spike: sculpt a control lattice, relax onto a buildable gridshell. */
  sculpt: '#/sculpt',
  /** Isolated Phase-1 preview of the procedural botanical generator (not wired in). */
  botanicalLab: '#/lab/botanical',
  /* The two About drafts (#/about/scroll, #/about/ascent) were retired on 2026-07-16.
     Daniel's page at #/about stayed the shell and their generative engine was harvested
     into it as ornament — see docs/handoffs/2026-07-16-about-hybrid.md. */
  /** Curation room for the painterly gongbi engine (pin commission seeds here). */
  gongbiLab: '#/lab/gongbi',
} as const;

/**
 * Every engine-facing path, as normalized route paths (no leading `#`).
 *
 * These render ONLY under `import.meta.env.DEV`. In a production build each one falls
 * through to the home splash, so a stray bookmark or a guessed URL lands somewhere real
 * instead of on a page we are not ready to show. Add a route here the moment you add it
 * to `DevRoutes` — a dev route that is missing from this list is a route that ships.
 */
export const ENGINE_ROUTES: readonly string[] = [
  '/studio',
  '/draw',
  '/engine',
  '/shape',
  '/sculpt',
  '/lab/botanical',
  '/lab/gongbi',
];

/** What a path resolves to. `engine` is only ever returned when `dev` is true. */
export type RouteTarget = 'splash' | 'about' | 'engine';

/**
 * The whole route decision as one pure function, so the production gate is testable
 * without a DOM and without a production build. `dev` is `import.meta.env.DEV` at the
 * call site (Root); Vite folds that to `false` when it builds, which is what makes the
 * engine chunk disappear from the bundle rather than merely go unlinked.
 */
export function resolveRoute(path: string, dev: boolean): RouteTarget {
  if (path === routes.about.replace(/^#/, '')) return 'about';
  if (dev && ENGINE_ROUTES.includes(path)) return 'engine';
  return 'splash';
}
