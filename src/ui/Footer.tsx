/**
 * Footer.tsx — the small, quiet footer every standalone page wears.
 *
 * NOT the home page's monument (the viewport-wide lowercase "bower" that closes the splash). This is
 * its documentation-layer cousin: the Oculus mark, the wordmark in mono, a thin rule, the three ways
 * in, and a year. Understated on purpose — it closes a page without competing with its content. The
 * home keeps its monument and suppresses this one (see the pages), so the big gesture stays unique.
 *
 * IT DELIBERATELY DOES NOT USE `BowerMark`: that component carries the single `[data-wordmark]` span
 * the one-time BowerIntro flies its lockup onto, and there must be exactly one on a page. The footer
 * draws its own mark + name so it never mints a second wordmark target.
 */
import { OculusMark } from './OculusMark';
import { WORDMARK } from '../data/config';
import { routes } from '../routing';
import type { Measure } from './Frame';

/** `measure` matches the page it closes (the engine walkthrough is the narrower 'page' spread; the
 *  about page and home are 'canvas'), so the footer's edges line up with the content above it. */
export function Footer({ measure = 'canvas' }: { measure?: Measure }) {
  const year = new Date().getFullYear();
  const width = measure === 'page' ? 'max-w-page' : measure === 'read' ? 'max-w-read' : 'max-w-canvas';
  return (
    <footer className={`mx-auto flex w-full ${width} flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-inkBlack/15 px-gutter py-8 text-inkBlack`}>
      <span className="inline-flex items-center gap-1.5">
        <OculusMark size={18} />
        <span className="font-mono text-[14px] lowercase tracking-[0.1em]">{WORDMARK}</span>
      </span>
      {/* Coarse-pointer devices get a 44px tap height on each footer link (they render ~17px tall);
          gated so the desktop footer's density is unchanged. */}
      <nav aria-label="Footer" className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/55">
        <a href={routes.engine} className="inline-flex items-center justify-center transition-colors duration-150 hover:text-inkBlack [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]">how it works</a>
        <a href={routes.studio} className="inline-flex items-center justify-center transition-colors duration-150 hover:text-inkBlack [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]">studio</a>
        <a href={routes.about} className="inline-flex items-center justify-center transition-colors duration-150 hover:text-inkBlack [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]">about</a>
      </nav>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/40">© {year} Bower</span>
    </footer>
  );
}
