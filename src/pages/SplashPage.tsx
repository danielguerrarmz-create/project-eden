/**
 * SplashPage.tsx — the new home (`#/`), the full-bleed editorial landing that
 * sits ABOVE the studio, in the same documentation-layer language as the Engine
 * page: one flat acid field per section, editorial serif with a single Bodoni
 * pull-quote moment (the hero), IBM Plex Mono annotations, and live navy hairline
 * diagrams drawn by the real engine functions (never a render).
 *
 * It reads the same default design a first-time visitor sees (the store
 * initializes its outputs eagerly, the exact pattern EnginePage relies on) so
 * every number and every silhouette on this page is live engine output. The
 * studio is untouched in substance; it only moved from `#/` to `#/studio`.
 *
 * Copy note: no em/en dashes anywhere in this page's hand-authored copy. The one
 * engine-generated string shown (floweringMonths) is passed through deDash, the
 * same sanitiser the studio uses, since that string can carry a range dash.
 * No margin, certification, or insurer claim anywhere.
 *
 * The engine explainer is condensed here into one section (The Engine, anchored
 * #how-it-works): pipeline mechanics + a honesty coda. The full six-section
 * walkthrough (sun path, growth phases) lives at the standalone /engine route.
 */
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { deDash } from '../ui/text';
import { routes } from '../routing';
import { AnnotationStrip, EngineSection } from './engine/EngineSection';
import { PipelineSchematic } from './engine/PipelineSchematic';
import { SiteEnvelopeDiagram } from './engine/SiteEnvelopeDiagram';
import { StrutFieldDiagram } from './engine/StrutFieldDiagram';
import { HeroReveal } from './splash/HeroReveal';
import { SplashHeader } from './splash/SplashHeader';
import { AdaptiveCursor } from './splash/AdaptiveCursor';
import { BowerIntro } from './splash/BowerIntro';
import { SeasonalBecomingDiagram } from './splash/SeasonalBecomingDiagram';
import { RegisterInterest } from './splash/RegisterInterest';
import { ritualSteps, STAYS_THE_SAME, PD_FACT } from './splash/copy';
import { H2, BODY } from './typeScale';

