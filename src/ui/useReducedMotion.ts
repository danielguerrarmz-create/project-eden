/**
 * useReducedMotion.ts — respect the OS "reduce motion" preference.
 *
 * Returns true when the user has asked for reduced motion. The scene uses it to
 * stop auto-rotating the stage and to SNAP the growth animation instead of
 * easing it in, and the CSS layer kills its keyframes to match. Vestibular
 * safety + a calmer demo for anyone who needs it.
 */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function initial(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(initial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
