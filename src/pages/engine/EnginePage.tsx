/**
 * EnginePage.tsx — the restored standalone engine walkthrough at `#/engine`.
 *
 * The home page carries only a condensed engine section (pipeline mechanics +
 * honesty coda); whoever wants the full detail follows "See the full engine
 * walkthrough" to here, where the entire six-section HowItWorks renders verbatim.
 * This is only chrome around that component: the `min-h-screen` page wrapper and a
 * thin nav header that HowItWorks lost when it was folded into the home scroll, so
 * a visitor who lands here directly can still get back to the home or the studio.
 *
 * It reads the same live default `outputs` the rest of the site reads, so every
 * number and silhouette in the walkthrough is real engine output.
 */
import { useDesign } from '../../state/store';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { routes } from '../../routing';
import { BowerMark } from '../../ui/BowerMark';
import { HowItWorks } from '../splash/HowItWorks';

const navLink =
  'font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/60 transition hover:text-inkBlack focus-visible:text-inkBlack';

export function EnginePage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-6 md:px-10">
        <a href={routes.home} className="flex items-center gap-2 text-inkBlack opacity-90">
          <BowerMark />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">
            · the generative engine
          </span>
        </a>
        <nav className="flex items-center gap-4">
          <a href={routes.home} className={navLink}>
            home
          </a>
          <a href={routes.studio} className={navLink}>
            the studio
          </a>
        </nav>
      </header>

      {/* The entire six-section walkthrough, verbatim (sun path + growth included). */}
      <HowItWorks outputs={outputs} reduced={reduced} />
    </div>
  );
}
