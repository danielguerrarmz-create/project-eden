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
 * not arrived and reports a confident wrong number.
 *
 * ---
 *
 * AND IT WALKED STRAIGHT INTO THAT TRAP ANYWAY, THROUGH THE GUARD WRITTEN AGAINST IT (round 10).
 * This is the most important comment in the file, because the bug is not "a sleep was too short".
 *
 * The guard asked: **did the SCROLL land?** (`Math.abs(scrollY - target) > 4`). The question it needed
 * to ask was: **did the CAMERA arrive?** `scrollY` lands INSTANTLY and synchronously; `camY` is a
 * separate rAF lerp (`current += (target - current) * 0.1`, settling only under 0.0005 — about
 * SEVENTY-TWO frames). So the precondition passed, every time, while the camera was still nowhere
 * near. **A guard that checks a proxy for the thing is not a guard.** Measured across six stops:
 *
 *     settle 450ms   camY = 148, 148, 148, 965, 3702, 4439   <- stuck for three stops
 *     settle 1800ms  camY =   0, 2136, 3457, 4445, 5433, 6163  <- actually tracking
 *
 * On the first row it printed "PASS: nothing still growing above the halfway mark". That verdict was
 * worthless: a stalled camera parks the drawing off-screen, no stem is anywhere near the halfway line,
 * and "no violations" is what you get for looking at nothing.
 *
 * AND NOTE WHAT MADE IT NEWLY WRONG: nothing in this file changed. Item 9 made the page much heavier
 * (438 sub-branch runs, was 195), frames got slower, and 450ms silently stopped being enough. **A
 * fixed sleep is a bet on machine speed, and the codebase can move the goalposts under a harness that
 * has not been touched in weeks.** Wait for the THING, never for the CLOCK.
 *
 * THE SUB-TRAP, WHICH IS ALREADY WRITTEN IN THE ROUND-7 DOC AND WHICH THE FIRST FIX HIT REGARDLESS:
 * polling for STILLNESS alone reports "settled" at the OLD position, because immediately after
 * `scrollTo` the rAF has not fired yet and two consecutive reads are identical. **Stillness cannot
 * tell "not started" from "finished".** So this waits for MOVEMENT first and stillness second, and a
 * camera that never moves is a HARNESS failure rather than a reading. Every stop is a large jump, so
 * movement is guaranteed when the page is alive; if it is absent, the page is what is broken.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
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

/**
 * A RELOAD UNDER THE HARNESS IS A HARNESS FAULT, NOT A CRASH AND NEVER A VERDICT.
 *
 * Four agents share this dev server, so Vite HMR reloads the page the moment anyone saves — mid-seek,
 * mid-measure. Puppeteer's "Execution context was destroyed" then throws out of whatever `evaluate`
 * was in flight. Unhandled, that is merely noisy; the danger is the tempting fix of swallowing it and
 * carrying on, which would measure a page that has just reset to scroll 0 with a cold camera and call
 * the result data. Every eval goes through here, and a destroyed context poisons the reading rather
 * than silently returning a plausible number.
 */
const DESTROYED = Symbol('context-destroyed');
const safeEval = async (fn, arg) => {
  try {
    return await page.evaluate(fn, arg);
  } catch (e) {
    if (/Execution context was destroyed|Target closed|detached/i.test(String(e))) return DESTROYED;
    throw e;
  }
};

/**
 * camY, read off the one element that exposes it: the frame's viewBox is `0 <camY> W viewH`.
 *
 * TWO SELECTORS, AND THE FALLBACK IS THE LOAD-BEARING ONE. `data-timeline-camera` is an explicit
 * handle added for this harness, but it lives in `CrossPathsTimeline.tsx`, which is another agent's
 * file and currently carries a large uncommitted refactor. **A committed harness must not depend on an
 * uncommitted line in someone else's lane** — if that file is reverted or the attribute is dropped in
 * a rebase, this harness dies with it and item 2's live verification dies silently with that.
 * `[data-timeline-track] svg[viewBox]` is the path production code already uses (`usePageCardLine.ts`,
 * `AboutPage.tsx`), so it is maintained by the app itself rather than by my say-so. Verified: both
 * resolve to EXACTLY ONE element and to the SAME element.
 *
 * AND IT ASSERTS WHAT IT FOUND, WHICH IS THE WHOLE LESSON. The first version of this handle was named
 * `data-timeline-frame` — a name ALREADY TAKEN by the founders' parenthesis on an ancestor <div>.
 * `querySelector` returns the FIRST match, so it silently got the div, which has no viewBox, and read
 * camY as null. A smoke check of `!!querySelector(...)` cheerfully said "true" about the wrong element.
 * So this refuses to guess: exactly one match, and it must actually carry a parseable viewBox y.
 * **A selector that cannot say WHICH element it found is not a selector.**
 */
