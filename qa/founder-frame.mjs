/**
 * qa/founder-frame.mjs — the founders fit ONE frame, and no vine crosses any text.
 *
 *   node qa/founder-frame.mjs        (needs the dev server on :5333)
 *
 * Daniel, three times: "The whole founder frame needs to be smaller, it should all be visible
 * within one single page." / "this is what I meant with making all the founder information fit in
 * one frame. Too big right now." And: "Make sure none of the vines are overlapping the text."
 *
 * WHY THIS IS A SCRIPT: both claims are about a real layout at a real viewport. jsdom has no
 * layout, so it cannot measure a section's height or find out whether a stroked path crosses a
 * glyph box.
 *
 * WHY THE HEIGHT BUDGET IS 816 AND NOT 900: the header is `position: fixed` and 84px tall, so it
 * covers the top of the viewport at every scroll position. The band a reader can actually see the
 * founders in is 900 - 84. This is the number the fix kept being measured against and passing while
 * Daniel kept saying it did not fit — 814 <= 816 is true and is also 2px of air, which is not
 * "one frame" on a real screen. Hence FRAME_AIR: it has to fit with room, or it has not fit.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADER_H = 84;
const VIEWPORT_H = 900;
/** The band the founders can actually occupy. */
const BUDGET = VIEWPORT_H - HEADER_H;
/** ...and it must fit that band with real air, not by 2px. */
const FRAME_AIR = 90;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: VIEWPORT_H, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:5333/?species=spine-2#/about', { waitUntil: 'domcontentloaded' });
// The ornament's cold paint is slow (~7s for the sub-branch garland alone); the vines must be on
// the page before we can ask whether they cross anything.
await sleep(26000);

const r = await page.evaluate(() => {
  const sec = document.querySelector('section[aria-label="The founders"]');
  const secR = sec.getBoundingClientRect();

  /* THE TEXT THE VINES MUST NOT CROSS. Not "the text" in the abstract — the actual glyph boxes:
     the kicker, every name/role caption, every fact (dt and dd), and the specimen captions. The
     growth engine's no-go rule only ever knew about PLATES (images), which is exactly why a branch
     could run through "THE FOUNDERS". */
  // MEASURE THE GLYPHS, NOT THE ELEMENT'S BOX. "The founders." is a <p> in a full-width column, so
  // its box is 1100px wide for a ~110px string — testing the box reports a vine "crossing text"
  // when it is sailing through empty paper a foot away, and would fail forever no matter where the
  // arms went. A Range over the text node gives the real per-line glyph runs.
  const textRects = [];
  const pad = 4; // glyphs are not their exact ink; a hair of margin is still a collision
  sec.querySelectorAll('p, dt, dd, figcaption span').forEach((el) => {
    if (el.children.length !== 0) return; // leaf elements only
    const t = (el.textContent || '').trim();
    if (!t) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const b of range.getClientRects()) {
      if (b.width > 0 && b.height > 0)
        textRects.push({ what: t.slice(0, 24), x: b.left - pad, y: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2 });
    }
  });

  /* EVERY VINE STROKE ON THE PAGE, sampled in screen space. The parenthesis arms are SVG paths, so
     getPointAtLength gives the real curve rather than its bounding box (a bbox would report the
     whole page as occupied). */
  const hits = [];
  const svgs = [...document.querySelectorAll('svg')];
  for (const svg of svgs) {
    const m = svg.getScreenCTM();
    if (!m) continue;
    for (const path of svg.querySelectorAll('path')) {
      const stroke = getComputedStyle(path).stroke;
      if (!stroke || stroke === 'none') continue;
      let len = 0;
      try { len = path.getTotalLength(); } catch { continue; }
      if (len <= 0) continue;
      for (let l = 0; l <= len; l += 6) {
        const q = path.getPointAtLength(l);
        const s = new DOMPoint(q.x, q.y).matrixTransform(m);
        for (const t of textRects) {
          if (s.x >= t.x && s.x <= t.x + t.w && s.y >= t.y && s.y <= t.y + t.h) {
            hits.push({ text: t.what, at: `${Math.round(s.x)},${Math.round(s.y)}` });
            break;
          }
        }
      }
    }
  }
  // One report per text run, not per sampled point.
  const byText = new Map();
  for (const h of hits) if (!byText.has(h.text)) byText.set(h.text, h.at);

  return {
    sectionH: Math.round(secR.height),
    textRuns: textRects.length,
    crossings: [...byText.entries()].map(([text, at]) => ({ text, at })),
  };
});

const fail = [];
if (r.sectionH > BUDGET - FRAME_AIR)
  fail.push(
    `the founders are ${r.sectionH}px tall; the visible band is ${BUDGET} (900 - ${HEADER_H} header) ` +
      `and it must fit with ${FRAME_AIR}px of air, so the budget is ${BUDGET - FRAME_AIR}.`,
  );
if (r.textRuns < 10) fail.push(`only found ${r.textRuns} text runs — the probe is not seeing the founders' text`);
for (const c of r.crossings) fail.push(`a vine crosses TEXT: "${c.text}" at ${c.at}`);

console.log('founders section :', r.sectionH, `px (budget ${BUDGET - FRAME_AIR}, band ${BUDGET})`);
console.log('text runs tested :', r.textRuns);
console.log('vine/text crossings:', r.crossings.length);
for (const c of r.crossings) console.log('   -', c.text, '@', c.at);
await browser.close();

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — the founders fit one frame with air, and no vine touches their text.');
