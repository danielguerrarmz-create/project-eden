/**
 * qa/project-media.mjs — the supporting rail stays inside its region, on every project.
 *
 *   node qa/project-media.mjs        (needs the dev server on :5333)
 *
 * Daniel: "every project seems to make the same mistake with the images overlapping and passing
 * their dedicated boundary." His annotated Dougherty screenshot shows the right-hand stack running
 * past the bottom of its region into the "WHAT WE LEARNED" pill.
 *
 * WHY THIS CANNOT HAPPEN ON HEAD, and why it is still worth a test: `railWidth` derives the rail's
 * width from the height it is given AND the gaps it must pay for — W = (H - (n-1)*gap) / sum(1/ratio).
 * The cells plus the gaps then sum to exactly the height. The stack fits by construction rather than
 * by tuning — precisely the kind of invariant that a later "just make the rail a bit wider" destroys.
 *
 * It also checks the two sins that a naive fix would reintroduce: a cropped cell, and a sliver.
 *
 * TWO INDEPENDENT INSTRUMENTS, because the first version of this script had one and it was the wrong
 * one. `past` compares the lowest CELL's bottom to the row; `spill` asks the rail its own
 * scrollHeight - clientHeight. They caught the (n-1)*gap bug at 23 and 24 respectively. Keep both:
 * they fail together, and a single reading that looks clean is how this bug survived 72 of them.
 *
 * ---
 *
 * THIS FILE CERTIFIED A FALSE CLAIM FOR ROUNDS, AND THE FIX IS THE POINT (round 10).
 *
 * It printed "no hero crop" across all twelve while 22% of Origami's hero sat behind a clip, and
 * CLAUDE.md quoted it. The reason is worth stating exactly, because it is this session's trap in its
 * purest form: it computed crop from `|rect.width / rect.height - naturalRatio|`, and **a clipped
 * <img> KEEPS ITS NATURAL RATIO in getBoundingClientRect()**. The element reports the size it WANTS
 * to be; the clip happens on an ANCESTOR's paint and never touches the element's own rect. So the
 * instrument was never broken. It answered a question about object-fit correctly, and its answer got
 * quoted for the question nobody asked.
 *
 * The lesson generalises past this bug: **a reading is only evidence for the question it actually
 * asks.** The defence is to name the question in the variable, which is why there is no `heroCropPct`
 * here any more. "Crop" is ambiguous across two mechanisms and the ambiguity is what let one
 * measurement stand in for the other:
 *
 *   - `heroRatioPct` — object-fit distortion. The element's own rect vs its natural ratio. Genuinely
 *     0, and that is a real thing to keep guarding (`fill` + cover would move it).
 *   - `heroClipPct`  — overflow. The IMAGE's rect vs the BUTTON's rect, the box that actually clips.
 *     The ONLY question that can see what Daniel saw.
 *
 * They are different mechanisms and neither implies the other. `qa/hero-clip.mjs` owns the clip
 * question in depth; this file measures it too, on purpose, because THIS is the file whose PASS line
 * got quoted. A guard that reports a clean bill of health next to a blind spot is how the blind spot
 * survives.
 *
 * AND IT TAKES A VIEWPORT HEIGHT, which is an argument about harness design, not about one bug. This
 * was pinned at 1440x900 and therefore COULD NOT SEE the defect: the clip depends on the region's
 * ratio, which rises as the window shortens. At 1440x760 all twelve heroes clipped; at 900, three.
 * A harness that can only look at one viewport is not measuring the page, it is measuring a
 * screenshot of it.
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
/** Daniel's window is shorter than 900. Default to 900 for continuity; pass 760 to see what he sees. */
const VH = Number(process.argv[2] ?? 900);
const VW = Number(process.argv[3] ?? 1440);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sub-pixel rounding only. Anything more is the rail past its box. */
const SLOP = 1.5;
/** Below this a cell is a sliver, not a picture. Archipedia's 0.46-ratio shot came out 38px wide
 *  once; the narrowest honest cell measured across all twelve is 148. */
const MIN_CELL = 60;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', `--window-size=${VW},${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:5333/?species=spine-2#/about', { waitUntil: 'domcontentloaded' });
await sleep(9000);

