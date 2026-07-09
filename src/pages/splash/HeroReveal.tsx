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
import { Suspense, lazy, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { motion, type Variants } from 'framer-motion';
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

/**
 * The product name "Eden" as the hero's one handwritten moment, set in the cursive
 * `handwrite` face (Dancing Script, already loaded in index.html). It is REAL text —
 * legible, selectable, accessible — not the old single hand-authored pen-stroke path,
 * whose filled copy collapsed into an ink blob (a self-intersecting stroke outline can't
 * be filled into a clean glyph).
 *
 * When `revealRef` is given the reveal drives a left-to-right CLIP wipe, so the word
 * appears as if being written by hand; otherwise it renders finished (poster /
 * reduced-motion), where motion is unwelcome.
 */
function EdenWord({
  revealRef,
  className = '',
}: {
  revealRef?: MutableRefObject<HTMLSpanElement | null>;
  className?: string;
}) {
  const driven = !!revealRef;
  return (
    <span
      ref={revealRef}
      role="img"
      aria-label="Eden"
      className={`inline-block font-handwrite font-semibold leading-[0.9] ${className}`}
      // Start fully clipped from the right (hidden) when driven; the reveal opens it
      // left -> right. Negative top/bottom/left insets keep ascenders, descenders and the
      // leading edge un-shaved.
      style={driven ? { clipPath: 'inset(-15% 100% -15% -5%)', willChange: 'clip-path' } : undefined}
    >
      Eden
    </span>
  );
}

/** The hero copy: one outcome headline (with the drawn cursive "Eden") + one mission
 *  line, sized to sit as a slim bottom band so the structure keeps the frame. When the
 *  Eden refs are given, the word is driven by the reveal; else it renders finished. */
/**
 * The hero copy's GROWTH reveal (spec + Daniel's note: the text should grow into place,
 * not fade). Each line rises from its own baseline under an upward clip (like something
 * sprouting) + a slight scale-from-smaller, on a soft spring that settles (no bounce,
 * no linear fade), and the lines stagger so it composes as one orchestrated moment. The
 * cursive "Eden" is excluded — its stroke-draw IS its growth. Reduced-motion never
 * reaches this: those users render the finished state via the non-orchestrated path.
 */
const copyContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.04 } },
};
const growLine: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96, clipPath: 'inset(100% 0% -12% 0%)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    clipPath: 'inset(0% 0% -12% 0%)',
    transition: { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 },
  },
};

function HeroCopy({
  edenRevealRef,
  orchestrate = false,
  show = true,
  onImage = false,
}: {
  edenRevealRef?: MutableRefObject<HTMLSpanElement | null>;
  /** True in the timed reveal: start hidden and grow in when `show` flips. Off elsewhere
   *  (poster / reduced-motion) so the text renders finished with no motion. */
  orchestrate?: boolean;
  show?: boolean;
  /** True when the copy sits over the photographic beauty still: switch to luminous
   *  cream ink (the Eden cursive inherits it) so it reads against the render. Off over
   *  the vellum poster, which keeps the dark house ink. */
  onImage?: boolean;
}) {
  const ink = onImage ? 'text-paperVellum' : 'text-inkBlack';
  const inkSoft = onImage ? 'text-paperVellum/90' : 'text-inkBlack/70';
  return (
    <motion.div
      variants={copyContainer}
      initial={orchestrate ? 'hidden' : 'show'}
      animate={show ? 'show' : 'hidden'}
      className={onImage ? '[text-shadow:0_1px_18px_rgba(0,0,0,0.45)]' : undefined}
    >
      <h1
        className={`max-w-[15ch] font-quote text-[clamp(2rem,4.6vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.02em] ${ink}`}
      >
        <motion.span variants={growLine} className="block origin-bottom will-change-transform">
          Grow a living
        </motion.span>
        {/* The product name is the hero's one display moment: a drawn cursive word on
            its own line, drastically larger than the sentence. Its stroke-draw is its
            own growth, so it sits outside the line-stagger variants. It inherits the
            headline colour, so it goes cream over the render and ink over the poster. */}
        <EdenWord revealRef={edenRevealRef} className="my-1 text-[clamp(4rem,11vw,7.5rem)]" />
        <motion.span variants={growLine} className="block origin-bottom will-change-transform">
          in your garden.
        </motion.span>
      </h1>
      <motion.p
        variants={growLine}
        className={`mt-4 max-w-[36ch] origin-bottom font-serifDisplay text-[17px] leading-snug will-change-transform ${inkSoft}`}
      >
        Rewilding gardens through architecture anyone can build.
      </motion.p>
    </motion.div>
  );
}

/** The beauty still, full-bleed. The render is framed at 3:2 with sky headroom, so a
 *  clean object-cover fills the whole hero with no letterbox bars. object-bottom pins the
 *  image's BOTTOM edge to the viewport, so on short (wide, not-tall) windows the crop eats
 *  the disposable sky headroom off the TOP and the foreground/people stay fully visible. */
function HeroStill() {
  return (
    <img
      src={HERO_STILL.src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-bottom"
    />
  );
}

/** A slim bottom band holding the copy. Over the photographic still (`onImage`) it lays a
 *  soft dark, feathered scrim (a vignette, not a hard block) so the cream copy stands out;
 *  over the vellum poster it stays clean, the dark ink needing no help. */
function CopyBand({ children, onImage = false }: { children: React.ReactNode; onImage?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 pt-40 md:px-10 md:pb-12">
      {onImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent"
        />
      )}
      <div className="relative mx-auto max-w-[1120px]">{children}</div>
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
        <div className="pointer-events-none absolute inset-0">
          <HeroStill />
        </div>
      )}
      <CopyBand onImage={STILL_ENABLED}>
        <HeroCopy onImage={STILL_ENABLED} />
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
  const edenRevealRef = useRef<HTMLSpanElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  // Latched once when the reveal reaches the copy beat: flips the growth reveal on. A
  // ref guards so the rAF loop sets React state exactly once, not every frame.
  const [showCopy, setShowCopy] = useState(false);
  const copyLatch = useRef(false);

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
        // The band fades its vellum gradient in; the per-line growth spring (below,
        // latched) carries the motion, so the band itself no longer translates.
        copyRef.current.style.opacity = String(clamp01((p - ca) / (cb - ca)));
      }
      if (!copyLatch.current && p >= ca) {
        copyLatch.current = true;
        setShowCopy(true); // fire the framer-motion growth reveal, exactly once
      }
      if (edenRevealRef.current) {
        const t = clamp01((p - ea) / (eb - ea));
        // Left-to-right handwriting wipe: open the clip from the right edge (100% -> 0%)
        // so the cursive word appears as if being written by hand.
        edenRevealRef.current.style.clipPath = `inset(-15% ${100 * (1 - t)}% -15% -5%)`;
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
          <HeroStill />
        </div>
      )}

      {/* Copy band: hidden until the reveal's end, then fades / rises in at the bottom.
          The reveal styles live on the band itself (a transformed wrapper would become
          the containing block and break the absolute `bottom-0`). */}
      <div
        ref={copyRef}
        className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 pt-40 md:px-10 md:pb-12"
        style={{ opacity: 0, willChange: 'opacity' }}
      >
        {STILL_ENABLED && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent"
          />
        )}
        <div className="relative mx-auto max-w-[1120px]">
          <HeroCopy edenRevealRef={edenRevealRef} orchestrate show={showCopy} onImage={STILL_ENABLED} />
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
