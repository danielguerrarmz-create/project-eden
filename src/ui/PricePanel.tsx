/**
 * PricePanel.tsx — the commission panel beside the viewport (demo-spec §2.3).
 *
 * 2026-07-17 honesty pass. This panel used to headline one computed figure as
 * "YOUR PRICE, FIXED". Both halves of that were wrong: no fab quote has landed,
 * so every rate behind the figure is a placeholder (see pricing.ts's header),
 * and the figure is a kit-plus-install cost that sits ~6x under what an Eden is
 * actually commissioned for. "Fixed" is a word for after the quotes come back.
 *
 * So the headline is now the STATED commission range, and the computed build-up
 * moved into the disclosure where it belongs: it is evidence about the KIT (a
 * real cut list, moving correctly as you shape), not a price. See ui/priceCopy.ts
 * for the distinction and for why the gap must not be closed in code.
 *
 * 2026-07-10 chrome unify: documentation-layer styling (mono eyebrow, editorial
 * serif figure, inkBlack CTA, amber honesty note kept).
 */
import { useDesign } from '../state/store';
import {
  COMMISSION_LABEL,
  COMMISSION_NOTE,
  COMMISSION_QUALIFIER,
  COMMISSION_RANGE,
  COST_BUILDUP_LABEL,
  COST_BUILDUP_NOTE,
  PRICE_QUALIFIER,
} from './priceCopy';
import { deDash } from './text';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function PricePanel() {
  const price = useDesign((s) => s.outputs.price);
  const buildPlan = useDesign((s) => s.outputs.buildPlan);
  const setCommissionOpen = useDesign((s) => s.setCommissionOpen);

  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/45 p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">
        {COMMISSION_LABEL}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serifDisplay text-[34px] font-semibold leading-none tabular-nums text-inkBlack">
          {COMMISSION_RANGE}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/45">
        {COMMISSION_QUALIFIER}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-inkBlack/60">{COMMISSION_NOTE}</p>

      <details className="group mt-2.5 border-t border-inkBlack/12 pt-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/55 hover:text-inkBlack">
          <span>{COST_BUILDUP_LABEL}</span>
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
            <span className="font-medium text-inkBlack">
              kit and install
              <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                {PRICE_QUALIFIER}
              </span>
            </span>
            <span className="font-mono font-medium tabular-nums text-inkBlack">{gbp(price.costBuildUpGBP)}</span>
          </div>
          {/* The admission travels WITH the figure, always. Without it the total
              sits under the range looking like a cheaper version of the same
              number, which is exactly the misreading to prevent: it is cost-plus
              at invented rates, the range is what an Eden sells for. */}
          <p className="pt-2 text-[10px] leading-relaxed text-inkBlack/45">{COST_BUILDUP_NOTE}</p>
        </div>
      </details>

      <button
        onClick={() => setCommissionOpen(true)}
        className="mt-4 w-full rounded-lg bg-inkBlack px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] text-paperVellum transition-colors hover:bg-accentOlive hover:text-inkBlack"
      >
        Commission this Eden
      </button>
      <p className="mt-2 text-center font-mono text-[10px] tracking-[0.08em] text-inkBlack/40">
        ready in about {buildPlan.leadTimeWeeks} weeks, planted
      </p>
    </div>
  );
}
