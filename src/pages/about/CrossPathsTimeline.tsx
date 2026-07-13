/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, as a travelling sequence.
 *
 * THERE IS NO PRE-EXISTING MAIN LINE. That was the mistake in the last version: it drew a
 * spine and then hung people off it. Here the main line is BORN as Clay's first thread, and
 * it earns everything after that:
 *
 *   2020  Clay is drafting at Rick Wright in Dallas. One line. It IS the main line.
 *   2021  Daniel enrols at UT Austin and merges into it. From here the trunk is not Clay's
 *         any more, and its colour says so: the gradient turns from blue to olive at the
 *         exact year Daniel joins.
 *   then  Every later thread arrives from a SIDE and merges in: Clay's from the left, Daniel's
 *         from the right. Startups and research come in from the left; making, robotics, and
 *         New York come in from the right.
 *   2026  The trunk arrives at the egg.
 *
 * IT TRAVELS. The section pins and the CAMERA descends through the years as you scroll, so
 * the frame only ever holds one or two events at a time. You are not handed a finished
 * diagram, you go down through it, and time moves forward as you do.
 *
 * THE CURVATURE IS NOT SPLINE TASTE (see growth.ts). A Gompertz growth function carries each
 * tributary from the edge of the frame into the trunk, and the SAME function damps a small
 * arc of a golden logarithmic spiral so the approach bends the way a tendril reaches. The
 * threads are phased by the golden angle. Strokes are UNIFORM. It ends in an egg.
 *
 * EVERY DATE IS REAL, from Clay's resume and Daniel's CV.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { GOLDEN_ANGLE, clamp01, eggPath, gompertz, lateral, lerp } from './growth';

export const CLAY = '#3E7CA8';
export const DANIEL = '#6E8C3A';
export const SHARED = '#8FA61E';

const CLAY_LIGHT = '#6BA6CC';
const DANIEL_DEEP = '#4F6626';
const DANIEL_LIGHT = '#93B25A';

interface Tributary {
  id: string;
  label: string;
  note: string;
  color: string;
  /** The year it really began, and the year it finishes merging into the trunk. */
  start: number;
  merge: number;
  /** Which edge it comes in from. Clay's arrive on the left, Daniel's on the right. */
  from: 'left' | 'right';
  /** How far out toward the edge it starts, 0 to 1. The 2025 threads start furthest out:
   *  that year is the real divergence, Daniel in New York and Clay deep in Resia. */
  reach: number;
}

/** The thread that becomes the main line. Clay was drafting a year before Daniel enrolled. */
const TRUNK = {
  id: 'trunk',
  label: 'Practice',
  note: 'Rick Wright Architects, Dallas',
  start: 2020,
};

/** The year Daniel merges in, and the trunk stops being Clay's alone. */
const DANIEL_JOINS = 2021;

const TRIBUTARIES: Tributary[] = [
  {
    id: 'school',
    label: 'Architecture',
    note: 'UT Austin, where we met',
    color: DANIEL,
    start: 2021,
    merge: 2021.9,
    from: 'right',
    reach: 0.88,
  },
  {
    id: 'together',
    label: 'Building together',
    note: 'Synergy, then Dougherty',
    color: SHARED,
    // Held back from Resia so the two 2023 threads do not print their labels on top of each
    // other. Synergy was the studio year; Resia was already running when it started.
    start: 2023.45,
    merge: 2024.6,
    from: 'left',
    reach: 0.55,
  },
  {
    id: 'startups',
    label: 'Startups',
    note: 'Resia AI, and TestFit',
    color: CLAY,
    start: 2023,
    merge: 2025.6,
    from: 'left',
    reach: 1,
  },
  {
    id: 'research',
    label: 'Research',
    note: 'machine learning, four papers',
    color: CLAY_LIGHT,
    start: 2023.5,
    merge: 2025.9,
    from: 'left',
    reach: 0.86,
  },
  {
    id: 'making',
    label: 'Making',
    note: 'Plentify, hemp and bamboo',
    color: DANIEL_DEEP,
    start: 2024,
    merge: 2025.3,
    from: 'right',
    reach: 0.72,
  },
  {
    id: 'robotics',
    label: 'Robotics',
    note: 'Texas Robotics, then KUKA',
    color: DANIEL_LIGHT,
    start: 2024.2,
    merge: 2025.7,
    from: 'right',
    reach: 0.82,
  },
  {
    id: 'newyork',
    label: 'New York',
    note: 'Rogers Partners, a year away',
    color: DANIEL,
    start: 2025,
    merge: 2025.95,
    from: 'right',
    reach: 1,
  },
];

