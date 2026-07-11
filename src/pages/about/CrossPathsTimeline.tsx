/**
 * CrossPathsTimeline.tsx — the animated "how we crossed paths" motion graphic.
 *
 * The horizontal axis is TIME. Each thread begins at the year it really started, so an
 * early thread (meeting at UT Austin) runs long and a late one (the engine) is short;
 * they weave over and under each other and converge into one bold arrow, Bower. The
 * animation is chronological: the earliest thread draws itself in first, then each later
 * one weaves in on top, and last the Bower arrow lands. Reduced motion renders the final
 * state. Small screens fall back to a vertical list.
 *
 * DATES: the studio-project years (2022 flowerfield, Synergy, Dougherty) are firm; the
 * others (UT Austin, Resia/Drafted, Archipedia, Forsite OPS, the engine) are Daniel's to
 * confirm. Everything is one edit away in STRANDS[].start.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { line as d3line, curveNatural } from 'd3-shape';

interface Strand {
  label: string;
  note: string;
  who: 'Clay' | 'Daniel' | 'both';
  color: string;
  /** The year this thread began (drives its start on the time axis). */
  start: number;
  /** Vertical lane, top (0) to bottom (5). Clay's threads sit high, Daniel's low. */
  lane: number;
}

const STRANDS: Strand[] = [
  { label: 'Where we met', note: 'UT Austin', who: 'both', color: '#4C9FC2', start: 2020, lane: 0 },
  { label: 'Startups', note: 'Resia, then Drafted', who: 'Clay', color: '#C2673B', start: 2021, lane: 1 },
  { label: 'Research', note: 'Archipedia and papers', who: 'Clay', color: '#E0A63C', start: 2023, lane: 2 },
  { label: 'Studio work', note: 'flowerfield to Dougherty', who: 'both', color: '#A85BA0', start: 2022, lane: 3 },
  { label: 'Operations', note: 'Forsite OPS', who: 'Daniel', color: '#6B7A99', start: 2024, lane: 4 },
  { label: 'The engine', note: 'the generative core', who: 'Daniel', color: '#2E3A6E', start: 2024, lane: 5 },
];

const MERGE_COLOR = '#8FA61E'; // deep accent-olive: the resolved Bower line
const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- geometry ------------------------------- */

const W = 1000;
const H = 380;
const CX = 762; // convergence x (Bower, 2025)
const CY = 190;
const MIN_YEAR = 2020;
const MAX_YEAR = 2025; // the convergence year
const yearToX = (y: number) => 235 + ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * (CX - 235);
const laneY = (lane: number) => 46 + lane * ((H - 92) / 5);

/** d3 natural cubic spline: passes through every waypoint, but flows organically
 *  between them, which is what gives the strands their expressive, hand-drawn weave. */
const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveNatural);

/** A weaving strand from its dated start, undulating around its drift to the centre,
 *  its amplitude tapering to zero as it lands on the shared Bower line at the dot. */
function strandPath(startX: number, startY: number, lane: number): string {
  const steps = 8;
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = startX + t * (CX - startX);
    const baseY = startY + (CY - startY) * t;
    const amp = 52 * (1 - t) * (1 - t); // ease the taper so it flows flat into the dot
    const y = baseY + amp * Math.sin(2.5 * Math.PI * t + lane * 1.05);
    pts.push({ x, y });
  }
  pts[pts.length - 1] = { x: CX, y: CY };
  return lineGen(pts) ?? '';
}

/* ------------------------------ desktop weave ----------------------------- */

