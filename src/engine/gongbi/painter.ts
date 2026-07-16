/**
 * painter.ts — the page-side client for gongbi paintings and garlands.
 *
 * One small worker pool, one in-flight ledger, one session cache. Components ask
 * for a commission (a whole plant) or a garland (growth along a path) and get a
 * Promise of the finished work; identical asks coalesce onto the same Promise
 * (React 18 double-effects, the lab grid). Bitmaps stay cached for the session.
 *
 * Fallback: browsers without OffscreenCanvas-in-worker paint on the main thread
 * through the same cores, deferred to an idle moment. Slower, identical pixels —
 * determinism is the contract either way.
 *
 * The aged-paper mount tile is painted on the main thread (a one-off ~600ms
 * 512px texture, measured 2026-07-16) and cached as a data URL that FanPainting
 * uses as a CSS background — every mount on the page is cut from the same sheet.
 */
import type { GarlandOpts } from './garland';
import type { Archetype, Voice } from './paintCore';
import type { PaintReply } from './paintWorker';
import type { PlantBounds, PlantStats } from './quality';

export interface Painting {
  bitmap: ImageBitmap;
  /** The ladder seed that actually grew the work — its signature (see quality.ts). */
  chosenSeed: string;
  stats: PlantStats;
  /** Plant bounding box on the bitmap, for matting the draw (see quality.matRect). */
  bounds: PlantBounds | null;
}

const canWork = () =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

/** A painting costs ~3s of CPU (measured 2026-07-16); a small pool keeps the founders'
 *  two same-viewport commissions from queueing behind each other. Hardware-aware, capped:
 *  paintings are precious and rare, not a render farm. */
const POOL_SIZE = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2));

type OkReply = Extract<PaintReply, { ok: true }>;

let pool: Worker[] = [];
let dispatch = 0;
let nextId = 1;
const pending = new Map<number, { resolve: (r: OkReply) => void; reject: (e: Error) => void }>();
const cache = new Map<string, Promise<unknown>>();

function getWorker(): Worker {
  if (pool.length === 0) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const w = new Worker(new URL('./paintWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<PaintReply>) => {
        const job = pending.get(e.data.id);
        if (!job) return;
        pending.delete(e.data.id);
        if (e.data.ok) {
          job.resolve(e.data);
        } else {
          job.reject(new Error(e.data.error));
        }
      };
      // A worker that fails to LOAD never answers anyone — fail every waiting
      // commission loudly instead of leaving sketches hanging forever.
      w.onerror = (e) => {
        const err = new Error(`paint worker failed: ${e.message ?? 'unknown load/runtime error'}`);
        for (const job of pending.values()) job.reject(err);
        pending.clear();
      };
      return w;
    });
  }
  dispatch = (dispatch + 1) % pool.length;
  return pool[dispatch];
}

function post(job: Record<string, unknown>): Promise<OkReply> {
  return new Promise<OkReply>((resolve, reject) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...job, id });
  });
}

/** Cache a job promise; evict on failure so a failed commission retries on remount. */
function throughCache<T>(key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const job = make();
  cache.set(key, job);
  job.catch(() => cache.delete(key));
  return job;
}

async function idle(): Promise<void> {
  await new Promise<void>((r) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => r(), { timeout: 2000 });
    } else {
      setTimeout(r, 160);
    }
  });
}

/**
 * Request a whole-plant commission. Deterministic and cached: the same
 * seed/kind/size/voice always resolves to the same painting for the session.
 */
export function requestPainting(
  seed: string,
  kind: Archetype,
  size = 1200,
  voice: Voice = 'pigment',
): Promise<Painting> {
  return throughCache(`p|${seed}|${kind}|${size}|${voice}`, async () => {
    if (canWork()) {
      const r = await post({ type: 'plant', seed, kind, size, voice });
      if (r.type !== 'plant') throw new Error('paint worker replied with the wrong job type');
      return { bitmap: r.bitmap, chosenSeed: r.chosenSeed, stats: r.stats, bounds: r.bounds };
    }
    await idle();
    const { paintPlant } = await import('./paintCore');
    const painted = paintPlant(seed, kind, size, voice);
    const bitmap = await createImageBitmap(painted.canvas as HTMLCanvasElement);
    return { bitmap, chosenSeed: painted.chosenSeed, stats: painted.stats, bounds: painted.bounds };
  });
}

/** djb2 over the geometry so layout changes re-key the cache. */
function geoHash(opts: GarlandOpts): string {
  const s = JSON.stringify([opts.path, opts.stations, opts.scale, opts.rootWidth]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Request a garland strip (growth along a path). Cached like every commission. */
export function requestGarland(opts: GarlandOpts): Promise<ImageBitmap> {
  const key = `g|${opts.seed}|${opts.voice}|${opts.width}x${opts.height}|${geoHash(opts)}`;
  return throughCache(key, async () => {
    if (canWork()) {
      const r = await post({ type: 'garland', opts });
      if (r.type !== 'garland') throw new Error('paint worker replied with the wrong job type');
      return r.bitmap;
    }
    await idle();
    const { paintGarland } = await import('./garland');
    return createImageBitmap(paintGarland(opts) as HTMLCanvasElement);
  });
}

let paperUrl: Promise<string> | null = null;

/** The shared aged-paper tile as a data URL for CSS mounts (512px, DPR-crisp at 256px CSS). */
export function requestPaperTile(): Promise<string> {
  if (!paperUrl) {
    paperUrl = import('./paintCore').then(({ paintPaperTile }) => {
      // ~600ms on the main thread, once per session (measured 2026-07-16).
      const canvas = paintPaperTile() as HTMLCanvasElement;
      return canvas.toDataURL('image/png');
    });
  }
  return paperUrl;
}
