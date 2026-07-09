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
import { AccentMark, DiagramSvg, useInk } from '../engine/hairline';

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

/**
 * Six hand-inked leaf silhouettes in a local ~±1.5 unit box, each with a midrib
 * subpath. Closed bodies so a very light fill reads as coverage in the fuller panels
 * without becoming a wireframe cloud; the midrib is a degenerate sliver to the fill
 * and only shows under the stroke. Picked deterministically off the scatter index
 * (spec §2.1), never at random, matching foliageDots' own discipline.
 */
const LEAF_VARIANTS: readonly string[] = [
  'M0,-1.5 C1.0,-0.9 1.0,0.7 0,1.5 C-1.0,0.7 -1.0,-0.9 0,-1.5 Z M0,-1.15 L0,1.15',
  'M0,-1.6 C0.55,-0.7 0.55,0.9 0,1.6 C-0.55,0.9 -0.55,-0.7 0,-1.6 Z M0,-1.25 L0,1.25',
  'M0,-1.4 C1.1,-1.0 0.9,0.5 0,1.5 C-0.7,0.6 -0.9,-0.8 0,-1.4 Z M0,-1.05 L-0.05,1.15',
  'M0,-1.3 C1.15,-0.85 1.15,0.85 0,1.4 C-1.15,0.85 -1.15,-0.85 0,-1.3 Z M0,-1.0 L0,1.05',
  'M0,-1.55 C0.7,-0.6 0.7,0.8 0,1.55 C-0.7,0.8 -0.7,-0.6 0,-1.55 Z M0,-1.2 L0,1.2',
  'M0,-1.35 C0.95,-1.05 1.05,0.2 0,1.45 C-1.05,0.2 -0.95,-1.05 0,-1.35 Z M0,-1.0 L0,1.1',
];

/** Deterministic small rotation (deg) per scatter index — organic variety, not noise. */
const leafRotation = (i: number) => ((i * 40) % 55) - 27;

/**
 * A cheap sampled lattice hint: a fan of radial ribs from a grounded spread up to the
 * crown apex, plus two ring hoops at a third and two-thirds height. NOT the real engine
 * member list — the same honest approximation the silhouette itself already is — so
 * panel 1 reads as "a bare lattice", the claim the copy above makes, not "an outline".
 */
function latticeHint(
  front: { radius: number; y: number }[],
  cx: number,
  baseY: number,
  scale: number,
): string {
  const maxY = front.reduce((m, s) => Math.max(m, s.y), 0);
  const apexY = baseY - maxY * scale;
  const halfW = front[0].radius * scale;
  const ribs = 5;
  const seg: string[] = [];
  for (let k = 0; k < ribs; k++) {
    const frac = (k / (ribs - 1)) * 2 - 1; // -1..1 across the base
    const baseX = cx + frac * halfW * 0.92;
    seg.push(`M ${baseX.toFixed(2)} ${baseY.toFixed(2)} L ${cx.toFixed(2)} ${apexY.toFixed(2)}`);
  }
  // Two ring hoops: width sampled from the silhouette radius at that height.
  for (const fh of [0.34, 0.66]) {
    const yTarget = fh * maxY;
    let best = front[0];
    for (const s of front) if (Math.abs(s.y - yTarget) < Math.abs(best.y - yTarget)) best = s;
    const y = baseY - yTarget * scale;
    const r = best.radius * scale;
    seg.push(`M ${(cx - r).toFixed(2)} ${y.toFixed(2)} L ${(cx + r).toFixed(2)} ${y.toFixed(2)}`);
  }
  return seg.join(' ');
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
  const lattice = latticeHint(front, cx, baseY, scale);
  // One accent at a flowering position in the fullest panel only: the topmost leaf,
  // read as a bloom at the crown. No leader, no callout (this strip stays numberless).
  const bloom = year === 3 && dots.length > 0 ? dots.reduce((a, b) => (b.y < a.y ? b : a), dots[0]) : null;

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
        {/* Lattice understructure (sampled ribs + rings), under the foliage: makes
            "a bare lattice" legible in panel 1 without competing with the leaves. */}
        <path d={lattice} fill="none" stroke={ink} strokeWidth={0.6} opacity={0.35} strokeLinecap="round" />
        {/* Real canopy silhouette */}
        <path d={outlinePath} fill="none" stroke={ink} strokeWidth={0.75} />
        {/* Foliage: a hand-inked leaf vocabulary at the same deterministic scatter
            points, density from leafDensity01. Light fill so fuller panels read as
            coverage; stroke effective ~0.56px after the 0.66 scale (spec §2.1). */}
        {dots.map((d, i) => (
          <g
            key={i}
            transform={`translate(${d.x.toFixed(2)} ${d.y.toFixed(2)}) rotate(${leafRotation(i)}) scale(0.66)`}
          >
            <path
              d={LEAF_VARIANTS[i % LEAF_VARIANTS.length]}
              fill={ink}
              fillOpacity={0.16}
              stroke={ink}
              strokeWidth={0.85}
              strokeOpacity={0.72}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* The single permitted accent, panel 3 only: one bloom where life attaches. */}
        {bloom && <AccentMark cx={bloom.x} cy={bloom.y} r={1.5} />}
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
    </div>
  );
}
