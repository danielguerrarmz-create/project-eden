/**
 * routing.tsx — a deliberately tiny history router (no dependency).
 *
 * Three destinations exist: the configurator at `/`, the Engine explainer at
 * `/engine`, and the company page at `/company`. Routes are clean paths, not
 * hash fragments: `useRoute` reads `location.pathname` via
 * useSyncExternalStore, subscribed to `popstate` (back/forward) plus a local
 * event fired on pushState, which browsers emit no event for.
 *
 * `RouteLink` keeps every route link a real anchor — openable in a new tab,
 * crawlable, works without JS — but upgrades a plain left-click to pushState
 * instead of a full reload, so the studio's in-memory design survives a round
 * trip through the documentation layer.
 *
 * Clean paths need the server to rewrite unknown routes to index.html. The
 * Vite dev server and `vite preview` already do (SPA fallback); whatever
 * hosts production must match. Legacy `#/engine`-style hash links redirect
 * once at load so old shared links keep working.
 */
import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

/** Hrefs for every destination, so links stay real anchors. */
export const routes = {
  configurator: '/',
  engine: '/engine',
  company: '/company',
} as const;

// pushState fires no browser event; RouteLink dispatches this one instead.
const NAV_EVENT = 'bower:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

function getPath(): string {
  return window.location.pathname;
}

/** Current route path, e.g. `/`, `/engine`. Trailing slashes fold in. SSR-safe fallback of `/`. */
export function useRoute(): string {
  const path = useSyncExternalStore(subscribe, getPath, () => '/');
  const clean = path.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/** A real anchor that upgrades a plain left-click to a pushState navigation. */
export function RouteLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Modified or non-primary clicks keep native anchor behavior (new tab, etc.).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
      window.dispatchEvent(new Event(NAV_EVENT));
    }
    window.scrollTo(0, 0);
  };
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

// Legacy hash routes (`/#/engine`) — rewrite once at load so old links keep
// working. The design query string, if any, survives the rewrite.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const path = window.location.hash.slice(1).replace(/\/+$/, '') || '/';
  window.history.replaceState(null, '', `${path}${window.location.search}`);
}
