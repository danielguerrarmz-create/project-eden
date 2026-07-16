/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * Order: the header (title + the two questions) drawn AS the cross-paths timeline, then the
 * co-founders (Clay + Daniel) borne at the node where the finale's ink line forks, then the projects.
 *
 * The projects use a master-detail LIST: a slim numbered SELECTION MENU on the left, and on the
 * right the selected project's IMAGES — a large HERO (image or video) that reads clearly, then the
 * remaining images in a clean supporting grid below — plus its description and the "What we learned"
 * takeaway beside them. There is no fixed cramped frame and no inner masonry: the detail panel scrolls
 * if a project runs long, so every picture is legible. The hero is the first image by default and is
 * hand-selectable per project (see `hero` in about/projects.ts). On mobile the projects stack, each
 * with its images and text inline. Captions live only in the lightbox.
 *
 * Images are REAL, imported from Daniel's portfolio (see about/projects.ts).
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { CrossPathsTimeline, INK_SEPIA, INK_SEPIA_TEXT } from './about/CrossPathsTimeline';
import { FanPainting } from './about/FanPainting';
import { FOUNDER_SPECIMENS, PAINTINGS, groupProjects } from './about/paintings';

/** ONE colour, page-wide. There is no longer a Clay-blue / Daniel-green split: the authorship
 *  is already stated in words by the meta line, so saying it a second time in colour only
 *  fragmented the page. Sepia is the practice's colour and everything selected takes it.
 *
 *  Two entry points, one colour: STRUCTURE (tint bars, row grounds, stems, leaders) takes
 *  `authorColor`, and GLYPHS take `authorTextColor` — the selected row lays an 8% sepia tint
 *  under its own sepia text, and INK_SEPIA does not clear AA on that ground. See the constants. */
function authorColor(_by: Project['by']): string {
  return INK_SEPIA;
}

function authorTextColor(_by: Project['by']): string {
  return INK_SEPIA_TEXT;
}

/** The page title, shared verbatim between the header and the intro's flying title so they
 *  land coincident — and it IS the narration's payoff line. */
const TITLE = "We've been chasing it for five years.";
const TITLE_CLASS =
  'font-serifDisplay text-[clamp(1.6rem,4.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.01em] text-inkBlack';

/** The two questions the whole practice chases, presented apart and large.
 *  (Exported: the scroll About draft at #/about/scroll sets the same two questions,
 *  and sharing the const keeps the copy from drifting between the two pages.) */
export const QUESTIONS = [
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
      style={{ color: authorTextColor(project.by) }}
    >
      {AUTHOR_LABEL[project.by]} · {project.year}
    </span>
  );
}

/* ------------------------------- media tiles ------------------------------ */

/** Split a project's images into the hero and the rest. The hero is the image flagged `hero`, or the
 *  first image when none is flagged (the default). The rest keep their authored order. */
function heroSplit(images: ProjectImage[]): { hero: ProjectImage; rest: ProjectImage[] } {
  const idx = images.findIndex((im) => im.hero);
  const heroIdx = idx >= 0 ? idx : 0;
  return { hero: images[heroIdx], rest: images.filter((_, i) => i !== heroIdx) };
}

/** One framed image on the paper ground. Renders crop to a clean tile with object-cover; paper
 *  figures set fit:'contain' so nothing is cut, on a white ground.
 *
 *  Every interactive copy is a BUTTON: click it and it opens full-bleed in the Lightbox. The image
 *  carries a `layoutId` so framer-motion morphs the tile itself up to the large view (a shared-element
 *  transition) rather than cross-fading a second copy of it. */
function ProjectVideoEl({
  image,
  className,
  contain,
  reduced,
  fill = false,
}: {
  image: ProjectImage;
  className: string;
  contain: boolean;
  reduced: boolean;
  /** Fixed-region mode: fill the parent tile edge-to-edge (h-full w-full) with object-fit, instead of
   *  taking a width and its own aspect. Used by the fixed two-region gallery. */
  fill?: boolean;
}) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);

  const frame = fill
    ? `block h-full w-full ${contain ? 'bg-paperVellum object-contain' : 'bg-paperDeep/40 object-cover'} ${className}`
    : `w-full ${contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'} ${className}`;

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

/** The "image to come" plate for a `pending` asset: an inert dashed frame, never interactive and never
 *  in the lightbox set. `fill` makes it fill a fixed tile; otherwise it takes `className` for its size. */
