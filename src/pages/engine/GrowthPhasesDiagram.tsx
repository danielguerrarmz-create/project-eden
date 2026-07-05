/**
 * GrowthPhasesDiagram.tsx — D4. Three canopy elevations (year 0 / 1 / 3) sharing
 * the real surface silhouette (canopyProfile, sampled on the aperture axis),
 * foliage rendered as a deterministic dot scatter whose count follows the live
 * leafDensity01 from computeGrowth(). Year 3 carries a flowering leader (the
 * ecological payoff) and the row footer reads the live computeEcology() values
 * at the grown-in state. Every number is computed, never typed.
 */
import { canopyProfile } from '../../engine/geometry';
import { computeEcology } from '../../engine/ecology';
import { computeGrowth } from '../../engine/growth';
import type { EngineOutputs, GrowthState } from '../../engine/types';
import type { Year } from '../../data/config';
import { AccentMark, DiagramSvg, LeaderCallout, useInk } from './hairline';

const YEARS: Year[] = [0, 1, 3];

/** Deterministic low-discrepancy foliage scatter inside the canopy silhouette. */
function foliageDots(
  count: number,
  front: { radius: number; y: number }[],
  back: { radius: number; y: number }[],
  cx: number,
  baseY: number,
  scale: number,
) {
  const dots: { x: number; y: number }[] = [];
  const n = front.length;
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) * 0.6180339887) % 1; // 0 = edge, 1 = crown
    const sideSel = ((i + 0.5) * 0.7548776662) % 1;
    const idx = Math.min(n - 1, Math.floor(t * (n - 1)));
    const rightSide = sideSel < 0.5;
    const s = rightSide ? front[idx] : back[idx];
    const jitter = (((i + 0.5) * 0.4359911) % 1) * 0.85;
    const x = cx + (rightSide ? 1 : -1) * s.radius * scale * jitter;
    dots.push({ x, y: baseY - s.y * scale });
  }
  return dots;
}

function GrowthPanel({ outputs, year }: { outputs: EngineOutputs; year: Year }) {
  const ink = useInk();
  const { params } = outputs.geometry;
  const growth: GrowthState = computeGrowth(outputs.species, year);

  const scale = 20;
  const cx = 35;
  const baseY = 78;
  const front = canopyProfile(params, params.apertureDeg);
  const back = canopyProfile(params, params.apertureDeg + 180);
  const outline = [
    ...back.map((s) => [cx - s.radius * scale, baseY - s.y * scale] as const).reverse(),
    ...front.map((s) => [cx + s.radius * scale, baseY - s.y * scale] as const),
  ];
  const outlinePath = outline.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const edgeR = Math.max(front[0].radius, back[0].radius);

  const dotCount = Math.round(growth.leafDensity01 * 60);
  const dots = foliageDots(dotCount, front, back, cx, baseY, scale);

  // Crown apex (last sample of the front section) for the flowering leader.
  const crown = front[front.length - 1];
  const apexX = cx + crown.radius * scale * 0.4;
  const apexY = baseY - crown.y * scale;

  return (
    <DiagramSvg viewBox="0 0 70 92" label={growth.label}>
      {/* Ground line */}
      <line x1={cx - edgeR * scale} y1={baseY} x2={cx + edgeR * scale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
      {/* Real canopy silhouette */}
      <path d={outlinePath} fill="none" stroke={ink} strokeWidth={0.75} />
      {/* Foliage scatter, density from leafDensity01 */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={0.85} fill={ink} opacity={0.5} />
      ))}
      {/* Year 3: flowering payoff leader + the single accent mark */}
      {year === 3 && (
        <>
          <AccentMark cx={apexX} cy={apexY + 5} r={1.8} />
          <LeaderCallout
            from={[apexX, apexY + 5]}
            to={[cx + edgeR * scale + 4, apexY]}
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
