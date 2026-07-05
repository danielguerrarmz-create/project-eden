/**
 * EngineSection.tsx — a full-bleed field-color section with a centered reading
 * column, the correct ink color for its ground (provided to hairline children via
 * context), and a single one-directional entrance fade.
 *
 * One field color per section, never blended (DESIGN-DIRECTION.md §5). When the
 * user prefers reduced motion the section renders settled on mount, no observer,
 * matching how the 3D scene snaps its growth animation.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { INK, InkProvider } from './hairline';

export type Ground = 'blue' | 'chartreuse' | 'yellow' | 'vellum';

const GROUND: Record<Ground, { bg: string; text: string; ink: string }> = {
  blue: { bg: 'bg-fieldBlue', text: 'text-inkNavy', ink: INK.inkNavy },
  chartreuse: { bg: 'bg-fieldChartreuse', text: 'text-inkBlack', ink: INK.inkBlack },
  yellow: { bg: 'bg-fieldYellow', text: 'text-inkBlack', ink: INK.inkBlack },
  vellum: { bg: 'bg-paperVellum', text: 'text-inkBlack', ink: INK.inkBlack },
};

export function EngineSection({
  ground,
  reduced,
  children,
}: {
  ground: Ground;
  reduced: boolean;
  children: ReactNode;
}) {
  const g = GROUND[ground];
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced]);

  return (
    <section
      ref={ref}
      className={`w-full ${g.bg} ${g.text}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(8px)',
        transition: reduced ? 'none' : 'opacity 350ms ease-out, transform 350ms ease-out',
      }}
    >
      <div className="mx-auto max-w-[880px] px-6 py-20 md:px-10 md:py-32">
        <InkProvider value={g.ink}>{children}</InkProvider>
      </div>
    </section>
  );
}

/** Mono eyebrow used to open every section. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70"
      style={{ letterSpacing: '0.2em' }}
    >
      {children}
    </p>
  );
}

/** Mono annotation strip beneath a diagram (kept in HTML so it never drops below 10px). */
export function AnnotationStrip({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] opacity-80">
      {children}
    </p>
  );
}
