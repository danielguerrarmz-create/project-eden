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
import {
  PROJECTS,
  TEAM,
  AUTHOR_LABEL,
  type Project,
  type ProjectImage,
  type TeamMember,
} from './about/projects';
import { AboutIntro, shouldPlayAboutIntro } from './about/AboutIntro';
import { CrossPathsTimeline, CrossPathsKey, CLAY, DANIEL, SHARED } from './about/CrossPathsTimeline';

/** ONE colour rule across the whole page: Clay is blue, Daniel is green, shared work is the
 *  olive that is also the egg. The timeline's strands and this list say the same thing. */
function authorColor(by: Project['by']): string {
  return by === 'clay' ? CLAY : by === 'daniel' ? DANIEL : SHARED;
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
function ProjectImg({
  image,
  className = '',
  onOpen,
}: {
  image: ProjectImage;
  className?: string;
  onOpen?: (image: ProjectImage) => void;
}) {
  const contain = image.fit === 'contain';
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
      className={`w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`}
    />
  ) : (
    <img
      src={image.src}
      alt={image.alt}
      loading="lazy"
      className={`w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`}
    />
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
}: {
  project: Project;
  onOpen?: (image: ProjectImage) => void;
  capped?: boolean;
}) {
  const [hero, ...rest] = project.images;
  return (
    <figure className="space-y-3">
      <div className="space-y-2">
        <ProjectImg
          image={hero}
          className={capped ? 'max-h-[min(48vh,540px)] object-cover' : 'aspect-[3/2]'}
          onOpen={onOpen}
        />
        {hero.caption && (
          <figcaption className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/40">
            {hero.caption}
          </figcaption>
        )}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {rest.map((img) => (
            <ProjectImg
              key={img.src}
              image={img}
              className={capped ? 'aspect-[3/2] max-h-[15vh]' : 'aspect-[3/2]'}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </figure>
  );
}

/* ------------------------------- lightbox --------------------------------- */

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

          <motion.img
            layoutId={reduced ? undefined : `shot-${image.src}`}
            src={image.src}
            alt={image.alt}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[82vh] w-auto max-w-[min(1600px,94vw)] cursor-default border border-inkBlack/15 bg-white object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
            transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
          />

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
function ProjectText({ project }: { project: Project }) {
  const paper = project.paper;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serifDisplay text-[22px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="shrink-0" />
      </div>
      {paper && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
          {paper.venue} · {paper.authors}
        </p>
      )}
      <p className="mt-2 font-serifDisplay text-[15px] leading-snug text-inkBlack/70">
        {project.description}
      </p>
      <div className="mt-5 border-t border-inkBlack/15 pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">What we learned</p>
        <p className="mt-2 font-serifDisplay text-[clamp(1.15rem,1.5vw,1.5rem)] leading-snug text-inkBlack">
          {project.learned}
        </p>
      </div>
      {paper?.pdf && (
        <a
          href={paper.pdf}
          download
          className="group mt-5 inline-flex items-center gap-2.5 border border-inkBlack/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
        >
          <DownloadGlyph />
          Read the paper
          <span className="text-inkBlack/40 group-hover:text-accentOlive/70">{paper.pdfSize}</span>
        </a>
      )}
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={project.n}
                className="grid gap-x-10 gap-y-5 xl:grid-cols-[1.55fr_1fr]"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
              >
                <Gallery project={project} onOpen={openShot} capped />
                <ProjectText project={project} />
              </motion.div>
            </AnimatePresence>
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
            <Gallery project={p} />
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
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-inkBlack/12 bg-paperDeep/50 sm:h-28 sm:w-28">
        {person.image ? (
          <img
            src={person.image}
            alt={`Portrait of ${person.name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-inkBlack/20">
            <OculusMark size={40} className="h-auto w-10" />
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
        {/* PORTION ONE — the founders: who we are, and the timeline of how we crossed
            paths. A full-height first "page" before the work. */}
        <section
          aria-label="The founders"
          className="flex min-h-[calc(100svh-var(--header-h)-2rem)] flex-col"
        >
          {/* Header: the title, and the two questions set apart and large. */}
          <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <h1 data-about-title className={`${TITLE_CLASS} max-w-[16ch]`}>
              {TITLE}
            </h1>
            <dl className="lg:max-w-[30rem]">
              {QUESTIONS.map((q, i) => (
                <div key={q.label} className={i > 0 ? 'mt-5 border-t border-inkBlack/12 pt-5' : ''}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                    {q.label}
                  </dt>
                  <dd className="mt-1.5 font-serifDisplay text-[clamp(1.15rem,1.8vw,1.6rem)] leading-snug text-inkBlack">
                    {q.text}
                  </dd>
                </div>
              ))}
            </dl>
          </header>

          {/* Co-founders: short and sweet. */}
          <div aria-label="Co-founders" className="mt-14 border-t border-inkBlack/12 pt-10">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
              The two of us
            </h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-2">
              {TEAM.map((person) => (
                <TeamCard key={person.name} person={person} />
              ))}
            </div>
          </div>

        </section>

        {/* PORTION TWO — how they crossed paths. It reads DOWNWARD, with the page: time
            descends, Clay falls left, Daniel falls right, and the gap between them is the
            story. It gets its own screen because it is the argument, not an ornament. */}
        <section
          aria-label="How we crossed paths"
          className="mt-24 flex h-[calc(100svh-var(--header-h))] min-h-[760px] flex-col border-t border-inkBlack/12 pt-10"
        >
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
            <div>
              <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
                How we crossed paths
              </h2>
              <p className="mt-3 max-w-[46ch] font-serifDisplay text-[15px] leading-snug text-inkBlack/60">
                Clay was already drafting in Dallas before Daniel enrolled. We met at UT Austin,
                built together, spent a year apart in different cities chasing different things,
                and came back to the same idea.
              </p>
            </div>
            <CrossPathsKey />
          </div>
          <CrossPathsTimeline play={revealed} />
        </section>

        {/* PORTION TWO — the work, most recent first. Sized to ONE page: the section owns a
            viewport's height, the header takes what it needs, and the master-detail fills
            the rest. Nothing about the work requires scrolling to reach. */}
        <section
          aria-label="Projects"
          className="mt-24 flex h-[calc(100svh-var(--header-h))] min-h-[720px] flex-col border-t border-inkBlack/12 pt-10"
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
