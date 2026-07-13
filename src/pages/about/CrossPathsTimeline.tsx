/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, drawn as growth.
 *
 * IT READS TOP TO BOTTOM, with the page. Time descends. Clay's threads fall on the LEFT in
 * blue, Daniel's on the RIGHT in green, and the work they did together runs down the spine
 * between them. The horizontal gap between the two sides IS the story, and you can read it
 * without reading a word:
 *
 *   2020  Clay is already drafting at Rick Wright in Dallas. Daniel is not at UT yet.
 *   2021  Daniel enrols. The sides start closing.
 *   2023  Synergy with the Cosmos. They build together. The threads touch the spine.
 *   2024  Dougherty. Still together.
 *   2025  They pull APART, and this is the real divergence: Daniel to Rogers Partners in
 *         New York, Clay deep into Resia AI and the machine-learning research. Widest point.
 *   2026  Bower. Everything winds into the egg.
 *
 * THE CURVATURE IS NOT SPLINE TASTE (see growth.ts). A Gompertz growth function pulls each
 * strand toward the spine, and the SAME function damps a small arc of a golden logarithmic
 * spiral that gives the strand its wander. The strands are phased by the golden angle, the
 * rule a sunflower uses to pack florets without collision. Strokes are UNIFORM: no taper.
 *
 * The terminus is an EGG. Their passions are the restless part. The egg is what they became.
 *
 * EVERY DATE IS REAL, from Clay's resume and Daniel's CV. Nothing here is an estimate.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { GOLDEN_ANGLE, clamp01, eggPath, gompertz, lateral, lerp } from './growth';

/**
 * THE TWO OF THEM, as colour. Clay is blue, Daniel is green, everywhere on this page: these
 * strands, and the selected project in the list below. One rule, stated once.
 */
export const CLAY = '#3E7CA8';
export const DANIEL = '#6E8C3A';
/** Work they did together takes the accent olive, which is also the egg. */
export const SHARED = '#8FA61E';

const CLAY_DEEP = '#2B5A7E';
const CLAY_LIGHT = '#6BA6CC';
const DANIEL_DEEP = '#4F6626';
const DANIEL_LIGHT = '#93B25A';

interface Strand {
  id: string;
  label: string;
  note: string;
  color: string;
  /** The year this thread really began. Every one of these comes off a resume. */
  start: number;
  /** Left of the spine (Clay, -1), right of it (Daniel, +1), or on it (shared, 0). */
  side: -1 | 0 | 1;
  /** How far off the spine this thread rides, 0 to 1, before the braid scales it. */
  offset: number;
}

const STRANDS: Strand[] = [
  {
    id: 'clay-practice',
    label: 'Practice',
    note: 'Rick Wright Architects, Dallas',
    color: CLAY_DEEP,
    start: 2020,
    side: -1,
    offset: 0.58,
  },
  {
    id: 'school',
    label: 'Architecture',
    note: 'UT Austin, where we met',
    color: SHARED,
    start: 2021,
    side: 0,
    offset: 0.14,
  },
  {
    id: 'together',
    label: 'Building together',
    note: 'Synergy, then Dougherty',
    color: SHARED,
    start: 2023,
    side: 0,
    offset: 0.38,
  },
  {
    id: 'startups',
    label: 'Startups',
    note: 'Resia AI, and TestFit',
    color: CLAY,
    start: 2023,
    side: -1,
    offset: 1,
  },
  {
    id: 'research',
    label: 'Research',
    note: 'machine learning, four papers',
    color: CLAY_LIGHT,
    start: 2023,
    side: -1,
    offset: 0.8,
  },
  {
    id: 'making',
    label: 'Making',
    note: 'Plentify, hemp and bamboo',
    color: DANIEL_DEEP,
    start: 2024,
    side: 1,
    offset: 0.58,
  },
  {
    id: 'robotics',
    label: 'Robotics',
    note: 'Texas Robotics, then KUKA',
    color: DANIEL_LIGHT,
    start: 2024,
    side: 1,
    offset: 0.8,
  },
  {
    id: 'daniel-practice',
    label: 'Practice',
    note: 'Forsite, then Rogers in New York',
    color: DANIEL,
    start: 2024,
    side: 1,
    offset: 1,
  },
];

/* --------------------------------- geometry ------------------------------- */

