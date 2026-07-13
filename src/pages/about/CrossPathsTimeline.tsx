/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, as a travelling sequence.
 *
 * THERE IS NO PRE-EXISTING MAIN LINE. That was the mistake in the first version: it drew a
 * spine and then hung people off it. Here the main line is BORN as Clay's first thread, and
 * it earns everything after that:
 *
 *   2020  Clay is drafting at Rick Wright in Dallas. One line. It IS the main line.
 *   2021  Daniel enrols at UT Austin and merges into it.
 *   then  Every later thread arrives from a SIDE and merges in: from the left, the startups
 *         and the research; from the right, the making, the robotics, and New York.
 *   2026  The trunk arrives at the seed.
 *
 * ONE COLOUR (2026-07-13). The strands used to be colour-coded by person — Clay blue, Daniel
 * green, shared olive — and it split the drawing into two teams reading against each other.
 * It is one practice, so it is one blue. Difference is carried by WEIGHT and OPACITY: the
 * trunk is heaviest and fully opaque, and a tributary lightens the further out it starts.
 *
 * IT TRAVELS, AND IT TRAVELS ALONGSIDE THE WORDS. The section pins; the title and the two
 * questions sit in a column beside the drawing, and the questions surface as the camera
 * reaches the years that earned them, rather than being handed over up front. The camera's
 * window is FITTED TO THE FRAME (see `useFrameAspect`), so the drawing fills the panel edge
 * to edge instead of being letterboxed into a band or clipped mid-label.
 *
 * THE CURVATURE IS NOT SPLINE TASTE (see growth.ts). A Gompertz growth function carries each
 * tributary from the edge of the frame into the trunk, and the SAME function damps a small
 * arc of a golden logarithmic spiral so the approach bends the way a tendril reaches. The
 * threads are phased by the golden angle. Strokes are UNIFORM. It ends in a seed.
 *
 * EVERY DATE IS REAL, from Clay's resume and Daniel's CV.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { GOLDEN_ANGLE, clamp01, embryoPath, gompertz, lateral, lerp, seedPath } from './growth';

/** The practice's blue. There is no second colour in this drawing, on purpose. */
export const INK_BLUE = '#3E7CA8';

/** The picture an event carries. THIS is the point of the timeline now: a year and a name are
 *  not something anyone stops for, but the thing you actually made that year is. Every event
 *  shows one, and when we do not have the image yet we say so rather than dressing the gap up
 *  in more prose. */
interface EventImage {
  src: string;
  alt: string;
  /** Set when the picture is still missing: draws an honest empty plate instead. */
  pending?: boolean;
}

interface Tributary {
  id: string;
  label: string;
  note: string;
  image: EventImage;
  /** The year it really began, and the year it finishes merging into the trunk. */
  start: number;
  merge: number;
  /** Which edge it comes in from. */
  from: 'left' | 'right';
  /** How far out toward the edge it starts, 0 to 1. The 2025 threads start furthest out:
   *  that year is the real divergence, Daniel in New York and Clay deep in Resia. */
  reach: number;
  /** Nudges the LABEL down, in drawing units, without moving the strand. Two threads that
   *  really did begin within weeks of each other (Plentify and the research, both spring 2023)
   *  would otherwise print their names on top of each other. The dot stays on the true year;
   *  only the text steps aside. */
  labelDy?: number;
}

const A = '/assets/projects';

/** The thread that becomes the main line. Clay was drafting a year before Daniel enrolled. */
const TRUNK = {
  id: 'trunk',
  label: 'Practice',
  note: 'Rick Wright Architects, Dallas',
  start: 2020,
  image: {
    src: '',
    alt: 'Drafting at Rick Wright Architects, Dallas',
    pending: true,
  } as EventImage,
};

