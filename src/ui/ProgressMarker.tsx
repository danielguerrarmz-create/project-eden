/**
 * ProgressMarker.tsx — the slim 3-step marker. Current step is a moss pill with
 * its label; done/upcoming steps are small dots. Clicking a completed step goes
 * back to it (forward is gated by the step CTAs).
 */
import { useDesign, type Step } from '../state/store';

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'site' },
  { n: 2, label: 'design' },
  { n: 3, label: 'grow' },
];

export function ProgressMarker() {
  const step = useDesign((s) => s.step);
  const setStep = useDesign((s) => s.setStep);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const active = s.n === step;
        const done = s.n < step;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <button
              onClick={() => done && setStep(s.n)}
              disabled={!done && !active}
              className={`flex items-center gap-1.5 rounded-full transition ${
                active
                  ? 'bg-moss/15 pl-2 pr-3 py-1'
                  : done
                    ? 'cursor-pointer'
                    : 'cursor-default'
              }`}
            >
              <span
                className={`grid place-items-center rounded-full text-[10px] font-semibold transition ${
                  active
                    ? 'h-5 w-5 bg-moss text-paper'
                    : done
                      ? 'h-4 w-4 bg-mossDeep text-paper'
                      : 'h-4 w-4 bg-line text-inkFaint'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              {active && (
                <span className="text-xs font-semibold lowercase text-mossDeep">{s.label}</span>
              )}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}
