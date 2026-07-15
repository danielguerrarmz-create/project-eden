/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * Order: the header (title + the two questions) drawn AS the cross-paths timeline, then the
 * co-founders (Clay + Daniel) borne at the node where the finale's ink line forks, then the projects.
 *
 * The projects use a master-detail LIST: a slim numbered SELECTION MENU on the left, and on the
 * right the selected project rendered as a PLATE — a fixed-height CSS-grid frame (one named template
 * per image count, n=1..8) whose cells are sized by the grid, never by the images, so every project
 * fills the identical frame with NO inner scroll. Description sits beside it, cut to three stages
 * (Nº tag + title + folded citation / one description / one payoff), with the payoff pinned so the
 * description is always the field that absorbs any pressure. Captions live only in the lightbox.
 *
 * Images are REAL, imported from Daniel's portfolio (see about/projects.ts).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { packBricks } from './about/bricks';
import { SplashHeader } from './splash/SplashHeader';
import { OculusMark } from '../ui/OculusMark';
import { useReducedMotion } from '../ui/useReducedMotion';
import { useAutoplayVideo } from './about/useAutoplayVideo';
import {
  PROJECTS,
  TEAM,
  TEAM_CODA,
  AUTHOR_LABEL,
  type Project,
  type ProjectImage,
  type TeamMember,
} from './about/projects';
import { AboutIntro, shouldPlayAboutIntro } from './about/AboutIntro';
import { CrossPathsTimeline, INK_BLUE } from './about/CrossPathsTimeline';

/** ONE colour, page-wide. There is no longer a Clay-blue / Daniel-green split: the authorship
 *  is already stated in words by the meta line, so saying it a second time in colour only
 *  fragmented the page. Blue is the practice's colour and everything selected takes it. */
function authorColor(_by: Project['by']): string {
  return INK_BLUE;
}

/** The page title, shared verbatim between the header and the intro's flying title so they
 *  land coincident — and it IS the narration's payoff line. */
const TITLE = "We've been chasing it for five years.";
const TITLE_CLASS =
  'font-serifDisplay text-[clamp(1.6rem,4.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.01em] text-inkBlack';

/** The two questions the whole practice chases, presented apart and large. */
const QUESTIONS = [
  { label: 'Question one', text: 'How can architecture be grown, not only built?' },
  { label: 'Question two', text: 'How does designing alongside AI reshape what we can make?' },
];

/** Decide synchronously (first client render) whether the narration intro should play.
 *  It plays on EVERY visit (not session-gated) — only reduced-motion opts out. */
function decideAboutIntro(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  return shouldPlayAboutIntro(reduced, false);
}

/** The mono meta pair (author + year). */
function Meta({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}
      style={{ color: authorColor(project.by) }}
    >
      {AUTHOR_LABEL[project.by]} · {project.year}
    </span>
  );
}

/* ------------------------------- media tiles ------------------------------ */

/** One framed image on the paper ground. In `plate` mode it fills its grid cell exactly
 *  (h-full w-full, object-fit by the image's own `fit`), with no border of its own — the plate
 *  frame draws the hairline gaps. Otherwise it renders at `className`'s aspect on the mobile stack.
 *
 *  Every interactive copy is a BUTTON: click it and it opens full-bleed in the Lightbox. The image
 *  carries a `layoutId` so framer-motion morphs the tile itself up to the large view. */
function ProjectVideoEl({
  image,
  className,
  contain,
  reduced,
  plate = false,
}: {
  image: ProjectImage;
  className: string;
  contain: boolean;
  reduced: boolean;
  /** Plate mode: fill the grid cell (h-full w-full), no border, object-fit by `contain`. */
  plate?: boolean;
}) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);

  const frame = plate
    ? `block h-full w-full ${contain ? 'bg-paperVellum object-contain' : 'object-cover'}`
    : `w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`;

  // Reduced motion gets the poster still. Nothing moves.
  if (reduced) return <img src={image.src} alt={image.alt} className={frame} />;

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={image.src}
      aria-label={image.alt}
      className={frame}
      onLoadedData={start}
      onCanPlay={start}
    >
      {image.video?.webm && <source src={image.video.webm} type="video/webm" />}
      <source src={image.video?.mp4} type="video/mp4" />
    </video>
  );
}