function Weave({ reduced, play }: { reduced: boolean; play: boolean }) {
  // Chronological reveal WITHOUT staggerChildren (which does not cascade reliably through
  // an <svg>): every element carries its OWN delay, ranked by the thread's start year, so
  // the earliest thread draws first and the rest weave in over it, then the connection dot,
  // then the Bower arrow. motion.svg only supplies the "show" label on scroll into view.
  const rank = new Map<string, number>();
  [...STRANDS].sort((a, b) => a.start - b.start).forEach((s, i) => rank.set(s.label, i));
  const step = 0.34;
  const dotDelay = 0.1 + STRANDS.length * step;
  const arrowDelay = dotDelay + 0.25;

  // Draw with a CSS keyframe ANIMATION (a transition needs a painted "hidden" frame first,
  // which we cannot guarantee; an animation plays the moment it is applied). pathLength=1
  // normalises every path to one unit, so a dashoffset of 1 hides it and 0 reveals it. Each
  // element carries its own animation-delay, so when `play` flips true (the graphic is on
  // screen, after the intro) the earliest thread strokes on first and the rest weave in,
  // then the connection dot, then the Bower arrow.
  const EZ = 'cubic-bezier(0.16,1,0.3,1)';
  // The hidden value is ALSO the base style, so during the animation-delay the element stays
  // hidden (backwards-fill of the keyframe is unreliable for stroke-dashoffset); the keyframe
  // then draws it in and `forwards` holds the finished state.
  const drawStyle = (delay: number): CSSProperties =>
    reduced
      ? { strokeDasharray: 1, strokeDashoffset: 0 }
      : play
        ? { strokeDasharray: 1, strokeDashoffset: 1, animation: `cptl-draw 0.9s ${EZ} ${delay}s forwards` }
        : { strokeDasharray: 1, strokeDashoffset: 1 };
  const fadeStyle = (delay: number, extra?: CSSProperties): CSSProperties =>
    reduced
      ? { opacity: 1, ...extra }
      : play
        ? { opacity: 0, animation: `cptl-fade 0.45s ease ${delay}s forwards`, ...extra }
        : { opacity: 0, ...extra };

  return (
    <div className="hidden lg:block">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="A time-line: our threads begin at their real dates, weave together, and converge into Bower."
      >
        {/* The invisible main line: the Bower through-line every thread flows into. Barely
            there on the left (implied), it becomes the solid arrow past the connection dot. */}
        <line x1={210} y1={CY} x2={CX} y2={CY} stroke={MERGE_COLOR} strokeWidth={1.25} opacity={0.14} strokeDasharray="1 6" strokeLinecap="round" />

        {STRANDS.map((s) => {
          const sx = yearToX(s.start);
          const sy = laneY(s.lane);
          const d = 0.1 + (rank.get(s.label) ?? 0) * step;
          return (
            <g key={s.label}>
              {/* the weaving strand */}
              <path
                d={strandPath(sx, sy, s.lane)}
                pathLength={1}
                fill="none"
                stroke={s.color}
                strokeWidth={3.5}
                strokeLinecap="round"
                style={drawStyle(d)}
              />
              {/* the dated start: dot + label + year, with a paper halo so text reads over lines */}
              <g style={fadeStyle(d + 0.5, { paintOrder: 'stroke' })}>
                <circle cx={sx} cy={sy} r={4} fill={s.color} stroke="#FBF9F3" strokeWidth={2.5} />
                <text x={sx - 12} y={sy - 3} textAnchor="end" className="font-serifDisplay" fontSize="14.5" fill="#17160F" stroke="#FBF9F3" strokeWidth="3">
                  {s.label}
                </text>
                <text x={sx - 12} y={sy + 13} textAnchor="end" className="font-mono" fontSize="10" fill="#17160F" opacity="0.5" stroke="#FBF9F3" strokeWidth="3">
                  {s.note} · {s.start}
                </text>
              </g>
            </g>
          );
        })}

        {/* The connection dot: where every thread becomes one line, Bower. */}
        <g style={fadeStyle(dotDelay)}>
          <circle cx={CX} cy={CY} r={11} fill="#FBF9F3" stroke={MERGE_COLOR} strokeWidth={2} />
          <circle cx={CX} cy={CY} r={5} fill={MERGE_COLOR} />
        </g>

        {/* The merged Bower main line + arrow. */}
        <path d={`M ${CX + 11} ${CY} L ${W - 54} ${CY}`} pathLength={1} fill="none" stroke={MERGE_COLOR} strokeWidth={6} strokeLinecap="round" style={drawStyle(arrowDelay)} />
        <path d={`M ${W - 62} ${CY - 13} L ${W - 30} ${CY} L ${W - 62} ${CY + 13} Z`} fill={MERGE_COLOR} style={fadeStyle(arrowDelay + 0.4)} />
        <text x={W - 40} y={CY - 24} textAnchor="end" className="font-serifDisplay" fontSize="21" fontStyle="italic" fill="#17160F" style={fadeStyle(arrowDelay + 0.4)}>
          Bower
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------ mobile (vertical) ------------------------- */

function Vertical({ reduced, play }: { reduced: boolean; play: boolean }) {
  const ordered = [...STRANDS].sort((a, b) => a.start - b.start);
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const rise: Variants = {
    hidden: reduced ? {} : { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  };
  return (
    <motion.ol
      variants={container}
      initial="hidden"
      animate={play ? undefined : 'hidden'}
      whileInView={play ? 'show' : undefined}
      viewport={play ? { once: true, amount: 0.15 } : undefined}
      className="relative ml-1 border-l border-inkBlack/15 pl-6 lg:hidden"
    >
      {ordered.map((s) => (
        <motion.li key={s.label} variants={rise} className="relative pb-6">
          <span className="absolute -left-[30px] top-1 block h-2.5 w-2.5 rounded-full ring-4 ring-paperVellum" style={{ background: s.color }} aria-hidden />
          <p className="font-serifDisplay text-[16px] leading-tight text-inkBlack">
            {s.label} <span className="font-mono text-[11px] text-inkBlack/40">{s.start}</span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] leading-snug text-inkBlack/50">{s.note}</p>
        </motion.li>
      ))}
      <motion.li variants={rise} className="relative">
        <span className="absolute -left-[32px] top-1 block h-3.5 w-3.5 rounded-full ring-4 ring-paperVellum" style={{ background: MERGE_COLOR }} aria-hidden />
        <p className="font-serifDisplay text-[19px] italic leading-tight text-inkBlack">Bower</p>
        <p className="mt-0.5 font-mono text-[11px] text-inkBlack/50">2025, the studio</p>
      </motion.li>
    </motion.ol>
  );
}

export function CrossPathsTimeline({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  // Own the trigger: start hidden, then flip once the graphic is actually on screen (via an
  // IntersectionObserver, which fires on the next tick). That false -> true change is what
  // drives the CSS draw. Gated by `play` (the page's post-intro reveal) so it never runs
  // under the veil. reduced motion shows the finished state at once.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const started = reduced || (play && inView);

  return (
    <div ref={ref}>
      <Weave reduced={reduced} play={started} />
      <Vertical reduced={reduced} play={started} />
      <p className="mt-6 max-w-[54ch] font-serifDisplay text-[14px] leading-snug text-inkBlack/50">
        Two people and a handful of obsessions, met at UT Austin and woven, over five years, into
        one studio.
      </p>
    </div>
  );
}
