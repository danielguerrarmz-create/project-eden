import { describe, expect, it } from 'vitest';
import { countUpValue } from './useCountUp';

describe('countUpValue — the count-up interpolation', () => {
  it('is exactly the start at p=0 and the target at p=1', () => {
    expect(countUpValue(150000, 155000, 0)).toBe(150000);
    expect(countUpValue(150000, 155000, 1)).toBe(155000);
  });

  it('clamps out-of-range progress so a late frame never overshoots', () => {
    // requestAnimationFrame can hand back a t past the duration; the display
    // must land ON the target, not sail past it.
    expect(countUpValue(150000, 155000, 1.4)).toBe(155000);
    expect(countUpValue(150000, 155000, -0.2)).toBe(150000);
  });

  it('eases out: past the halfway value by the time it is halfway through', () => {
    // easeOutCubic is fast then slow, so at p=0.5 it is well past the midpoint.
    const mid = countUpValue(0, 1000, 0.5);
    expect(mid).toBeGreaterThan(500);
    expect(mid).toBeLessThan(1000);
  });

  it('counts down as happily as up (a lighter species lowers the figure)', () => {
    expect(countUpValue(155000, 150000, 0)).toBe(155000);
    expect(countUpValue(155000, 150000, 1)).toBe(150000);
  });
});