const TRIBUTARIES: Tributary[] = [
  {
    id: 'school',
    label: 'Architecture',
    note: 'UT Austin, where we met',
    image: {
      src: `${A}/07-flowerfield/flowerfield-biophilic-ecodistrict-hero-render.webp`,
      alt: 'The flowerfield ecodistrict, organic white buildings above a field of flowers with the Austin skyline behind',
    },
    start: 2021,
    merge: 2021.9,
    from: 'right',
    reach: 0.88,
  },
  {
    id: 'startups',
    label: 'Startups',
    note: 'Resia AI, and TestFit',
    // PENDING: Clay's Resia images live in a Drive folder this machine cannot reach yet.
    image: { src: '', alt: 'Resia AI', pending: true },
    start: 2023,
    merge: 2025.6,
    from: 'left',
    reach: 1,
  },
  {
    id: 'together',
    label: 'Building together',
    note: 'Plentify, then Dougherty',
    image: {
      src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
      alt: 'The catenary arch entrances of the Dougherty Arts Center, the Austin skyline behind',
    },
    // Held back from Resia so the two 2023 threads do not print their labels on top of each
    // other. Plentify was the studio year; Resia was already running when it started.
    start: 2023.45,
    merge: 2024.6,
    from: 'left',
    reach: 0.55,
  },
  {
    id: 'research',
    label: 'Research',
    note: 'machine learning, four papers',
    image: {
      src: `${A}/08-synthetic-vision/synthetic-vision-patch-probe-saliency-heatmaps.webp`,
      alt: 'Saliency heatmaps over architectural fragments, warm colour marking each geometric primitive the model reads',
    },
    start: 2023.5,
    merge: 2025.9,
    from: 'left',
    reach: 0.86,
    // Plentify and the research really did begin within weeks of each other. The dots stay on
    // the true years; only this plate steps down, out of the other one's way.
    labelDy: 300,
  },
  {
    id: 'making',
    label: 'Making',
    note: 'hemp, bamboo, and the mix',
    image: {
      src: `${A}/01-synergy/synergy-cosmos-courtyard-render.webp`,
      alt: 'The Plentify courtyard, terraced buildings planted with the bamboo and hemp that become the walls',
    },
    start: 2024,
    merge: 2025.3,
    from: 'right',
    reach: 0.72,
  },
  {
    id: 'robotics',
    label: 'Robotics',
    note: 'Texas Robotics, then KUKA',
    image: {
      src: `${A}/06-kuka-robotics/kuka-robotics-led-light-drawing-long-exposure.webp`,
      alt: 'Long-exposure photograph of the KUKA arm tracing a radial burst of LED light',
    },
    start: 2024.2,
    merge: 2025.7,
    from: 'right',
    reach: 0.82,
    labelDy: 300,
  },
  {
    id: 'newyork',
    label: 'New York',
    note: 'Rogers Partners, a year away',
    image: { src: '', alt: 'Rogers Partners, New York', pending: true },
    start: 2025,
    merge: 2025.95,
    from: 'right',
    reach: 1,
    labelDy: 340,
  },
];

/* --------------------------------- geometry ------------------------------- */

/** The drawing's own width. It is deliberately NARROW relative to the old 1440, because the
 *  panel it sits in is a column beside the words, not a full-bleed band: a wide coordinate
 *  space in a portrait frame gets scaled down to nothing, and the whole drawing reads as thin
 *  spidery lines with tiny type. Narrow space -> bigger scale factor -> readable strokes. */
const W = 900;
/** One "year" of vertical travel. Generous, because every event now carries a PICTURE and a
 *  picture needs room: this is what keeps two plates in the same frame from landing on top of
 *  each other, and it is the main cure for a cramped drawing. */
const YEAR_H = 560;
const MIN_YEAR = 2020;
const MAX_YEAR = 2026;
const Y0 = 150;
const CONVERGE_Y = Y0 + (MAX_YEAR - MIN_YEAR) * YEAR_H;

/** The plate an event's picture is printed on, and the run-up a strand gets BEFORE its year.
 *
 *  The lead is what makes a line arrive from OUTSIDE the frame: the strand is already running
 *  a good half-year above the moment it is named, so by the time the camera reaches its dot the
 *  line is entering from off the top edge and drawing itself in, rather than popping into being
 *  at a point in the middle of an empty field. */
