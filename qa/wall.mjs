/**
 * qa/wall.mjs — the media wall, measured on the rendered page.
 *
 *   node qa/wall.mjs [height] [width]      (needs the dev server on :5333)
 *
 * Daniel, 2026-07-17: "all of these photos are like bricks, there must be an equal line of mortar
 * between them, and that must be very thin. There are too many spacings between."
 *
 * This asks the RENDERED page his three questions, per project:
 *
 *   1. IS EVERY BOX BUILT TO ITS PICTURE? Each cell's rect against the <img>'s own naturalWidth /
 *      naturalHeight — i.e. against THE FILE, not against the number authored in projects.ts. That
 *      makes this a guard on the authored ratios too: `ratio: 1.8305` being wrong is invisible in a
 *      unit test (which would just believe it) and shows up here as a deviation. pack.test.ts checks
 *      the pack against the authored ratios; only a browser can check the authored ratios against
 *      the assets. NEITHER TEST IMPLIES THE OTHER.
 *
 *   2. IS ANYTHING CROPPED OR CLIPPED? Two mechanisms, two questions, named separately, because
 *      collapsing them under the word "crop" is what let a false "hero crop 0%" sit in CLAUDE.md for
 *      rounds (see qa/project-media.mjs's header — that lesson was expensive and it is not re-learnt
 *      here). `object-contain` on every brick makes the object-fit crop structurally impossible; the
 *      clip is still worth asking, because it is an ANCESTOR's paint and no amount of correct sizing
 *      on the element prevents it.
 *
 *   3. HOW BIG IS THE WIDEST HOLE? The mortar question itself, measured the way pack.test.ts measures
 *      it (distance transform of the paper between the bricks) but on the REAL rects rather than on
 *      the packer's own arithmetic. If the packer and the browser disagree — a rounding, a border, a
 *      stray margin — this is the only thing that would notice.
 *
 * IT TAKES A VIEWPORT, both dimensions, and that is not optional on this page. The region's ratio
 * moves with the window, the pack's answer moves with the region, and every defect Daniel has caught
 * here was one a viewport-pinned harness structurally could not see. Run it at 900 AND 760.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const VH = Number(process.argv[2] ?? 900);
const VW = Number(process.argv[3] ?? 1440);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sub-pixel rounding only. */
const SLOP = 1.5;
/** The mortar, from pack.ts. A hole wider than this + the raster's own step is a hole. */
const MORTAR = 6;
/** pack.ts's MIN_SIDE. The live page shipped a 51px side before the wall, so this is not a tightening. */
const MIN_SIDE = 50;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', `--window-size=${VW},${VH}`],
});
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:5333/?species=spine-2#/about', { waitUntil: 'domcontentloaded' });
await sleep(9000);

const names = await page.evaluate(() =>
  [...document.querySelectorAll('nav ol button')].map((b) => (b.textContent || '').trim().slice(0, 22)),
);

