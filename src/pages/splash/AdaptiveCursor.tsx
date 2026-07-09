/**
 * AdaptiveCursor.tsx — a fixed circular cursor that follows the pointer and adapts
 * to whatever colour is under it via `mix-blend-mode: difference`. The fill MUST be
 * pure white: difference computes abs(top - bottom), so white inverts any ground
 * (255 - B) and reads on vellum, ink, chartreuse, blue or yellow alike; a dark/ink
 * fill would go invisible over dark content (difference against black is identity).
 * It grows over interactive targets. The ring REPLACES the native arrow while active.
 *
 * Motion uses framer-motion (already the page's easing vocabulary, cf. BowerIntro):
 * `useMotionValue` for the raw pointer, `useSpring` for the trailing follow and the
 * hover-grow, so positioning stays declarative with no hand-rolled rAF loop.
 *
 * FALLBACKS (accessibility): activates only on a real mouse — a FINE pointer that can
 * HOVER — so touch / coarse pointers (incl. touchscreen laptops, correctly, since they
 * report hover:hover) keep the native cursor and the ring never mounts. Under
 * prefers-reduced-motion the colour-invert stays (a static property) but the spring lag
 * is dropped to an instant snap. The ring is aria-hidden + pointer-events-none.
 *
 * Fail-safe cursor hide: the native arrow is hidden by a class the MOUNTED component
 * adds in an effect and removes on unmount, never an unconditional static rule — if the
 * JS never runs, the class is never added and the native cursor is simply the default.
 *
 * Scope: mounted on `#/` (SplashPage) ONLY. The sculpt / shape / studio routes drive
 * `document.body.style.cursor` for their own drag affordances, so the ring must not
 * mount there and fight them.
 */
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/** Anything the ring should grow over. Add `data-cursor-hover` to opt something in. */
const INTERACTIVE = 'a,button,[role="button"],[data-cursor-hover]';
const SIZE = 14;
const HOVER_SCALE = 3.14; // 14px -> ~44px

export function AdaptiveCursor() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const hover = window.matchMedia('(hover: hover)');
    const red = window.matchMedia('(prefers-reduced-motion: reduce)');
    const decide = () => {
      setReduced(red.matches);
      setMounted(fine.matches && hover.matches);
    };
    decide();
    fine.addEventListener('change', decide);
    hover.addEventListener('change', decide);
    red.addEventListener('change', decide);
    return () => {
      fine.removeEventListener('change', decide);
      hover.removeEventListener('change', decide);
      red.removeEventListener('change', decide);
    };
  }, []);

  if (!mounted) return null;
  return <Ring reduced={reduced} />;
}

function Ring({ reduced }: { reduced: boolean }) {
  // Instant config under reduced motion (very stiff spring = snap); a light trailing
  // spring otherwise. Config is derived from `reduced` each render, so a live OS change
  // (which re-runs the parent's decide + re-renders) retunes without a remount.
  const snap = { stiffness: 100000, damping: 100, mass: 0.1 };
  const posCfg = reduced ? snap : { stiffness: 550, damping: 40, mass: 0.35 };
  const scaleCfg = reduced ? snap : { stiffness: 400, damping: 28 };

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const x = useSpring(rawX, posCfg);
  const y = useSpring(rawY, posCfg);
  const scale = useSpring(1, scaleCfg);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('adaptive-cursor-active');

    const onMove = (e: PointerEvent) => {
      // Offset by the radius so the circle's CENTER tracks the pointer, not its corner.
      rawX.set(e.clientX - SIZE / 2);
      rawY.set(e.clientY - SIZE / 2);
      setVisible(true);
    };
    // pointerover bubbles and fires on every element entered, so recomputing the hover
    // state from the current target on each over-event keeps the scale correct whether
    // moving onto or off an interactive target — one delegated listener, no per-element
    // binding, works for anything rendered later.
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      scale.set(t && t.closest && t.closest(INTERACTIVE) ? HOVER_SCALE : 1);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      root.classList.remove('adaptive-cursor-active');
    };
  }, [rawX, rawY, scale]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[200] rounded-full bg-white mix-blend-difference"
      style={{ width: SIZE, height: SIZE, x, y, scale, opacity: visible ? 1 : 0 }}
    />
  );
}
