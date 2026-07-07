/**
 * HeroReveal.tsx — the cinematic, scroll-scrubbed home hero (replaces the static
 * hero visual). A tall wrapper pins a FULL-BLEED stage (absolute inset-0 layers);
 * scroll progress p (0..1) across the wrapper drives a 2D -> 3D -> render
 * choreography over the whole viewport:
 *
 *   p 0.00 -> 0.08  the flat Oculus SVG mark, large and centered (the intro's handoff)
 *   p 0.08 -> 0.20  cross-fade: Oculus SVG out, the R3F canvas in (pavilion top-down)
 *   p 0.20 -> 0.50  the camera tilts top-down -> oblique; the plan becomes a gridshell
 *   p 0.50 -> 0.76  the render resolves: ink wireframe -> solid timber + plants grow in
 *   p 0.80 -> 0.94  the hero copy + CTAs fade / rise in over the finished render, with
 *                   the live stats strip arriving alongside them (the scroll's payoff)
 *
 * Daniel override: p=0 shows ONLY the centered Oculus mark, full-bleed, no copy. The
 * reveal itself is the pitch, so the copy is scroll-gated to the end of the scrub and
 * then dwells over the finished render before the hero unpins.
 *
 * Fallbacks:
 *   - reduced motion    -> the FINAL state, static, no pinning ('staticRender').
 *   - no WebGL / SSR     -> a poster: the Oculus mark + the copy, no canvas ('poster').
 * The R3F canvas is lazy-loaded so first paint shows the Oculus SVG immediately, and
 * the whole component is SSR-safe (server renders the poster with the copy visible).
 */
import { Suspense, lazy, useEffect, useRef, type MutableRefObject } from 'react';
import { useScroll } from 'framer-motion';
import type { EngineOutputs } from '../../engine/types';
import { CTA_PRIMARY_EVALUATOR } from '../../data/config';
import { routes } from '../../routing';
import { useDesign } from '../../state/store';
import { BowerMark } from '../../ui/BowerMark';
import { OculusMark } from '../../ui/OculusMark';
import { webglSupported } from '../../ui/webgl';
import { AnnotationStrip } from '../engine/EngineSection';
import { H1 } from '../typeScale';

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

const HeroScene = lazy(() => import('./HeroScene'));

/** Scroll-progress thresholds. Exposed as named constants for visual tuning. */
export const HERO_THRESHOLDS = {
  /** Total scroll length of the pinned hero, in viewport heights. */
  WRAPPER_VH: 210,
  /** Oculus SVG fades OUT over this p-range. */
  OCULUS_OUT: [0.08, 0.2] as [number, number],
  /** The R3F canvas fades IN over this p-range. */
  CANVAS_IN: [0.08, 0.2] as [number, number],
  /** Camera tilts top-down -> oblique over this range (also lives in HeroScene). */
  TILT: [0.2, 0.5] as [number, number],
  /** Wireframe -> solid + plants resolve over this range (also in HeroScene). */
  RESOLVE: [0.5, 0.76] as [number, number],
  /** The hero copy + CTAs fade / rise in at the END of the scrub, over the finished
   *  render (Daniel override: p=0 shows only the mark, the reveal itself is the pitch).
   *  Landing at 0.94 leaves ~0.06 of the 210vh wrapper as pinned dwell before unpinning. */
  COPY_IN: [0.8, 0.94] as [number, number],
  /** The reward stats strip arrives WITH the copy (a beat into the copy reveal). */
  STATS_IN: [0.82, 0.94] as [number, number],
} as const;

export type HeroMode = 'poster' | 'staticRender' | 'scrub';

/** Pure mode decision (unit-tested): server/no-webgl -> poster, reduced -> final render. */
export function heroMode(o: { isBrowser: boolean; webgl: boolean; reduced: boolean }): HeroMode {
  if (!o.isBrowser || !o.webgl) return 'poster';
  if (o.reduced) return 'staticRender';
  return 'scrub';
}

