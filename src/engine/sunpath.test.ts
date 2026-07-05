import { describe, it, expect } from 'vitest';
import { computeSunPath, solarDeclinationDeg, sectorForDeg, sectorName } from './sunpath';
import { computeStrutField } from './strutOptimizer';
import { getSpecies } from './species';
import { baseParams } from './_fixtures';

describe('computeSunPath', () => {
  it('is deterministic and repeatable for the same latitude', () => {
    expect(computeSunPath(51.5)).toEqual(computeSunPath(51.5));
  });

  it('puts the solstice sun higher at lower (more equatorial) latitudes', () => {
    const london = computeSunPath(51.5);
    const madrid = computeSunPath(40);
    expect(madrid.peakAltitudeDeg).toBeGreaterThan(london.peakAltitudeDeg);
  });

  it('normalises exposure so the sunniest sector reads 1.0', () => {
    const { exposureBySector } = computeSunPath(51.5);
    expect(Math.max(...exposureBySector)).toBeCloseTo(1, 6);
  });

  it('solar declination near the summer-solstice day is close to +23.45 deg', () => {
    expect(solarDeclinationDeg(172)).toBeGreaterThan(23);
  });
});

describe('sector helpers', () => {
  it('maps compass bearings to the right 45-degree sector', () => {
    expect(sectorName(sectorForDeg(0))).toBe('N');
    expect(sectorName(sectorForDeg(90))).toBe('E');
    expect(sectorName(sectorForDeg(180))).toBe('S');
    expect(sectorName(sectorForDeg(270))).toBe('W');
  });
});

/**
 * The "sunniest face E" behavior the Engine page copy calls out. On the modelled
 * summer-solstice day the sun path is symmetric about solar noon, so the East and
 * West sectors accumulate EXACTLY equal daylight exposure (mirror-image hours,
 * identical altitudes). The argmax loop in both the strut optimiser and the sun
 * diagram uses a strict `>`, so a tie breaks to the LOWER index — East (index 2)
 * over West (index 6). That is why the readout reliably says the sunward face is
 * E, not W, and it is intended, not a coincidence of floating point.
 */
describe('sunward sector tie-break (E over W at the solstice)', () => {
  it('reports E as the sunward face for the default northern-hemisphere site', () => {
    const params = baseParams();
    const sunPath = computeSunPath(params.siteLatitudeDeg);
    const field = computeStrutField(params, getSpecies(params.speciesId), sunPath);
    expect(field.sunwardSector).toBe('E');
  });

  it('confirms the underlying E/W exposure tie is exact', () => {
    const { exposureBySector } = computeSunPath(51.5);
    const east = exposureBySector[2];
    const west = exposureBySector[6];
    expect(east).toBe(west);
  });
});
