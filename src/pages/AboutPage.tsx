/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * Order: the header (title + the two questions), then the co-founders (Clay + Daniel),
 * then the projects. The projects use the master-detail LIST that worked best: a slim
 * numbered SELECTION MENU on the left, and on the right the selected project's IMAGES
 * (a large hero + a thumbnail grid of the rest, which now includes the prototyping shots)
 * plus its description and the big "What we learned". On mobile the projects stack, each
 * with its images and text inline.
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

/** One framed image on the paper ground. Renders crop to a clean 3:2 tile with
 *  object-cover; paper figures set fit:'contain' so nothing is cut, on a white ground.
 *
 *  Every image is a BUTTON: click it and it opens full-bleed in the Lightbox. The image
 *  carries a `layoutId` so framer-motion morphs the tile itself up to the large view
 *  (a shared-element transition) rather than cross-fading a second copy of it. */
function ProjectVideoEl({
  image,
  className,
  contain,
  reduced,
  intrinsic = false,
}: {
  image: ProjectImage;
  className: string;
  contain: boolean;
  reduced: boolean;
  /** In the supporting-image pack, render at the poster's true proportions (no crop, height auto)
   *  so mixed portrait/landscape media fill the column instead of being forced to one shape. */
  intrinsic?: boolean;
}) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);

  const frame = intrinsic
    ? `w-full h-auto block border border-inkBlack/12 ${contain ? 'bg-white p-1.5' : ''} ${className}`
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
  intrinsic = false,
}: {
  image: ProjectImage;
  className?: string;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
  /** Supporting-pack mode: render at true proportions, no forced aspect or crop. */
  intrinsic?: boolean;
}) {
  const contain = image.fit === 'contain';
  const frame = intrinsic
    ? `w-full h-auto block border border-inkBlack/12 ${contain ? 'bg-white p-1.5' : ''} ${className}`
    : `w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`;

  // A video tile stays out of the shared-element morph: framer-motion cannot morph a <video>
  // into an <img> without a visible swap. It still opens the lightbox, on its poster.
  if (image.video) {
    const el = (
      <ProjectVideoEl image={image} className={className} contain={contain} reduced={reduced} intrinsic={intrinsic} />
    );
    if (!onOpen) return el;
    return (
      <button
        type="button"
        onClick={() => onOpen(image)}
        aria-label={`Enlarge: ${image.alt}`}
        className="group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
      >
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
    <motion.img
      layoutId={`shot-${image.src}`}
      src={image.src}
      alt={image.alt}
      loading="lazy"
      className={frame}
    />
  ) : (
    <img src={image.src} alt={image.alt} loading="lazy" className={frame} />
  );

  if (!onOpen) return img;

  return (
    <button
      type="button"
      onClick={() => onOpen(image)}
      aria-label={`Enlarge: ${image.alt}`}
      className="group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
    >
      {img}
      {/* The affordance stays invisible until you're on the image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
      />
    </button>
  );
}

/** The curated gallery: the hero large (with its caption), then the rest as a thumbnail
 *  grid — which surfaces the prototyping shots for projects like Synergy.
 *
 *  `fit` caps the hero against the VIEWPORT, not a fixed aspect, so the whole project
 *  (images AND text) lands inside one page on any display instead of pushing the words
 *  below the fold on a tall monitor. */
function Gallery({
  project,
  onOpen,
  capped = false,
  reduced = false,
}: {
  project: Project;
  onOpen?: (image: ProjectImage) => void;
  capped?: boolean;
  reduced?: boolean;
}) {
  const [hero, ...rest] = project.images;
  // The supporting pack respects each image's real proportions and fills the column (round 3
  // section 5): one balanced column for a couple of images, two for three or more, images flowing
  // at their intrinsic aspect ratio rather than cropped to a uniform grid.
  const packClass = rest.length >= 3 ? '[columns:2] [column-gap:16px]' : '[columns:1]';
  return (
    <figure className="space-y-3">
      <div className="space-y-2">
        {/* Hero: full width, height by its own aspect, capped against the viewport so the whole
            project still lands on one page. Cover for photos, contain on white for baked-in text. */}
        <ProjectImg
          image={hero}
          className={capped ? 'max-h-[46vh]' : 'aspect-[3/2]'}
          onOpen={onOpen}
          reduced={reduced}
        />
        {hero.caption && (
          <figcaption className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/40">
            {hero.caption}
          </figcaption>
        )}
      </div>
      {rest.length > 0 && (
        <div className={`[column-fill:balance] ${packClass}`}>
          {rest.map((img) => (
            <div key={img.src} className="mb-4 break-inside-avoid">
              <ProjectImg image={img} onOpen={onOpen} reduced={reduced} intrinsic />
            </div>
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

/**
 * Lightbox — click any project image and it opens large.
 *
 * The motion is a SHARED ELEMENT: the tile you clicked carries `layoutId`, and the
 * large image claims the same one, so framer-motion morphs the actual thumbnail up to
 * full size instead of fading in a duplicate. That is what makes it read as "this image
 * got bigger" rather than "a modal appeared".
 *
 * Close: Escape, the backdrop, or the button. Arrow keys walk the project's other shots
 * (the whole set is passed in, so the lightbox is a small viewer, not a dead end).
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

          {/* The caption is CENTRED under the image, with the counter and close beneath it, so
              the whole viewer reads on one vertical axis instead of the caption drifting left. */}
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
              {images.length > 1 && (
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

/** The description + "What we learned" block, beneath the gallery. For paper-based
 *  projects, adds the venue/authors line and a "read the paper" download. */
/**
 * The detail panel, standardized (round 3 section 5) into five explicit stages, in order: title,
 * credits (the byline), description, awards and publications, lessons learned. The paper's venue,
 * authors and download now live together in the awards-and-publications stage between the
 * description and the takeaway, rather than the venue floating above the description and the
 * download stranded below the takeaway. If a project has neither awards nor a paper, that stage is
 * omitted entirely so no empty label ever shows.
 */
function ProjectText({ project }: { project: Project }) {
  const paper = project.paper;
  const awards = project.awards;
  const hasRecognition = (awards && awards.length > 0) || !!paper;
  return (
    <div>
      {/* 1. Title + 2. Credits (byline, in the same row). */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serifDisplay text-[22px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="shrink-0" />
      </div>
      {/* 3. Description. */}
      <p className="mt-2 font-serifDisplay text-[15px] leading-snug text-inkBlack/70">
        {project.description}
      </p>
      {/* 4. Awards and publications. Neutral kicker tone: olive stays reserved for the one payoff
          line below so it isn't diluted by using it twice on the same panel. */}
      {hasRecognition && (
        <div className="mt-5 border-t border-inkBlack/15 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/45">
            Awards and publications
          </p>
          {awards && awards.length > 0 && (
            <ul className="mt-2 space-y-1">
              {awards.map((award) => (
                <li key={award} className="font-serifDisplay text-[14px] leading-snug text-inkBlack/70">
                  {award}
                </li>
              ))}
            </ul>
          )}
          {paper && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
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
      {/* 5. Lessons learned. */}
      <div className="mt-5 border-t border-inkBlack/15 pt-4">
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
      {/* Desktop master-detail: the numbered SELECTION MENU hard left, the images +
          project info on the right. The whole thing is sized to the frame it sits in, so
          the work reads as ONE page — no scrolling to reach a project. */}
      <div className="hidden h-full min-h-0 gap-x-16 gap-y-8 lg:grid lg:grid-cols-[minmax(300px,0.85fr)_2fr] xl:gap-x-24">
        <ol className="min-w-0 self-start">
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
                  {/* The selection is a BAR in the author's colour: blue for Clay, green for
                      Daniel. It is the loudest thing in the list, on purpose. */}
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

        {/* Detail: the active project's images + description + takeaway, cross-fading as
            the selection changes. On a wide display the words sit BESIDE the images rather
            than under them, so a project is one glance: pictures left, meaning right, all
            of it above the fold. Narrower than xl they stack and the panel scrolls. */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* NO AnimatePresence here, and that is deliberate. `mode="wait"` deadlocks against
                the `layoutId` images inside this subtree: framer-motion holds the exiting panel
                open waiting on a shared-layout transition that never resolves, so the exit never
                completes, the incoming panel never mounts, and the detail FREEZES on whichever
                project rendered first while the list happily highlights another. (That is the
                bug this page shipped with.) Keying a plain motion.div remounts it on every
                change and fades the new one in — same read, no exit to get stuck on. */}
            <motion.div
              key={project.n}
              className="grid gap-x-10 gap-y-5 xl:grid-cols-[1.55fr_1fr]"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <Gallery project={project} onOpen={openShot} capped reduced={reduced} />
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
              <span
                aria-hidden
                className="h-[3px] w-6 rounded-full"
                style={{ background: authorColor(p.by) }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/40">
                {p.year}
              </span>
            </div>
            <Gallery project={p} reduced={reduced} />
            <div className="mt-5">
              <ProjectText project={p} />
            </div>
          </section>
        ))}
      </div>

      <Lightbox
        images={project.images}
        index={shot}
        onClose={closeShot}
        onStep={stepShot}
        reduced={reduced}
      />
    </div>
  );
}

/* -------------------------------- team ------------------------------------ */

/** One co-founder card: portrait (or a quiet placeholder while a photo is pending) + bio. */
function TeamCard({ person }: { person: TeamMember }) {
  return (
    <div className="flex gap-5">
      {/* A deliberate, slightly heavier mat for the portrait (round 3 section 4): 128px, 1.5px border
          a shade heavier than the picture-plate borders elsewhere, since this is a portrait. */}
      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md border-[1.5px] border-inkBlack/20 bg-paperDeep/50">
        {person.image ? (
          <img
            src={person.image}
            alt={`Portrait of ${person.name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-inkBlack/20">
            <OculusMark size={44} className="h-auto w-11" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-serifDisplay text-[19px] leading-tight text-inkBlack">{person.name}</h3>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accentOlive">
          {person.role}
        </p>
        <p className="mt-2 font-serifDisplay text-[14px] leading-snug text-inkBlack/70">{person.bio}</p>
      </div>
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
        {/* PORTION ONE — the title AND the sequence, together. The drawing starts immediately,
            in the same frame as the sentence it is the proof of, and the two questions surface
            in that same column as the camera reaches the years that earned them. There is no
            preamble screen, no colour key, and no rule drawn across the page: the argument IS
            the first thing, and it begins at once. */}
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

        {/* The founder block is framed tightly (round 3 section 4, tightened again after live QA:
            Daniel flagged the frame as still airy at 38svh). 24svh still releases the sticky
            timeline before "The two of us" can enter (so the finale and the founders never share a
            frame) — verified live at 1920x876. */}
        <div aria-hidden className={reduced ? 'h-16' : 'min-h-[24svh]'} />

        {/* The two of us. AFTER the sequence: by the time you meet them, you already know
            where they came from. */}
        <section aria-label="The two of us" className="pt-8">
          <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
            The two of us
          </h2>
          {/* A single bordered panel with a hairline divider between the two founders, so the block
              reads as one deliberate framed moment (round 3 section 4) rather than two loose cards. */}
          <div className="mt-8 grid border border-inkBlack/12 sm:grid-cols-2 sm:divide-x sm:divide-inkBlack/12">
            {TEAM.map((person) => (
              <div key={person.name} className="p-8 sm:p-10">
                <TeamCard person={person} />
              </div>
            ))}
          </div>
        </section>

        {/* PORTION TWO — the work, most recent first. Sized to ONE page: the section owns a
            viewport's height, the header takes what it needs, and the master-detail fills
            the rest. Nothing about the work requires scrolling to reach. */}
        {/* Same tight framing below the founder block (round 3 section 4). */}
        <div aria-hidden className={reduced ? 'h-16' : 'min-h-[24svh]'} />

        <section
          aria-label="Projects"
          className="flex h-[calc(100svh-var(--header-h))] min-h-[720px] flex-col border-t border-inkBlack/12 pt-10"
        >
          <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
              The Work
            </h2>
            <span className="font-serifDisplay text-[15px] italic text-inkBlack/50">
              most recent first
            </span>
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
