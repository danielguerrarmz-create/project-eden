/**
 * MobileTimeline.tsx — the About timeline below `lg` (1024px), as a DOM/flexbox vertical document.
 *
 * WHY THIS EXISTS, and why it is a whole separate tree rather than a media query on the drawn one.
 * The desktop timeline (`DesktopTimeline` in CrossPathsTimeline.tsx) is ONE fixed 1200-world-unit SVG
 * scroll-scrubbed by a panning camera (`viewBox = 0 camY 1200 viewH`, `preserveAspectRatio="meet"`).
 * A fixed viewBox with `meet` never breaks — it uniformly scales the whole composition down, and on a
 * 390px phone that is ~0.30x: 30-unit year labels render ~9px, the 2.2-unit spine becomes a 0.66px
 * hairline. It does not look broken; it looks intentionally tiny, which is worse. Media queries cannot
 * reach inside a fixed viewBox. So below `lg` we mount THIS instead — page scroll, not a camera, and
 * every measurement in CSS px so nothing shrinks to illegibility. The trees never coexist in the
 * committed DOM (the wrapper picks one via `useMediaQuery`), which is also what keeps the founders'
 * `[data-timeline-camera]` lookup pointed at the desktop svg and never at anything in here.
 *
 * COLOUR LAW (viewport-independent, CLAUDE.md): STRUCTURE IS ALWAYS SEPIA — the spine, the ticks, the
 * year labels, the twist glyph, the finale mark. The ONLY pigment on this page is a painted botanical,
 * and this lean tree grows none (it deliberately imports no gongbi/colonize/painter ornament — plan
 * §5.3, "the mobile timeline tree should not import desktop-only ornament modules"), so there is no
 * colour here but sepia plus the photographs' own. Nothing is colour-coded by person.
 *
 * THE TWO AUTHORED EVENTS keep their MEANING as static compositions, not their choreography: the
 * twist-fuse opening is a small fixed glyph at the top (two strands crossing into one spine), and the
 * unravel-into-mark finale is the Oculus mark + wordmark lockup at the bottom. The desktop "words rest
 * 18px proud of centre" pin choreography is desktop-only and has no place here.
 */
import type { ReactNode } from 'react';
import { OculusMark } from '../../ui/OculusMark';
import { srcSetFor } from '../../ui/responsiveImg';
import { WORDMARK } from '../../data/config';
import { CLUSTERS, type Cluster, type Node } from './clusters';
import { INK_SEPIA, INK_SEPIA_TEXT } from './CrossPathsTimeline';

/** Which mobile form to render. `rail` (default) is the most legible on 375-430px phones: one sepia
 *  spine on the left, cards full-width beside it. `center` puts the spine down the middle and lets the
 *  cards alternate by their authored `side` — truer to the drawn timeline's two-sided composition, but
 *  it halves every card's width, so it is here for Daniel to compare against `rail`, not as the ship
 *  default (D3: pick the spine form from two real renders). Swap forms live with `#/about?spine=center`;
 *  the capture harness grabs both without a code edit. */
export type SpineVariant = 'rail' | 'center';

/** Pure: `center` only when the query says so, `rail` otherwise (including garbage/empty). Split out
 *  from the window read so it is testable in the bare-node suite. */
export function parseSpineVariant(qs: string): SpineVariant {
  return new URLSearchParams(qs).get('spine') === 'center' ? 'center' : 'rail';
}

/** Read the spine variant from the URL so both forms can be captured for review without editing code.
 *  Hash routing puts the query after the `#` (`#/about?spine=center`); fall back to a real `?search`. */
export function readSpineVariant(): SpineVariant {
  if (typeof window === 'undefined') return 'rail';
  const hash = window.location.hash;
  const qs = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.slice(1);
  return parseSpineVariant(qs);
}

