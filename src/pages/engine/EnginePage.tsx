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
import { Frame } from '../../ui/Frame';
import { SplashHeader } from '../splash/SplashHeader';
import { HowItWorks } from '../splash/HowItWorks';
import { Footer } from '../../ui/Footer';

export function EnginePage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      {/* The one global nav, shared with the home, fixed + floating over the page. It takes
          the engine's own 'page' measure so the wordmark's left edge lands exactly on the
          walkthrough's left edge instead of floating outside it. */}
      <SplashHeader measure="page" />

      {/* The entire six-section walkthrough, verbatim (sun path + growth included).
          `lead` makes its first band clear the fixed header by the header's REAL height. */}
      <HowItWorks outputs={outputs} reduced={reduced} lead />

      {/* Direct-manipulation prototype: reviewable, off the home nav. */}
      <div className="w-full bg-paperVellum pb-16">
        <Frame measure="page" className="border-t border-inkBlack/15 pt-8">
          <a
            href={routes.shape}
            className="inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
          >
            Prototype: shape one by direct manipulation →
          </a>
        </Frame>
      </div>

      <Footer measure="page" />
    </div>
  );
}
