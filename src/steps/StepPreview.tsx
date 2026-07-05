/**
 * StepPreview.tsx — Step 3. "Watch your Eden grow." + commission.
 * The Eden on its plot, an animated Year 0/1/3 growth toggle (the signature
 * moment), the price (already familiar from Step 2) confirmed with a full
 * breakdown, ecology at a glance, the reserve gate, and two quiet disclosures.
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
        <div className="mb-1 flex items-center gap-2">
          <GrowGlyph />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/70">
            step three · grow
          </p>
        </div>
        <h1 className="font-serifDisplay text-4xl font-semibold leading-none text-inkBlack sm:text-5xl">
          Watch <em className="italic">your</em> Eden grow.
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Stage + growth toggle */}
        <div>
          <div className="relative h-[52vh] min-h-[360px] overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/50 to-paperVellum/40 shadow-[0_24px_70px_-50px_rgba(23,22,15,0.6)]">
            <Scene />

            {/* Growth toggle */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div
                className="flex items-center gap-1 rounded-full border border-line bg-paperVellum/85 p-1 shadow-sm backdrop-blur"
                role="group"
                aria-label="growth year"
              >
                {GROWTH.years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    aria-pressed={year === y}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                      year === y ? 'bg-inkBlack text-paperVellum' : 'text-inkBlack/70 hover:text-inkBlack'
                    }`}
                  >
                    Year {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute left-4 top-3 rounded-full border border-line bg-paperVellum/85 px-3 py-1 text-xs text-inkBlack/70 backdrop-blur">
              {deDash(growth.label)} · <span className="font-semibold text-inkBlack">{Math.round(growth.coverageFraction * 100)}%</span> clothed
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
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
              indicative price · inc VAT
            </div>
            <div className="mt-1 font-serifDisplay text-6xl font-semibold tabular-nums text-inkBlack">
              {gbp(price.incVatGBP)}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[12px] text-amber">
              <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber" />
              <span>
                This is an estimate built from a placeholder rate, not a confirmed fabrication quote
                yet. The price moves correctly as the design changes. We will confirm the true cost
                once a fabricator quotes this exact cut list.
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-[13px] text-inkBlack/70">
              <span>{species.common}</span>
              <span>{components.totalCount} timber pieces</span>
              <span>{geometry.spanM.toFixed(1)} × {geometry.heightM.toFixed(1)} m</span>
              <span>~{leadTimeWeeks(components.totalCount)} wks</span>
            </div>

            {/* How this is priced (collapsed) */}
            <details className="group mt-3 border-t border-line pt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-inkBlack/70 hover:text-inkBlack">
                <span>how this is priced</span>
                <span className="text-inkBlack/45 transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-2 space-y-1 text-[13px]">
                {price.lines.map((l) => (
                  <div key={l.label} className="flex justify-between gap-3">
                    <span className="text-inkBlack/70">
                      {deDash(l.label)}
                      {l.note && <span className="block text-[11px] text-inkBlack/45">{deDash(l.note)}</span>}
                    </span>
                    <span className="font-mono tabular-nums text-inkBlack">{gbp(l.valueGBP)}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Cut list disclosure */}
            <details className="group mt-2 border-t border-line pt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-inkBlack/70 hover:text-inkBlack">
                <span>cut list ({components.items.length} distinct parts), is this real?</span>
                <span className="text-inkBlack/45 transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-2 max-h-40 space-y-0.5 overflow-auto font-mono text-[11px] text-inkBlack/70">
                {components.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.count}× {it.type}</span>
                    <span>{it.lengthM.toFixed(2)} m</span>
                  </div>
                ))}
                <p className="pt-2 font-sans text-[11px] not-italic text-inkBlack/45">
                  Real geometry, discretised into cuttable straight members. Structural validity
                  comes from staying inside a pre-engineered family, certainty inside a designed
                  envelope, not a claim that any form is valid.
                </p>
              </div>
            </details>
          </div>

          {/* Reserve */}
          <div className="rounded-3xl border border-line bg-white/50 p-6">
            <div className="mb-3 font-serifDisplay text-xl font-semibold text-inkBlack">
              Reserve this Eden
            </div>
            <ReserveCTA />
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 z-20 -mx-6 mt-6 border-t border-line bg-paperVellum/90 px-6 py-3 backdrop-blur">
        <CtaLink label="back to design" onClick={() => setStep(2)} variant="ghost" back />
      </div>
    </div>
  );
}

function Eco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/40 px-3 py-2.5">
      <div className="font-serifDisplay text-lg font-semibold text-inkBlack">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-inkBlack/45">{label}</div>
    </div>
  );
}

/** A tiny growth-arc/leaf glyph for the Step 3 eyebrow. */
function GrowGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#17160F" aria-hidden>
      <path d="M3 13.5 C 6 12.5, 8.5 9.5, 9 3.5" strokeWidth={1} strokeLinecap="round" />
      <path d="M9 6.5 C 11 5.5, 12.8 6.2, 12.8 8.4 C 10.6 8.4, 9 7.8, 9 6.5 Z" strokeWidth={0.8} strokeLinejoin="round" />
    </svg>
  );
}
