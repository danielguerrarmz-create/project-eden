/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * Order: the header (title + the two questions) drawn AS the cross-paths timeline, then the
 * co-founders (Clay + Daniel), then the projects.
 *
 * The projects use a master-detail LIST: a SELECTION MENU on the left — one FLAT reverse-
 * chronological list — and on the right the selected project, laid out in ROWS (2026-07-16, round 2;
 * Daniel: "What if we switch them to rows instead where the main images of the projects show up at
 * the top... and have the project information at the bottom"):
 *
 *   row 1  the PICTURES: a large landscape HERO (image or video) with the supporting images standing
 *          beside it as a vertical filmstrip. See SupportingStrip for why the strip is vertical —
 *          it is not a style choice, it is what buys the hero its aspect ratio.
 *   row 2  the INFORMATION BAND, reading across under the picture: title · credit · description,
 *          then awards and collaborators, then the "What we learned" takeaway. See ProjectInfoBand
 *          for why the columns are split the way they are.
 *
 * The detail is height-locked to the viewport, which is what makes the master-detail an instrument
 * rather than a document: hovering the menu swaps the detail IN PLACE, and nothing below it moves.
 * That lock is also the whole constraint the two comments above are negotiating with.
 *
 * The hero is the first image by default and is hand-selectable per project (see `hero` in
 * about/projects.ts). On mobile the projects stack, each with its images and text inline. Captions
 * live only in the lightbox.
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
import { FOUNDER_SPECIMENS } from './about/paintings';
import { requestGarland } from '../engine/gongbi/painter';

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
 * The supporting images as a JUSTIFIED ROW (mobile): each cell's width is proportional to its image's
 * aspect ratio (`flexGrow: ratio`, `flexBasis: 0`) and the row's height comes from the SUM of those
 * ratios (`aspectRatio: sumRatio` across the full width). That makes every cell's shape match its
 * image's shape, so BOTH `object-cover` (photos) and `object-contain` (diagrams that must not crop)
 * fill their cell edge-to-edge — the old equal grid forced a contain image into a tall narrow cell and
 * left a white band above and below it (the Plentify bug). Free to take whatever height it needs,
 * because the mobile page scrolls.
 */
function SupportingRow({
  images,
  onOpen,
  reduced,
}: {
  images: ProjectImage[];
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
}) {
  if (images.length === 0) return null;
  const sumRatio = images.reduce((s, im) => s + im.ratio, 0);
  return (
    <div className="flex w-full shrink-0 gap-2" style={{ aspectRatio: sumRatio > 0 ? sumRatio : undefined }}>
      {images.map((img) => (
        <div key={img.src} className="relative min-h-0" style={{ flexGrow: img.ratio, flexBasis: 0 }}>
          <ProjectImg image={img} onOpen={onOpen} reduced={reduced} fill />
        </div>
      ))}
    </div>
  );
}

/** The desktop filmstrip's width. No project carries more than three supporting images (measured),
 *  so at this width the tallest strip is ~450px and always fits beside the hero. */
const STRIP_W = 132;

/**
 * The supporting images as a VERTICAL FILMSTRIP beside the hero (desktop).
 *
 * This is here to buy the hero its aspect ratio. The desktop detail is height-locked to the viewport
 * (~729px of panel), and every pixel a horizontal strip takes comes straight out of the hero's height
 * — with the strip under the hero, the hero measured 875x306..401, i.e. 2.2:1 to 2.9:1, against source
 * images that are natively 1.2:1 to 1.9:1. That is Daniel's own complaint (an image forced into a box
 * the wrong shape) arriving from the opposite side: it was portrait, and a naive row made it a slot.
 * Standing the strip on its end spends WIDTH, which this panel has, instead of HEIGHT, which it does
 * not: the hero becomes ~735x415..509 — 1.44:1 to 1.77:1 — which is the source images' own range.
 *
 * Each thumb takes the strip's full width at its own `aspectRatio`, so nothing is cropped. They may
 * shrink (and only then cover-crop) if a project ever carries enough supporting images to overrun the
 * column; `overflow-hidden` is the backstop.
 */
function SupportingStrip({
  images,
  onOpen,
  reduced,
}: {
  images: ProjectImage[];
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
}) {
  if (images.length === 0) return null;
  return (
    <div
      className="flex min-h-0 shrink-0 flex-col gap-2 overflow-hidden"
      style={{ width: STRIP_W }}
    >
      {images.map((img) => (
        <div key={img.src} className="relative min-h-0 w-full" style={{ aspectRatio: img.ratio }}>
          <ProjectImg image={img} onOpen={onOpen} reduced={reduced} fill />
        </div>
      ))}
    </div>
  );
}

/** Mobile: the hero at 3:2, then the rest as a justified row below. */
function Gallery({
  project,
  onOpen,
  reduced = false,
}: {
  project: Project;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
}) {
  const { hero, rest } = heroSplit(project.images);
  return (
    <figure className="space-y-3">
      <ProjectImg image={hero} className="aspect-[3/2]" onOpen={onOpen} reduced={reduced} />
      <SupportingRow images={rest} onOpen={onOpen} reduced={reduced} />
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

/** The awards / publications block, with the paper download. Omitted entirely when a project has
 *  neither, so no empty label ever shows. Olive stays reserved for the one lesson pill, so it isn't
 *  diluted by a second use here. */
function Recognition({ project, className = '' }: { project: Project; className?: string }) {
  const { paper, awards } = project;
  if (!(awards && awards.length > 0) && !paper) return null;
  return (
    <div className={className}>
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
  );
}

/** The lesson, as a filled/bordered pill. No divider rule — the chip itself sets it apart. */
function LessonPill({ project }: { project: Project }) {
  return (
    <div className="inline-flex max-w-full flex-col gap-1 rounded-2xl border border-accentOlive/35 bg-accentOlive/[0.07] px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accentOlive">
        What we learned
      </span>
      <span className="font-serifDisplay text-[clamp(1rem,1.2vw,1.2rem)] leading-snug text-inkBlack">
        {project.learned}
      </span>
    </div>
  );
}

/**
 * THE PROJECT INFORMATION BAND — the bottom row of the desktop detail (2026-07-16, round 2).
 *
 * Daniel: "What if we switch them to rows instead where the main images of the projects show up at
 * the top... and have the project information at the bottom". So the information reads ACROSS, under
 * the picture rather than beside it: (1) title · credit · description, (2) awards and publications ·
 * collaborators, (3) the lesson.
 *
 * THE COLUMN SPLIT IS A HEIGHT BUDGET, NOT A STYLE CHOICE, and it is counter-intuitive enough to be
 * worth stating: a grid row is as tall as its TALLEST column, and this band's height comes straight
 * out of the hero above it. So the split has to BALANCE the stacks, and there are two ways to get it
 * wrong, both of which shipped in this file today before this comment did:
 *   - Stacking description AND recognition in one column (3 cols) made that column 319px on Synthetic
 *     Vision and squeezed the hero to 254px at 875 wide — a 3.4:1 letterbox. The same "wrong aspect"
 *     complaint that this whole rework is fixing, arriving from the other direction.
 *   - Splitting them apart into FOUR columns made it WORSE, not better (465px on Robots as
 *     Instruments): narrower columns wrap more, so every column grows taller at once. More columns
 *     does not mean a shorter band.
 * What works is three columns with the description paired with the SHORT thing (the title) and the
 * recognition list paired with the other short thing (collaborators): two stacks of ~195 and ~180
 * instead of one of 319. The measure lands near 40ch, which is a real reading measure.
 *
 * The band is NOT capped and NOT scrollable. An earlier cut put `maxHeight` + `overflow-y-auto` here
 * to protect the hero's height, and it silently hid the bottom of seven projects' awards and
 * collaborators (up to 61px of it) behind a scrollbar nobody would find in a band this short. The
 * band takes the height it needs; the hero absorbs the difference down to its floor.
 */
function ProjectInfoBand({ project }: { project: Project }) {
  return (
    <div
      data-project-band
      className="grid shrink-0 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-7 border-t border-inkBlack/12 pt-4"
    >
      <div>
        <h3 className="font-serifDisplay text-[26px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="mt-1.5 block" />
        <p className="mt-3 font-serifDisplay text-[15px] leading-snug text-inkBlack/75">{project.description}</p>
      </div>
      <div>
        <Recognition project={project} />
        {project.collaborators && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Collaborators</p>
            <p className="mt-1.5 font-serifDisplay text-[13px] leading-snug text-inkBlack/75">
              {project.collaborators}
            </p>
          </div>
        )}
      </div>
      <div>
        <LessonPill project={project} />
      </div>
    </div>
  );
}

/**
 * The MOBILE project text: the same material in one column, in reading order — title + credit,
 * description, awards and publications, collaborators, then the lesson.
 */
function ProjectText({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serifDisplay text-[24px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="shrink-0" />
      </div>
      <p className="mt-3 font-serifDisplay text-[15px] leading-snug text-inkBlack/75">
        {project.description}
      </p>
      <Recognition project={project} className="mt-5" />
      {project.collaborators && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Collaborators</p>
          <p className="mt-1.5 font-serifDisplay text-[14px] leading-snug text-inkBlack/75">
            {project.collaborators}
          </p>
        </div>
      )}
      <div className="mt-6">
        <LessonPill project={project} />
      </div>
    </div>
  );
}

/* ------------------------------- LIST view -------------------------------- */

function ListView({ reduced }: { reduced: boolean }) {
  // REVERSE CHRONOLOGICAL: the most recent work leads. `n` encodes that order (01 = newest),
  // so sorting by it and sorting by year agree — the number the reader sees is the position.
  //
  // THE INDEX IS FLAT (2026-07-16, round 2). It used to be grouped by discipline, each group led by a
  // mono ARCHITECTURE / PRODUCT DESIGN / SOFTWARE heading and a 44px painted frontispiece. Daniel:
  // "Get rid of the small logo and extra product design software architecture." Both went. At 44px the
  // frontispieces read as beige smudges rather than paintings, and the headings chopped one twelve-item
  // reverse-chronological list into three short ones that each restarted the clock. `groupProjects` was
  // display machinery for those headings and is deleted with them; each project still carries its
  // `discipline`, which is simply no longer drawn.
  const items = [...PROJECTS].sort((a, b) => a.n.localeCompare(b.n));
  // Active selection is tracked by project `n`, defaulting to the top of the menu.
  const [activeN, setActiveN] = useState(() => items[0].n);
  const project = items.find((p) => p.n === activeN) ?? items[0];
  const { hero, rest } = heroSplit(project.images);

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
      {/* Desktop master-detail: the SELECTION MENU hard left, and the selected project's ROWS on the
          right. The detail is FIXED to the frame height. */}
      <div className="hidden h-full min-h-0 gap-x-16 gap-y-8 lg:grid lg:grid-cols-[minmax(300px,0.8fr)_2.2fr] xl:gap-x-20">
        {/* The project menu: one FLAT reverse-chronological list of all twelve. Hover/focus selects;
            the tint bar rides the active row's left edge. `overflow-y-auto` is only a last-resort
            safety for unusually short viewports — the list fits at normal desktop heights. */}
        <nav className="min-h-0 min-w-0 self-stretch overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ol>
            {items.map((p) => {
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
                    className="group relative flex w-full items-baseline gap-3 py-2 pl-4 pr-1 text-left transition-colors duration-200"
                    style={on ? { backgroundColor: `${tint}14` } : undefined}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px] origin-center transition-transform duration-200 ease-out motion-reduce:transition-none"
                      style={{ background: tint, transform: `scaleY(${on ? 1 : 0})` }}
                    />
                    {/* Bigger than it was (Daniel: "project titles slightly bigger"). The three
                        discipline headings are gone, which is exactly the room this spends. */}
                    <span
                      className={`font-serifDisplay text-[clamp(1rem,1.45vw,1.3rem)] leading-tight tracking-[-0.01em] text-inkBlack transition-transform duration-300 ease-out motion-reduce:transition-none ${
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
        </nav>

        {/* THE DETAIL, AS ROWS (2026-07-16, round 2). Daniel: "a lot of these images are not looking
            good because they're natively landscape but they're being displayed in portrait mode."
            They were: the hero used to sit in the left COLUMN of a [1.55fr_1fr] split beside the text,
            which at 1440 made its box ~505x557 — PORTRAIT — so a landscape hero floated in it with dead
            paper above and below.
            Now the picture takes the full width of the detail and the information reads across
            underneath it. Nothing here fixes an aspect ratio: the hero's box is simply the full width
            by whatever height the band leaves it (~860x450 at 1440 — landscape), so a landscape image
            fills it edge to edge and a `contain` diagram letterboxes in the correct direction. */}
        <div className="min-h-0 overflow-hidden">
          {/* NO AnimatePresence here, and that is deliberate. `mode="wait"` deadlocks against the
              `layoutId` images inside this subtree: framer-motion holds the exiting panel open
              waiting on a shared-layout transition that never resolves, so the exit never
              completes, the incoming panel never mounts, and the detail FREEZES on whichever
              project rendered first while the list happily highlights another. (That is the bug
              this page shipped with once.) Keying a plain motion.div remounts it on every change
              and fades the new one in — same read, no exit to get stuck on. */}
          <motion.div
            key={project.n}
            data-project-detail
            className="flex h-full min-h-0 flex-col gap-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ROW 1 — the pictures. The main image takes the row, with the supporting filmstrip
                standing beside it; it fills whatever height the band leaves, so a project with
                little to say gets a bigger picture. */}
            <div className="flex min-h-0 flex-1 gap-2">
              <div data-project-hero className="relative min-h-0 flex-1">
                <ProjectImg image={hero} onOpen={openShot} reduced={reduced} fill />
              </div>
              <SupportingStrip images={rest} onOpen={openShot} reduced={reduced} />
            </div>
            {/* ROW 2 — the project information. */}
            <ProjectInfoBand project={project} />
          </motion.div>
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
            <Gallery project={p} reduced={reduced} />
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

/**
 * FOUNDER BOWER — flowers growing around the two of them.
 *
 * NOTE THE BRIEF, because it is the OPPOSITE of the sub-branch engine's and the difference is
 * deliberate. There, Daniel asked for "an engine or an algorithm" and got space colonization. Here:
 *
 *   "It doesn't have to be a specific mathematical pattern. It just has to look pretty."
 *
 * So there is no derived geometry in this component and there should not be one. These are four
 * curves drawn by hand, by eye, in a 160x1100 strip — two down the left margin, two down the right —
 * and they are tuned by looking at the page, not by computing anything. Growing them from an
 * algorithm would be answering a question he did not ask, and the last algorithm that got pointed at
 * a "make it pretty" problem is what produced the choppy lines this replaces.
 *
 * They are VINES, not lines: `tube: true`, so the gongbi composer paints the stem in its own
 * painterly hand along with the foliage, rather than the page stroking a hard sepia bezier and
 * hanging leaves on it. That is the whole correction — "choppy... just random lines on top of it"
 * was a description of a bare drawn line with nothing growing on it.
 *
 * PIGMENT, and this is a colour-law call worth flagging: CLAUDE.md permits pigment on "the botanical
 * specimens only" and lists them. A painted vine is a botanical in exactly the register of the
 * founder specimens it hangs beside — but it is not on that list, so it is an extension of the law
 * rather than an application of it. Flagged in the handoff for Daniel.
 *
 * Desktop only: the margins it lives in do not exist below `lg`, and ornament that overlaps the
 * reading column is worse than no ornament.
 */
/** The strip the vines are painted into, in CSS px, drawn 1:1 on the page — never scaled to fit.
 *  Measured at 1440x900: the founders section is 1181x1401 with a 1100px content column, so each
 *  margin is ~169px of real air. 160 fits it with room, and 1500 overruns the section's height on
 *  purpose: the wrapper clips it, so a taller section (narrower viewport, more text wrapping) simply
 *  reveals more vine instead of stretching what is there.
 *
 *  The first cut stretched a 1100-tall strip to `h-full object-cover` and it upscaled and cropped
 *  the painting — a painted vine has a real hand and a real scale, and blowing it up 1.8x to fill a
 *  box is exactly the "image at the wrong size" mistake this whole round is about. */
const BOWER_STRIP = { w: 160, h: 1500 };

/** Four curves, drawn by eye. Root-first (the composer tapers a vine root → tip). Left pair first,
 *  then right; the right is authored separately rather than mirrored, because a mirrored vine reads
 *  as a mirrored vine. */
const BOWER_VINES: Array<Array<[number, number]>> = [
  // left, long: enters at the top and falls the length of the block, leaning in and out of the margin
  [[96, -30], [78, 90], [104, 210], [72, 330], [40, 450], [58, 580], [96, 700], [70, 830], [34, 950], [52, 1080]],
  // left, short: a lower spur that curls back up and out, so the left side is not one lonely stem
  [[58, 580], [22, 640], [8, 720], [30, 780], [64, 812]],
  // right, long: a different rhythm and a later start — it arrives beside Daniel rather than Clay
  [[64, 120], [96, 240], [70, 370], [34, 500], [56, 620], [98, 740], [76, 870], [40, 990], [58, 1100]],
  // right, short: a high spur near the kicker
  [[96, 240], [130, 300], [146, 372], [118, 424], [86, 448]],
];

function FounderBower({ side }: { side: 'left' | 'right' }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    // Sliced INSIDE the effect on purpose. As a component-body `const` this is a fresh array every
    // render, so as an effect dependency it never compares equal: the effect re-ran forever, each
    // pass minting a blob URL and revoking the last. It painted, so it looked fine — the live QA
    // caught it as 1233 failed requests for revoked blobs.
    const vines = side === 'left' ? BOWER_VINES.slice(0, 2) : BOWER_VINES.slice(2);
    requestGarland({
      // One seed per side, so the two sides are the same species with different takes — the same
      // reason the sub-branches batch their vines into one request. Shares the page's pinned
      // spine seed (see GARLAND_SEED): the page grows one plant.
      seed: `bower/spine-2/founders-${side}`,
      voice: 'pigment',
      width: BOWER_STRIP.w,
      height: BOWER_STRIP.h,
      vines: vines.map((path) => ({
        path,
        // Stations by eye too: a handful per vine, biased down the length, alternating so no two
        // blossoms sit adjacent.
        stations: [0.16, 0.3, 0.45, 0.58, 0.72, 0.86].map((t, i) => ({
          t,
          organ: (['leaf', 'bloom', 'leaf', 'bud', 'bloom', 'leaf'] as const)[i],
        })),
      })),
      scale: 1.35,
      rootWidth: 3.2,
      tube: true,
    })
      .then(async (bitmap) => {
        const c = document.createElement('canvas');
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.getContext('2d')?.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
        if (!blob || !live) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: unknown) => {
        // The founders read fine with no vine; a broken painting room must not look like taste.
        console.error(`gongbi founder bower (${side}) failed:`, err);
      });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [side]);

  if (!url) return null;
  // The wrapper reaches OUT past the section (into the page's own margin, where the air is) and
  // clips there, so the vine is drawn at its native size and simply runs off the page edge like a
  // vine does. `-left/-right-[150px]` puts the strip's inner edge ~30px clear of the 1100px content
  // column at 1440 — measured, because at -64px it grew straight across Clay's portrait.
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 hidden overflow-hidden lg:block ${
        side === 'left' ? '-left-[150px] w-[150px]' : '-right-[150px] w-[150px]'
      }`}
    >
      <img
        src={url}
        alt=""
        className="absolute top-0 left-0"
        style={{ width: BOWER_STRIP.w, height: BOWER_STRIP.h }}
      />
    </div>
  );
}

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
        <section aria-label="The founders" className="relative mx-auto w-full max-w-page px-gutter">
          {/* The flowers grow around the two of them, down the open margins either side. Behind the
              content on its own layer; the columns ride above it. */}
          <FounderBower side="left" />
          <FounderBower side="right" />

          <div className="relative z-10">
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
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">
                {TEAM_CODA.payoffLabel}
              </p>
              <p className="mt-2 font-serifDisplay text-[clamp(1.05rem,1.4vw,1.35rem)] text-inkBlack">
                {TEAM_CODA.payoff}
              </p>
            </div>
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
