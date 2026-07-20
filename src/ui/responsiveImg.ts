/**
 * responsiveImg.ts — build a `srcset` from the generated width-variant manifest.
 *
 * `scripts/gen-image-variants.mjs` emits `<name>-<w>w.webp` beside each eligible photo and records
 * `src/data/imageVariants.generated.json` (source URL → { natural width, generated widths }). This
 * reads that manifest so an `<img>` can offer the browser 400/800/1280px candidates plus the full-res
 * original, and let it pick by the `sizes` hint — a phone pulls ~400-800px instead of a 0.5-1.1MB
 * plate. A source with no manifest entry (a small image, or a PNG line-drawing left un-varianted)
 * returns undefined, and the caller keeps its plain `src`.
 */
import VARIANTS from '../data/imageVariants.generated.json';

type VariantEntry = { w: number; variants: number[] };
const MANIFEST = VARIANTS as Record<string, VariantEntry>;

/** The srcset for `src`, or undefined when no variants were generated for it. The original is included
 *  as the top candidate at its natural width, so desktop and hi-DPI still resolve to full quality. */
export function srcSetFor(src: string): string | undefined {
  const entry = MANIFEST[src];
  if (!entry) return undefined;
  const base = src.replace(/\.(webp|jpe?g)$/i, '');
  const parts = entry.variants.map((w) => `${base}-${w}w.webp ${w}w`);
  parts.push(`${src} ${entry.w}w`);
  return parts.join(', ');
}

/** `sizes` presets. The value is the CSS width the image actually renders at, per viewport, so the
 *  browser can pick the smallest candidate that still covers the cell. Keep these honest against the
 *  real layout — a `sizes` that overstates the width defeats the whole point by pulling a bigger file. */
export const SIZES = {
  /** A full-width card in the mobile About timeline (content column minus gutter + spine indent). */
  timelineCard: '(max-width: 480px) calc(100vw - 5.5rem), (max-width: 1023px) calc(100vw - 7rem), 640px',
  /** A project gallery plate: full width on phones, roughly half on tablets, a fixed cell on desktop. */
  galleryPlate: '(max-width: 640px) calc(100vw - 2.5rem), (max-width: 1024px) calc(50vw - 2rem), 640px',
  /** A full-bleed photo band (product / splash), one column on phones, two above md. */
  photoBand: '(max-width: 768px) 100vw, 50vw',
} as const;
