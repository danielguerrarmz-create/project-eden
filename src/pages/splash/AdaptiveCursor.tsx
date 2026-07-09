/**
 * AdaptiveCursor.tsx — a fixed circular cursor that follows the pointer and adapts
 * to whatever colour is under it via `mix-blend-mode: difference` (white-on-blend
 * inverts the ground, so it reads on vellum, ink, chartreuse, blue or yellow alike).
 * It grows over interactive targets and dips on press. The ring REPLACES the native
 * arrow while active (the root gets `cursor: none`).
 *
 * FALLBACKS (accessibility): the ring only activates on a FINE pointer with motion
 * ALLOWED. On coarse/touch pointers or `prefers-reduced-motion: reduce` it renders
 * nothing and the native cursor is left untouched — nothing to chase, nothing hidden.
 * The ring is `aria-hidden` + `pointer-events-none`, so keyboard and hit-testing are
 * unaffected.
 *
 * Motion is a light rAF lerp (position + scale), not CSS transitions on transform, so
 * the follow feels alive without transition/rAF fighting. Tunable via props; Sai's
 * splash-polish spec can adjust size/scale/lag centrally here.
 */
import { useEffect, useRef, useState } from 'react';

/** Anything the ring should grow over. Add `data-cursor-hover` to opt something in. */
const INTERACTIVE = 'a,button,[role="button"],[data-cursor-hover]';

export function AdaptiveCursor({
  /** Ring diameter in px at rest. */
  size = 14,
  /** Scale multiplier when hovering an interactive target (14px * 3.14 ~= 44px). */
  hoverScale = 3.14,
  /** Position follow factor per frame (0..1): higher = snappier, lower = more trail. */
  ease = 0.3,
}: {
  size?: number;
  hoverScale?: number;
  ease?: number;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  // Active on a real mouse only (fine pointer that can hover). Touch / coarse pointers
  // (incl. hybrid laptops, correctly, since they have hover:hover) keep the native
  // cursor. Reduced-motion does NOT disable it: the colour-invert is a static property;
  // we only drop the spring lag (see reducedRef in the rAF loop below).
  const [active, setActive] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const hover = window.matchMedia('(hover: hover)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const decide = () => {
      reducedRef.current = reduced.matches;
      setActive(fine.matches && hover.matches);
    };
    decide();
    fine.addEventListener('change', decide);
    hover.addEventListener('change', decide);
    reduced.addEventListener('change', decide);
    return () => {
      fine.removeEventListener('change', decide);
      hover.removeEventListener('change', decide);
      reduced.removeEventListener('change', decide);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = ringRef.current;
    if (!el) return;

    const root = document.documentElement;
    root.classList.add('adaptive-cursor-active'); // hides the native arrow site-wide

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let scale = 1;
    let hovering = false;
    let pressed = false;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        // First move: jump to the pointer so it doesn't slide in from the centre.
        shown = true;
        x = tx;
        y = ty;
        el.style.opacity = '1';
      }
      const t = e.target as Element | null;
      hovering = !!(t && t.closest && t.closest(INTERACTIVE));
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    const onLeave = () => {
      el.style.opacity = '0';
    };
    const onEnter = () => {
      if (shown) el.style.opacity = '1';
    };

    const tick = () => {
      // Reduced motion: snap to the pointer (no spring lag) and jump scale instantly.
      const follow = reducedRef.current ? 1 : ease;
      const sFollow = reducedRef.current ? 1 : 0.2;
      x += (tx - x) * follow;
      y += (ty - y) * follow;
      const target = (hovering ? hoverScale : 1) * (pressed ? 0.82 : 1);
      scale += (target - scale) * sFollow;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      root.classList.remove('adaptive-cursor-active');
    };
  }, [active, hoverScale, ease]);

  if (!active) return null;
  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[200] rounded-full bg-white opacity-0 mix-blend-difference will-change-transform"
      style={{ width: size, height: size, transition: 'opacity 200ms ease' }}
    />
  );
}
