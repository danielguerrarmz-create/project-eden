/**
 * qa/hero-lockup.mjs — pins Daniel's round-4 datum for the hero lockup.
 *
 *   node qa/hero-lockup.mjs          (needs the dev server on :5333)
 *
 * WHY A SCRIPT AND NOT A VITEST: the claim is about where two things land on a real screen, at a
 * real scroll position, inside a sticky box whose height is `100svh - var(--header-h)`. jsdom has
 * no layout, no sticky, no svh and no scroll. Motion must be ON.
 *
 * Daniel's spec, round 4: "The text 'we've been chasing it for five years' is now on center,
 * perfectly aligned, but the bower is still slightly below." Round 2 had put the centring lift on
 * the COPY COLUMN alone, which lifted the words and left the mark where it was — the mark sits at
 * the SVG frame's centre, and the frame had not moved. The lift now lives on the ROW, so
 * `lg:items-stretch` shrinks both columns together and the two centres move as one.
 *
 * THE ASSERTION: at the pin, the mark's centre and the copy column's centre are the same y.
 *
 * The mark's datum is `[data-mark-center]`, a zero-radius circle at (MARK_CENTER_X, MARK_CENTER_Y)
 * — the ring's own centre, which is NOT the mark's bounding-box centre and is what the spec's
 * "the center of the middle circle" means.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * WHERE THE PIN IS — AND IT IS A POINT, NOT A PLATEAU. Two things must both be true for the frame
 * Daniel is describing, and they do NOT hold over the same range:
 *
 *   - the CAMERA sits on `pinCamY`  — true across p in [0.667, 0.80] (it holds while the mark opens)
 *   - the MARK is fully WOUND       — true only AT p = PIN_FRAC, because `windW` starts falling the
 *                                     instant p passes it (windW = 1 - easeInOutCubic(q / 0.4))
 *
 * So the pin is exactly PIN_FRAC. Sampling the camera plateau's middle (0.75) reads the right
 * world point on a mark that is ~70% UNRAVELLED — the datum is a fixed point in world space, so
 * the numbers came out perfect while the screenshot showed no mark at all. Measure where the thing
 * being measured is actually on screen.
 */
const PIN_FRAC = 720 / 1080;
const PIN_HOLD_FRAC = PIN_FRAC;

/** The mark vs the words. This is arithmetic — they are pinned to the same box — so it is tight. */
const AGREE_TOL = 2;
/** The lockup rides a little proud of the screen centre: a block on the mathematical centre reads
 *  low. Measured 10px at 1440x900. A taste band, not a number — assert only the SIGN and a sane
 *  ceiling, so re-tuning the nudge does not turn this into a false alarm. */
const PROUD_MIN = 0;
const PROUD_MAX = 30;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:5333/#/about', { waitUntil: 'domcontentloaded' });

// CANCEL THE AUTOPLAY FIRST, or it wins: it owns window.scrollTo for a 24s descent, so a scroll set
// underneath it is simply overwritten on the next frame (measured — the datum read wherever the
// descent had got to, not the pin).
//
// SHIFT, and BEFORE the lead-in elapses. The component cancels on any keydown, but which key and
// when both matter. Inside AUTOPLAY_LEAD_IN_MS the handler is `onEarly`: it cancels outright and
// never scrolls. After it, the handler is `onGesture`, which FAST-FORWARDS by driving scrollTo for
// another 650ms — still fighting us. And `End` cancels correctly but jumps to the document bottom
// first, leaving the seek to claw back 11k pixels while lazy surfaces change the page height under
// it (measured: the whole sticky row ended up 2009px above the viewport). Shift scrolls nothing.
await sleep(800); // < AUTOPLAY_LEAD_IN_MS (2500)
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');
await sleep(400);

// CONVERGE on the pin rather than assume one jump lands it. The page's scrollHeight CHANGES as
// lazy surfaces mount and unmount under the scroll, which moves the track out from under a
// position computed a moment earlier (measured: a single jump from the End position settled at
// p=0.51, not 0.75). So: aim, settle, re-read where we actually are, correct. Converges in 2-3.
const seek = () =>
  page.evaluate((frac) => {
    const track = document.querySelector('[data-timeline-track]');
    const r = track.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    window.scrollTo(0, r.top + window.scrollY + travel * frac);
    const after = track.getBoundingClientRect();
    return +(-after.top / (after.height - window.innerHeight)).toFixed(4);
  }, PIN_HOLD_FRAC);

let atP = 0;
for (let i = 0; i < 5; i++) {
  atP = await seek();
  await sleep(900);
  if (Math.abs(atP - PIN_HOLD_FRAC) < 0.002) break;
}

