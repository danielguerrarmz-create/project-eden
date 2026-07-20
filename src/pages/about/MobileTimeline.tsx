/**
 * MobileTimeline.tsx — the About timeline below `lg` (1024px), as a DOM/flexbox vertical document.
 *
 * WHY THIS EXISTS, and why it is a whole separate tree rather than a media query on the drawn one.
 * The desktop timeline (`DesktopTimeline` in CrossPathsTimeline.tsx) is ONE fixed 1200-world-unit SVG
 * scroll-scrubbed by a panning camera (`viewBox = 0 camY 1200 viewH`, `preserveAspectRatio="meet"`).
 * A fixed viewBox with `meet` never breaks — it uniformly scales the whole composition down, and on a
 * 390px phone that is ~0.30x: 30-unit year labels render ~9px, the 2.2-unit spine becomes a 0.66px
 * hairline. Media queries cannot reach inside a fixed viewBox. So below `lg` we mount THIS instead —
 * page scroll, not a camera, and every measurement in CSS px so nothing shrinks to illegibility. The
 * trees never coexist in the committed DOM (the wrapper picks one via `useMediaQuery`), which is also
 * what keeps the founders' `[data-timeline-camera]` lookup pointed at the desktop svg, never here.
 *
 * THE FORM IS A CENTRE SPINE (Sai's 2026-07-20 redesign, Daniel signed off). One sepia line dead
 * centre, cards alternating left/right off it by their authored `packSide`. Each plate is a SMALL,
 * fixed-size specimen mark hugging the spine edge — a silhouette and a colour mass, not a document —
 * with generous paper around it; the point is "absorb about 10% of the photo," a mark along the line,
 * not a photo reel. A cluster's extra images collapse to a tight chip row rather than a stacked column.
 *
 * MOTION (Sai §3): no scroll-scrubbed camera — that is the whole reason this tree exists. "Growth" is
 * IntersectionObserver reveal-once, one clock per unit (framer `whileInView` + `viewport.once`), which
 * is deliberately the simpler path: this page's recorded bugs all lived in extra hand-rolled clocks
 * (the two-garland clock, the autoplay-drives-the-camera clock), and per-item IO sidesteps that class.
 * The twist glyph + spine grow on a single time beat ~450ms after the page reveals (a held-then-grow,
 * so title → questions → then the line arrives); every card/year/finale then reveals as it scrolls in.
 * Reduced motion renders the whole thing at rest, no observers, no delay.
 *
 * COLOUR LAW (viewport-independent, CLAUDE.md): STRUCTURE IS ALWAYS SEPIA — spine, ticks, year labels,
 * twist glyph, finale mark. The only colour besides sepia is the photographs' own; this lean tree
 * grows no gongbi ornament, so there is no pigment to police. Nothing is colour-coded by person.
 */
import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { OculusMark } from '../../ui/OculusMark';
import { srcSetFor } from '../../ui/responsiveImg';
import { WORDMARK } from '../../data/config';
import { CLUSTERS, type Cluster, type Node } from './clusters';
import { INK_SEPIA, INK_SEPIA_TEXT } from './CrossPathsTimeline';

/** The page's own reveal ease (`AboutIntro`'s EASE_LINE, and the curve `AboutPage` fades `revealed`
 *  with). The mobile tree reuses it for its reveals rather than introducing a new vocabulary. */
const EASE_LINE = [0.16, 1, 0.3, 1] as const;

/**
 * The clusters, read once in true chronological order. The desktop timeline deliberately does NOT sort
 * strictly (it band-packs by year and spreads within a band); a vertical document has no camera and no
 * bands, so the honest recompose is a plain ascending read by event date. `Math.floor(year)` gives the
 * year header; the fractional part (2023.55) only orders within a year. Content only — never mutated.
 */
export const LAID: readonly Cluster[] = [...CLUSTERS].sort((a, b) => a.year - b.year);

