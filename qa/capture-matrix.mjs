/**
 * qa/capture-matrix.mjs — the baseline screenshot set Daniel reviews each round.
 *
 *   node qa/capture-matrix.mjs                 (needs the dev server; mind the port — see base.mjs)
 *   DATE=2026-07-18-baseline node qa/capture-matrix.mjs   (override the output folder)
 *   ROUTES=about VIEWPORTS=1,2,3 node qa/capture-matrix.mjs   (subset, for a fast re-check)
 *
 * For each PUBLIC route it captures the seven-viewport matrix from the overhaul plan (section 6) to
 * `qa/shots/<date>/<route>/<viewport>.png`, plus per-section crops for About. Labs and the studio are
 * skipped (D1: studio stays desktop-only; labs are unlinked dev spikes).
 *
 * Captured under REDUCED MOTION on purpose: it makes every shot deterministic (the About timeline
 * renders as its static full-height poster instead of a mid-scroll camera frame — the suite's whole
 * recurring lesson is "do not screenshot a page mid-clock"), and it is also exactly what a
 * reduced-motion visitor sees. A motion-mode variant can be added later if a specific review needs it;
 * for a baseline of "does the composition hold at this width", the finished still is the honest frame.
 *
 * The point of the baseline: it is the CURRENT site, before any overhaul. The phone-width About
 * timeline is EXPECTED to be illegible (a 1200-unit SVG meet-scaled to ~0.3x); this set is the proof
 * of the before, against which every later round is diffed.
 */
import { launch, setViewport, setReducedMotion, cancelAutoplay, waitForReady, capture, captureElement, BASE } from './lib.mjs';
import { checkTree } from './base.mjs';

const DATE = process.env.DATE ?? '2026-07-18-baseline';
const OUT = `qa/shots/${DATE}`;

/** The seven viewports (plan §6). Number them so a caller can subset by index (VIEWPORTS=1,2,3). */
const VIEWPORTS = [
  { id: '1-375x667@2', width: 375, height: 667, dpr: 2, mobile: true, role: 'iPhone SE (floor)' },
  { id: '2-390x844@3', width: 390, height: 844, dpr: 3, mobile: true, role: 'iPhone 14 (mobile-hero precedent)' },
  { id: '3-430x932@3', width: 430, height: 932, dpr: 3, mobile: true, role: 'Pro Max' },
  { id: '4-768x1024@2', width: 768, height: 1024, dpr: 2, mobile: true, role: 'iPad portrait (ambiguous tier)' },
  { id: '5-1024x768@2', width: 1024, height: 768, dpr: 2, mobile: false, role: 'iPad landscape (on lg)' },
  { id: '6-1440x900@1', width: 1440, height: 900, dpr: 1, mobile: false, role: 'desktop control (zero-regression bar)' },
  { id: '7-1920x1080@1', width: 1920, height: 1080, dpr: 1, mobile: false, role: 'wide sanity (measure-canvas ceiling)' },
];

/**
 * The public routes. `blobs` is the garland-bitmap count the ready-gate waits for: About paints them,
 * Splash/Engine paint none (so a >0 gate would time out). About pins `?species=` before the hash
 * (base.mjs documents why the query must precede the hash) so an unpinned species does not roll per load.
 */
const ROUTES = [
  { name: 'home', url: `${BASE}/#/`, blobs: 0 },
  { name: 'engine', url: `${BASE}/#/engine`, blobs: 0 },
  { name: 'about', url: `${BASE}/?species=spine-2#/about`, blobs: 4, motion: true, sections: [
      { label: 'timeline', selector: '[aria-label="How we crossed paths"]' },
      { label: 'founders', selector: '[aria-label="The founders"]' },
      { label: 'projects', selector: '[aria-label="Projects"]' },
    ] },
];

/**
 * The garland-bitmap count to wait for at THIS route AND viewport. About paints its gongbi ornaments
 * only in the DESKTOP tree (>= lg = 1024); below lg the overhaul mounts the lean DOM timeline, which
 * imports no painter and paints ZERO blobs. A flat `blobs: 4` there would poll the full 45s and then
 * throw for ornaments that will never exist — so the gate has to read the width, not the route alone.
 */
