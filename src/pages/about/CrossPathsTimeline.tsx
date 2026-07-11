/**
 * CrossPathsTimeline.tsx — the animated "how we crossed paths" motion graphic on the
 * About page's first portion.
 *
 * The story, read left to right: the two of us met at UT Austin, ran parallel paths
 * (Clay above the spine, Daniel below), kept doing studio work together on the spine,
 * and merged into Bower. A shared-interests band underneath names the threads that made
 * the two paths one. On scroll into view the spine draws across, the branch connectors
 * grow, and the station cards rise in, staggered. Reduced motion renders the final state.
 *
 * It is a horizontal timeline on desktop and a stacked vertical one on small screens.
 * Data lives here (STATIONS / SHARED); it is deliberately grouped, not every line item,
 * so it stays legible and calm rather than a dense CV.
 */
import { motion, useReducedMotion, type Variants } from 'framer-motion';

type Node = { label: string; note: string };
interface Station {
  /** Clay's milestone at this step (rendered above the spine). */
  top?: Node;
  /** Daniel's milestone at this step (rendered below the spine). */
  bottom?: Node;
  /** A shared milestone that sits ON the spine. */
  spine?: Node & { year?: string };
  /** The origin (UT Austin) and terminus (Bower) get emphasis. */
  emphasis?: 'origin' | 'terminus';
}

/** The grouped path, origin to merge. Years are shown only where we are sure of them
 *  (the studio projects); the early sequence is the arc, not exact dates. */
const STATIONS: Station[] = [
  { spine: { label: 'UT Austin', note: 'School of Architecture, where we crossed paths' }, emphasis: 'origin' },
  {
    top: { label: 'Startups', note: 'Resia AI, then Drafted AI in San Francisco' },
    bottom: { label: 'Operations', note: 'Forsite OPS, an AI ops layer run solo' },
  },
  { spine: { label: 'Studio work', note: 'flowerfield, Synergy, Dougherty', year: '2022' } },
  {
    top: { label: 'Research', note: 'Archipedia and papers at AAG, ACADIA, CAADRIA' },
    bottom: { label: 'The engine', note: 'the generative core of Bower' },
  },
  { spine: { label: 'Search by Assembly', note: 'the precedent search you steer', year: '2025' } },
  { spine: { label: 'Bower', note: 'the studio, one product', year: '2025' }, emphasis: 'terminus' },
];

/** The threads that made two paths one, shown as a quiet band beneath the timeline. */
const SHARED = ['Computational design', 'Living architecture', 'Fabrication', 'AI'];

const EASE = [0.16, 1, 0.3, 1] as const;

