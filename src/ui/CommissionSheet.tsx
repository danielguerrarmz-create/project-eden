/**
 * CommissionSheet.tsx — the spec sheet view (demo-spec §2.5).
 *
 * What the Commission button opens: component count, BOM summary, assembly
 * step count, lead time, the fixed price, and the nesting preview — the
 * evidence that the form on the stage compiles to files a fab shop can cut.
 * Client-side view only; reserving captures an email locally (no backend).
 *
 * 2026-07-10 chrome unify: documentation-layer styling (paperVellum overlay,
 * mono eyebrows, editorial serif figures + titles, hairline panels, olive/amber
 * accents). NestingPreview, ReserveCTA, the design code, and all outputs unchanged.
 */
import { useEffect, useRef } from 'react';
import { WORDMARK } from '../data/config';
import { useDesign } from '../state/store';
import { NestingPreview } from './NestingPreview';
import { ReserveCTA } from './ReserveCTA';
import { deDash } from './text';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function CommissionSheet() {
  const open = useDesign((s) => s.commissionOpen);
  const setOpen = useDesign((s) => s.setCommissionOpen);
  const { geometry, components, nesting, price, buildPlan } = useDesign((s) => s.outputs);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const designCode = `${WORDMARK.toUpperCase()}-${geometry.params.jointSystem === 'hub' ? 'H' : 'L'}-${geometry.footprintM2.toFixed(
    0,
  )}-${Math.round(geometry.riseM * 100)}-${Math.round(
    geometry.params.strutSpacingM * 1000,
  )}-${Math.round(geometry.params.apertureDeg)}`;

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-paperVellum/95 text-inkBlack backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="commission spec sheet"
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">
              commission · spec sheet
            </p>
            <h2 className="mt-2 font-serifDisplay text-[clamp(1.75rem,3.5vw,2.6rem)] font-semibold lowercase leading-none tracking-[-0.01em] text-inkBlack">
              {WORDMARK} <span className="text-inkBlack/35">/</span>{' '}
              <span className="font-mono text-xl font-normal tracking-tight text-inkBlack/60">{designCode}</span>
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-full border border-inkBlack/15 bg-white/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/70 transition-colors hover:text-inkBlack"
          >
            ← back to design
          </button>
        </div>

        {/* Fixed price hero */}
        <div className="mb-6 rounded-lg border border-inkBlack/12 bg-white/45 p-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-serifDisplay text-[clamp(2.75rem,6vw,3.75rem)] font-semibold tabular-nums leading-none text-inkBlack">
              {gbp(price.fixedTotalGBP)}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">fixed</span>
          </div>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-inkBlack/70">
            One figure, guaranteed: fabrication, delivery, install, groundwork and the planting
            allowance. Every reachable form compiles to components, an assembly sequence and this
            price, so the number is a commitment, not an estimate.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber">
            <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
            <span>demo: the per-component rate is a placeholder until the fab quote is wired in</span>
          </p>
        </div>

        {/* Key figures */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact
            label="construction"
            value={geometry.params.jointSystem === 'hub' ? 'steel hubs' : 'lamella weave'}
          />
          <Fact label="timber pieces" value={`${components.totalCount}`} />
          <Fact label="joints" value={`${geometry.nodes.length} nodes`} />
          <Fact label="CNC sheets" value={`${nesting.sheets.length}`} />
          <Fact label="ground screws" value={`${geometry.groundScrewCount}`} />
          <Fact label="assembly steps" value={`${buildPlan.assemblySteps}`} />
          <Fact label="lead time" value={`~${buildPlan.leadTimeWeeks} wks`} />
          <Fact label="canopy" value={`${geometry.spanM.toFixed(1)} × ${geometry.riseM.toFixed(2)} m`} />
        </div>

        {/* Nesting preview */}
        <Section title="cut sheets, nested">
          <p className="mb-3 text-[12px] leading-relaxed text-inkBlack/70">
            The actual blanks of this design, laid on standard sheet stock by the engine's
            conservative shelf nesting, so the sheet count errs high rather than flattering the
            quote. These are the files the fab shop receives.
          </p>
          <NestingPreview />
        </Section>

        {/* BOM — timber pieces */}
        <Section title={`cut schedule · ${components.items.length} distinct pieces`}>
          <div className="max-h-56 overflow-auto rounded-lg border border-inkBlack/12 bg-white/40 p-3 font-mono text-[11px] text-inkBlack/70">
            {components.items.map((it, i) => (
              <div key={i} className="flex justify-between border-b border-inkBlack/8 py-0.5 last:border-0">
                <span>
                  {it.count}× {it.kind}
                  <span className="text-inkBlack/40"> · {it.stock === 'sheet' ? 'LVL sheet' : 'linear C24'}</span>
                </span>
                <span>{it.lengthM.toFixed(2)} m</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 font-medium text-inkBlack">
              <span>{components.totalCount} pieces</span>
              <span>{components.totalLengthM} m total</span>
            </div>
          </div>
        </Section>

        {/* BOM — connectors, fasteners, foundations, armature */}
        <Section title={`hardware schedule · counted from the node graph`}>
          <div className="max-h-56 overflow-auto rounded-lg border border-inkBlack/12 bg-white/40 p-3 font-mono text-[11px] text-inkBlack/70">
            {components.hardware.map((h) => (
              <div key={h.id} className="flex justify-between gap-4 border-b border-inkBlack/8 py-0.5 last:border-0">
                <span>{h.label}</span>
                <span className="shrink-0">
                  {h.qty.toLocaleString('en-GB')} {h.unit ?? 'pcs'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-inkBlack/45">
            Every joint is an explicit node in the model, so connectors and bolts are counted, not
            estimated (docs/FABRICATION.md). Structural validity comes from staying inside a
            pre-engineered family — certainty inside a designed envelope, not a claim that any form
            is valid.
          </p>
        </Section>

        {/* Reserve */}
        <Section title="reserve this design">
          <div className="max-w-md">
            <ReserveCTA />
          </div>
        </Section>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45">
          {deDash(`${WORDMARK} — every form you can touch is buildable; that's the whole idea.`)}
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/40 px-3 py-2.5">
      <div className="font-serifDisplay text-[18px] font-semibold leading-tight text-inkBlack">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 font-serifDisplay text-[19px] font-semibold lowercase leading-tight text-inkBlack">
        {title}
      </h3>
      {children}
    </div>
  );
}
