/**
 * HeroReveal.tsx — the cinematic home hero. A single full-viewport stage that plays
 * a TIMED (not scroll-scrubbed) 2D -> 3D -> render reveal once, so the logo->structure
 * transition is legible without the visitor having to scroll:
 *
 *   p 0.00 -> 0.08  the flat Oculus SVG mark, large and centered (the intro's handoff)
 *   p 0.08 -> 0.20  cross-fade: Oculus SVG out, the R3F canvas in (pavilion top-down)
 *   p 0.20 -> 0.50  the camera tilts top-down -> oblique; the plan becomes a gridshell
 *   p 0.50 -> 0.76  the render resolves: ink wireframe -> solid timber + plants grow in
 *   p 0.80 -> 0.97  the copy + cursive "Eden" arrive at the bottom, over the render
 *
 * The reveal is time-driven off requestAnimationFrame and starts only once the BowerIntro
 * veil has lifted (INTRO_DONE_EVENT) — or immediately if the intro has already played this
 * tab. The copy sits in a slim bottom band (headline then mission) so the structure keeps
 * the upper frame and stands out. The nav lives in the global fixed SplashHeader.
 *
 * Fallbacks:
 *   - reduced motion    -> the FINAL state, static, no reveal ('staticRender').
 *   - no WebGL / SSR     -> a poster: the Oculus mark + the copy, no canvas ('poster').
 */
import { Suspense, lazy, useEffect, useRef, type MutableRefObject } from 'react';
import type { EngineOutputs } from '../../engine/types';
import { OculusMark } from '../../ui/OculusMark';
import { webglSupported } from '../../ui/webgl';
import { SESSION_KEY, INTRO_DONE_EVENT } from './BowerIntro';
import { HERO_STILL, isCaptureMode, captureRecord } from './heroStill';

/** Only cross-fade to the beauty still once a REAL render replaces the placeholder;
 *  while it's a placeholder the reveal ends cleanly on the three.js geometry. */
const STILL_ENABLED = !HERO_STILL.placeholder;

const HeroScene = lazy(() => import('./HeroScene'));

/** Progress thresholds (0..1 of the timed reveal). Exposed for tuning + tests. */
export const HERO_THRESHOLDS = {
  /** Duration of the timed logo->structure->copy reveal, in ms. */
  REVEAL_MS: 3400,
  /** Oculus SVG fades OUT over this p-range. */
  OCULUS_OUT: [0.08, 0.2] as [number, number],
  /** The R3F canvas fades IN over this p-range. */
  CANVAS_IN: [0.08, 0.2] as [number, number],
  /** Camera tilts top-down -> oblique over this range (also lives in HeroScene). */
  TILT: [0.2, 0.5] as [number, number],
  /** Wireframe -> solid + plants resolve over this range (also in HeroScene). */
  RESOLVE: [0.5, 0.76] as [number, number],
  /** The copy fades / rises in near the end, over the finished render. */
  COPY_IN: [0.8, 0.94] as [number, number],
  /** The cursive "Eden" writes itself in (left-to-right) a beat into the copy reveal. */
  EDEN_IN: [0.85, 0.97] as [number, number],
  /** The pre-rendered beauty still cross-fades in over the resolved three.js render, so
   *  the low-poly scene dissolves into a rendered image at the very end (Phase C). */
  STILL_IN: [0.82, 1.0] as [number, number],
} as const;

export type HeroMode = 'poster' | 'staticRender' | 'scrub';

