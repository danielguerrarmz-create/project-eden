/**
 * useCountUp.ts — ease a displayed number toward a target, interruptibly.
 *
 * Used by the `#/draw` demo commission figure so it settles into place as the
 * lattice finishes baking, and re-tweens on a species swap. Same folder and
 * register as `useReducedMotion.ts` / `useCanvasSizeGuard.ts`: small, one job.
 *
 * This is PLAIN DOM, not R3F. The "write to refs, not state, because a re-render
 * fights the animation" rule that governs BakeReveal / ExplodeReveal is about
 * writes INSIDE the `<Canvas>` subtree; the price panel is outside it, so a
 * state write per frame here is normal and never touches the 3D render loop.
 * Reduced-motion snaps straight to the target.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * The eased value at progress `p` (0..1) between `from` and `to`, easeOutCubic.
 * Pulled out of the hook so the interpolation is pinnable without a DOM (the
 * hook itself needs requestAnimationFrame + React state, which the bare-node
 * suite has no home for).
 */
export function countUpValue(from: number, to: number, p: number): number {
  const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
  const eased = 1 - Math.pow(1 - clamped, 3);
  return from + (to - from) * eased;
}

export function useCountUp(target: number, durationMs: number): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(target);
  // Tween from wherever the number currently sits, not from a stale start, so a
  // fast double-switch does not jump back and re-run from the old value.
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      return;
    }
    fromRef.current = display;
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = durationMs > 0 ? (t - start) / durationMs : 1;
      setDisplay(countUpValue(fromRef.current, target, p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `display` is intentionally not a dep: it is the tween's live output, and
    // depending on it would restart the animation every frame. We read its
    // current value once at the start of each new tween via the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reduced]);

  return display;
}
