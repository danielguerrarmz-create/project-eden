/**
 * qa/project-media.mjs — the supporting rail stays inside its region, on every project.
 *
 *   node qa/project-media.mjs        (needs the dev server on :5333)
 *
 * Daniel: "every project seems to make the same mistake with the images overlapping and passing
 * their dedicated boundary." His annotated Dougherty screenshot shows the right-hand stack running
 * past the bottom of its region into the "WHAT WE LEARNED" pill.
 *
 * WHY THIS CANNOT HAPPEN ON HEAD, and why it is still worth a test: `stackRatio` DERIVES the rail's
 * width from the height it is given (width = height * 1/sum(1/ratio)), so the cells at that width
 * sum to exactly the height. The stack fits by construction rather than by tuning — which is
 * precisely the kind of invariant that a later "just make the rail a bit wider" quietly destroys.
 *
 * It also checks the two sins that a naive fix would reintroduce: a cropped cell, and a sliver.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sub-pixel rounding only. Anything more is the rail past its box. */
const SLOP = 1.5;
/** Below this a cell is a sliver, not a picture. Archipedia's 0.46-ratio shot came out 38px wide
 *  once; the narrowest honest cell measured across all twelve is 148. */
const MIN_CELL = 60;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:5333/?species=spine-2#/about', { waitUntil: 'domcontentloaded' });
await sleep(9000);

const names = await page.evaluate(() => [...document.querySelectorAll('nav ol button')].map((b) => (b.textContent || '').trim().slice(0, 24)));
const rows = [];
for (let i = 0; i < names.length; i++) {
  await page.evaluate((k) => document.querySelectorAll('nav ol button')[k]?.click(), i);
  await sleep(500);
  rows.push(
    await page.evaluate(() => {
      const rail = document.querySelector('[data-project-rail]');
      const hero = document.querySelector('[data-project-hero]');
      const band = document.querySelector('[data-project-detail] > :last-child');
      const heroEl = hero?.querySelector('img, video');
      const r = (e) => (e ? e.getBoundingClientRect() : null);
      const hb = r(heroEl);
      const nat = heroEl ? (heroEl.tagName === 'IMG' ? heroEl.naturalWidth / heroEl.naturalHeight : (heroEl.videoWidth || 0) / (heroEl.videoHeight || 1)) : 0;
      if (!rail) return { rail: 0, past: 0, intoBand: -999, minCell: 999, heroCropPct: nat && hb ? +((Math.abs(hb.width / hb.height - nat) / nat) * 100).toFixed(1) : 0 };
      const rb = r(rail);
      const rowB = r(rail.parentElement);
      const bb = r(band);
      const cells = [...rail.children].map((c) => r(c).width);
      return {
        rail: cells.length,
        past: +(rb.bottom - rowB.bottom).toFixed(1),
        intoBand: bb ? +(rb.bottom - bb.top).toFixed(1) : -999,
        minCell: Math.round(Math.min(...cells)),
        heroCropPct: nat && hb ? +((Math.abs(hb.width / hb.height - nat) / nat) * 100).toFixed(1) : 0,
      };
    }),
  );
}

console.table(rows.map((r, i) => ({ project: names[i], ...r })));

const fail = [];
rows.forEach((r, i) => {
  if (r.past > SLOP) fail.push(`${names[i]}: the rail runs ${r.past}px PAST its region`);
  if (r.intoBand > SLOP) fail.push(`${names[i]}: the rail collides ${r.intoBand}px into the info band`);
  if (r.rail > 0 && r.minCell < MIN_CELL) fail.push(`${names[i]}: a cell is ${r.minCell}px wide — a sliver`);
  if (r.heroCropPct > 2) fail.push(`${names[i]}: the hero is CROPPED ${r.heroCropPct}%`);
});
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log(`\nPASS — across all ${rows.length} projects: the rail stays in its region, no slivers, no hero crop.`);