function ProjectImg({
  image,
  className = '',
  onOpen,
  reduced = false,
  plate = false,
}: {
  image: ProjectImage;
  className?: string;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
  /** Plate mode: fill the grid cell (h-full w-full), no border. */
  plate?: boolean;
}) {
  const contain = image.fit === 'contain';
  const frame = plate
    ? `block h-full w-full ${contain ? 'bg-paperVellum object-contain' : 'object-cover'}`
    : `w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`;

  const buttonCls = `group relative block cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack ${
    plate ? 'h-full w-full' : 'w-full'
  }`;

  // A video tile stays out of the shared-element morph: framer-motion cannot morph a <video>
  // into an <img> without a visible swap. It still opens the lightbox, on its poster.
  if (image.video) {
    const el = (
      <ProjectVideoEl image={image} className={className} contain={contain} reduced={reduced} plate={plate} />
    );
    if (!onOpen) return el;
    return (
      <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={buttonCls}>
        {el}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
        />
      </button>
    );
  }

  // The layoutId is set ONLY on the interactive copy. The mobile stack is still mounted (it is
  // merely `lg:hidden`), so tagging both trees would put the SAME layoutId in the DOM twice,
  // framer-motion would pair the visible desktop image with the hidden mobile one, and the
  // detail panel would silently render blank. It did. Do not tag the non-interactive copy.
  const img = onOpen ? (
    <motion.img layoutId={`shot-${image.src}`} src={image.src} alt={image.alt} loading="lazy" className={frame} />
  ) : (
    <img src={image.src} alt={image.alt} loading="lazy" className={frame} />
  );

  if (!onOpen) return img;

  return (
    <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={buttonCls}>
      {img}
      {/* The affordance stays invisible until you're on the image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
      />
    </button>
  );
}

/* ------------------------------- plate frame ------------------------------ */

/** Measure a box with a ResizeObserver. The plate packs into whatever WxH the master-detail row
 *  hands it, and repacks when that changes (breakpoint, window resize), so the fill is always exact
 *  for the real frame rather than a guessed aspect. */
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

/** True when an element's content is taller than its box (it is being clipped). Used to show the
 *  description's fade ONLY under real overflow pressure, never over a description that fits. */
function useOverflow<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, overflowing };
}

/** A small play badge for a video plate cell. */
function PlayBadge() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-paperVellum/85"
    >
      <span className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-inkBlack/70" />
    </span>
  );
}

/** One cell of the plate: the media, a play badge if it's a video, and the Fig. corner tag whose
 *  number matches the "Nº 0N" beside the title so the description's references point at pictures. */
