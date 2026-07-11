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
    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/50 ${className}`}>
      {AUTHOR_LABEL[project.by]} · {project.year}
    </span>
  );
}

/** One framed image on the paper ground. Renders crop to a clean 3:2 tile with
 *  object-cover; paper figures set fit:'contain' so nothing is cut, on a white ground. */
function ProjectImg({ image, className = '' }: { image: ProjectImage; className?: string }) {
  const contain = image.fit === 'contain';
  return (
    <img
      src={image.src}
      alt={image.alt}
      loading="lazy"
      className={`w-full border border-inkBlack/12 ${
        contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'
      } ${className}`}
    />
  );
}

/** The curated gallery: the hero large (with its caption), then the rest as a thumbnail
 *  grid — which surfaces the prototyping shots for projects like Synergy. */
function Gallery({ project }: { project: Project }) {
  const [hero, ...rest] = project.images;
  return (
    <figure className="space-y-3">
      <div className="space-y-2">
        <ProjectImg image={hero} className="aspect-[3/2]" />
        {hero.caption && (
          <figcaption className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/40">
            {hero.caption}
          </figcaption>
        )}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {rest.map((img) => (
            <ProjectImg key={img.src} image={img} className="aspect-[3/2]" />
          ))}
        </div>
      )}
    </figure>
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
  const [active, setActive] = useState(0);
  const project = PROJECTS[active];

  return (
    <div>
      {/* Desktop master-detail: the numbered SELECTION MENU on the left, the images +
          project info on the right. */}
      <div className="hidden gap-x-14 gap-y-8 lg:grid lg:grid-cols-[2fr_3fr]">
        <ol className="min-w-0">
          {PROJECTS.map((p, i) => {
            const on = i === active;
            return (
              <li key={p.n} className="border-t border-inkBlack/12 last:border-b">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}
                  aria-current={on}
                  className="group flex w-full items-baseline gap-3 py-3.5 text-left"
                >
                  <span
                    className={`w-7 shrink-0 font-mono text-[11px] tracking-[0.14em] transition-colors ${
                      on ? 'text-accentOlive' : 'text-inkBlack/40'
                    }`}
                  >
                    {p.n}
                  </span>
                  <span
                    className={`font-serifDisplay text-[clamp(1.05rem,1.9vw,1.55rem)] leading-tight tracking-[-0.01em] text-inkBlack transition-transform duration-300 ease-out motion-reduce:transition-none ${
                      on && !reduced ? 'translate-x-1' : ''
                    }`}
                  >
                    {p.title}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] tracking-[0.14em] text-inkBlack/40">
                    {p.year}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Sticky detail: the active project's images + description + takeaway, cross-fading
            as the selection changes. Capped to the viewport so a tall project scrolls
            internally rather than running off-screen. */}
        <div className="block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={project.n}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
              >
                <Gallery project={project} />
                <div className="mt-5">
                  <ProjectText project={project} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile: the same projects stacked, each with its images + text inline. */}
      <div className="space-y-16 lg:hidden">
        {PROJECTS.map((p) => (
          <section key={p.n} aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-mono text-[11px] tracking-[0.14em] text-accentOlive">{p.n}</span>
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
        className="mx-auto max-w-[1360px] px-8 pb-24 pt-28 md:px-16 md:pt-28"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: revealed ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* 1 — Header: the title, and the two questions set apart and large. */}
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

        {/* 2 — Co-founders: a short introduction to Clay and Daniel. */}
        <section aria-label="Co-founders" className="mt-16 border-t border-inkBlack/12 pt-10">
          <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
            The two of us
          </h2>
          <div className="mt-8 grid gap-10 sm:grid-cols-2">
            {TEAM.map((person) => (
              <TeamCard key={person.name} person={person} />
            ))}
          </div>
        </section>

        {/* 3 — Projects: the master-detail selection menu + images. */}
        <section aria-label="Projects" className="mt-20 border-t border-inkBlack/12 pt-10">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
              Projects
            </h2>
            <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
              {PROJECTS.length} projects
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
