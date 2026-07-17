/**
 * species.ts — the ornament's species pool: the same plan, a different plant each visit.
 *
 * Daniel: "maybe have it so that there are specific spots where the objects grow but the type of
 * leaf and flower change per page refresh."
 *
 * So: POSITIONS ARE DETERMINISTIC, SPECIES IS NOT. The space-colonization structure, its growth
 * stations, the spine garland's stations and the founders' arms are identical on every load — they
 * are seeded off their own pinned seeds and nothing here touches them. What changes is which plant
 * grows on that plan.
 *
 * WHAT "THE TYPE OF LEAF AND FLOWER" IS, MECHANICALLY. `createFlora(seed)` derives a whole SPECIES
 * from its seed — leaf shape, leaf length, flower recipe, palette, the lot. So one seed is one
 * plant's kind, and swapping the seed swaps the leaves and the flowers together. That is why this
 * pool is a list of seeds and not a list of organs.
 *
 * ONE PLANT PER PAGE, not one per station. The note asks for the leaf and flower type to change per
 * refresh, and this reads it the way it is written: the page picks ONE species per load and grows
 * it everywhere. The alternative — a different species at each station — would make the ornament a
 * crowd of different plants sharing a stem, which is the exact thing `garland.ts` batches vines to
 * avoid ("one genome per garland ... so a vine has a single species' hand from root to tip"). It
 * would also cost a composer rewrite: one `flora` and one `PAR` are resolved per canvas, and every
 * organ draws from that one instance's rng.
 *
 * It is free. `painter.ts`'s cache is `new Map()` — in-memory, per SESSION, with no localStorage or
 * IndexedDB behind it. The page therefore already repaints every garland from scratch on every
 * load, so re-rolling which species gets painted costs nothing: there is no cross-load cache to
 * lose. (The brief expected a first-impression tax here. There is none to pay.)
 *
 * THE COMMISSIONS DO NOT RE-ROLL. The founder specimens are permanent works pinned in
 * `paintings.ts` and are not part of this. Two distinct systems: a commission is a painting, this
 * is which plant the ornament happens to be this visit.
 *
 * ---
 *
 * CURATING THIS POOL — READ BEFORE ADDING TO IT.
 *
 * `passesGate` (engine/gongbi/quality.ts) is a FLOOR, not a parity check, and the raw genome
 * distribution is mostly duds: washed-out ghosts, and organs whose random 3D rotation lands them
 * edge-on and renders them as curled grey slivers. Twelve seeds were swept for the three below.
 * EVERY MEMBER IS SIGNED OFF BY EYE, because the worst render a visitor can get is whichever member
 * loses the coin toss — the pool's floor IS the page's floor.
 *
 * THE MEASUREMENTS DO NOT PICK. They were taken and they are recorded here, and each one was
 * out-voted by looking at least once:
 *   - `bower/pool-m` had the MOST ink of any take and is cream-washed mush.
 *   - The best take of one sweep had the LOWEST chroma of its six.
 *   - `bower/pool-d` scored blueFrac 0.000 and renders pale blue-grey daisies — a desaturated
 *     steel-blue slips under any saturation threshold. The one prohibited colour is the one the
 *     metric is worst at seeing. Rejected by eye.
 *
 * REJECTED, and why, so nobody re-adds them:
 *   - `bower/pool-b`, `-f`, `-h`, `-j`  edge-on slivers, sparse.
 *   - `bower/pool-c`, `-m`             cream-washed mush (`-m` had the most ink of all twelve).
 *   - `bower/pool-d`                   pale blue-grey daisies. See the blueFrac note above.
 *   - `bower/pool-e`                   spiky holly leaves, washed blooms.
 *   - `bower/pool-g`                   VIOLET blooms and dark scalloped leaves. The closest call:
 *     violet is arguably in palette (it is the hero's wisteria; it was also the colour of Daniel's
 *     pinned specimen `bower/daniel-guerra-5`, which round 10 deleted along with the whole founder
 *     ledger — the palette argument stands on the wisteria alone now), and the blooms are genuinely
 *     handsome. Cut on two counts.
 *     Its leaves are the weakest of the four finalists — dark and half of them curled — and leaves
 *     are most of the ornament's mass. And it measured blueFrac 0.271, by far the highest of the
 *     twelve. Membership here is a COIN TOSS, not a choice: shipping the blue-most take means a
 *     visitor can get a page Daniel never picked, on a page whose law is that nothing blue
 *     survives. A pinned specimen can be violet because someone chose it; a pool member cannot.
 *
 * `reach` is the exception: it is a real invariant and it is why this pool is safe. The spine
 * garland paints into a strip of half-width GARLAND_REACH (90) inside a gutter of OFFSET_X (110),
 * and those numbers were measured for `bower/spine-2` ALONE. A species whose foliage reaches
 * further would clip against its own strip (a clipped leaf reads as a broken drawing) or, past 110,
 * land on a photograph. So every member's reach is measured and recorded, and there is a test.
 * `bower/pool-a` reaches 84 of the 90 available: the pool has 6px of headroom, not a lot of room to
 * add a lusher plant without re-tuning the strip.
 */

export interface Species {
  /** The seed. `createFlora` derives the whole plant kind from it. */
  seed: string;
  /** What it looks like — the reason it is in the pool, in words, for the next reader. */
  note: string;
  /** Measured on the spine garland's own strip at GARLAND_SCALE (1.5): the furthest any ink gets
   *  from the strip's centre line, in world units. MUST stay under GARLAND_REACH (90). */
  reach: number;
  /** Measured mean saturation over inked pixels. Recorded, not used to choose. */
  chroma: number;
}

/** Must hold for every member, or the ornament can clip its own strip / touch a plate. */
export const SPECIES_MAX_REACH = 90;

export const SPECIES_POOL: readonly Species[] = [
  {
    seed: 'bower/spine-2',
    note: 'pale pink daisies with red centres, broad sage leaves with a legible midrib. The page shipped on this one; it is the reference the others were judged against.',
    reach: 53,
    chroma: 0.324,
  },
  {
    seed: 'bower/pool-a',
    note: 'dusty-rose ruffled blooms and round sage leaves. The lushest of the twelve and the closest to the founders\' own specimens.',
    reach: 84,
    chroma: 0.337,
  },
  {
    seed: 'bower/pool-k',
    note: 'pale pink trumpet blooms and broad round leaves. The palest member that still has form — the blooms read as flowers rather than as smudges.',
    reach: 54,
    chroma: 0.339,
  },
];

/**
 * THE PAGE'S PLANT FOR THIS VISIT. Module scope, so it is drawn ONCE per page load and every
 * garland on the page — spine, sub-branches, the founders' arms, the coda — grows the same plant.
 * Rolling per component would put four different species on one page, which is the crowd this is
 * meant to avoid.
 *
 * `?species=<seed>` pins it. Not a debug leftover: QA and the frame-sequence scripts have to be
 * able to look at a chosen member, and a screenshot of a random plant cannot be compared to
 * anything. An unknown value falls through to the roll rather than throwing — a bad query string
 * should not cost the page its ornament.
 */
export const PAGE_SPECIES: string = (() => {
  const pinned = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('species');
  const hit = pinned && SPECIES_POOL.find((s) => s.seed === pinned || s.seed === `bower/${pinned}`);
  if (hit) return hit.seed;
  return SPECIES_POOL[Math.floor(Math.random() * SPECIES_POOL.length)].seed;
})();