function PlateCell({
  image,
  index,
  onOpen,
  reduced,
  style,
}: {
  image: ProjectImage;
  index: number;
  onOpen: (image: ProjectImage) => void;
  reduced: boolean;
  style: CSSProperties;
}) {
  const contain = image.fit === 'contain';
  return (
    <div
      style={style}
      className={`absolute overflow-hidden ${contain ? 'bg-paperVellum' : 'bg-paperDeep/40'}`}
    >
      <ProjectImg image={image} onOpen={onOpen} reduced={reduced} plate />
      {image.video && <PlayBadge />}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 right-1.5 bg-paperVellum/85 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-inkBlack/55"
      >
        Fig. {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
}

/** An even gutter, px — the vellum mortar between bricks AND the inset border around the whole pack,
 *  so the ground shows through consistently on every side (Daniel: "background seeping through"). */
const GUTTER = 4;

/** The plate: a STACKED-BRICK masonry (Pinterest / CSS multi-column) that FILLS its frame edge to
 *  edge. The frame's WxH is set by the layout it sits in (the master-detail row), never by the images,
 *  so the detail panel needs no inner scroll. The packer (bricks.ts) flows the images into balanced
 *  columns and justifies each column to the frame height, top-aligned, so the bricks butt together
 *  corner to corner with only a thin vellum gutter — no dead band at the top, bottom, or sides. The
 *  small per-column scale is absorbed by object-fit (a cover shot crops a hair; a contain figure keeps
 *  its ratio and shows a thin vellum sliver). The container is paperVellum, so the gutters and any
 *  contain sliver read as the same mortar. */
function PlateFrame({
  project,
  onOpen,
  reduced,
}: {
  project: Project;
  onOpen: (image: ProjectImage) => void;
  reduced: boolean;
}) {
  const images = project.images;
  const { ref, size } = useMeasure<HTMLDivElement>();
  // Inset the pack by one gutter on every side, then pack into the interior, so the border mortar
  // matches the gutter mortar exactly.
  const innerW = size.w - GUTTER * 2;
  const innerH = size.h - GUTTER * 2;
  const bricks =
    innerW > 0 && innerH > 0
      ? packBricks(
          images.map((im) => ({ ratio: im.ratio })),
          innerW,
          innerH,
          { gap: GUTTER },
        )
      : [];

  return (
    <figure className="h-full min-h-0 w-full">
      <div
        ref={ref}
        className="relative h-full min-h-0 w-full overflow-hidden border border-inkBlack/10 bg-paperVellum"
      >
        {bricks.map((c, i) => (
          <PlateCell
            key={images[i].src}
            image={images[i]}
            index={i}
            onOpen={onOpen}
            reduced={reduced}
            style={{ left: c.x + GUTTER, top: c.y + GUTTER, width: c.w, height: c.h }}
          />
        ))}
      </div>
    </figure>
  );
}

/** The mobile stack: a hero plus a simple two-column grid of the rest, each at a 3:2 tile
 *  (plans/diagrams `contain` so nothing crops). No captions — captions live only in the lightbox. */
function MobileGallery({ project, reduced }: { project: Project; reduced: boolean }) {
  const [hero, ...rest] = project.images;
  return (
    <figure className="space-y-3">
      <ProjectImg image={hero} className="aspect-[3/2]" reduced={reduced} />
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.map((img) => (
            <ProjectImg key={img.src} image={img} className="aspect-[3/2]" reduced={reduced} />
          ))}
        </div>
      )}
    </figure>
  );
}

/* ------------------------------- lightbox --------------------------------- */

/** The large view of a video tile: the same loop, at the same slowed rate, big. */
function LightboxVideo({ image }: { image: ProjectImage }) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);
  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={image.src}
      aria-label={image.alt}
      onLoadedData={start}
      onCanPlay={start}
      onClick={(e) => e.stopPropagation()}
      className="relative max-h-[82vh] w-auto max-w-[min(1600px,94vw)] cursor-default border border-inkBlack/15 bg-white object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
    >
      {image.video?.webm && <source src={image.video.webm} type="video/webm" />}
      <source src={image.video?.mp4} type="video/mp4" />
    </video>
  );
}

