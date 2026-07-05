/**
 * StepSite.tsx — Step 1. "Where's your garden?"
 * An honest address stub (or a sample plot), then the top-down plot mapper. The
 * mapped rectangle + north feed the engine's footprint cap and sun-path. This is
 * where the plot and sun enter the pipeline.
 */
import { useState } from 'react';
import { useDesign, type Plot } from '../state/store';
import { PlotMapper } from '../ui/PlotMapper';
import { CtaLink } from '../ui/CtaLink';

const SAMPLES: { name: string; plot: Partial<Plot> }[] = [
  { name: 'Town courtyard', plot: { widthM: 6, depthM: 5, northDeg: 20, address: '14 Alder Mews, Bristol' } },
  { name: 'Suburban lawn', plot: { widthM: 9, depthM: 7, northDeg: 0, address: '3 Hazel Close, Reading' } },
  { name: 'Walled garden', plot: { widthM: 12, depthM: 9, northDeg: 300, address: 'The Old Rectory, Devon' } },
];

export function StepSite() {
  const setPlot = useDesign((s) => s.setPlot);
  const setStep = useDesign((s) => s.setStep);
  const address = useDesign((s) => s.plot.address);
  const [typed, setTyped] = useState('');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 pb-10 pt-28">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        {/* Left: intent + address */}
        <div className="max-w-md">
          <div className="mb-3 flex items-center gap-2">
            <SiteGlyph />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70">
              step one · site
            </p>
          </div>
          <h1 className="font-quote text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.02em] text-inkBlack">
            Where's <em className="italic">your</em> garden?
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-inkBlack/70">
            Map the patch of ground your Eden will live on. We'll design a pollinator pavilion that
            fits it and faces the sun.
          </p>

          <div className="mt-7">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
              address <span className="normal-case">(demo stub, no lookup)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="type a street, or pick a sample below"
                className="flex-1 rounded-full border border-line bg-white/60 px-4 py-2.5 text-sm text-inkBlack placeholder:text-inkBlack/45 focus:border-accentOlive focus:outline-none"
              />
              <button
                onClick={() => typed.trim() && setPlot({ address: typed.trim() })}
                className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-inkBlack/85 transition hover:border-inkBlack/40"
              >
                set
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
                or use a sample plot
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      setPlot(s.plot);
                      setTyped(s.plot.address ?? '');
                    }}
                    className="flex h-10 items-center rounded-full border border-line bg-paperVellum px-4 text-sm text-inkBlack/85 transition hover:border-inkBlack/40"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {address && (
              <p className="mt-4 text-sm text-inkBlack/70">
                mapping <span className="font-medium text-inkBlack">{address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: the mapper */}
        <div className="rounded-3xl border border-line bg-white/40 p-6 shadow-[0_20px_60px_-40px_rgba(23,22,15,0.5)]">
          <div className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/45">
            drag the edges to size · drag the marker to set north
          </div>
          <PlotMapper />
        </div>
      </div>

      <div className="sticky bottom-4 z-20 mt-10 flex justify-center md:justify-end">
        <CtaLink label="design your Eden" onClick={() => setStep(2)} />
      </div>
    </div>
  );
}

/** A tiny plot-with-north glyph, the D1 site-envelope grammar at icon scale. */
function SiteGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#17160F" aria-hidden>
      <rect x={2.5} y={4.5} width={11} height={8} strokeWidth={1} />
      <path d="M8 4.5 L8 1.6 M6.9 2.7 L8 1.3 L9.1 2.7" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