// Wide enough that a long note ("Rick Wright Architects, Dallas") has somewhere to live
// without running out of the frame. The strands use the middle; the labels use the margins.
const W = 1000;
const H = 940;
const CX = 500; // the spine: the axis the two of them braid around
const Y0 = 70; // 2020
const CONVERGE_Y = 762; // where every strand arrives
const MIN_YEAR = 2020;
const MAX_YEAR = 2026;
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const EGG_RY = 62; // the egg's round-end semi-axis (it stands upright)
const EGG_RX = 52;
const NARROW = 0.62;
const EGG_Y = CONVERGE_Y + EGG_RY * NARROW + 4;

const yearToY = (y: number) => Y0 + ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * (CONVERGE_Y - Y0);

/** How far from the spine a thread can ride. */
const SPREAD = 212;

/**
 * THE BRAID: how far apart the two of them are at any moment. This is the one hand-authored
 * curve in the drawing, and it is hand-authored on purpose. It is a claim about their
 * history, not about botany, and every year in it is defensible from the two resumes.
 */
const BRAID: Array<[year: number, spread: number]> = [
  [2020, 1],
  [2021, 0.82],
  [2022, 0.58],
  [2023, 0.24],
  [2024, 0.28],
  [2025, 0.95],
  [2026, 0.95],
];

function braidSpread(year: number): number {
  if (year <= BRAID[0][0]) return BRAID[0][1];
  for (let i = 1; i < BRAID.length; i++) {
    const [y1, s1] = BRAID[i];
    const [y0, s0] = BRAID[i - 1];
    if (year <= y1) {
      const u = (year - y0) / (y1 - y0);
      return lerp(s0, s1, u * u * (3 - 2 * u)); // smoothstep, so the braid eases, never kinks
    }
  }
  return BRAID[BRAID.length - 1][1];
}

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/** Where a strand rests, before growth pulls it in. */
const restingX = (s: Strand, year: number) =>
  CX + s.side * s.offset * SPREAD * braidSpread(year);

/**
 * One strand, sampled. The strand descends linearly in time; its DISTANCE FROM THE SPINE is
 * what the growth curve governs. At the end g = 1 and the wander is 0, so every strand
 * arrives at exactly one point, with nothing left over.
 */
function strandPath(s: Strand, index: number): string {
  const phase = index * GOLDEN_ANGLE;
  const pts: Array<{ x: number; y: number }> = [];
  const SAMPLES = 96;

  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    const year = lerp(s.start, MAX_YEAR, u);
    const t = clamp01((year - s.start) / (MAX_YEAR - s.start));
    // The bend lands LATE (p = 0.66). A strand should live its own life out at its own
    // distance and only commit to the spine near the end, which is what actually happened.
    // An early inflection collapses all eight into a bundle and the braid stops reading.
    const g = gompertz(t, 0.66, 7);

    const x =
      lerp(restingX(s, year), CX, g) + lateral(t, g, phase, 13, 0.72 /* ~41 deg of sweep */);

    pts.push({ x, y: yearToY(year) });
  }
  return lineGen(pts) ?? '';
}

/**
 * Threads that begin in the SAME year would print their labels on top of each other, so the
 * later ones step down. This is the only place the drawing overrides its own geometry, and
 * it is for legibility, not for looks.
 */
function labelOffsets(): Map<string, number> {
  const seen = new Map<number, number>();
  const out = new Map<string, number>();
  for (const s of STRANDS) {
    const n = seen.get(s.start) ?? 0;
    out.set(s.id, n * 34);
    seen.set(s.start, n + 1);
  }
  return out;
}

/* ------------------------------- the graphic ------------------------------ */