/** Pure mode decision (unit-tested): server/no-webgl -> poster, reduced -> final render. */
export function heroMode(o: { isBrowser: boolean; webgl: boolean; reduced: boolean }): HeroMode {
  if (!o.isBrowser || !o.webgl) return 'poster';
  if (o.reduced) return 'staticRender';
  return 'scrub';
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The hero copy: one outcome headline (with the animated cursive "Eden") + one mission
 *  line, sized to sit as a slim bottom band so the structure keeps the frame. When
 *  `edenRef` is given, the cursive word is driven by the reveal; else it CSS-writes on. */
function HeroCopy({ edenRef }: { edenRef?: MutableRefObject<HTMLSpanElement | null> }) {
  const driven = !!edenRef;
  return (
    <div>
      <h1 className="max-w-[15ch] font-quote text-[clamp(2rem,4.6vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.02em] text-inkBlack">
        <span className="block">Grow a living</span>
        {/* The product name is the hero's one display moment: a drastically larger
            cursive word on its own line. Sized in em-free clamp() so it scales with the
            viewport and stays inside max-w-[15ch] at every breakpoint (a 4-letter word
            at 9rem is ~275px, well under the ~450px line box). leading-none + the small
            negative margins tuck the sentence lines close without clipping the tall
            Dancing-Script ascenders; pr keeps the final flourish off the clip edge. */}
        <span
          ref={edenRef}
          className={`-my-[0.04em] block pr-[0.14em] font-handwrite text-[clamp(3.5rem,11vw,8rem)] font-semibold not-italic leading-[0.85] ${
            driven ? '' : 'animate-write-on motion-reduce:animate-none'
          }`}
          style={driven ? { clipPath: 'inset(0 100% 0 0)', opacity: 0.4 } : undefined}
        >
          Eden
        </span>
        <span className="block">in your garden.</span>
      </h1>
      <p className="mt-4 max-w-[36ch] font-serifDisplay text-[17px] leading-snug text-inkBlack/70">
        Rewilding gardens through architecture anyone can build.
      </p>
    </div>
  );
}

/** A slim bottom band holding the copy, with a soft upward vellum gradient so the copy
 *  reads over the render while the structure keeps the upper frame. */
function CopyBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-paperVellum via-paperVellum/75 to-transparent px-6 pb-10 pt-40 md:px-10 md:pb-12">
      <div className="mx-auto max-w-[1120px]">{children}</div>
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
    <section className="relative min-h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
      <OculusPlate className="absolute inset-0" />
      <CopyBand>
        <HeroCopy />
      </CopyBand>
    </section>
  );
}

/** Reduced-motion: the final beauty still + copy, no reveal (the still sits over the
 *  resolved three.js render, which loads behind it as a fallback if the image fails). */
