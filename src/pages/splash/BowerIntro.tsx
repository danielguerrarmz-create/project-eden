/**
 * BowerIntro.tsx — the one-time "bower" intro (2026-07-10 rework).
 *
 * Spec (Daniel): no loading spinner, no rotating wheel. Simply:
 *   1. the logo + title (the Oculus mark + "bower" wordmark) LOAD IN, centered;
 *   2. the lockup then TRAVELS to its position in the top-left corner, landing exactly
 *      on the real header lockup (measured via [data-intro-logo]);
 *   3. only THEN does everything else on screen arrive — the veil clears and the hero
 *      copy grows in (INTRO_DONE_EVENT).
 *
 * The intro lockup is an exact replica of the header lockup (same mark size, same mono
 * wordmark), so at scale 1 it lands pixel-coincident and the crossfade onto the real
 * nav logo is invisible. Runs ONCE per tab (sessionStorage). Reduced-motion or
 * already-played -> renders null. SSR-safe: no window on the server.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WORDMARK } from '../../data/config';
import { OculusMark } from '../../ui/OculusMark';

/** Layout effect on the client, plain effect on the server (no SSR warning). */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const WORD = WORDMARK.toLowerCase(); // "bower"
const LETTERS = WORD.split('');

/** Deterministic per-letter entrance offsets (Archipedia preloader mechanic): each letter
 *  drops in from its own height so the word "sets into a line" rather than fading as a
 *  block. Only `y` is consumed; `x`/`r` are kept as the original scatter record. */
const OFFSETS = [
  { x: -30, y: -58, r: -5 },
  { x: 24, y: -64, r: 4 },
  { x: -16, y: -56, r: 3 },
  { x: 36, y: -50, r: -4 },
  { x: -40, y: -62, r: 5 },
] as const;

/** Header lockup metrics, matched exactly so the landed intro is coincident with the nav. */
const MARK_PX = 30;
const NAME_PX = 19;

export const SESSION_KEY = 'bower.intro.played';
/** Fired on window when the intro finishes (or is skipped), so the hero copy grows in and
 *  the rest of the page arrives only once the lockup has taken the corner. */
export const INTRO_DONE_EVENT = 'bower:intro-done';

const EASE_IN = [0.16, 1, 0.3, 1] as const;
const EASE_LETTER = [0.16, 1, 0.3, 1] as const;
const EASE_TRAVEL = [0.2, 0.8, 0.2, 1] as const;

/** Timeline (ms): the mark fades in + the letters assemble into the line (~0 -> 1.1s),
 *  hold, then the settled lockup travels to the corner at `travel`; the page arrives
 *  (veil clears + lockup crossfades onto the real nav) at `arrive`; unmount at `done`. */
const T = { travel: 1350, arrive: 2200, done: 2650 } as const;