/** The distinct year headers in the order the body emits them: the floor of each cluster's year, first
 *  occurrence only, walking `LAID`. Exported so the test can pin it to `YEAR_TICKS` — a header that
 *  drifts from the axis ticks is a year printed twice or a year missing, invisible without a render. */
export function yearHeaderOrder(): number[] {
  const out: number[] = [];
  let last = NaN;
  for (const c of LAID) {
    const y = Math.floor(c.year);
    if (y !== last) {
      out.push(y);
      last = y;
    }
  }
  return out;
}

/** A card's visible caption. The drawn timeline shows NO captions — just images beside year labels —
 *  and inventing prose for the ~8 clusters whose `hint` is empty would be fabrication. So a caption
 *  appears ONLY where the data authored a `hint` ('Research Paper', 'LLO: Dream Machine', …); the year
 *  label carries the structural meaning for every card. */
export function caption(c: Cluster): string {
  return c.hint.trim();
}

/** Small, fixed specimen size (Sai §4): ~21-22% of the viewport — 80px at 375, ~84 at 390, capped 96
 *  by 430. Height follows the image's own ratio (FIT_FRAME), so a landscape lands ~53-64px tall: enough
 *  to read "that's a robot / a growing building / a research plot," not enough to invite study. */
const PLATE_MAX_W = 'clamp(80px, 22vw, 96px)';
/** A cluster's non-primary images, as a huddle of chips ~half the plate's width. */
const CHIP_MAX_W = 'clamp(38px, 11vw, 46px)';
/** The plate/chip render at their own CSS width; the smallest generated variant (400w) already covers
 *  them at DPR 3, so a fixed `sizes` keeps the browser from pulling anything larger. */
const PLATE_SIZES = '96px';
const CHIP_SIZES = '48px';

/**
 * One plate image, sized by its container. The box is given the picture's OWN measured ratio
 * (`aspectRatio: media.ratio`), so `object-fit` has nothing left to resolve — no crop, no letterbox —
 * the page's single most-repeated law. Video clusters render their POSTER still (`media.src` on a video
 * node already IS the poster): a static composition, and no phone should autoplay a wall of loops.
 */
function PlateImg({ node, sizes }: { node: Node; sizes: string }) {
  const { media } = node;
  if (media.pending) {
    return (
      <div
        aria-hidden
        className="grid aspect-[3/2] w-full place-items-center border border-dashed border-inkBlack/25 bg-paperDeep/25"
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-inkBlack/40">soon</span>
      </div>
    );
  }
  const contain = media.fit === 'contain';
  return (
    <img
      src={media.src}
      srcSet={srcSetFor(media.src)}
      sizes={sizes}
      alt={media.alt}
      width={Math.round(1000 * media.ratio)}
      height={1000}
      loading="lazy"
      decoding="async"
      style={{ aspectRatio: String(media.ratio) }}
      className={`block w-full ${contain ? 'bg-paperVellum object-contain' : 'bg-paperDeep/40 object-cover'}`}
    />
  );
}

/**
 * A reveal wrapper: reduced motion renders children at rest; otherwise the unit is hidden until it is
 * both ARMED (the spine has grown in) and scrolled into view, then reveals once and never re-hides
 * (`viewport.once`). Before arming it is held at its hidden state so an above-the-fold card cannot
 * reveal during the intro veil — the choreography is title → questions → spine → cards, not all at once.
 */
function Reveal({
  reduced,
  armed,
  y = 16,
  scale,
  duration,
  className,
  style,
  children,
}: {
  reduced: boolean;
  armed: boolean;
  y?: number;
  scale?: number;
  duration: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  const hidden = { opacity: 0, y, ...(scale != null ? { scale } : {}) };
  const shown = { opacity: 1, y: 0, ...(scale != null ? { scale: 1 } : {}) };
  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      {...(armed
        ? { whileInView: shown, viewport: { once: true, margin: '0px 0px -12% 0px' } }
        : { animate: hidden })}
      transition={{ duration, ease: EASE_LINE }}
    >
      {children}
    </motion.div>
  );
}

