import { describe, expect, it } from 'vitest';
import {
  TARGET_OFF_DEG,
  angleDeltaDeg,
  entryBearingDeg,
  figurePositionM,
  norm360,
} from './entryBearing';

describe('norm360 / angleDeltaDeg', () => {
  it('folds angles into [0,360)', () => {
    expect(norm360(0)).toBe(0);
    expect(norm360(360)).toBe(0);
    expect(norm360(-90)).toBe(270);
    expect(norm360(450)).toBe(90);
  });

  it('measures the SHORT way round, signed', () => {
    expect(angleDeltaDeg(10, 20)).toBe(10);
    expect(angleDeltaDeg(20, 10)).toBe(-10);
    // The wrap is the whole point: 350 -> 10 is +20, not -340.
    expect(angleDeltaDeg(350, 10)).toBe(20);
    expect(angleDeltaDeg(10, 350)).toBe(-20);
  });

  it('never exceeds a half turn', () => {
    for (let a = 0; a < 360; a += 17) {
      for (let b = 0; b < 360; b += 23) {
        expect(Math.abs(angleDeltaDeg(a, b))).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('entryBearingDeg — beyond the structure, never in front of the lens', () => {
  const off = (az: number, bearing: number) => Math.abs(angleDeltaDeg(az, bearing));
  const RINGS = [
    [0, 90, 180, 270], // the real case: two crossing lines, four feet
    [12, 96, 190, 284],
    [0, 120, 240],
    [0, 90, 180],
    [10, 80, 200, 300],
    [0, 45, 90, 135, 180],
    [0, 2], // pathological: two feet nearly coincident
  ];

  it('stands at the target angle off the camera, always', () => {
    // Photographed before it was chosen. This one invariant prevents all
    // three failure modes at once: looming (off~0), edge-on (off~90), and
    // hidden behind the dome (off~180).
    for (const feet of RINGS) {
      for (let az = 0; az < 360; az += 3) {
        const b = entryBearingDeg(feet, az);
        expect(b).not.toBeNull();
        expect(off(az, b as number)).toBeCloseTo(TARGET_OFF_DEG, 6);
      }
    }
  });

  it('never lands edge-on, which is the degenerate case', () => {
    // A 9 cm flat extrusion seen at ~90 degrees off is a black fencepost.
    for (const feet of RINGS) {
      for (let az = 0; az < 360; az += 3) {
        expect(Math.abs(off(az, entryBearingDeg(feet, az) as number) - 90)).toBeGreaterThan(45);
      }
    }
  });

  it('never stands between the lens and the building', () => {
    // Dead in front, at half the camera's distance, it renders taller than
    // the dome and the frame crops it at the knee.
    for (const feet of RINGS) {
      for (let az = 0; az < 360; az += 3) {
        expect(off(az, entryBearingDeg(feet, az) as number)).toBeGreaterThan(90);
      }
    }
  });

  it('never hides directly behind the dome', () => {
    for (const feet of RINGS) {
      for (let az = 0; az < 360; az += 3) {
        expect(off(az, entryBearingDeg(feet, az) as number)).toBeLessThan(172);
      }
    }
  });

  it('takes the side with more clearance from the nearest leg', () => {
    // Camera at 0: candidates are 150 and 210. A leg planted at 150 pushes
    // the figure to 210.
    expect(entryBearingDeg([150], 0)).toBe(210);
    expect(entryBearingDeg([210], 0)).toBe(150);
  });

  it('is deterministic when both sides are equally clear', () => {
    // Symmetric feet: neither side wins on clearance. It must still answer
    // the same way every time, or the figure jumps sides between takes.
    const a = entryBearingDeg([0, 90, 180, 270], 45);
    const b = entryBearingDeg([270, 180, 90, 0], 45);
    expect(a).toBe(b);
    expect(entryBearingDeg([0, 90, 180, 270], 45)).toBe(a);
  });

  it('is order-independent', () => {
    expect(entryBearingDeg([180, 0, 90], 270)).toBe(entryBearingDeg([0, 90, 180], 270));
    expect(entryBearingDeg([200, 10, 130], 45)).toBe(entryBearingDeg([10, 130, 200], 45));
  });

  it('returns a real bearing for every plausible take, including wrapped input', () => {
    for (const feet of RINGS) {
      for (let az = -720; az <= 720; az += 37) {
        const b = entryBearingDeg(feet, az);
        expect(b).not.toBeNull();
        expect(b as number).toBeGreaterThanOrEqual(0);
        expect(b as number).toBeLessThan(360);
      }
    }
  });

  it('declines when there is no structure to stand beside', () => {
    expect(entryBearingDeg([], 0)).toBeNull();
  });
});

describe('figurePositionM — outside the apron, on the bearing', () => {
  it('stands clear of the gravel apron, which sits at plan + 0.45', () => {
    const { x, z } = figurePositionM(0, 2.1, 2.1);
    expect(Math.hypot(x, z)).toBeCloseTo(3.0, 5); // 2.1 + 0.9
    expect(Math.hypot(x, z)).toBeGreaterThan(2.1 + 0.45);
  });

  it('puts bearing 0 on +Z and bearing 90 on +X, matching GardenContext', () => {
    // GardenContext beds use [sin(t), cos(t)] for the same bearings; the
    // figure must share that convention or it lands 90 degrees off the gap.
    const north = figurePositionM(0, 2, 2);
    expect(north.x).toBeCloseTo(0, 5);
    expect(north.z).toBeCloseTo(2.9, 5);
    const east = figurePositionM(90, 2, 2);
    expect(east.x).toBeCloseTo(2.9, 5);
    expect(east.z).toBeCloseTo(0, 5);
  });

  it('uses the larger plan axis, so it clears an elliptical plan too', () => {
    const { x, z } = figurePositionM(90, 3.4, 1.2);
    expect(Math.hypot(x, z)).toBeCloseTo(4.3, 5);
  });
});