export function SplashPage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);
  const { geometry, ecology, components, buildPlan, bounds } = outputs;

  return (
    <div className="min-h-screen w-full">
      {/* Adaptive blend-difference cursor for the home page. Self-gates to fine
          pointer + motion-allowed; renders nothing (native cursor) otherwise. */}
      <AdaptiveCursor />

      {/* The "bower" intro: assembles center-screen, flies to the nav wordmark.
          Runs once per tab; reduced-motion / already-played render nothing. */}
      <BowerIntro />

      {/* Global nav: fixed, frozen at the top for the whole scroll session. Holds the
          single [data-wordmark] the intro hands the "bower" lockup onto. */}
      <SplashHeader />

      {/* 1 — HERO: the scroll-scrubbed 2D Oculus -> 3D gridshell -> render reveal */}
      <HeroReveal outputs={outputs} reduced={reduced} />

      {/* 2 — ALWAYS BECOMING, the emotional core (field-chartreuse) + D2 */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <h2 className={H2}>
          A structure that keeps <em className="italic">becoming</em>.
        </h2>
        <p className={BODY}>
          Every Eden is planted the day it is built, a bare lattice and a young climber. Each season
          after, it holds more leaf, more flower, more shade than the one before.
        </p>

        <div className="mt-12">
          <SeasonalBecomingDiagram outputs={outputs} />
        </div>
      </EngineSection>

      {/* 3 — THE ENGINE (vellum, #how-it-works): the condensed engine explainer.
          Merges the old catalog-certainty pitch with HowItWorks secs 1, 2 and 6:
          pipeline mechanics + one envelope diagram + a honesty coda. The full
          six-section walkthrough (sun path, growth phases) lives at /engine. */}
      <EngineSection ground="vellum" reduced={reduced} id="how-it-works">
        <h2 className={H2}>
          Instead of a catalogue of shapes to choose from, a grammar computes the{' '}
          <em className="italic">one</em> that's yours.
        </h2>
        <p className={BODY}>
          You shape four things: footprint, rise, lattice spacing, and the way it opens. A fabrication
          grammar clamps them to what a cutter can actually make, then the same functions run every
          time: geometry, cut list, nesting, sun path, ecology, so the same choices always mean the
          same pavilion.
        </p>

        <div className="mx-auto mt-12 max-w-[640px]">
          <PipelineSchematic />
        </div>

        <div className="mx-auto mt-12 max-w-[520px]">
          <SiteEnvelopeDiagram outputs={outputs} />
          <AnnotationStrip>
            footprint {geometry.footprintM2.toFixed(1)} m² · rise {geometry.riseM.toFixed(2)} m ·
            spacing {geometry.params.strutSpacingM.toFixed(2)} m · {geometry.feetCount} feet · rings{' '}
            {geometry.ringCount} · spokes {geometry.spokeCount}
          </AnnotationStrip>
          {bounds.notes[0] && <AnnotationStrip>grammar: {deDash(bounds.notes[0])}</AnnotationStrip>}
        </div>

        {/* Honesty coda, hairline-divided beneath the diagrams (folds HowItWorks sec 6). */}
        <div className="mt-12 border-t border-inkBlack/15 pt-8">
          <p className="max-w-[60ch] text-[17px] leading-relaxed opacity-90">
            Every shape in the family is buildable; widening the family still takes a chartered
            engineer. The ecology figures are honest rules of thumb, not a survey, and the price is
            computed from the same cut list a fabricator would quote from.
          </p>
        </div>

        <a
          href={routes.engine}
          className="mt-10 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
        >
          See the full engine walkthrough →
        </a>
      </EngineSection>

      {/* 3b — THE COMMISSION RITUAL (field-blue). Process shown expanded here, then
          compact in the close. Live production figures from the same default outputs
          the commission sheet reads. */}
      <EngineSection ground="blue" reduced={reduced}>
        <h2 className={H2}>
          What actually <em className="italic">happens</em> after you shape it.
        </h2>
        <p className={BODY}>You shape it, we cut it, you plant it, and that's genuinely the whole of it.</p>

        <ol className="mt-10 max-w-[640px]">
          {ritualSteps(components.totalCount).map((step) => (
            <li
              key={step.n}
              className="flex gap-5 border-t border-inkNavy/15 py-4 first:border-t-0 sm:py-5"
            >
              <span className="pt-[3px] font-mono text-[12px] tabular-nums opacity-50">{step.n}</span>
              <span className="text-[16px] leading-snug sm:text-[17px]">{step.text}</span>
            </li>
          ))}
        </ol>

        <AnnotationStrip>
          this design: ~{components.totalCount} components · ~{buildPlan.leadTimeWeeks} wks
        </AnnotationStrip>
      </EngineSection>

      {/* 4 — LIVING, NOT PLACED ON (field-yellow) + D reuse + ecology facts */}
      <EngineSection ground="yellow" reduced={reduced}>
        <h2 className={H2}>
          A structure with a <em className="italic">habitat</em> built in.
        </h2>
        <p className={BODY}>
          The lattice is a living armature: its density and orientation are computed for how your
          chosen plant climbs, so it has exactly the support it needs. It stands on ground screws,
          not a poured slab, so the soil beneath it stays alive.
        </p>

        <div className="mt-12">
          <StrutFieldDiagram outputs={outputs} />
        </div>

        {/* What stays the same (objection handling before the facts), hairline register. */}
        <div className="mt-12 border-t border-inkBlack/15 pt-6">
          <StaysRow label="What stays the same" value={STAYS_THE_SAME.keeps} />
          <StaysRow label="What an Eden adds" value={STAYS_THE_SAME.adds} />
          <p className="mt-5 font-mono text-[11px] leading-relaxed tracking-[0.06em] opacity-70">
            {PD_FACT}
          </p>
        </div>

        {/* Ecology facts row (the numbers NOT shown in section 2), hairline register. */}
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-inkBlack/15 pt-6 sm:grid-cols-4">
          <EcoFact label="habitat" value={`${ecology.habitatAreaM2} m²`} />
          <EcoFact label="pollinator cells" value={`${ecology.pollinatorCells}`} />
          <EcoFact label="rainwater" value={`${ecology.rainwaterLitresPerYr.toLocaleString('en-GB')} L / yr`} />
          <EcoFact label="flowering" value={deDash(ecology.floweringMonths)} />
        </dl>
      </EngineSection>

      {/* 6 — CLOSE (vellum), one purpose: register email. The commission-ritual
          restatement and the repeated #how-it-works CTA are gone (each was shown
          twice); the engine section above is the single reasoning destination. */}
      <EngineSection ground="vellum" reduced={reduced} id="register">
        <h2 className={H2}>
          Two ways to <em className="italic">begin</em>.
        </h2>
        <p className={BODY}>
          See the reasoning in the engine section above, or just put your name down, which takes
          about ten seconds.
        </p>

        <RegisterInterest />
      </EngineSection>

      {/* Company monument: Bower is the company, Eden its one product. One quiet,
          viewport-wide lowercase wordmark closes the page. */}
      <footer className="w-full overflow-hidden bg-paperVellum px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-[880px] border-t border-inkBlack/15 pt-8">
          <p className="whitespace-nowrap font-serifDisplay font-semibold lowercase leading-none tracking-[-0.03em] text-inkBlack text-[clamp(4rem,20vw,14rem)]">
            bower
          </p>
        </div>
      </footer>
    </div>
  );
}

/** One labelled line in the section-4 "what stays the same" strip (mono register). */
function StaysRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[minmax(0,150px)_1fr] sm:gap-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">{label}</div>
      <div className="font-mono text-[13px] leading-relaxed tracking-[0.02em] opacity-90">{value}</div>
    </div>
  );
}

/** One mono fact in the section-4 ecology row (hairline register, not a card). */
function EcoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">{label}</dt>
      <dd className="font-mono text-[13px] tracking-[0.02em] opacity-90">{value}</dd>
    </div>
  );
}
