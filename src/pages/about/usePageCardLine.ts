import { useEffect, useRef, useState } from 'react';
import { CARD_LINE } from './reveal';
import { TIMELINE_W } from './CrossPathsTimeline';

/**
 * THE TIMELINE'S px-PER-WORLD-UNIT, measured off its rendered frame.
 *
 * The page's regions reveal over the same DISTANCE ON SCREEN as the timeline does, and they cannot
 * get that from the constant: the timeline draws in world units and scales them into its frame, so
 * its 175-unit span is ~122 CSS px at 1440x900 and something else at another width. A page region
 * reusing the raw 175 would reveal over a visibly longer stretch — the same number, a different
 * motion. See revealSpanPx.
 *
 * Falls back to the measured 0.696 rather than 1 if the timeline is not on the page, because being
 * approximately right about the motion beats being exactly wrong.
 */
export function useTimelineFrameScale(): number {
  const [scale, setScale] = useState(0.696);
  useEffect(() => {
    const measure = () => {
      const svg = document.querySelector('[data-timeline-track] svg');
      const w = svg?.getBoundingClientRect().width ?? 0;
      if (w > 0) setScale(w / TIMELINE_W);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return scale;
}

/**
 * THE PAGE'S OWN CARD LINE, in page coordinates — the founders' and the coda's equivalent of the
 * timeline camera's `cardLineY`.
 *
 * The timeline reveals against a line 52% down its frame, which its camera provides. Regions in
 * normal page flow have no camera, so their frame is the viewport and their line is 52% down that.
 * Same fraction, same span, same ramp: the reader is looking through a different frame at the same
 * motion. See reveal.ts.
 *
 * REDUCED MOTION RETURNS INFINITY, not a scroll position. Everything is "infinitely far past the
 * line", so every `growAt` saturates to 1 and the whole page settles instantly, fully grown — the
 * correct behaviour, expressed once here instead of as a `reduced ? 1 : ...` at every call site.
 *
 * WHY rAF AND NOT THE SCROLL EVENT DIRECTLY: this drives an SVG mask with a few hundred discs. A
 * scroll listener calling setState fires far more often than the compositor can paint, and React
 * would re-render the whole ornament on every one of them. Coalescing to one frame is what makes
 * the thing affordable; the value is read from `window.scrollY` in the frame that will paint it, so
 * it is never stale.
 */
export function usePageCardLine(reduced: boolean): number {
  const [line, setLine] = useState(() => (reduced ? Infinity : 0));
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) {
      setLine(Infinity);
      return;
    }
    let queued = false;
    const read = () => {
      queued = false;
      setLine(window.scrollY + window.innerHeight * CARD_LINE);
    };
    const kick = () => {
      if (queued) return;
      queued = true;
      raf.current = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      cancelAnimationFrame(raf.current);
    };
  }, [reduced]);

  return line;
}
