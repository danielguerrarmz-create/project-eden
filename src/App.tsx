/**
 * App.tsx — the single-page studio (demo-spec §1).
 *
 * One screen, built to be filmed in one take: the pavilion on its ground
 * plane, four sliders that stop at grammar bounds with visible reasons, a
 * species selector the lattice armature answers to, the year 0/1/3 growth
 * toggle, a live fixed price beside the viewport, and a Commission button
 * that opens the spec sheet + nesting preview. No steps, no accounts, no
 * backend; the design persists as a URL.
 *
 * 2026-07-10 chrome unify: the studio now wears the site's documentation-layer
 * language (paperVellum ground, editorial serif headings, hairline + mono labels,
 * olive accent) so it matches the engine and about pages. The 3D Scene, the store,
 * the sliders, pricing, and every behaviour are UNCHANGED — this is wrapper only.
 */
import { GROWTH } from './data/config';
import { SPECIES } from './engine/species';
import { Scene } from './scene/Scene';
import { useDesign } from './state/store';
import { CommissionSheet } from './ui/CommissionSheet';
import { Navbar } from './ui/Navbar';
import { ParamSlider } from './ui/ParamSlider';
import { PricePanel } from './ui/PricePanel';
import { deDash } from './ui/text';

/** Shared panel + label vocabulary for the documentation-layer studio chrome. */
const PANEL = 'rounded-lg border border-inkBlack/12 bg-white/45 p-5';
const PANEL_TITLE = 'font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50';
const CHIP =
  'rounded-full border border-inkBlack/12 bg-paperVellum/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/70 backdrop-blur';

export default function App() {
  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <Navbar />

      {/* A crafted header so the studio reads as a commissioning instrument, not a bare
          control panel: what this is, and how it behaves, before you touch anything. */}
      <header className="mx-auto w-full max-w-[1360px] px-6 pt-24">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 border-b border-inkBlack/10 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/45">
              The studio
            </p>
            <h1 className="mt-2 font-serifDisplay text-[clamp(1.5rem,2.8vw,2.2rem)] leading-tight text-inkBlack">
              Shape your <em className="italic">Eden</em>.
            </h1>
          </div>
          <p className="max-w-[46ch] font-serifDisplay text-[14px] leading-snug text-inkBlack/60">
            Move any control and the structure, the planting, and the price settle together. Every
            form you can reach is one a fabricator could cut tomorrow.
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1360px] gap-6 px-6 pb-10 pt-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <StagePane />
        <ControlRail />
      </main>

      <CommissionSheet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left: the stage — pavilion, growth toggle, engine chips
// ---------------------------------------------------------------------------
function StagePane() {
  const geo = useDesign((s) => s.outputs.geometry);
  const strut = useDesign((s) => s.outputs.strutField);
  const growth = useDesign((s) => s.outputs.growth);

  return (
    <div>
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-lg border border-inkBlack/12 bg-gradient-to-b from-white/50 to-paperDeep/40 shadow-[0_24px_70px_-56px_rgba(23,22,15,0.5)]">
        <Scene />

        {/* Engine strategy chip: what the armature is doing for this species. A full
            sentence, so it stays sentence case (only the short data chips go uppercase). */}
        <div className="pointer-events-none absolute left-4 top-3 max-w-[300px] rounded-lg border border-inkBlack/12 bg-paperVellum/85 px-3 py-2 font-mono text-[11px] leading-snug text-inkBlack/70 backdrop-blur">
          <span className="uppercase tracking-[0.12em] text-accentOlive">engine ·</span>{' '}
          {deDash(strut.habitStrategy)}
        </div>

        {/* Growth stage chip */}
        <div className={`pointer-events-none absolute right-4 top-3 ${CHIP}`}>
          {deDash(growth.label)} ·{' '}
          <span className="text-accentOlive">{Math.round(growth.coverageFraction * 100)}%</span> clothed
        </div>

        {/* Dimensions strip */}
        <div className={`pointer-events-none absolute bottom-4 left-4 ${CHIP}`}>
          {geo.spanM.toFixed(1)} m span · {geo.riseM.toFixed(2)} m rise · {geo.footprintM2.toFixed(1)} m² ·{' '}
          {geo.feetCount} feet
        </div>

        <YearToggle />
      </div>

      <EcologyStrip />
    </div>
  );
}

function YearToggle() {
  const year = useDesign((s) => s.params.year);
  const setYear = useDesign((s) => s.setYear);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div
        className="flex items-center gap-1 rounded-full border border-inkBlack/12 bg-paperVellum/85 p-1 shadow-sm backdrop-blur"
        role="group"
        aria-label="growth year"
      >
        {GROWTH.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
              year === y ? 'bg-inkBlack text-paperVellum' : 'text-inkBlack/55 hover:text-inkBlack'
            }`}
          >
            Year {y}
          </button>
        ))}
      </div>
    </div>
  );
}

function EcologyStrip() {
  const ecology = useDesign((s) => s.outputs.ecology);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Eco label="habitat" value={`${ecology.habitatAreaM2} m²`} />
      <Eco label="pollinator cells" value={`${ecology.pollinatorCells}`} />
      <Eco label="rainwater / yr" value={`${ecology.rainwaterLitresPerYr.toLocaleString('en-GB')} L`} />
      <Eco label="flowering" value={deDash(ecology.floweringMonths)} />
    </div>
  );
}

function Eco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/40 px-3 py-2.5">
      <div className="font-serifDisplay text-[19px] font-semibold leading-none text-inkBlack">{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right: the control rail — price, four sliders, grammar notes, planting
// ---------------------------------------------------------------------------
function ControlRail() {
  const notes = useDesign((s) => s.outputs.bounds.notes);

  return (
    <div className="flex flex-col gap-4">
      <PricePanel />

      <div className={PANEL}>
        <h2 className={PANEL_TITLE}>Shape it</h2>
        <div className="mt-4 space-y-4">
          <ParamSlider param="footprintM2" />
          <ParamSlider param="riseM" />
          <ParamSlider param="strutSpacingM" />
          <ParamSlider param="apertureDeg" />
        </div>
        {/* Grammar notes: the engine narrating its own fabrication decisions. */}
        <div className="mt-4 space-y-1 border-t border-inkBlack/12 pt-3">
          {notes.map((n) => (
            <p key={n} className="font-mono text-[11px] leading-snug text-inkBlack/55">
              <span className="uppercase tracking-[0.12em] text-accentOlive">grammar ·</span> {deDash(n)}
            </p>
          ))}
        </div>
      </div>

      <SpeciesPicker />
    </div>
  );
}

function SpeciesPicker() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);

  return (
    <div className={PANEL}>
      <h2 className={PANEL_TITLE}>Planting</h2>
      <p className="mt-2 text-[12px] leading-snug text-inkBlack/55">
        the armature re-weights for how each plant climbs, and how heavy it gets
      </p>
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {SPECIES.map((sp) => {
          const active = sp.id === speciesId;
          return (
            <button
              key={sp.id}
              onClick={() => setSpecies(sp.id)}
              aria-pressed={active}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? 'border-accentOlive bg-accentOlive/10'
                  : 'border-inkBlack/12 bg-white/40 hover:border-accentOlive/50'
              }`}
            >
              <div
                className={`font-serifDisplay text-[13px] leading-tight ${active ? 'text-inkBlack' : 'text-inkBlack/70'}`}
              >
                {sp.common}
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/40">{sp.habit}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
