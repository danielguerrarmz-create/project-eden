/**
 * ScrollPage.tsx — the new About page, composed as a hanging scroll.
 *
 * One continuous band of vellum read in viewport-lengths: dated inscriptions, project
 * plates, and exactly seven commissioned gongbi paintings (see paintings.ts) alternate
 * with generous empty paper, the way text and image alternate down a mounted scroll.
 * The paintings are grown live by the vendored nonflowers engine (LingDong Huang, MIT —
 * src/vendor/nonflowers) from permanent seeds; everything else on the page is the site's
 * own austere register — vellum, ink, and the practice's one blue.
 *
 * Art direction rules this file is bound by (from the design review, 2026-07-16):
 *   - Aged paper exists ONLY inside painting mounts; the page ground is paperVellum.
 *   - INK_BLUE never sets body-size text (3.6:1 on vellum). It appears as marks, rules,
 *     seals, and >=24px numerals; small blue text uses INK_BLUE_TEXT (#2F607F, AA).
 *   - Pigment stays in the frame: no tinted bands, no petal-colored chrome.
 *   - One painting per moment; body text never overlaps pigment (the H1 may share
 *     space with the hero branch, and the type wins the z-order).
 *   - No scripts, no drop caps, no faux-cinnabar seals, no ornament we didn't write.
 *
 * The old About page is untouched at #/about; this page hangs at #/about/scroll until
 * the studio decides which one answers the door.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { BowerMark } from '../../ui/BowerMark';
import { Frame } from '../../ui/Frame';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { SplashHeader } from '../splash/SplashHeader';
import { QUESTIONS } from '../AboutPage';
import { INK_BLUE } from '../about/CrossPathsTimeline';
import {
  AUTHOR_LABEL,
  TEAM,
  TEAM_CODA,
  type Project,
  type ProjectImage,
} from '../about/projects';
import { useAutoplayVideo } from '../about/useAutoplayVideo';
import { H1, H2 } from '../typeScale';
import { FanPainting } from './FanPainting';
import { groupProjects, INSCRIPTION, INSCRIPTION_CODA, PAINTINGS, type WorkGroup } from './paintings';

/** AA-safe darkened variant of the practice's blue, for caption-size type only. */
const INK_BLUE_TEXT = '#2F607F';

/** The shared verbatim title (the narration payoff line of the old page, kept). */
const TITLE_LINES = ["We've been chasing", 'it', 'for five years.'];

const KICKER = 'font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack/60';
const MONO_SMALL = 'font-mono text-[12px] uppercase tracking-[0.08em]';

/* ------------------------------------------------------------------------------------ */
/* Small shared pieces                                                                    */
/* ------------------------------------------------------------------------------------ */

