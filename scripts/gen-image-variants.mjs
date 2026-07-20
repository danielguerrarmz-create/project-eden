/**
 * scripts/gen-image-variants.mjs — width variants for the raster images the site serves into small
 * cells, so a phone downloads ~400-800px of webp instead of the 0.5-1.1MB full plate.
 *
 *   node scripts/gen-image-variants.mjs          generate missing variants + rewrite the manifest
 *   node scripts/gen-image-variants.mjs --force   regenerate even if a variant already exists
 *
 * Emits `<name>-<w>w.webp` beside every eligible source (photos only — webp/jpg; PNG line-drawings
 * and diagrams are left alone so their baked-in text stays crisp) and writes
 * `src/data/imageVariants.generated.json`, a manifest the client's `srcSetFor` reads to build a
 * `srcset` without a filesystem probe. Idempotent: a variant is skipped when it exists and is newer
 * than its source. Downscale only — a width is generated only when it is smaller than the natural one,
 * so nothing is ever upscaled (the site's standing law: never force geometry onto a picture).
 */
import sharp from 'sharp';
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const ROOTS = ['public/assets/projects', 'public/assets/product', 'public/assets/about', 'public/hero'];
const WIDTHS = [400, 800, 1280];
/** Eligible only if the source is at least this wide — otherwise every target width is an upscale. */
const MIN_NATURAL_W = 900;
const QUALITY = 78;
const FORCE = process.argv.includes('--force');
const MANIFEST = 'src/data/imageVariants.generated.json';

const isPhoto = (f) => /\.(webp|jpe?g)$/i.test(f);
const isVariant = (f) => /-\d+w\.webp$/i.test(f);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile() && isPhoto(entry.name) && !isVariant(entry.name)) out.push(p);
  }
  return out;
}

/** '/assets/...' public URL for a file under public/. */
const publicUrl = (p) => '/' + p.replace(/\\/g, '/').replace(/^public\//, '');

const manifest = {};
let made = 0;
let skipped = 0;

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const src of await walk(root)) {
    const meta = await sharp(src).metadata();
    if (!meta.width || meta.width < MIN_NATURAL_W) continue;
    const srcStat = await stat(src);
    const base = src.slice(0, -extname(src).length);
    const widths = WIDTHS.filter((w) => w < meta.width);
    if (!widths.length) continue;
    for (const w of widths) {
      const out = `${base}-${w}w.webp`;
      if (!FORCE && existsSync(out) && (await stat(out)).mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
      await sharp(src).resize({ width: w }).webp({ quality: QUALITY }).toFile(out);
      made++;
    }
    // Store natural width so the client can offer the full-res original as the top srcset candidate.
    manifest[publicUrl(src)] = { w: meta.width, variants: widths };
  }
}

await mkdir(dirname(MANIFEST), { recursive: true });
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');

console.log(
  `variants: ${made} written, ${skipped} up-to-date · manifest: ${Object.keys(sorted).length} sources → ${MANIFEST}`,
);
