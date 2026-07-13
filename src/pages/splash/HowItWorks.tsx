/**
 * HowItWorks.tsx — the generative-engine walkthrough that renders on the standalone
 * #/engine page (EnginePage). This file is the PRESENTATION WRAPPER only: the engine
 * functions and every diagram (PipelineSchematic, SiteEnvelopeDiagram, SunPathDiagram,
 * StrutFieldDiagram, GrowthPhasesDiagram) are untouched and still render live output.
 *
 * 2026-07-10 restyle + reorganize: an opening HERO with the thesis, a meta strip, and a
 * PIPELINE INDEX linking the stages; then the stages as numbered two-column editorial
 * spreads (prose on the left, the diagram framed as a "plate" on the right, sticky on
 * desktop), and a closing honesty section. The field-color grounds and all copy are
 * unchanged; only the layout, numbering, and diagram framing are new.
 */
import type { ReactNode } from 'react';
import type { EngineOutputs } from '../../engine/types';
import { deDash } from '../../ui/text';
import { PRODUCT } from '../../data/config';
import { routes } from '../../routing';
import { AnnotationStrip, Eyebrow, EngineSection } from '../engine/EngineSection';
import { PipelineSchematic } from '../engine/PipelineSchematic';
import { SiteEnvelopeDiagram } from '../engine/SiteEnvelopeDiagram';
import { SunPathDiagram } from '../engine/SunPathDiagram';
import { StrutFieldDiagram } from '../engine/StrutFieldDiagram';
import { GrowthPhasesDiagram } from '../engine/GrowthPhasesDiagram';
import { H1, H2, BODY } from '../typeScale';

/** The pipeline stages, in order. Drives both the hero index and each stage header, so a
 *  reorder is a one-list change. `short` is the index label; `eyebrow` opens the stage. */
const STAGES = [
  { id: 'grammar', n: '01', short: 'Grammar & geometry', eyebrow: 'What the engine actually does' },
  { id: 'sun', n: '02', short: 'Solar geometry', eyebrow: 'Solar geometry' },
  { id: 'species', n: '03', short: 'Planting parametrics', eyebrow: 'Planting-informed parametrics' },
  { id: 'growth', n: '04', short: 'Establishment', eyebrow: 'Establishment, shown, not claimed' },
  { id: 'honesty', n: '05', short: 'What holds up', eyebrow: 'What is real and what is a rule of thumb' },
] as const;

/** A hairline that adopts the section ink (currentColor), for dividers over any ground. */
function Rule({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`h-px w-full bg-current opacity-20 ${className}`} />;
}

/** The numbered stage header: an accent-olive index number beside the mono eyebrow. */
function StageHead({ n, eyebrow }: { n: string; eyebrow: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-[13px] tracking-[0.1em] text-accentOlive">{n}</span>
      <Eyebrow>{eyebrow}</Eyebrow>
    </div>
  );
}

/** A diagram framed as an editorial plate: a hairline rule, a mono "live output" label, then
 *  the untouched diagram and its annotations. Sticky on desktop so it holds while the prose
 *  scrolls past. */
function Plate({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
      <Rule />
      <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">
        {label}
      </figcaption>
      <div className="mt-5 space-y-10">{children}</div>
    </figure>
  );
}

/** A two-column stage spread: prose left, diagram plate right (stacked on mobile). */
function Stage({
  id,
  n,
  eyebrow,
  ground,
  reduced,
  prose,
  plate,
}: {
  id: string;
  n: string;
  eyebrow: string;
  ground: 'blue' | 'chartreuse' | 'yellow' | 'vellum';
  reduced: boolean;
  prose: ReactNode;
  plate: ReactNode;
}) {
  return (
    <EngineSection ground={ground} reduced={reduced} id={id} wide>
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <div>
          <StageHead n={n} eyebrow={eyebrow} />
          {prose}
        </div>
        <div>{plate}</div>
      </div>
    </EngineSection>
  );
}

