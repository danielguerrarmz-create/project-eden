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
  const buildPlan = useDesign((s) => s.outputs.buildPlan);
  const setCommissionOpen = useDesign((s) => s.setCommissionOpen);

  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/45 p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">your price, fixed</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serifDisplay text-[40px] font-semibold leading-none tabular-nums text-inkBlack">
          {gbp(price.fixedTotalGBP)}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-inkBlack/60">
        one figure, held: fabrication, install, groundwork and planting
      </p>

      <details className="group mt-2.5 border-t border-inkBlack/12 pt-2.5">
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
          {/* Honesty, kept, but where it belongs: inside the build-up, not on the headline. */}
          <p className="pt-2 text-[10px] leading-relaxed text-inkBlack/45">
            Indicative until your site survey and fabrication quote. The figure is built from this
            design's real cut list, so it moves correctly as you shape it.
          </p>
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
