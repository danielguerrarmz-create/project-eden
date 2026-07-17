/**
 * qa/divider.mjs — DOES THE DIVIDER SIT AT THE SAME PLACE ON EVERY PROJECT?
 *
 *   node qa/divider.mjs [viewportHeight] [viewportWidth]
 *
 * Daniel's rule (round 10, item 7): the line sits at the SAME place on EVERY project. Only images
 * above it, only text below it. It never moves.
 *
 * WHAT MOVED IT, because the brief's premise was inverted and the fix depends on getting this right:
 * the media region is the REMAINDER (`flex-1`) and the band is `shrink-0`, so
 * `dividerY = detail.bottom − band.height`. The band's height is content-driven — measured, every
 * divider position was an exact multiple of 20.6px, one line of `text-[15px] leading-snug`. No hero
 * change can affect it, and cropping heroes to chase it is the fake fix.
 *
 * WHY THIS TAKES A WIDTH. The pin is structural (every band stacked in one grid cell, so the row is
 * the tallest band at whatever width the window is) rather than a hardcoded `min-h-[302px]`, and the
 * whole reason is that 302 was a measurement at ONE viewport: change the width, the text re-wraps,
 * and the tallest band is no longer 302. So this must be run at more than one width or it verifies
 * nothing about the thing that made a constant unsafe.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const VH = Number(process.argv[2] ?? 900);
const VW = Number(process.argv[3] ?? 1440);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: [`--window-size=${VW},${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH });
await page.goto('http://localhost:5333/#/about', { waitUntil: 'domcontentloaded' });
await sleep(1500);

const names = await page.evaluate(() =>
  [...document.querySelectorAll('[data-project-list] button, nav button')].map((b) => (b.textContent || '').trim().slice(0, 26)),
);
if (!names.length) {
  console.error('FAIL: no project list buttons. Harness failure, not a verdict.');
  await browser.close();
  process.exit(1);
}

console.log(`viewport ${VW}x${VH}`);
console.log('project                    | divider y | band h | text below the line?');
const ys = [];
let textAbove = 0;
/*
 * WAIT FOR THE PICTURE, NOT FOR A GUESSED NUMBER OF MILLISECONDS. This originally clicked and measured
 * 400ms later, and it was FLAKY IN THE FALSE-POSITIVE DIRECTION: roughly one run in three reported
 * "1 MEDIA CROSSES THE LINE" on Archipedia and no other project — because Archipedia is measured FIRST,
 * when the page is least settled, and a hero whose bytes have not landed has not taken its final rect.
 * The layout was correct on every one of those runs.
 *
 * That is worth more than the fix. A guard that cries wolf does not get investigated, it gets
 * WEAKENED — the natural "fix" for an intermittent failure is to raise a tolerance or delete the
 * check, and this one is the only thing standing between the page and Daniel's rule. This suite's
 * documented trap #3 is a starved rAF making a real layout read as broken; this is the same error with
 * the sign flipped. Wait on the CONDITION (the image is loaded, a frame has been painted), never on a
 * sleep that was tuned on one machine.
 */
for (let i = 0; i < names.length; i++) {
  await page.evaluate((k) => [...document.querySelectorAll('[data-project-list] button, nav button')][k]?.click(), i);
  await page
    .waitForFunction(
      () => {
        const media = [...document.querySelectorAll('[data-project-hero] img, [data-project-rail] img')];
        if (!media.length) return false;
        return media.every((m) => m.complete && m.naturalWidth > 0);
      },
      { timeout: 15000 },
    )
    .catch(() => null); // a video-only hero has no <img>; fall through to the settle below.
  // Two rAFs: the images are in, now let the layout that depends on them actually paint.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sleep(250);
  const r = await page.evaluate(() => {
    const band = document.querySelector('[data-project-band="active"]');
    const detail = document.querySelector('[data-project-detail]');
    if (!band || !detail) return null;
    const br = band.getBoundingClientRect();
    const dr = detail.getBoundingClientRect();
    // MEASURED AGAINST THE FRAME, NOT THE PAGE, and the first draft got this wrong in a way worth
    // recording: it used `br.top + window.scrollY`, i.e. page coordinates. Paging between projects
    // moves the scroll position, so the probe reported a 300px "divider move" while the band was
    // provably constant at 302.1px on all twelve. The layout was already right and the instrument
    // was measuring the scrollbar. The divider's claim is "the same place IN ITS FRAME", so the
    // frame is what it must be measured against. (`[data-project-detail]`'s own rect is identical
    // on all twelve — that is exactly why it is the stable reference.)
    const dividerY = br.top - dr.top;
    // ONLY IMAGES ABOVE, ONLY TEXT BELOW: no media may cross the line.
    const media = [...document.querySelectorAll('[data-project-hero] img, [data-project-hero] video, [data-project-rail] img')];
    const crossing = media.filter((m) => m.getBoundingClientRect().bottom > br.top + 0.5).length;
    return { dividerY: +dividerY.toFixed(1), bandH: +br.height.toFixed(1), crossing };
  });
  if (!r) {
    console.log(`  ${names[i].padEnd(26)} | HARNESS: no active band — reading discarded`);
    continue;
  }
  ys.push(r.dividerY);
  if (r.crossing) textAbove++;
  console.log(
    `  ${names[i].padEnd(26)} | ${String(r.dividerY).padStart(9)} | ${String(r.bandH).padStart(6)} | ${r.crossing ? `${r.crossing} MEDIA CROSS THE LINE` : 'clean'}`,
  );
}

console.log('');
// Guard the probe: one reading proves nothing about "the same on every project".
if (ys.length < 5) {
  console.error(`FAIL: only ${ys.length} readings — the probe is measuring nothing.`);
  await browser.close();
  process.exit(1);
}
const spread = Math.max(...ys) - Math.min(...ys);
console.log(`divider offset within the frame, spread across ${ys.length} projects: ${spread.toFixed(2)}px  (was 94.4px before the pin)`);
let bad = false;
if (spread > 0.5) {
  console.error(`FAIL: the divider moves by ${spread.toFixed(2)}px.`);
  bad = true;
}
if (textAbove > 0) {
  console.error(`FAIL: media crosses the divider on ${textAbove} project(s).`);
  bad = true;
}
if (!bad) console.log(`PASS: the divider is constant across all ${ys.length} projects, and no media crosses it.`);
await browser.close();
process.exit(bad ? 1 : 0);
