/**
 * qa/header-nav.mjs — the mobile hamburger nav: behaviour asserts + review captures, one probe.
 *
 *   node qa/header-nav.mjs                 assert + capture to qa/shots/<date>/header/
 *   DATE=2026-07-20-nav node qa/header-nav.mjs
 *
 * Asserts, at phone widths: the hamburger is a >=44px button, opening it reveals the nav's links
 * (each >=44px, and every href a route that actually ships), and — the load-bearing one —
 * `--header-h` does NOT change when the menu opens (the dropdown is an absolute overlay, so a
 * `100svh - var(--header-h)` consumer never jumps). At `md`+ : the inline pill shows and the
 * hamburger is gone (identical to before). Captures the header region closed and open at each width
 * so the pixels can be reviewed.
 *
 * 2026-07-21: this said "the three links" and hardcoded 3. The nav is ONE link now ("about") —
 * "how it works" and "studio" left with the rest of the engine's public surface. The count is read
 * off the same list the app renders rather than re-typed here, and the hrefs are checked against the
 * public routes, so the next nav change fails this probe honestly instead of failing it as arithmetic.
 */
import { launch, setViewport, setReducedMotion, waitForReady, capture, sleep, BASE } from './lib.mjs';

const DATE = process.env.DATE ?? new Date().toISOString().slice(0, 10);
const OUT = `qa/shots/${DATE}/header`;
const WIDTHS = [
  { w: 375, h: 667, dpr: 2, mobile: true },
  { w: 390, h: 844, dpr: 3, mobile: true },
  { w: 430, h: 932, dpr: 3, mobile: true },
  { w: 768, h: 1024, dpr: 2, mobile: true },
  { w: 1440, h: 900, dpr: 1, mobile: false },
];
const MENU = 'button[aria-controls="mobile-nav-menu"]';
const results = [];
const fail = (m) => results.push(['FAIL', m]);
const pass = (m) => results.push(['ok', m]);

