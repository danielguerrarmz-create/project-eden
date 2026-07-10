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
import { BowerMark } from '../../ui/BowerMark';
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

export function SplashHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-4 pt-5 md:px-10">
      <LensFilter />
      {/* The logo rides in its own glass pill (matching the nav) so it stays distinct and
          legible on any ground — the frosted capsule gives the dark ink a consistent
          backing over the hero photo or the vellum pages, no colour-blend needed. */}
      <a
        href="#/"
        aria-label="Bower, home"
        data-cursor-solid
        className="nav-pill flex items-center gap-2.5 px-4 py-2 text-inkBlack"
      >
        <BowerMark
          markSize={30}
          nameClass="font-mono text-[19px] font-semibold lowercase tracking-[0.1em]"
        />
      </a>
      <nav data-cursor-solid className="nav-pill flex items-center gap-1 px-2 py-1">
        <NavLink href={routes.engine}>how it works</NavLink>
        <NavLink href={routes.studio}>engine</NavLink>
        <NavLink href={routes.about}>about</NavLink>
      </nav>
    </header>
  );
}