/* --------------------------------- geometry ------------------------------- */

const W = 1440;
/** One "year" of vertical travel. The whole drawing is this tall times the span. */
const YEAR_H = 300;
const MIN_YEAR = 2020;
const MAX_YEAR = 2026;
const Y0 = 90;
const CONVERGE_Y = Y0 + (MAX_YEAR - MIN_YEAR) * YEAR_H;
const H = CONVERGE_Y + 220;
const CX = 720;

/** The window the camera shows: about one and a half years of time at once, so the frame
 *  only ever holds one or two events. */
const VIEW_H = 460;
// The gutter each side reserves for LABELS. A tributary is born at CX +/- (CX - EDGE),
// so the text always has room and never runs out of the frame.
const EDGE = 380;

const EGG_RY = 60;
const NARROW = 0.62;
const EGG_Y = CONVERGE_Y + EGG_RY * NARROW + 6;

const yearToY = (y: number) => Y0 + (y - MIN_YEAR) * YEAR_H;
const yToYear = (y: number) => MIN_YEAR + (y - Y0) / YEAR_H;

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/** The trunk: born as Clay's line, running straight down to the egg once it settles. */
function trunkPath(): string {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const year = lerp(TRUNK.start, MAX_YEAR, i / N);
    // It enters a little off-centre, the way one person's path is never quite the axis, and
    // settles onto the line as Daniel joins.
    const settle = gompertz(clamp01((year - TRUNK.start) / 1.6), 0.4, 6);
    const x = lerp(CX - 86, CX, settle);
    pts.push({ x, y: yearToY(year) });
  }
  return lineGen(pts) ?? '';
}

/**
 * One tributary: born at the edge of the frame, carried into the trunk by a Gompertz growth
 * curve, with a damped golden-spiral bend on the way in. It ENDS at the trunk. It is absorbed.
 */
function tributaryPath(t: Tributary, index: number): string {
  const phase = index * GOLDEN_ANGLE;
  const dir = t.from === 'left' ? -1 : 1;
  const x0 = CX + dir * (CX - EDGE) * t.reach;
  const pts: Array<{ x: number; y: number }> = [];
  const N = 72;

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const year = lerp(t.start, t.merge, u);
    // The bend lands late: a thread lives its own life out at its own distance and only
    // commits near the end. An early inflection collapses everything into a bundle.
    const g = gompertz(u, 0.62, 6.5);
    const x = lerp(x0, CX, g) + lateral(u, g, phase, 16, 0.72);
    pts.push({ x, y: yearToY(year) });
  }
  return lineGen(pts) ?? '';
}

/* ------------------------------- the graphic ------------------------------ */

/**
 * The scroll track is TALL; the frame inside it is sticky. The camera's position in the
 * drawing is the scroll's progress through the track, so scrolling down IS moving forward
 * in time. Reduced motion gets the whole drawing at once, no travel, no pin.
 */
