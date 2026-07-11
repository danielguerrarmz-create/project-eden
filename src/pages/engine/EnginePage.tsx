/**
 * EnginePage.tsx — the restored standalone engine walkthrough at `#/engine`.
 *
 * The home page carries only a condensed engine section (pipeline mechanics +
 * honesty coda); whoever wants the full detail follows "See the full engine
 * walkthrough" to here, where the entire six-section HowItWorks renders verbatim.
 *
 * Chrome is now the SHARED splash system: the one fixed floating SplashHeader (so
 * there is exactly one `[data-wordmark]` and one nav concern across the whole
 * site), the same typeScale + EngineSection field-color language HowItWorks
 * already uses, and the unified paperVellum (#FBF9F3) ground. No BowerIntro runs
 * here (it lives only in SplashPage), so the static wordmark is inert.
 *
 * It reads the same live default `outputs` the rest of the site reads, so every
 * number and silhouette in the walkthrough is real engine output.
 */
import { useDesign } from '../../state/store';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { routes } from '../../routing';
import { SplashHeader } from '../splash/SplashHeader';
import { HowItWorks } from '../splash/HowItWorks';

export function EnginePage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      {/* The one global nav, shared with the home, fixed + floating over the page. */}
      <SplashHeader />

      {/* The entire six-section walkthrough, verbatim (sun path + growth included).
          Its first section carries enough top padding to clear the floating nav. */}
      <HowItWorks outputs={outputs} reduced={reduced} />

      {/* Direct-manipulation prototype: reviewable, off the home nav. */}
      <div className="w-full bg-paperVellum px-6 pb-16 md:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap gap-x-8 gap-y-3 border-t border-inkBlack/15 pt-8">
          <a
            href={routes.shape}
            className="inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
          >
            Prototype: shape one by direct manipulation →
          </a>
          <a
            href={routes.machineLearning}
            className="inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
          >
            The machine-learning agenda, three levels deep →
          </a>
        </div>
      </div>
    </div>
  );
}