/**
 * The clusters, read once in true chronological order. The desktop timeline deliberately does NOT sort
 * strictly (it band-packs by year and spreads within a band); a vertical document has no camera and no
 * bands, so the honest recompose is a plain ascending read by event date. `Math.floor(year)` gives the
 * year header; the fractional part (2023.55) only orders within a year. Content only — never mutated.
 */
export const LAID: readonly Cluster[] = [...CLUSTERS].sort((a, b) => a.year - b.year);

/** The distinct year headers in the order the body emits them: the floor of each cluster's year, first
 *  occurrence only, walking `LAID`. Exported so the test can pin it to `YEAR_TICKS` — a header that
 *  drifts from the axis ticks is a year printed twice or a year missing, and neither is visible without
 *  a render. Pure. */
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

/**
 * One plate image. The box is given the picture's OWN measured ratio (`aspectRatio: media.ratio`), so
 * `object-fit` has nothing left to resolve — no crop, no letterbox — which is the FIT_FRAME argument
 * from the other side and the page's single most-repeated law ("stop forcing geometry onto something
 * that already knows its own shape"). Video clusters render their POSTER still: the mobile tree is a
 * static composition and a phone should not autoplay a wall of loops (battery/thermal), and `media.src`
 * on a video node already IS the poster.
 *
 * `srcSet`/`sizes` are threaded through for WP2's width variants; until those assets exist the base
 * `src` stands alone. Always lazy + async-decoded, matching Splash.
 */
