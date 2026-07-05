/**
 * GrowthPhasesDiagram.tsx — D4. Three dome elevations (year 0 / 1 / 3) sharing the
 * real rib silhouette, foliage rendered as a deterministic dot scatter whose count
 * follows the live leafDensity01 from computeGrowth(). Year 3 carries a flowering
 * leader (the ecological payoff) and the row footer reads the live computeEcology()
 * values at the grown-in state. Every number is computed, never typed.
 */
import { ribProfile } from '../../engine/geometry';
import { computeEcology } from '../../engine/ecology';
import { computeGrowth } from '../../engine/growth';
import type { EngineOutputs, GrowthState } from '../../engine/types';
import type { Year } from '../../data/config';
import { AccentMark, DiagramSvg, LeaderCallout, useInk } from './hairline';

const YEARS: Year[] = [0, 1, 3];

/** Deterministic low-discrepancy foliage scatter inside the dome silhouette. */
function foliageDots(count: number, R: number, H: number, cx: number, baseY: number, scale: number) {
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) * 0.6180339887) % 1;
    const side = (((i + 0.5) * 0.7548776662) % 1) * 2 - 1;
    const { radius, y } = ribProfile(t, R, H);
    dots.push({ x: cx + side * radius * scale * 0.9, y: baseY - y * scale });
  }
  return dots;
}

function GrowthPanel({ outputs, year }: { outputs: EngineOutputs; year: Year }) {
  const ink = useInk();
  const { footprintRadiusM: R, heightM: H } = outputs.geometry;
  const growth: GrowthState = computeGrowth(outputs.species, year);

  const scale = 15;
  const cx = 35;
  const baseY = 74;
  const samples = Array.from({ length: 21 }, (_, i) => i / 20).map((t) => ribProfile(t, R, H));
  const outline = [
    ...samples.map((s) => [cx - s.radius * scale, baseY - s.y * scale] as const).reverse(),
    ...samples.map((s) => [cx + s.radius * scale, baseY - s.y * scale] as const),
  ];
  const outlinePath = outline.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

  const dotCount = Math.round(growth.leafDensity01 * 60);
  const dots = foliageDots(dotCount, R, H, cx, baseY, scale);

  const apexX = cx;
  const apexY = baseY - H * scale;

  return (
    <DiagramSvg viewBox="0 0 70 90" label={growth.label}>
      {/* Ground line */}
      <line x1={cx - R * scale} y1={baseY} x2={cx + R * scale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
      {/* Real rib silhouette */}
      <path d={outlinePath} fill="none" stroke={ink} strokeWidth={0.75} />
      {/* Foliage scatter, density from leafDensity01 */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={0.85} fill={ink} opacity={0.5} />
      ))}
      {/* Year 3: flowering payoff leader + the single accent mark */}
      {year === 3 && (
        <>
          <AccentMark cx={apexX + R * scale * 0.4} cy={apexY + 6} r={1.8} />
          <LeaderCallout
            from={[apexX + R * scale * 0.4, apexY + 6]}
            to={[cx + R * scale + 4, apexY + 2]}
            label={outputs.ecology.floweringMonths.toUpperCase()}
          />
        </>
      )}
    </DiagramSvg>
  );
}

export function GrowthPhasesDiagram({ outputs }: { outputs: EngineOutputs }) {
  const grownIn = computeGrowth(outputs.species, 3);
  const eco = computeEcology(outputs.geometry, outputs.species, grownIn);
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {YEARS.map((year) => {
          const g = computeGrowth(outputs.species, year);
          return (
            <figure key={year} className="flex flex-col">
              <div className="aspect-[3/4]">
                <GrowthPanel outputs={outputs} year={year} />
              </div>
              <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] opacity-85">
                {g.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
        habitat {eco.habitatAreaM2.toFixed(1)} m² · pollinator cells {eco.pollinatorCells} · rainwater{' '}
        {eco.rainwaterLitresPerYr.toLocaleString('en-GB')} l/yr
      </p>
    </div>
  );
}
