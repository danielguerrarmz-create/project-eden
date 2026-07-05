/**
 * StepDesign.tsx — Step 2. "Design your Eden."
 * The whole v1 wall of 8 sliders collapses to three choices, now ranked: Size and
 * Planting are the two primary decisions (co-equal, side by side, each reshapes
 * the render), Openness is a demoted fine-tune below. The Eden renders live; the
 * price surfaces here so Step 3 becomes a confirmation, not a reveal.
 */
import type { ReactNode } from 'react';
import { useDesign, SIZE_PRESETS, plotRadiusCapM, type SizePreset } from '../state/store';
import { SPECIES, DEFAULT_SPECIES_ID } from '../engine/species';
import { Scene } from '../scene/Scene';
import { CtaLink } from '../ui/CtaLink';
import { deDash } from '../ui/text';

const SIZE_ORDER: SizePreset[] = ['intimate', 'standard', 'grand'];
const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function StepDesign() {
  const setStep = useDesign((s) => s.setStep);
  const sizePreset = useDesign((s) => s.sizePreset);
  const setSizePreset = useDesign((s) => s.setSizePreset);
  const sizeTouched = useDesign((s) => s.sizeTouched);
  const openness = useDesign((s) => s.openness01);
  const setOpenness = useDesign((s) => s.setOpenness);
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);
  const speciesTouched = useDesign((s) => s.speciesTouched);
  const plot = useDesign((s) => s.plot);
  const geo = useDesign((s) => s.outputs.geometry);
  const strut = useDesign((s) => s.outputs.strutField);
  const price = useDesign((s) => s.outputs.price.incVatGBP);

  const cap = plotRadiusCapM(plot);
  const clampedByPlot = SIZE_PRESETS[sizePreset].radiusM > cap;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 pb-8 pt-24">
      <div className="mb-3">
        <div className="mb-1 flex items-center gap-2">
          <DesignGlyph />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70">
            step two · design
          </p>
        </div>
        <h1 className="font-serifDisplay text-4xl font-semibold leading-none text-inkBlack sm:text-5xl">
          Design <em className="italic">your</em> Eden.
        </h1>
        <p className="mt-2 font-mono text-[12px] tracking-[0.04em] text-inkBlack/70">
          estimated {gbp(price)} · updates as you choose
        </p>
      </div>

      {/* Stage */}
      <div className="relative h-[44vh] min-h-[320px] overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/50 to-paperVellum/40 shadow-[0_24px_70px_-50px_rgba(23,22,15,0.6)]">
        <Scene />
        <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[11px] text-inkBlack/45">
          {geo.spanM.toFixed(1)} m span · {geo.heightM.toFixed(1)} m tall · fits a {plot.widthM}×{plot.depthM} m plot
        </div>
        <div className="pointer-events-none absolute right-4 top-3 max-w-[220px] rounded-2xl border border-line bg-paperVellum/90 px-3 py-2 text-[11px] leading-snug text-inkBlack/70 backdrop-blur">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-accentOlive">engine</span>{' '}
          {deDash(strut.habitStrategy)}
        </div>
      </div>

      {/* Two primary decisions: Size + Planting, side by side (Planting favored). */}
      <div className="mt-5 grid gap-5 md:grid-cols-[45fr_55fr]">
        {/* Size */}
        <div>
          <ControlHeading>size</ControlHeading>
          <div className="flex gap-2">
            {SIZE_ORDER.map((k) => {
              const active = sizePreset === k;
              const recommended = !sizeTouched && k === 'standard';
              return (
                <button
                  key={k}
                  onClick={() => setSizePreset(k)}
                  aria-pressed={active}
                  className={`h-11 flex-1 rounded-full px-3 text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-inkBlack text-paperVellum'
                      : 'border border-line text-inkBlack/85 hover:border-inkBlack/40'
                  } ${recommended ? 'ring-2 ring-accentOlive/70' : ''}`}
                >
                  {SIZE_PRESETS[k].label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-inkBlack/70">
            {SIZE_PRESETS[sizePreset].blurb}
            {!sizeTouched && sizePreset === 'standard' && (
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/70">
                recommended
              </span>
            )}
          </p>
          {clampedByPlot && (
            <p className="mt-1.5 text-[11px] text-amber">
              clamped to your plot: max radius {cap.toFixed(1)} m
            </p>
          )}
        </div>

        {/* Planting (the thesis, slightly wider) */}
        <div>
          <ControlHeading>planting</ControlHeading>
          <div className="flex flex-wrap gap-2">
            {SPECIES.map((sp) => {
              const active = sp.id === speciesId;
              const recommended = !speciesTouched && sp.id === DEFAULT_SPECIES_ID;
              return (
                <button
                  key={sp.id}
                  onClick={() => setSpecies(sp.id)}
                  aria-pressed={active}
                  className={`flex h-10 items-center gap-2 rounded-full px-3.5 transition-all duration-150 ${
                    active
                      ? 'bg-inkBlack text-paperVellum'
                      : 'border border-line text-inkBlack/85 hover:border-inkBlack/40'
                  } ${recommended ? 'ring-2 ring-accentOlive/70' : ''}`}
                >
                  <span className="text-[13px] font-medium leading-none">{sp.common}</span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.08em] ${
                      active ? 'text-paperVellum/60' : 'text-inkBlack/45'
                    }`}
                  >
                    {sp.habit}
                  </span>
                </button>
              );
            })}
          </div>
          {!speciesTouched && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/70">
              common honeysuckle · recommended
            </p>
          )}
        </div>
      </div>

      {/* Openness: demoted fine-tune, full-width slim row */}
      <div className="mt-5 flex items-center gap-4">
        <span className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70">
          openness
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={openness}
          onChange={(e) => setOpenness(Number(e.target.value))}
          className="botanical flex-1"
          aria-label="openness: sheltered bower to airy screen"
        />
        <span className="hidden w-28 shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.1em] text-inkBlack/45 sm:block">
          {openness < 0.5 ? 'sheltered bower' : openness > 0.5 ? 'airy screen' : 'balanced'}
        </span>
      </div>

      <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between">
        <CtaLink label="back" onClick={() => setStep(1)} variant="ghost" back />
        <CtaLink label="grow your Eden" onClick={() => setStep(3)} />
      </div>
    </div>
  );
}

function ControlHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70">
      {children}
    </div>
  );
}

/** A tiny dome/strut glyph, echoing the Engine page's D3 strut-field diagrams. */
function DesignGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#17160F" aria-hidden>
      <path d="M2.5 13 C 2.5 5, 13.5 5, 13.5 13" strokeWidth={1} />
      <path d="M8 4.2 L8 13 M5 6.2 L5 13 M11 6.2 L11 13" strokeWidth={0.7} opacity={0.7} />
    </svg>
  );
}
