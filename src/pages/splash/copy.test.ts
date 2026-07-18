import { describe, it, expect } from 'vitest';
import { ritualSteps, ritualCompact, STAYS_THE_SAME, PD_FACT } from './copy';
import { runEngine } from '../../engine';
import type { DesignParams } from '../../engine/types';
import { ENVELOPE } from '../../data/config';

const DASHES = /[—–]/; // em dash, en dash: never allowed in on-screen copy

const defaults: DesignParams = {
  footprintM2: ENVELOPE.footprintM2.default,
  riseM: ENVELOPE.riseM.default,
  strutSpacingM: ENVELOPE.strutSpacingM.default,
  apertureDeg: ENVELOPE.apertureDeg.default,
  speciesId: 'lonicera',
  year: 0,
  jointSystem: ENVELOPE.jointSystem,
};

describe('splash precedent copy (hand-authored, house dash rule)', () => {
  it('the ritual is five steps, and step three names the live cut list', () => {
    const steps = ritualSteps();
    expect(steps).toHaveLength(5);
    // The ~count moved out of step 3 to the compact recap (home copy pass); step
    // three now names the SOURCE (the live cut list) rather than the number.
    expect(steps[2].text).toContain('flat timber components from the live cut list');
    for (const step of steps) expect(step.text).not.toMatch(DASHES);
  });

  it('the compact recap inlines the count and stays clean', () => {
    const line = ritualCompact(217);
    expect(line).toContain('~217 components');
    expect(line).not.toMatch(DASHES);
  });

  it('the what-stays-the-same strip and the PD fact are clean', () => {
    for (const s of [STAYS_THE_SAME.keeps, STAYS_THE_SAME.adds, PD_FACT]) {
      expect(s).not.toMatch(DASHES);
    }
    expect(PD_FACT).toContain('permitted development');
    // The height reads live off the grammar's PD cap (2.5 m), never a hardcoded promise.
    expect(PD_FACT).toContain('2.5 m');
  });
});

describe('ritual figures come from the engine, not hardcoded', () => {
  it('the default design exposes the production figures the ritual reuses', () => {
    const { components, buildPlan } = runEngine(defaults);
    expect(components.totalCount).toBeGreaterThan(0);
    expect(Number.isInteger(components.totalCount)).toBe(true);
    expect(buildPlan.leadTimeWeeks).toBeGreaterThan(0);
    // The rendered ritual must reflect whatever the engine actually computed —
    // the live count now rides the compact recap, not step 3.
    expect(ritualCompact(components.totalCount)).toContain(`~${components.totalCount} components`);
  });
});
