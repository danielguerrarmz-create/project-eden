/**
 * useCanvasSizeGuard — stop a Canvas latching at 300x150 forever.
 *
 * THE FAILURE. react-three-fiber sizes its canvas from a ResizeObserver on the
 * container. ResizeObserver callbacks are delivered as part of the browser's
 * RENDERING STEPS — so a document that is never rendered never gets one. Load
 * the page into a tab that isn't rendering (opened in the background, a
 * cmd-click, an occluded or minimised window) and the first observation is
 * simply never delivered.
 *
 * And it does not heal. Once the container reaches its final size, its size
 * stops CHANGING, so there is nothing left for the observer to report when the
 * tab finally renders. The canvas stays at the HTML default of 300x150 for the
 * life of the page: the user switches to the tab and finds a permanently blank
 * 3D view. Verified: focusing the tab afterwards does not bring it back.
 *
 * THE GUARD. react-use-measure (what R3F measures with) also listens for window
 * `resize`, and that path does not depend on the rendering steps. So we poke it
 * at the moments the page might have just become renderable. A `setTimeout`
 * fires even in a background tab (throttled, but it fires), which is what makes
 * this actually recover rather than just re-lose the race.
 *
 * Cheap, idempotent, and dispatching a resize a few times costs nothing —
 * react-use-measure debounces and R3F only re-renders if the size really moved.
 */
import { useEffect } from 'react';

export function useCanvasSizeGuard(): void {
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event('resize'));

    // Now, next frame (if frames happen), and after a beat (which fires even
    // when they don't). Between them, every path into "the page is visible".
    kick();
    const raf = requestAnimationFrame(kick);
    const t1 = setTimeout(kick, 120);
    const t2 = setTimeout(kick, 600);

    document.addEventListener('visibilitychange', kick);
    window.addEventListener('focus', kick);
    window.addEventListener('pageshow', kick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener('visibilitychange', kick);
      window.removeEventListener('focus', kick);
      window.removeEventListener('pageshow', kick);
    };
  }, []);
}