export function HowItWorks({
  outputs,
  reduced,
  lead = false,
}: {
  outputs: EngineOutputs;
  reduced: boolean;
  /** True on the ENGINE page, where this band is the first thing under the fixed header
   *  and must clear it. On the splash it sits below the hero, so it must NOT. */
  lead?: boolean;
}) {
  const { geometry, sunPath, strutField, bounds } = outputs;

  return (
    <>
      {/* HERO (field-blue): thesis + meta strip + the pipeline index. */}
      <EngineSection ground="blue" reduced={reduced} id="how-it-works" wide lead={lead}>
        <div className="max-w-[62ch]">
          <Eyebrow>The generative engine</Eyebrow>
          <h2 className={`mt-4 ${H1}`}>
            Every pavilion is <em className="italic">computed</em>, not chosen from a catalogue.
          </h2>
          <p className="mt-8 text-[18px] leading-relaxed opacity-90">
            Every form on this site comes out of a small pipeline of plain functions. Four shaping
            parameters, a species, and the sun go in. A structure you could actually cut, on feet that
            land on the ground, comes out. Nothing is selected from a range of preset shapes.
          </p>
          <p className="mt-6 max-w-[54ch] font-serifDisplay text-[clamp(1.15rem,1.7vw,1.55rem)] italic leading-snug">
            The engine is the asset. Each commission a chartered engineer signs off widens the family
            it can build, so the studio compounds with every Eden it makes.
          </p>
        </div>

        {/* Meta strip: what the engine is, in three words. */}
        <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4">
          {[
            ['Method', 'Deterministic'],
            ['Output', 'Buildable on feet'],
            ['Figures', 'Live, not illustrated'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">{k}</dt>
              <dd className="mt-1 font-serifDisplay text-[17px]">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Pipeline index: jump links to each stage. This is a hash-routed SPA, so the
            links must NOT set `#stage` (that would overwrite the `#/engine` route and bounce
            to home). They keep the route href for a no-JS fallback and smooth-scroll the
            section into view on click. */}
        <nav aria-label="Pipeline stages" className="mt-12">
          <Rule />
          <ol className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((s) => (
              <li key={s.id}>
                <a
                  href={routes.engine}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(s.id)
                      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
                  }}
                  className="group flex items-baseline gap-2.5"
                >
                  <span className="font-mono text-[11px] tracking-[0.1em] text-accentOlive">{s.n}</span>
                  <span className="font-serifDisplay text-[15px] leading-snug underline decoration-inkNavy/25 decoration-1 underline-offset-4 transition-colors group-hover:decoration-inkNavy group-focus-visible:decoration-inkNavy">
                    {s.short}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </EngineSection>

      {/* 01 — GRAMMAR & GEOMETRY (vellum): grammar, then one geometry. Two diagrams. */}
      <Stage
        id={STAGES[0].id}
        n={STAGES[0].n}
        eyebrow={STAGES[0].eyebrow}
        ground="vellum"
        reduced={reduced}
        prose={
          <>
            <h2 className={`mt-4 ${H2}`}>
              A fabrication grammar first, then one <em className="italic">geometry</em>.
            </h2>
            <p className={BODY}>
              The four things you shape, footprint, rise, lattice spacing, and the aperture bearing, do
              not feed the geometry directly. They pass through a fabrication grammar first: a set of
              stated cutting rules that recomputes each control's limits for the design in front of you.
              A small footprint pulls the rise cap below the planning limit because a flatter crown would
              exceed the cutting tolerance. Widen the footprint far enough and the engine adds a fourth
              foot, because otherwise an edge blank would run longer than a CNC sheet. The form cannot
              leave what the grammar allows, which is what makes every shape you can reach buildable.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              What the grammar permits then runs through the same functions every time: the geometry
              produces a cut list, and separately a nesting layout on real sheet stock. Read against the
              sun path it produces a strut field. The geometry and species together produce an ecology
              reading. The species and year together produce a growth state.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              None of these functions hold hidden state. Given the same choices, the engine produces the
              same pavilion, every time. That is what "generative" means here: not random, not AI
              generated art, a deterministic pipeline you could run on paper.
            </p>
          </>
        }
        plate={
          <Plate label="Live output · pipeline + geometry">
            <PipelineSchematic />
            <div>
              <SiteEnvelopeDiagram outputs={outputs} />
              <AnnotationStrip>
                footprint {geometry.footprintM2.toFixed(1)} m² · rise {geometry.riseM.toFixed(2)} m ·
                spacing {geometry.params.strutSpacingM.toFixed(2)} m · {geometry.feetCount} feet · rings{' '}
                {geometry.ringCount} · spokes {geometry.spokeCount}
              </AnnotationStrip>
              {bounds.notes[0] && <AnnotationStrip>grammar: {deDash(bounds.notes[0])}</AnnotationStrip>}
            </div>
          </Plate>
        }
      />

      {/* 02 — SOLAR GEOMETRY (field-blue). */}
      <Stage
        id={STAGES[1].id}
        n={STAGES[1].n}
        eyebrow={STAGES[1].eyebrow}
        ground="blue"
        reduced={reduced}
        prose={
          <>
            <h2 className={`mt-4 ${H2}`}>
              The engine reads <em className="italic">where</em> the sun will be, not just which way the
              pavilion faces.
            </h2>
            <p className={BODY}>
              Given a latitude and the day of year, the engine computes the sun's altitude and compass
              bearing hour by hour, using the same solar position astronomy an architect would use by
              hand: a declination angle for the date, an hour angle for the time, and standard
              trigonometry to resolve altitude and azimuth. It is deterministic. The same site, the same
              date, always gives the same arc, which is why the same pavilion looks right in the render
              every time you come back to it.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              The engine then rolls that arc into eight compass sectors and finds which sector
              accumulates the most sun over the whole day, weighted by how high the sun sits at each
              hour, not just which way faces the sun at solar noon. On a long summer day that is often an
              eastern or western face rather than due south, since a face catches many hours of climbing
              or falling sun where south only catches the brief overhead peak. That most-sun-hours sector
              is what the next section uses to decide where the structure needs the densest support.
            </p>
          </>
        }
        plate={
          <Plate label="Live output · sun path">
            <div>
              <SunPathDiagram outputs={outputs} />
              <AnnotationStrip>
                peak altitude {sunPath.peakAltitudeDeg.toFixed(0)}° · most sun-hours:{' '}
                {strutField.sunwardSector}
              </AnnotationStrip>
            </div>
          </Plate>
        }
      />

      {/* 03 — PLANTING-INFORMED PARAMETRICS (field-yellow), the living thesis. */}
      <Stage
        id={STAGES[2].id}
        n={STAGES[2].n}
        eyebrow={STAGES[2].eyebrow}
        ground="yellow"
        reduced={reduced}
        prose={
          <>
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
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              The load-bearing frame never changes. Only the fine support pattern the plant attaches to
              does. Changing the species reshapes the planting support, never the structure holding it
              up.
            </p>
          </>
        }
        plate={
          <Plate label="Live output · strut field">
            <StrutFieldDiagram outputs={outputs} />
          </Plate>
        }
      />

      {/* 04 — ESTABLISHMENT (field-chartreuse). */}
      <Stage
        id={STAGES[3].id}
        n={STAGES[3].n}
        eyebrow={STAGES[3].eyebrow}
        ground="chartreuse"
        reduced={reduced}
        prose={
          <>
            <h2 className={`mt-4 ${H2}`}>
              Year three is a <em className="italic">projection</em>, and the page says so.
            </h2>
            <p className={BODY}>
              Coverage is modeled from one honest number per species: its typical rate of new growth per
              year, applied to a saturating curve so the structure approaches full coverage but is never
              guaranteed to reach it. This is a visual approximation of establishment, not a biological
              warranty. Newly planted coverage starts low, is roughly a third clothed after one growing
              season, and reads about three quarters clothed by year three, still visibly a living
              structure in progress, not a finished product photograph.
            </p>
          </>
        }
        plate={
          <Plate label="Live output · growth phases">
            <GrowthPhasesDiagram outputs={outputs} />
          </Plate>
        }
      />

      {/* 05 — WHAT HOLDS UP (vellum): honesty, single column, closing CTA. */}
      <EngineSection ground="vellum" reduced={reduced} id={STAGES[4].id} wide>
        <div className="max-w-[70ch]">
          <StageHead n={STAGES[4].n} eyebrow={STAGES[4].eyebrow} />
          <h2 className={`mt-4 ${H2}`}>
            Structural validity here means <em className="italic">inside a designed family</em>, not an
            engineer's sign-off on every shape.
          </h2>
          <p className={BODY}>
            Every control is clamped to the fabrication grammar before the geometry is built. That is
            what guarantees a buildable structure: not a live finite-element check on every
            configuration, but the shape's inability to leave a family of cuts and spans that has
            already been engineered once. Push any control to its extreme and the pavilion still reads
            as buildable, because it cannot leave the grammar. The honest limit is that widening that
            family still takes a chartered engineer, one sign-off at a time.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed opacity-90">
            The ecology figures, habitat area, pollinator cells, rainwater capture, and carbon, are
            labeled rule-of-thumb formulas built from named constants, not an ecological survey. They
            move honestly with the design. They are not a certified environmental assessment.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed opacity-90">
            The price moves correctly with the cut list, but the per-component rate is still a
            placeholder until a fabrication shop returns a real quote. It is honest as a shape, not yet
            true as a number, and the page would rather say so than pretend.
          </p>

          <a
            href={routes.studio}
            className="mt-12 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
          >
            Shape your own {PRODUCT} →
          </a>
        </div>
      </EngineSection>
    </>
  );
}
