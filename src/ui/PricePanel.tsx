/**
 * PricePanel.tsx — the live price ticker beside the viewport (demo-spec §2.3).
 *
 * One guaranteed figure ("£38,700, fixed"), ticking on every parameter change,
 * with the decomposition one disclosure away: components / fabrication /
 * install / planting / margin. Decomposition = credibility, and the margin is
 * shown plainly. The placeholder-rate note stays on screen until Clay's fab
 * quote is wired into config.ts — the price MOVES correctly, it is not yet TRUE.
 */
import { useDesign } from '../state/store';
import { deDash } from './text';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function PricePanel() {
  const price = useDesign((s) => s.outputs.price);
  const components = useDesign((s) => s.outputs.components);
  const buildPlan = useDesign((s) => s.outputs.buildPlan);
  const setCommissionOpen = useDesign((s) => s.setCommissionOpen);

  return (
    <div className="rounded-3xl border border-line bg-white/50 p-5">
      <div className="text-[11px] font-medium uppercase tracking-widest text-inkFaint">
        your price, fixed
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-display text-[44px] font-semibold leading-none tabular-nums text-ink">
          {gbp(price.fixedTotalGBP)}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-inkSoft">
        includes fabrication, install, groundwork and planting
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-[11px] text-amber">
        <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
        <span>placeholder fab rate, real quote lands here (config.ts)</span>
      </p>

      <details className="group mt-3 border-t border-line pt-2.5 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] text-inkSoft hover:text-ink">
          <span>how this price is built</span>
          <span className="text-inkFaint transition group-open:rotate-90">›</span>
        </summary>
        <div className="mt-2 space-y-1 text-[12px]">
          {price.lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-3">
              <span className="text-inkSoft">
                {deDash(l.label)}
                {l.note && <span className="block text-[10px] text-inkFaint">{deDash(l.note)}</span>}
              </span>
              <span className="font-mono tabular-nums text-ink">{gbp(l.valueGBP)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line pt-1">
            <span className="font-medium text-ink">fixed total</span>
            <span className="font-mono font-medium tabular-nums text-ink">{gbp(price.fixedTotalGBP)}</span>
          </div>
        </div>
      </details>

      <button
        onClick={() => setCommissionOpen(true)}
        className="mt-4 w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-mossDeep"
      >
        Commission · {components.totalCount} components, ~{buildPlan.leadTimeWeeks} wks
      </button>
    </div>
  );
}
