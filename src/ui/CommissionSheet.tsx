/**
 * CommissionSheet.tsx — the spec sheet view (demo-spec §2.5).
 *
 * What the Commission button opens: component count, BOM summary, assembly
 * step count, lead time, the fixed price, and the nesting preview — the
 * evidence that the form on the stage compiles to files a fab shop can cut.
 * Client-side view only; reserving captures an email locally (no backend).
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
  const { geometry, components, nesting, price, buildPlan, species } = useDesign((s) => s.outputs);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const designCode = `${WORDMARK.toUpperCase()}-${geometry.footprintM2.toFixed(0)}-${Math.round(
    geometry.riseM * 100,
  )}-${Math.round(geometry.params.strutSpacingM * 1000)}-${Math.round(geometry.params.apertureDeg)}`;

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-paper/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="commission spec sheet"
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-moss">commission · spec sheet</p>
            <h2 className="font-display text-4xl font-semibold lowercase leading-none text-ink">
              {WORDMARK} <span className="text-inkFaint">/</span>{' '}
              <span className="font-mono text-xl font-normal tracking-tight text-inkSoft">{designCode}</span>
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            className="rounded-full border border-line bg-white/60 px-4 py-2 text-sm text-inkSoft transition hover:text-ink"
          >
            ← back to design
          </button>
        </div>

        {/* Fixed price hero */}
        <div className="mb-6 rounded-3xl border border-line bg-white/50 p-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-6xl font-semibold tabular-nums text-ink">
              {gbp(price.fixedTotalGBP)}
            </span>
            <span className="text-sm font-medium uppercase tracking-widest text-mossDeep">fixed</span>
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-inkSoft">
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
          <Fact label="components" value={`${components.totalCount}`} />
          <Fact label="distinct parts" value={`${components.items.length}`} />
          <Fact label="CNC sheets" value={`${nesting.sheets.length}`} />
          <Fact label="assembly steps" value={`${buildPlan.assemblySteps}`} />
          <Fact label="lead time" value={`~${buildPlan.leadTimeWeeks} wks`} />
          <Fact label="feet" value={`${geometry.feetCount} grounded`} />
          <Fact label="canopy" value={`${geometry.spanM.toFixed(1)} × ${geometry.riseM.toFixed(2)} m`} />
          <Fact label="planting" value={`${buildPlan.plantCount}× ${species.common.toLowerCase()}`} />
        </div>

        {/* Nesting preview */}
        <Section title="cut sheets, nested">
          <p className="mb-3 text-[12px] leading-relaxed text-inkSoft">
            The actual blanks of this design, laid on standard sheet stock by the engine's
            conservative shelf nesting, so the sheet count errs high rather than flattering the
            quote. These are the files the fab shop receives.
          </p>
          <NestingPreview />
        </Section>

        {/* BOM */}
        <Section title={`bill of materials · ${components.items.length} distinct parts`}>
          <div className="max-h-56 overflow-auto rounded-xl border border-line bg-white/40 p-3 font-mono text-[11px] text-inkSoft">
            {components.items.map((it, i) => (
              <div key={i} className="flex justify-between border-b border-line/50 py-0.5 last:border-0">
                <span>
                  {it.count}× {it.type}
                </span>
                <span>{it.lengthM.toFixed(2)} m</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 font-medium text-ink">
              <span>{components.totalCount} pieces</span>
              <span>{components.totalLengthM} m total</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-inkFaint">
            Real geometry, discretised into flat cuttable members. Structural validity comes from
            staying inside a pre-engineered family, certainty inside a designed envelope, not a
            claim that any form is valid.
          </p>
        </Section>

        {/* Reserve */}
        <Section title="reserve this design">
          <div className="max-w-md">
            <ReserveCTA />
          </div>
        </Section>

        <p className="mt-8 text-center text-[11px] text-inkFaint">
          {deDash(`${WORDMARK} — every form you can touch is buildable; that's the whole idea.`)}
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/40 px-3 py-2.5">
      <div className="font-display text-lg font-semibold text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-inkFaint">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-display text-xl font-semibold lowercase text-ink">{title}</h3>
      {children}
    </div>
  );
}
