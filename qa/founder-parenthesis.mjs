/**
 * qa/founder-parenthesis.mjs — pins THE JOIN (task F).
 *
 *   node qa/founder-parenthesis.mjs            (needs the dev server on :5333)
 *   node qa/founder-parenthesis.mjs --motion   (the same claim with the camera live)
 *
 * Daniel: "The flowers on the left and right side of the founder are quite beautiful but they must
 * connect. The stems at the top must connect with the stem that's unraveling from the bower logo at
 * the top. Make sure to make that connection."
 *
 * THE SHAPE OF THE ARMS IS NOT TESTED HERE, deliberately — "It doesn't have to be a specific
 * mathematical pattern. It just has to look pretty", so it is judged by eye against a screenshot.
 * What IS tested is the one thing an eye is bad at and that silently regressed twice already: that
 * the timeline's line and the parenthesis's trunk are the SAME LINE, with no gap and no jog.
 *
 * Two elements, two SVGs, two coordinate systems, and in motion a sticky frame with a panning
 * camera — so this cannot be a vitest. jsdom has no layout, no sticky, and no getPointAtLength.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOTION = process.argv.includes('--motion');

/** The seam is a butt join between two round-capped strokes; a couple of px of overlap is the
 *  intent, a couple of px of GAP is the bug. Allow overlap, forbid daylight. */
const MAX_GAP = 1.5;
/** The trunk must continue the descent's x, not jog sideways onto it. */
const MAX_JOG = 1.5;
/** ...and continue its WEIGHT. A few percent is antialiasing; 46% is what a hardcoded width cost. */
const MAX_WIDTH_STEP = 0.08;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
if (!MOTION) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await sleep(MOTION ? 1200 : 6000);

if (MOTION) {
  // The join is only ON THE PAGE from the end of the track onward: that is when the sticky frame
  // bottoms out at the track's bottom and the descent's exit stops moving in page coordinates.
  // Cancel the autoplay first (Shift: it cancels, and unlike End it scrolls nothing), then park at
  // the track's end.
  await page.keyboard.down('Shift');
  await page.keyboard.up('Shift');
  await sleep(400);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const t = document.querySelector('[data-timeline-track]');
      const r = t.getBoundingClientRect();
      window.scrollTo(0, r.top + window.scrollY + (r.height - window.innerHeight));
    });
    await sleep(700);
  }
  // SCROLLING THERE IS NOT ARRIVING THERE. The camera lerps toward the scroll at 0.1/frame and only
  // then idles, so the exit is still travelling down the frame for a while after the page has
  // stopped. Measured mid-flight it reads as a 134px gap — a real-looking failure of a join that is
  // actually fine. Poll the viewBox until it stops moving.
  const camNow = () => page.evaluate(() => +document.querySelector('[data-timeline-track] svg').getAttribute('viewBox').split(' ')[1]);
  let prev = await camNow();
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    const now = await camNow();
    if (Math.abs(now - prev) < 0.01) break;
    prev = now;
  }
}

const r = await page.evaluate(() => {
  const exit = document.querySelector('[data-descent-exit]');
  const paren = document.querySelector('[data-paren-trunk]');
  if (!exit || !paren) return { exit: !!exit, paren: !!paren };
  const e = exit.getBoundingClientRect();
  // The trunk's own first point, in screen px — not the path's bbox, which is a different thing.
  const p0 = paren.getPointAtLength(0);
  const m = paren.getScreenCTM();
  const s = new DOMPoint(p0.x, p0.y).matrixTransform(m);

  // BOTH LINES' WIDTHS AS RENDERED, in CSS px. The timeline draws in world units and scales them
  // into its frame, so its authored stroke-width is not what you see; multiply by the frame's own
  // scale. Two strokes that meet at a point and step in width read as a seam just as clearly as a
  // gap does.
  const tlSvg = document.querySelector('[data-timeline-track] svg');
  const vb = tlSvg.viewBox.baseVal;
  const tlScale = tlSvg.getBoundingClientRect().width / vb.width;
  const descent = document.querySelector('[data-descent-exit]').parentElement.querySelector('path[stroke-linecap="round"]');
  const descentW = parseFloat(getComputedStyle(descent).strokeWidth) * tlScale;
  const trunkW = parseFloat(getComputedStyle(paren).strokeWidth);

  // THE MEETING (round 11 item 7): the two arm tails must join at the bower's base with 0px gap. Each
  // `[data-paren-arm]` group's LAST run ends on that join; read both in screen px and compare. This is
  // a SEPARATE, named concern from the trunk seam above — the seam is descent→trunk at the TOP, this
  // is left-tail→right-tail at the BOTTOM, and the old harness pinned only the former while Daniel's
  // eye was on the latter.
  const armEnd = (side) => {
    const g = document.querySelector(`[data-paren-arm="${side}"]`);
    const runs = g ? [...g.querySelectorAll('path')] : [];
    const last = runs[runs.length - 1];
    if (!last) return null;
    const q = last.getPointAtLength(last.getTotalLength());
    const d = new DOMPoint(q.x, q.y).matrixTransform(last.getScreenCTM());
    return { x: +d.x.toFixed(2), y: +d.y.toFixed(2) };
  };
  return {
    exit: { x: +(e.left + e.width / 2).toFixed(2), y: +(e.top + e.height / 2).toFixed(2) },
    trunkTop: { x: +s.x.toFixed(2), y: +s.y.toFixed(2) },
    descentW: +descentW.toFixed(2),
    trunkW: +trunkW.toFixed(2),
    leftEnd: armEnd('left'),
    rightEnd: armEnd('right'),
  };
});

