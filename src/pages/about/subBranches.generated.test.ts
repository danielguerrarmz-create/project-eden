import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { subBranchPolylines } from './CrossPathsTimeline';
import precomputed from './subBranches.generated.json';

/**
 * subBranches.generated.json is the space-colonization output baked to disk so it never runs on the
 * main thread during render (round 11, item 5). colonize() was ~2.2s of blocking work in useMemo at
 * mount; the geometry is deterministic under SUB_SEED ('bower/spine-2') and reads no DOM, so the same
 * bytes come out every load and the precompute cannot move a pixel.
 *
 * This file is BOTH the generator and the drift guard, so the JSON can never silently diverge from the
 * seed that is supposed to produce it — which is the real risk of a checked-in artifact.
 *
 *   node --run test              → asserts the committed JSON equals a fresh colonization (drift guard)
 *   GEN=1 npx vitest run subBranches.generated  → REWRITES the JSON from the current code
 *
 * If SUB_SEED, the colonize params, the attractor scatter, or the obstacle layout change, this test
 * goes red until someone regenerates — which is exactly the design review "a seed is a design review,
 * not a constant" asks for, made unskippable.
 */
const jsonPath = fileURLToPath(new URL('./subBranches.generated.json', import.meta.url));

describe('sub-branch precompute', () => {
  it('the committed JSON is byte-identical to a fresh colonization', () => {
    const fresh = subBranchPolylines();
    if (process.env.GEN) {
      // JSON.stringify of a finite double is the shortest string that round-trips to the same double,
      // so parsing this back yields the identical geometry — no precision is lost baking it out.
      writeFileSync(jsonPath, JSON.stringify(fresh));
      return;
    }
    // Round-trip the fresh run through JSON too, so the comparison is against what a load actually
    // gets (parsed doubles), not the in-memory objects.
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(precomputed);
  });
});
