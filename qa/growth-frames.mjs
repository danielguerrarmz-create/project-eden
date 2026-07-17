/**
 * qa/growth-frames.mjs — watch the branches grow, with MOTION ON.
 *
 *   node qa/growth-frames.mjs [outDir]
 *
 * The reduced-motion QA harness structurally CANNOT see this feature: reduced motion settles the
 * whole drawing instantly, fully grown, which is the correct behaviour and also the absence of the
 * thing under test. So this script runs with motion live and walks the camera down the track,
 * sampling frames — the growth is a claim about a sequence, and a sequence needs a sequence.
 *
 * It also measures, at each stop, how much of the ornament is inked, so "it grows" is a number and
 * not an impression: the count of visible sub-branch stems must RISE monotonically as the camera
 * descends, and the foliage must trail the stems rather than lead them.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const OUT = process.argv[2] ?? '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await sleep(1000);
// Shift cancels the autoplay without scrolling (End jumps to the document bottom).
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');
await sleep(400);
// Let the off-thread paint land, so what we watch is the REVEAL and not the painting.
await sleep(9000);

const seek = (frac) =>
  page.evaluate((f) => {
    const t = document.querySelector('[data-timeline-track]');
    const r = t.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY + (r.height - window.innerHeight) * f);
  }, frac);

const settle = async () => {
  const cam = () => page.evaluate(() => +document.querySelector('[data-timeline-track] svg').getAttribute('viewBox').split(' ')[1]);
  let prev = await cam();
  for (let i = 0; i < 25; i++) {
    await sleep(350);
    const now = await cam();
    if (Math.abs(now - prev) < 0.01) break;
    prev = now;
  }
};

const rows = [];
const FRACS = [0.06, 0.14, 0.22, 0.30, 0.38, 0.46, 0.54];
for (const f of FRACS) {
  for (let i = 0; i < 3; i++) { await seek(f); await sleep(500); }
  await settle();
  await sleep(500);
  const m = await page.evaluate(() => {
    const svg = document.querySelector('[data-timeline-track] svg');
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    // Stems: a branch is INKED once its dash has paid out any length at all.
    const stems = [...svg.querySelectorAll('g[pointer-events="none"] > path')].filter((p) => p.getAttribute('stroke-opacity') === '0.62');
    let drawn = 0;
    let fully = 0;
    for (const p of stems) {
      const da = p.getAttribute('stroke-dasharray');
      const doff = p.getAttribute('stroke-dashoffset');
      if (da === null) { drawn++; fully++; continue; }      // no dash = fully grown
      const len = parseFloat(da); const off = parseFloat(doff);
      if (len - off > 0.5) drawn++;
    }
    // THE ORPHAN CHECK. Every visible organ disc must sit on a twig that is inked THAT FAR ALONG.
    // The first cut revealed organs by a horizontal wipe, which uncovered blossoms whose branch had
    // not drawn — 195 of 332 organs sit above their own root, so this was most of them. The mask
    // now keys each disc to its branch's growth, and this is the assertion that it stays that way.
    const discs = [...svg.querySelectorAll('#sub-organ-mask circle')];
    let visibleDiscs = 0;
    let orphans = 0;
    for (const c of discs) {
      const o = parseFloat(c.getAttribute('opacity') ?? '1');
      if (o <= 0.01) continue;
      visibleDiscs++;
      // Is there any inked stem whose stroke passes near this disc's centre? Cheap proxy: the
      // nearest inked stem point. A visible organ with no ink within a disc radius is floating.
      const cx = +c.getAttribute('cx');
      const cy = +c.getAttribute('cy');
      let near = Infinity;
      for (const p of stems) {
        const da = p.getAttribute('stroke-dasharray');
        const off = parseFloat(p.getAttribute('stroke-dashoffset') ?? '0');
        const total = p.getTotalLength();
        const inkedLen = da === null ? total : total - off;
        if (inkedLen <= 0.5) continue;
        // Walk only the INKED part of this stem.
        for (let l = 0; l <= inkedLen; l += 12) {
          const q = p.getPointAtLength(l);
          const d = Math.hypot(q.x - cx, q.y - cy);
          if (d < near) near = d;
          if (near < 90) break;
        }
        if (near < 90) break;
      }
      if (near > 90) orphans++;
    }
    return {
      camY: +vb[1].toFixed(0),
      stemsMounted: stems.length,
      stemsInked: drawn,
      stemsFull: fully,
      visibleDiscs,
      orphans,
    };
  });
  rows.push({ frac: f, ...m });
  await page.screenshot({ path: `${OUT}/grow-${String(Math.round(f * 100)).padStart(2, '0')}.png` });
}
console.table(rows);

const fail = [];
// THE CLAIM: the ornament is not all there from the first frame, and more of it is there as the
// camera descends. A tree that is complete at frac 0.06 is not growing, it is just present.
const inked = rows.map((r) => r.stemsInked);
if (inked[0] >= inked[inked.length - 1]) fail.push('the ornament does not grow: inked stems did not rise across the descent');
for (let i = 1; i < inked.length; i++) {
  if (inked[i] < inked[i - 1] - 2) fail.push(`stems UN-drew between ${rows[i - 1].frac} and ${rows[i].frac} (${inked[i - 1]} -> ${inked[i]})`);
}
// THE FOLIAGE MUST NEVER LEAD ITS OWN TWIG. This is the claim the horizontal wipe could not make.
for (const r of rows) {
  if (r.orphans > 0)
    fail.push(`${r.orphans} organ(s) uncovered with no inked twig under them at frac ${r.frac} — floating flowers`);
}
if (!rows.some((r) => r.visibleDiscs > 0)) fail.push('no organ discs ever became visible — the foliage never arrives');
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log(`\nPASS — the ornament grows as the camera descends. Frames in ${OUT}/grow-*.png`);
