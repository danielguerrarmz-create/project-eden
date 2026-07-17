/**
 * quality.ts — the curation gate for gongbi paintings.
 *
 * The vendored nonflowers generator (src/vendor/nonflowers) is faithful to Lingdong
 * Huang's original, and the original's genome distribution includes duds: seeds whose
 * flowerChance lands near zero, or whose fade filter washes the whole plant to a ghost.
 * On the demo site you click "regenerate"; on a page where a seed is a permanent
 * commission, we curate instead — deterministically. A slot's base seed is tried first;
 * if its painting fails the gate below, we re-roll through a fixed ladder of suffixed
 * seeds (`seed/2`, `seed/3`, ...) and keep the first that passes, or the best scorer if
 * none do. Same base seed, same ladder, same winner, every visit — the commission holds.
 *
 * Everything here is pure math over raw RGBA bytes so it runs identically in the paint
 * worker and in node tests. The thresholds are TUNED VALUES, calibrated against a real
 * bench run in the gongbi lab on 2026-07-16 (#/lab/gongbi prints each cell's measured
 * stats): healthy plants on the 1200px canvas measure coverage 0.025–0.065, ink
 * 0.007–0.035, chroma 0.10–0.14 — delicate branches are THIN, so coverage runs far
 * lower than intuition suggests. What separates a hangable painting from the washed-out
 * ghost failure mode is dark ink: a faded plant keeps pale wash pixels but loses its
 * dark strokes. Gate primarily on ink, with a low coverage floor.
 */

/** Fractions over the sampled plant-layer pixels (transparent-mode painting). */
export interface PlantStats {
  /** Visible fraction: pixels with alpha above the see-it threshold. */
  coverage: number;
  /** Dark-ink fraction: visible AND dark enough to read on vellum (stems, outlines). */
  ink: number;
  /** Mean chromatic spread (max−min channel) across visible pixels — petal colour. */
  chroma: number;
}

/** Alpha (0–255) below which a pixel is treated as empty paper. */
const VISIBLE_ALPHA = 28;
/** Luminance (0–255) below which a visible pixel counts as ink rather than wash. */
const INK_LUMA = 130;
/** Sampling stride in pixels; 2 halves the work per axis with no measurable drift. */
const STRIDE = 2;

/**
 * Measure a transparent-mode painting from its raw RGBA bytes.
 * `data` is ImageData.data (or any RGBA buffer) for a `w`×`h` canvas.
 */
export function measurePlant(data: Uint8ClampedArray, w: number, h: number): PlantStats {
  let sampled = 0;
  let visible = 0;
  let ink = 0;
  let chromaSum = 0;
  for (let y = 0; y < h; y += STRIDE) {
    for (let x = 0; x < w; x += STRIDE) {
      const i = (y * w + x) * 4;
      sampled += 1;
      const a = data[i + 3];
      if (a < VISIBLE_ALPHA) continue;
      visible += 1;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma < INK_LUMA) ink += 1;
      chromaSum += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    }
  }
  if (sampled === 0) return { coverage: 0, ink: 0, chroma: 0 };
  return {
    coverage: visible / sampled,
    ink: ink / sampled,
    chroma: visible > 0 ? chromaSum / visible : 0,
  };
}

/**
 * The gate a painting must pass to hang without a second look: enough plant on the
 * page to register at display size, and enough dark ink to hold an edge on vellum.
 * Chroma is deliberately NOT gated — all-white blossoms are legitimate gongbi.
 */
export function passesGate(s: PlantStats): boolean {
  return s.coverage >= 0.02 && s.ink >= 0.005;
}

/**
 * Fallback ranking when a whole seed ladder fails the gate: prefer presence, then
 * ink, then colour. Weights bring the three fractions to comparable magnitude.
 */
export function scorePlant(s: PlantStats): number {
  return s.coverage * 2 + s.ink * 30 + s.chroma;
}

/**
 * The deterministic re-roll ladder for a commission seed. The base seed is always
 * first; suffixes count from /2 so a pinned seed like `bower/eden/3` reads naturally
 * as "third take of the eden commission".
 */
export function candidateSeeds(seed: string, tries = 6): string[] {
  const ladder = [seed];
  for (let i = 2; i <= tries; i += 1) ladder.push(`${seed}/${i}`);
  return ladder;
}

/** Pixel-space bounding box of the visible plant (inclusive), or null if empty. */
export interface PlantBounds {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

/**
 * Where the plant actually is. Upstream composes plants small and low on the square
 * canvas (fan-painting negative space); the page mats the draw to this box so a
 * painting fills its mount. Full-resolution scan (no stride): a stray petal at the
 * edge should move the mat, not be missed by it.
 */
export function measureBounds(data: Uint8ClampedArray, w: number, h: number): PlantBounds | null {
  let xmin = w;
  let ymin = h;
  let xmax = -1;
  let ymax = -1;
  for (let y = 0; y < h; y += 1) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      if (data[row + x * 4 + 3] < VISIBLE_ALPHA) continue;
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
  }
  return xmax < 0 ? null : { xmin, ymin, xmax, ymax };
}

/**
 * The square source rectangle that mats a plant into its frame: the bounding box
 * padded by `pad` of its long side, squared, base-anchored (the trunk stays at the
 * bottom of the mat, like a mounted specimen), clamped to the canvas.
 */
export function matRect(
  bounds: PlantBounds,
  canvasSize: number,
  pad = 0.08,
): { sx: number; sy: number; side: number } {
  const w = bounds.xmax - bounds.xmin + 1;
  const h = bounds.ymax - bounds.ymin + 1;
  const padding = Math.round(Math.max(w, h) * pad);
  const side = Math.min(canvasSize, Math.max(w, h) + 2 * padding);
  const cx = (bounds.xmin + bounds.xmax) / 2;
  const sx = Math.round(Math.min(Math.max(cx - side / 2, 0), canvasSize - side));
  const sy = Math.round(Math.min(Math.max(bounds.ymax + padding - side, 0), canvasSize - side));
  return { sx, sy, side };
}
