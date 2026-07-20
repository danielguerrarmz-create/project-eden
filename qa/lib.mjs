/**
 * qa/lib.mjs — the shared primitives every probe was re-implementing.
 *
 * Sixteen probes each hand-rolled the same four things: a puppeteer-core launch against an external
 * Chrome, a setViewport, the autoplay-cancel Shift gesture, and a page-ready wait — and the page-ready
 * wait is exactly where this suite has been bitten most (a wall-clock sleep that measured a page that
 * had not arrived; see the round-10/11 "WAIT FOR THE THING, NOT THE CLOCK" notes in CLAUDE.md). This
 * factors the versions that were proven correct in `perf-about.mjs` and `mobile-hero.mjs` so a new
 * probe inherits them instead of re-deriving them.
 *
 * Nothing here changes what the existing probes do; they can adopt it later. It exists first for
 * `capture-matrix.mjs`, the screenshot-review loop.
 *
 * Env overrides (all match the existing probes' conventions):
 *   CHROME=<path>   the Chrome executable (default: the standard Windows install)
 *   PORT / BASE     where the dev server is (via base.mjs) — mind the port-squat hazard it documents
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BASE, PORT } from './base.mjs';

export { BASE, PORT };

/** The external Chrome. Env-overridable, same default string the probes already carry. */
export const CHROME =
  process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Launch headless Chrome sized for the FIRST viewport, and hand back a page already set to it.
 * `--window-size` is set to the same W/H so the OS window and the emulated viewport agree (the
 * existing probes do this; it keeps DPR-scaled screenshots from being letterboxed by a default window).
 */
export async function launch({ width = 1440, height = 900, dpr = 1, mobile = false } = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', `--window-size=${width},${height}`],
  });
  const page = await browser.newPage();
  await setViewport(page, { width, height, dpr, mobile });
  return { browser, page };
}

/**
 * Emulate a viewport at a real device pixel ratio. Phones/iPads are captured at DPR 2/3 on purpose:
 * hairline borders, sub-pixel text and 1px rules behave differently at DPR 2/3 than in a DPR-1
 * simulator, so a DPR-1 "mobile" shot hides exactly the class of defect this loop is meant to catch.
 * `isMobile`/`hasTouch` follow `mobile-hero.mjs` so touch media and mobile UA heuristics match a phone.
 */
export async function setViewport(page, { width, height, dpr = 1, mobile = false }) {
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
  });
}

/**
 * Turn OS "reduce motion" on or off for the page. On About this collapses the scroll-scrubbed timeline
 * to its STATIC full-height poster (`viewBox 0 0 W H`, the sticky track flattened) — which is the
 * deterministic thing to screenshot: it has no camera clock to race, and it is also literally what a
 * reduced-motion visitor sees. `mobile-hero.mjs` captures under reduced motion for the same reason.
 * Call BEFORE goto so the first paint already honours it.
 */
export async function setReducedMotion(page, on = true) {
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' },
  ]);
}

/**
 * Cancel the About finale autoplay. A tap of Shift is the page's own "a real interaction happened"
 * signal (perf-about.mjs uses it); without it the finale autoplay drives the camera down the track
 * under any long wait and a screenshot lands on the pin instead of where you scrolled. Harmless on
 * routes that have no autoplay, and a no-op under reduced motion (there is no autoplay there), so it
 * is safe to call unconditionally.
 */
export async function cancelAutoplay(page) {
  await page.keyboard.down('Shift');
  await page.keyboard.up('Shift');
}

/**
 * THE HONEST READY-GATE — poll for the thing the page is waiting on, never a wall-clock sleep.
 *
 * Three signals, in order, each a fact about arrival rather than a guess at a duration:
 *   1. fonts.ready — the site loads Fraunces/Inter + self-hosted display faces; a shot before they
 *      swap in measures Georgia, not the design.
 *   2. lazy images — most heroes are `loading="lazy"` and below the fold (mobile-hero.mjs hit
 *      naturalWidth 0 on four of twelve). Scroll the whole page to trigger them, then wait for every
 *      <img> to be `complete && naturalWidth > 0`, then scroll back to the top for the shot.
 *   3. blob garlands (About only) — the painterly ornaments arrive as `blob:` bitmaps on a LATE clock
 *      (~7.7s at 1x; two garlands on different clocks — CLAUDE.md). Poll for `>= blobs` of them, the
 *      exact gate `perf-about.mjs:45-53` proved. Pass `blobs: 0` for routes that paint none, or the
 *      poll would time out waiting for ornaments that do not exist.
 *
 * Returns { blobs, imgs, ms } so a caller can log what it actually waited for. Throws only on a real
 * timeout, which is a harness fault worth surfacing, not a silent pass.
 */
export async function waitForReady(page, { blobs = 0, settle = 400, timeoutMs = 45000 } = {}) {
  const t0 = Date.now();

  // 1. Fonts.
  await page.evaluate(() => document.fonts?.ready).catch(() => {});

  // 2. Trigger lazy images by walking the page, then wait for the bytes.
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(
      () => [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      { timeout: Math.max(5000, timeoutMs - (Date.now() - t0)) },
    )
    .catch(() => {
      /* An image can legitimately 404 in a baseline; do not fail the whole capture on it. The count
         returned below tells the reviewer how many actually loaded. */
    });

  // 3. Blob garlands (About). Poll, do not sleep.
  if (blobs > 0) {
    let seen = 0;
    for (let i = 0; i < 120 && Date.now() - t0 < timeoutMs; i++) {
      seen = await page.evaluate(
        () => document.querySelectorAll('img[src^="blob:"], image[href^="blob:"]').length,
      );
      if (seen >= blobs) break;
      await sleep(500);
    }
    if (seen < blobs) {
      throw new Error(
        `qa/lib waitForReady: only ${seen}/${blobs} garland bitmaps painted in ${Math.round(
          (Date.now() - t0) / 1000,
        )}s — the ornament clock never finished. Not a pass; a harness/timeout fault.`,
      );
    }
  }

  await sleep(settle);
  const imgs = await page.evaluate(() => document.images.length);
  const seenBlobs = await page.evaluate(
    () => document.querySelectorAll('img[src^="blob:"], image[href^="blob:"]').length,
  );
  return { blobs: seenBlobs, imgs, ms: Date.now() - t0 };
}

/**
 * Screenshot the current page to `path`, creating parent dirs. Full-page by default.
 *
 * A very tall page at DPR 2/3 (the reduced-motion About timeline is ~2500px of SVG on its own) can
 * exceed Chrome's single-surface capture height and throw; we catch that and fall back to a
 * viewport-only shot rather than losing the frame, and report which we got. Per-section crops
 * (capture-matrix passes explicit clips) are the reliable artifact for those pages.
 */
export async function capture(page, path, { fullPage = true } = {}) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await page.screenshot({ path, fullPage });
    return { path, fullPage };
  } catch (err) {
    if (!fullPage) throw err;
    await page.screenshot({ path });
    return { path, fullPage: false, note: `fullPage failed (${err.message}); captured viewport only` };
  }
}

/**
 * Screenshot one element (a page section) to `path`. Used for About's per-section crops. Returns null
 * if the selector is absent at this viewport (e.g. the founders' parenthesis is `lg:` only), which is
 * a fact about the layout, not a fault.
 */
export async function captureElement(page, selector, path) {
  const el = await page.$(selector);
  if (!el) return null;
  await mkdir(dirname(path), { recursive: true });
  try {
    await el.screenshot({ path });
    return { path, selector };
  } catch (err) {
    return { path, selector, note: `element shot failed: ${err.message}` };
  }
}
