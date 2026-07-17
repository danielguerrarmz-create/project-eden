/**
 * FanPainting.tsx — one commissioned gongbi painting, hung properly.
 *
 * The slot is complete from first paint: the mount (aged-paper squircle cut from the
 * shared tile in painter.ts) or a reserved square of vellum, the caption already
 * typeset, and — instantly — the UNDERDRAWING: the site's existing one-ink SVG
 * botanical engine sketching the commission's seed in the practice's blue. When the
 * painting room (the worker) delivers the finished painting, the sketch cross-fades
 * into it. The metaphor is honest by construction: the sketch is the engine's own
 * hand at the same seed, not a preview of the painting's silhouette — the studio
 * sketches first, the commission arrives after. Layout never shifts on arrival.
 *
 * Captions sign with the seed that ACTUALLY grew the work (the quality gate in
 * quality.ts may have walked the re-roll ladder), so provenance on the page is real:
 * type the printed seed into the lab and you get this exact painting back.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { growWild } from '../../engine/botanical';
import { requestPainting, requestPaperTile, type Painting } from '../../engine/gongbi/painter';
import { matRect } from '../../engine/gongbi/quality';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { INK_SEPIA } from './CrossPathsTimeline';
import type { Commission } from './paintings';

/** Upstream paints plant layers on a 1200px square; one native size, one cache entry per seed. */
const NATIVE_PX = 1200;
/** The mount's flat tone, shown for the frame or two before the shared tile resolves. */
const AGED_PAPER = '#F2E2B7';

/** Ask the painting room for a commission once `active`; identical asks coalesce in painter.ts. */
export function usePainting(commission: Commission, active: boolean): Painting | null {
  const [painting, setPainting] = useState<Painting | null>(null);
  useEffect(() => {
    if (!active || painting) return;
    let mounted = true;
    // (voice rides the commission so ink-page and pigment-page copies coexist in cache)
    requestPainting(commission.seed, commission.kind, NATIVE_PX, commission.voice ?? 'pigment').then(
      (p) => {
        if (mounted) setPainting(p);
      },
      (err: unknown) => {
        // A failed paint leaves the underdrawing hanging — a sketch is a real
        // artwork here, not an error state — but the failure itself must be
        // loud, or a broken painting room looks like taste.
        console.error(`gongbi commission "${commission.seed}" failed:`, err);
      },
    );
    return () => {
      mounted = false;
    };
  }, [commission.seed, commission.kind, commission.voice, active, painting]);
  return painting;
}

export function FanPainting({
  commission,
  size,
  eager = false,
  caption = true,
  showStats = false,
  className = '',
}: {
  commission: Commission;
  /** Display width in CSS px (the slot is square); also the DPR draw budget. */
  size: number;
  /** Paint immediately instead of waiting for the viewport to come near. */
  eager?: boolean;
  /** The mono provenance line under the work. On by default — the label is printed first. */
  caption?: boolean;
  /** Lab only: append the measured stats to the caption for curation. */
  showStats?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const holderRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(eager);

  // The page hangs exactly seven commissions, so every slot paints this session —
  // no scroll-lookahead. (An IntersectionObserver version shipped first and lost
  // paintings: a fast scroll plus one long main-thread task can carry an element
  // clean through the observation margin between callbacks, and the slot starves.)
  // The 2s grace keeps the eager hero first in the worker queue; the cache means
  // a re-mounted slot is instant.
  useEffect(() => {
    if (near) return;
    const t = window.setTimeout(() => setNear(true), 2000);
    return () => window.clearTimeout(t);
  }, [near]);

  const painting = usePainting(commission, near);

  // The mount: every mounted painting is cut from the same aged-paper sheet.
  const mounted = commission.mode === 'mounted';
  const [paperUrl, setPaperUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    let on = true;
    requestPaperTile().then((url) => {
      if (on) setPaperUrl(url);
    });
    return () => {
      on = false;
    };
  }, [mounted]);

  // The underdrawing: instant, deterministic, the engine's own single-ink hand.
  const sketch = useMemo(() => growWild(commission.seed), [commission.seed]);

  // Blit the finished bitmap at display resolution (cap at native 1200), MATTED:
  // upstream composes plants small and low on the square (fan negative space), so
  // the draw is cropped to the plant's padded bounding box — the painting fills its
  // frame the way a mounted specimen fills a mat. Base-anchored, so trunks stay
  // grounded at the bottom edge. Mounts get a hair more air than bare plants.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !painting) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.min(NATIVE_PX, Math.round(size * dpr));
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (painting.bounds) {
      const { sx, sy, side } = matRect(painting.bounds, NATIVE_PX, mounted ? 0.12 : 0.05);
      ctx.drawImage(painting.bitmap, sx, sy, side, side, 0, 0, px, px);
    } else {
      ctx.drawImage(painting.bitmap, 0, 0, px, px);
    }
  }, [painting, size, mounted]);

  const fade = reduced ? '' : mounted ? 'transition-opacity duration-[600ms]' : 'transition-opacity duration-[900ms]';
  const signature = painting?.chosenSeed ?? commission.seed;
  const stats = painting?.stats;

  return (
    <figure ref={holderRef} data-painted={painting ? 'true' : 'false'} className={`w-full ${className}`} style={{ maxWidth: size }}>
      <div
        className={`relative aspect-square w-full overflow-hidden ${
          mounted ? 'rounded-[22%] shadow-[inset_0_0_0_1px_rgba(23,22,15,0.08)]' : ''
        }`}
        style={
          mounted
            ? {
                backgroundColor: AGED_PAPER,
                backgroundImage: paperUrl ? `url(${paperUrl})` : undefined,
                backgroundSize: '256px 256px',
              }
            : undefined
        }
      >
        {/* Underdrawing: bottom-anchored like a plant, inset so the sketch sits inside the mount. */}
        <svg
          aria-hidden
          viewBox={sketch.viewBox}
          preserveAspectRatio="xMidYMax meet"
          className={`absolute inset-[12%] h-[76%] w-[76%] ${fade}`}
          style={{ opacity: painting ? 0 : 0.55 }}
        >
          {sketch.paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              // RE-COLOURED to the page's ink, not `p.stroke`. growWild comes from the shared
              // botanical module, which carries its own INK_BLUE and serves other pages that
              // still want it — so the sketch arrives blue and has to be re-keyed here, the
              // same way the timeline re-keys its calyx through sprigPathStyle. This is not
              // cosmetic: the underdrawing is FULLY VISIBLE for the seconds before the painting
              // lands, so leaving it alone put blue back on a page that just retired it.
              stroke={INK_SEPIA}
              strokeWidth={p.strokeWidth}
              fill={p.fill === 'none' ? 'none' : INK_SEPIA}
              fillOpacity={p.fillOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={commission.alt}
          className={`absolute inset-0 h-full w-full ${fade}`}
          style={{ opacity: painting ? 1 : 0 }}
        />
      </div>
      {caption && (
        <figcaption className="mt-3 font-mono text-[11px] tracking-[0.08em] text-inkBlack/60">
          {commission.kind} · seed “{signature}”
          {showStats && stats
            ? ` · coverage ${stats.coverage.toFixed(3)} · ink ${stats.ink.toFixed(3)} · chroma ${stats.chroma.toFixed(3)}`
            : null}
        </figcaption>
      )}
    </figure>
  );
}
