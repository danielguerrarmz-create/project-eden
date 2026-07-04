/**
 * StepPreview.tsx — Step 3. "Watch it grow." + commission.
 * The folly on its plot, an animated Year 0/1/3 growth toggle (the signature
 * moment), ONE big price with the honest placeholder note, ecology at a glance,
 * the reserve gate, and two quiet disclosures (how it's priced, cut list).
 */
import { GROWTH, LEAD_TIME } from '../data/config';
import { useDesign } from '../state/store';
import { Scene } from '../scene/Scene';
import { ReserveCTA } from '../ui/ReserveCTA';
import { CtaLink } from '../ui/CtaLink';
import { deDash } from '../ui/text';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

function leadTimeWeeks(count: number): number {
  return Math.round(LEAD_TIME.baseWeeks + (count / 100) * LEAD_TIME.weeksPerHundredComponents);
}

export function StepPreview() {
  const setStep = useDesign((s) => s.setStep);
  const year = useDesign((s) => s.params.year);
  const setYear = useDesign((s) => s.setYear);
  const { price, components, species, ecology, growth, geometry } = useDesign((s) => s.outputs);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 pb-8 pt-24">
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-moss">step three · grow</p>
        <h1 className="font-display text-4xl font-semibold lowercase leading-none text-ink sm:text-5xl">
          watch it grow
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Stage + growth toggle */}
        <div>
          <div className="relative h-[52vh] min-h-[360px] overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/40 to-paperDeep/40 shadow-[0_24px_70px_-50px_rgba(30,27,23,0.6)]">
            <Scene />

            {/* Growth toggle */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 rounded-full border border-line/70 bg-paper/85 p-1 shadow-sm backdrop-blur">
                {GROWTH.years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      year === y ? 'bg-moss text-paper' : 'text-inkSoft hover:text-ink'
                    }`}
                  >
                    Year {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute left-4 top-3 rounded-full border border-line/70 bg-paper/85 px-3 py-1 text-xs text-inkSoft backdrop-blur">
              {deDash(growth.label)} · <span className="font-semibold text-mossDeep">{Math.round(growth.coverageFraction * 100)}%</span> clothed
            </div>
          </div>

          {/* Ecology at a glance */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Eco label="habitat" value={`${ecology.habitatAreaM2} m²`} />
            <Eco label="pollinator cells" value={`${ecology.pollinatorCells}`} />
            <Eco label="rainwater / yr" value={`${ecology.rainwaterLitresPerYr.toLocaleString('en-GB')} L`} />
            <Eco label="flowering" value={deDash(ecology.floweringMonths)} />
          </div>
        </div>

        {/* Commission panel */}
        <div className="flex flex-col gap-4">
          {/* Price hero */}
          <div className="rounded-3xl border border-line bg-white/50 p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-inkFaint">
              indicative price · inc VAT
            </div>
            <div className="mt-1 font-display text-6xl font-semibold tabular-nums text-ink">
              {gbp(price.incVatGBP)}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[12px] text-amber">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber" />
              <span>Placeholder rate. TODO: wire a real fabrication quote against this cut geometry.</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[13px] text-inkSoft">
              <span>{species.common}</span>
              <span>{components.totalCount} timber pieces</span>
              <span>{geometry.spanM} × {geometry.heightM} m</span>
              <span>~{leadTimeWeeks(components.totalCount)} wks</span>
            </div>

            {/* How this is priced (collapsed) */}
            <details className="group mt-3 border-t border-line pt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-inkSoft hover:text-ink">
                <span>how this is priced</span>
                <span className="text-inkFaint transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-2 space-y-1 text-[13px]">
                {price.lines.map((l) => (
                  <div key={l.label} className="flex justify-between gap-3">
                    <span className="text-inkSoft">
                      {deDash(l.label)}
                      {l.note && <span className="block text-[11px] text-inkFaint">{deDash(l.note)}</span>}
                    </span>
                    <span className="font-mono tabular-nums text-ink">{gbp(l.valueGBP)}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Cut list disclosure */}
            <details className="group mt-2 border-t border-line pt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-inkSoft hover:text-ink">
                <span>cut list ({components.items.length} distinct parts), is this real?</span>
                <span className="text-inkFaint transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-2 max-h-40 space-y-0.5 overflow-auto font-mono text-[11px] text-inkSoft">
                {components.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.count}× {it.type}</span>
                    <span>{it.lengthM.toFixed(2)} m</span>
                  </div>
                ))}
                <p className="pt-2 font-sans text-[11px] not-italic text-inkFaint">
                  Real geometry, discretised into cuttable straight members. Structural validity
                  comes from staying inside a pre-engineered family, certainty inside a designed
                  envelope, not a claim that any form is valid.
                </p>
              </div>
            </details>
          </div>

          {/* Reserve */}
          <div className="rounded-3xl border border-line bg-white/50 p-6">
            <div className="mb-3 font-display text-xl font-semibold lowercase text-ink">
              reserve this folly
            </div>
            <ReserveCTA />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CtaLink label="back to design" onClick={() => setStep(2)} variant="ghost" />
      </div>
    </div>
  );
}

function Eco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/40 px-3 py-2.5">
      <div className="font-display text-lg font-semibold text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-inkFaint">{label}</div>
    </div>
  );
}
