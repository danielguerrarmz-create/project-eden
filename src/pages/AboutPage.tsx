/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * A projects showcase modelled on cathydolle.com's presentation: one project set, shown
 * two ways behind a LIST / SLIDER toggle. There are NO individual project pages — the LIST
 * is a master-detail: a slim numbered index on the left, and on the right the selected
 * project's curated images (1..4), its description, and the big "What we learned" takeaway.
 * SLIDER is a horizontal, draggable filmstrip of the same projects. The page carries the
 * shared splash chrome and the paperVellum ground, and its story is Clay and Daniel's
 * five-year pursuit across two fronts: grown-not-built architecture, and designing with AI.
 *
 * Scaffold state: every image is intentionally BLANK (BlankFrame). The interaction, layout,
 * and accessibility are final; only the image assets are pending.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashHeader } from './splash/SplashHeader';
import { useReducedMotion } from '../ui/useReducedMotion';
import { PROJECTS, AUTHOR_LABEL, type Project } from './about/projects';
import { AboutIntro, shouldPlayAboutIntro } from './about/AboutIntro';

type Mode = 'list' | 'slider';

/** The page title, shared verbatim between the header and the intro's flying title so they
 *  land coincident — and it IS the narration's payoff line, so the loading screen and the
 *  header read as one thought. TITLE_CLASS deliberately matches the narration line's size
 *  and weight (the narrative spec is the page's title spec), not an oversized heading. */
const TITLE = "We've been chasing it for five years.";
const TITLE_CLASS =
  'font-serifDisplay text-[clamp(1.6rem,4.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.01em] text-inkBlack';

/** Decide synchronously (first client render) whether the narration intro should play.
 *  It plays on EVERY visit to the page (not session-gated) — only reduced-motion opts out. */
function decideAboutIntro(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  return shouldPlayAboutIntro(reduced, false);
}

/** The intentionally-empty image placeholder: a clean frame carrying a faint label so the
 *  grid reads without any real asset. `size` shrinks the label + drops the caption for
 *  gallery thumbnails. Swap for the curated render later. */
function BlankFrame({
  label,
  alt,
  size = 'lg',
  className = '',
}: {
  label: string;
  alt?: string;
  size?: 'lg' | 'sm';
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt ?? 'Placeholder image, forthcoming'}
      className={`relative grid place-items-center overflow-hidden border border-inkBlack/12 bg-paperDeep/50 ${className}`}
    >
      <span
        className={`pointer-events-none select-none font-serifDisplay leading-none text-inkBlack/10 ${
          size === 'lg' ? 'text-[clamp(3rem,9vw,6rem)]' : 'text-[1.6rem]'
        }`}
      >
        {label}
      </span>
      {size === 'lg' && (
        <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/35">
          image forthcoming
        </span>
      )}
    </div>
  );
}

