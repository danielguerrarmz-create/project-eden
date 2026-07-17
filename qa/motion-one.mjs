/**
 * qa/motion-one.mjs — ONE motion, everywhere. MOTION ON.
 *
 *   node qa/motion-one.mjs        (needs the dev server on :5333)
 *
 * Daniel: "Make sure that all flowers on site, the founder ones and the ones below, appear in the
 * same motion as the timeline ones."
 *
 * The claim is not "each region animates". It is that all three do the SAME thing, so the page reads
 * as one plant growing rather than three regions in three dialects. What that means mechanically is
 * that each region is PARTIAL somewhere in the middle of its own approach — a region that is 0 then
 * 1 with nothing between is popping, which is the exact defect.
 *
 * The reduced-motion harness structurally cannot see this (it settles everything instantly, fully
 * grown), so motion must be ON.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?species=spine-2#/about`, { waitUntil: 'domcontentloaded' });
await sleep(1000);
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');
// Let the cold paint land first: what we are watching is the REVEAL, not the painting.
await sleep(26000);

/** A region is "partial" when something in it is mid-draw: a dash paid out but not finished, or a
 *  reveal disc at an opacity strictly between transparent and opaque. */
const sample = () =>
  page.evaluate(() => {
    const partialDash = (els) =>
      [...els].filter((p) => {
        const da = p.getAttribute('stroke-dasharray');
        if (da === null) return false;
        const len = parseFloat(da);
        const off = parseFloat(p.getAttribute('stroke-dashoffset') ?? '0');
        const g = 1 - off / (len || 1);
        return g > 0.02 && g < 0.98;
      }).length;
    const partialDisc = (els) =>
      [...els].filter((c) => {
        const o = parseFloat(c.getAttribute('opacity') ?? '1');
        return o > 0.02 && o < 0.98;
      }).length;

    const tl = document.querySelector('[data-timeline-track] svg');
    const paren = document.querySelector('[data-paren-trunk]')?.ownerSVGElement;
    const coda = document.querySelector('#coda-mask')?.ownerSVGElement;
    return {
      y: Math.round(window.scrollY),
      timeline: tl ? partialDash(tl.querySelectorAll('path[stroke-opacity="0.62"]')) + partialDisc(tl.querySelectorAll('#sub-organ-mask circle')) : -1,
      founders: paren ? partialDash(paren.querySelectorAll('path')) + partialDisc(paren.querySelectorAll('#paren-organ-mask circle')) : -1,
      coda: coda ? partialDash(coda.querySelectorAll('#coda-mask path')) + partialDisc(coda.querySelectorAll('#coda-mask circle')) : -1,
    };
  });

const H = await page.evaluate(() => document.documentElement.scrollHeight);
const seen = { timeline: 0, founders: 0, coda: 0 };
const rows = [];
for (let y = 0; y < H; y += 260) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await sleep(140);
  const s = await sample();
  for (const k of ['timeline', 'founders', 'coda']) if (s[k] > 0) seen[k]++;
  if (s.timeline > 0 || s.founders > 0 || s.coda > 0) rows.push(s);
}

console.log('scroll positions where each region was caught MID-GROWTH:');
console.table(seen);
console.log('sample of partial frames:');
console.table(rows.slice(0, 8));

const fail = [];
for (const k of ['timeline', 'founders', 'coda']) {
  if (seen[k] === 0)
    fail.push(`${k}: never caught mid-growth — it POPS (0 to 1 with nothing between), which is the defect.`);
}
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — all three regions grow, in the same motion.');