export function CrossPathsTimeline({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const started = reduced || (play && inView);

  const paths = useMemo(() => STRANDS.map((s, i) => ({ s, d: strandPath(s, i) })), []);
  const offsets = useMemo(labelOffsets, []);
  /* The egg stands upright, narrow end UP, pointing back at the strands arriving. The narrow
     end is the point of highest curvature, which is where converging lines want to gather. */
  const egg = useMemo(() => eggPath(0, 0, EGG_RY, EGG_RX * 2, NARROW), []);

  return (
    <div ref={ref} className="flex min-h-0 w-full flex-1 justify-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-auto max-w-full"
        role="img"
        aria-label="A timeline reading top to bottom, 2020 to 2026. Clay's threads descend on the left in blue, Daniel's on the right in green, and their shared work runs down the middle. Clay is already working in architecture in Dallas when Daniel enrols at UT Austin. They come together to build Synergy with the Cosmos and Dougherty, pull apart through 2025 as Daniel goes to Rogers Partners in New York and Clay goes deep into Resia AI and machine-learning research, then converge at the end of 2025 into Bower."
      >
        {/* THE SPINE. One quiet line down the middle, with the years as TICKS on it rather
            than as a grid. The years should be findable, not loud. */}
        <line
          x1={CX}
          y1={Y0 - 18}
          x2={CX}
          y2={CONVERGE_Y}
          stroke="currentColor"
          className="text-inkBlack"
          strokeWidth={1}
          opacity={0.14}
        />
        {YEARS.map((y) => (
          <g key={y}>
            <line
              x1={CX - 5}
              y1={yearToY(y)}
              x2={CX + 5}
              y2={yearToY(y)}
              stroke="currentColor"
              className="text-inkBlack"
              strokeWidth={1}
              opacity={0.25}
            />
            <text
              x={CX + 14}
              y={yearToY(y) + 3.5}
              className="fill-inkBlack/30 font-mono"
              style={{ fontSize: 10, letterSpacing: '0.12em' }}
            >
              {y}
            </text>
          </g>
        ))}

        {/* Eight strands, uniform weight. No taper anywhere. */}
        {paths.map(({ s, d }) => (
          <path
            key={s.id}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ opacity: started ? 1 : 0 } as CSSProperties}
          />
        ))}

        {/* Each thread named where it begins, on its own side, stepped down when two threads
            start the same year, so nothing ever collides. */}
        {STRANDS.map((s) => {
          const x = restingX(s, s.start);
          const y = yearToY(s.start);
          const left = s.side <= 0;
          const ly = y + (offsets.get(s.id) ?? 0);
          const tx = left ? x - 16 : x + 16;
          return (
            <g key={s.id} style={{ opacity: started ? 1 : 0 } as CSSProperties}>
              <circle cx={x} cy={y} r={3.4} fill={s.color} />
              {/* A hairline leader when the label has stepped away from its dot. */}
              {ly !== y && (
                <path
                  d={`M ${x} ${y} L ${x} ${ly - 5} ${left ? 'L ' + (tx + 6) + ' ' + (ly - 5) : 'L ' + (tx - 6) + ' ' + (ly - 5)}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1}
                  opacity={0.35}
                />
              )}
              <text
                x={tx}
                y={ly - 4}
                textAnchor={left ? 'end' : 'start'}
                className="fill-inkBlack font-serifDisplay"
                style={{ fontSize: 19 }}
              >
                {s.label}
              </text>
              <text
                x={tx}
                y={ly + 13}
                textAnchor={left ? 'end' : 'start'}
                className="fill-inkBlack/45 font-mono"
                style={{ fontSize: 11, letterSpacing: '0.04em' }}
              >
                {s.note}
              </text>
            </g>
          );
        })}

        {/* THE EGG. Everything the two of them chased, become one thing. */}
        <g
          transform={`translate(${CX} ${EGG_Y}) rotate(90)`}
          style={{ opacity: started ? 1 : 0 } as CSSProperties}
        >
          <path d={egg} fill={SHARED} fillOpacity={0.12} stroke={SHARED} strokeWidth={2.4} />
        </g>
        <text
          x={CX}
          y={EGG_Y + 6}
          textAnchor="middle"
          className="fill-inkBlack font-serifDisplay"
          style={{ fontSize: 18, fontStyle: 'italic', opacity: started ? 1 : 0 }}
        >
          Bower
        </text>
      </svg>
    </div>
  );
}

/** The colour key, rendered beside the graphic rather than inside it. */
export function CrossPathsKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
      {[
        { color: CLAY, name: 'Clay' },
        { color: DANIEL, name: 'Daniel' },
        { color: SHARED, name: 'Together' },
      ].map((k) => (
        <span key={k.name} className="flex items-center gap-2.5">
          <span aria-hidden className="h-[3px] w-7 rounded-full" style={{ background: k.color }} />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-inkBlack/60">
            {k.name}
          </span>
        </span>
      ))}
    </div>
  );
}