const { browser, page } = await launch(WIDTHS[0]);
for (const vp of WIDTHS) {
  await setViewport(page, { width: vp.w, height: vp.h, dpr: vp.dpr, mobile: vp.mobile });
  await setReducedMotion(page, true);
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page, { blobs: 0 });

  const clip = { x: 0, y: 0, width: vp.w, height: 300 };
  await capture(page, `${OUT}/${vp.w}-closed.png`, { fullPage: false }).catch(() => {});
  await page.screenshot({ path: `${OUT}/${vp.w}-closed.png`, clip });

  const collapsed = vp.w < 768;
  const state = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-controls="mobile-nav-menu"]');
    const inline = [...document.querySelectorAll('header nav')].find((n) => !n.id);
    const br = btn?.getBoundingClientRect();
    return {
      hamburgerVisible: btn ? getComputedStyle(btn.closest('div.relative')).display !== 'none' : false,
      btnW: br ? Math.round(br.width) : 0,
      btnH: br ? Math.round(br.height) : 0,
      inlineDisplay: inline ? getComputedStyle(inline).display : 'none',
      headerVar: getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim(),
    };
  });

  if (collapsed) {
    if (!state.hamburgerVisible) fail(`${vp.w}: hamburger not visible`);
    else if (state.btnW < 44 || state.btnH < 44) fail(`${vp.w}: hamburger ${state.btnW}x${state.btnH} < 44`);
    else pass(`${vp.w}: hamburger ${state.btnW}x${state.btnH}`);
    if (state.inlineDisplay !== 'none') fail(`${vp.w}: inline nav should be hidden, is ${state.inlineDisplay}`);

    // Fire the button's own click(), NOT a coordinate mouse click: puppeteer's clickable-point maths
    // mis-lands on this fixed button at some DPR3 widths across a multi-viewport run (390 misses, 430
    // hits) — a CDP box-model quirk, not a page defect. el.click() dispatches a real click event that
    // React's onClick handles, independent of coordinates, so it exercises the toggle at every width.
    await page.$eval(MENU, (el) => el.click());
    // Wait for the panel itself, not a wall-clock guess (the suite's standing lesson): AnimatePresence
    // mounts it asynchronously.
    const appeared = await page.waitForSelector('#mobile-nav-menu', { timeout: 2500 }).then(() => true).catch(() => false);
    if (!appeared) fail(`${vp.w}: menu did not mount after clicking the hamburger`);
    await sleep(150); // let the 180ms fade settle before the shot
    await page.screenshot({ path: `${OUT}/${vp.w}-open.png`, clip });
    const open = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-controls="mobile-nav-menu"]');
      const menu = document.querySelector('#mobile-nav-menu');
      const links = menu ? [...menu.querySelectorAll('a')].map((a) => ({ h: Math.round(a.getBoundingClientRect().height), href: a.getAttribute('href') })) : [];
      // The inline pill is `hidden md:flex`: still in the DOM at phone widths, just not shown.
      // It renders from the same NAV_LINKS array, so it is the honest expectation for the
      // dropdown — no count typed into this file to go stale.
      const inline = [...document.querySelectorAll('header nav')].find((n) => !n.id);
      return {
        expanded: btn?.getAttribute('aria-expanded'),
        links,
        inlineHrefs: inline ? [...inline.querySelectorAll('a')].map((a) => a.getAttribute('href')) : [],
        headerVar: getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim(),
        focusInMenu: menu ? menu.contains(document.activeElement) : false,
      };
    });
    if (open.expanded !== 'true') fail(`${vp.w}: aria-expanded not true on open`);
    const dropdownHrefs = open.links.map((l) => l.href);
    if (dropdownHrefs.length === 0) fail(`${vp.w}: the dropdown rendered no links at all`);
    if (dropdownHrefs.join('|') !== open.inlineHrefs.join('|')) {
      fail(`${vp.w}: dropdown and inline nav have drifted: [${dropdownHrefs}] vs [${open.inlineHrefs}]`);
    } else pass(`${vp.w}: dropdown matches the inline nav (${dropdownHrefs.join(', ')})`);
    // Only routes a PRODUCTION build renders may be in the nav. Keep in step with `routes` /
    // `ENGINE_ROUTES` in src/routing.ts: an engine href here would work in dev and land the user
    // on the splash in production, which is a link that silently lies.
    const PUBLIC_HREFS = ['#/', '#/about'];
    const stowaway = dropdownHrefs.find((h) => !PUBLIC_HREFS.includes(h));
    if (stowaway) fail(`${vp.w}: nav links ${stowaway}, which is not a public route`);
    if (open.links.some((l) => l.h < 44)) fail(`${vp.w}: a dropdown row < 44px`);
    if (!open.focusInMenu) fail(`${vp.w}: focus did not move into the menu`);
    // THE ONE THAT MATTERS: the overlay must not change the measured header height.
    if (open.headerVar !== state.headerVar) fail(`${vp.w}: --header-h changed on open ${state.headerVar} -> ${open.headerVar}`);
    else pass(`${vp.w}: --header-h stable at ${open.headerVar} (menu open)`);

    // Escape closes + restores focus to the toggle — and leaves this page in a clean CLOSED state
    // before the next width. (Reusing one page across widths, a menu left open poisons the next
    // width's open because a same-hash goto is not a full remount — a harness artifact, not a defect.)
    await page.keyboard.press('Escape');
    const closedAgain = await page.waitForFunction(() => !document.querySelector('#mobile-nav-menu'), { timeout: 2000 }).then(() => true).catch(() => false);
    const focusBack = await page.evaluate(() => document.activeElement === document.querySelector('button[aria-controls="mobile-nav-menu"]'));
    if (!closedAgain) fail(`${vp.w}: Escape did not close the menu`);
    else if (!focusBack) fail(`${vp.w}: Escape did not restore focus to the toggle`);
    else pass(`${vp.w}: Escape closes + restores focus`);
  } else {
    if (state.hamburgerVisible) fail(`${vp.w}: hamburger should be hidden at md+`);
    if (state.inlineDisplay === 'none') fail(`${vp.w}: inline nav should show at md+`);
    else pass(`${vp.w}: inline nav ${state.inlineDisplay}, hamburger hidden`);
  }
}
await browser.close();

const fails = results.filter(([s]) => s === 'FAIL');
for (const [s, m] of results) console.log(`  ${s === 'ok' ? '✓' : '✗'} ${m}`);
console.log(`\n${results.length - fails.length}/${results.length} checks passed · shots in ${OUT}`);
process.exit(fails.length ? 1 : 0);
