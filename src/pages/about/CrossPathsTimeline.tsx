/**
 * CrossPathsTimeline.tsx — the animated "how we crossed paths" motion graphic.
 *
 * Per the reference: a handful of strands (our threads, Clay's and Daniel's) start
 * apart on the left, weave over and under each other across the middle, and converge
 * into one bold arrow, Bower. On scroll into view each strand draws itself in, staggered,
 * then the merged arrow draws and its head lands. Reduced motion renders the final state.
 *
 * Desktop shows the woven SVG; small screens fall back to a legible vertical list of the
 * same strands (the weave does not read at phone width). Strand data lives in STRANDS.
 */
import { motion, useReducedMotion, type Variants } from 'framer-motion';

interface Strand {
  label: string;
  note: string;
  who: 'Clay' | 'Daniel' | 'both';
  color: string;
}

/** The threads that wove into Bower. Ordered top to bottom on the desktop weave. */
const STRANDS: Strand[] = [
  { label: 'Where we met', note: 'UT Austin, School of Architecture', who: 'both', color: '#4C9FC2' },
  { label: 'Startups', note: 'Resia AI, then Drafted AI', who: 'Clay', color: '#C2673B' },
  { label: 'Research', note: 'Archipedia and papers', who: 'Clay', color: '#E0A63C' },
  { label: 'Studio work', note: 'flowerfield, Synergy, Dougherty', who: 'both', color: '#A85BA0' },
  { label: 'Operations', note: 'Forsite OPS, run solo', who: 'Daniel', color: '#6B7A99' },
  { label: 'The engine', note: 'the generative core', who: 'Daniel', color: '#2E3A6E' },
];

const MERGE_COLOR = '#8FA61E'; // a deep accent-olive: the resolved Bower line
const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- geometry ------------------------------- */

const W = 1000;
const H = 380;
const X0 = 250; // strands begin here (room for the right-aligned labels on the left)
const CX = 715; // convergence x
const CY = 190; // convergence y (centre)

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

/** One weaving strand from its start height to the shared convergence point. The
 *  sinusoid (its amplitude tapering to zero at the merge) makes the strands cross. */
function strandPath(i: number, n: number): { d: string; startY: number } {
  const startY = 46 + i * ((H - 92) / (n - 1));
  const steps = 7;
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = X0 + t * (CX - X0);
    const baseY = startY + (CY - startY) * t;
    const amp = 44 * (1 - t);
    const y = baseY + amp * Math.sin(2.3 * Math.PI * t + i * 1.15);
    pts.push({ x, y });
  }
  pts[pts.length - 1] = { x: CX, y: CY };
  return { d: smooth(pts), startY };
}

/* ------------------------------ desktop weave ----------------------------- */

function Weave({ reduced }: { reduced: boolean }) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.16, delayChildren: 0.05 } },
  };
  const drawStrand: Variants = {
    hidden: reduced ? { opacity: 1 } : { pathLength: 0, opacity: 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { duration: 1.2, ease: EASE }, opacity: { duration: 0.3 } },
    },
  };
  const drawArrow: Variants = {
    hidden: reduced ? { opacity: 1 } : { pathLength: 0, opacity: 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { duration: 0.7, ease: EASE, delay: 0.2 }, opacity: { duration: 0.2, delay: 0.2 } },
    },
  };
  const fade: Variants = {
    hidden: reduced ? { opacity: 1 } : { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
  };
  const paths = STRANDS.map((_, i) => strandPath(i, STRANDS.length));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="hidden lg:block"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="A timeline: our separate threads weaving together into Bower.">
        {/* left-hand strand labels */}
        {STRANDS.map((s, i) => (
          <motion.g key={s.label} variants={fade}>
            <text x={X0 - 16} y={paths[i].startY - 3} textAnchor="end" className="font-serifDisplay" fontSize="15" fill="#17160F">
              {s.label}
            </text>
            <text x={X0 - 16} y={paths[i].startY + 13} textAnchor="end" className="font-mono" fontSize="10.5" fill="#17160F" opacity="0.5">
              {s.note}
            </text>
          </motion.g>
        ))}

        {/* the weaving strands */}
        {STRANDS.map((s, i) => (
          <motion.path
            key={s.label}
            d={paths[i].d}
            fill="none"
            stroke={s.color}
            strokeWidth={3.5}
            strokeLinecap="round"
            variants={drawStrand}
          />
        ))}

        {/* the merged Bower arrow */}
        <motion.path
          d={`M ${CX} ${CY} L ${W - 54} ${CY}`}
          fill="none"
          stroke={MERGE_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
          variants={drawArrow}
        />
        <motion.path
          d={`M ${W - 62} ${CY - 13} L ${W - 30} ${CY} L ${W - 62} ${CY + 13} Z`}
          fill={MERGE_COLOR}
          variants={fade}
        />
        <motion.text
          x={W - 40}
          y={CY - 24}
          textAnchor="end"
          className="font-serifDisplay"
          fontSize="20"
          fontStyle="italic"
          fill="#17160F"
          variants={fade}
        >
          Bower
        </motion.text>
      </svg>
    </motion.div>
  );
}

/* ------------------------------ mobile (vertical) ------------------------- */

function Vertical({ reduced }: { reduced: boolean }) {
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
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
      {STRANDS.map((s) => (
        <motion.li key={s.label} variants={rise} className="relative pb-6">
          <span
            className="absolute -left-[30px] top-1 block h-2.5 w-2.5 rounded-full ring-4 ring-paperVellum"
            style={{ background: s.color }}
            aria-hidden
          />
          <p className="font-serifDisplay text-[16px] leading-tight text-inkBlack">{s.label}</p>
          <p className="mt-0.5 font-mono text-[11px] leading-snug text-inkBlack/50">{s.note}</p>
        </motion.li>
      ))}
      <motion.li variants={rise} className="relative">
        <span
          className="absolute -left-[32px] top-1 block h-3.5 w-3.5 rounded-full ring-4 ring-paperVellum"
          style={{ background: MERGE_COLOR }}
          aria-hidden
        />
        <p className="font-serifDisplay text-[19px] italic leading-tight text-inkBlack">Bower</p>
        <p className="mt-0.5 font-mono text-[11px] text-inkBlack/50">the studio, one product</p>
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
      <p className="mt-6 max-w-[52ch] font-serifDisplay text-[14px] leading-snug text-inkBlack/50">
        Two people and a handful of obsessions, met at UT Austin and woven, over five years, into
        one studio.
      </p>
    </div>
  );
}
