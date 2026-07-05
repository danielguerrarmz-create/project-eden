/**
 * routing.ts — a deliberately tiny hash router (no dependency).
 *
 * Only two destinations exist: the configurator (any route) and the Engine
 * explainer at `#/engine`. We subscribe to `hashchange` via useSyncExternalStore
 * so back/forward and manual URL edits all work, then normalize the hash to a
 * clean path (`#/engine` -> `/engine`, empty -> `/`).
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
  configurator: '#/',
  engine: '#/engine',
} as const;
