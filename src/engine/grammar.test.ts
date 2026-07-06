import { describe, it, expect } from 'vitest';
import {
  deriveBounds,
  clampParams,
  feetCountFor,
  riseCapM,
  planDims,
  ellipsePerimeterM,
  eaveBlankLengthM,
} from './grammar';
import { ENVELOPE, GRAMMAR } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  footStrategy: 'legs',
  speciesId: 'clematis',
  year: 0,
};

/**
 * The fabrication grammar IS the pitch: slider bounds derive from stated cut
 * rules and recompute per design. These lock the two on-camera beats.
 */
describe('grammar: planDims + ellipsePerimeter', () => {
  it('honours the fixed 1.25 plan aspect (major = 1.25 × minor)', () => {
    const { a, b } = planDims(15);
    expect(a / b).toBeCloseTo(GRAMMAR.planAspect, 5);
  });

  it('gives an ellipse area equal to the requested footprint (π a b)', () => {
    const { a, b } = planDims(16);
    expect(Math.PI * a * b).toBeCloseTo(16, 5);
  });

  it('ellipse perimeter grows with footprint', () => {
    const small = ellipsePerimeterM(...Object.values(planDims(12)) as [number, number]);
    const big = ellipsePerimeterM(...Object.values(planDims(18)) as [number, number]);
    expect(big).toBeGreaterThan(small);
  });
});

describe('grammar: rise cap switches rule with footprint', () => {
  it('a small footprint is capped by crown curvature BELOW the planning cap', () => {
    const r = riseCapM(12);
    expect(r.cap).toBeLessThan(GRAMMAR.pdHeightCapM);
    expect(r.cap).toBeCloseTo(2.24, 1);
    expect(r.rule).toMatch(/curvature/i);
  });

  it('a large footprint is capped by the permitted-development limit', () => {
    const r = riseCapM(18);
    expect(r.cap).toBe(GRAMMAR.pdHeightCapM);
    expect(r.rule).toMatch(/permitted-development/i);
  });
});

describe('grammar: the engine adds a fourth foot to keep blanks on the sheet', () => {
  it('uses 3 feet at the small end, 4 at the large end', () => {
    expect(feetCountFor(12)).toBe(3);
    expect(feetCountFor(18)).toBe(4);
  });

  it('switches from 3 to 4 feet around 15.5 m²', () => {
    expect(feetCountFor(14)).toBe(3);
    expect(feetCountFor(16)).toBe(4);
  });

  it('feet count never decreases as the footprint grows', () => {
    let prev = 0;
    for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 0.25) {
      const n = feetCountFor(f);
      expect(n).toBeGreaterThanOrEqual(prev || n);
      prev = n;
    }
  });

  it('every eave blank stays within the sheet cut limit across the range', () => {
    for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 0.25) {
      expect(eaveBlankLengthM(f)).toBeLessThanOrEqual(GRAMMAR.maxComponentLengthM + 1e-9);
    }
  });
});

describe('grammar: deriveBounds + clampParams', () => {
  it('derives a rise max equal to the governing cap for the footprint', () => {
    const bounds = deriveBounds(base);
    expect(bounds.riseM.max).toBeCloseTo(riseCapM(base.footprintM2).cap, 5);
    expect(bounds.riseM.min).toBe(GRAMMAR.minHeadroomM);
  });

  it('clampParams forces every parameter inside its grammar bound', () => {
    const wild = clampParams({ ...base, footprintM2: 999, riseM: 99, strutSpacingM: 9, apertureDeg: 800 });
    expect(wild.footprintM2).toBeLessThanOrEqual(ENVELOPE.footprintM2.max);
    expect(wild.footprintM2).toBeGreaterThanOrEqual(ENVELOPE.footprintM2.min);
    expect(wild.riseM).toBeLessThanOrEqual(riseCapM(wild.footprintM2).cap + 1e-9);
    expect(wild.strutSpacingM).toBeLessThanOrEqual(GRAMMAR.maxStrutSpacingM);
    expect(wild.strutSpacingM).toBeGreaterThanOrEqual(GRAMMAR.minStrutSpacingM);
    expect(wild.apertureDeg).toBeGreaterThanOrEqual(0);
    expect(wild.apertureDeg).toBeLessThan(360);
  });

  it('the lamella system caps bay spacing tighter (two-bay piece must fit the sheet)', () => {
    const hub = deriveBounds({ ...base, jointSystem: 'hub' });
    const lam = deriveBounds({ ...base, jointSystem: 'lamella' });
    expect(hub.strutSpacingM.max).toBe(GRAMMAR.maxStrutSpacingM);
    expect(lam.strutSpacingM.max).toBe(GRAMMAR.maxLamellaSpacingM);
    expect(lam.strutSpacingM.max).toBeLessThan(hub.strutSpacingM.max);
    expect(lam.strutSpacingM.maxRule).toMatch(/two-bay lamella/i);

    const clamped = clampParams({ ...base, jointSystem: 'lamella', strutSpacingM: 9 });
    expect(clamped.strutSpacingM).toBe(GRAMMAR.maxLamellaSpacingM);
  });

  it('surfaces a grammar note about feet + sheet fit, and narrates the lamella cap', () => {
    const bounds = deriveBounds(base);
    expect(bounds.notes.length).toBeGreaterThan(0);
    expect(bounds.notes[0]).toMatch(/feet/i);
    const lam = deriveBounds({ ...base, jointSystem: 'lamella' });
    expect(lam.notes.some((n) => /lamella/i.test(n))).toBe(true);
  });
});