const camY = () =>
  safeEval(() => {
    const pick = () => {
      const explicit = document.querySelectorAll('[data-timeline-camera]');
      if (explicit.length === 1) return explicit[0];
      if (explicit.length > 1) return 'AMBIGUOUS';
      const fb = document.querySelectorAll('[data-timeline-track] svg[viewBox]');
      if (fb.length === 1) return fb[0];
      if (fb.length > 1) return 'AMBIGUOUS';
      return null;
    };
    const svg = pick();
    if (svg === 'AMBIGUOUS') return 'AMBIGUOUS';
    if (!svg) return null;
    // The element must carry the thing we came for. Matching is not finding.
    const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/);
    if (vb.length !== 4) return null;
    const y = Number(vb[1]);
    return Number.isFinite(y) ? y : null;
  });

/** How long to give the camera. Generous on purpose: the cost of waiting is seconds, the cost of
 *  measuring early is a false PASS that gets quoted at Daniel. */
const MOVE_TIMEOUT = 8000;
const SETTLE_TIMEOUT = 25000;
/** camY is in drawing units over thousands; sub-unit jitter is arrival, not motion. */
const EPS = 0.5;
/** Consecutive still FRAMES before believing the lerp is done. Frames, not polls — see camYNextFrame. */
const STILL_READS = 5;

/**
 * READ camY ON A PAINTED FRAME, NOT ON A WALL-CLOCK TICK. This is the third form of the same trap and
 * it bit ME, in the file I wrote to fix the first two.
 *
 * The settle loop polled every 40ms and called it settled after 5 identical reads. But this page is
 * heavy: a frame can take longer than 5 * 40ms. When it does, **five consecutive polls read the same
 * value because NO FRAME HAS PAINTED** — which is indistinguishable from "the lerp has arrived". So
 * "still" meant "I sampled faster than the page could move". Measured: a seek to 72% of the track
 * reported settled at **camY 577** when the pin is **4934** — off by a factor of eight, and it would
 * have been reported as data.
 *
 * The rule this file already states, arriving a third time: **stillness cannot tell "arrived" from
 * "not started"** — and it cannot tell "arrived" from "not yet rendered" either. Both are fixed the
 * same way: make the sample interval a FRAME. Two rAFs guarantee a painted frame between reads, so
 * five still reads are five still FRAMES, and the lerp (which snaps to target and stops its rAF) is
 * genuinely done.
 *
 * Gojo2 hit this same asymptotic-tail bug in his own screenshot probe and correctly refused to quote
 * its camY. Two agents, two files, one wall — which is why it is written here rather than in a log.
 */
const camYNextFrame = () =>
  safeEval(
    () =>
      new Promise((res) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const explicit = document.querySelectorAll('[data-timeline-camera]');
            const fb = document.querySelectorAll('[data-timeline-track] svg[viewBox]');
            const set = explicit.length ? explicit : fb;
            if (set.length !== 1) return res(set.length > 1 ? 'AMBIGUOUS' : null);
            const vb = (set[0].getAttribute('viewBox') || '').trim().split(/\s+/);
            if (vb.length !== 4) return res(null);
            const y = Number(vb[1]);
            res(Number.isFinite(y) ? y : null);
          }),
        );
      }),
  );

/**
 * Seek, then WAIT FOR THE CAMERA — movement first, then stillness. Returns null if the camera never
 * moved or never settled; the caller must treat null as a HARNESS failure and discard the stop, never
 * degrade it to a pass. That asymmetry is the whole point: this file's previous verdict was produced
 * by a camera that had not arrived.
 */
