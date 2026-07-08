/**
 * BowerIntro.tsx — the "bower" intro (Archipedia Preloader mechanic, 1:1).
 *
 * On first load per tab a centered brand lockup loads in together: the Oculus mark
 * (logo) fades / scales / rotates in while the five letters of the "bower" wordmark
 * set themselves into a line below it (deterministic offsets, "type set into a
 * line, not confetti"). They resolve and hold. Then the lockup hands off:
 *   - the WORDMARK flies to the top-left nav wordmark and fades into the real nav
 *     lockup (font metrics match the `[data-wordmark]` span so at scale 1 they land
 *     on top of it);
 *   - the LOGO settles to dead-center at the hero's plan size, i.e. exactly where
 *     HeroReveal's `OculusPlate` big centered Oculus sits at scroll p=0 (same
 *     `absolute inset-0 grid place-items-center` + `w-[min(340px,60vmin)]`), so when
 *     the backdrop clears the intro's logo and the hero's logo are pixel-coincident
 *     and scroll simply takes over into the 2D -> 3D transition.
 *
 * We re-measure the nav wordmark after `document.fonts.ready` and on resize. Runs
 * ONCE per tab (sessionStorage). Reduced-motion or already-played -> renders null
 * (no intro). SSR-safe: no window on the server means it never activates.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WORDMARK } from '../../data/config';
import { OculusMark } from '../../ui/OculusMark';

/** Layout effect on the client, plain effect on the server (no SSR warning). */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const WORD = WORDMARK.toLowerCase(); // "bower"
const LETTERS = WORD.split('');

/** Deterministic per-letter entrance offsets. Only `y` is consumed now (the
 *  letters rise into a line); `x`/`r` are kept as the original scatter record. */
const OFFSETS = [
  { x: -30, y: -58, r: -5 },
  { x: 24, y: -64, r: 4 },
  { x: -16, y: -56, r: 3 },
  { x: 36, y: -50, r: -4 },
  { x: -40, y: -62, r: 5 },
] as const;

export const SESSION_KEY = 'bower.intro.played';
/** Fired on window when the intro finishes (or is skipped), so the hero can start
 *  its timed logo->structure reveal only once the veil has lifted. */
export const INTRO_DONE_EVENT = 'bower:intro-done';
const EASE_LETTER = [0.16, 1, 0.3, 1] as const;
const EASE_TRAVEL = [0.2, 0.8, 0.2, 1] as const;

/** The logo lockup: sits above the wordmark, then settles to the hero plan (scale 1,
 *  y 0). Tuned to match the slow/large register; adjust freely. */
const LOGO = {
  lockupScale: 0.52, // logo size while paired with the big wordmark
  liftVh: 0.14, // how far above center the lockup logo floats (fraction of vh)
  enterRotate: -14, // gentle rotate-in
  enterDur: 0.9, // fade / scale / rotate in
  settleDur: 1.25, // travel-beat settle to the hero plan position (ends 1150 -> 2400)
} as const;

/** The big wordmark drops this fraction of vh below center so the logo clears above it. */
const NAME_DROP_VH = 0.12;

/** Timeline (ms): assemble at 0, travel at 1900, fade at 3300, unmount at 3800.
 *  (Trimmed 0.5s from the previous 4.3s cut.) Letters finish assembling ~1.15s, so
 *  the full "bower" lockup HOLDS still ~0.75s before it flies to the nav. The logo
 *  settle (1900 -> 3150) completes 150ms before the backdrop fade starts; the 0.5s
 *  backdrop fade then completes exactly at done (3300 + 500 = 3800). */