/** One-shot entrance fade (the site's EngineSection idiom, without the color band). */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (reduced || seen) {
      setSeen(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, seen]);
  return (
    <div
      ref={ref}
      className={`${className} transition-[opacity,transform] duration-[350ms] ease-out ${
        seen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

/** The mounting seam between scroll sections: empty vellum crossed by one blue hairline.
 *  The vertical breath is clamped so a phone thumb is not asked to cross 40vh of nothing.
 *  (Exported for the ascent draft, which shares the scroll page's plate anatomy.) */
export function SectionSeam() {
  return (
    <div aria-hidden className="flex justify-center py-[clamp(4.5rem,13vh,9.5rem)]">
      <span className="h-px w-16" style={{ backgroundColor: INK_BLUE }} />
    </div>
  );
}

/** The studio's seal: square, geometric, brand blue, carrying real data (the plate index). */
export function Seal({ n }: { n: string }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] font-mono text-[11px] font-medium text-paperVellum"
      style={{ backgroundColor: INK_BLUE }}
    >
      {n}
    </span>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Hero                                                                                   */
/* ------------------------------------------------------------------------------------ */

/** Underline the two load-bearing words of the practice's questions in the practice's blue. */
function QuestionLine({ text }: { text: string }) {
  const parts = text.split(/(grown|AI)/);
  return (
    <p className={`${MONO_SMALL} text-inkBlack/80`}>
      {parts.map((part, i) =>
        part === 'grown' || part === 'AI' ? (
          <span key={i} className="border-b" style={{ borderColor: INK_BLUE }}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

function ScrollHero() {
  return (
    <section className="relative overflow-hidden">
      <Frame measure="read" className="relative z-10 flex min-h-[88svh] flex-col justify-center py-24">
        <h1 className={H1}>
          {TITLE_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <div className="mt-12 space-y-3">
          {QUESTIONS.map((q) => (
            <QuestionLine key={q.label} text={q.text} />
          ))}
        </div>
      </Frame>
      {/* The hero commission: a woody branch rising past the right edge, its trunk
          cropped by the bottom of the frame like the opening panel of a scroll.
          DOM-after the title so readers meet the words first; z-under it so the
          type wins where they share space. */}
      <div className="pointer-events-none absolute bottom-[-7%] right-[-14%] z-0 w-[min(58vw,700px)] md:right-[-4%]">
        <FanPainting commission={PAINTINGS.hero} size={700} eager caption={false} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Inscription — the crossed-paths story as a dated colophon                              */
/* ------------------------------------------------------------------------------------ */

function Inscription() {
  return (
    <Frame measure="read" as="section">
      <Reveal>
        <p className={KICKER}>{TEAM_CODA.kicker}.</p>
        <div className="mt-10 space-y-9">
          {INSCRIPTION.map((entry) => (
            <div key={entry.year} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-5">
              {/* 24px+ numerals are the one place small-ish blue type is allowed (AA-large). */}
              <span className="font-mono text-2xl tabular-nums" style={{ color: INK_BLUE }}>
                {entry.year}
              </span>
              <p className="max-w-[60ch] text-[17px] leading-relaxed opacity-90">{entry.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-14 max-w-[52ch] font-serifDisplay text-[19px] italic leading-relaxed text-inkBlack/80">
          {INSCRIPTION_CODA}
        </p>
      </Reveal>
    </Frame>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Plates index — scroll frontmatter for the twelve works                                 */
/* ------------------------------------------------------------------------------------ */

function PlatesIndex({ groups }: { groups: WorkGroup[] }) {
  const reduced = useReducedMotion();
  const jump = (n: string) => {
    // The site router treats any hash as navigation, so an in-page anchor must
    // scroll directly instead of writing `#plate-NN` into the URL.
    document.getElementById(`plate-${n}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <Frame measure="read" as="section">
      <Reveal>
        <p className={KICKER}>The work — twelve plates.</p>
        <ol className="mt-8 border-t border-inkBlack/12">
          {groups.flatMap((g) => g.projects).map((p) => (
            <li key={p.n} className="border-b border-inkBlack/12">
              <a
                href={`#plate-${p.n}`}
                onClick={(e) => {
                  e.preventDefault();
                  jump(p.n);
                }}
                className={`grid grid-cols-[2.5rem_1fr_3.5rem] items-baseline gap-4 py-3 ${MONO_SMALL} text-inkBlack/80 hover:text-inkBlack md:grid-cols-[2.5rem_1fr_9rem_3.5rem]`}
              >
                <span className="tabular-nums" style={{ color: INK_BLUE_TEXT }}>
                  {p.n}
                </span>
                <span>{p.title}</span>
                <span className="hidden text-inkBlack/50 md:block">{p.discipline}</span>
                <span className="text-right tabular-nums text-inkBlack/50">{p.year}</span>
              </a>
            </li>
          ))}
        </ol>
      </Reveal>
    </Frame>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Founders — the person, and the flower the algorithm grew from their name               */
/* ------------------------------------------------------------------------------------ */

