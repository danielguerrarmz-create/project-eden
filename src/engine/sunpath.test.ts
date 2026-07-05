import { describe, it, expect } from 'vitest';
import { computeSunPath, solarDeclinationDeg } from './sunpath';
import { SITE } from '../data/config';

describe('sunpath: real solar astronomy, deterministic', () => {
  it('gives the same arc for the same site and day (no hidden state)', () => {
    const a = computeSunPath(SITE.latitudeDeg);
    const b = computeSunPath(SITE.latitudeDeg);
    expect(a).toEqual(b);
  });

  it('peaks at a plausible summer-noon altitude for London latitude', () => {
    const sp = computeSunPath(51.5); // default day ~summer solstice
    // Solstice noon altitude ~= 90 - lat + 23.4 ~= 62 deg.
    expect(sp.peakAltitudeDeg).toBeGreaterThan(55);
    expect(sp.peakAltitudeDeg).toBeLessThan(68);
  });

  it('rolls the day into 8 normalised compass sectors', () => {
    const sp = computeSunPath(51.5);
    expect(sp.exposureBySector).toHaveLength(8);
    for (const e of sp.exposureBySector) {
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });

  it('has a positive solar declination near the summer solstice', () => {
    expect(solarDeclinationDeg(172)).toBeGreaterThan(20);
  });
});
