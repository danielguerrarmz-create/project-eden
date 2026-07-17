/**
 * qa/capture-seeds.mjs — write the ten seed PNGs into a folder, unattended.
 *
 *   node qa/capture-seeds.mjs [outDir]    (needs THIS checkout's dev server)
 *
 * `#/lab/seeds` exposes `__captureSeeds()`, which saves each seed by clicking a
 * synthetic `<a download>`. That is the right call in a browser a human is sitting
 * in front of, and the wrong one for a batch: ten anchor clicks trip Chrome's
 * "download multiple files?" prompt, and a prompt nobody clicks means only seed 01
 * lands — silently, with a green console.
 *
 * So this does not download anything. It patches `HTMLAnchorElement.prototype.click`
 * to hand the data URL back to node instead, and node writes the bytes. No download
 * dir, no prompt, no per-file settling, and the PNG in the folder is byte-identical
 * to the one the browser would have saved.
 *
 * HEADED, and not by accident: these images are the geometry lock for the Fuser
 * re-skin. Headless Chrome falls back to SwiftShader, whose shadow filtering is not
 * this machine's GPU, and the whole point of the ten is that the shadow is real.
 * A window opens for ~30s. Let it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const PORT = process.env.PORT ?? '5334';
const ORIGIN = `http://localhost:${PORT}`;
const OUT = resolve(process.argv[2] ?? String.raw`C:\Users\danie\Downloads\eden-seeds`);
const EXPECT = 10;

/**
 * PREFLIGHT: is the server on this port serving THIS checkout?
 *
 * MEASURED, and the reason this exists: `restless-egg/engine-session` is a second
 * checkout of this repo that also configures port 5333 with `strictPort`, so
 * whichever dev server starts first owns the port and the second refuses to boot.
 * Point this script at that one and it does NOT fail — `#/lab/seeds` is not a route
 * on that branch, so its router falls through to the splash, the rig never installs,
 * and the only symptom is a timeout thirty seconds later that reads like a slow page.
 *
 * Vite stamps each module's absolute source path into its dev transform, so the
 * server can simply be ASKED which directory it is serving. Cheap, and it names the
 * real problem instead of making the next person bisect a timeout.
 */
const probe = await fetch(`${ORIGIN}/src/Root.tsx`).catch(() => null);
if (!probe?.ok) {
  throw new Error(`no dev server on ${ORIGIN} — start it with:  npm run dev -- --port ${PORT} --strictPort`);
}
const servedFrom = (await probe.text()).match(/fileName: "(.+?)\/src\/Root\.tsx"/)?.[1];
const here = process.cwd().replace(/\\/g, '/');
if (servedFrom && servedFrom.toLowerCase() !== here.toLowerCase()) {
  throw new Error(
    `the server on ${ORIGIN} is serving a DIFFERENT checkout:\n` +
      `  serving : ${servedFrom}\n  expected: ${here}\n` +
      `Start this checkout's own server on a free port and pass PORT=<n>.`,
  );
}

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--no-sandbox', '--window-size=1400,900'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });

  const saved = [];
  await page.exposeFunction('__save', async (name, dataUrl) => {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bytes = Buffer.from(b64, 'base64');
    await writeFile(resolve(OUT, name), bytes);
    saved.push({ name, kb: Math.round(bytes.length / 1024) });
    console.log(`  ${String(saved.length).padStart(2)}/${EXPECT}  ${name}  ${Math.round(bytes.length / 1024)} KB`);
  });

  // Before navigation, so the rig's own anchor never reaches the download stack.
  // `click()` on a detached anchor is the only thing SeedCaptureRig uses it for,
  // so intercepting the prototype catches every seed and nothing else.
  await page.evaluateOnNewDocument(() => {
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href.startsWith('data:image/png')) {
        window.__save(this.download, this.href);
        return;
      }
      return realClick.call(this);
    };
  });

  console.log(`\ncapturing ten seeds -> ${OUT}\n`);
  await page.goto(`${ORIGIN}/#/lab/seeds`, { waitUntil: 'domcontentloaded' });

  // Wait for the RIG, not for the clock: __captureSeeds is installed in an effect
  // once the Canvas mounts, and the seed chunk is lazy.
  await page.waitForFunction(() => typeof window.__captureSeeds === 'function', { timeout: 30_000 });

  // The rig does its own per-seed waiting (it polls the store for the design and
  // throws rather than photographing the wrong one), so this just needs headroom.
  await page.evaluate(() => window.__captureSeeds());

  if (saved.length !== EXPECT) {
    throw new Error(`wrote ${saved.length} of ${EXPECT} seeds — the set is incomplete`);
  }
  console.log(`\n${saved.length} seeds written to ${OUT}\n`);
} finally {
  await browser.close();
}
