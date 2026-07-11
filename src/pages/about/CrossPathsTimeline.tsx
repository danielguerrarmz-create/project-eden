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
import { motion, useReducedMotion, type Variants } from 'framer-motion';

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

/** Catmull-Rom through the points, emitted as smooth cubic beziers. */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** A weaving strand from its dated start point to the shared convergence. */
function strandPath(startX: number, startY: number, lane: number): string {
  const steps = 7;
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = startX + t * (CX - startX);
    const baseY = startY + (CY - startY) * t;
    const amp = 40 * (1 - t);
    const y = baseY + amp * Math.sin(2.2 * Math.PI * t + lane * 1.05);
    pts.push({ x, y });
  }
  pts[pts.length - 1] = { x: CX, y: CY };
  return smooth(pts);
}

/* ------------------------------ desktop weave ----------------------------- */

function Weave({ reduced }: { reduced: boolean }) {
  // Draw order is chronological: earliest thread first, so it "begins with the first
  // line" and the others weave in over it. The Bower arrow is the last child.
  const ordered = [...STRANDS].sort((a, b) => a.start - b.start);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.34, delayChildren: 0.1 } },
  };
  const drawStrand: Variants = {
    hidden: reduced ? { opacity: 1 } : { pathLength: 0, opacity: 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { duration: 0.95, ease: EASE }, opacity: { duration: 0.25 } },
    },
  };
  const fade: Variants = {
    hidden: reduced ? { opacity: 1 } : { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.45, ease: EASE, delay: reduced ? 0 : 0.35 } },
  };
  const drawArrow: Variants = {
    hidden: reduced ? { opacity: 1 } : { pathLength: 0, opacity: 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { duration: 0.7, ease: EASE }, opacity: { duration: 0.2 } },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="hidden lg:block"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="A time-line: our threads begin at their real dates, weave together, and converge into Bower.">
        {ordered.map((s) => {
          const sx = yearToX(s.start);
          const sy = laneY(s.lane);
          return (
            <motion.g key={s.label} variants={{ hidden: {}, show: {} }}>
              {/* the weaving strand */}
              <motion.path
                d={strandPath(sx, sy, s.lane)}
                fill="none"
                stroke={s.color}
                strokeWidth={3.5}
                strokeLinecap="round"
                variants={drawStrand}
              />
              {/* the dated start: dot + label + year, with a paper halo so text reads over lines */}
              <motion.g variants={fade} style={{ paintOrder: 'stroke' }}>
                <circle cx={sx} cy={sy} r={4} fill={s.color} stroke="#FBF9F3" strokeWidth={2.5} />
                <text x={sx - 12} y={sy - 3} textAnchor="end" className="font-serifDisplay" fontSize="14.5" fill="#17160F" stroke="#FBF9F3" strokeWidth="3">
                  {s.label}
                </text>
                <text x={sx - 12} y={sy + 13} textAnchor="end" className="font-mono" fontSize="10" fill="#17160F" opacity="0.5" stroke="#FBF9F3" strokeWidth="3">
                  {s.note} · {s.start}
                </text>
              </motion.g>
            </motion.g>
          );
        })}

        {/* the merged Bower arrow, last */}
        <motion.g variants={{ hidden: {}, show: {} }}>
          <motion.path
            d={`M ${CX} ${CY} L ${W - 54} ${CY}`}
            fill="none"
            stroke={MERGE_COLOR}
            strokeWidth={6}
            strokeLinecap="round"
            variants={drawArrow}
          />
          <motion.path d={`M ${W - 62} ${CY - 13} L ${W - 30} ${CY} L ${W - 62} ${CY + 13} Z`} fill={MERGE_COLOR} variants={fade} />
          <motion.text x={W - 40} y={CY - 24} textAnchor="end" className="font-serifDisplay" fontSize="21" fontStyle="italic" fill="#17160F" variants={fade}>
            Bower
          </motion.text>
        </motion.g>
      </svg>
    </motion.div>
  );
}

/* ------------------------------ mobile (vertical) ------------------------- */

function Vertical({ reduced }: { reduced: boolean }) {
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
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
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

export function CrossPathsTimeline() {
  const reduced = useReducedMotion() ?? false;
  return (
    <div>
      <Weave reduced={reduced} />
      <Vertical reduced={reduced} />
      <p className="mt-6 max-w-[54ch] font-serifDisplay text-[14px] leading-snug text-inkBlack/50">
        Two people and a handful of obsessions, met at UT Austin and woven, over five years, into
        one studio.
      </p>
    </div>
  );
}
