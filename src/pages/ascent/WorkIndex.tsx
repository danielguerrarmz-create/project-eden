/**
 * WorkIndex.tsx — the work as a compact station on the climb, not terrain.
 *
 * One viewport-ish index of the twelve projects (grouped by discipline, most
 * recent first), each row opening a ProjectSheet overlay with the full plate
 * anatomy from the scroll draft. The detail layer floats above the ascent and
 * scrolls normally inside itself, so it is direction-agnostic — the climb stays
 * short and the evidence stays deep.
 *
 * Deliberately NO layoutId/AnimatePresence shared-element morphs here: the old
 * About page documents that combination deadlocking (see the warning comment in
 * AboutPage.tsx / CLAUDE.md); the sheet is a plain overlay with a fade.
 *
 * Met from below (ascent), so groups and rows render flex-col-reverse: reading
 * order Architecture → Product Design → Software, climbing bottom → top.
 */
import { useEffect, useRef, useState } from 'react';
import { Frame } from '../../ui/Frame';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { INK_BLUE } from '../about/CrossPathsTimeline';
import { AUTHOR_LABEL, type Project } from '../about/projects';
import { MediaTile, Seal, Stage } from '../scroll/ScrollPage';
import type { WorkGroup } from '../scroll/paintings';

const MONO_SMALL = 'font-mono text-[12px] uppercase tracking-[0.08em]';

/** Tailwind needs literal class strings, so the supporting-grid columns are looked up. */
const REST_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
};

function ProjectSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hero = project.images.find((i) => i.hero) ?? project.images[0];
  const rest = project.images.filter((i) => i !== hero);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain bg-inkBlack/25 p-[4vmin] ${
        reduced ? '' : 'animate-[sheet-in_200ms_ease-out]'
      }`}
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[980px] border border-inkBlack/12 bg-paperVellum px-6 py-8 shadow-2xl md:px-12 md:py-12"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-baseline gap-5">
            <span aria-hidden className="font-quote text-[clamp(2rem,4vw,3.5rem)] font-bold leading-none tabular-nums text-inkBlack/15">
              {project.n}
            </span>
            <div>
              <h3 className="font-serifDisplay text-[clamp(1.3rem,2.4vw,2rem)] font-semibold leading-[1.08] tracking-[-0.01em]">
                {project.title}
              </h3>
              <p className={`${MONO_SMALL} mt-2 text-inkBlack/60`}>
                {project.year} · {AUTHOR_LABEL[project.by]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Seal n={project.n} />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`${MONO_SMALL} border border-inkBlack/20 px-3 py-1.5 text-inkBlack/70 hover:border-inkBlack/50 hover:text-inkBlack`}
            >
              Close
            </button>
          </div>
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
    </div>
  );
}

export function WorkIndex({ groups }: { groups: WorkGroup[] }) {
  const [open, setOpen] = useState<Project | null>(null);

  return (
    <Frame measure="read" as="section">
      <div className="flex flex-col-reverse">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack/60">
          The work — twelve plates. Open any.
        </p>
        <div className="mb-8 flex flex-col-reverse gap-10">
          {groups.map((group) => (
            <div key={group.discipline} className="flex flex-col-reverse">
              <h2 className="mt-4 font-serifDisplay text-xl font-semibold">{group.discipline}</h2>
              <ol className="flex flex-col-reverse border-b border-inkBlack/12">
                {group.projects.map((p) => (
                  <li key={p.n} className="border-t border-inkBlack/12">
                    <button
                      type="button"
                      onClick={() => setOpen(p)}
                      className={`grid w-full grid-cols-[2.5rem_1fr_3.5rem] items-baseline gap-4 py-3 text-left ${MONO_SMALL} text-inkBlack/80 hover:text-inkBlack`}
                    >
                      <span className="tabular-nums" style={{ color: '#2F607F' }}>
                        {p.n}
                      </span>
                      <span>{p.title}</span>
                      <span className="text-right tabular-nums text-inkBlack/50">{p.year}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
      {open && <ProjectSheet project={open} onClose={() => setOpen(null)} />}
    </Frame>
  );
}
