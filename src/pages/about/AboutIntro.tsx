/**
 * AboutIntro.tsx — the one-time narration intro for the projects page (#/about).
 *
 * On first load per tab a full-bleed narration plays: the page TITLE enters large and
 * centred and FLIES onto the real header title, so the narration "nests" into the regular
 * text section. Same mechanic + easing vocabulary as BowerIntro (measure the target rect,
 * travel to it at scale 1), scoped to this page.
 *
 * onReveal fires as the title lands, so the page content fades in beneath the
 * clearing veil; onDone fires when the veil has fully lifted. Plays on every visit
 * (the page decides via shouldPlayAboutIntro; only reduced-motion opts out). SSR-safe:
 * never touches window at import.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';

/** Layout effect on the client, plain effect on the server (no SSR warning). */
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EASE_TRAVEL = [0.2, 0.8, 0.2, 1] as const;

/** How long the settle travel (page centre → header slot) takes, in seconds. Shared by the motion
 *  transition and the timeline below so `reveal` can wait for the title to actually LAND. */
const TRAVEL_S = 0.9;

/** Timeline (ms): a brief held veil, then the title enters big, flies onto the header, the
 *  content reveals, done. (The old "we built this in two weeks" setup beat was removed at Daniel's
 *  request; the title entering and settling into the header is the whole narration now.)
 *  `reveal` waits until the flying title has LANDED (settle + travel), so the veil only clears once
 *  the flying copy is exactly coincident with the real header title — otherwise the real title fades
 *  in while the copy is still mid-flight and you see a ghost/double. */
const T = {
  title: 350,
  settle: 1300,
  reveal: 1300 + TRAVEL_S * 1000 + 60, // 2260: just after the title lands
  done: 1300 + TRAVEL_S * 1000 + 60 + 600, // 2860: after the 0.55s veil fade
} as const;

/** Pure guard: only play on a fresh, non-reduced-motion tab. */
export function shouldPlayAboutIntro(prefersReduced: boolean, alreadyPlayed: boolean): boolean {
  return !prefersReduced && !alreadyPlayed;
}

type Phase = 'setup' | 'title' | 'settle';
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function AboutIntro({
  title,
  titleClassName,
  onReveal,
  onDone,
}: {
  /** The header title text; the flying title uses it verbatim so they are coincident. */
  title: string;
  /** The header title's class string, so font metrics match at scale 1. */
  titleClassName: string;
  onReveal: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [fade, setFade] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  // Measure the real (opacity-0, still in layout) header title so the narration title
  // can fly onto it. Re-measure after fonts settle and on resize.
  useIsoLayout(() => {
    if (typeof document === 'undefined') return;
    const measure = () => {
      const el = document.querySelector('[data-about-title]') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Timeline.
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase('title'), T.title),
      window.setTimeout(() => setPhase('settle'), T.settle),
      window.setTimeout(() => {
        setFade(true);
        onReveal();
      }, T.reveal),
      window.setTimeout(() => onDone(), T.done),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onReveal, onDone]);

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  // The title shares the header's exact box (position + width + size at scale 1). During the
  // narration the whole box is translated to the COMPLETE CENTRE of the page via the
  // `centerX`/`centerY` translates, then on the settle it travels back to (x:0, y:0) to nest exactly
  // onto the real header title. Text stays LEFT-aligned the entire flight (matching the header, which
  // is left-aligned): centring is done by moving the box, never by toggling textAlign — a mid-flight
  // center→left snap would reflow the wrapped lines and read as a glitch.
  const centerY = rect ? (vh - rect.height) / 2 - rect.top : 0;
  const centerX = rect ? (vw - rect.width) / 2 - rect.left : 0;
  const showTitle = phase === 'title' || phase === 'settle';
  const settling = phase === 'settle';

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80]">
      {/* The veil, cleared on the reveal beat so the page shows through. */}
      <motion.div
        className="absolute inset-0 bg-paperVellum"
        initial={{ opacity: 1 }}
        animate={{ opacity: fade ? 0 : 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />

      {rect && (
        <>
          {/* Title — appears in the header's exact box at scale 1, translated to the complete centre
              of the page (x: centerX, y: centerY), then travels back to (0,0) to nest exactly onto the
              real header title. Text stays LEFT-aligned throughout (matching the header) so the
              wrapped lines never reflow mid-flight. No scale. */}
          {showTitle && (
            <motion.p
              key="title"
              className={`absolute ${titleClassName}`}
              style={{ left: rect.left, top: rect.top, width: rect.width, textAlign: 'left' }}
              initial={{ opacity: 0, x: centerX, y: centerY }}
              animate={{ opacity: 1, x: settling ? 0 : centerX, y: settling ? 0 : centerY }}
              transition={{
                opacity: { duration: 0.5, ease: 'easeOut' },
                x: { duration: settling ? TRAVEL_S : 0, ease: EASE_TRAVEL },
                y: { duration: settling ? TRAVEL_S : 0, ease: EASE_TRAVEL },
              }}
            >
              {title}
            </motion.p>
          )}
        </>
      )}
    </div>
  );
}
