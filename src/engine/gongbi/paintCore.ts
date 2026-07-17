/**
 * paintCore.ts — grow one quality-gated gongbi painting. Environment-agnostic:
 * this exact code runs inside the paint worker (OffscreenCanvas) and, as a
 * fallback, on the main thread (HTMLCanvasElement) — the vendored module picks
 * the right canvas per environment.
 *
 * The curation loop is the whole point of this file: a commission seed is tried
 * first, and if the grown painting fails the quality gate (ghost genomes are a
 * real outcome of the faithful genome distribution — see quality.ts) we walk the
 * deterministic re-roll ladder and hang the first passer, or the best scorer if
 * the whole ladder fails. Worst case is ~6 paints for one slot, which is why this
 * runs in a worker and every result is cached by the painter client.
 */
import { createFlora } from '../../vendor/nonflowers/nonflowers';
import { inkTune } from './garland';
import {
  candidateSeeds,
  measureBounds,
  measurePlant,
  passesGate,
  scorePlant,
  type PlantBounds,
  type PlantStats,
} from './quality';

export type Archetype = 'woody' | 'herbal';

/** 'pigment' = the genome's own palette; 'ink' = the practice's blue only (see garland.ts). */
export type Voice = 'ink' | 'pigment';

/** Either canvas flavor; both support the 2d ops the renderer and measurer need. */
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface PaintedPlant {
  canvas: AnyCanvas;
  /** The ladder seed that actually grew this painting (the honest signature). */
  chosenSeed: string;
  /** Measured stats of the hung painting, surfaced in the lab for tuning. */
  stats: PlantStats;
  /** Where the plant sits on the canvas, for matting the draw (null = empty layer). */
  bounds: PlantBounds | null;
}

function plantData(canvas: AnyCanvas, size: number): Uint8ClampedArray {
  // Both canvas flavors expose a 2d context with getImageData; TS just cannot
  // unify the two lib signatures, hence the local cast.
  const ctx = (canvas as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
  return ctx.getImageData(0, 0, size, size).data;
}

/**
 * Grow the commission on a transparent ground at `size` px square, curating
 * through the re-roll ladder. Deterministic: same arguments, same painting.
 */
export function paintPlant(seed: string, kind: Archetype, size = 1200, voice: Voice = 'pigment'): PaintedPlant {
  let best: PaintedPlant | null = null;
  for (const candidate of candidateSeeds(seed)) {
    const t0 = performance.now();
    const flora = createFlora(candidate);
    const { canvas } = flora.generate({
      size,
      kind,
      paper: 'none',
      tune: voice === 'ink' ? inkTune : undefined,
    });
    const tPaint = performance.now();
    const data = plantData(canvas, size);
    const stats = measurePlant(data, size, size);
    const painted: PaintedPlant = {
      canvas,
      chosenSeed: candidate,
      stats,
      bounds: measureBounds(data, size, size),
    };
    const pass = passesGate(stats);
    // Timing at debug level: the paint room's ledger. Cheap, and it has already
    // caught one mis-calibrated gate; keep it.
    console.debug(
      `gongbi paint "${candidate}" ${kind}: ${Math.round(tPaint - t0)}ms paint, ${Math.round(
        performance.now() - tPaint,
      )}ms measure, coverage ${stats.coverage.toFixed(3)}, ink ${stats.ink.toFixed(3)} → ${pass ? 'hang' : 'reroll'}`,
    );
    if (pass) return painted;
    if (!best || scorePlant(stats) > scorePlant(best.stats)) best = painted;
  }
  // The whole ladder was pale — hang the least faint take rather than nothing.
  return best as PaintedPlant;
}

/**
 * The shared aged-paper tile every mount is built from (upstream's PAPER_COL1
 * warm speckled cream). One fixed seed so every mount on the page is cut from
 * the same sheet.
 */
export function paintPaperTile(): AnyCanvas {
  return createFlora('bower/paper-stock').paper({});
}