/** The twist-fuse, as a small static glyph: two equal strands come in from the top corners, cross once
 *  over-under, and lay up into the single spine the whole timeline hangs from. Sepia structure. */
function TwistGlyph() {
  return (
    <svg width={56} height={72} viewBox="0 0 56 72" fill="none" aria-hidden="true" className="mx-auto" style={{ color: INK_SEPIA }}>
      <path d="M6 2 C 10 24, 34 30, 28 44 L 28 72" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M50 2 C 46 24, 22 30, 28 44" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

/** The finale lockup: the Oculus mark over the wordmark, a short spine stub arriving into it so the
 *  line reads as ending in the mark — the same resolution the desktop finale winds into. */
function FinaleLockup() {
  return (
    <div className="flex flex-col items-center" style={{ color: INK_SEPIA }}>
      <span aria-hidden className="block w-[2px] flex-none" style={{ height: 40, background: INK_SEPIA }} />
      <OculusMark size={76} className="mt-1" />
      <span className="mt-4 font-serifDisplay text-[2rem] lowercase leading-none" style={{ color: INK_SEPIA_TEXT }}>
        {WORDMARK.toLowerCase()}
      </span>
    </div>
  );
}

/** A year header on the spine: a centred dot + the mono year, between clusters. Unchanged treatment
 *  (Sai §4: "already reads correctly"), now revealing on scroll. */
function YearNode({ year, reduced, armed }: { year: number; reduced: boolean; armed: boolean }) {
  return (
    <Reveal reduced={reduced} armed={armed} y={8} duration={0.4} className="relative z-10 my-8 flex items-center justify-center gap-2">
      <span className="block h-2.5 w-2.5 flex-none rounded-full" style={{ background: INK_SEPIA }} />
      <span className="font-mono text-[15px] font-semibold tracking-[0.06em]" style={{ color: INK_SEPIA_TEXT }}>
        {year}
      </span>
    </Reveal>
  );
}

/**
 * One cluster, off the spine. The card takes the half named by `cluster.side` and its plate hugs the
 * SPINE-side edge of that half (right edge for a left card, left edge for a right card) — reading as
 * sprouting off the line, not floating in a box. The rest of the half is paper. A cluster's first node
 * is the primary plate; any extras become a tight chip row beneath it. Caption, where authored, sits
 * at the same edge.
 */
function ClusterCard({ cluster, reduced, armed }: { cluster: Cluster; reduced: boolean; armed: boolean }) {
  const cap = caption(cluster);
  const isLeft = cluster.side === 'left';
  const primary = cluster.nodes[0];
  const extra = cluster.nodes.slice(1);
  // The half-column, pushed to its side of the spine, its contents aligned to the spine edge.
  const half = `flex w-1/2 flex-col gap-1.5 ${isLeft ? 'items-end pr-3' : 'ml-auto items-start pl-3'}`;
  return (
    <Reveal reduced={reduced} armed={armed} y={16} scale={0.96} duration={0.45} className="relative z-10 my-9 flex">
      <div className={half}>
        <div className="w-full" style={{ maxWidth: PLATE_MAX_W }}>
          <PlateImg node={primary} sizes={PLATE_SIZES} />
        </div>
        {extra.length > 0 && (
          <div className="flex gap-1">
            {extra.map((n) => (
              <div key={n.media.src} className="w-full" style={{ maxWidth: CHIP_MAX_W }}>
                <PlateImg node={n} sizes={CHIP_SIZES} />
              </div>
            ))}
          </div>
        )}
        {cap && (
          <figcaption
            className={`font-mono text-[11px] uppercase tracking-[0.14em] ${isLeft ? 'text-right' : 'text-left'}`}
            style={{ color: INK_SEPIA_TEXT }}
          >
            {cap}
          </figcaption>
        )}
      </div>
    </Reveal>
  );
}

/**
 * The vertical timeline body: the centre spine, the twist-fuse at its head, the years and their cards,
 * and the mark lockup at its foot. The spine grows in and the twist glyph settles on ONE time beat
 * ~450ms after the page reveals (Sai's held-then-grow); everything else reveals on scroll. Reduced
 * motion renders it all at rest.
 */
function TimelineBody({ reduced, revealed }: { reduced: boolean; revealed: boolean }) {
  // `grown` gates the twist glyph + spine (the time-based beat) AND arms the scroll reveals. Reduced
  // motion is grown from the first frame (everything static); otherwise it flips ~450ms after the page
  // reveals — a small deliberate pause in the same register as AboutIntro's own beats, not a scroll wait.
  const [grown, setGrown] = useState(reduced);
  useEffect(() => {
    if (reduced || !revealed) return;
    const t = window.setTimeout(() => setGrown(true), 450);
    return () => clearTimeout(t);
  }, [reduced, revealed]);

  return (
    <div className="relative">
      {/* THE SPINE. Structure, so sepia; behind the cards (z default) while every unit is z-10. A fixed
          2px line, centred by a -1px margin so framer's scaleY grow (transform-origin top) never fights
          a centring translate. It is bracketed by the twist glyph and the finale lockup. */}
      <div aria-hidden className="pointer-events-none absolute" style={{ left: '50%', marginLeft: -1, top: 8, bottom: 8, width: 2 }}>
        {reduced ? (
          <div className="h-full w-full" style={{ background: INK_SEPIA, opacity: 0.9 }} />
        ) : (
          <motion.div
            className="h-full w-full"
            style={{ background: INK_SEPIA, opacity: 0.9, transformOrigin: 'top' }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: grown ? 1 : 0 }}
            transition={{ duration: 0.9, ease: EASE_LINE }}
          />
        )}
      </div>

      <div className="relative">
        <div className="pb-2">
          {reduced ? (
            <TwistGlyph />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: grown ? 1 : 0, scale: grown ? 1 : 0.92 }}
              transition={{ duration: 0.5, ease: EASE_LINE }}
            >
              <TwistGlyph />
            </motion.div>
          )}
        </div>

        {LAID.reduce<{ nodes: ReactNode[]; lastYear: number }>(
          (acc, cluster) => {
            const year = Math.floor(cluster.year);
            if (year !== acc.lastYear) {
              acc.nodes.push(<YearNode key={`y-${year}`} year={year} reduced={reduced} armed={grown} />);
              acc.lastYear = year;
            }
            acc.nodes.push(<ClusterCard key={cluster.id} cluster={cluster} reduced={reduced} armed={grown} />);
            return acc;
          },
          { nodes: [], lastYear: NaN },
        ).nodes}

        <Reveal reduced={reduced} armed={grown} y={16} scale={0.96} duration={0.45} className="relative z-10 pt-10">
          <FinaleLockup />
        </Reveal>
      </div>
    </div>
  );
}

/**
 * The mobile About timeline. Renders the page's framing (title + the two questions) up top — their
 * desktop home is the camera copy column, which does not exist here — then the vertical timeline. The
 * title and questions are present in the page's own `revealed` fade (not staged); `revealed` is
 * threaded down only so the timeline can start its held-then-grow AFTER that beat.
 */
export function MobileTimeline({
  title,
  questions,
  revealed = true,
}: {
  title: ReactNode;
  questions: Array<{ label: string; text: string }>;
  revealed?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-8">
        {title}
        <dl className="flex flex-col gap-6">
          {questions.map((q) => (
            <div key={q.label}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">{q.label}</dt>
              <dd className="mt-2 font-serifDisplay text-[clamp(1.15rem,4.5vw,1.5rem)] leading-[1.35] text-inkBlack">
                {q.text}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <TimelineBody reduced={reduced} revealed={revealed} />
    </div>
  );
}
