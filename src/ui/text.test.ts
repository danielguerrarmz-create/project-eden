import { describe, it, expect } from 'vitest';
import { deDash } from './text';
import { SPECIES } from '../engine/species';
import { runEngine } from '../engine';

const DASHES = /[—–]/; // em dash, en dash — never allowed in rendered copy

describe('deDash (house rule: no em/en dashes in on-screen copy)', () => {
  it('turns a spaced dash into a comma', () => {
    expect(deDash('night-scented — moths love it')).toBe('night-scented, moths love it');
  });

  it('turns a bare range dash into " to "', () => {
    expect(deDash('Jun–Sep')).toBe('Jun to Sep');
    expect(deDash('Apr–May')).toBe('Apr to May');
  });

  it('strips any straggler dash', () => {
    expect(deDash('a—b')).toBe('a to b');
    expect(deDash('trailing —')).not.toMatch(DASHES);
  });

  it('leaves compound hyphens (real hyphen-minus) alone', () => {
    expect(deDash('self-clinging aerial roots')).toBe('self-clinging aerial roots');
  });

  it('is idempotent and never emits an en/em dash for any of these inputs', () => {
    const samples = ['x — y', 'Jun–Sep', 'a—b—c', 'plain text', ''];
    for (const s of samples) {
      const once = deDash(s);
      expect(once).not.toMatch(DASHES);
      expect(deDash(once)).toBe(once);
    }
  });

  it('sanitises every species human string that reaches the screen', () => {
    for (const sp of SPECIES) {
      expect(deDash(sp.floweringMonths)).not.toMatch(DASHES);
      expect(deDash(sp.note)).not.toMatch(DASHES);
      expect(deDash(sp.common)).not.toMatch(DASHES);
    }
  });

  it('sanitises every price line label the spec card renders', () => {
    const { price } = runEngine({
      enclosurePct: 55, heightM: 3, footprintRadiusM: 2.4, latticeDensity: 0.55,
      openingOrientationDeg: 180, siteOrientationDeg: 0, siteLatitudeDeg: 51.5,
      speciesId: 'lonicera', year: 0,
    });
    for (const line of price.lines) {
      expect(deDash(line.label)).not.toMatch(DASHES);
      if (line.note) expect(deDash(line.note)).not.toMatch(DASHES);
    }
  });
});
