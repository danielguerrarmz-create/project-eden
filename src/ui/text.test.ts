import { describe, it, expect } from 'vitest';
import { deDash } from './text';
import { SPECIES } from '../engine/species';
import { runEngine } from '../engine';
import { deriveBounds } from '../engine/grammar';
import type { DesignParams } from '../engine/types';

const DASHES = /[—–]/; // em dash, en dash: never allowed in rendered copy

const base: DesignParams = {
  footprintM2: 12, // small footprint: exercises the crown-curvature caption
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  footStrategy: 'legs',
  speciesId: 'lonicera',
  year: 0,
};

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
});

describe('deDash covers every dynamic string that reaches the screen', () => {
  it('sanitises every species human string', () => {
    for (const sp of SPECIES) {
      expect(deDash(sp.floweringMonths)).not.toMatch(DASHES);
      expect(deDash(sp.note)).not.toMatch(DASHES);
      expect(deDash(sp.common)).not.toMatch(DASHES);
    }
  });

  it('sanitises every price line label + note the spec card renders', () => {
    const { price } = runEngine(base);
    for (const line of price.lines) {
      expect(deDash(line.label)).not.toMatch(DASHES);
      if (line.note) expect(deDash(line.note)).not.toMatch(DASHES);
    }
  });

  it('sanitises every grammar caption + note the sliders render', () => {
    const bounds = deriveBounds(base);
    const captions = [
      bounds.footprintM2.minRule,
      bounds.footprintM2.maxRule,
      bounds.riseM.minRule,
      bounds.riseM.maxRule,
      bounds.strutSpacingM.minRule,
      bounds.strutSpacingM.maxRule,
      ...bounds.notes,
    ];
    for (const c of captions) {
      expect(deDash(c)).not.toMatch(DASHES);
    }
  });
});
