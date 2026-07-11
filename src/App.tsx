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
 * 2026-07-11 app-like layout: the studio is now a single full-viewport,
 * no-scroll instrument (lg:h-screen / lg:overflow-hidden). A thin top toolbar
 * carries the title; the 3D Scene is the star, a canvas that FLEXES to fill the
 * height between two docked control rails (price + shaping on the left, planting +
 * ecology on the right). Everything is reachable on a 1440×900 laptop with no
 * page scroll. Below lg it stacks and scrolls normally. The Scene, the store, the
 * sliders, pricing, and every behaviour are UNCHANGED — this is layout/chrome only.
 *
 * 2026-07-10 chrome unify: the studio wears the site's documentation-layer
 * language (paperVellum ground, editorial serif headings, hairline + mono labels,
 * olive accent) so it matches the engine and about pages.
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
const PANEL = 'rounded-lg border border-inkBlack/12 bg-white/45 p-4';
const PANEL_TITLE = 'font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50';
const CHIP =
  'rounded-full border border-inkBlack/12 bg-paperVellum/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/70 backdrop-blur';

export default function App() {
  return (
    <div className="relative w-full bg-paperVellum text-inkBlack lg:h-screen lg:overflow-hidden">
      <Navbar />

      {/* The whole instrument sits below the floating nav pill and fills the
          viewport: a thin title toolbar, then a work area that flexes to the
          bottom of the screen. min-h-0 lets the canvas own the leftover height. */}
      <div className="flex flex-col px-3 pb-3 pt-[68px] lg:h-full">
        <StudioToolbar />

        <main className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
          <LeftRail />
          <StagePane />
          <RightRail />
        </main>
      </div>

      <CommissionSheet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top toolbar — the crafted label, folded into a single thin band so it never
// pushes the canvas down. What this is, and how it behaves, in one line.
// ---------------------------------------------------------------------------
function StudioToolbar() {
  return (
    <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-inkBlack/10 px-1 pb-2.5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/45">
          The studio
        </span>
        <h1 className="font-serifDisplay text-[18px] leading-none text-inkBlack">
          Shape your <em className="italic">Eden</em>.
        </h1>
      </div>
      <p className="hidden max-w-[64ch] font-serifDisplay text-[12px] leading-snug text-inkBlack/55 md:block">
        Move any control and the structure, planting and price settle together. Every form you can
        reach is one a fabricator could cut tomorrow.
      </p>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Left rail — the commissioning instruments: live price + Commission, then the
// four shaping sliders with their grammar reasons.
// ---------------------------------------------------------------------------
function LeftRail() {
  const notes = useDesign((s) => s.outputs.bounds.notes);

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
      <PricePanel />

      <div className={PANEL}>
        <h2 className={PANEL_TITLE}>Shape it</h2>
        <div className="mt-3 space-y-3">
          <ParamSlider param="footprintM2" />
          <ParamSlider param="riseM" />
          <ParamSlider param="strutSpacingM" />
          <ParamSlider param="apertureDeg" />
        </div>
        {/* Grammar notes: the engine narrating its own fabrication decisions. */}
        <div className="mt-3 space-y-1 border-t border-inkBlack/12 pt-2.5">
          {notes.map((n) => (
            <p key={n} className="font-mono text-[11px] leading-snug text-inkBlack/55">
              <span className="uppercase tracking-[0.12em] text-accentOlive">grammar ·</span> {deDash(n)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Centre stage — the pavilion, growth toggle, engine chips. The canvas fills
// the whole cell (Scene is absolute inset-0) so it flexes with the viewport.
// ---------------------------------------------------------------------------
function StagePane() {
  const geo = useDesign((s) => s.outputs.geometry);
  const strut = useDesign((s) => s.outputs.strutField);
  const growth = useDesign((s) => s.outputs.growth);

  return (
    <div className="relative h-[56vh] min-h-[360px] overflow-hidden rounded-lg border border-inkBlack/12 bg-gradient-to-b from-white/50 to-paperDeep/40 shadow-[0_24px_70px_-56px_rgba(23,22,15,0.5)] lg:h-full lg:min-h-0">
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

// ---------------------------------------------------------------------------
// Right rail — the living answer: which plant the armature is tuned for, and
// the ecology the finished Eden yields.
// ---------------------------------------------------------------------------
function RightRail() {
  return (
    <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
      <SpeciesPicker />
      <EcologyPanel />
    </div>
  );
}

function SpeciesPicker() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);

  return (
    <div className={PANEL}>
      <h2 className={PANEL_TITLE}>Planting</h2>
      <p className="mt-1.5 text-[12px] leading-snug text-inkBlack/55">
        the armature re-weights for how each plant climbs, and how heavy it gets
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {SPECIES.map((sp) => {
          const active = sp.id === speciesId;
          return (
            <button
              key={sp.id}
              onClick={() => setSpecies(sp.id)}
              aria-pressed={active}
              className={`rounded-lg border px-2.5 py-1.5 text-left transition ${
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

function EcologyPanel() {
  const ecology = useDesign((s) => s.outputs.ecology);

  return (
    <div className={PANEL}>
      <h2 className={PANEL_TITLE}>Ecology</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Eco label="habitat" value={`${ecology.habitatAreaM2} m²`} />
        <Eco label="pollinator cells" value={`${ecology.pollinatorCells}`} />
        <Eco label="rainwater / yr" value={`${ecology.rainwaterLitresPerYr.toLocaleString('en-GB')} L`} />
        <Eco label="flowering" value={deDash(ecology.floweringMonths)} />
      </div>
    </div>
  );
}

function Eco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/40 px-3 py-2">
      <div className="font-serifDisplay text-[18px] font-semibold leading-none text-inkBlack">{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45">{label}</div>
    </div>
  );
}