export function CrossPathsTimeline() {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0); // 0 to 1, how far the camera has travelled

  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // How far through the track we are, once its top passes the top of the viewport.
        const travel = r.height - window.innerHeight;
        const done = travel <= 0 ? 0 : clamp01(-r.top / travel);
        setP(done);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const trunk = useMemo(trunkPath, []);
  const tribs = useMemo(() => TRIBUTARIES.map((t, i) => ({ t, d: tributaryPath(t, i) })), []);
  const egg = useMemo(() => eggPath(0, 0, EGG_RY, EGG_RY * 2 * 0.86, NARROW), []);

  // Where the camera is, and therefore what year we are looking at.
  const camY = reduced ? 0 : lerp(0, H - VIEW_H, p);
  const nowYear = reduced ? MAX_YEAR : yToYear(camY + VIEW_H * 0.62);

  /** How much of a path has been drawn, given the year the camera has reached. */
  const drawn = (from: number, to: number) =>
    reduced ? 1 : clamp01((nowYear - from) / Math.max(to - from, 0.0001));

  const viewBox = reduced ? `0 0 ${W} ${H}` : `0 ${camY} ${W} ${VIEW_H}`;

  return (
    <div ref={trackRef} className="relative" style={{ height: reduced ? 'auto' : '420vh' }}>
      <div
        className={
          reduced
            ? ''
            : 'sticky top-[var(--header-h)] flex h-[calc(100svh-var(--header-h))] items-center'
        }
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full max-h-[76vh] w-full"
          role="img"
          aria-label="A timeline from 2020 to 2026 that travels downward as you scroll. Clay's line begins alone in 2020, drafting at Rick Wright Architects in Dallas, and becomes the main line. Daniel merges into it in 2021 at UT Austin, and the line turns from blue to olive. Each later thread arrives from a side and merges in: Clay's startups and research from the left, Daniel's making, robotics and his year in New York from the right. In 2026 the line arrives at an egg, which is Bower."
        >
          <defs>
            {/* The trunk starts as Clay's, and stops being Clay's the year Daniel joins.
                The colour says it before any label does. */}
            <linearGradient id="cptl-trunk" x1="0" y1={yearToY(TRUNK.start)} x2="0" y2={yearToY(DANIEL_JOINS + 0.9)} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={CLAY} />
              <stop offset="100%" stopColor={SHARED} />
            </linearGradient>
          </defs>

          {/* Year ticks, quiet, riding the trunk. */}
          {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
            <g key={y} opacity={drawn(y - 0.35, y) > 0 ? 1 : 0}>
              <line
                x1={CX + 16}
                y1={yearToY(y)}
                x2={CX + 26}
                y2={yearToY(y)}
                stroke="currentColor"
                className="text-inkBlack"
                strokeWidth={1.2}
                opacity={0.3}
              />
              <text
                x={CX + 34}
                y={yearToY(y) + 4}
                className="fill-inkBlack/40 font-mono"
                style={{ fontSize: 13, letterSpacing: '0.12em' }}
              >
                {y}
              </text>
            </g>
          ))}

          {/* THE MAIN LINE. It is Clay's, until it is not. */}
          <path
            d={trunk}
            fill="none"
            stroke="url(#cptl-trunk)"
            strokeWidth={3.4}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - drawn(TRUNK.start, MAX_YEAR)}
          />

          {/* Everything that merged in, arriving from its own side. */}
          {tribs.map(({ t, d }) => (
            <path
              key={t.id}
              d={d}
              fill="none"
              stroke={t.color}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - drawn(t.start, t.merge)}
            />
          ))}

          {/* The trunk's own name, at the top, where the whole thing begins. */}
          <Label
            x={CX - 86}
            y={yearToY(TRUNK.start)}
            label={TRUNK.label}
            note={TRUNK.note}
            color={CLAY}
            side="left"
            show={drawn(TRUNK.start - 0.2, TRUNK.start + 0.1)}
          />

          {/* Each tributary named where it enters the frame. */}
          {TRIBUTARIES.map((t) => {
            const dir = t.from === 'left' ? -1 : 1;
            return (
              <Label
                key={t.id}
                x={CX + dir * (CX - EDGE) * t.reach}
                y={yearToY(t.start)}
                label={t.label}
                note={t.note}
                color={t.color}
                side={t.from}
                show={drawn(t.start - 0.25, t.start + 0.1)}
              />
            );
          })}

          {/* THE EGG. The restless part, become the thing itself. */}
          <g
            transform={`translate(${CX} ${EGG_Y}) rotate(90)`}
            opacity={drawn(MAX_YEAR - 0.5, MAX_YEAR)}
          >
            <path d={egg} fill={SHARED} fillOpacity={0.14} stroke={SHARED} strokeWidth={3} />
          </g>
          <text
            x={CX}
            y={EGG_Y + 6}
            textAnchor="middle"
            className="fill-inkBlack font-serifDisplay"
            style={{ fontSize: 20, fontStyle: 'italic', opacity: drawn(MAX_YEAR - 0.3, MAX_YEAR) }}
          >
            Bower
          </text>
        </svg>
      </div>
    </div>
  );
}

/** One thread's name, at the point it enters. It fades in as the camera reaches its year. */
function Label({
  x,
  y,
  label,
  note,
  color,
  side,
  show,
}: {
  x: number;
  y: number;
  label: string;
  note: string;
  color: string;
  side: 'left' | 'right';
  show: number;
}) {
  // A label grows AWAY from the trunk, never toward it, or it collides with the main line
  // and the year ticks the moment two events share a frame.
  const left = side === 'left';
  const tx = left ? x - 16 : x + 16;
  return (
    <g style={{ opacity: show, transition: 'opacity 300ms ease-out' }}>
      <circle cx={x} cy={y} r={4} fill={color} />
      <text
        x={tx}
        y={y - 6}
        textAnchor={left ? 'end' : 'start'}
        className="fill-inkBlack font-serifDisplay"
        style={{ fontSize: 24 }}
      >
        {label}
      </text>
      <text
        x={tx}
        y={y + 14}
        textAnchor={left ? 'end' : 'start'}
        className="fill-inkBlack/50 font-mono"
        style={{ fontSize: 12, letterSpacing: '0.04em' }}
      >
        {note}
      </text>
    </g>
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
