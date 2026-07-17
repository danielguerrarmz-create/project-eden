import { describe, expect, it } from 'vitest';
import { SPECIES_MAX_REACH, SPECIES_POOL } from './species';

describe('the ornament species pool', () => {
  it('every member stays inside the strip it is painted into', () => {
    // THE INVARIANT THE POOL RESTS ON. The spine garland's strip is GARLAND_REACH (90) half-width,
    // inside a gutter of OFFSET_X (110) — numbers that were measured for `bower/spine-2` alone. A
    // species that reaches further clips against its own strip (a clipped leaf reads as a broken
    // drawing) or, past the gutter, lands on a photograph. Adding a member without measuring its
    // reach is how the foliage ends up on someone's face.
    for (const s of SPECIES_POOL) {
      expect(s.reach, `${s.seed} reaches past its own strip`).toBeLessThan(SPECIES_MAX_REACH);
    }
  });

  it('is a pool, and every member is a real distinct seed', () => {
    expect(SPECIES_POOL.length).toBeGreaterThan(1);
    expect(new Set(SPECIES_POOL.map((s) => s.seed)).size).toBe(SPECIES_POOL.length);
  });

  it('every member carries the note that says why it was signed off', () => {
    // The pool's floor is the page's floor: the worst render a visitor can get is whichever member
    // loses the coin toss. A member with no stated reason is one nobody looked at.
    for (const s of SPECIES_POOL) {
      expect(s.note.length, `${s.seed} has no note`).toBeGreaterThan(30);
      expect(s.reach).toBeGreaterThan(0);
      expect(s.chroma).toBeGreaterThan(0);
    }
  });
});
