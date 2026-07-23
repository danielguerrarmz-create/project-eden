/**
 * MobileTimeline.test.ts — the mobile (below-`lg`) About timeline's pure layout contract.
 *
 * These guard the DATA properties the DOM tree relies on, so a bad one fails here instead of shrinking
 * to a silent wrong picture on a phone (this page's recurring failure mode). No DOM: the suite runs in
 * bare node, so everything under test is a pure function.
 */
import { describe, it, expect } from 'vitest';
import { CLUSTERS } from './clusters';
import { LAID, caption } from './MobileTimeline';

describe('MobileTimeline order', () => {
  it('LAID is the clusters in ascending chronological order', () => {
    for (let i = 1; i < LAID.length; i++) {
      expect(LAID[i].year).toBeGreaterThanOrEqual(LAID[i - 1].year);
    }
  });

  it('LAID drops nothing and duplicates nothing — a bijection with CLUSTERS by id', () => {
    // The "a list that can silently lose an item" guard: a vertical document that quietly omits a
    // cluster looks intentional, so pin the set, not just the length.
    expect(LAID).toHaveLength(CLUSTERS.length);
    expect(new Set(LAID.map((c) => c.id))).toEqual(new Set(CLUSTERS.map((c) => c.id)));
  });
});

/* The year-headers describe stood here until 2026-07-23 — the years came off the timeline, and
 * `yearHeaderOrder()` went with them. */

describe('MobileTimeline captions are authored, never invented', () => {
  it('a caption is exactly the cluster hint, trimmed — empty stays empty', () => {
    // The drawn timeline shows no captions; inventing one where `hint` is empty would be fabrication.
    for (const c of CLUSTERS) {
      expect(caption(c)).toBe(c.hint.trim());
      if (!c.hint.trim()) expect(caption(c)).toBe('');
    }
  });

  it('at least one authored caption exists (so the empty-only path is not the whole story)', () => {
    expect(CLUSTERS.some((c) => caption(c).length > 0)).toBe(true);
  });
});