const navLink =
  'font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/60 transition hover:text-inkBlack focus-visible:text-inkBlack';

/** Shared nav chrome. The wordmark text carries `data-wordmark` (the intro target). */
function Header() {
  return (
    <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-6 md:px-10">
      <div className="flex items-center gap-2 text-inkBlack opacity-90">
        <BowerMark />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">
          · living architecture for the garden
        </span>
      </div>
      <nav className="flex items-center gap-4">
        <a href="#how-it-works" className={navLink}>
          how it works
        </a>
        <a href={routes.studio} className={navLink}>
          the studio
        </a>
      </nav>
    </header>
  );
}

/** The hero copy (single source; shared by every mode). */
function HeroCopy() {
  return (
    <div className="max-w-[46ch]">
      <p
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-inkBlack/70"
        style={{ letterSpacing: '0.2em' }}
      >
        Bower · living architecture for the garden
      </p>
      <h1 className={`mt-5 text-inkBlack ${H1}`}>
        Commission a <em className="italic">living</em> Eden.
      </h1>
      <p className="mt-8 max-w-[46ch] text-[18px] leading-relaxed text-inkBlack/85">
        A timber pavilion computed for your plot, its lattice built to carry climbing plants rather
        than just stand over them. It is never finished on installation day. It gets more alive, and
        more beautiful, with every season it grows.
      </p>
      <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center bg-inkBlack px-6 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-paperVellum transition hover:bg-inkBlack/90 focus-visible:bg-inkBlack/90"
        >
          {CTA_PRIMARY_EVALUATOR} →
        </a>
        <a
          href="#register"
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-inkBlack focus-visible:decoration-inkBlack"
        >
          Register interest ↓
        </a>
      </div>
    </div>
  );
}

/** The large flat Oculus mark (the p=0 state / the poster visual). */
function OculusPlate({ className = '' }: { className?: string }) {
  return (
    <div className={`grid place-items-center text-inkBlack ${className}`}>
      <OculusMark size={360} className="h-auto w-[min(340px,60vmin)]" />
    </div>
  );
}

/** Poster: no canvas. SSR + first paint + no-WebGL. Copy visible, Oculus mark shown. */
function PosterHero() {
  return (
    <section className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <Header />
      <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-12 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10 md:py-24">
        <HeroCopy />
        <OculusPlate className="w-full md:w-[42%]" />
      </div>
    </section>
  );
}

/** Reduced-motion: the final rendered pavilion + copy, no pinning, no scrub. */
function StaticRenderHero() {
  const finalRef = useRef(1) as MutableRefObject<number>;
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <HeroScene progressRef={finalRef} />
        </Suspense>
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <div className="mt-auto bg-gradient-to-r from-paperVellum via-paperVellum/45 to-transparent">
          <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-24 md:px-10">
            <HeroCopy />
          </div>
        </div>
      </div>
    </section>
  );
}

