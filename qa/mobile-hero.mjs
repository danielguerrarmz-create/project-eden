/**
 * qa/mobile-hero.mjs — NO MOBILE HERO IS CROPPED. The banned pattern lived here for rounds.
 *
 *   node qa/mobile-hero.mjs [viewportWidth] [viewportHeight]     (needs the dev server on :5333)
 *
 * WHY THIS EXISTS. `object-fit: cover` is banned on heroes — it silently cropped 21% off Plentify and
 * the law has been in CLAUDE.md ever since. It was nevertheless STILL LIVE on mobile, and it was
 * reported three separate times before anyone put a number on it: `Gallery` passed its hero neither
 * `fit` nor `fill`, so it landed on ProjectImg's default `object-cover` branch inside a hardcoded
 * `aspect-[3/2]` box.
 *
 * MEASURED AT 390x844 BEFORE THE FIX: eight heroes cropped, worst **22.6%** (Robotic Factory), then
 * Resia 18.5%, Archipedia 18.1%, Synthetic Vision 17.7%. The banned pattern was costing MORE on mobile
 * than the 21% incident that banned it.
 *
 * WHY IT SURVIVED, AND THIS IS THE POINT OF THE FILE: every instrument on this page measured DESKTOP,
 * where the mobile tree is `lg:hidden` and its rects are meaningless. `qa/project-media.mjs` and
 * `qa/hero-clip.mjs` both run at 1440 and neither can see this by construction. The bug was not hidden
 * by subtlety; it was hidden by a viewport nobody pointed an instrument at. Hence this takes a WIDTH,
 * and defaults to a phone.
 *
 * THE QUESTION IT ASKS, precisely, because "crop" is ambiguous on this page and the ambiguity is what
 * let a false claim stand for rounds:
 *
 *   - object-fit CROP (this file): the element's BOX ratio vs the image's NATURAL ratio. When they
 *     disagree, `cover` throws away the difference. This is a real crop and it is what happened here.
 *   - overflow CLIP (`qa/hero-clip.mjs`): the image's rect vs the BUTTON's rect. A DIFFERENT mechanism.
 *     A clipped <img> keeps its natural ratio, so this file is blind to it, exactly as that file is
 *     blind to this. Neither implies the other. Run both.
 */
import puppeteer from 'puppeteer-core';
import { BASE } from './base.mjs';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const VW = Number(process.argv[2] ?? 390);
const VH = Number(process.argv[3] ?? 844);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sub-pixel/rounding tolerance. A hero at its own shape measures 0.0. */
const TOL = 2;
/** The page has twelve projects and the mobile tree renders all of them at once, no clicking. */
const EXPECTED = 12;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', `--window-size=${VW},${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

/*
 * THE MOBILE HEROES ARE `loading="lazy"` AND MOST OF THEM ARE BELOW THE FOLD, so on a fresh load four
 * of twelve had naturalWidth 0. That matters more than it looks: `0/0` is NaN, NaN > TOL is FALSE, and
 * an unmeasured hero would therefore have been counted as a PASSING one. The first run of this file
 * caught it only because unmeasurable rows are reported as a HARNESS fault instead of being skipped —
 * which is the whole design rule this suite keeps relearning. Scroll them in and wait for the bytes.
 */
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForFunction(
  () => [...document.querySelectorAll('[data-mobile-hero] img')].every((i) => i.complete && i.naturalWidth > 0),
  { timeout: 30000 },
);
await sleep(400);

const rows = await page.evaluate(() => {
  const out = [];
  for (const box of document.querySelectorAll('[data-mobile-hero]')) {
    const img = box.querySelector('img');
    // A <video> hero renders as its poster <img> under reduced motion, which is what we pin.
    if (!img) {
      out.push({ src: '(no img)', harness: true });
      continue;
    }
    const rect = img.getBoundingClientRect();
    const nat = img.naturalWidth / img.naturalHeight;
    // AN IMAGE THAT HAS NOT LOADED HAS NO NATURAL RATIO and would divide to NaN, which compares false
    // against every threshold and would PASS. That is the "green because I found nothing" failure the
    // rest of this suite has been bitten by; it is a harness fault and is reported as one.
    if (!nat || !isFinite(nat) || rect.width < 1) {
      out.push({ src: img.src.split('/').pop(), harness: true });
      continue;
    }
    const boxR = rect.width / rect.height;
    const lost = boxR > nat ? (1 - nat / boxR) * 100 : (1 - boxR / nat) * 100;
    out.push({
      src: img.src.split('/').pop().slice(0, 34),
      natRatio: +nat.toFixed(3),
      boxRatio: +boxR.toFixed(3),
      lostPct: +lost.toFixed(1),
      objectFit: getComputedStyle(img).objectFit,
    });
  }
  return out;
});

console.log(`viewport ${VW}x${VH}`);
console.table(rows);

const harness = rows.filter((r) => r.harness);
if (harness.length) {
  console.error(`\nHARNESS FAILURE: ${harness.length} hero(es) had no measurable image. Not a verdict.`);
  await browser.close();
  process.exit(1);
}
// A GREEN THAT MEANS "I FOUND NOTHING" IS THE MOST EXPENSIVE KIND. Every check below iterates `rows`,
// so an empty list satisfies all of them and the harness reports success at the moment it sees least.
if (rows.length < EXPECTED) {
  console.error(
    `\nHARNESS FAILURE: found ${rows.length} of ${EXPECTED} mobile heroes. Nothing above is a verdict — ` +
      `check the page compiled and the lg:hidden tree rendered.`,
  );
  await browser.close();
  process.exit(1);
}

const cropped = rows.filter((r) => r.lostPct > TOL);
await browser.close();

if (cropped.length) {
  console.error(
    `\nFAIL: ${cropped.length} of ${rows.length} mobile heroes are CROPPED. Worst ${Math.max(...cropped.map((c) => c.lostPct))}%.\n` +
      cropped.map((c) => ` - ${c.src}: box ${c.boxRatio} vs natural ${c.natRatio} — ${c.lostPct}% of the picture gone`).join('\n') +
      `\n\nA hero is not a box to be filled. Give the image its own shape back; do not pick a better ratio.`,
  );
  process.exit(1);
}
console.log(`\nPASS at ${VW}x${VH} — all ${rows.length} mobile heroes render at their own natural ratio, 0 cropped.`);
