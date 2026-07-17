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
import { CONTACT_EMAIL } from '../data/config';
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

/**
 * THE THREE SEASONS — one Eden, one camera, one ground, bare to bloom.
 *
 * The captions are the section's OWN SENTENCE, split across the three frames it describes ("a bare
 * lattice and a young climber ... more leaf, more flower"). They are quoted rather than invented on
 * purpose: anything else here would be a claim about time that nobody has made — "year one" / "year
 * five" would be inventing a growth rate, and this page is careful about that everywhere else.
 *
 * Daniel's own work (confirmed 2026-07-16), so they carry no attribution note.
 *
 * Re-encoded from the 2400px JPEGs he supplied: 1600px on the long edge, WebP q82. The three
 * together went 1,323KB -> 445KB (-66%). Measured for dead white first, the way the project heroes
 * had to be: 0% on all three, so the Plentify problem does not repeat here.
 */
const SEASONS = [
  {
    src: '/hero/v4/eden-bare-frame.webp',
    alt: 'The Eden gridshell the day it is built: a bare timber lattice with its oculus open to the sky, a young climber planted at the foot of the central mast',
    caption: 'A bare lattice and a young climber',
  },
  {
    src: '/hero/v4/eden-green-front.webp',
    alt: 'The same gridshell after some seasons, the lattice carrying dense green foliage and ferns',
    caption: 'More leaf',
  },
  {
    src: '/hero/v4/eden-bloom-front.webp',
    alt: 'The same gridshell in bloom, wisteria and white blossom hanging through the timber lattice',
    caption: 'More flower',
  },
] as const;

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

        {/* THE SENTENCE ABOVE, SHOWN. One structure, one camera, one ground, three seasons — the
            section stops asserting that an Eden keeps becoming and starts showing it.

            THIS IS THE ONE PLACE THESE THREE CAN GO, and the copy is what says so rather than
            taste: "a bare lattice and a young climber" IS eden-bare-frame (look for the seedling on
            the mast), "more leaf" IS eden-green-front, "more flower" IS eden-bloom-front. The order
            is the sentence's order. Nothing else on this page argues that a thing changes over time.

            The images are the EVIDENCE, so they sit between the claim and the diagram: the paragraph
            says it, these show it, SeasonalBecomingDiagram measures it.

            No fixed-aspect box, no object-fit, no crop — each element is its own picture at its own
            ratio (all three are 1.342, identical renders of the same view, so the row is even
            without anything being forced). See CLAUDE.md: stop forcing geometry onto something that
            already knows its own shape. */}
        <figure className="mt-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SEASONS.map((s) => (
              <div key={s.src}>
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
                <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] opacity-55">
                  {s.caption}
                </figcaption>
              </div>
            ))}
          </div>
        </figure>

        <div className="mt-12">
          <SeasonalBecomingDiagram outputs={outputs} />
        </div>
      </EngineSection>

      {/* 3 — THE ENGINE (vellum, #how-it-works): the condensed engine explainer.
          Merges the old catalog-certainty pitch with HowItWorks secs 1, 2 and 6:
          pipeline mechanics + one envelope diagram + a honesty coda. The full
          six-section walkthrough (sun path, growth phases) lives at /engine. */}
      <EngineSection ground="vellum" reduced={reduced} id="how-it-works">
        {/* The wedge, said plainly once: what Bower is, for whom, and why it is a studio and
            not a catalogue. Every reader gets the frame before the mechanics. */}
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-55">What Bower is</p>
        <p className="mt-3 max-w-[44ch] font-serifDisplay text-[clamp(1.35rem,2.4vw,2rem)] leading-snug">
          A generative design studio. An engine computes a one of a kind timber structure for your
          garden, priced and buildable as you shape it, that a climber grows into season after season.
        </p>
        <h2 className={`mt-12 ${H2}`}>
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

        {/* Honesty coda: lead with what's automated, then the moat, then the honest caveat. */}
        <div className="mt-12 border-t border-inkBlack/15 pt-8">
          <p className="max-w-[62ch] text-[17px] leading-relaxed opacity-90">
            The price is computed from the same cut list a fabricator would quote from, and every
            shape you can reach is buildable. Widening that family takes a chartered engineer, and
            each commission widens it, so the engine compounds with every Eden it makes. The ecology
            figures are honest rules of thumb, not a survey.
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

      {/* 6 — CLOSE (vellum): the low-commitment register, then quiet real doors so no
          reader (buyer, advisor, investor) dead-ends. Each door is a working link. */}
      <EngineSection ground="vellum" reduced={reduced} id="register">
        <h2 className={H2}>
          <em className="italic">Begin.</em>
        </h2>
        <p className={BODY}>
          These are the first Edens, and yours could be among them. Put your name down, which takes
          about ten seconds, or find your way in below.
        </p>

        <RegisterInterest />

        <div className="mt-12 grid gap-x-10 gap-y-6 border-t border-inkBlack/15 pt-8 sm:grid-cols-3">
          <Door label="Commission one" href={routes.studio} note="Shape it in the studio." />
          <Door
            label="Designers & architects"
            href={`mailto:${CONTACT_EMAIL}?subject=Bower%20for%20my%20client`}
            note="Specify an Eden for a client."
          />
          <Door
            label="Investors"
            href={`mailto:${CONTACT_EMAIL}?subject=Bower%20%E2%80%94%20investment`}
            note="The engine, the model, the plan."
          />
        </div>
        <a
          href={routes.about}
          className="mt-8 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
        >
          Who is behind this →
        </a>
      </EngineSection>

      {/* Company monument: Bower is the company, Eden its one product. One quiet,
          viewport-wide lowercase wordmark closes the page. */}
      <footer className="w-full overflow-hidden bg-paperVellum pb-16">
        <div className="mx-auto w-full max-w-read border-t border-inkBlack/15 px-gutter pt-8">
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

/** One "door" in the close: a labelled way in (buyer, advisor, investor), each a real link.
 *  A left-origin olive underline grows on hover, matching the nav's quiet motion register. */
function Door({ label, href, note }: { label: string; href: string; note: string }) {
  return (
    <a href={href} className="group block">
      <span className="font-serifDisplay text-[19px] leading-tight text-inkBlack">
        {label}
        <span className="ml-1.5 inline-block text-accentOlive transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </span>
      <span className="mt-1 block font-mono text-[11px] leading-relaxed tracking-[0.04em] text-inkBlack/50">
        {note}
      </span>
    </a>
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
