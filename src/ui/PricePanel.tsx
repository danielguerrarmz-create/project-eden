/**
 * PricePanel.tsx — the live price ticker beside the viewport (demo-spec §2.3).
 *
 * One guaranteed figure ("£38,700, fixed"), ticking on every parameter change,
 * with the decomposition one disclosure away: components / fabrication /
 * install / planting / margin. Decomposition = credibility, and the margin is
 * shown plainly. The placeholder-rate note stays on screen until Clay's fab
 * quote is wired into config.ts — the price MOVES correctly, it is not yet TRUE.
 *
 * 2026-07-10 chrome unify: documentation-layer styling (mono eyebrow, editorial
 * serif figure, inkBlack CTA, amber honesty note kept). Values + logic unchanged.
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
    <div className="rounded-lg border border-inkBlack/12 bg-white/45 p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">your price, fixed</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serifDisplay text-[44px] font-semibold leading-none tabular-nums text-inkBlack">
          {gbp(price.fixedTotalGBP)}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-inkBlack/60">
        includes fabrication, install, groundwork and planting
      </p>
      <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber">
        <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
        <span>placeholder fab rate, real quote lands here (config.ts)</span>
      </p>

      <details className="group mt-3 border-t border-inkBlack/12 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/55 hover:text-inkBlack">
          <span>how this price is built</span>
          <span className="text-inkBlack/40 transition group-open:rotate-90">›</span>
        </summary>
        <div className="mt-3 space-y-1 text-[12px]">
          {price.lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-3">
              <span className="text-inkBlack/70">
                {deDash(l.label)}
                {l.note && <span className="block text-[10px] text-inkBlack/45">{deDash(l.note)}</span>}
              </span>
              <span className="font-mono tabular-nums text-inkBlack">{gbp(l.valueGBP)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-inkBlack/12 pt-1.5">
            <span className="font-medium text-inkBlack">fixed total</span>
            <span className="font-mono font-medium tabular-nums text-inkBlack">{gbp(price.fixedTotalGBP)}</span>
          </div>
        </div>
      </details>

      <button
        onClick={() => setCommissionOpen(true)}
        className="mt-5 w-full rounded-lg bg-inkBlack px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paperVellum transition-colors hover:bg-accentOlive hover:text-inkBlack"
      >
        Commission · {components.totalCount} components, ~{buildPlan.leadTimeWeeks} wks
      </button>
    </div>
  );
}
