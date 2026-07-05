/**
 * sunpath.ts — deterministic sun-path from latitude + date + orientation.
 *
 * Standard solar-position astronomy (declination + hour angle -> altitude +
 * azimuth). Deterministic: same inputs always give the same arc, so the demo is
 * repeatable on camera (mvp-spec: "sun-path deterministic from orientation +
 * date"). This is REAL trig, not a stub — the only rule-of-thumb part is the
 * per-sector exposure roll-up the strut optimiser consumes.
 *
 * PURE. Angles in degrees at the boundary, radians internally.
 */
import type { SunPath, SunSample, Vec3 } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Solar declination (deg) for a given day of year — Cooper's equation. */
export function solarDeclinationDeg(dayOfYear: number): number {
  return 23.45 * Math.sin(DEG * (360 * (284 + dayOfYear)) / 365);
}

function sunSampleAt(hour: number, latDeg: number, declDeg: number): SunSample {
  const lat = latDeg * DEG;
  const decl = declDeg * DEG;
  // Hour angle: 0 at solar noon, -15°/h before, +15°/h after.
  const H = (hour - 12) * 15 * DEG;

  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const altitude = Math.asin(Math.min(1, Math.max(-1, sinAlt)));

  // Azimuth measured from north, clockwise (0=N, 90=E, 180=S, 270=W).
  const cosAz =
    (Math.sin(decl) - Math.sin(altitude) * Math.sin(lat)) /
    (Math.cos(altitude) * Math.cos(lat) || 1e-6);
  let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (H > 0) azimuth = 2 * Math.PI - azimuth; // afternoon -> west of south

  const altDeg = altitude * RAD;
  const azDeg = azimuth * RAD;

  // Unit vector FROM Eden TOWARD the sun. Scene convention: +Z = north, +X = east.
  const ca = Math.cos(altitude);
  const direction: Vec3 = [
    ca * Math.sin(azimuth), // east component (+X)
    Math.sin(altitude), // up (+Y)
    ca * Math.cos(azimuth), // north component (+Z)
  ];

  return { hour, altitudeDeg: altDeg, azimuthDeg: azDeg, direction };
}

/**
 * Roll daylight exposure into 8 compass sectors (N, NE, E, SE, S, SW, W, NW).
 * Each above-horizon sample deposits weight (proportional to its altitude, a
 * crude irradiance proxy) into the sector its azimuth falls in. Normalised 0..1.
 * Rule-of-thumb — good enough to bias struts toward the sunny face.
 */
function exposureBySector(samples: SunSample[]): number[] {
  const sectors = new Array(8).fill(0);
  for (const s of samples) {
    if (s.altitudeDeg <= 0) continue;
    const idx = Math.floor(((s.azimuthDeg + 22.5) % 360) / 45);
    sectors[idx] += Math.sin(s.altitudeDeg * DEG); // higher sun = more energy
  }
  const max = Math.max(1e-6, ...sectors);
  return sectors.map((v) => v / max);
}

export function computeSunPath(
  latitudeDeg: number,
  dayOfYear = 172, // ~summer solstice: the growing-season day the demo shows
): SunPath {
  const declDeg = solarDeclinationDeg(dayOfYear);
  const samples: SunSample[] = [];
  for (let hour = 4; hour <= 20; hour += 1) {
    samples.push(sunSampleAt(hour, latitudeDeg, declDeg));
  }
  const peakAltitudeDeg = Math.max(...samples.map((s) => s.altitudeDeg));
  return {
    latitudeDeg,
    dayOfYear,
    samples,
    peakAltitudeDeg: Number(peakAltitudeDeg.toFixed(1)),
    exposureBySector: exposureBySector(samples),
  };
}

const SECTOR_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function sectorName(index: number): string {
  return SECTOR_NAMES[((index % 8) + 8) % 8];
}
export function sectorForDeg(deg: number): number {
  return Math.floor(((deg + 22.5) % 360) / 45);
}