function StaticRenderHero() {
  const finalRef = useRef(1) as MutableRefObject<number>;
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <HeroScene progressRef={finalRef} />
        </Suspense>
      </div>
      {STILL_ENABLED && (
        <img src={HERO_STILL.src} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
      <CopyBand>
        <HeroCopy />
      </CopyBand>
    </section>
  );
}

/** The timed reveal: a single viewport-height stage that auto-plays once. */
function AutoHero() {
  const progressRef = useRef(0);
  const oculusRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const edenRef = useRef<HTMLSpanElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  // Drive every layer imperatively off one progress value: the canvas fade-in, the
  // Oculus fade-out, the copy reveal, and the cursive Eden write-on. Time-driven off
  // rAF; starts once the intro veil lifts (or immediately if the intro already played).
  useEffect(() => {
    const [oa, ob] = HERO_THRESHOLDS.OCULUS_OUT;
    const [na, nb] = HERO_THRESHOLDS.CANVAS_IN;
    const [ca, cb] = HERO_THRESHOLDS.COPY_IN;
    const [ea, eb] = HERO_THRESHOLDS.EDEN_IN;
    const [sa, sb] = HERO_THRESHOLDS.STILL_IN;
    const capture = isCaptureMode();
    const apply = (p: number) => {
      progressRef.current = p;
      if (canvasRef.current) canvasRef.current.style.opacity = String(clamp01((p - na) / (nb - na)));
      if (oculusRef.current) {
        const t = clamp01((p - oa) / (ob - oa));
        oculusRef.current.style.opacity = String(1 - t);
        oculusRef.current.style.transform = `scale(${1 + 0.15 * Math.min(1, p / ob)})`;
      }
      if (copyRef.current) {
        const t = clamp01((p - ca) / (cb - ca));
        copyRef.current.style.opacity = String(t);
        copyRef.current.style.transform = `translateY(${(1 - t) * 24}px)`;
      }
      if (edenRef.current) {
        const t = clamp01((p - ea) / (eb - ea));
        edenRef.current.style.clipPath = `inset(0 ${(1 - t) * 100}% 0 0)`;
        edenRef.current.style.opacity = String(0.4 + 0.6 * t);
      }
      // Cross-fade the beauty still in over the resolved render. Off in capture mode and
      // while the still is a placeholder, so the reveal ends on the three.js geometry.
      if (stillRef.current) {
        stillRef.current.style.opacity =
          capture || !STILL_ENABLED ? '0' : String(clamp01((p - sa) / (sb - sa)));
      }
      invalidateRef.current?.();
    };

    let raf = 0;
    let startTime = 0;
    let startTimer = 0;
    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = clamp01((now - startTime) / HERO_THRESHOLDS.REVEAL_MS);
      apply(easeInOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const begin = () => {
      // A short beat after the veil lifts before the structure starts resolving.
      startTimer = window.setTimeout(() => {
        raf = requestAnimationFrame(tick);
      }, 200);
    };

    apply(0); // first paint: big centered Oculus, canvas + copy hidden (intro handoff)

    if (capture && captureRecord()) {
      // Record mode: play the reveal once and capture the WebGL canvas (geometry only, no
      // DOM chrome) to a clean .webm, holding a beat at each end. This is the input for a
      // Higgsfield video-to-video restyle (keeps our geometry + motion, re-skins the look).
      // The canvas is lazy-loaded, so wait until it (and the render-on-demand hook) exist.
      let raf = 0;
      let start = 0;
      let rec: MediaRecorder | null = null;
      let cancelled = false;

      const beginRecord = (
        canvas: HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream },
      ) => {
        const stream = canvas.captureStream(30);
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        rec.onstop = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
          a.download = 'hero-animation.webm';
          a.click();
        };
        const HOLD_START = 500;
        const HOLD_END = 900;
        const total = HOLD_START + HERO_THRESHOLDS.REVEAL_MS + HOLD_END;
        rec.start();
        const step = (now: number) => {
          if (!start) start = now;
          const elapsed = now - start;
          apply(easeInOutCubic(clamp01((elapsed - HOLD_START) / HERO_THRESHOLDS.REVEAL_MS)));
          if (elapsed < total) raf = requestAnimationFrame(step);
          else if (rec && rec.state !== 'inactive') rec.stop();
        };
        raf = requestAnimationFrame(step);
      };

      const waitForReady = () => {
        if (cancelled) return;
        const canvas = document.querySelector('canvas') as
          | (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream })
          | null;
        // Ready = the lazy canvas is mounted AND the render-on-demand hook is live.
        if (canvas?.captureStream && invalidateRef.current && typeof MediaRecorder !== 'undefined') {
          beginRecord(canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream });
        } else {
          raf = requestAnimationFrame(waitForReady);
        }
      };
      waitForReady();

      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        if (rec && rec.state !== 'inactive') rec.stop();
      };
    }

    if (capture) {
      // Capture mode: freeze at the endpoint (progress = 1) for the Phase-A screenshot,
      // no timed reveal, still suppressed. Invalidate a beat later so the resolved scene
      // (materials + plants) has settled before __captureHero() is called.
      apply(1);
      const settle = window.setTimeout(() => invalidateRef.current?.(), 400);
      return () => clearTimeout(settle);
    }

    let alreadyPlayed = false;
    try {
      alreadyPlayed = !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      /* private mode: treat as not played -> wait for the intro */
    }
    if (alreadyPlayed) begin();
    else window.addEventListener(INTRO_DONE_EVENT, begin, { once: true });

    return () => {
      window.removeEventListener(INTRO_DONE_EVENT, begin);
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
      {/* Canvas layer, full-bleed, fades in as the mark fades out. */}
      <div ref={canvasRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <Suspense fallback={null}>
          <HeroScene progressRef={progressRef} invalidateRef={invalidateRef} />
        </Suspense>
      </div>

      {/* Flat Oculus mark (front), the p=0 state handed off from the intro. */}
      <div
        ref={oculusRef}
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 1, willChange: 'opacity, transform' }}
      >
        <OculusPlate className="h-full w-full" />
      </div>

      {/* Beauty still: cross-fades in over the resolved three.js render at the end of the
          reveal (Phase C). Only rendered once a REAL render replaces the placeholder, so
          today the reveal ends cleanly on the three.js geometry. */}
      {STILL_ENABLED && (
        <div
          ref={stillRef}
          className="pointer-events-none absolute inset-0"
          style={{ opacity: 0, willChange: 'opacity' }}
        >
          <img src={HERO_STILL.src} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Copy band: hidden until the reveal's end, then fades / rises in at the bottom.
          The reveal styles live on the band itself (a transformed wrapper would become
          the containing block and break the absolute `bottom-0`). */}
      <div
        ref={copyRef}
        className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-paperVellum via-paperVellum/75 to-transparent px-6 pb-10 pt-28 md:px-10 md:pb-12"
        style={{ opacity: 0, transform: 'translateY(24px)', willChange: 'opacity, transform' }}
      >
        <div className="mx-auto max-w-[1120px]">
          <HeroCopy edenRef={edenRef} />
        </div>
      </div>
    </section>
  );
}

export function HeroReveal({ reduced }: { outputs: EngineOutputs; reduced: boolean }) {
  // Client-rendered SPA (createRoot, no hydration). On the server (tests) there is no
  // window -> poster (copy present). In the browser we decide synchronously on the first
  // frame, so there is no poster flash before the timed hero appears.
  const isBrowser = typeof window !== 'undefined';
  const webgl = isBrowser && webglSupported();
  const mode = heroMode({ isBrowser, webgl, reduced });

  if (mode === 'scrub') return <AutoHero />;
  if (mode === 'staticRender') return <StaticRenderHero />;
  return <PosterHero />;
}
