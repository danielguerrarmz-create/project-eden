import { describe, expect, it } from 'vitest';
import { TEAM } from './projects';
import { ALL_COMMISSIONS, PAINTINGS, FOUNDER_SPECIMENS } from './paintings';

describe('the commission ledger', () => {
  it('hangs exactly two paintings — the flower economy is a design rule', () => {
    // Seven under the retired scroll/ascent drafts (`hero` and `eden` went with them), then five
    // once the frontispieces landed. Two = the founder specimens, which is now the whole ledger:
    // the three discipline frontispieces were deleted on 2026-07-16 (see the ledger header).
    expect(ALL_COMMISSIONS).toHaveLength(2);
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

  it('is the WHOLE ledger: every commission is some founder\'s specimen', () => {
    // The frontispieces are deleted, not merely unrendered — a commission nothing hangs is a
    // painting the worker still queues and no one ever sees. If a slot is added back, it should
    // be because a real surface asks for it, and this test should be the thing that says so.
    expect(new Set(ALL_COMMISSIONS)).toEqual(new Set(Object.values(FOUNDER_SPECIMENS)));
    expect(Object.keys(FOUNDER_SPECIMENS).sort()).toEqual(TEAM.map((m) => m.id).sort());
  });
});
