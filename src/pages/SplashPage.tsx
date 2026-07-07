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
 * No margin, certification, or insurer claim anywhere; Biodiversity Net Gain in
 * section 4 is framed as market context, never as a certification the product carries.
 */
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { deDash } from '../ui/text';
import { CTA_PRIMARY_EVALUATOR } from '../data/config';
import { AnnotationStrip, Eyebrow, EngineSection } from './engine/EngineSection';
import { SiteEnvelopeDiagram } from './engine/SiteEnvelopeDiagram';
import { StrutFieldDiagram } from './engine/StrutFieldDiagram';
import { HeroReveal } from './splash/HeroReveal';
import { BowerIntro } from './splash/BowerIntro';
import { SeasonalBecomingDiagram } from './splash/SeasonalBecomingDiagram';
import { HowItWorks } from './splash/HowItWorks';
import { RegisterInterest } from './splash/RegisterInterest';
import { ritualSteps, ritualCompact, STAYS_THE_SAME, PD_FACT } from './splash/copy';
import { H2, BODY } from './typeScale';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function SplashPage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);
  const { geometry, ecology, price, components, buildPlan } = outputs;

  return (
    <div className="min-h-screen w-full">
      {/* The "bower" intro: assembles center-screen, flies to the nav wordmark.
          Runs once per tab; reduced-motion / already-played render nothing. */}
      <BowerIntro />

      {/* 1 — HERO: the scroll-scrubbed 2D Oculus -> 3D gridshell -> render reveal */}
      <HeroReveal outputs={outputs} reduced={reduced} />

      {/* 2 — ALWAYS BECOMING, the emotional core (field-chartreuse) + D2 */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>Always growing, never finished</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          A structure that keeps <em className="italic">becoming</em>.
        </h2>
        <p className={BODY}>
          Every Eden is planted the day it is built. It arrives quiet: a bare lattice and a young
          climber at its feet. Then it starts to change, and it does not stop. Each season it holds
          more leaf, more flower, more shade than the one before. There is no finished photograph,
          only the next one.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          You are not buying an object placed on a lawn. You are commissioning a place that keeps
          arriving, growing more alive and more beautiful with every season it stands.
        </p>

        <div className="mt-12">
          <SeasonalBecomingDiagram outputs={outputs} />
        </div>
      </EngineSection>

      {/* 3 — CATALOG CERTAINTY, COMMISSION SINGULARITY (vellum) + D reuse */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>Why it is technology, not joinery</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Shape it like clay. It <em className="italic">prices</em> itself as you do.
        </h2>
        <p className={BODY}>
          Every Eden comes out of a small, honest engine, not a catalogue of ten shapes. Footprint,
          rise, the spacing of the lattice, the direction it opens: four things you can shape, and
          every shape you reach is something a fabricator can actually cut. The form cannot leave
          what its own fabrication grammar allows, which is what makes it buildable at every position
          of every slider, not just the one in the brochure.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          That constraint is what makes the price real, not a fixed range with a footnote. Move a
          control and the price recalculates from the same cut list a fabricator would quote from,
          live, in front of you. Complex, organic form was never expensive because of material. It
          was expensive because of uncertainty. Remove the uncertainty, and a shape this alive
          becomes something you can simply commission.
        </p>

        <div className="mx-auto mt-12 max-w-[520px]">
          <SiteEnvelopeDiagram outputs={outputs} />
          <AnnotationStrip>
            footprint {geometry.footprintM2.toFixed(1)} m² · rise {geometry.riseM.toFixed(2)} m ·
            fixed price {gbp(price.fixedTotalGBP)}
          </AnnotationStrip>
        </div>
      </EngineSection>

      {/* 3b — THE COMMISSION RITUAL (field-blue). Process shown expanded here, then
          compact in the close. Live production figures from the same default outputs
          the commission sheet reads. */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>The commission, start to finish</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          What actually <em className="italic">happens</em> after you shape it.
        </h2>
        <p className={BODY}>You shape it, we cut it, you plant it. This is the whole of it.</p>

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
        <Eyebrow>Contributing to its garden, not just standing in it</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          A structure with a <em className="italic">habitat</em> built in.
        </h2>
        <p className={BODY}>
          The lattice is not just a frame, it is a living armature. Its density and orientation are
          computed for the climbing habit of the species you choose, so the plant has exactly the
          support it physically needs: twining stems close verticals to spiral around, tendrils a
          fine mesh to grasp, self-clinging roots almost nothing at all. The roof does not shed water
          to a drain, it channels it down to the beds it shelters. It stands on ground screws, not a
          poured slab, so the soil beneath it stays alive.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          The UK made Biodiversity Net Gain a legal requirement for new development in 2024: adding
          habitat to a site is moving from a nice idea to something that is measured. An Eden is
          built to sit on the right side of that line, honestly, without pretending to be an
          ecological survey.
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

      {/* HOW IT WORKS — the generative-engine explainer, folded in as an in-page
          band (anchor #how-it-works) between the Eden pitch above and the
          commission / register close below. Six live field-color EngineSections,
          formerly the #/engine page; opens on field-blue so it reads as its own
          movement in the scroll. */}
      <HowItWorks outputs={outputs} reduced={reduced} />

      {/* 5 — CLOSE (vellum), repeats the two CTAs + the one register form */}
      <EngineSection ground="vellum" reduced={reduced} id="register">
        <Eyebrow>Start here</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Two ways to <em className="italic">begin</em>.
        </h2>
        <p className={BODY}>
          If you want the proof first, the how it works section above walks through exactly what is
          real and what is a rule of thumb, with every diagram computed live. If you would rather
          just put your name down, that takes ten seconds.
        </p>

        {/* The commission ritual, restated compact (process shown twice). */}
        <p className="mt-8 max-w-[70ch] font-mono text-[11px] leading-relaxed tracking-[0.06em] opacity-60">
          {ritualCompact(components.totalCount)}
        </p>

        <a
          href="#how-it-works"
          className="mt-10 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
        >
          {CTA_PRIMARY_EVALUATOR} →
        </a>

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
