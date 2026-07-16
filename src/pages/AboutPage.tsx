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
  DISCIPLINE_ORDER,
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
      style={{ color: authorColor(project.by) }}
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
  // within each group (items is already sorted by `n`), and only non-empty groups render.
  const groups = DISCIPLINE_ORDER.map((discipline) => ({
    discipline,
    projects: items.filter((p) => p.discipline === discipline),
  })).filter((g) => g.projects.length > 0);
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
              <p className="px-4 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                {group.discipline}
              </p>
              <ol>
                {group.projects.map((p) => {
                  const on = p.n === activeN;
                  const tint = authorColor(p.by);
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
                          style={on ? { color: tint } : undefined}
                        >
                          {p.title}
                        </span>
                        <span
                          className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.14em] text-inkBlack/40 transition-colors"
                          style={on ? { color: tint } : undefined}
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
  // facts does it meander back INWARD, rejoining its mirror at the page centre (x=500) in the runway
  // so the two framing roots close back into ONE line that flows on down to the work.
  'M500 40 C 372 62, 244 50, 150 116 C 42 186, -10 300, 22 424 C 44 512, 16 606, 40 702 C 56 766, 44 814, 60 856 C 92 916, 320 980, 500 1000',
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

/** The seam connector: a single vertical INK_BLUE line at the PAGE centre that carries the finale's
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
      <line x1="50" y1="-1" x2="50" y2="101" stroke={INK_BLUE} strokeWidth={4.4} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

/** Founders → The Work. After the two roots rejoin at the page centre below the portraits, the one
 *  line flows on DOWN past the founders' words and into the projects. It routes out through the open
 *  left margin (the words are a narrow centred column, so the line never crosses a glyph), carries a
 *  small botanical curl for life, and returns to the page centre as it arrives at The Work. Mapped
 *  with `preserveAspectRatio="none"` over the words+runway block, so x tracks the content column. */
function FoundersFlow() {
  const stroke = {
    stroke: INK_BLUE,
    strokeWidth: 2.6,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
    >
      {/* hold centre to meet the rejoined roots, then out to the left margin, down past the words,
          and back to centre as it arrives at the work below */}
      <path d="M50 -2 C 49 6, 30 11, 17 30 C 12 47, 14 65, 22 82 C 30 94, 45 98, 50 102" {...stroke} />
      {/* a soft curl off the descent, out in the margin */}
      <path d="M17 30 C 6 27, 7 41, 20 39 C 27 38, 24 30, 15 33" {...stroke} />
    </svg>
  );
}

/** Narrow-screen fallback for the founders → work run: a simple plumb line at centre (no room to
 *  route around the words), so the continuity still reads on mobile. */
function FoundersFlowStem() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 block h-full w-full overflow-visible lg:hidden"
    >
      <line x1="50" y1="-1" x2="50" y2="101" stroke={INK_BLUE} strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
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

        {/* THE SEAM (Task 4). The finale's unravel exits the timeline frame heading straight down at
            the PAGE centre; this spacer carries that one line over the paper gap to the founders' node
            just below (both sit on the page centre, so the plumb bridge reads as the same line
            continuing). Kept short so the hand-off stays continuous. */}
        <div aria-hidden className={reduced ? 'relative h-20' : 'relative min-h-[22svh]'}>
          <SeamBridge />
        </div>

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

          {/* The two roots rejoin at the page centre below the portraits; from there the ONE line
              flows on down past the founders' words and into The Work, routed through the open margin
              so it never crosses the centred text. The words ride above it on their own z-layer. */}
          <div className="relative">
            <FoundersFlow />
            <FoundersFlowStem />
            <div className="relative z-10">
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
            </div>
            {/* the line's runway down into the work (this replaces the old separate spacer). */}
            <div aria-hidden className={reduced ? 'h-16' : 'min-h-[26svh]'} />
          </div>
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