const names = await page.evaluate(() => [...document.querySelectorAll('nav ol button')].map((b) => (b.textContent || '').trim().slice(0, 24)));
const rows = [];
for (let i = 0; i < names.length; i++) {
  await page.evaluate((k) => document.querySelectorAll('nav ol button')[k]?.click(), i);
  await sleep(500);
  rows.push(
    await page.evaluate(() => {
      const rail = document.querySelector('[data-project-rail]');
      const hero = document.querySelector('[data-project-hero]');
      const band = document.querySelector('[data-project-detail] > :last-child');
      const heroEl = hero?.querySelector('img, video');
      const r = (e) => (e ? e.getBoundingClientRect() : null);
      const hb = r(heroEl);
      const nat = heroEl ? (heroEl.tagName === 'IMG' ? heroEl.naturalWidth / heroEl.naturalHeight : (heroEl.videoWidth || 0) / (heroEl.videoHeight || 1)) : 0;
      // OBJECT-FIT DISTORTION: the element's own rect against its natural ratio. This is the only
      // question this file ever asked, and it is a fine question. It just cannot see a clip.
      const ratioPct = nat && hb ? +((Math.abs(hb.width / hb.height - nat) / nat) * 100).toFixed(1) : 0;
      // OVERFLOW CLIP: the image's rect against the BUTTON's, because the button is what refuses to
      // paint the overflow. A clipped image's own rect is innocent — it reports the size it wants.
      const btn = heroEl ? (heroEl.closest('button') ?? heroEl.parentElement) : null;
      const bt = r(btn);
      const clipPx = hb && bt ? Math.max(0, hb.height - bt.height) : 0;
      const clipPct = hb && clipPx > 0 ? +((clipPx / hb.height) * 100).toFixed(1) : 0;
      // THE ONE LICENSED CROP. A deliberate crop and an accidental one look identical to a rect, so
      // the page says which is which and the probe counts them — see AboutPage's ProjectImg.
      const licensed = !!heroEl?.hasAttribute('data-licensed-crop');
      const licensedCount = document.querySelectorAll('[data-licensed-crop]').length;
      if (!rail)
        return {
          rail: 0,
          past: 0,
          spill: 0,
          intoBand: -999,
          minCell: 999,
          heroRatioPct: ratioPct,
          heroClipPct: clipPct,
          licensed,
          licensedCount,
        };
      const rowB = r(rail.parentElement);
      const bb = r(band);
      const kids = [...rail.children].map((c) => r(c));
      const cells = kids.map((c) => c.width);
      // MEASURE THE CONTENT, NOT THE BOX. The rail is `h-full`, so its own rect is exactly the row's
      // by definition and `rail.bottom - row.bottom` is 0 no matter how far the cells spill out of
      // it. That reported "no overflow" on 72 readings while sheet 11-12 was visibly sitting on the
      // WHAT WE LEARNED pill. The last CELL's bottom is the thing that overflows.
      const rb = { bottom: kids.length ? Math.max(...kids.map((c) => c.bottom)) : r(rail).bottom };
      return {
        rail: cells.length,
        past: +(rb.bottom - rowB.bottom).toFixed(1),
        // The rail asked about ITSELF. A box whose children spill out of it still reports its own
        // border box from getBoundingClientRect; only scrollHeight admits the content is bigger.
        spill: rail.scrollHeight - rail.clientHeight,
        intoBand: bb ? +(rb.bottom - bb.top).toFixed(1) : -999,
        minCell: Math.round(Math.min(...cells)),
        heroRatioPct: ratioPct,
        heroClipPct: clipPct,
        licensed,
        licensedCount,
      };
    }),
  );
}

console.table(rows.map((r, i) => ({ project: names[i], ...r })));

const fail = [];
rows.forEach((r, i) => {
  if (r.past > SLOP) fail.push(`${names[i]}: the rail runs ${r.past}px PAST its region`);
  if (r.spill > SLOP) fail.push(`${names[i]}: the rail's content spills ${r.spill}px out of the rail (gaps unbudgeted?)`);
  if (r.intoBand > SLOP) fail.push(`${names[i]}: the rail collides ${r.intoBand}px into the info band`);
  if (r.rail > 0 && r.minCell < MIN_CELL) fail.push(`${names[i]}: a cell is ${r.minCell}px wide — a sliver`);
  // The licensed crop is ALLOWED to deviate, and only it. Anything else deviating is the regression.
  if (r.heroRatioPct > 2 && !r.licensed)
    fail.push(`${names[i]}: the hero is DISTORTED ${r.heroRatioPct}% off its natural ratio (object-fit)`);
  // A LICENCE THAT SPREADS IS A PRECEDENT, which is the thing Daniel's ruling was explicitly not.
  // One asset carries it. If this ever counts two, someone has copied the flag.
  if (r.licensedCount > 1) fail.push(`${names[i]}: ${r.licensedCount} licensed crops in the DOM — the licence has SPREAD`);
  if (r.heroClipPct > 0.5) fail.push(`${names[i]}: the hero is CLIPPED ${r.heroClipPct}% by its button's overflow`);
});
await browser.close();

// GUARD THE PROBE BEFORE THE VERDICT. This printed "PASS at 1440x900 — across all 0 projects" during
// round 10, while the page was failing to compile and rendering nothing at all. Every check above
// iterates `rows`, so an empty list satisfies all of them and the harness reports success at the
// exact moment it can see least. A green that means "I found nothing to look at" is the most
// expensive kind, because it is indistinguishable from "I looked and it was fine" — and it was
// nearly believed as an A/B baseline here. The page has twelve projects; anything under that is the
// harness failing, not the layout passing.
if (rows.length < 12) {
  console.error(
    `\nHARNESS FAILURE: only ${rows.length} of 12 projects were measured. This is not a verdict — ` +
      `nothing above it means anything. Check the page compiled and the list rendered.`,
  );
  process.exit(1);
}

if (fail.length) {
  console.error('\nFAIL\n - ' + fail.join('\n - '));
  process.exit(1);
}
// SAY ONLY WHAT WAS MEASURED, AT THE SIZE IT WAS MEASURED AT. The old line here said "no hero crop"
// full stop, and that sentence outlived its own evidence: it was quoted into CLAUDE.md as a property
// of the page when it was a reading of one mechanism at one viewport.
console.log(
  `\nPASS at ${VW}x${VH} — across all ${rows.length} projects: the rail stays in its region, no slivers, ` +
    `no hero distorted off its natural ratio, no hero clipped by its button. ` +
    `(Clipping is viewport-height dependent: also run this at 760.)`,
);
