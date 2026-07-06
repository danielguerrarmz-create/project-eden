/**
 * App.tsx — the single-page studio (demo-spec §1).
 *
 * One screen, built to be filmed in one take: the pavilion on its ground
 * plane, four sliders that stop at grammar bounds with visible reasons, a
 * species selector the lattice armature answers to, the year 0/1/3 growth
 * toggle, a live fixed price beside the viewport, and a Commission button
 * that opens the spec sheet + nesting preview. No steps, no accounts, no
 * backend; the design persists as a URL.
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

export default function App() {
  return (
    <div className="relative min-h-screen w-full bg-paper text-ink">
      <Navbar />

      <main className="mx-auto grid w-full max-w-[1360px] gap-5 px-6 pb-6 pt-20 lg:grid-cols-[1fr_360px] lg:items-start">
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
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/40 to-paperDeep/40 shadow-[0_24px_70px_-50px_rgba(30,27,23,0.6)]">
        <Scene />

        {/* Engine strategy chip: what the armature is doing for this species */}
        <div className="pointer-events-none absolute left-4 top-3 max-w-[300px] rounded-2xl border border-line/70 bg-paper/85 px-3 py-2 text-[11px] leading-snug text-inkSoft backdrop-blur">
          <span className="font-semibold text-mossDeep">engine:</span> {deDash(strut.habitStrategy)}
        </div>

        {/* Growth stage chip */}
        <div className="pointer-events-none absolute right-4 top-3 rounded-full border border-line/70 bg-paper/85 px-3 py-1 text-xs text-inkSoft backdrop-blur">
          {deDash(growth.label)} · <span className="font-semibold text-mossDeep">{Math.round(growth.coverageFraction * 100)}%</span> clothed
        </div>

        {/* Dimensions strip */}
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-line/70 bg-paper/85 px-3 py-1 text-xs text-inkSoft backdrop-blur">
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
        className="flex items-center gap-1 rounded-full border border-line/70 bg-paper/85 p-1 shadow-sm backdrop-blur"
        role="group"
        aria-label="growth year"
      >
        {GROWTH.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              year === y ? 'bg-moss text-paper' : 'text-inkSoft hover:text-ink'
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
    <div className="rounded-2xl border border-line bg-white/40 px-3 py-2.5">
      <div className="font-display text-lg font-semibold text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-inkFaint">{label}</div>
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

      <div className="rounded-3xl border border-line bg-white/50 p-5">
        <h2 className="mb-3 font-display text-xl font-semibold lowercase text-ink">shape it</h2>
        <div className="space-y-3">
          <ParamSlider param="footprintM2" />
          <ParamSlider param="riseM" />
          <ParamSlider param="strutSpacingM" />
          <ParamSlider param="apertureDeg" />
        </div>
        {/* Grammar notes: the engine narrating its own fabrication decisions. */}
        <div className="mt-3 space-y-1 border-t border-line pt-2.5">
          {notes.map((n) => (
            <p key={n} className="text-[11px] leading-snug text-inkFaint">
              <span className="font-semibold text-mossDeep">grammar:</span> {deDash(n)}
            </p>
          ))}
        </div>
      </div>

      <ConstructionPicker />

      <SpeciesPicker />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Construction: the two physical-kit choices (FABRICATION.md §2–§5). These
// change the joint schedule, the stock plan and the price — visibly.
// ---------------------------------------------------------------------------
function ConstructionPicker() {
  const jointSystem = useDesign((s) => s.params.jointSystem);
  const footStrategy = useDesign((s) => s.params.footStrategy);
  const setJointSystem = useDesign((s) => s.setJointSystem);
  const setFootStrategy = useDesign((s) => s.setFootStrategy);

  return (
    <div className="rounded-3xl border border-line bg-white/50 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold lowercase text-ink">build it</h2>
      <p className="mb-3 text-[11px] leading-snug text-inkFaint">
        two ways to joint the lattice, two ways to meet the lawn — the cut files and hardware
        schedule follow your choice
      </p>
      <Segmented
        label="joints"
        value={jointSystem}
        onChange={(v) => setJointSystem(v as 'hub' | 'lamella')}
        options={[
          { value: 'hub', title: 'steel hubs', hint: 'straight struts, laser-cut nodes' },
          { value: 'lamella', title: 'lamella', hint: 'all-timber weave, one bolt per node' },
        ]}
      />
      <div className="mt-2.5">
        <Segmented
          label="feet"
          value={footStrategy}
          onChange={(v) => setFootStrategy(v as 'legs' | 'sweep')}
          options={[
            { value: 'legs', title: 'legs', hint: 'eave ring on posts + ground screws' },
            { value: 'sweep', title: 'sweep', hint: 'the lattice itself curves to ground' },
          ]}
        />
      </div>
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; title: string; hint: string }[];
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-inkFaint">{label}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                active ? 'border-moss bg-moss/10' : 'border-line bg-white/40 hover:border-moss/50'
              }`}
            >
              <div className={`text-[12px] font-medium leading-tight ${active ? 'text-ink' : 'text-inkSoft'}`}>
                {o.title}
              </div>
              <div className="text-[10px] text-inkFaint">{o.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpeciesPicker() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);

  return (
    <div className="rounded-3xl border border-line bg-white/50 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold lowercase text-ink">planting</h2>
      <p className="mb-3 text-[11px] leading-snug text-inkFaint">
        the armature re-weights for how each plant climbs, and how heavy it gets
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {SPECIES.map((sp) => {
          const active = sp.id === speciesId;
          return (
            <button
              key={sp.id}
              onClick={() => setSpecies(sp.id)}
              aria-pressed={active}
              className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                active ? 'border-bloom bg-bloom/10' : 'border-line bg-white/40 hover:border-bloom/50'
              }`}
            >
              <div className={`text-[12px] font-medium leading-tight ${active ? 'text-ink' : 'text-inkSoft'}`}>
                {sp.common}
              </div>
              <div className="text-[10px] italic text-inkFaint">{sp.habit}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
