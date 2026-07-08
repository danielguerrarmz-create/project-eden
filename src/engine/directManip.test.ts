import { describe, it, expect } from 'vitest';
import {
  majorSemiAxisM,
  footprintFromMajorAxisM,
  apertureFromPlanXZ,
  handleAnchors,
  proposeFromDrag,
} from './directManip';
import { clampParams } from './grammar';
import { GRAMMAR } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.35,
  apertureDeg: 90,
  speciesId: 'wisteria',
  year: 0,
};

describe('directManip — pure drag->params fitting', () => {
  it('footprint <-> major-axis is an exact round-trip', () => {
    for (const f of [12, 13.5, 15, 16.7, 18]) {
      expect(footprintFromMajorAxisM(majorSemiAxisM(f))).toBeCloseTo(f, 6);
    }
  });

  it('reads aperture bearing in the engine compass convention (0=N/+Z, 90=E/+X)', () => {
    expect(apertureFromPlanXZ(0, 1)).toBeCloseTo(0, 6); // +Z = north
    expect(apertureFromPlanXZ(1, 0)).toBeCloseTo(90, 6); // +X = east
    expect(apertureFromPlanXZ(0, -1)).toBeCloseTo(180, 6); // -Z = south
    expect(apertureFromPlanXZ(-1, 0)).toBeCloseTo(270, 6); // -X = west
  });

  it('places the footprint handles on the major (X) axis eave, one per side', () => {
    const a = majorSemiAxisM(base.footprintM2);
    const anchors = handleAnchors(base);
    expect(anchors.footprintEast[0]).toBeCloseTo(a, 3); // +X
    expect(anchors.footprintWest[0]).toBeCloseTo(-a, 3); // -X
    // Both sit on the X axis (no north/south offset).
    expect(anchors.footprintEast[2]).toBeCloseTo(0, 3);
    expect(anchors.footprintWest[2]).toBeCloseTo(0, 3);
  });

  it('floats the rise handle at the crown apex height', () => {
    const anchors = handleAnchors(base);
    expect(anchors.rise).toEqual([0, base.riseM, 0]);
  });

  it('rides the aperture handle on the eave at the aperture bearing', () => {
    const anchors = handleAnchors({ ...base, apertureDeg: 90 });
    // bearing 90 = +X, so the aperture handle is on the +X side, z ~ 0.
    expect(anchors.aperture[0]).toBeGreaterThan(0);
    expect(anchors.aperture[2]).toBeCloseTo(0, 2);
  });

  it('proposes footprint from a radial drag, then the grammar clamps it buildable', () => {
    // Drag the east handle way out (a = 10 m -> ~251 m², absurd): engine clamps to max.
    const proposed = proposeFromDrag('footprintEast', [10, 0.6, 0]);
    expect(proposed.footprintM2).toBeGreaterThan(GRAMMAR.maxFootprintM2);
    const clamped = clampParams({ ...base, ...proposed });
    expect(clamped.footprintM2).toBe(GRAMMAR.maxFootprintM2);

    // Drag it to the centre (a -> ~0): engine clamps up to the min span.
    const tiny = proposeFromDrag('footprintWest', [0.1, 0.6, 0]);
    expect(clampParams({ ...base, ...tiny }).footprintM2).toBe(GRAMMAR.minFootprintM2);
  });

  it('proposes rise from a vertical drag, then the grammar sticks it at the cap', () => {
    const proposed = proposeFromDrag('rise', [0, 9, 0]); // drag apex to 9 m
    expect(proposed.riseM).toBe(9);
    const clamped = clampParams({ ...base, ...proposed });
    // Cannot exceed the permitted-development cap (or the curvature cap below it).
    expect(clamped.riseM).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM);
    expect(clamped.riseM).toBeGreaterThanOrEqual(GRAMMAR.minHeadroomM);
  });

  it('proposes aperture from an azimuthal drag and wraps 0..359', () => {
    const proposed = proposeFromDrag('aperture', [-1, 0.6, 0]); // -X = west = 270
    expect(proposed.apertureDeg).toBeCloseTo(270, 6);
    const clamped = clampParams({ ...base, ...proposed });
    expect(clamped.apertureDeg).toBeGreaterThanOrEqual(0);
    expect(clamped.apertureDeg).toBeLessThan(360);
  });

  it('an in-bounds handle drag round-trips through the engine unchanged (controlled loop)', () => {
    // Anchor the east handle, propose from that exact point, clamp: footprint is stable.
    const anchors = handleAnchors(base);
    const proposed = proposeFromDrag('footprintEast', anchors.footprintEast);
    const clamped = clampParams({ ...base, ...proposed });
    expect(clamped.footprintM2).toBeCloseTo(base.footprintM2, 3);
  });
});
