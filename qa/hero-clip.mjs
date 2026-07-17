/**
 * qa/hero-clip.mjs — IS THE HERO ACTUALLY CLIPPED? Ask the button, not the image.
 *
 *   node qa/hero-clip.mjs [viewportHeight]
 *
 * WHY THIS EXISTS, AND WHY project-media.mjs CANNOT ANSWER IT. That harness computes crop from
 * `|rect.width / rect.height - naturalRatio|`, which is a perfectly good question about object-fit
 * and a useless one about overflow: a clipped <img> KEEPS ITS NATURAL RATIO in
 * getBoundingClientRect(). The element reports the size it wants to be; the clip happens on an
 * ancestor's paint. So the probe reads 0% crop while a fifth of the picture sits behind the button's
 * `overflow-hidden`, and the comment at AboutPage.tsx:126 ("Measured: hero crop 0% across all
 * twelve") inherited that blind spot. It measured object-fit, which is genuinely 0, and then said
 * "crop".
 *
 * This is the session's own trap in its purest form: the instrument was not lying about its own
 * question, it was answering a different one. So this asks the only question that can see an
 * overflow clip — compare the IMAGE's rect to the BUTTON's rect, which is the thing that clips it.
 *
 * The clip is viewport-height dependent (region ratio rises as the window shortens), so this takes a
 * height. Daniel's window is shorter than 900, which is why he sees this and a 1440x900 harness does
 * not.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const VH = Number(process.argv[2] ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: [`--window-size=1440,${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: VH });
await page.goto('http://localhost:5333/#/about', { waitUntil: 'domcontentloaded' });
await sleep(1500);

// The list rows are the only way to page between projects; find them by their own markup.
const count = await page.evaluate(() => document.querySelectorAll('[data-project-list] button, nav button').length);
const names = await page.evaluate(() =>
  [...document.querySelectorAll('[data-project-list] button, nav button')].map((b) => (b.textContent || '').trim().slice(0, 28)),
);
if (!count) {
  console.error('FAIL: no project list buttons — cannot enumerate. Harness failure, not a verdict.');
  await browser.close();
  process.exit(1);
}

console.log(`viewport 1440x${VH}`);
console.log('project                        | img h  | btn h  | clipped px | % of picture');
let worst = 0;
let clipped = 0;
for (const n of names) {
  await page.evaluate((i) => {
    const b = [...document.querySelectorAll('[data-project-list] button, nav button')][i];
    b?.click();
  }, names.indexOf(n));
  await sleep(450);
  const r = await page.evaluate(() => {
    const img = document.querySelector('[data-project-hero] img, [data-project-hero] video');
    if (!img) return null;
    const btn = img.closest('button') ?? img.parentElement;
    const ir = img.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    // The clip is what the button's box refuses to paint of the image's own box.
    const px = Math.max(0, ir.height - br.height);
    return { imgH: +ir.height.toFixed(1), btnH: +br.height.toFixed(1), px: +px.toFixed(1), pct: +((px / ir.height) * 100).toFixed(1) };
  });
  if (!r) {
    console.log(`  ${n.padEnd(28)} | HARNESS: no [data-project-hero] img — reading discarded`);
    continue;
  }
  if (r.px > 0.5) clipped++;
  worst = Math.max(worst, r.pct);
  const flag = r.px > 0.5 ? '  <-- CLIPPED' : '';
  console.log(`  ${n.padEnd(28)} | ${String(r.imgH).padStart(6)} | ${String(r.btnH).padStart(6)} | ${String(r.px).padStart(10)} | ${String(r.pct).padStart(5)}%${flag}`);
}

console.log('');
if (clipped > 0) {
  console.error(`FAIL: ${clipped} of ${names.length} heroes are clipped by their button's overflow-hidden. Worst ${worst}% of the picture.`);
} else {
  console.log(`PASS: 0 of ${names.length} heroes clipped at ${VH}px.`);
}
await browser.close();
process.exit(clipped > 0 ? 1 : 0);
