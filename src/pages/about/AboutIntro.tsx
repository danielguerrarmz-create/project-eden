/**
 * AboutIntro.tsx — the one-time narration intro for the projects page (#/about).
 *
 * On first load per tab a full-bleed narration plays: two "We" beats resolve the
 * page's premise (the two-weeks / five-years contrast), then the page TITLE enters
 * large and centred and FLIES onto the real header title, so the narration "nests"
 * into the regular text section. Same mechanic + easing vocabulary as BowerIntro
 * (measure the target rect, travel to it at scale 1), scoped to this page.
 *
 * onReveal fires as the title lands, so the page content fades in beneath the
 * clearing veil; onDone fires when the veil has fully lifted. Plays on every visit
 * (the page decides via shouldPlayAboutIntro; only reduced-motion opts out). SSR-safe:
 * never touches window at import.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Layout effect on the client, plain effect on the server (no SSR warning). */
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EASE_LINE = [0.16, 1, 0.3, 1] as const;
const EASE_TRAVEL = [0.2, 0.8, 0.2, 1] as const;

/** The setup line. The contrast IS the story: fast to build, long to arrive — and the
 *  payoff ("We've been chasing it for five years.") is the TITLE itself, which enters big
 *  and settles into the header, so the loading screen and the header are one thought. */
const SETUP = 'We built this in two weeks.';

/** Timeline (ms): setup [0..], title enters big, title flies onto header, content reveals, done. */
const T = { title: 1750, settle: 2700, reveal: 3350, done: 3850 } as const;

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
  // Both the setup line and the title share ONE box: the header's exact position + width +
  // size (titleClassName at scale 1). During the narration they sit vertically centred, via
  // the `centerY` translate; the title then rises to y=0 to nest onto the header. So the two
  // lines are pixel-identical in size and placement, and the settle is a pure vertical move.
  const centerY = rect ? (vh - rect.height) / 2 - rect.top : 0;
  const showTitle = phase === 'title' || phase === 'settle';

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
          {/* Setup line — rendered with the header's exact style, in the header's column,
              vertically centred. Rises in, holds, lifts out. */}
          <AnimatePresence>
            {phase === 'setup' && (
              <motion.p
                key="setup"
                className={`absolute ${titleClassName}`}
                style={{ left: rect.left, top: rect.top, width: rect.width }}
                initial={{ opacity: 0, y: centerY + 22 }}
                animate={{ opacity: 1, y: centerY }}
                exit={{ opacity: 0, y: centerY - 16, transition: { duration: 0.36, ease: 'easeIn' } }}
                transition={{ duration: 0.65, ease: EASE_LINE }}
              >
                {SETUP}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Title — appears in the SAME box at the SAME size as the setup line, then rises
              (y: centerY -> 0) to nest exactly onto the header. No scale, no re-align. */}
          {showTitle && (
            <motion.p
              key="title"
              className={`absolute ${titleClassName}`}
              style={{ left: rect.left, top: rect.top, width: rect.width }}
              initial={{ opacity: 0, y: centerY }}
              animate={{ opacity: 1, y: phase === 'settle' ? 0 : centerY }}
              transition={{
                opacity: { duration: 0.5, ease: 'easeOut' },
                y: { duration: phase === 'settle' ? 0.9 : 0, ease: EASE_TRAVEL },
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