/** A chevron button for stepping the lightbox with the mouse (arrow keys work too). */
function LightboxChevron({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-inkBlack/20 bg-paperVellum/70 font-serifDisplay text-[20px] leading-none text-inkBlack/55 transition-colors hover:bg-paperVellum/95 hover:text-inkBlack focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack ${
        side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'
      }`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );
}

/**
 * Lightbox — click any project image and it opens large.
 *
 * The motion is a SHARED ELEMENT: the tile you clicked carries `layoutId`, and the large image
 * claims the same one, so framer-motion morphs the actual thumbnail up to full size. Captions live
 * HERE and only here: a "Fig. 0N" mono prefix (matching the plate's corner tag), the real caption in
 * italic serif, a counter, and visible prev/next chevrons for the mouse.
 *
 * Close: Escape, the backdrop, or the button. Arrow keys / chevrons walk the project's other shots.
 */
function Lightbox({
  images,
  index,
  onClose,
  onStep,
  reduced,
}: {
  images: ProjectImage[];
  index: number | null;
  onClose: () => void;
  onStep: (delta: number) => void;
  reduced: boolean;
}) {
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while the viewer owns the screen.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, onStep]);

  const image = index === null ? null : images[index];
  const many = images.length > 1;

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          className="fixed inset-0 z-[60] flex cursor-zoom-out flex-col items-center justify-center p-4 md:p-10"
          onClick={onClose}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* The paper ground dims rather than blacks out — this is a study, not a cinema. */}
          <div aria-hidden className="absolute inset-0 bg-paperVellum/92 backdrop-blur-sm" />

          {many && <LightboxChevron side="left" onClick={() => onStep(-1)} />}
          {many && <LightboxChevron side="right" onClick={() => onStep(1)} />}

          {image.video && !reduced ? (
            <LightboxVideo image={image} />
          ) : (
            <motion.img
              layoutId={reduced || image.video ? undefined : `shot-${image.src}`}
              src={image.src}
              alt={image.alt}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[82vh] w-auto max-w-[min(1600px,94vw)] cursor-default border border-inkBlack/15 bg-white object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
              transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* The caption is CENTRED under the image, with the counter and close beneath it. */}
          <motion.div
            className="relative mt-5 flex w-full max-w-[min(1600px,94vw)] flex-col items-center gap-2"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="max-w-[70ch] text-center font-serifDisplay text-[14px] italic leading-snug text-inkBlack/70">
              <span className="mr-2 font-mono text-[11px] not-italic tracking-[0.1em] text-inkBlack/45">
                Fig. {String(index! + 1).padStart(2, '0')}
              </span>
              {image.caption ?? image.alt}
            </p>
            <div className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
              {many && (
                <span className="tabular-nums">
                  {index! + 1} / {images.length}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="transition-colors hover:text-inkBlack focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A small down-arrow-into-tray glyph for the paper-download affordance. */
function DownloadGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v8m0 0 3-3m-3 3L5 7" />
      <path d="M2.5 12.5v1h11v-1" />
    </svg>
  );
}

/**
 * The detail text, three stages (project-frame proposal, section 6): Nº tag + title + folded
 * citation, then one description, then the payoff. There is NO "Awards and publications" heading:
 * when a project has a paper, its venue + authors fold into a mono line under the title, and the PDF
 * (if any) is a small inline link under the description.
 *
 * The layout guarantees the fit WITHOUT a dead gap. On a normal frame the description takes its
 * natural height and the payoff flows directly under it (`flex-initial` — the description does not
 * grow to fill slack, which is what used to push the payoff to the bottom and leave dead air). Under
 * real pressure (short viewport / very long copy) the description is the ONLY zone that shrinks
 * (`shrink`, `min-h-0`) and fades at its bottom edge, so the payoff — the one line Daniel's brand
 * voice depends on — is never the thing that clips. The character budgets in projects.test.ts are the
 * hard floor underneath this.
 */
function ProjectText({ project }: { project: Project }) {
  const paper = project.paper;
  const citation = paper ? `${paper.venue} · ${paper.authors}` : null;
  const { ref: descRef, overflowing } = useOverflow<HTMLDivElement>([project.n]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Stage 1 — Nº tag + meta, title, folded citation. */}
      <div className="shrink-0">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[12px] tracking-[0.06em] tabular-nums text-inkBlack/45">
            N&ordm; {project.n}
          </span>
          <Meta project={project} className="shrink-0" />
        </div>
        <h3 className="mt-1.5 font-serifDisplay text-[22px] leading-tight text-inkBlack">{project.title}</h3>
        {citation && (
          <p className="mt-1.5 font-mono text-[10.5px] leading-relaxed tracking-[0.08em] text-inkBlack/45">
            {citation}
          </p>
        )}
      </div>

      {/* Stage 2 — the one description sentence. `flex-initial` (grow 0, shrink 1) so it hugs its
          content on a normal frame — no dead gap under it — but is the one zone that gives way under
          pressure, fading at its bottom edge (reads as "there is more") only when it actually clips. */}
      <div ref={descRef} className="relative mt-3 min-h-0 flex-initial overflow-hidden">
        <p className="font-serifDisplay text-[15px] leading-snug text-inkBlack/70 [@media(max-height:820px)]:text-[14px]">
          {project.description}
        </p>
        {paper?.pdf && (
          <a
            href={paper.pdf}
            download
            className="group mt-3 inline-flex items-center gap-2 border border-inkBlack/25 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
          >
            <DownloadGlyph />
            Read the paper
            <span className="text-inkBlack/40 group-hover:text-accentOlive/70">{paper.pdfSize}</span>
          </a>
        )}
        {overflowing && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paperVellum to-transparent"
          />
        )}
      </div>

      {/* Stage 3 — the payoff. It flows directly under the description on a normal frame, and is
          `shrink-0` so under pressure the description gives way first and this line is never clipped. */}
      <div className="mt-4 shrink-0 border-t border-inkBlack/15 pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">What we learned</p>
        <p className="mt-2 font-serifDisplay text-[clamp(1.15rem,1.5vw,1.5rem)] leading-snug text-inkBlack">
          {project.learned}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- LIST view -------------------------------- */

function ListView({ reduced }: { reduced: boolean }) {
  // REVERSE CHRONOLOGICAL: the most recent work leads. `n` encodes that order (01 = newest),
  // so sorting by it and sorting by year agree — the number the reader sees is the position.
  const items = [...PROJECTS].sort((a, b) => a.n.localeCompare(b.n));
  const [active, setActive] = useState(0);
  const project = items[active];

  // The lightbox works on the ACTIVE project's image set, so the arrow keys walk that
  // project's shots and nothing else.
  const [shot, setShot] = useState<number | null>(null);
  const closeShot = useCallback(() => setShot(null), []);
  const stepShot = useCallback(
    (delta: number) =>
      setShot((i) => (i === null ? i : (i + delta + project.images.length) % project.images.length)),
    [project.images.length],
  );
  const openShot = useCallback(
    (image: ProjectImage) => setShot(project.images.findIndex((im) => im.src === image.src)),
    [project.images],
  );
  // Changing project while a shot is open would strand the index in the wrong set.
  useEffect(() => setShot(null), [project.n]);

  return (
    <div className="min-h-0 flex-1">
      {/* Desktop master-detail: the numbered SELECTION MENU hard left, the plate + text on the right.
          The grid ROW is pinned to the frame's own height (`grid-rows-[minmax(0,1fr)]` + `min-h-0` +
          `overflow-hidden`) so the tall project MENU can never push the row past the viewport and
          clip the plate — the whole selected project (plate + text) always fits one frame with no
          page scroll. When the menu is taller than that frame (short viewports, many projects) it
          scrolls on its own; the images and the description never do. */}
      <div className="hidden h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-x-16 overflow-hidden lg:grid lg:grid-cols-[minmax(300px,0.85fr)_2fr] xl:gap-x-24">
        <ol className="min-h-0 min-w-0 self-stretch overflow-y-auto">
          {items.map((p, i) => {
            const on = i === active;
            const tint = authorColor(p.by);
            return (
              <li key={p.n} className="border-t border-inkBlack/12 last:border-b">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}
                  aria-current={on}
                  className="group relative flex w-full items-baseline gap-3 py-3.5 pl-4 pr-1 text-left transition-colors duration-200"
                  style={on ? { backgroundColor: `${tint}14` } : undefined}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] origin-center transition-transform duration-200 ease-out motion-reduce:transition-none"
                    style={{ background: tint, transform: `scaleY(${on ? 1 : 0})` }}
                  />
                  <span
                    className={`font-serifDisplay text-[clamp(1.05rem,1.9vw,1.55rem)] leading-tight tracking-[-0.01em] text-inkBlack transition-transform duration-300 ease-out motion-reduce:transition-none ${
                      on && !reduced ? 'translate-x-1' : ''
                    }`}
                    style={on ? { color: tint } : undefined}
                  >
                    {p.title}
                  </span>
                  <span
                    className="ml-auto shrink-0 font-mono text-[11px] tracking-[0.14em] text-inkBlack/40 transition-colors"
                    style={on ? { color: tint } : undefined}
                  >
                    {p.year}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Detail: the active project's plate + text, cross-fading as the selection changes. On a
            wide display the words sit BESIDE the plate; below xl they stack (plate above, text below)
            and both are bounded by the row — no scroll either way. */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            {/* NO AnimatePresence here, and that is deliberate. `mode="wait"` deadlocks against the
                `layoutId` images inside this subtree: framer-motion holds the exiting panel open
                waiting on a shared-layout transition that never resolves, so the exit never
                completes and the detail FREEZES on whichever project rendered first while the list
                highlights another. Keying a plain motion.div remounts it and fades the new one in. */}
            <motion.div
              key={project.n}
              className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-x-10 gap-y-5 xl:grid-cols-[1.55fr_1fr] xl:grid-rows-1"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <PlateFrame project={project} onOpen={openShot} reduced={reduced} />
              <ProjectText project={project} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile: the same projects stacked, each with its images + text inline. */}
      <div className="space-y-16 lg:hidden">
        {items.map((p) => (
          <section key={p.n} aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}>
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="h-[3px] w-6 rounded-full" style={{ background: authorColor(p.by) }} />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/40">{p.year}</span>
            </div>
            <MobileGallery project={p} reduced={reduced} />
            <div className="mt-5">
              <ProjectText project={p} />
            </div>
          </section>
        ))}
      </div>

      <Lightbox images={project.images} index={shot} onClose={closeShot} onStep={stepShot} reduced={reduced} />
    </div>
  );
}

/* -------------------------------- founders -------------------------------- */

/** The framing roots: the finale's ink line, continued and made ORNATE. Where the line arrives at
 *  the top of the founders block it settles on a convergence node, then two roots sweep OUT and DOWN
 *  each side, wrapping gracefully around the OUTSIDE of a founder column (Clay left, Daniel right) and
 *  framing the two of them, with soft botanical curls and tendril loops, then meandering back inward
 *  at the bottom toward The Work. It is a 19th-century root-engraving register: ONE colour INK_BLUE,
 *  one line weight, drawn and alive.
 *
 *  Geometry: an absolutely-positioned layer behind the block. The viewBox is a 1000-wide field mapped
 *  onto the 1000px content column with `preserveAspectRatio="none"`, so x 0..1000 tracks the column
 *  and the roots wrap in the open OUTER margins of each half (never across a portrait, name, or fact).
 *  `vectorEffect="non-scaling-stroke"` keeps the line weight constant under the vertical fill-stretch,
 *  and `overflow-visible` lets the bottom sweeps trail past the block toward the work below.
 *
 *  Only the left root is authored; the right is its mirror (`scale(-1,1)`), so the frame stays
 *  symmetric. The wrapping form needs the desktop margins, so it is gated to `lg`; narrower screens
 *  get the simple descending stem below. */
const ROOT_LEFT = [
  // Main root: settle from the node, sweep left across the top, plunge down the far-left OUTSIDE the
  // Clay column (staying left of his fact leaders the whole descent, x < ~60), and only BELOW the
  // facts does it meander back inward toward the work below, never crossing a line of text.
  'M500 40 C 372 62, 244 50, 150 116 C 42 186, -10 300, 22 424 C 44 512, 16 606, 40 702 C 56 766, 44 814, 60 856 C 92 910, 190 950, 300 1014',
  // A soft curl looping off the far-left bend, out in the margin.
  'M22 424 C -36 398, -34 482, 30 470 C 66 463, 56 436, 26 446',
  // A small tendril hook in the runway below the facts, pointing toward the work.
  'M60 856 C 28 880, 42 928, 104 908',
];

function FounderRoots() {
  const rootStroke = {
    stroke: INK_BLUE,
    strokeWidth: 2.4,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
    >
      {/* the line arrives and settles on the convergence node */}
      <path d="M500 0 V40" stroke={INK_BLUE} strokeWidth={2.8} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <circle cx={500} cy={40} r={3.4} fill={INK_BLUE} />
      {ROOT_LEFT.map((d, i) => (
        <path key={`l${i}`} d={d} {...rootStroke} />
      ))}
      <g transform="translate(1000,0) scale(-1,1)">
        {ROOT_LEFT.map((d, i) => (
          <path key={`r${i}`} d={d} {...rootStroke} />
        ))}
      </g>
    </svg>
  );
}

/** Narrow-screen fallback: a single graceful root descending from the arriving line to a node, with
 *  two tight tendrils hugging the stem. It continues the line without the desktop wrap (no room to
 *  frame) and stays ENTIRELY in the space above the label, so it never crosses the "The two of us"
 *  text or the columns below. */
function FounderRootStem() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 60"
      className="pointer-events-none absolute left-1/2 top-0 block h-14 w-14 -translate-x-1/2 overflow-visible lg:hidden"
    >
      <path d="M30 0 C 30 22, 27 38, 30 52" stroke={INK_BLUE} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M30 36 C 22 42, 19 50, 25 56" stroke={INK_BLUE} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M30 36 C 38 42, 41 50, 35 56" stroke={INK_BLUE} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={30} cy={52} r={2.6} fill={INK_BLUE} />
    </svg>
  );
}

/** One founder, borne at the node: the portrait is the node where the fork lands, and the facts hang
 *  off a stem below it on fine leader lines — the botanical-plate register (a specimen hung off a
 *  stem, each part tagged), not a left-aligned bullet list. The stem/node/leader are the page's ink
 *  line, INK_BLUE, continued; they are structural, the drawing arriving at a person. */
function FounderNode({ person }: { person: TeamMember }) {
  return (
    <div className="flex flex-col items-center">
      <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full border-[1.5px] border-inkBlack/20 bg-paperDeep/50">
        {person.image ? (
          <img
            src={person.image}
            alt={`Portrait of ${person.name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <OculusMark size={44} className="h-auto w-11 text-inkBlack/20" />
        )}
      </div>
      <h3 className="mt-4 font-serifDisplay text-[19px] leading-tight text-inkBlack">{person.name}</h3>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accentOlive">{person.role}</p>

      <ul className="relative mt-7 w-full max-w-[360px] text-left">
        {/* the stem the facts hang from */}
        <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px" style={{ background: INK_BLUE, opacity: 0.4 }} />
        {person.facts.map((f) => (
          <li key={f.label} className="relative border-t border-inkBlack/10 py-3.5 pl-8 first:border-t-0">
            {/* the leader line out from the stem to the label — no terminal dot (Daniel's
                "no decorative blue marks" rule; the connector is structural and stays). */}
            <span
              aria-hidden
              className="absolute left-[3px] top-[1.4rem] h-px w-[22px] -translate-y-1/2"
              style={{ background: INK_BLUE, opacity: 0.4 }}
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-inkBlack/45">{f.label}</div>
            <p className="mt-1 font-serifDisplay text-[13.5px] leading-relaxed text-inkBlack/[0.78]">{f.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export function AboutPage() {
  const reduced = useReducedMotion();
  // The one-time narration intro plays over the page; while it does, the content is held at
  // opacity 0 (still in layout, so the intro can measure the header title to fly onto).
  const [intro, setIntro] = useState(decideAboutIntro);
  const [revealed, setRevealed] = useState(() => !intro);
  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => setIntro(false), []);

  // The hash router doesn't reset scroll between routes; start at the top so the header
  // reads first AND the intro measures the title's on-screen rect correctly.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <motion.main
        className="mx-auto w-full max-w-canvas px-gutter pb-24 pt-[calc(var(--header-h)+2rem)]"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: revealed ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* PORTION ONE — the title AND the sequence, together. The drawing starts immediately, in the
            same frame as the sentence it is the proof of, and the two questions surface in that same
            column as the camera reaches the years that earned them. */}
        <section aria-label="How we crossed paths">
          <CrossPathsTimeline
            title={
              <h1 data-about-title className={`${TITLE_CLASS} max-w-[16ch]`}>
                {TITLE}
              </h1>
            }
            questions={QUESTIONS}
          />
        </section>

        {/* Real air above the founders (Daniel, 2026-07-14: loosen back from the round-3 24svh
            tightening — the founders section now IS the line's continuation, so it can breathe).
            The seam to the finale's pin/hold/release is owned by CrossPathsTimeline. */}
        <div aria-hidden className={reduced ? 'h-24' : 'min-h-[42svh]'} />

        {/* The two of us. AFTER the sequence: by the time you meet them, you already know where they
            came from. The finale's stem forks here and the facts hang off each fork on leader lines. */}
        <section aria-label="The two of us">
          {/* The roots FRAME the two of them: an ink layer behind the label + portraits, wrapping down
              the open outer margins of each column. The content rides above it on its own z-layer. */}
          <div className="relative mx-auto max-w-[1000px] px-4">
            <FounderRoots />
            <FounderRootStem />
            {/* pt drops the label clear of the top arcs; pb gives the roots a runway BELOW the facts
                to meander inward toward The Work. */}
            <div className="relative z-10 pt-16 pb-28">
              <p className="text-center font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
                The two of us
              </p>

              <div className="mt-10 grid gap-x-16 gap-y-14 sm:grid-cols-2">
                {TEAM.map((person) => (
                  <FounderNode key={person.name} person={person} />
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-[640px] text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">{TEAM_CODA.kicker}</p>
            <p className="mt-2 font-serifDisplay text-[15px] leading-relaxed text-inkBlack/70">{TEAM_CODA.line}</p>
          </div>

          <div className="mx-auto mt-10 max-w-[640px] border-t border-inkBlack/12 pt-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">{TEAM_CODA.payoffLabel}</p>
            <p className="mt-2 font-serifDisplay text-[clamp(1.05rem,1.4vw,1.35rem)] text-inkBlack">
              {TEAM_CODA.payoff}
            </p>
          </div>
        </section>

        {/* PORTION TWO — the work, most recent first. Real air here too (Daniel: more spacing from the
            founders' bottom). Sized to ONE page: the section owns a viewport's height, the header
            takes what it needs, and the master-detail plate fills the rest. */}
        <div aria-hidden className={reduced ? 'h-24' : 'min-h-[42svh]'} />

        <section
          aria-label="Projects"
          className="flex h-[calc(100svh-var(--header-h)-1.5rem)] min-h-[560px] flex-col border-t border-inkBlack/12 pt-6"
        >
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">The Work</h2>
            <span className="font-serifDisplay text-[15px] italic text-inkBlack/50">most recent first</span>
          </div>
          <ListView reduced={reduced} />
        </section>
      </motion.main>

      {intro && (
        <AboutIntro title={TITLE} titleClassName={TITLE_CLASS} onReveal={onReveal} onDone={onDone} />
      )}
    </div>
  );
}
