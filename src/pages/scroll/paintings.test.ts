import { describe, expect, it } from 'vitest';
import { DISCIPLINE_ORDER, PROJECTS } from '../about/projects';
import { ALL_COMMISSIONS, groupProjects, INSCRIPTION, PAINTINGS } from './paintings';

describe('the commission ledger', () => {
  it('hangs exactly seven paintings — the flower economy is a design rule', () => {
    expect(ALL_COMMISSIONS).toHaveLength(7);
  });

  it('gives every commission a unique seed in the bower/ namespace', () => {
    const seeds = ALL_COMMISSIONS.map((c) => c.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
    for (const seed of seeds) expect(seed).toMatch(/^bower\//);
  });

  it('hangs plants on the vellum only at the bookends; everything else is mounted', () => {
    expect(PAINTINGS.hero.mode).toBe('transparent');
    expect(PAINTINGS.eden.mode).toBe('transparent');
    const mounted = ALL_COMMISSIONS.filter((c) => c.mode === 'mounted');
    expect(mounted).toHaveLength(5);
  });

  it('carries a discipline frontispiece for every discipline in the menu order', () => {
    for (const d of DISCIPLINE_ORDER) {
      expect(PAINTINGS[d]).toBeDefined();
    }
  });

  it('requires alt text on every painting', () => {
    for (const c of ALL_COMMISSIONS) expect(c.alt.length).toBeGreaterThan(10);
  });
});

describe('groupProjects', () => {
  it('covers all twelve projects exactly once, in discipline then n order', () => {
    const groups = groupProjects();
    expect(groups.map((g) => g.discipline)).toEqual(DISCIPLINE_ORDER);
    const flat = groups.flatMap((g) => g.projects);
    expect(flat).toHaveLength(PROJECTS.length);
    expect(new Set(flat.map((p) => p.n)).size).toBe(PROJECTS.length);
    for (const g of groups) {
      const ns = g.projects.map((p) => p.n);
      expect([...ns].sort()).toEqual(ns);
      for (const p of g.projects) expect(p.discipline).toBe(g.discipline);
    }
  });
});

describe('the inscription', () => {
  it('runs 2021 through 2026 with no gaps and no invented years', () => {
    expect(INSCRIPTION.map((e) => e.year)).toEqual(['2021', '2022', '2023', '2024', '2025', '2026']);
  });
});
