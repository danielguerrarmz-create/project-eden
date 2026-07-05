/**
 * EnginePage.tsx — the Generative Engine explainer (#/engine).
 *
 * Six full-bleed field-color sections that explain, honestly, what the engine in
 * src/engine actually computes. Every diagram renders live engine output, not
 * illustration. Built from docs/ENGINE-PAGE-SPEC.md. The configurator is never
 * touched: this is the documentation layer (field color + editorial serif +
 * hairline linework), opened via hash route, and it reads the same default Eden a
 * first-time visitor would see (the store initializes its outputs eagerly).
 */
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { routes } from '../routing';
import { AnnotationStrip, Eyebrow, EngineSection } from './engine/EngineSection';
import { PipelineSchematic } from './engine/PipelineSchematic';
import { SiteEnvelopeDiagram } from './engine/SiteEnvelopeDiagram';
import { SunPathDiagram } from './engine/SunPathDiagram';
import { StrutFieldDiagram } from './engine/StrutFieldDiagram';
import { GrowthPhasesDiagram } from './engine/GrowthPhasesDiagram';

const H1 = 'font-quote font-bold leading-[0.98] tracking-[-0.02em] text-[clamp(2.75rem,6vw,5.5rem)]';
const H2 = 'font-serifDisplay font-semibold leading-[1.04] tracking-[-0.01em] text-[clamp(1.75rem,3.5vw,3rem)]';
const BODY = 'mt-6 max-w-[60ch] text-[17px] leading-relaxed opacity-90';

