import { describe, it, expect } from 'vitest';
import { plotRadiusCapM, SIZE_PRESETS } from './store';
import { ENVELOPE } from '../data/config';

/**
 * plotRadiusCapM is the pure helper behind the "clamped to your plot: max radius
 * X m" warning in StepDesign. It is the honesty guarantee that an Eden can never
 * be drawn larger than the site it was mapped onto.
 */
describe('plotRadiusCapM', () => {
  it('caps a Grand Eden to the plot on the 8x6 m default site (max radius 2.4 m)', () => {
    const cap = plotRadiusCapM({ widthM: 8, depthM: 6, northDeg: 0, address: '' });
    // min(8,6)/2 - 0.6 setback = 2.4, inside the envelope so it is the cap verbatim.
    expect(cap).toBe(2.4);
    // Grand wants 3.1 m, so on this plot it IS clamped — the warning must show.
    expect(SIZE_PRESETS.grand.radiusM).toBeGreaterThan(cap);
  });

  it('never returns less than the envelope minimum, even on a tiny plot', () => {
    const cap = plotRadiusCapM({ widthM: 2, depthM: 2, northDeg: 0, address: '' });
    expect(cap).toBe(ENVELOPE.footprintRadiusM.min);
  });

  it('never returns more than the envelope maximum, even on a huge plot', () => {
    const cap = plotRadiusCapM({ widthM: 40, depthM: 40, northDeg: 0, address: '' });
    expect(cap).toBe(ENVELOPE.footprintRadiusM.max);
  });

  it('a plot big enough for Standard but not Grand clamps only Grand', () => {
    // 6.6 wide, 6.6 deep -> cap = 3.3 clamped to envelope max 3.2. Standard 2.4 fits.
    const cap = plotRadiusCapM({ widthM: 6.2, depthM: 6.2, northDeg: 0, address: '' });
    expect(SIZE_PRESETS.standard.radiusM).toBeLessThanOrEqual(cap);
  });
});
