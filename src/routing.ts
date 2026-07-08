/**
 * routing.ts — a deliberately tiny hash router (no dependency).
 *
 * Bower is one company with one product, Eden, so the company home IS the Eden
 * splash. Destinations: the combined landing at `#/` (which carries a condensed
 * engine section anchored `#how-it-works`), the full engine walkthrough at
 * `#/engine`, and the studio (the configurator) at `#/studio`. We subscribe to
 * `hashchange` via useSyncExternalStore so back/forward and manual URL edits all
 * work, then normalize the hash to a clean path (`#/studio` -> `/studio`, empty -> `/`).
 *
 * Note: an in-page anchor like `#how-it-works` normalizes to the path
 * `/how-it-works`, which is not a known route, so Root falls through to the home
 * splash and the browser scrolls to the matching element id. That is intentional.
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

/** Hash hrefs, so links stay real anchors (openable in new tab, no JS needed). */
export const routes = {
  home: '#/',
  engine: '#/engine',
  studio: '#/studio',
  about: '#/about',
  /** Direct-manipulation shaping prototype (draggable cage, no sliders). */
  shape: '#/shape',
} as const;