const IMG_W = 252;
const IMG_H = 158;
const LEAD = 0.55;

/** The seed, at the end of the line. Its TIP is the point the strands gather into, so the
 *  tip sits exactly at CONVERGE_Y and the body swells below it. */
const SEED_A = 104; // half-width
const SEED_B = 152; // half-height, tip to base
const SEED_CY = CONVERGE_Y + SEED_B;

const H = SEED_CY + SEED_B + 150;
const CX = 450;

/** The gutter each side reserves for LABELS. A tributary is born at CX ± (CX - EDGE), so its
 *  text always has room to grow outward and never runs out of the frame. The longest note is
 *  "machine learning, four papers" at ~226 units; EDGE is set so even the strand that starts
 *  furthest out still clears it. */
const EDGE = 270;

const yearToY = (y: number) => Y0 + (y - MIN_YEAR) * YEAR_H;
const yToYear = (y: number) => MIN_YEAR + (y - Y0) / YEAR_H;

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/** The year a thread's line actually STARTS being drawn — a lead-in above the year it is
 *  named, so it is already coming down out of the frame when you arrive at it. */
const drawFrom = (startYear: number) => startYear - LEAD;

/** The trunk: born as one person's line, running down to the seed once it settles. It too
 *  starts above the first year, so at the very top of the page it is already descending into
 *  frame rather than beginning at a dot. */
function trunkPath(): string {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 100;
  const from = drawFrom(TRUNK.start);
  for (let i = 0; i <= N; i++) {
    const year = lerp(from, MAX_YEAR, i / N);
    // It enters a little off-centre, the way one person's path is never quite the axis, and
    // settles onto the line as the second person joins.
    const settle = gompertz(clamp01((year - TRUNK.start) / 1.6), 0.4, 6);
    const x = lerp(CX - 62, CX, settle);
    pts.push({ x, y: yearToY(year) });
  }
  return lineGen(pts) ?? '';
}

/**
 * One tributary: it comes in from OFF THE EDGE of the frame, runs its own life out there for a
 * while, and is then carried into the trunk by a Gompertz growth curve with a damped
 * golden-spiral bend on the way in. It ENDS at the trunk. It is absorbed.
 *
 * The first stretch (the lead) is a straight descent at its own distance from the axis: that is
 * the part that is off-screen when the camera arrives, so the line reads as something that was
 * already running before you got there, not something conjured at a point.
 */
