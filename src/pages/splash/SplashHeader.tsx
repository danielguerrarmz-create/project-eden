/**
 * SplashHeader.tsx — the one global nav for the home page. `position: fixed` so it
 * stays frozen at the top for the entire scroll session. No background rectangle:
 * the titles float over whatever scrolls beneath, in high-contrast ink that reads
 * on every field ground (vellum, chartreuse, blue, yellow).
 *
 * It carries the single `[data-wordmark]` span on the page (via BowerMark), the
 * target the one-time BowerIntro flies its assembled "bower" lockup onto. There must
 * be exactly one such span, so no hero mode renders its own header.
 *
 * Links get a left-origin underline that grows on hover / focus.
 */
import { useEffect, useRef } from 'react';
import { BowerMark } from '../../ui/BowerMark';
import { Frame, type Measure } from '../../ui/Frame';
import { routes } from '../../routing';

/**
 * One nav link inside the glass capsule: a left-origin underline grow (unchanged) plus
 * a soft local backlight under the hovered link only (a backlight, not a glow), which
 * collapses to instant under reduced motion.
 */
function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="group relative rounded-full px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-inkBlack transition-colors duration-150 ease-out hover:bg-white/40 focus-visible:bg-white/40 motion-reduce:transition-none"
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-0.5 left-3 right-3 h-px origin-left scale-x-0 bg-inkBlack transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
      />
    </a>
  );
}

/**
 * The lens-refraction filter for the glass pill: an feDisplacementMap fed a radial
 * bump map (white center = undisplaced, gray rim = max warp), chained into the pill's
 * backdrop-filter so the field colours passing under it bend at the rim like a lens.
 * Rendered once, hidden; browsers that can't chain an SVG filter into backdrop-filter
 * simply fall back to plain frosted glass (see .nav-pill in index.css).
 */
function LensFilter() {
  const bump =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><radialGradient id='g'><stop offset='0%' stop-color='%23808080'/><stop offset='75%' stop-color='%23a0a0a0'/><stop offset='100%' stop-color='%23e8e8e8'/></radialGradient><rect width='200' height='60' fill='url(%23g)'/></svg>";
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="lensWarp" x="-20%" y="-20%" width="140%" height="140%">
        <feImage href={bump} result="bump" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="bump" scale="16" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/**
 * The one header for the whole site. Every page wears it — splash, engine, studio, about —
 * so the chrome never changes shape as you move between them.
 *
 * `actions` is an optional second capsule to the right of the nav, for page-local utilities
 * (the studio parks "copy link" / "start over" there). It is the ONLY thing a page may add.
 */
export function SplashHeader({
  actions,
  measure = 'canvas',
  transparent = false,
}: {
  actions?: React.ReactNode;
  /** The header must adopt the measure of the PAGE it sits on, or its left edge misses the
   *  content column it is supposed to frame. The engine walkthrough is a narrower reading
   *  spread ('page'); the splash, studio and about are all 'canvas'. */
  measure?: Measure;
  /** Drop the frosted `.nav-pill` capsules (and the `LensFilter` that only exists for them) so the
   *  logo and nav float directly on the page — About wants a fully transparent header on its vellum.
   *  The ink stays `text-inkBlack`, which reads on that ground without the capsule backing. */
  transparent?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  // Present only when the pills are; the filter's whole job is the pills' backdrop lens.
  const pill = transparent ? '' : 'nav-pill ';

  /**
   * The header publishes its own height as `--header-h`.
   *
   * Six places used to hand-guess this number (pt-[84px], pt-28, top-28, top-20, and two
   * different `calc(100vh - magic)` formulas), which is why headings tucked under the
   * header when you jumped to a section. Measuring it once, here, makes every one of them
   * correct by construction, and it STAYS correct when the header wraps to two rows on a
   * phone. The :root default in index.css covers SSR and the first paint.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const publish = () =>
      document.documentElement.style.setProperty('--header-h', `${Math.round(el.offsetHeight)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-50 pb-4 pt-5">
      {!transparent && <LensFilter />}
      {/* The header sits in the SAME frame as the page content, so the wordmark's left edge
          IS the content's left edge at every width. Before this it gutter'd off the raw
          viewport, so on a wide monitor it floated hundreds of px outside the column
          everything else aligned to — the chrome and the page never shared an edge. */}
      <Frame
        measure={measure}
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
      >
        {/* The logo rides in its own glass pill (matching the nav) so it stays distinct and
            legible on any ground — the frosted capsule gives the dark ink a consistent
            backing over the hero photo or the vellum pages, no colour-blend needed. */}
        <a
          href="#/"
          aria-label="Bower, home"
          data-cursor-solid
          className={`${pill}flex items-center gap-2.5 px-4 py-2 text-inkBlack`}
        >
          <BowerMark
            markSize={30}
            nameClass="font-mono text-[19px] font-semibold lowercase tracking-[0.1em]"
          />
        </a>
        <div className="flex items-center gap-3">
          <nav data-cursor-solid className={`${pill}flex items-center gap-1 px-2 py-1`}>
            <NavLink href={routes.engine}>how it works</NavLink>
            <NavLink href={routes.studio}>studio</NavLink>
            <NavLink href={routes.about}>about</NavLink>
          </nav>
          {actions}
        </div>
      </Frame>
    </header>
  );
}