const T = { travel: 1900, fade: 3300, done: 3800 } as const;

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
  // Decide SYNCHRONOUSLY on the first render (client only) so the veil is painted on
  // the very first frame — no gap where the full page flashes before the intro mounts.
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
  const [phase, setPhase] = useState<'assemble' | 'travel' | 'fade'>('assemble');
  const [target, setTarget] = useState<Rect | null>(null);

  // Pin the scroll to the top while the one-time intro plays so its centered logo hands
  // off to the hero's plan view cleanly; a reload mid-page would otherwise restore scroll
  // and settle the logo over the wrong spot. Restored to 'auto' on unmount (cleanup below).
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, [active]);

  // Measure the nav wordmark (after fonts settle), re-measure on resize.
  useIsomorphicLayoutEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const measure = () => {
      const el = document.querySelector('[data-wordmark]') as HTMLElement | null;
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
    const t2 = setTimeout(() => setPhase('fade'), T.fade);
    const t3 = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      // Tell the hero the veil has lifted, so its timed reveal can start now.
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
      setActive(false);
    }, T.done);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      // Resume normal back/forward scroll restoration whenever the intro leaves:
      // on normal completion (active -> false via t3) AND on early unmount /
      // navigation mid-intro, so scrollRestoration is never left stuck on 'manual'.
      if (typeof window !== 'undefined' && window.history.scrollRestoration === 'manual') {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [active]);

  if (!active) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const w = target?.width ?? 60;
  const h = target?.height ?? 16;

  // Centered-big state: the word spans ~90vw, clamped to 3.2–8x the nav size (large),
  // dropped below center so the logo lockup clears above it.
  const bigScale = Math.min(8, Math.max(3.2, (0.9 * vw) / w));
  const bigX = vw / 2 - (w * bigScale) / 2;
  const bigY = vh / 2 - (h * bigScale) / 2 + NAME_DROP_VH * vh;

  const traveled = phase !== 'assemble' && !!target;
  const settled = phase !== 'assemble'; // the logo drops to the hero plan on the same beat
  const wordAnim = traveled
    ? { x: target!.left, y: target!.top, scale: 1, opacity: phase === 'fade' ? 0 : 1 }
    : { x: bigX, y: bigY, scale: bigScale, opacity: 1 };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      {/* Backdrop clears on the fade beat. */}
      <motion.div
        className="absolute inset-0 bg-paperVellum"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'fade' ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* The LOGO. Same container + mark sizing as HeroReveal's OculusPlate, so once
          it settles (scale 1, y 0) it is pixel-coincident with the hero's plan view.
          It does NOT fade on the fade beat: it becomes the hero plan and the backdrop
          simply clears from behind it. */}
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          className="w-[min(340px,60vmin)] text-inkBlack"
          initial={{ opacity: 0, scale: LOGO.lockupScale * 0.9, rotate: LOGO.enterRotate, y: -LOGO.liftVh * vh }}
          animate={
            settled
              ? { opacity: 1, scale: 1, rotate: 0, y: 0 }
              : { opacity: 1, scale: LOGO.lockupScale, rotate: 0, y: -LOGO.liftVh * vh }
          }
          transition={{ duration: settled ? LOGO.settleDur : LOGO.enterDur, ease: EASE_TRAVEL }}
        >
          <OculusMark size={360} className="h-auto w-full" />
        </motion.div>
      </div>

      {/* The word: assembles in place (below the logo), then travels to the nav
          wordmark. Font metrics match the nav lockup so at scale 1 they land on it. */}
      <motion.div
        className="absolute left-0 top-0 flex font-mono font-semibold lowercase text-inkBlack"
        style={{ transformOrigin: 'top left', fontSize: '17px', letterSpacing: '0.1em', lineHeight: 1 }}
        initial={{ x: bigX, y: bigY, scale: bigScale, opacity: 1 }}
        animate={wordAnim}
        transition={
          traveled
            ? { duration: 1.35, ease: EASE_TRAVEL, opacity: { duration: 0.85, ease: 'easeOut' } }
            : { duration: 0 }
        }
      >
        {LETTERS.map((ch, i) => (
          // Opacity + y only. The blur(4px)->0 and x/rotate were the main repaint
          // cost (five animated CSS filters at once); dropping them keeps the
          // "type setting into a line" read with zero per-frame blur repaints.
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: OFFSETS[i].y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: EASE_LETTER, delay: 0.07 * i }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