/** A milestone card. `side` places it and points its connector at the spine. */
function NodeCard({
  node,
  side,
  who,
  reduced,
}: {
  node: Node & { year?: string };
  side: 'top' | 'bottom' | 'spine';
  who?: 'Clay' | 'Daniel';
  reduced: boolean;
}) {
  const rise: Variants = {
    hidden: reduced ? {} : { opacity: 0, y: side === 'bottom' ? -12 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };
  return (
    <motion.div variants={rise} className="relative">
      {who && (
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-accentOlive">
          {who}
        </span>
      )}
      <p className="font-serifDisplay text-[15px] leading-tight text-inkBlack">
        {node.label}
        {'year' in node && node.year && (
          <span className="ml-1.5 font-mono text-[10px] tracking-[0.08em] text-inkBlack/40">{node.year}</span>
        )}
      </p>
      <p className="mt-1 font-serifDisplay text-[12.5px] leading-snug text-inkBlack/55">{node.note}</p>
    </motion.div>
  );
}

/** The dot that sits on the spine for a station (bigger for origin / terminus). */
function SpineDot({ emphasis, reduced }: { emphasis?: Station['emphasis']; reduced: boolean }) {
  const big = !!emphasis;
  const pop: Variants = {
    hidden: reduced ? {} : { scale: 0, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { duration: 0.4, ease: EASE } },
  };
  return (
    <motion.span
      variants={pop}
      className={`relative z-10 block shrink-0 rounded-full ${
        big ? 'h-3.5 w-3.5 bg-accentOlive ring-4 ring-paperVellum' : 'h-2.5 w-2.5 bg-inkBlack ring-4 ring-paperVellum'
      }`}
      aria-hidden
    />
  );
}

/* ------------------------------ desktop (horizontal) ---------------------- */

function Horizontal({ reduced }: { reduced: boolean }) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const draw: Variants = {
    hidden: reduced ? {} : { scaleX: 0 },
    show: { scaleX: 1, transition: { duration: 1.1, ease: EASE } },
  };
  // Three stacked grids share one explicit column template so cells line up vertically
  // without relying on subgrid.
  const cols = { gridTemplateColumns: `repeat(${STATIONS.length}, minmax(0, 1fr))` };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      className="hidden lg:block"
    >
      {/* Row 1 — Clay (top), bottom-aligned so cards sit just above the spine. */}
      <div className="grid items-end" style={cols}>
        {STATIONS.map((s, i) => (
          <div key={i} className="min-h-[84px] px-3 pb-4">
            {s.top && <NodeCard node={s.top} side="top" who="Clay" reduced={reduced} />}
          </div>
        ))}
      </div>

      {/* Row 2 — the drawn spine + origin / shared / terminus dots. */}
      <div className="relative">
        <motion.div
          variants={draw}
          className="absolute left-3 right-3 top-[7px] h-px origin-left bg-inkBlack/25"
          aria-hidden
        />
        <div className="relative grid" style={cols}>
          {STATIONS.map((s, i) => (
            <div key={i} className="flex flex-col items-center px-3">
              <SpineDot emphasis={s.emphasis} reduced={reduced} />
              {s.spine && (
                <div className="mt-3 text-center">
                  <NodeCard node={s.spine} side="spine" reduced={reduced} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Daniel (bottom), top-aligned so cards sit just below the spine. */}
      <div className="mt-2 grid items-start" style={cols}>
        {STATIONS.map((s, i) => (
          <div key={i} className="min-h-[84px] px-3 pt-4">
            {s.bottom && <NodeCard node={s.bottom} side="bottom" who="Daniel" reduced={reduced} />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------ mobile (vertical) ------------------------- */

function Vertical({ reduced }: { reduced: boolean }) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
  };
  // Flatten to a single ordered column: origin, then each station's clay/daniel/spine.
  const items: { node: Node & { year?: string }; who?: 'Clay' | 'Daniel'; emphasis?: Station['emphasis'] }[] = [];
  STATIONS.forEach((s) => {
    if (s.spine) items.push({ node: s.spine, emphasis: s.emphasis });
    if (s.top) items.push({ node: s.top, who: 'Clay' });
    if (s.bottom) items.push({ node: s.bottom, who: 'Daniel' });
  });

  return (
    <motion.ol
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="relative ml-2 border-l border-inkBlack/20 pl-6 lg:hidden"
    >
      {items.map((it, i) => (
        <li key={i} className="relative pb-7 last:pb-0">
          <span
            className={`absolute -left-[31px] top-1 block rounded-full ring-4 ring-paperVellum ${
              it.emphasis ? 'h-3 w-3 bg-accentOlive' : 'h-2 w-2 bg-inkBlack'
            }`}
            aria-hidden
          />
          <NodeCard node={it.node} side="top" who={it.who} reduced={reduced} />
        </li>
      ))}
    </motion.ol>
  );
}

export function CrossPathsTimeline() {
  const reduced = useReducedMotion() ?? false;
  return (
    <div>
      <Horizontal reduced={reduced} />
      <Vertical reduced={reduced} />

      {/* Shared interests: the threads that made two paths one. */}
      <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-inkBlack/12 pt-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
          What we both chase
        </span>
        {SHARED.map((s) => (
          <span
            key={s}
            className="rounded-full border border-inkBlack/15 px-3 py-1 font-mono text-[11px] tracking-[0.04em] text-inkBlack/70"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
