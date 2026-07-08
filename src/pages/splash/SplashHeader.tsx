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

/** One nav link with a left-origin underline grow on hover/focus. */
function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="group relative font-mono text-[13px] uppercase tracking-[0.14em] text-inkBlack transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-inkBlack transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </a>
  );
}

export function SplashHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-4 pt-5 md:px-10">
      <a href="#/" className="flex items-center gap-3 text-inkBlack" aria-label="Bower, home">
        <BowerMark
          markSize={26}
          nameClass="font-mono text-[17px] font-semibold lowercase tracking-[0.1em]"
        />
        <span className="hidden font-mono text-[12px] uppercase leading-none tracking-[0.18em] text-inkBlack/65 sm:inline">
          · living architecture for the garden
        </span>
      </a>
      <nav className="flex items-center gap-6">
        <NavLink href="#how-it-works">how it works</NavLink>
        <NavLink href={routes.studio}>engine</NavLink>
        <NavLink href={routes.about}>about</NavLink>
      </nav>
    </header>
  );
}
