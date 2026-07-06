/**
 * SeasonalBecomingDiagram.tsx — D2, the durationless growth strip. Adapted from
 * GrowthPhasesDiagram: the same real data (canopyProfile silhouette + a foliage
 * dot scatter whose count follows computeGrowth().leafDensity01), but retuned for
 * the splash's emotional register rather than the Engine page's technical one
 * (spec §2):
 *  - captions carry NO numbers and NO "year" word: `just placed` / `taking hold`
 *    / `in full leaf` (the locked durationless constraint);
 *  - the third panel's right edge fades under a soft opacity gradient, a cue that
 *    growth continues past the frame rather than completing inside it;
 *  - no AccentMark and no flowering leader (that beat stays on the Engine page);
 *  - one quiet mono restatement beneath, `always becoming, never finished`, not a
 *    caption on data (ecology numbers live in section 4, never duplicated here).
 */
import { useId } from 'react';
import { canopyProfile } from '../../engine/geometry';
import { computeGrowth } from '../../engine/growth';
import type { EngineOutputs, GrowthState, Year } from '../../engine/types';
import { DiagramSvg, useInk } from '../engine/hairline';

/** Panels sampled at the same real growth states the Engine page uses, relabeled. */
const PHASES: { year: Year; caption: string }[] = [
  { year: 0, caption: 'just placed' },
  { year: 1, caption: 'taking hold' },
  { year: 3, caption: 'in full leaf' },
];

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

function GrowthPanel({
  outputs,
  year,
  caption,
  fade,
}: {
  outputs: EngineOutputs;
  year: Year;
  caption: string;
  fade: boolean;
}) {
  const ink = useInk();
  const rawId = useId().replace(/:/g, '');
  const maskId = `becoming-fade-${rawId}`;
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

  return (
    // Durationless label: the caption, never growth.label (which names a year).
    <DiagramSvg viewBox="0 0 70 92" label={caption}>
      {fade && (
        <defs>
          {/* Opaque across the panel, transparent over the last ~20% of width:
              growth reads as continuing past the frame, not completing in it. */}
          <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.8" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width="70" height="92" fill={`url(#${maskId}-grad)`} />
          </mask>
        </defs>
      )}
      <g mask={fade ? `url(#${maskId})` : undefined}>
        {/* Ground line */}
        <line x1={cx - edgeR * scale} y1={baseY} x2={cx + edgeR * scale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
        {/* Real canopy silhouette */}
        <path d={outlinePath} fill="none" stroke={ink} strokeWidth={0.75} />
        {/* Foliage scatter, density from leafDensity01 */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={0.85} fill={ink} opacity={0.5} />
        ))}
      </g>
    </DiagramSvg>
  );
}

export function SeasonalBecomingDiagram({ outputs }: { outputs: EngineOutputs }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {PHASES.map(({ year, caption }, i) => (
          <figure key={year} className="flex flex-col">
            <div className="aspect-[3/4]">
              <GrowthPanel outputs={outputs} year={year} caption={caption} fade={i === PHASES.length - 1} />
            </div>
            <figcaption className="mt-3 font-mono text-[10px] lowercase tracking-[0.1em] opacity-85">
              {caption}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] lowercase tracking-[0.12em] opacity-70">
        always becoming, never finished
      </p>
    </div>
  );
}
