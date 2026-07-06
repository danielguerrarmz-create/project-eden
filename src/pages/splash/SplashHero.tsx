/**
 * SplashHero.tsx — section 1, the hero. Full-bleed, min-h-screen, field-blue
 * ground with navy ink. Distinct from EngineSection because it owns the whole
 * viewport and carries a background/side diagram layer, but it shares the same
 * ground-to-ink map, the same InkProvider so hairline children resolve navy, and
 * the same one-directional entrance fade (IntersectionObserver, reduced-motion
 * snaps settled).
 *
 * The one Bodoni moment on the page lives here (the H1). It names the PRODUCT
 * literally, "Eden" (the thing a client commissions), while the header wordmark
 * reads the COMPANY brand from WORDMARK ("Bower"). Both are correct: Bower is the
 * studio, Eden is what it builds for you (confirmed 2026-07-05).
 */
import { useEffect, useRef, useState } from 'react';
import { ENGINE_NAME, PRODUCT, CTA_PRIMARY_EVALUATOR } from '../../data/config';
import type { EngineOutputs } from '../../engine/types';
import { routes } from '../../routing';
import { BowerMark } from '../../ui/BowerMark';
import { INK, InkProvider } from '../engine/hairline';
import { H1 } from '../typeScale';
import { HeroCanopyMark } from './HeroCanopyMark';

const navLink =
  'font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 opacity-80 transition hover:decoration-inkNavy hover:opacity-100 focus-visible:decoration-inkNavy';

export function SplashHero({ outputs, reduced }: { outputs: EngineOutputs; reduced: boolean }) {
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
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced]);

  return (
    <section
      ref={ref}
      className="flex min-h-screen w-full flex-col bg-fieldBlue text-inkNavy"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(8px)',
        transition: reduced ? 'none' : 'opacity 350ms ease-out, transform 350ms ease-out',
      }}
    >
      <InkProvider value={INK.inkNavy}>
        {/* Header, inside the hero ground, non-sticky (matches the Engine page).
            Left: the unified bower wordmark. Right: the noun stack, taught quietly
            so a visitor learns Eden / the engine / the studio and their routes. */}
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-6 md:px-10">
          <div className="flex items-center gap-2 opacity-80">
            <BowerMark />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">
              · living architecture for the garden
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <a href={routes.home} className={navLink}>
              {PRODUCT} (the pavilion)
            </a>
            <a href={routes.engine} className={navLink}>
              {ENGINE_NAME}
            </a>
            <a href={routes.studio} className={navLink}>
              the studio
            </a>
          </nav>
        </header>

        {/* Two-zone body, vertically centered in the remaining viewport. */}
        <div className="flex flex-1 items-center px-6 py-24 md:px-10 md:py-0">
          <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_minmax(0,42%)]">
            {/* Text zone */}
            <div className="max-w-[46ch]">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70" style={{ letterSpacing: '0.2em' }}>
                Living architecture for the garden
              </p>
              <h1 className={`mt-5 ${H1}`}>
                Commission a <em className="italic">living</em> Eden.
              </h1>
              <p className="mt-8 max-w-[46ch] text-[18px] leading-relaxed opacity-90">
                A timber pavilion computed for your plot, its lattice built to carry climbing plants
                rather than just stand over them. It is never finished on installation day. It gets
                more alive, and more beautiful, with every season it grows.
              </p>

              <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
                <a
                  href={routes.engine}
                  className="inline-flex items-center justify-center bg-inkNavy px-6 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-fieldBlue transition hover:bg-inkNavy/90 focus-visible:bg-inkNavy/90"
                >
                  {CTA_PRIMARY_EVALUATOR} →
                </a>
                <a
                  href="#register"
                  className="font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
                >
                  Register interest ↓
                </a>
              </div>
            </div>

            {/* Diagram zone — the live brand mark, drawn large. */}
            <div className="mx-auto w-full max-w-[420px] lg:mx-0">
              <HeroCanopyMark outputs={outputs} />
            </div>
          </div>
        </div>
      </InkProvider>
    </section>
  );
}