/** The mono meta pair (author + year) reused in the detail + slider captions. */
function Meta({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/50 ${className}`}>
      {AUTHOR_LABEL[project.by]} · {project.year}
    </span>
  );
}

/** The curated gallery: one large image, then the rest (up to 3) as a thumbnail row. */
function Gallery({ project }: { project: Project }) {
  const thumbs = Math.max(0, Math.min(project.images, 4) - 1);
  return (
    <div className="space-y-3">
      <BlankFrame
        label={project.n}
        alt={`Placeholder image for ${project.title}, forthcoming`}
        className="aspect-[3/2] w-full"
      />
      {thumbs > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: thumbs }).map((_, i) => (
            <BlankFrame key={i} label={String(i + 2)} size="sm" className="aspect-[3/2] w-full" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- LIST view -------------------------------- */

function ListView({ reduced }: { reduced: boolean }) {
  const [active, setActive] = useState(0);
  const project = PROJECTS[active];

  return (
    <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[2fr_3fr]">
      {/* The slim numbered index. Hover OR keyboard focus updates the detail, so it
          reaches keyboard users too. */}
      <ol className="min-w-0">
        {PROJECTS.map((p, i) => {
          const on = i === active;
          return (
            <li key={p.n} className="border-t border-inkBlack/12 last:border-b">
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}
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
          as the row changes. Desktop only — narrow screens browse via the SLIDER. Capped to
          the viewport so a tall project can scroll internally rather than run off-screen. */}
      <div className="hidden lg:block">
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

              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="font-serifDisplay text-[22px] leading-tight text-inkBlack">{project.title}</h3>
                <Meta project={project} className="shrink-0" />
              </div>
              <p className="mt-2 font-serifDisplay text-[15px] leading-snug text-inkBlack/70">
                {project.description}
              </p>

              <div className="mt-5 border-t border-inkBlack/15 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accentOlive">What we learned</p>
                <p className="mt-2 font-serifDisplay text-[clamp(1.15rem,1.5vw,1.5rem)] leading-snug text-inkBlack">
                  {project.learned}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ SLIDER view ------------------------------- */

function SliderView() {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  /** Recompute the current card from scroll position (drives the counter + arrows). */
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 20; // card width + gap-5 (1.25rem)
    setIndex(Math.round(el.scrollLeft / step));
  }, []);

  const scrollByCards = useCallback((dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' });
  }, []);

  // Drag-to-scroll (pointer): grab the filmstrip and pull, like the reference slider.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      el.scrollLeft = startLeft - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = '';
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') scrollByCards(1);
          if (e.key === 'ArrowLeft') scrollByCards(-1);
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Projects slider"
        className="flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PROJECTS.map((p) => (
          <figure key={p.n} className="w-[min(88vw,560px)] shrink-0 snap-start">
            <BlankFrame label={p.n} alt={`Placeholder image for ${p.title}, forthcoming`} className="aspect-[3/2] w-full" />
            <figcaption className="mt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[12px] tracking-[0.14em] text-accentOlive">{p.n}</span>
                  <span className="font-serifDisplay text-[18px] leading-none text-inkBlack">{p.title}</span>
                </span>
                <Meta project={p} />
              </div>
              <p className="mt-1.5 font-serifDisplay text-[13px] leading-snug text-inkBlack/60">{p.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Controls: a counter plus prev / next. Drag + native scroll also work. */}
      <div className="mt-6 flex items-center gap-6">
        <span className="font-mono text-[12px] tracking-[0.18em] text-inkBlack/60">
          {String(Math.min(index + 1, PROJECTS.length)).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={index === 0}
            aria-label="Previous project"
            className="grid h-9 w-9 place-items-center rounded-full border border-inkBlack/20 font-mono text-[13px] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive disabled:opacity-30 disabled:hover:border-inkBlack/20 disabled:hover:text-inkBlack"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={index >= PROJECTS.length - 1}
            aria-label="Next project"
            className="grid h-9 w-9 place-items-center rounded-full border border-inkBlack/20 font-mono text-[13px] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive disabled:opacity-30 disabled:hover:border-inkBlack/20 disabled:hover:text-inkBlack"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- toggle ---------------------------------- */

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="group" aria-label="Project view" className="flex items-center gap-4">
      {(['list', 'slider'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`font-mono text-[12px] uppercase tracking-[0.18em] transition-colors ${
            mode === m
              ? 'text-inkBlack underline decoration-accentOlive decoration-2 underline-offset-[6px]'
              : 'text-inkBlack/40 hover:text-inkBlack/70'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export function AboutPage() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>('list');
  // The one-time narration intro plays over the page; while it does, the content is held
  // at opacity 0 (still in layout, so the intro can measure the header title to fly onto).
  const [intro, setIntro] = useState(decideAboutIntro);
  const [revealed, setRevealed] = useState(() => !intro);
  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => setIntro(false), []);

  // The hash router doesn't reset scroll between routes; start this page at the top so the
  // header reads first AND the intro measures the title's on-screen rect correctly.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <motion.main
        className="mx-auto max-w-[1360px] px-8 pb-24 pt-28 md:px-16 md:pt-32"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: revealed ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Intro: the page's one story, the five-year pursuit shared by Clay + Daniel. */}
        <header className="max-w-[46ch]">
          <h1 data-about-title className={TITLE_CLASS}>
            {TITLE}
          </h1>
          <p className="mt-5 font-serifDisplay text-[17px] leading-snug text-inkBlack/70">
            Two questions, chased together and apart: how architecture can be grown, not only built,
            and how designing alongside artificial intelligence reshapes what we can make. Ten
            projects, 2021 to 2026, ending where Bower begins.
          </p>
        </header>

        {/* Toggle bar. */}
        <div className="mt-14 flex items-center justify-between border-b border-inkBlack/12 pb-4">
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">
            {PROJECTS.length} projects
          </span>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* The two presentations, cross-faded on toggle. */}
        <div className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={mode}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
            >
              {mode === 'list' ? <ListView reduced={reduced} /> : <SliderView />}
            </motion.section>
          </AnimatePresence>
        </div>
      </motion.main>

      {intro && (
        <AboutIntro title={TITLE} titleClassName={TITLE_CLASS} onReveal={onReveal} onDone={onDone} />
      )}
    </div>
  );
}