// SETTLING IS A SEPARATE WAIT FROM SEEKING, and it needs polling rather than a guessed sleep. The
// scroll position and the camera are two different values: `p` is the real scrollY, while the
// component's camera lerps toward it at 0.1/frame and only then idles. A fixed 2s sleep looked
// sufficient on paper and was not in practice (p had arrived at 0.75 while the camera was still at
// 0.63 — headless throttles rAF). Poll the viewBox until it stops moving.
const camNow = () => page.evaluate(() => +document.querySelector('[data-timeline-track] svg').getAttribute('viewBox').split(' ')[1]);
let prev = await camNow();
for (let i = 0; i < 25; i++) {
  await sleep(400);
  const now = await camNow();
  if (Math.abs(now - prev) < 0.01) break;
  prev = now;
}

const r = await page.evaluate(() => {
  const title = document.querySelector('[data-about-title]');
  const markPt = document.querySelector('[data-mark-center]');
  const svg = document.querySelector('[data-timeline-track] svg');
  const mid = (el) => {
    const b = el?.getBoundingClientRect();
    return b ? +(b.top + b.height / 2).toFixed(2) : null;
  };
  // THE COPY'S CENTRE IS ITS CONTENT'S, NOT ITS BOX'S. `justify-center` moves the content inside
  // the box; padding on the column moves the content and leaves the box exactly where it was. So
  // reading the column's own rect measures the one thing that does NOT move under the bug, and
  // reports agreement whether or not the bug is present. Take the union of the title and the
  // questions list instead — the lockup as Daniel sees it.
  const col = title?.closest('div');
  const dl = col?.querySelector('dl');
  const t = title?.getBoundingClientRect();
  const d = dl?.getBoundingClientRect();
  const copyCenterY = t && d ? +((t.top + d.bottom) / 2).toFixed(2) : null;
  return {
    screenCenterY: window.innerHeight / 2,
    copyCenterY,
    colBoxCenterY: mid(col),
    frameCenterY: mid(svg),
    markCenterY: mid(markPt),
    camY: svg ? +svg.getAttribute('viewBox').split(' ')[1] : null,
  };
});

const fail = [];
if (r.markCenterY === null) fail.push('no [data-mark-center] on the page — the datum is missing');
if (r.copyCenterY === null) fail.push('no copy column found');

// ON SCREEN AT ALL? If the seek overshoots the track the sticky row releases and scrolls away, and
// every reading below is taken on a lockup nobody can see (measured: all four values at -2009, and
// the mark/words agreement still "passed" up there). Say that plainly instead of reporting a
// 2459px optical nudge with a straight face.
if (r.frameCenterY !== null && (r.frameCenterY < 0 || r.frameCenterY > r.screenCenterY * 2))
  fail.push(`the lockup is OFF SCREEN (frame centre ${r.frameCenterY}) — the seek overshot the track and the sticky released. Harness failure.`);

// GUARD THE PRECONDITION. At the pin the camera puts the mark on the frame's centre BY
// CONSTRUCTION (`pinCamY`), so if those two disagree we are not at the pin and every number below
// is meaningless. Without this, a scroll that failed to converge reports as a layout regression —
// the right verdict for the wrong reason, which is how a test starts lying.
const atPin = r.markCenterY !== null && r.frameCenterY !== null && Math.abs(r.markCenterY - r.frameCenterY) <= AGREE_TOL;
if (!atPin)
  fail.push(
    `NOT AT THE PIN: the mark (${r.markCenterY}) is not on the frame's centre (${r.frameCenterY}), ` +
      `so the scroll never converged (p=${atP}, camY=${r.camY}, want ~3806.1). This is a harness ` +
      'failure, not a layout one — nothing below is meaningful.',
  );

if (atPin && r.copyCenterY !== null) {
  const disagree = r.markCenterY - r.copyCenterY;
  if (Math.abs(disagree) > AGREE_TOL)
    fail.push(
      `the mark and the copy column DISAGREE by ${disagree.toFixed(2)}px (want <= ${AGREE_TOL}). ` +
        'This is round 2\'s bug: the lift is on one column instead of the row.',
    );

  const proud = r.screenCenterY - r.copyCenterY;
  if (proud < PROUD_MIN || proud > PROUD_MAX)
    fail.push(`the lockup sits ${proud.toFixed(2)}px proud of the screen centre (want ${PROUD_MIN}..${PROUD_MAX})`);
}

console.log('track p          :', atP, `(want ${PIN_HOLD_FRAC})`);
console.log('camera y (pin)   :', r.camY, '(the hold; want ~3806.1)');
console.log('screen centre  y :', r.screenCenterY);
console.log('copy CONTENT   y :', r.copyCenterY, `(${(r.screenCenterY - r.copyCenterY).toFixed(2)}px proud of screen centre)`);
console.log('copy box       y :', r.colBoxCenterY, '(does NOT move under the bug — not the assertion)');
console.log('svg frame      y :', r.frameCenterY);
console.log('mark datum     y :', r.markCenterY, `(${(r.markCenterY - r.copyCenterY).toFixed(2)}px vs the words)`);
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — at the pin the mark and the words share a centre, riding proud of the screen centre.');
