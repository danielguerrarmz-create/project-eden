/**
 * paintWorker.ts — the studio's painting room. A module worker (Vite bundles it
 * via `new Worker(new URL(...), { type: 'module' })` in painter.ts) that grows
 * quality-gated gongbi paintings and path-following garlands off the main
 * thread, posting them back as transferable ImageBitmaps so a 2-second
 * commission never janks the scroll.
 *
 * Protocol (see painter.ts, the only client):
 *   in:  { id, type: 'plant', seed, kind, size, voice }
 *      | { id, type: 'garland', opts }
 *   out: { id, ok: true, type: 'plant', bitmap, chosenSeed, stats, bounds }
 *      | { id, ok: true, type: 'garland', bitmap }        (bitmap transferred)
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
  | { id: number; ok: true; type: 'garland'; bitmap: ImageBitmap }
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
      const bitmap = await createImageBitmap(paintGarland(job.opts));
      const reply: PaintReply = { id: job.id, ok: true, type: 'garland', bitmap };
      (self as unknown as Worker).postMessage(reply, [bitmap]);
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
