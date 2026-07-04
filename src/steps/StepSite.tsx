/**
 * StepSite.tsx — Step 1. "Where's your garden?"
 * An honest address stub (or a sample plot), then the top-down plot mapper. The
 * mapped rectangle + north feed the engine's footprint cap and sun-path.
 */
import { useState } from 'react';
import { useDesign, type Plot } from '../state/store';
import { PlotMapper } from '../ui/PlotMapper';
import { CtaLink } from '../ui/CtaLink';

const SAMPLES: { name: string; plot: Partial<Plot> }[] = [
  { name: 'town courtyard', plot: { widthM: 6, depthM: 5, northDeg: 20, address: '14 Alder Mews, Bristol' } },
  { name: 'suburban lawn', plot: { widthM: 9, depthM: 7, northDeg: 0, address: '3 Hazel Close, Reading' } },
  { name: 'walled garden', plot: { widthM: 12, depthM: 9, northDeg: 300, address: 'The Old Rectory, Devon' } },
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
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-moss">step one · site</p>
          <h1 className="font-display text-5xl font-semibold lowercase leading-[0.95] text-ink sm:text-6xl">
            where's your
            <br />
            garden?
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-inkSoft">
            Start from your place. Map the patch of ground the folly will live on, then we design
            a pollinator pavilion that fits it and faces the sun.
          </p>

          <div className="mt-7">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-inkFaint">
              address <span className="normal-case text-inkFaint/70">(demo stub, no lookup)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="type a street, or pick a sample below"
                className="flex-1 rounded-full border border-line bg-white/60 px-4 py-2.5 text-sm text-ink placeholder:text-inkFaint/70 focus:border-moss focus:outline-none"
              />
              <button
                onClick={() => typed.trim() && setPlot({ address: typed.trim() })}
                className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-inkSoft hover:border-moss hover:text-ink transition"
              >
                set
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-inkFaint">
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
                    className="rounded-full border border-line bg-white/50 px-3.5 py-1.5 text-sm text-inkSoft hover:border-moss hover:text-ink transition"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {address && (
              <p className="mt-4 text-sm text-mossDeep">
                mapping <span className="font-medium">{address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: the mapper */}
        <div className="rounded-3xl border border-line bg-white/40 p-6 shadow-[0_20px_60px_-40px_rgba(30,27,23,0.5)]">
          <div className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-inkFaint">
            drag the edges to size · drag the coral dot to orient
          </div>
          <PlotMapper />
        </div>
      </div>

      <div className="mt-10 flex justify-center md:justify-end">
        <CtaLink label="design the folly" onClick={() => setStep(2)} />
      </div>
    </div>
  );
}