function TimelinePlate({ node, sizes }: { node: Node; sizes?: string }) {
  const { media } = node;
  const srcSet = srcSetFor(media.src);
  if (media.pending) {
    return (
      <div
        aria-hidden
        className="grid aspect-[3/2] w-full place-items-center border border-dashed border-inkBlack/25 bg-paperDeep/25"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Image to come</span>
      </div>
    );
  }
  const contain = media.fit === 'contain';
  return (
    <img
      src={media.src}
      srcSet={srcSet}
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

/** The `sizes` a full-width card image renders at below `lg`. The card is the content column minus the
 *  page gutters and (in `rail`) the spine indent; in `center` it is roughly half that. A generous
 *  ceiling — the mobile tree only mounts under 1024px. */
const RAIL_SIZES = '(max-width: 480px) calc(100vw - 5.5rem), (max-width: 1023px) calc(100vw - 7rem), 640px';
const CENTER_SIZES = '(max-width: 480px) calc(50vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 320px';

/** The twist-fuse, as a small static glyph: two equal strands come in from the top corners, cross once
 *  over-under, and lay up into the single spine that the whole timeline hangs from. Sepia structure. */
function TwistGlyph() {
  return (
    <svg
      width={56}
      height={72}
      viewBox="0 0 56 72"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
      style={{ color: INK_SEPIA }}
    >
      {/* left strand crosses to the right of centre, right strand to the left — one over-under — then
          both close onto x=28 and become the born spine running to the bottom edge. */}
      <path d="M6 2 C 10 24, 34 30, 28 44 L 28 72" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M50 2 C 46 24, 22 30, 28 44" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

/** The finale: the drawn line winds into the Bower mark, then the wordmark. Here it is that lockup as a
 *  static composition — the Oculus mark (sepia, via currentColor) over the wordmark in the display
 *  serif — with a short spine stub arriving into it so the timeline reads as one line ending in the
 *  mark, exactly as the desktop finale resolves. */
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

/** A year header on the spine: a filled node on the rail and the four digits beside it. Sepia. */
function YearNode({ year, variant }: { year: number; variant: SpineVariant }) {
  const label = (
    <span className="font-mono text-[15px] font-semibold tracking-[0.06em]" style={{ color: INK_SEPIA_TEXT }}>
      {year}
    </span>
  );
  const dot = <span className="block h-2.5 w-2.5 flex-none rounded-full" style={{ background: INK_SEPIA }} />;
  if (variant === 'center') {
    return (
      <div className="relative z-10 my-6 flex items-center justify-center gap-2">
        {dot}
        {label}
      </div>
    );
  }
  // rail: dot sits ON the rail (its centre at the rail x), label to its right.
  return (
    <div className="relative z-10 mb-4 mt-8 flex items-center gap-3">
      <span className="grid w-10 flex-none place-items-center">{dot}</span>
      {label}
    </div>
  );
}

/** One card's block: the plate(s) of a cluster, plus a caption where the data authored one. In `rail`
 *  the card is full-width past the spine indent; in `center` it takes a side by the cluster's `side`. */
function ClusterCard({ cluster, variant }: { cluster: Cluster; variant: SpineVariant }) {
  const cap = caption(cluster);
  const sizes = variant === 'center' ? CENTER_SIZES : RAIL_SIZES;
  const plates = (
    <div className="flex flex-col gap-3">
      {cluster.nodes.map((node, i) => (
        <figure key={node.media.src} className="m-0">
          <TimelinePlate node={node} sizes={sizes} />
          {i === 0 && cap && (
            <figcaption
              className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: INK_SEPIA_TEXT }}
            >
              {cap}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );

  if (variant === 'center') {
    const isRight = cluster.side === 'right';
    return (
      <div className={`relative z-10 mb-8 flex ${isRight ? 'justify-end' : 'justify-start'}`}>
        <div className="w-[calc(50%-1rem)]">{plates}</div>
      </div>
    );
  }
  // rail: indent past the spine so the card clears it, full remaining width.
  return <div className="relative z-10 mb-2 pl-[3.25rem]">{plates}</div>;
}

/**
 * The vertical timeline body: the spine line, the twist-fuse at its head, the years and their cards in
 * chronological order, and the mark lockup at its foot. A single relative column with an absolutely
 * positioned sepia spine behind the content; the content flows in normal document order over it.
 */
function TimelineBody({ variant }: { variant: SpineVariant }) {
  // Where the spine line sits. rail: 20px from the left (the year dot's w-10 grid centres on it).
  // center: dead centre. The line runs the full height behind everything; the twist glyph and finale
  // sit at its two ends and cap it.
  const spineStyle =
    variant === 'center'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : { left: 'calc(1.25rem - 1px)' };

  return (
    <div className="relative">
      {/* THE SPINE. Structure, so sepia. Behind the cards (z default) while every year/card is z-10. It
          starts below the twist glyph and stops above the finale — bracketed by them, one continuous
          line the eye reads top to bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute w-[2px]"
        style={{ ...spineStyle, top: 8, bottom: 8, background: INK_SEPIA, opacity: 0.9 }}
      />

      <div className="relative">
        <div className="pb-2">
          <TwistGlyph />
        </div>

        {LAID.reduce<{ nodes: ReactNode[]; lastYear: number }>(
          (acc, cluster) => {
            const year = Math.floor(cluster.year);
            if (year !== acc.lastYear) {
              acc.nodes.push(<YearNode key={`y-${year}`} year={year} variant={variant} />);
              acc.lastYear = year;
            }
            acc.nodes.push(<ClusterCard key={cluster.id} cluster={cluster} variant={variant} />);
            return acc;
          },
          { nodes: [], lastYear: NaN },
        ).nodes}

        <div className="pt-10">
          <FinaleLockup />
        </div>
      </div>
    </div>
  );
}

/**
 * The mobile About timeline. Renders the page's framing (the title and the two questions) up top —
 * their desktop home is the camera copy column, which does not exist here — then the vertical timeline.
 * No camera, no autoplay, no reduced/motion split: the composition is identical either way, which is
 * exactly the point of the recompose.
 */
export function MobileTimeline({
  title,
  questions,
}: {
  title: ReactNode;
  questions: Array<{ label: string; text: string }>;
}) {
  const variant = readSpineVariant();
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

      <TimelineBody variant={variant} />
    </div>
  );
}