const fail = [];
if (!r.trunkTop || !r.exit?.x) {
  fail.push(`missing datum — descent exit: ${!!r.exit}, parenthesis trunk: ${!!r.paren}`);
} else {
  // The trunk must START AT OR ABOVE the exit (it overshoots so the round caps overlap). Daylight
  // between them is the bug; overlap is the intent.
  const gap = r.trunkTop.y - r.exit.y;
  if (gap > MAX_GAP)
    fail.push(`A GAP of ${gap.toFixed(2)}px between the timeline's line and the trunk — the line arrives nowhere.`);
  const jog = Math.abs(r.trunkTop.x - r.exit.x);
  if (jog > MAX_JOG) fail.push(`the trunk JOGS ${jog.toFixed(2)}px sideways off the descent's x — not one line.`);

  // ONE LINE MEANS ONE WEIGHT. A hardcoded trunk width matched the position exactly and still
  // stepped at the join, because the timeline's stroke is authored in WORLD units and scales with
  // its frame: SPINE_W (7.5) renders at 5.22 CSS px in motion and 7.96 in reduced, against a trunk
  // pinned at 2.8 — a 46% step, and a different one per mode.
  const step = Math.abs(r.trunkW - r.descentW) / (r.descentW || 1);
  if (step > MAX_WIDTH_STEP)
    fail.push(
      `the line STEPS ${(step * 100).toFixed(0)}% in width at the join (spine ${r.descentW}px -> trunk ${r.trunkW}px) — a seam.`,
    );
}

// THE ARMS MEET — the closed bower (item 7). Its own check, so a failure names the BASE join, not the
// top seam. Allow a couple px (round caps overlapping); forbid daylight, the same standard as the seam.
if (!r.leftEnd || !r.rightEnd) {
  fail.push(`missing an arm terminus — left: ${!!r.leftEnd}, right: ${!!r.rightEnd} ([data-paren-arm] gone?)`);
} else {
  const meetGap = Math.hypot(r.leftEnd.x - r.rightEnd.x, r.leftEnd.y - r.rightEnd.y);
  if (meetGap > MAX_GAP)
    fail.push(
      `the bower does NOT close: the two arm tails are ${meetGap.toFixed(2)}px apart at the base ` +
        `(left ${r.leftEnd.x},${r.leftEnd.y} vs right ${r.rightEnd.x},${r.rightEnd.y}) — Daniel ruled they meet.`,
    );
}
if (errs.length) fail.push(`console errors: ${errs.slice(0, 3).join(' | ')}`);

console.log(`mode            : ${MOTION ? 'MOTION (parked at the track end)' : 'reduced'}`);
console.log('descent exit    :', r.exit);
console.log('trunk top       :', r.trunkTop);
console.log('spine width     :', r.descentW, 'px (rendered) vs trunk', r.trunkW, 'px');
if (r.trunkTop && r.exit?.x) {
  console.log('overlap (want >= 0):', (r.exit.y - r.trunkTop.y).toFixed(2), 'px');
  console.log('sideways jog    :', Math.abs(r.trunkTop.x - r.exit.x).toFixed(2), 'px');
}
if (r.leftEnd && r.rightEnd) {
  console.log('arm tails        :', `left ${r.leftEnd.x},${r.leftEnd.y}  right ${r.rightEnd.x},${r.rightEnd.y}`);
  console.log('bower meet gap   :', Math.hypot(r.leftEnd.x - r.rightEnd.x, r.leftEnd.y - r.rightEnd.y).toFixed(2), `px (want <= ${MAX_GAP})`);
}
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — the trunk continues the timeline\'s line, and the two arms close the bower at its base.');
