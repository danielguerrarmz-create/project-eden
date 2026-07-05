/**
 * StepDesign.tsx — Step 2. "Design your Eden."
 * The whole v1 wall of 8 sliders collapses to THREE choices: Size (3 presets),
 * Openness (one slider), Planting (curated species). The Eden renders live on
 * its mapped plot; changing the species visibly re-weights the strut heatmap.
 */
import { useDesign, SIZE_PRESETS, plotRadiusCapM, type SizePreset } from '../state/store';
import { SPECIES } from '../engine/species';
import { Scene } from '../scene/Scene';
import { CtaLink } from '../ui/CtaLink';
import { deDash } from '../ui/text';

const SIZE_ORDER: SizePreset[] = ['intimate', 'standard', 'grand'];

export function StepDesign() {
  const setStep = useDesign((s) => s.setStep);
  const sizePreset = useDesign((s) => s.sizePreset);
  const setSizePreset = useDesign((s) => s.setSizePreset);
  const openness = useDesign((s) => s.openness01);
  const setOpenness = useDesign((s) => s.setOpenness);
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);
  const plot = useDesign((s) => s.plot);
  const geo = useDesign((s) => s.outputs.geometry);
  const strut = useDesign((s) => s.outputs.strutField);

  const cap = plotRadiusCapM(plot);
  const clampedByPlot = SIZE_PRESETS[sizePreset].radiusM > cap;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 pb-8 pt-24">
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-moss">step two · design</p>
        <h1 className="font-display text-4xl font-semibold lowercase leading-none text-ink sm:text-5xl">
          design your Eden
        </h1>
      </div>

      {/* Stage */}
      <div className="relative h-[46vh] min-h-[320px] overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/40 to-paperDeep/40 shadow-[0_24px_70px_-50px_rgba(30,27,23,0.6)]">
        <Scene />
        <div className="pointer-events-none absolute bottom-3 left-4 text-xs text-inkFaint">
          {geo.spanM.toFixed(1)} m span · {geo.heightM.toFixed(1)} m tall · fits a {plot.widthM}×{plot.depthM} m plot
        </div>
        <div className="pointer-events-none absolute right-4 top-3 max-w-[220px] rounded-2xl border border-line/70 bg-paper/85 px-3 py-2 text-[11px] leading-snug text-inkSoft backdrop-blur">
          <span className="font-semibold text-mossDeep">engine:</span> {deDash(strut.habitStrategy)}
        </div>
      </div>

      {/* Three controls */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {/* Size */}
        <div>
          <ControlLabel n="1" title="size" />
          <div className="flex gap-2">
            {SIZE_ORDER.map((k) => {
              const active = sizePreset === k;
              return (
                <button
                  key={k}
                  onClick={() => setSizePreset(k)}
                  aria-pressed={active}
                  className={`flex-1 rounded-2xl border px-2 py-2.5 text-center transition ${
                    active
                      ? 'border-moss bg-moss/12'
                      : 'border-line bg-white/40 hover:border-moss/60'
                  }`}
                >
                  <div className={`text-sm font-semibold ${active ? 'text-mossDeep' : 'text-ink'}`}>
                    {SIZE_PRESETS[k].label}
                  </div>
                  <div className="text-[10px] text-inkFaint">{SIZE_PRESETS[k].blurb}</div>
                </button>
              );
            })}
          </div>
          {clampedByPlot && (
            <p className="mt-1.5 text-[11px] text-amber">
              clamped to your plot: max radius {cap.toFixed(1)} m
            </p>
          )}
        </div>

        {/* Openness */}
        <div>
          <ControlLabel n="2" title="openness" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={openness}
            onChange={(e) => setOpenness(Number(e.target.value))}
            className="botanical mt-3 w-full"
            aria-label="openness: sheltered bower to airy screen"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-inkFaint">
            <span>sheltered bower</span>
            <span>airy screen</span>
          </div>
        </div>

        {/* Planting */}
        <div>
          <ControlLabel n="3" title="planting" />
          <div className="grid max-h-[128px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
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
      </div>

      <div className="mt-6 flex items-center justify-between">
        <CtaLink label="back" onClick={() => setStep(1)} variant="ghost" back />
        <CtaLink label="see it grow" onClick={() => setStep(3)} />
      </div>
    </div>
  );
}

function ControlLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-semibold text-paper">
        {n}
      </span>
      <span className="font-display text-lg font-semibold lowercase text-ink">{title}</span>
    </div>
  );
}