export function EnginePage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);
  const plot = useDesign((s) => s.plot);
  const { geometry, sunPath, strutField } = outputs;

  return (
    <div className="min-h-screen w-full bg-fieldBlue">
      {/* Quiet header: mono wordmark + a real anchor back to the tool. */}
      <header className="flex items-center justify-between bg-fieldBlue px-6 pt-6 text-inkNavy sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">
          living eden · the engine
        </span>
        <a
          href={routes.configurator}
          className="font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
        >
          back to the configurator
        </a>
      </header>

      {/* 1 — HERO (field-blue, the one Bodoni moment) */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>The generative engine</Eyebrow>
        <h1 className={`mt-4 ${H1}`}>
          Eden is <em className="italic">computed</em>, not chosen from a catalogue.
        </h1>
        <p className="mt-8 max-w-[60ch] text-[18px] leading-relaxed opacity-90">
          Every Eden on this site comes out of a small pipeline of plain functions. A plot, a
          species, and the sun go in. A structure you could actually cut goes out. Nothing is
          selected from a range of preset shapes.
        </p>
      </EngineSection>

      {/* 2 — THE PIPELINE (vellum) + D1 */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>What the engine actually does</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Four pure functions, one <em className="italic">Eden</em>.
        </h2>
        <p className={BODY}>
          One set of inputs, the plot, three sliders, a species, and a year, runs through the same
          functions every time, in this shape:
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          Design parameters produce a geometry. That geometry produces a cut list, and separately a
          strut field once it is read against the sun path. The geometry and species together
          produce an ecology reading. The species and year together produce a growth state.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          None of these functions hold hidden state. Given the same plot and the same choices, the
          engine produces the same Eden, every time. That is what "generative" means here: not
          random, not AI generated art, a deterministic pipeline you could run on paper.
        </p>

        <div className="mx-auto mt-12 max-w-[640px]">
          <PipelineSchematic />
        </div>

        <div className="mx-auto mt-12 max-w-[520px]">
          <SiteEnvelopeDiagram outputs={outputs} plot={plot} />
          <AnnotationStrip>
            enclosure {geometry.params.enclosurePct.toFixed(0)}% · lattice density{' '}
            {geometry.params.latticeDensity.toFixed(2)} · ribs {geometry.ribCount} · rings{' '}
            {geometry.ringCount}
          </AnnotationStrip>
        </div>
      </EngineSection>

      {/* 3 — READS THE SITE (field-blue) + D2 */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>Solar geometry</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The engine reads <em className="italic">where</em> the sun will be, not just where the plot
          is.
        </h2>
        <p className={BODY}>
          Given a latitude and the day of year, the engine computes the sun's altitude and compass
          bearing hour by hour, using the same solar position astronomy an architect would use by
          hand: a declination angle for the date, an hour angle for the time, and standard
          trigonometry to resolve altitude and azimuth. It is deterministic. The same site, the same
          date, always gives the same arc, which is why the same Eden looks right in the render every
          time you come back to it.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          The engine then rolls that arc into eight compass sectors and finds which one gets the most
          daylight. That single number, the sunniest sector, is what the next section uses to decide
          where the structure needs the densest support.
        </p>

        <div className="mx-auto mt-12 max-w-[460px]">
          <SunPathDiagram outputs={outputs} />
          <AnnotationStrip>
            peak altitude {sunPath.peakAltitudeDeg.toFixed(0)}° · sunniest face{' '}
            {strutField.sunwardSector}
          </AnnotationStrip>
        </div>
      </EngineSection>

      {/* 4 — THE STRUT FIELD, the thesis (field-yellow) + D3 */}
      <EngineSection ground="yellow" reduced={reduced}>
        <Eyebrow>Planting-informed parametrics</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Change the species, and the <em className="italic">skeleton</em> changes with it.
        </h2>
        <p className={BODY}>
          This is the one computation a printed catalogue cannot fake. The engine looks at two real
          things: how the chosen plant physically climbs (twining stems want close verticals to
          spiral around, tendrils want a fine mesh to grasp, scramblers want horizontal rails to be
          tied to, self-clinging roots want almost nothing), and where the sun falls hardest on the
          structure. It combines both into a density field: a rule-based pattern, not a black-box
          optimizer, that biases the support structure toward what this specific plant, on this
          specific site, actually needs.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          The load-bearing frame never changes. Only the fine support pattern the plant attaches to
          does. Changing the species reshapes the planting support, never the structure holding it
          up.
        </p>

        <div className="mt-12">
          <StrutFieldDiagram outputs={outputs} />
        </div>
      </EngineSection>

      {/* 5 — HOW IT GROWS (field-chartreuse) + D4 */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>Establishment, shown, not claimed</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Year three is a <em className="italic">projection</em>, and the page says so.
        </h2>
        <p className={BODY}>
          Coverage is modeled from one honest number per species: its typical rate of new growth per
          year, applied to a saturating curve so the structure approaches full coverage but is never
          guaranteed to reach it. This is a visual approximation of establishment, not a biological
          warranty. For the honeysuckle example, on the standard-size Eden, newly planted coverage
          starts low, is roughly a third clothed after one growing season, and reads about three
          quarters clothed by year three, still visibly a living structure in progress, not a
          finished product photograph.
        </p>

        <div className="mt-12">
          <GrowthPhasesDiagram outputs={outputs} />
        </div>
      </EngineSection>

      {/* 6 — WHAT THIS GUARANTEES (vellum), honesty + CTA */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>What is real and what is a rule of thumb</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Structural validity here means <em className="italic">inside a designed family</em>, not an
          engineer's sign-off on every shape.
        </h2>
        <p className={BODY}>
          Every slider is clamped to a pre-engineered envelope before the geometry is built. That is
          what guarantees a buildable structure: not a live finite-element check on every
          configuration, but the shape's inability to leave a family that has already been engineered
          once. Push any control to its extreme and the Eden still reads as buildable, because it
          cannot leave the box.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          The ecology figures, habitat area, pollinator cells, rainwater capture, and carbon, are
          labeled rule-of-thumb formulas built from named constants, not an ecological survey. They
          move honestly with the design. They are not a certified environmental assessment.
        </p>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90">
          Growth is shown as a projection on a saturating curve, not a warranty. A real planting will
          vary with soil, aspect, and care. The page shows what the model predicts, clearly dated by
          year, never as a finished photograph.
        </p>

        <a
          href={routes.configurator}
          className="mt-12 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
        >
          Configure your own Eden →
        </a>
      </EngineSection>
    </div>
  );
}
