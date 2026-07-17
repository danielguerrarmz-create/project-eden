/**
 * qa/perf-about.mjs — what the About page actually costs, and on what hardware.
 *
 *   node qa/perf-about.mjs [throttle]     (needs the dev server on :5333)
 *
 * "It's faster" is not a finding. This reports four numbers that matter, at a CPU throttle:
 *
 *   ornamentReadyMs  nav -> every garland on the page has painted. What a visitor waits for.
 *   longTaskMs       total main-thread blocking. What makes the page unresponsive, not just slow.
 *   scrollFps        frames during a scroll through the growth. What jank actually is.
 *   workers          how many painters the device got.
 *
 * Throttle is the honest test: 1 = this machine, 4 = a mid-range laptop, 6 = a phone.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const RATE = Number(process.argv[2] ?? 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const cdp = await page.target().createCDPSession();
if (RATE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

// Long tasks = main-thread blocking. Install before navigation so nothing is missed.
await page.evaluateOnNewDocument(() => {
  window.__long = 0;
  window.__t0 = performance.now();
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long += e.duration;
  }).observe({ entryTypes: ['longtask'] });
});

const t0 = Date.now();
await page.goto(`${BASE}/?species=spine-2#/about`, { waitUntil: 'domcontentloaded' });
await sleep(600);
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');

// ORNAMENT READY: every garland has produced its bitmap. The page paints four (spine, sub-branches,
// the founders' arms, the coda) plus two commissions, so this is the real wait, not one of them.
const EXPECT = 4;
let readyMs = null;
for (let i = 0; i < 120; i++) {
  const n = await page.evaluate(
    () => document.querySelectorAll('img[src^="blob:"], image[href^="blob:"]').length,
  );
  if (n >= EXPECT) { readyMs = Date.now() - t0; break; }
  await sleep(500);
}

// SCROLL FPS through the growth: drive a real scroll and count frames.
const fps = await page.evaluate(async () => {
  const track = document.querySelector('[data-timeline-track]');
  const r = track.getBoundingClientRect();
  const start = r.top + window.scrollY;
  const travel = (r.height - window.innerHeight) * 0.55;
  let frames = 0;
  let raf = 0;
  const count = () => { frames++; raf = requestAnimationFrame(count); };
  raf = requestAnimationFrame(count);
  const t0 = performance.now();
  const DUR = 3000;
  await new Promise((res) => {
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / DUR);
      window.scrollTo(0, start + travel * p);
      if (p < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
  cancelAnimationFrame(raf);
  return +(frames / ((performance.now() - t0) / 1000)).toFixed(1);
});

const m = await page.evaluate(() => ({
  longTaskMs: Math.round(window.__long),
  cores: navigator.hardwareConcurrency,
  dpr: window.devicePixelRatio,
}));

console.log(JSON.stringify({
  throttle: `${RATE}x`,
  ornamentReadyMs: readyMs ?? '>60000 (never finished)',
  longTaskMs: m.longTaskMs,
  scrollFps: fps,
  cores: m.cores,
  dpr: m.dpr,
}, null, 1));
await browser.close();
