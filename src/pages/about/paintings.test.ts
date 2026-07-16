import { describe, expect, it } from 'vitest';
import { DISCIPLINE_ORDER, PROJECTS } from './projects';
import { ALL_COMMISSIONS, PAINTINGS, FOUNDER_SPECIMENS, groupProjects } from './paintings';

describe('the commission ledger', () => {
  it('hangs exactly five paintings — the flower economy is a design rule', () => {
    // Was seven under the retired scroll/ascent drafts; `hero` and `eden` went with them
    // (see the ledger header). Five = three frontispieces + two founder specimens.
    expect(ALL_COMMISSIONS).toHaveLength(5);
  });

  it('gives every commission a unique seed in the bower/ namespace', () => {
    const seeds = ALL_COMMISSIONS.map((c) => c.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
    for (const seed of seeds) expect(seed).toMatch(/^bower\//);
  });

  it('mounts every remaining commission: nothing hangs bare on the vellum now', () => {
    // The two `transparent` commissions were the drafts' bookends. On Daniel's page every
    // specimen is a mounted plate, so pigment never touches the page ground directly.
    for (const c of ALL_COMMISSIONS) expect(c.mode).toBe('mounted');
  });

  it('carries a discipline frontispiece for every discipline in the menu order', () => {
    for (const d of DISCIPLINE_ORDER) {
      expect(PAINTINGS[d]).toBeDefined();
    }
  });

  it('requires alt text on every painting', () => {
    for (const c of ALL_COMMISSIONS) expect(c.alt.length).toBeGreaterThan(10);
  });

  it('grows each founder specimen from that founder\'s OWN name — the whole idea', () => {
    expect(PAINTINGS.clay.seed).toContain('clay');
    expect(PAINTINGS.daniel.seed).toContain('daniel');
  });

  it('speaks pigment on the specimens: no commission is pinned to the ink voice', () => {
    // The ink voice existed so a commission could hang on a one-COLOUR-blue page. Daniel's
    // ruling inverts that: structure is sepia, and the botanicals are the one place full
    // pigment is allowed. A commission back on 'ink' would be a silent regression of it.
    for (const c of ALL_COMMISSIONS) expect(c.voice ?? 'pigment').toBe('pigment');
  });
});

describe('the founder specimens', () => {
  it('maps each TEAM member to a specimen, so a rename cannot silently drop one', () => {
    // The retired draft picked the specimen with `member.name.startsWith('Clay')` at the
    // render site. That is a string match against display copy: rename the person and the
    // wrong plant grows, with no test and no type error. The map is keyed on the same data.
    expect(Object.keys(FOUNDER_SPECIMENS).sort()).toEqual(['clay', 'daniel']);
    for (const c of Object.values(FOUNDER_SPECIMENS)) expect(c.kind).toBe('herbal');
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