const seek = async (scrollY) => {
  const before = await camY();
  if (before === DESTROYED) return { harness: 'the page reloaded (HMR?) before the seek — reading poisoned' };
  if (before === 'AMBIGUOUS')
    return { harness: 'the camera selector matched MORE THAN ONE element — refusing to guess which is the frame' };
  if (before === null)
    return { harness: 'no camera frame (no [data-timeline-camera], no single [data-timeline-track] svg[viewBox])' };
  if ((await safeEval((y) => window.scrollTo(0, y), scrollY)) === DESTROYED)
    return { harness: 'the page reloaded (HMR?) during the seek — reading poisoned' };

  // 1. MOVEMENT. Without this, the two reads below are both the OLD value and "still" is a lie.
  const moveDeadline = Date.now() + MOVE_TIMEOUT;
  let moved = false;
  while (Date.now() < moveDeadline) {
    const c = await camYNextFrame();
    if (c === DESTROYED) return { harness: 'the page reloaded (HMR?) while waiting for the camera to start' };
    if (c === 'AMBIGUOUS') return { harness: 'camera selector became ambiguous mid-seek' };
    if (c !== null && Math.abs(c - before) > EPS) {
      moved = true;
      break;
    }
  }
  if (!moved) return { harness: `camera never left ${before?.toFixed(1)} — it did not start` };

  // 2. STILLNESS. The lerp snaps exactly to target and idles its rAF, so stillness IS arrival —
  //    but only once we know it started.
  const settleDeadline = Date.now() + SETTLE_TIMEOUT;
  let last = null;
  let still = 0;
  while (Date.now() < settleDeadline) {
    // ONE PAINTED FRAME PER SAMPLE. A wall-clock poll on a slow page reads the same value twice
    // because nothing rendered between them, and calls that "settled". See camYNextFrame.
    const c = await camYNextFrame();
    if (c === DESTROYED) return { harness: 'the page reloaded (HMR?) while waiting for the camera to settle' };
    if (c === 'AMBIGUOUS') return { harness: 'camera selector became ambiguous mid-settle' };
    if (c === null) return { harness: 'camera disappeared mid-seek' };
    if (last !== null && Math.abs(c - last) <= EPS) still++;
    else still = 0;
    last = c;
    if (still >= STILL_READS) return { cam: c };
  }
  return { harness: `camera never settled (last ${last?.toFixed(1)}) in ${SETTLE_TIMEOUT}ms` };
};

/** Sample the ornament: every stem's growth state against its own position in the viewport. */
const sampleAt = async (scrollY) => {
  const s = await seek(scrollY);
  if (s.harness) return { harness: s.harness };
  // camY comes from `seek`, which already resolved the frame unambiguously and waited for it to
  // arrive. Re-reading it here with a second, weaker selector would be a different question wearing
  // the same name — which is the mistake this whole file is a monument to.
  const r = await safeEval(() => {
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
  if (r === DESTROYED) return { harness: 'the page reloaded (HMR?) during the measurement — reading poisoned' };
  return { ...r, cam: s.cam };
};

const stops = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65];
let violations = 0;
let sampled = 0;
let discarded = 0;
console.log('camera stop | camY | stems | growing | STILL GROWING ABOVE HALFWAY | worst');
for (const p of stops) {
  const target = Math.round(track.top + track.height * p);
  const r = await sampleAt(target);
  // A HARNESS FAULT IS NOT A PASS. `seek` already refused to return a reading from a camera that
  // never started or never settled; the only correct thing to do with that is discard the stop
  // loudly. Letting it fall through to "0 violations" is precisely how this file lied.
  if (r.harness) {
    console.log(`  ${p.toFixed(2)}      | HARNESS: ${r.harness} — reading discarded`);
    discarded++;
    continue;
  }
  // Still worth asking, though it was never sufficient on its own.
  if (Math.abs(r.scrollY - target) > 4) {
    console.log(`  ${p.toFixed(2)}      | HARNESS: asked for ${target}, landed at ${r.scrollY} — reading discarded`);
    discarded++;
    continue;
  }
  if (r.total === 0) {
    console.log(`  ${p.toFixed(2)}      | HARNESS: no stems in the DOM at this stop — reading discarded`);
    discarded++;
    continue;
  }
  sampled++;
  const worst = r.worst ? `order ${r.worst.order} at ${(r.worst.f * 100).toFixed(1)}% of the viewport` : '-';
  console.log(
    `  ${p.toFixed(2)}      | ${String(Math.round(r.cam)).padStart(4)} | ${String(r.total).padStart(5)} | ${String(r.growing).padStart(7)} | ${String(r.growingAboveHalfway).padStart(27)} | ${worst}`,
  );
  violations += r.growingAboveHalfway;
}

console.log('');
// A PARTIAL SWEEP IS NOT A VERDICT EITHER. "5 of 6 stops passed" says nothing about the stop that
// could not be measured, and a camera that stalls at one stop is exactly where a violation would hide.
if (sampled === 0) {
  console.error('FAIL: every sample was discarded — this is a harness failure, not a verdict.');
  await browser.close();
  process.exit(1);
}
if (discarded > 0) {
  console.error(
    `\nHARNESS FAILURE: ${discarded} of ${stops.length} camera stops were discarded. This is NOT a verdict — ` +
      `the unmeasured stops are exactly where a violation could hide. Fix the harness, then re-run.`,
  );
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