function Founders() {
  return (
    <Frame measure="page" as="section">
      <Reveal>
        <p className={KICKER}>The founders.</p>
      </Reveal>
      {TEAM.map((member) => {
        const commission = member.name.startsWith('Clay') ? PAINTINGS.clay : PAINTINGS.daniel;
        return (
          <Reveal key={member.name} className="mt-14">
            <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)] md:items-start">
              <figure>
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full border border-inkBlack/12 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-inkBlack/20">
                    <span className={`${MONO_SMALL} text-inkBlack/50`}>Portrait to come</span>
                  </div>
                )}
                <figcaption className="mt-3">
                  <span className={`${MONO_SMALL} block text-inkBlack`}>{member.name}</span>
                  <span className={`${MONO_SMALL} block text-inkBlack/60`}>{member.role}</span>
                </figcaption>
              </figure>
              <dl className="space-y-6">
                {member.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className={`${MONO_SMALL} text-inkBlack/60`}>{fact.label}</dt>
                    <dd className="mt-1.5 max-w-[52ch] text-[17px] leading-relaxed opacity-90">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <FanPainting commission={commission} size={360} className="justify-self-end" />
            </div>
          </Reveal>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------------------------ */
/* The work — three scroll sections of plates                                             */
/* ------------------------------------------------------------------------------------ */

/** Tailwind needs literal class strings, so the supporting-grid columns are looked up. */
const REST_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
};

export function VideoLoop({ image }: { image: ProjectImage }) {
  const video = image.video;
  const reduced = useReducedMotion();
  const { ref, start } = useAutoplayVideo(video?.rate ?? 1);
  if (!video) return null;
  if (reduced) {
    // Reduced motion: the poster still is the artwork; no play pressure.
    return (
      <img src={image.src} alt={image.alt} loading="lazy" className="w-full object-cover" style={{ aspectRatio: image.ratio }} />
    );
  }
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      poster={image.src}
      onLoadedData={start}
      onCanPlay={start}
      aria-label={image.alt}
      className="w-full object-cover"
      style={{ aspectRatio: image.ratio }}
    >
      {video.webm && <source src={video.webm} type="video/webm" />}
      <source src={video.mp4} type="video/mp4" />
    </video>
  );
}

export function MediaTile({ image }: { image: ProjectImage }) {
  if (image.pending) {
    return (
      <div
        className="flex w-full items-center justify-center border border-dashed border-inkBlack/20"
        style={{ aspectRatio: image.ratio }}
      >
        <span className={`${MONO_SMALL} text-inkBlack/50`}>Image to come</span>
      </div>
    );
  }
  if (image.video) return <VideoLoop image={image} />;
  return (
    <figure>
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        className={`w-full ${image.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        style={{ aspectRatio: image.ratio }}
      />
      {image.caption && (
        <figcaption className="mt-2 font-mono text-[11px] tracking-[0.04em] text-inkBlack/50">{image.caption}</figcaption>
      )}
    </figure>
  );
}

/** A mono-labeled stage of the plate's text column (awards, collaborators, the lesson). */
export function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <p className={`${MONO_SMALL} text-inkBlack/60`}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ProjectPlate({ project }: { project: Project }) {
  const hero = project.images.find((i) => i.hero) ?? project.images[0];
  const rest = project.images.filter((i) => i !== hero);
  return (
    <Reveal>
      <article id={`plate-${project.n}`} className="mt-20 border-t border-inkBlack/12 pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-baseline gap-5">
            <span aria-hidden className="font-quote text-[clamp(2.25rem,4.5vw,4rem)] font-bold leading-none tabular-nums text-inkBlack/15">
              {project.n}
            </span>
            <div>
              <h3 className="font-serifDisplay text-[clamp(1.4rem,2.6vw,2.1rem)] font-semibold leading-[1.08] tracking-[-0.01em]">
                {project.title}
              </h3>
              <p className={`${MONO_SMALL} mt-2 text-inkBlack/60`}>
                {project.year} · {AUTHOR_LABEL[project.by]}
              </p>
            </div>
          </div>
          <Seal n={project.n} />
        </div>

        <div className="mt-8">
          {hero && <MediaTile image={hero} />}
          {rest.length > 0 && (
            <div className={`mt-3 grid grid-cols-1 gap-3 ${REST_COLS[Math.min(rest.length, 3)]}`}>
              {rest.map((img, i) => (
                <MediaTile key={`${img.src}-${i}`} image={img} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 max-w-[66ch]">
          <p className="text-[17px] leading-relaxed opacity-90">{project.description}</p>
          {(project.awards?.length || project.paper) && (
            <Stage label="Awards and publications">
              <div className="space-y-1.5 text-[15px] leading-relaxed opacity-90">
                {project.awards?.map((award) => <p key={award}>{award}</p>)}
                {project.paper && (
                  <p>
                    {project.paper.venue} — {project.paper.authors}
                    {project.paper.pdf && (
                      <>
                        {' · '}
                        <a
                          href={project.paper.pdf}
                          download
                          className="underline decoration-1 underline-offset-4"
                          style={{ textDecorationColor: INK_BLUE }}
                        >
                          Read the paper · {project.paper.pdfSize}
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            </Stage>
          )}
          {project.collaborators && (
            <Stage label="Collaborators">
              <p className="text-[15px] leading-relaxed opacity-90">{project.collaborators}</p>
            </Stage>
          )}
          <Stage label="What we learned">
            <p className="border border-inkBlack/12 px-5 py-4 font-serifDisplay text-[17px] italic leading-relaxed">
              {project.learned}
            </p>
          </Stage>
        </div>
      </article>
    </Reveal>
  );
}

function WorkSection({ group }: { group: WorkGroup }) {
  const commission = PAINTINGS[group.discipline];
  const first = group.projects[0]?.n;
  const last = group.projects[group.projects.length - 1]?.n;
  return (
    <Frame measure="page" as="section">
      <Reveal>
        <div className="grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <p className={KICKER}>
              Plates {first}–{last}.
            </p>
            <h2 className={`${H2} mt-4`}>{group.discipline}</h2>
            <p className={`${MONO_SMALL} mt-3 text-inkBlack/50`}>most recent first</p>
          </div>
          <FanPainting commission={commission} size={420} className="md:justify-self-end" />
        </div>
      </Reveal>
      {group.projects.map((p) => (
        <ProjectPlate key={p.n} project={p} />
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Colophon                                                                               */
/* ------------------------------------------------------------------------------------ */

function Colophon() {
  return (
    <Frame measure="read" as="section" className="pb-[16vh]">
      <Reveal className="flex flex-col items-center text-center">
        <div className="relative w-full max-w-[560px]">
          <FanPainting commission={PAINTINGS.eden} size={560} caption={false} />
          {/* The mark sits where the branch meets the ground — the scroll's final seal. */}
          <div className="absolute inset-x-0 bottom-[5%] flex justify-center">
            <BowerMark markSize={22} nameClass="font-mono text-[13px] lowercase tracking-[0.2em]" />
          </div>
        </div>
        <p className={`${KICKER} mt-12`}>{TEAM_CODA.payoffLabel}</p>
        <p className="mt-3 font-serifDisplay text-[clamp(1.35rem,2.6vw,1.9rem)] italic leading-snug">
          {TEAM_CODA.payoff}
        </p>
      </Reveal>
    </Frame>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Page                                                                                   */
/* ------------------------------------------------------------------------------------ */

export function ScrollPage() {
  const groups = groupProjects();
  return (
    // Serif is this page's reading voice (Source Serif via the serifDisplay stack);
    // mono and Bodoni are opted into per element. The site default (Inter) never
    // appears on the scroll.
    <div className="min-h-screen bg-paperVellum font-serifDisplay text-inkBlack">
      <SplashHeader measure="page" />
      <main className="pt-header">
        <ScrollHero />
        <SectionSeam />
        <Inscription />
        <SectionSeam />
        <PlatesIndex groups={groups} />
        <SectionSeam />
        <Founders />
        {groups.map((group) => (
          <Fragment key={group.discipline}>
            <SectionSeam />
            <WorkSection group={group} />
          </Fragment>
        ))}
        <SectionSeam />
        <Colophon />
      </main>
    </div>
  );
}