const rows = [];
for (let i = 0; i < names.length; i++) {
  await page.evaluate((k) => document.querySelectorAll('nav ol button')[k]?.click(), i);
  // WAIT FOR THE THING, NOT THE CLOCK (CLAUDE.md). The wall is packed from a ResizeObserver reading,
  // so on the frame a project mounts there is no wall at all. Poll for the cells to exist and for
  // their geometry to stop moving, and report a HARNESS failure rather than a layout one if they
  // never arrive — a probe that measures an unmounted wall reports a beautiful 0 and means nothing.
  const settled = await page
    .waitForFunction(
      () => {
        const cells = document.querySelectorAll('[data-wall-cell]');
        if (!cells.length) return false;
        const key = [...cells].map((c) => { const r = c.getBoundingClientRect(); return `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)}`; }).join('|');
        const same = window.__wallKey === key;
        window.__wallKey = key;
        return same;
      },
      { timeout: 12000, polling: 120 },
    )
    .then(() => true)
    .catch(() => false);
  if (!settled) {
    console.error(`HARNESS FAILURE: ${names[i]}'s wall never settled. Nothing below is a verdict.`);
    await browser.close();
    process.exit(1);
  }

  rows.push(
    await page.evaluate(() => {
      const region = document.querySelector('[data-project-detail] > :first-child');
      const wall = document.querySelector('[data-project-wall]');
      const cells = [...document.querySelectorAll('[data-wall-cell]')];
      const band = document.querySelector('[data-project-detail] > :last-child');
      const rg = region.getBoundingClientRect();
      const bb = band?.getBoundingClientRect();

      const info = cells.map((cell) => {
        const cr = cell.getBoundingClientRect();
        const el = cell.querySelector('img, video');
        const er = el?.getBoundingClientRect();
        const nat = !el ? 0 : el.tagName === 'IMG' ? el.naturalWidth / el.naturalHeight : (el.videoWidth || 0) / (el.videoHeight || 1);
        return {
          cr,
          // THE BOX vs THE FILE. Not the box vs the authored number — the file is the only ground truth.
          ratioOffPct: nat && cr.height ? (Math.abs(cr.width / cr.height - nat) / nat) * 100 : 0,
          // The element against the box that clips it. A clipped element's own rect is innocent.
          clipPct: er && cr.height ? (Math.max(0, er.height - cr.height) / er.height) * 100 : 0,
          hero: cell.hasAttribute('data-project-hero'),
        };
      });

      // THE WIDEST HOLE, from the real rects. Distance transform of the paper inside the wall's own
      // box: a mortar line scores its width however long it runs; a hole scores its narrow side.
      const wr = wall.getBoundingClientRect();
      const nx = Math.floor(wr.width);
      const ny = Math.floor(wr.height);
      const boxes = info.map((c) => ({ x: c.cr.x - wr.x, y: c.cr.y - wr.y, w: c.cr.width, h: c.cr.height }));
      const BIG = nx + ny;
      const d = new Int32Array(nx * ny);
      for (let iy = 0; iy < ny; iy++)
        for (let ix = 0; ix < nx; ix++) {
          const px = ix + 0.5;
          const py = iy + 0.5;
          const on = boxes.some((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
          d[iy * nx + ix] = on ? 0 : BIG;
        }
      const at = (ix, iy) => (ix < 0 || iy < 0 || ix >= nx || iy >= ny ? 0 : d[iy * nx + ix]);
      for (let iy = 0; iy < ny; iy++)
        for (let ix = 0; ix < nx; ix++) {
          const i = iy * nx + ix;
          if (d[i] === 0) continue;
          d[i] = Math.min(d[i], at(ix - 1, iy) + 1, at(ix, iy - 1) + 1, at(ix - 1, iy - 1) + 1, at(ix + 1, iy - 1) + 1);
        }
      for (let iy = ny - 1; iy >= 0; iy--)
        for (let ix = nx - 1; ix >= 0; ix--) {
          const i = iy * nx + ix;
          if (d[i] === 0) continue;
          d[i] = Math.min(d[i], at(ix + 1, iy) + 1, at(ix, iy + 1) + 1, at(ix + 1, iy + 1) + 1, at(ix - 1, iy + 1) + 1);
        }
      let worst = 0;
      for (let i = 0; i < nx * ny; i++) if (d[i] > worst) worst = d[i];

      const picArea = boxes.reduce((s, b) => s + b.w * b.h, 0);
      return {
        cells: cells.length,
        regionW: +rg.width.toFixed(1),
        regionH: +rg.height.toFixed(1),
        coverPct: +(((wr.width * wr.height) / (rg.width * rg.height)) * 100).toFixed(1),
        inkPct: +((picArea / (rg.width * rg.height)) * 100).toFixed(1),
        holePx: worst * 2,
        worstRatioOff: +Math.max(...info.map((c) => c.ratioOffPct)).toFixed(1),
        worstClipPct: +Math.max(...info.map((c) => c.clipPct)).toFixed(1),
        minSide: Math.round(Math.min(...boxes.map((b) => Math.min(b.w, b.h)))),
        outOfRegion: +Math.max(0, wr.right - rg.right, wr.bottom - rg.bottom).toFixed(1),
        intoBand: bb ? +(wr.bottom - bb.top).toFixed(1) : -999,
        licensedCrops: document.querySelectorAll('[data-licensed-crop]').length,
      };
    }),
  );
}
await browser.close();

console.table(rows.map((r, i) => ({ project: names[i], ...r })));

// GUARD THE PROBE BEFORE THE VERDICT. Every check below iterates `rows`; an empty list satisfies all
// of them, and this harness's ancestor once printed "PASS across all 0 projects" while the page would
// not compile. A green that means "I found nothing to look at" is indistinguishable from "I looked and
// it was fine", and it was nearly believed as a baseline.
if (rows.length < 12) {
  console.error(`\nHARNESS FAILURE: only ${rows.length} of 12 projects measured. Nothing above is a verdict.`);
  process.exit(1);
}

const fail = [];
rows.forEach((r, i) => {
  const n = names[i];
  if (r.cells === 0) fail.push(`${n}: the wall rendered NO cells — it did not pack`);
  // The law: the box IS the picture. Measured against the FILE, so this also fails on a wrong
  // authored ratio in projects.ts.
  if (r.worstRatioOff > 2) fail.push(`${n}: a brick is ${r.worstRatioOff}% off its file's real ratio (bad authored ratio, or a squashed box)`);
  if (r.worstClipPct > 0.5) fail.push(`${n}: a brick is CLIPPED ${r.worstClipPct}% by an ancestor's overflow`);
  if (r.holePx > MORTAR + 2) fail.push(`${n}: a ${r.holePx}px hole inside the wall — the mortar is not uniform`);
  if (r.minSide < MIN_SIDE) fail.push(`${n}: a brick's short side is ${r.minSide}px — a sliver`);
  if (r.outOfRegion > SLOP) fail.push(`${n}: the wall runs ${r.outOfRegion}px outside its region`);
  if (r.intoBand > SLOP) fail.push(`${n}: the wall collides ${r.intoBand}px into the info band`);
  // NOT `> 1`. The wall builds every box to its picture, so it needs no licence at all and spends
  // none: the honest count is ZERO. `fillHero` stays in projects.ts as Daniel's ruling on the record
  // (and projects.test.ts still pins its scope by src), but if one ever gets SPENT again, that is a
  // crop back on the page and it should have to be argued for, not appear.
  if (r.licensedCrops > 0) fail.push(`${n}: ${r.licensedCrops} licensed crop(s) rendered — the wall should need none`);
});

const inks = rows.map((r) => r.inkPct);
console.log(
  `\npicture coverage of the region: min ${Math.min(...inks)}%  mean ${(inks.reduce((a, b) => a + b, 0) / inks.length).toFixed(1)}%` +
    `   (the hero/rail layout this replaced: min 73.8%, mean 87.3% at 1440x900)`,
);
console.log(`widest hole per project: ${rows.map((r) => r.holePx).join(', ')}px   (before: 12, 12, 12, 172, 12, 169, 12, 12, 12, 12, 219, 12)`);

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log(
  `\nPASS at ${VW}x${VH} — across all ${rows.length} projects: every brick is its picture's own shape ` +
    `(checked against the FILE), nothing cropped, nothing clipped, no hole wider than the ${MORTAR}px mortar, ` +
    `no slivers, nothing outside the region. Re-run at 760: the region's ratio moves with the window.`,
);
