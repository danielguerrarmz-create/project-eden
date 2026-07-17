/**
 * qa/growth-timing.mjs — IS ANYTHING STILL GROWING ABOVE THE HALFWAY LINE?
 *
 *   node qa/growth-timing.mjs
 *
 * Daniel, 2026-07-16: "the animation must be fully COMPLETE by the halfway mark, not starting near
 * it." This asks the rendered page that question directly, at a spread of camera positions, with
 * MOTION ON.
 *
 * WHY IT CAN ASK THE DOM RATHER THAN THE MOTION. A sub-branch mid-growth carries a stroke-dasharray;
 * a finished one carries none, because dashProps returns {} at full growth (deliberately, so a solid
 * line stops paying for the dash machinery every frame). So "still growing" is a rendered fact, and
 * the probe never has to reach inside React or re-implement growAt — which would only prove the test
 * agrees with a copy of the code.
 *
 * WHY MOTION ON. The rest of the QA harness pins reduced motion, because that is the only mode where
 * the camera is deterministic. Reduced motion settles the whole drawing instantly, fully grown —
 * which is correct, and is the absence of the thing under test. Same reason growth-frames.mjs exists.
 *
 * THE TRAP THIS HARNESS IS BUILT AGAINST (round 7, hero-lockup.mjs): the camera is a rAF lerp and a
 * cold paint starves it, so a harness that seeks and measures immediately reads a camera that has
 * not arrived and reports a confident wrong number. Every measurement below is guarded: if the
 * camera is not where it was sent, the reading is discarded as a HARNESS failure rather than
 * reported as a layout one.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5333/#/about', { waitUntil: 'domcontentloaded' });
await sleep(1200);
// Cancel the 14s autoplay without moving the page (End would jump to the document bottom).
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');
await sleep(200);

const track = await page.evaluate(() => {
  const el = document.querySelector('[data-timeline-track]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});
if (!track) {
  console.error('FAIL: no [data-timeline-track] — the page did not render the timeline.');
  await browser.close();
  process.exit(1);
}

/** Sample the ornament: every stem's growth state against its own position in the viewport. */
const sampleAt = async (scrollY) => {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  // Let the camera's rAF lerp actually arrive before believing anything it says.
  await sleep(450);
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const stems = [...document.querySelectorAll('[data-sub-branch]')];
    let growingAboveHalfway = 0;
    let worst = null;
    let growing = 0;
    for (const s of stems) {
      const mid = s.getAttribute('stroke-dasharray') !== null; // still paying out => still growing
      if (!mid) continue;
      growing++;
      const r = s.getBoundingClientRect();
      if (r.height === 0 && r.width === 0) continue;
      // The stem's ROOT is what the reveal is keyed to, and the root is the low end on screen.
      const rootF = r.bottom / vh; // 1 = bottom edge of the viewport, 0 = top
      if (rootF < 0.5) {
        growingAboveHalfway++;
        if (!worst || rootF < worst.f) worst = { f: rootF, order: s.getAttribute('data-sub-branch') };
      }
    }
    return { total: stems.length, growing, growingAboveHalfway, worst, scrollY: window.scrollY };
  });
};

const stops = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65];
let violations = 0;
let sampled = 0;
console.log('camera stop | stems | growing | STILL GROWING ABOVE HALFWAY | worst');
for (const p of stops) {
  const target = Math.round(track.top + track.height * p);
  const r = await sampleAt(target);
  // GUARD THE PRECONDITION: if the scroll did not land, nothing below it means anything.
  if (Math.abs(r.scrollY - target) > 4) {
    console.log(`  ${p.toFixed(2)}      | HARNESS: asked for ${target}, landed at ${r.scrollY} — reading discarded`);
    continue;
  }
  if (r.total === 0) {
    console.log(`  ${p.toFixed(2)}      | HARNESS: no stems in the DOM at this stop — reading discarded`);
    continue;
  }
  sampled++;
  const worst = r.worst ? `order ${r.worst.order} at ${(r.worst.f * 100).toFixed(1)}% of the viewport` : '-';
  console.log(`  ${p.toFixed(2)}      | ${String(r.total).padStart(5)} | ${String(r.growing).padStart(7)} | ${String(r.growingAboveHalfway).padStart(27)} | ${worst}`);
  violations += r.growingAboveHalfway;
}

console.log('');
if (sampled === 0) {
  console.error('FAIL: every sample was discarded — this is a harness failure, not a verdict.');
  await browser.close();
  process.exit(1);
}
if (violations > 0) {
  console.error(`FAIL: ${violations} stem-samples were still growing above the halfway mark across ${sampled} stops.`);
} else {
  console.log(`PASS: across ${sampled} camera stops, nothing was still growing above the halfway mark.`);
}
await browser.close();
process.exit(violations > 0 ? 1 : 0);
