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
import { Frame } from '../../ui/Frame';
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
  id,
  wide = false,
  lead = false,
}: {
  ground: Ground;
  reduced: boolean;
  children: ReactNode;
  /** Optional anchor id on the section root (e.g. the splash's #register). */
  id?: string;
  /** Widen the reading column for two-column editorial spreads (Engine page). The home
   *  never passes this, so its sections keep the reading column unchanged. */
  wide?: boolean;
  /** This is the page's FIRST band, so it must clear the fixed header itself. */
  lead?: boolean;
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
      id={id}
      className={`w-full ${g.bg} ${g.text}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(8px)',
        transition: reduced ? 'none' : 'opacity 350ms ease-out, transform 350ms ease-out',
      }}
    >
      {/* One frame, one gutter, one rhythm. `lead` is the page's FIRST band, which must
          clear the fixed header on its own: below md the header wraps to two rows and the
          old flat py-20 let the nav sit on top of the eyebrow. */}
      <Frame measure={wide ? 'page' : 'read'} className={`py-rhythm ${lead ? 'pt-header' : ''}`}>
        <InkProvider value={g.ink}>{children}</InkProvider>
      </Frame>
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