function tributaryPath(t: Tributary, index: number): string {
  const phase = index * GOLDEN_ANGLE;
  const dir = t.from === 'left' ? -1 : 1;
  const x0 = CX + dir * (CX - EDGE) * t.reach;
  const pts: Array<{ x: number; y: number }> = [];
  const N = 80;

  // The run-up, above its own year, straight down at its own distance.
  const LEAD_N = 10;
  for (let i = 0; i < LEAD_N; i++) {
    const year = lerp(drawFrom(t.start), t.start, i / LEAD_N);
    pts.push({ x: x0, y: yearToY(year) });
  }

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

/** A tributary that starts further out is quieter, so the drawing has depth without a second
 *  hue. This is the ONLY thing distinguishing one strand from another now. */
const tribOpacity = (t: Tributary) => 0.92 - t.reach * 0.24;

/* ------------------------------- the graphic ------------------------------ */

/**
 * The width/height ratio of the frame the drawing is shown in. The camera's window is derived
 * from it, so the viewBox and the panel ALWAYS have the same aspect: `meet` then neither
 * letterboxes the drawing into a band nor clips it. Without this the window was a fixed
 * 1440x460 slot, and on a tall panel the drawing got cut instead of fitted.
 */
function useFrameAspect(ref: React.RefObject<HTMLElement>): number {
  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return aspect;
}

/**
 * The scroll track is TALL; the frame inside it is sticky. The camera's position in the
 * drawing is the scroll's progress through the track, so scrolling down IS moving forward in
 * time — and the words travel with it. Reduced motion gets the whole drawing at once, all the
 * text at once, no travel, no pin.
 */
export function CrossPathsTimeline({
  title,
  questions,
}: {
  /** The page's h1, rendered in the column beside the drawing so the sequence starts right
   *  next to the sentence it is the proof of. */
  title: ReactNode;
  /** The two questions, revealed one at a time as the camera travels rather than handed over
   *  before anything has happened. */
  questions: Array<{ label: string; text: string }>;
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0); // 0 to 1, how far the camera has travelled
  const aspect = useFrameAspect(frameRef);

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
  const seed = useMemo(() => seedPath(SEED_A, SEED_B), []);
  const seedInner = useMemo(() => seedPath(SEED_A * 0.74, SEED_B * 0.78), []);
  // The embryo rides HIGH in the seed, in the taper behind the tip. That is where it really
  // sits — the radicle points at the micropyle, which is the end the root comes out of — and
  // it is also the only way the wordmark gets the wide part of the body to itself.
  const embryo = useMemo(() => embryoPath(SEED_A * 0.42, SEED_B * 0.4), []);

  // The camera window: as wide as the drawing, as tall as the frame's aspect says it must be.
  const viewH = clamp(W / aspect, 480, H);
  const camY = reduced ? 0 : lerp(0, Math.max(H - viewH, 0), p);
  const nowYear = reduced ? MAX_YEAR : yToYear(camY + viewH * 0.58);

  /** How much of a path has been drawn, given the year the camera has reached. */
  const drawn = (from: number, to: number) =>
    reduced ? 1 : clamp01((nowYear - from) / Math.max(to - from, 0.0001));

  const viewBox = reduced ? `0 0 ${W} ${H}` : `0 ${camY} ${W} ${viewH}`;

  // The seed's own reveal, in three beats: the outline draws, the inside fills in, the name
  // lands. It is the payoff, so it gets its own little sequence rather than one fade.
  const seedIn = drawn(MAX_YEAR - 0.75, MAX_YEAR - 0.15);
  const seedCore = drawn(MAX_YEAR - 0.4, MAX_YEAR);
  const seedName = drawn(MAX_YEAR - 0.25, MAX_YEAR);

  return (
    <div ref={trackRef} className="relative" style={{ height: reduced ? 'auto' : '640vh' }}>
      <div
        className={
          reduced
            ? 'flex flex-col gap-12'
            : 'sticky top-[var(--header-h)] flex h-[calc(100svh-var(--header-h))] flex-col gap-8 py-4 lg:flex-row lg:items-stretch lg:gap-12 xl:gap-16'
        }
      >
        {/* The words. The title first, then the questions, surfacing as the drawing earns
            them. This column is why the sequence starts right beside the sentence. */}
        <div className="flex shrink-0 flex-col justify-center gap-10 lg:w-[clamp(19rem,26vw,24rem)]">
          {title}
          <dl className="flex flex-col gap-8">
            {questions.map((q, i) => {
              // Question one surfaces early, question two once the threads are multiplying.
              const at = reduced ? 1 : clamp01((p - (i === 0 ? 0.04 : 0.42)) / 0.12);
              return (
                <div
                  key={q.label}
                  style={{
                    opacity: at,
                    transform: `translateY(${(1 - at) * 14}px)`,
                    transition: 'opacity 500ms ease-out, transform 500ms ease-out',
                  }}
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                    {q.label}
                  </dt>
                  <dd className="mt-2.5 font-serifDisplay text-[clamp(1.15rem,1.55vw,1.5rem)] leading-[1.35] text-inkBlack">
                    {q.text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* The drawing. It owns the rest of the frame and fills it. */}
        <div ref={frameRef} className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            role="img"
            aria-label="A timeline from 2020 to 2026 that travels downward as you scroll. One line begins alone in 2020, drafting at Rick Wright Architects in Dallas, and becomes the main line. A second merges into it in 2021 at UT Austin. Each later thread arrives from a side and merges in: the startups and the research from the left, the making, the robotics and the year in New York from the right. In 2026 the line arrives at a seed, which is Bower."
          >
            {/* Year ticks, quiet, riding the trunk. 2026 is NOT among them: the seed sits on
                that year and carries the date itself, and a tick beside its tip only printed
                the same number twice. */}
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <g key={y} opacity={drawn(y - 0.35, y) > 0 ? 1 : 0}>
                <line
                  x1={CX + 18}
                  y1={yearToY(y)}
                  x2={CX + 30}
                  y2={yearToY(y)}
                  stroke="currentColor"
                  className="text-inkBlack"
                  strokeWidth={1.2}
                  opacity={0.28}
                />
                <text
                  x={CX + 40}
                  y={yearToY(y) + 5}
                  className="fill-inkBlack/40 font-mono"
                  style={{ fontSize: 15, letterSpacing: '0.12em' }}
                >
                  {y}
                </text>
              </g>
            ))}

            {/* THE MAIN LINE. Heavy, and already descending into frame at the top of the page. */}
            <path
              d={trunk}
              fill="none"
              stroke={INK_BLUE}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - drawn(drawFrom(TRUNK.start), MAX_YEAR)}
            />

            {/* Everything that merged in, arriving from its own side and from off the edge. */}
            {tribs.map(({ t, d }) => (
              <path
                key={t.id}
                d={d}
                fill="none"
                stroke={INK_BLUE}
                strokeOpacity={tribOpacity(t)}
                strokeWidth={3.6}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawn(drawFrom(t.start), t.merge)}
              />
            ))}

            {/* The trunk's own name and picture, where the whole thing begins. */}
            <Label
              x={CX - 62}
              y={yearToY(TRUNK.start)}
              label={TRUNK.label}
              note={TRUNK.note}
              image={TRUNK.image}
              side="left"
              show={drawn(TRUNK.start - 0.2, TRUNK.start + 0.1)}
            />

            {/* Each tributary named, and SHOWN, where it enters. */}
            {TRIBUTARIES.map((t) => {
              const dir = t.from === 'left' ? -1 : 1;
              return (
                <Label
                  key={t.id}
                  x={CX + dir * (CX - EDGE) * t.reach}
                  y={yearToY(t.start)}
                  dy={t.labelDy}
                  label={t.label}
                  note={t.note}
                  image={t.image}
                  side={t.from}
                  show={drawn(t.start - 0.25, t.start + 0.1)}
                />
              );
            })}

            {/* THE SEED. Not an egg: an egg is finished and waiting, a seed is a plan for a
                plant that has not happened yet. The outline draws, the endosperm and the
                folded embryo fill in, and the name lands last. */}
            <g transform={`translate(${CX} ${SEED_CY})`}>
              <path
                d={seed}
                fill={INK_BLUE}
                fillOpacity={0.07 * seedCore}
                stroke={INK_BLUE}
                strokeWidth={3}
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - seedIn}
              />
              {/* The endosperm: the seed's own reserve, a second contour inside the first. */}
              <path
                d={seedInner}
                fill="none"
                stroke={INK_BLUE}
                strokeOpacity={0.4}
                strokeWidth={1.2}
                strokeDasharray="5 5"
                opacity={seedCore}
              />
              {/* The embryo, folded and waiting, up in the taper behind the tip. */}
              <g transform={`translate(0 ${-SEED_B * 0.3})`}>
                <path
                  d={embryo}
                  fill="none"
                  stroke={INK_BLUE}
                  strokeOpacity={0.5}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - seedCore}
                />
              </g>
              {/* The hilum: the scar where the seed was attached to the plant that made it. */}
              <circle cy={SEED_B * 0.84} r={3.4} fill={INK_BLUE} opacity={seedCore * 0.7} />

              {/* The name, inside the thing it names, sitting in the widest part of the body
                  where there is room for it. */}
              <text
                y={SEED_B * 0.32}
                textAnchor="middle"
                className="fill-inkBlack font-serifDisplay"
                style={{ fontSize: 31, fontStyle: 'italic', opacity: seedName }}
              >
                Bower
              </text>
              <text
                y={SEED_B * 0.56}
                textAnchor="middle"
                className="fill-inkBlack/45 font-mono"
                style={{ fontSize: 11, letterSpacing: '0.2em', opacity: seedName }}
              >
                2026
              </text>
            </g>

            {/* The line under the seed: what it is FOR, said once. */}
            <text
              x={CX}
              y={SEED_CY + SEED_B + 62}
              textAnchor="middle"
              className="fill-inkBlack/55 font-serifDisplay"
              style={{ fontSize: 19, opacity: seedName }}
            >
              Everything above, folded up and waiting.
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * One event: its name, the specific thing it was, and THE PICTURE.
 *
 * The plate is what the reader actually stops for, so it is the largest thing on the strand.
 * The name and the one line of context sit above it; the picture hangs beneath, growing AWAY
 * from the trunk (never toward it, or it lands on the main line and the year ticks the moment
 * two events share a frame). It rises as it fades in, so a plate ARRIVES rather than appears.
 */
