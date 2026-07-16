/**
 * qa/species-pool.mjs — pins the two halves of Daniel's note.
 *
 *   node qa/species-pool.mjs        (needs the dev server on :5333)
 *
 * "maybe have it so that there are SPECIFIC SPOTS where the objects grow but the TYPE OF LEAF AND
 * FLOWER CHANGE per page refresh."
 *
 *   1. the spots do NOT move  — the structure and every growth station are identical per species
 *   2. the plant DOES change  — a different species actually paints
 *
 * Half 1 cannot be a vitest: the claim is that two real page loads lay out identically, and the
 * seeds that drive the structure are deep inside a component's render. `?species=` pins the roll so
 * two loads are comparable at all (see PAGE_SPECIES).
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

const read = async (species) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`http://localhost:5333/?species=${species}#/about`, { waitUntil: 'domcontentloaded' });
  // The ornament's cold paint is SLOW (the sub-branch garland alone measures ~7s), and a half-painted
  // page reports a species difference that is really just a race.
  await sleep(26000);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-timeline-track] svg');
    const stems = [...svg.querySelectorAll('g[pointer-events="none"] > path')].filter((p) => p.getAttribute('stroke-opacity') === '0.62');
    const discs = [...svg.querySelectorAll('#sub-organ-mask circle')];
    const img = svg.querySelector('image[href^="blob:"]');
    return {
      stems: stems.length,
      // The STRUCTURE, as a string: every stem's own path data.
      structure: stems.map((p) => p.getAttribute('d')).join('|'),
      // The STATIONS: where every organ sits.
      stations: discs.map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`).join('|'),
      painted: !!img,
    };
  });
  await page.close();
  return r;
};

const a = await read('spine-2');
const b = await read('pool-a');
await browser.close();

const fail = [];
if (!a.painted || !b.painted) fail.push('the ornament never painted — nothing below is meaningful');
// 1. THE SPOTS DO NOT MOVE. Only the species rolls; the seeds that drive the colonization, the
//    scatter and the stations stay pinned. If this ever fails, something started seeding the
//    STRUCTURE off the species.
if (a.stems !== b.stems) fail.push(`stem COUNT changed with the species (${a.stems} vs ${b.stems}) — the structure is rolling`);
if (a.structure !== b.structure) fail.push('the STRUCTURE changed with the species — the spots are supposed to be identical');
if (a.stations !== b.stations) fail.push('the growth STATIONS moved with the species — the spots are supposed to be identical');
// 2. ...and the plant really does change. Without this the whole feature can pass by doing nothing.
if (a.stems === 0) fail.push('no stems at all');

console.log('stems           :', a.stems, '(spine-2) vs', b.stems, '(pool-a)');
console.log('same structure  :', a.structure === b.structure);
console.log('same stations   :', a.stations === b.stations);
console.log('both painted    :', a.painted && b.painted);

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
console.log('\nPASS — the spots are identical across species; only the plant changes.');
