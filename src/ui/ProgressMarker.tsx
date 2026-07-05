/**
 * ProgressMarker.tsx — the slim 3-step marker. The active step is an ink dot with
 * an accent-olive ring and its label; done steps are ink dots with a checkmark and
 * a hover/focus tooltip summarizing the decision made there; upcoming steps are
 * quiet line dots. Clicking a completed step goes back to it.
 */
import { useDesign, SIZE_PRESETS, type Step } from '../state/store';

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'site' },
  { n: 2, label: 'design' },
  { n: 3, label: 'grow' },
];

export function ProgressMarker() {
  const step = useDesign((s) => s.step);
  const setStep = useDesign((s) => s.setStep);
  const plot = useDesign((s) => s.plot);
  const sizePreset = useDesign((s) => s.sizePreset);
  const speciesCommon = useDesign((s) => s.outputs.species.common);

  const summaryFor = (n: Step): string | null => {
    if (n === 1) return `${plot.widthM}×${plot.depthM}m, ${plot.northDeg}°`;
    if (n === 2) return `${SIZE_PRESETS[sizePreset].label} · ${speciesCommon}`;
    return null;
  };

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const active = s.n === step;
        const done = s.n < step;
        const summary = done ? summaryFor(s.n) : null;
        const tipId = `step-${s.n}-summary`;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <div className="group relative flex items-center">
              <button
                onClick={() => done && setStep(s.n)}
                disabled={!done && !active}
                aria-describedby={summary ? tipId : undefined}
                className={`flex items-center gap-1.5 rounded-full transition ${
                  active ? 'py-1 pl-1 pr-3' : done ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`grid place-items-center rounded-full text-[10px] font-semibold transition ${
                    active
                      ? 'h-5 w-5 bg-inkBlack text-paperVellum ring-2 ring-accentOlive'
                      : done
                        ? 'h-4 w-4 bg-inkBlack text-paperVellum'
                        : 'h-4 w-4 bg-line text-inkBlack/45'
                  }`}
                >
                  {done ? '✓' : s.n}
                </span>
                {active && (
                  <span className="font-mono text-[11px] tracking-[0.12em] lowercase text-inkBlack">
                    {s.label}
                  </span>
                )}
              </button>
              {summary && (
                <span
                  id={tipId}
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-paperVellum px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-inkBlack/70 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {summary}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}