function PendingPlate({ fill, className = '' }: { fill: boolean; className?: string }) {
  const base = fill ? 'h-full w-full' : `w-full ${className}`;
  return (
    <div
      aria-hidden
      className={`grid place-items-center border border-dashed border-inkBlack/25 bg-paperDeep/25 ${base}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
        Image to come
      </span>
    </div>
  );
}

function ProjectImg({
  image,
  className = '',
  onOpen,
  reduced = false,
  fill = false,
}: {
  image: ProjectImage;
  className?: string;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
  /** Fixed-region mode: fill the parent tile edge-to-edge (h-full w-full) with object-fit, instead of
   *  taking a width and its own aspect. Used by the fixed two-region gallery. */
  fill?: boolean;
}) {
  // A pending image has no asset yet: render the inert placeholder plate, never a button.
  if (image.pending) return <PendingPlate fill={fill} className={className} />;

  const contain = image.fit === 'contain';
  const frame = fill
    ? `block h-full w-full ${contain ? 'bg-paperVellum object-contain' : 'bg-paperDeep/40 object-cover'} ${className}`
    : `w-full ${contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'} ${className}`;
  const btnClass = `group relative block ${fill ? 'h-full w-full' : 'w-full'} cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack`;

  // A video tile stays out of the shared-element morph: framer-motion cannot morph a <video>
  // into an <img> without a visible swap. It still opens the lightbox, on its poster.
  if (image.video) {
    const el = <ProjectVideoEl image={image} className={className} contain={contain} reduced={reduced} fill={fill} />;
    if (!onOpen) return el;
    return (
      <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={btnClass}>
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
    <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={btnClass}>
      {img}
      {/* The affordance stays invisible until you're on the image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
      />
    </button>
  );
}

/**
 * The curated gallery (Comment 4 + the fill fix, 2026-07-15): the media area is the hero on top and a
 * supporting row beneath, filling the panel with NO dead space.
 *
 * The supporting row is a JUSTIFIED ROW, not an equal grid: each cell's width is proportional to its
 * image's aspect ratio (`flexGrow: ratio`, `flexBasis: 0`) and the row's height is set by the SUM of
 * those ratios (`aspectRatio: sumRatio` over the full width). That makes every cell's shape match its
 * image's shape, so BOTH `object-cover` (photos) and `object-contain` (diagrams that must not crop)
 * fill their cell edge-to-edge — the old equal grid forced a contain image into a tall narrow cell and
 * left a white band above/below it (the Plentify bug). The row height is capped so the hero always keeps
 * the larger share. The hero fills the remaining height (`flex-1`) with its own object-fit.
 *
 * `variant='stacked'` (mobile) reads the hero at 3:2, then the rest as a justified row below.
 */
function Gallery({
  project,
  onOpen,
  reduced = false,
  variant = 'fixed',
}: {
  project: Project;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
  variant?: 'fixed' | 'stacked';
}) {
  const { hero, rest } = heroSplit(project.images);
  // Sum of the supporting ratios sets the justified row's height: rowHeight = width / sumRatio, so each
  // cell (width = ratio · rowHeight) has aspect === its image ratio and the images fill exactly.
  const sumRatio = rest.reduce((s, im) => s + im.ratio, 0);

  const supportingRow = rest.length > 0 && (
    <div
      className="flex w-full shrink-0 gap-2 lg:max-h-[46%]"
      style={{ aspectRatio: sumRatio > 0 ? sumRatio : undefined }}
    >
      {rest.map((img) => (
        <div key={img.src} className="relative min-h-0" style={{ flexGrow: img.ratio, flexBasis: 0 }}>
          <ProjectImg image={img} onOpen={onOpen} reduced={reduced} fill />
        </div>
      ))}
    </div>
  );

  if (variant === 'stacked') {
    return (
      <figure className="space-y-3">
        <ProjectImg image={hero} className="aspect-[3/2]" onOpen={onOpen} reduced={reduced} />
        {supportingRow}
      </figure>
    );
  }

  // Desktop: FIXED. Hero fills the remaining height above the justified supporting row.
  return (
    <figure className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative min-h-0 flex-1">
        <ProjectImg image={hero} onOpen={onOpen} reduced={reduced} fill />
      </div>
      {supportingRow}
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
 * claims the same one, so framer-motion morphs the actual thumbnail up to full size. The caption
 * lives HERE and only here: the real caption in serif, a counter, and visible prev/next chevrons
 * for the mouse. There is no "Fig." prefix — Daniel: no figure text on the photos.
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
            <p className="max-w-[70ch] text-center font-serifDisplay text-[14px] leading-snug text-inkBlack/70">
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
      width="13"
      height="13"
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
 * The detail panel text (Comment 4, 2026-07-15). Hierarchy is established by type size / weight /
 * colour / spacing — NOT by horizontal divider lines (the old `border-t` rules are gone). Order, top to
 * bottom: (1) title + the byline credit, (2) a 2–3 sentence description with a clear outcome, (3) awards
 * and publications, (4) collaborators / professors, (5) at the very bottom, the "What we learned" lesson
 * rendered as a filled/bordered PILL. Stages 3 and 4 are omitted when a project has no data for them, so
 * no empty label ever shows.
 *
 * `fixed` pins the pill to the bottom of a full-height column (desktop, side-by-side with the media);
 * mobile leaves it in normal flow just below the text.
 */
function ProjectText({ project, fixed = false }: { project: Project; fixed?: boolean }) {
  const paper = project.paper;
  const awards = project.awards;
  const hasRecognition = (awards && awards.length > 0) || !!paper;
  return (
    <div
      className={
        fixed
          ? 'flex h-full min-h-0 flex-col overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : ''
      }
    >
      {/* 1. Title + byline credit. */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serifDisplay text-[22px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="shrink-0" />
      </div>
      {/* 2. Description with its outcome. */}
      <p className="mt-3 font-serifDisplay text-[15px] leading-snug text-inkBlack/75">
        {project.description}
      </p>
      {/* 3. Awards and publications. No rule above it — the mono label + spacing carry the shift. Olive
          stays reserved for the one lesson pill below, so it isn't diluted by a second use here. */}
      {hasRecognition && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
            Awards and publications
          </p>
          {awards && awards.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {awards.map((award) => (
                <li key={award} className="font-serifDisplay text-[14px] leading-snug text-inkBlack/75">
                  {award}
                </li>
              ))}
            </ul>
          )}
          {paper && (
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/55">
              {paper.venue} · {paper.authors}
            </p>
          )}
          {paper?.pdf && (
            <a
              href={paper.pdf}
              download
              className="group mt-3 inline-flex items-center gap-2.5 border border-inkBlack/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
            >
              <DownloadGlyph />
              Read the paper
              <span className="text-inkBlack/40 group-hover:text-accentOlive/70">{paper.pdfSize}</span>
            </a>
          )}
        </div>
      )}
      {/* 4. Collaborators / professors — the people beyond the founders, when there are named ones. */}
      {project.collaborators && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Collaborators</p>
          <p className="mt-1.5 font-serifDisplay text-[14px] leading-snug text-inkBlack/75">
            {project.collaborators}
          </p>
        </div>
      )}
      {/* 5. The lesson, as a filled/bordered pill at the very bottom (mt-auto pins it there in the
          fixed column). No divider rule — the chip itself sets it apart. */}
      <div className={fixed ? 'mt-auto pt-6' : 'mt-6'}>
        <div className="inline-flex max-w-full flex-col gap-1 rounded-2xl border border-accentOlive/35 bg-accentOlive/[0.07] px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accentOlive">
            What we learned
          </span>
          <span className="font-serifDisplay text-[clamp(1.05rem,1.35vw,1.35rem)] leading-snug text-inkBlack">
            {project.learned}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- LIST view -------------------------------- */

function ListView({ reduced }: { reduced: boolean }) {
  // REVERSE CHRONOLOGICAL: the most recent work leads. `n` encodes that order (01 = newest),
  // so sorting by it and sorting by year agree — the number the reader sees is the position.
  const items = [...PROJECTS].sort((a, b) => a.n.localeCompare(b.n));
  // The menu is GROUPED BY DISCIPLINE (Architecture, Product Design, Software); reverse-chronological
  // within each group, and only non-empty groups render. `groupProjects` is the shared, tested
  // grouping (paintings.ts) — this used to re-implement it inline, and the two could drift.
  const groups = groupProjects(items).filter((g) => g.projects.length > 0);
  // Active selection is tracked by project `n` — stable across the grouped layout — defaulting to the
  // first project of the first group (top of the menu). The right-hand detail follows it exactly as before.
  const [activeN, setActiveN] = useState(() => groups[0]?.projects[0]?.n ?? items[0].n);
  const project = items.find((p) => p.n === activeN) ?? items[0];

  // The lightbox works on the ACTIVE project's REAL image set — pending placeholders have no asset, so
  // they are excluded here and never enter the arrow-key walk.
  const lightboxImages = project.images.filter((im) => !im.pending);
  const [shot, setShot] = useState<number | null>(null);
  const closeShot = useCallback(() => setShot(null), []);
  const stepShot = useCallback(
    (delta: number) =>
      setShot((i) =>
        i === null || lightboxImages.length === 0
          ? i
          : (i + delta + lightboxImages.length) % lightboxImages.length,
      ),
    [lightboxImages.length],
  );
  const openShot = useCallback(
    (image: ProjectImage) => setShot(lightboxImages.findIndex((im) => im.src === image.src)),
    [lightboxImages],
  );
  // Changing project while a shot is open would strand the index in the wrong set.
  useEffect(() => setShot(null), [project.n]);

  return (
    <div className="min-h-0 flex-1">
      {/* Desktop master-detail: the numbered SELECTION MENU hard left, the media + project info on the
          right, side-by-side from lg up. The detail is FIXED to the frame height — the media area splits
          into a top-half hero and a bottom-half grid, and nothing scrolls. */}
      <div className="hidden h-full min-h-0 gap-x-16 gap-y-8 lg:grid lg:grid-cols-[minmax(300px,0.85fr)_2fr] xl:gap-x-24">
        {/* The project menu, GROUPED BY DISCIPLINE: a small mono heading, then that group's projects.
            The item font and vertical padding are tightened so all twelve projects AND the three
            headings fit at once at normal desktop heights — no inner scroll. `overflow-y-auto` is only a
            last-resort safety for unusually short viewports. Hover/focus selects; the tint bar rides the
            active row's left edge. */}
        <nav className="min-h-0 min-w-0 self-stretch overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <div key={group.discipline} className="mb-3 last:mb-0">
              {/* The discipline FRONTISPIECE: a small painted chapter-break mark beside the
                  heading — one of Clay's three commissioned specimens, in full pigment.
                  Deliberately NO BowerMark over it: matRect (quality.ts) base-anchors every
                  plant so its densest region sits on the mat's bottom row, and the retired
                  drafts then placed the mark at bottom-[5%] of the same frame — they collide
                  by construction, for every seed. A frontispiece stands alone. */}
              <div className="flex items-center gap-3 px-4 pb-1.5 pt-2">
                {/* 44px, not 28: below ~40 the aged-paper mount swallows the plant and the
                    frontispiece reads as a beige swatch rather than a painting. */}
                <FanPainting commission={PAINTINGS[group.discipline]} size={44} caption={false} />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                  {group.discipline}
                </p>
              </div>
              <ol>
                {group.projects.map((p) => {
                  const on = p.n === activeN;
                  // `tint` is the STRUCTURE colour (the bar + the row's ground); `ink` is the same
                  // colour at reading weight for the glyphs that sit ON that tinted ground.
                  const tint = authorColor(p.by);
                  const ink = authorTextColor(p.by);
                  return (
                    <li key={p.n} className="border-t border-inkBlack/10 last:border-b">
                      <button
                        type="button"
                        onMouseEnter={() => setActiveN(p.n)}
                        onFocus={() => setActiveN(p.n)}
                        onClick={() => setActiveN(p.n)}
                        aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}
                        aria-current={on}
                        className="group relative flex w-full items-baseline gap-3 py-1.5 pl-4 pr-1 text-left transition-colors duration-200"
                        style={on ? { backgroundColor: `${tint}14` } : undefined}
                      >
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[3px] origin-center transition-transform duration-200 ease-out motion-reduce:transition-none"
                          style={{ background: tint, transform: `scaleY(${on ? 1 : 0})` }}
                        />
                        <span
                          className={`font-serifDisplay text-[clamp(0.9rem,1.25vw,1.1rem)] leading-tight tracking-[-0.01em] text-inkBlack transition-transform duration-300 ease-out motion-reduce:transition-none ${
                            on && !reduced ? 'translate-x-1' : ''
                          }`}
                          style={on ? { color: ink } : undefined}
                        >
                          {p.title}
                        </span>
                        <span
                          className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.14em] text-inkBlack/40 transition-colors"
                          style={on ? { color: ink } : undefined}
                        >
                          {p.year}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>

        {/* Detail: the active project's media BESIDE its text, cross-fading as the selection changes.
            FIXED height, no inner scroll: the media fills its column (hero top half, rest bottom half)
            and the text column pins its lesson pill to the bottom. */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {/* NO AnimatePresence here, and that is deliberate. `mode="wait"` deadlocks against the
                `layoutId` images inside this subtree: framer-motion holds the exiting panel open
                waiting on a shared-layout transition that never resolves, so the exit never
                completes, the incoming panel never mounts, and the detail FREEZES on whichever
                project rendered first while the list happily highlights another. (That is the bug
                this page shipped with once.) Keying a plain motion.div remounts it on every change
                and fades the new one in — same read, no exit to get stuck on. */}
            <motion.div
              key={project.n}
              className="grid h-full min-h-0 grid-cols-[1.55fr_1fr] gap-x-8 xl:gap-x-10"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <Gallery project={project} onOpen={openShot} variant="fixed" reduced={reduced} />
              <ProjectText project={project} fixed />
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
            <Gallery project={p} variant="stacked" reduced={reduced} />
            <div className="mt-5">
              <ProjectText project={p} />
            </div>
          </section>
        ))}
      </div>

      <Lightbox images={lightboxImages} index={shot} onClose={closeShot} onStep={stepShot} reduced={reduced} />
    </div>
  );
}

/* -------------------------------- founders -------------------------------- */

/*
 * THE LEADER LINES ARE GONE (2026-07-16, round 2). `FounderRoots` / `FounderRootStem` /
 * `FoundersFlow` / `FoundersFlowStem` drew hand-authored bezier "roots" wrapping the founder
 * columns and a plumb line running on down to the work. Daniel, on the sketch they came from:
 * "When I had initially sketched out those lines to go around us, I just wanted you to create a
 * level of flower ornamentation around the text... Right now it is extremely choppy because it is
 * just random lines on top of it." The lines were a PLACEHOLDER for flowers, and they were read as
 * a literal spec. `FounderBower` below is what they were standing in for.
 *
 * Recover them from git if ever needed: `git show fa87d33 -- src/pages/AboutPage.tsx`.
 */

/** The seam connector: a single vertical INK_SEPIA line at the PAGE centre that carries the finale's
 *  descending line across a spacer. The timeline's unravel exits its frame at the page centre and the
 *  founders' node sits at the page centre, so a plumb line here reads as the ONE line continuing over
 *  the paper gap between the two (separate) SVGs. `overflow-visible` lets its round cap kiss both ends.
 *  It is heavier than the founder roots (it is still the spine, not yet the fine root register); the
 *  weight settles down at the node below. */
function SeamBridge() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <line x1="50" y1="-1" x2="50" y2="101" stroke={INK_SEPIA} strokeWidth={4.4} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

/** The founders' small-caps voice, lifted verbatim from the retired ascent draft. */
const MONO_SMALL = 'font-mono text-[12px] uppercase tracking-[0.08em]';

/**
 * One founder, as a three-band specimen sheet: PORTRAIT · FACTS · SPECIMEN, read across.
 *
 * This IS the retired ascent draft's `Founders()` (`git show
 * about-v2-nonflowers:src/pages/ascent/AscentPage.tsx`), ported wholesale on Daniel's ruling —
 * "I much preferred Clay's founder page... the entirety of it is a lot better than my current
 * ones." Kept exactly: the 5/7/5 measure, the bordered 4:5 portrait with its caption UNDER it
 * (name over role, both mono), the facts as a real `<dl>` on a 52ch measure at 17px, and the
 * specimen hung large at the outer edge. What the old node did — a 112px circular crop, the role
 * in olive, the facts squeezed into a 13.5px list on leader lines — is all gone.
 *
 * TWO DELIBERATE DEPARTURES from the source, both required by where it now lives:
 *  1. Clay's draft was INK_BLUE and forced `voice: 'ink'` on the specimen, because his page
 *     rationed pigment to two events. This page's law is the opposite (CLAUDE.md): structure is
 *     INK_SEPIA and the botanical specimens are the one place FULL PIGMENT is allowed. Daniel on
 *     round 1: "the colors are amazing". So the commission hangs unmodified, in pigment.
 *  2. The specimen is keyed on `person.id`, NOT `member.name.startsWith('Clay')` as the draft did
 *     — that grows the wrong plant the day someone rewords a name. See FOUNDER_SPECIMENS.
 *
 * The draft's `flex-col-reverse` wrappers are also dropped: they existed only to invert DOM order
 * for the ascent's column-reverse scroller. This page reads downward, so reading order already IS
 * visual order, and the source's intended sequence (kicker, then Clay, then Daniel) survives.
 */
function FounderNode({ person }: { person: TeamMember }) {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)] md:items-start">
      <figure>
        {person.image ? (
          <img
            src={person.image}
            alt={`Portrait of ${person.name}`}
            loading="lazy"
            className="aspect-[4/5] w-full border border-inkBlack/12 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-inkBlack/20">
            <OculusMark size={44} className="h-auto w-11 text-inkBlack/20" />
          </div>
        )}
        <figcaption className="mt-3">
          <span className={`${MONO_SMALL} block text-inkBlack`}>{person.name}</span>
          <span className={`${MONO_SMALL} block text-inkBlack/60`}>{person.role}</span>
        </figcaption>
      </figure>

      <dl className="space-y-6">
        {person.facts.map((fact) => (
          <div key={fact.label}>
            <dt className={`${MONO_SMALL} text-inkBlack/60`}>{fact.label}</dt>
            <dd className="mt-1.5 max-w-[52ch] text-[17px] leading-relaxed opacity-90">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* The specimen, signed with the seed it grew from — the provenance is the point: type the
          printed seed into #/lab/gongbi and this exact plant grows back. */}
      <FanPainting commission={FOUNDER_SPECIMENS[person.id]} size={340} className="md:justify-self-end" />
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

        {/* THE SEAM (Task 4). The finale's unravel exits the timeline frame heading straight down at
            the PAGE centre; this spacer carries that one line over the paper gap to the founders' node
            just below (both sit on the page centre, so the plumb bridge reads as the same line
            continuing). Kept short so the hand-off stays continuous. */}
        <div aria-hidden className={reduced ? 'relative h-20' : 'relative min-h-[22svh]'}>
          <SeamBridge />
        </div>

        {/* The founders. AFTER the sequence: by the time you meet them, you already know where they
            came from. The composition is the retired ascent draft's, ported wholesale — see
            FounderNode. `max-w-page` is that draft's own measure (Frame measure="page"), which the
            5/7/5 band needs; the old block was clamped to 1000px for roots that no longer exist.

            NOTE on the header: the draft's <main> had NO pt-header — only its Summit() added one
            locally — so its founders slid under the fixed SplashHeader (position:fixed, top-0,
            z-50). Ported here the bug cannot recur: this page's <main> carries
            pt-[calc(var(--header-h)+2rem)] globally, and the founders sit mid-page besides. */}
        <section aria-label="The founders" className="mx-auto w-full max-w-page px-gutter">
          <p className={`${MONO_SMALL} text-inkBlack/60`}>The founders.</p>

          <div className="mt-12 flex flex-col gap-16">
            {TEAM.map((person) => (
              <FounderNode key={person.id} person={person} />
            ))}
          </div>

          <div className="mx-auto mt-24 max-w-[640px] text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">{TEAM_CODA.kicker}</p>
            <p className="mt-2 font-serifDisplay text-[15px] leading-relaxed text-inkBlack/70">{TEAM_CODA.line}</p>
          </div>

          <div className="mx-auto mt-10 max-w-[640px] border-t border-inkBlack/12 pt-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">{TEAM_CODA.payoffLabel}</p>
            <p className="mt-2 font-serifDisplay text-[clamp(1.05rem,1.4vw,1.35rem)] text-inkBlack">
              {TEAM_CODA.payoff}
            </p>
          </div>

          <div aria-hidden className={reduced ? 'h-16' : 'min-h-[20svh]'} />
        </section>

        {/* PORTION TWO — the work, most recent first. The founders → work line arrives at the page
            centre right here. The section owns a viewport's height, the header takes what it needs, and
            the master-detail fills the rest; the detail panel scrolls if a project runs long. */}
        <section
          aria-label="Projects"
          className="flex h-[calc(100svh-var(--header-h)-1.5rem)] min-h-[640px] flex-col border-t border-inkBlack/12 pt-6"
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