/** The full pinned, scroll-scrubbed choreography (full-bleed visual, copy reveals at end). */
function ScrubHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const oculusRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  // The stats strip reuses the live default outputs already on the page (same
  // pattern as SplashPage): no new copy string, no new data.
  const geometry = useDesign((s) => s.outputs.geometry);
  const price = useDesign((s) => s.outputs.price);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  });

  // Drive every scroll-linked layer imperatively off one signal. Framer motion-value
  // style bindings proved unreliable for these overlays (opacity would stick), so the
  // canvas fade-in, the Oculus fade-out, and the copy + stats reveal are all set here.
  useEffect(() => {
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const [oa, ob] = HERO_THRESHOLDS.OCULUS_OUT;
    const [na, nb] = HERO_THRESHOLDS.CANVAS_IN;
    const [ca, cb] = HERO_THRESHOLDS.COPY_IN;
    const [sa, sb] = HERO_THRESHOLDS.STATS_IN;
    const apply = (v: number) => {
      progressRef.current = v;
      if (canvasRef.current) canvasRef.current.style.opacity = String(clamp01((v - na) / (nb - na)));
      if (oculusRef.current) {
        const t = clamp01((v - oa) / (ob - oa));
        oculusRef.current.style.opacity = String(1 - t);
        oculusRef.current.style.transform = `scale(${1 + 0.15 * Math.min(1, v / ob)})`;
      }
      if (copyRef.current) {
        const t = clamp01((v - ca) / (cb - ca));
        copyRef.current.style.opacity = String(t);
        copyRef.current.style.transform = `translateY(${(1 - t) * 24}px)`;
      }
      if (statsRef.current) {
        const t = clamp01((v - sa) / (sb - sa));
        statsRef.current.style.opacity = String(t);
        statsRef.current.style.transform = `translateY(${(1 - t) * 8}px)`;
      }
      // Request one 3D frame per scroll change (canvas runs frameloop="demand").
      invalidateRef.current?.();
    };
    apply(scrollYProgress.get());
    const unsub = scrollYProgress.on('change', apply);
    return () => unsub();
  }, [scrollYProgress]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: `${HERO_THRESHOLDS.WRAPPER_VH}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
        {/* Canvas layer, full-bleed, fades in as the mark fades out (opacity set imperatively). */}
        <div ref={canvasRef} className="absolute inset-0" style={{ opacity: 0 }}>
          <Suspense fallback={null}>
            <HeroScene progressRef={progressRef} invalidateRef={invalidateRef} />
          </Suspense>
        </div>

        {/* Flat Oculus mark (front), full-bleed, the p=0 state handed off from the intro.
            Opacity + scale are driven imperatively in the scroll effect above. */}
        <div
          ref={oculusRef}
          className="pointer-events-none absolute inset-0"
          style={{ opacity: 1, willChange: 'opacity, transform' }}
        >
          <OculusPlate className="h-full w-full" />
        </div>

        {/* Nav, always on top. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <Header />
        </div>

        {/* Hero copy, bottom-left gradient overlay over the full-bleed render. Scroll-
            gated: hidden at p=0 (the reveal is the pitch) and faded / risen in near the
            end of the scrub (COPY_IN), driven imperatively in the scroll effect above. */}
        <div
          ref={copyRef}
          className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-r from-paperVellum via-paperVellum/45 to-transparent"
          style={{ opacity: 0, transform: 'translateY(24px)', willChange: 'opacity, transform' }}
        >
          <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-24 md:px-10">
            <HeroCopy />

            {/* Reward stats strip: arrives with the copy (STATS_IN), inside the copy
                overlay. Live numbers already on the page, worded as "priced live". */}
            <div
              ref={statsRef}
              className="mt-8"
              style={{ opacity: 0, transform: 'translateY(8px)', willChange: 'opacity, transform' }}
            >
              <AnnotationStrip>
                footprint {geometry.footprintM2.toFixed(1)} m² · rise {geometry.riseM.toFixed(2)} m ·
                this shape, priced live: {gbp(price.fixedTotalGBP)}
              </AnnotationStrip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroReveal({ reduced }: { outputs: EngineOutputs; reduced: boolean }) {
  // This is a client-rendered SPA (createRoot, no hydration). On the server (tests)
  // there is no window, so we render the poster (copy present). In the browser we
  // decide synchronously on the FIRST frame — no mounted flag, so there is no
  // poster/default flash before the scrubbed hero appears; frame one is already the
  // scrub p=0 state (the big centered Oculus, no copy) under the intro backdrop.
  const isBrowser = typeof window !== 'undefined';
  const webgl = isBrowser && webglSupported();
  const mode = heroMode({ isBrowser, webgl, reduced });

  if (mode === 'scrub') return <ScrubHero />;
  if (mode === 'staticRender') return <StaticRenderHero />;
  return <PosterHero />;
}
