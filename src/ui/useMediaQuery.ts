/**
 * useMediaQuery.ts — subscribe to a CSS media query from React.
 *
 * The sibling of useReducedMotion (same shape, same SSR guard): decide synchronously on the first
 * client render so there is no post-mount flash, then keep in sync via the MediaQueryList `change`
 * event. The About timeline uses it to MOUNT one tree or the other at the `lg` (1024px) structural
 * breakpoint — the drawn scroll-scrubbed SVG above it, the DOM/flexbox vertical timeline below — so
 * the heavy desktop camera machinery (a 7645-unit-tall scroll track, rAF smoothing, autoplay) never
 * runs on a phone, and the desktop `data-timeline-camera` svg is simply absent there rather than
 * hidden. A conditional mount, not a `hidden lg:block` CSS swap: the two trees never coexist in the
 * committed DOM, which is what keeps the founders-parenthesis `[data-timeline-camera]` lookup honest.
 */
import { useEffect, useState } from 'react';

function match(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => match(query));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    // Re-read on mount: the query string can change between renders, and the initial state was set
    // for whatever it was on first paint.
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The About timeline's structural cutover, Tailwind `lg`. Desktop drawn timeline at and above this;
 *  the mobile DOM timeline below it. Kept here as the one place the number lives. */
export const LG_QUERY = '(min-width: 1024px)';