/** Pure guard: only play on a fresh, non-reduced-motion tab. Unit-tested. */
export function shouldPlayIntro(prefersReduced: boolean, alreadyPlayed: boolean): boolean {
  return !prefersReduced && !alreadyPlayed;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function BowerIntro() {
  // Decide SYNCHRONOUSLY on the first render (client only) so the veil is painted on the
  // very first frame — no flash of the full page before the intro mounts.
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    let played = false;
    try {
      played = !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      /* private mode: treat as not played */
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    return shouldPlayIntro(reduced, played);
  });
  const [phase, setPhase] = useState<'load' | 'travel'>('load');
  const [fade, setFade] = useState(false);
  const [target, setTarget] = useState<Rect | null>(null);

  // Pin scroll to the top while the one-time intro plays so the lockup lands over the real
  // header cleanly; a reload mid-page would otherwise restore scroll behind the veil.
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, [active]);

  // Measure the real header lockup (after fonts settle), re-measure on resize. The intro
  // lockup flies onto this rect at scale 1.
  useIsomorphicLayoutEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const measure = () => {
      const el = document.querySelector('[data-intro-logo]') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTarget({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  // Timeline.
  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setPhase('travel'), T.travel);
    const t2 = setTimeout(() => {
      setFade(true); // veil clears + lockup crossfades onto the real nav
      window.dispatchEvent(new Event(INTRO_DONE_EVENT)); // hero copy + page arrive now
    }, T.arrive);
    const t3 = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      setActive(false);
    }, T.done);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      // Never leave scrollRestoration stuck on 'manual' (normal end or early unmount).
      if (typeof window !== 'undefined' && window.history.scrollRestoration === 'manual') {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [active]);

  if (!active) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const w = target?.width ?? 110;
  const h = target?.height ?? 30;

  // Centered "load-in" state: the lockup, scaled up so it reads as a title, sat a little
  // above the vertical middle. Scale clamps so it fills a comfortable band on any width.
  const bigScale = Math.min(5, Math.max(2.6, (0.42 * vw) / w));
  const centerX = vw / 2 - (w * bigScale) / 2;
  const centerY = vh * 0.44 - (h * bigScale) / 2;

  const traveled = phase === 'travel' && !!target;
  // At scale 1 the replica lands exactly on the measured header lockup (top-left origin).
  const lockupAnim = traveled
    ? { x: target!.left, y: target!.top, scale: 1, opacity: fade ? 0 : 1 }
    : { x: centerX, y: centerY, scale: bigScale, opacity: 1 };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      {/* Vellum veil: clears on the arrive beat so the page shows through beneath. */}
      <motion.div
        className="absolute inset-0 bg-paperVellum"
        initial={{ opacity: 1 }}
        animate={{ opacity: fade ? 0 : 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />

      {/* The logo + title lockup: the mark fades in while the letters ASSEMBLE into the
          line (Archipedia mechanic), then the settled lockup travels to the top-left corner
          and crossfades onto the real nav logo as the page arrives. Rendered once the header
          rect is measured (the veil covers the one-frame gap). The container carries only
          position/scale + the final fade; the mark and the letters carry their own entrances. */}
      {target && (
        <motion.div
          className="absolute left-0 top-0 inline-flex items-center gap-1.5 text-inkBlack"
          style={{ transformOrigin: 'top left' }}
          initial={{ x: centerX, y: centerY, scale: bigScale }}
          animate={{ x: lockupAnim.x, y: lockupAnim.y, scale: lockupAnim.scale, opacity: fade ? 0 : 1 }}
          transition={
            traveled
              ? {
                  x: { duration: 0.9, ease: EASE_TRAVEL },
                  y: { duration: 0.9, ease: EASE_TRAVEL },
                  scale: { duration: 0.9, ease: EASE_TRAVEL },
                  opacity: { duration: 0.3, ease: 'easeOut' },
                }
              : { default: { duration: 0 } }
          }
        >
          {/* Glass-pill chrome grows in DURING the travel, so the lockup LANDS
              already wearing the header's pill — before this, the logo landed
              naked and the real pill + nav popped in around it as the veil
              cleared (the "opacity blink" on the header at page-open). Sized
              to the header anchor's px-4/py-2 around the measured lockup. A
              solid approximation of .nav-pill: backdrop-filter here would
              sample the fading veil and shimmer. */}
          <motion.span
            aria-hidden
            className="absolute rounded-full border border-inkBlack/10 bg-white/60 shadow-[0_1px_2px_rgba(23,22,15,0.06),0_8px_24px_rgba(23,22,15,0.08)]"
            style={{ left: -16, top: -8, width: w + 32, height: h + 16 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: traveled && !fade ? 1 : 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
          {/* The mark fades + settles in as the letters begin to land. */}
          <motion.span
            className="relative block"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE_IN }}
          >
            <OculusMark size={MARK_PX} className="block h-auto" />
          </motion.span>
          {/* The wordmark, set into a line letter by letter. letter-spacing on the flex row
              adds the same 0.1em tracking as the nav lockup, so it lands coincident. */}
          <span
            className="relative flex font-mono font-semibold lowercase"
            style={{ fontSize: NAME_PX, letterSpacing: '0.1em', lineHeight: 1 }}
          >
            {LETTERS.map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: OFFSETS[i].y }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.72, ease: EASE_LETTER, delay: 0.14 + 0.07 * i }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
        </motion.div>
      )}
    </div>
  );
}
