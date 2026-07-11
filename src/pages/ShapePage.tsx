/**
 * ShapePage.tsx — the direct-manipulation shaping prototype (`#/shape`).
 *
 * A feasibility spike for Goal 2: shape the pavilion by DRAGGING a control cage
 * instead of sliders. The scene mounts in `manipulate` mode (draggable handles),
 * and a live mono readout shows the engine responding + the grammar clamping in
 * real time, so the honesty of the loop is visible: every drag is routed back
 * through runEngine -> clampParams, so the form can never leave the buildable
 * family. Sai's interaction spec (docs/design/) refines the visuals from here.
 *
 * It wears the same splash chrome as the rest of the site: the one fixed floating
 * SplashHeader, paperVellum (#FBF9F3) ground, mono documentation-layer labels.
 * strutSpacingM is the one param with no spatial handle (it is lattice density,
 * not a dimension), so it stays a small finer/coarser control, documented as the
 * exception rather than smuggled back in as a slider.
 */
import { GRAMMAR } from '../data/config';
import { Scene } from '../scene/Scene';
import { useDesign, type SliderKey } from '../state/store';
import { deDash } from '../ui/text';
import { SplashHeader } from './splash/SplashHeader';

export function ShapePage() {
  const params = useDesign((s) => s.params);
  const geo = useDesign((s) => s.outputs.geometry);
  const notes = useDesign((s) => s.outputs.bounds.notes);
  const price = useDesign((s) => s.outputs.price.fixedTotalGBP);
  const setParam = useDesign((s) => s.setParam);

  const stepSpacing = (delta: number) => {
    const next = Math.round((params.strutSpacingM + delta) * 100) / 100;
    setParam('strutSpacingM' as SliderKey, next);
  };

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      {/* Full-bleed stage. Scene is `!absolute inset-0`, so a sized relative parent. */}
      <div className="relative h-[100svh] w-full overflow-hidden">
        <Scene manipulate />

        {/* Instruction, below the floating nav. */}
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-6">
          <p className="max-w-[52ch] text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/70">
            Prototype · drag the handles to shape the pavilion. The fabrication grammar clamps every
            move, so the form stays buildable.
          </p>
        </div>

        {/* Live readout, bottom-left: the params the drag is driving, clamped. */}
        <div className="absolute bottom-6 left-6 max-w-[300px] rounded-2xl border border-inkBlack/15 bg-paperVellum/85 px-4 py-3 backdrop-blur">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/55">
            live engine output
          </p>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            <Read label="footprint" value={`${geo.footprintM2.toFixed(1)} m²`} />
            <Read label="rise" value={`${geo.riseM.toFixed(2)} m`} />
            <Read label="aperture" value={`${Math.round(params.apertureDeg)}°`} />
            <Read label="spacing" value={`${params.strutSpacingM.toFixed(2)} m`} />
            <Read label="feet" value={`${geo.feetCount}`} />
            <Read label="span" value={`${geo.spanM.toFixed(1)} m`} />
          </dl>

          {/* strutSpacingM: the non-spatial param (lattice density), a small control. */}
          <div className="mt-3 flex items-center gap-2 border-t border-inkBlack/12 pt-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/55">
              lattice
            </span>
            <button
              onClick={() => stepSpacing(0.05)}
              disabled={params.strutSpacingM >= GRAMMAR.maxStrutSpacingM}
              className="rounded-md border border-inkBlack/20 px-2 py-0.5 font-mono text-[11px] transition hover:border-inkBlack/50 disabled:opacity-30"
              aria-label="coarser lattice"
            >
              coarser
            </button>
            <button
              onClick={() => stepSpacing(-0.05)}
              disabled={params.strutSpacingM <= GRAMMAR.minStrutSpacingM}
              className="rounded-md border border-inkBlack/20 px-2 py-0.5 font-mono text-[11px] transition hover:border-inkBlack/50 disabled:opacity-30"
              aria-label="finer lattice"
            >
              finer
            </button>
          </div>
        </div>

        {/* Grammar notes + price, bottom-right: the engine narrating its clamps. */}
        <div className="absolute bottom-6 right-6 max-w-[320px] rounded-2xl border border-inkBlack/15 bg-paperVellum/85 px-4 py-3 backdrop-blur">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/55">
            fixed price · grammar
          </p>
          <p className="font-serifDisplay text-[22px] font-semibold leading-none text-inkBlack">
            £{price.toLocaleString('en-GB')}
          </p>
          <div className="mt-2.5 space-y-1 border-t border-inkBlack/12 pt-2">
            {notes.map((n) => (
              <p key={n} className="font-mono text-[10px] leading-snug tracking-[0.02em] text-inkBlack/70">
                {deDash(n)}
              </p>
            ))}
          </div>
          <a
            href="#/engine"
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive"
          >
            how the engine works →
          </a>
        </div>
      </div>
    </div>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-inkBlack/50">{label}</dt>
      <dd className="font-mono text-[13px] tabular-nums tracking-[0.02em] text-inkBlack/90">{value}</dd>
    </div>
  );
}
