import { useEffect, useRef, useState } from 'react';
import { cardLineAt } from './reveal';
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
      // The DESKTOP camera svg specifically (`data-timeline-camera`), never "the first svg in the
      // track". Below `lg` the mobile timeline mounts instead and carries its own decorative svgs
      // (twist glyph, mark); a bare `[data-timeline-track] svg` would grab one of those and scale the
      // page's reveal off a 56px glyph. This selector matches only the drawn timeline's camera, so it
      // resolves to it when present and to nothing (the 0.696 fallback) when the mobile tree is up.
      const svg = document.querySelector('[data-timeline-camera]');
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
 * The timeline places its line against its camera so growth finishes by the middle of its frame.
 * Regions in normal page flow have no camera, so their frame is the viewport and their line is placed
 * against `scrollY` by the same rule. Same rule, same span, same ramp: the reader is looking through
 * a different frame at the same motion. See reveal.ts and `cardLineAt`.
 *
 * IT NEEDS THE SPAN NOW, which is why this takes an argument it did not used to. The line's whole
 * job is to be `span` ahead of where growth must END, so a line that does not know the span cannot
 * place itself — it can only pin where growth begins and let the ending land where it may, which is
 * precisely the bug (see GROWN_BY). Pass the page-flow span, in CSS px: `revealSpanPx(frameScale)`.
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
export function usePageCardLine(reduced: boolean, spanPx: number): number {
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
      setLine(cardLineAt(window.scrollY, window.innerHeight, spanPx));
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
    // `spanPx` belongs here: the line is placed relative to the span, so a span that changes (the
    // frame scale is measured, and re-measured on resize) has to re-place the line. Leaving it out
    // would pin the line to whatever the scale was on first paint and quietly break the invariant at
    // exactly the moment it is most visible, which is mid-resize.
  }, [reduced, spanPx]);

  return line;
}