function Label({
  x,
  y,
  dy = 0,
  label,
  note,
  image,
  side,
  show,
}: {
  x: number;
  y: number;
  /** Steps the PLATE away from the dot, so two events in the same season can both be read. */
  dy?: number;
  label: string;
  note: string;
  image: EventImage;
  side: 'left' | 'right';
  show: number;
}) {
  const left = side === 'left';
  const tx = left ? x - 20 : x + 20;
  const ty = y + dy;
  // The picture's outer edge lines up with the text's, so name, note and plate share one margin.
  const ix = left ? tx - IMG_W : tx;
  const iy = ty + 30;
  const clip = `cptl-clip-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <g
      style={{
        opacity: show,
        transform: `translateY(${(1 - show) * 16}px)`,
        transition: 'opacity 420ms ease-out, transform 420ms ease-out',
      }}
    >
      <circle cx={x} cy={y} r={4.5} fill={INK_BLUE} />
      {/* When the plate has stepped aside, a hairline keeps it tied to the year it belongs to. */}
      {dy !== 0 && (
        <line x1={x} y1={y} x2={x} y2={ty - 30} stroke={INK_BLUE} strokeWidth={1} opacity={0.3} />
      )}

      <text
        x={tx}
        y={ty - 12}
        textAnchor={left ? 'end' : 'start'}
        className="fill-inkBlack font-serifDisplay"
        style={{ fontSize: 27 }}
      >
        {label}
      </text>
      <text
        x={tx}
        y={ty + 14}
        textAnchor={left ? 'end' : 'start'}
        className="fill-inkBlack/50 font-mono"
        style={{ fontSize: 13, letterSpacing: '0.05em' }}
      >
        {note}
      </text>

      {image.pending ? (
        // No picture yet. Say that, plainly, instead of filling the hole with more words.
        <g>
          <rect
            x={ix}
            y={iy}
            width={IMG_W}
            height={IMG_H}
            fill={INK_BLUE}
            fillOpacity={0.04}
            stroke={INK_BLUE}
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="6 6"
          />
          <text
            x={ix + IMG_W / 2}
            y={iy + IMG_H / 2 + 4}
            textAnchor="middle"
            className="fill-inkBlack/35 font-mono"
            style={{ fontSize: 11, letterSpacing: '0.18em' }}
          >
            IMAGE TO COME
          </text>
        </g>
      ) : (
        <g>
          <clipPath id={clip}>
            <rect x={ix} y={iy} width={IMG_W} height={IMG_H} />
          </clipPath>
          <image
            href={image.src}
            x={ix}
            y={iy}
            width={IMG_W}
            height={IMG_H}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clip})`}
          >
            <title>{image.alt}</title>
          </image>
          <rect
            x={ix}
            y={iy}
            width={IMG_W}
            height={IMG_H}
            fill="none"
            stroke={INK_BLUE}
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        </g>
      )}
    </g>
  );
}
