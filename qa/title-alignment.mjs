/**
 * qa/title-alignment.mjs — pins round 4's duplicate-title glitch.
 *
 *   node qa/title-alignment.mjs          (needs the dev server on :5333)
 *
 * WHY THIS IS A SCRIPT AND NOT A VITEST: the defect only exists in a real layout under a real
 * scroll. Two elements carry the page title — the intro's flying copy (AboutIntro) and the
 * persistent one (AboutPage, `data-about-title`) — and the bug was that the persistent one MOVED
 * (the sticky timeline engaged the moment the autoplay scrolled) after the intro had measured it,
 * so the flying copy landed 32px off. jsdom has no sticky, no scroll and no layout; it cannot see
 * any of that. Motion must be ON, which the reduced-motion QA harness structurally cannot do.
 *
 * The assertion is exact rather than approximate: the flying copy is positioned at the measured
 * target via style.left/top and animates x/y to 0, so its LANDING is that target by definition.
 * The landing is correct iff the target equals the persistent title's live rect.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TITLE_PREFIX = "We've been chasing";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });

const read = () =>
  page.evaluate((prefix) => {
    const persistent = document.querySelector('[data-about-title]');
    const flying = [...document.querySelectorAll('p')].find((e) => e.textContent.trim().startsWith(prefix));
    const p = persistent?.getBoundingClientRect();
    return {
      persistent: p ? { left: +p.left.toFixed(2), top: +p.top.toFixed(2), width: +p.width.toFixed(2) } : null,
      target: flying ? { left: parseFloat(flying.style.left), top: parseFloat(flying.style.top), width: parseFloat(flying.style.width) } : null,
      scrollY: Math.round(window.scrollY),
    };
  }, TITLE_PREFIX);

// Sample through the intro: catch the flying copy, and watch the persistent title for movement.
let target = null;
const seenY = new Set();
for (let i = 0; i < 14; i++) {
  const r = await read();
  if (r.persistent) seenY.add(r.persistent.top);
  if (r.target) target = { ...r.target, persistent: r.persistent };
  await sleep(150);
}

const fail = [];
if (!target) fail.push('never saw the intro\'s flying title — did the intro run? (motion must be ON)');
else {
  const d = (a, b) => Math.abs(a - b);
  const p = target.persistent;
  if (d(target.left, p.left) > 0.5) fail.push(`landing dx = ${(target.left - p.left).toFixed(2)} (want 0)`);
  if (d(target.top, p.top) > 0.5) fail.push(`landing dy = ${(target.top - p.top).toFixed(2)} (want 0)`);
  if (d(target.width, p.width) > 0.5) fail.push(`landing dw = ${(target.width - p.width).toFixed(2)} (want 0)`);
}
// The root cause: the persistent title used to jump 32px when the sticky engaged. It must not move.
if (seenY.size > 1) fail.push(`the persistent title MOVED during the intro: y = ${[...seenY].join(', ')} (want one value)`);

console.log('flying title target :', target ? { left: target.left, top: target.top, width: target.width } : null);
console.log('persistent live rect:', target?.persistent ?? null);
console.log('persistent y values seen:', [...seenY]);
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — the intro lands exactly on the persistent title, which never moves.');
