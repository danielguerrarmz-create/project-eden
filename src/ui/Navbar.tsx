/**
 * Navbar.tsx — the floating translucent pill. Wordmark left, a slim 3-step
 * progress marker centre, quiet mono nav links right (the engine, start over).
 * Its chrome matches the Engine page header exactly so the two surfaces read as
 * one continuous system.
 */
import { useDesign } from '../state/store';
import { ProgressMarker } from './ProgressMarker';
import { SproutGlyph } from './SproutGlyph';
import { routes } from '../routing';

export function Navbar() {
  const reset = useDesign((s) => s.reset);
  const step = useDesign((s) => s.step);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[min(920px,calc(100vw-1.5rem))]">
      <div className="flex items-center justify-between gap-4 rounded-full border border-line bg-paperVellum/85 px-5 py-2.5 shadow-[0_6px_24px_-12px_rgba(23,22,15,0.35)] backdrop-blur-md">
        {/* Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <SproutGlyph size={20} />
          <span className="font-serifDisplay text-[19px] font-semibold tracking-tight text-inkBlack">
            Living Eden
          </span>
        </div>

        {/* Progress */}
        <div className="hidden sm:block">
          <ProgressMarker />
        </div>

        {/* Quiet nav: a link into the engine explainer, then reset. */}
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={routes.engine}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70 transition hover:text-inkBlack"
          >
            the engine
          </a>
          <button
            onClick={reset}
            className={`font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70 transition hover:text-inkBlack ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            start over
          </button>
        </div>
      </div>
    </div>
  );
}