const blobsFor = (route, vp) => (route.blobs > 0 && vp.width >= 1024 ? route.blobs : 0);

// Optional subsets for a fast re-check: ROUTES=about, VIEWPORTS=1,2,3 (match the leading index).
const wantRoutes = (process.env.ROUTES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const wantVps = (process.env.VIEWPORTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const routes = wantRoutes.length ? ROUTES.filter((r) => wantRoutes.includes(r.name)) : ROUTES;
const activeViewports = wantVps.length
  ? VIEWPORTS.filter((v) => wantVps.includes(v.id.split('-')[0]))
  : VIEWPORTS;

const { browser, page } = await launch(activeViewports[0]);

// PROVE THE TREE BEFORE MEASURING IT. base.mjs exists because 5333 has served a different worktree;
// a capture set of the wrong branch looks perfect and is worthless. This tree carries the round-11
// closed-bower parenthesis and the mark-size band.
try {
  await checkTree('src/pages/about/CrossPathsTimeline.tsx', [
    ['sepia', 'INK_SEPIA'],
    ['mark-scale', 'MARK_K'],
    ['viewport-handle', 'data-timeline-viewport'],
    ['mobile-dual-tree', 'MobileTimeline'],
  ]);
} catch (err) {
  console.error(String(err.message));
  await browser.close();
  process.exit(1);
}

/**
 * Capture one (route, viewport) at a given motion mode, plus About's per-section crops. `suffix` tags
 * the motion pass (`-motion`) so it sits beside the deterministic reduced-motion frame rather than
 * overwriting it. Returns the ready record for the run log.
 */
async function captureOne(route, vp, { reduced, suffix }) {
  await setViewport(page, vp);
  await setReducedMotion(page, reduced);
  await page.goto(route.url, { waitUntil: 'domcontentloaded' });
  await cancelAutoplay(page);
  let ready;
  try {
    ready = await waitForReady(page, { blobs: blobsFor(route, vp) });
  } catch (err) {
    console.error(`  ! ${route.name} ${vp.id}${suffix}: ${err.message}`);
    ready = { error: err.message };
  }
  const path = `${OUT}/${route.name}/${vp.id}${suffix}.png`;
  const shot = await capture(page, path);
  const line = `${route.name.padEnd(7)} ${(vp.id + suffix).padEnd(20)} imgs=${ready.imgs ?? '?'} blobs=${ready.blobs ?? '?'} ${shot.note ? '[' + shot.note + ']' : 'full'}`;
  console.log('  ' + line);

  if (route.sections) {
    for (const s of route.sections) {
      const cropPath = `${OUT}/${route.name}/${vp.id.split('-')[0]}-${s.label}${suffix}.png`;
      const got = await captureElement(page, s.selector, cropPath);
      if (!got) console.log(`      (${s.label}: absent at ${vp.id}${suffix} — layout fact, not a fault)`);
    }
  }
  return { route: route.name, vp: vp.id, mode: suffix ? 'motion' : 'reduced', ...ready, note: shot.note };
}

const results = [];
for (const route of routes) {
  for (const vp of activeViewports) {
    // The deterministic reduced-motion frame is the reviewable artifact.
    results.push(await captureOne(route, vp, { reduced: true, suffix: '' }));
    // ...and a motion-mode pass where a route asks for it. On the OLD baseline About this exposed the
    // scroll-scrubbed timeline's real incoherence that the reduced-motion poster hid; on the overhaul
    // it proves the mobile DOM tree renders identically in both modes (no camera to race) and captures
    // the desktop scroll-scrub top-of-track for the zero-regression check.
    if (route.motion) results.push(await captureOne(route, vp, { reduced: false, suffix: '-motion' }));
  }
}

await browser.close();

const failures = results.filter((r) => r.error);
console.log(`\nCaptured ${results.length - failures.length}/${results.length} full-page shots to ${OUT}`);
if (failures.length) {
  console.log(`${failures.length} route/viewport(s) hit a ready-gate fault (shot still written, may be mid-load):`);
  for (const f of failures) console.log(`  - ${f.route} ${f.vp}: ${f.error}`);
}
