/**
 * paintWorker.ts — the studio's painting room. A module worker (Vite bundles it
 * via `new Worker(new URL(...), { type: 'module' })` in painter.ts) that grows
 * quality-gated gongbi paintings and path-following garlands off the main
 * thread, so a 2-second commission never janks the scroll.
 *
 * A GARLAND COMES BACK AS AN ENCODED BLOB, NOT AN ImageBitmap, and that is the difference
 * between "the painting is off-thread" and "the page is off-thread". Every caller wants a URL
 * for an <img>/<image>, so an ImageBitmap made each of them drag the pixels back onto the main
 * thread to draw and PNG-encode them by hand. Measured on the About page: `toBlob` was 6,291ms
 * of main-thread self time — 51.9% of everything — for four garlands, while the workers sat
 * idle. `OffscreenCanvas.convertToBlob` does the same encode here, in parallel, on threads that
 * are already painting. The main thread's whole job is now `URL.createObjectURL`.
 *
 * A PLANT still comes back as an ImageBitmap: FanPainting draws it into a canvas it owns (it
 * mattes and composites), so it never encodes anything and has nothing to gain.
 *
 * Protocol (see painter.ts, the only client):
 *   in:  { id, type: 'plant', seed, kind, size, voice }
 *      | { id, type: 'garland', opts }
 *   out: { id, ok: true, type: 'plant', bitmap, chosenSeed, stats, bounds }   (bitmap transferred)
 *      | { id, ok: true, type: 'garland', blob }
 *      | { id, ok: false, error }
 */
import { paintGarland, type GarlandOpts } from './garland';
import { paintPlant, type Archetype, type Voice } from './paintCore';
import type { PlantBounds, PlantStats } from './quality';

export type PaintJob =
  | { id: number; type: 'plant'; seed: string; kind: Archetype; size: number; voice: Voice }
  | { id: number; type: 'garland'; opts: GarlandOpts };

export type PaintReply =
  | {
      id: number;
      ok: true;
      type: 'plant';
      bitmap: ImageBitmap;
      chosenSeed: string;
      stats: PlantStats;
      bounds: PlantBounds | null;
    }
  | { id: number; ok: true; type: 'garland'; blob: Blob }
  | { id: number; ok: false; error: string };

self.onmessage = async (e: MessageEvent<PaintJob>) => {
  const job = e.data;
  try {
    if (job.type === 'plant') {
      const painted = paintPlant(job.seed, job.kind, job.size, job.voice);
      const bitmap = await createImageBitmap(painted.canvas);
      const reply: PaintReply = {
        id: job.id,
        ok: true,
        type: 'plant',
        bitmap,
        chosenSeed: painted.chosenSeed,
        stats: painted.stats,
        bounds: painted.bounds,
      };
      (self as unknown as Worker).postMessage(reply, [bitmap]);
    } else {
      // Painted AND encoded here. See the header: handing back a bitmap made every caller
      // re-encode it on the main thread, which was over half of the page's blocking time.
      const canvas = paintGarland(job.opts) as unknown as OffscreenCanvas;
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const reply: PaintReply = { id: job.id, ok: true, type: 'garland', blob };
      (self as unknown as Worker).postMessage(reply);
    }
  } catch (err) {
    const reply: PaintReply = {
      id: job.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(reply);
  }
};
