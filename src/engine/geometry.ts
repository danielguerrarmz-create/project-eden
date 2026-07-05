/**
 * geometry.ts — the parametric Eden generator.
 *
 * Produces ONE non-occupied typology: a pollinator-pavilion dome / bower — a
 * partial rotunda of timber ribs and rings you stand under, never inside a
 * sealed room (stress-test §8.3, §12.6: non-occupied lane only).
 *
 * STRUCTURAL VALIDITY IS GUARANTEED BY CLAMPING, NOT BY FEA.
 * clampParams() forces every slider into the pre-engineered ENVELOPE. We do NOT
 * run a live finite-element check — the honest claim is "certainty inside a
 * designed family," and the family's outer bounds are the ENVELOPE constants,
 * which stand in for a joint library a chartered engineer has stamped once
 * (stress-test §5, §8.4). Push a slider to an extreme and the shape still reads
 * as buildable because it cannot leave the box. That is the whole trick, stated
 * plainly.
 *
 * Curved ribs are DISCRETISED into straight members here, so the output is a
 * genuinely cuttable set of timber segments (feeds components.ts). The living
 * layer never enters this file — plants attach later to a sacrificial armature
 * keyed off the (u,v) coords, keeping the structure dry (stress-test §12).
 */
import { ENVELOPE, FABRICATION } from '../data/config';
import type { DesignParams, EdenGeometry, Member, Vec3 } from './types';

const DEG = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round = (x: number, step: number) => Math.round(x / step) * step;

/** Force every design parameter into the pre-engineered envelope. */
export function clampParams(p: DesignParams): DesignParams {
  return {
    ...p,
    enclosurePct: clamp(p.enclosurePct, ENVELOPE.enclosurePct.min, ENVELOPE.enclosurePct.max),
    heightM: clamp(p.heightM, ENVELOPE.heightM.min, ENVELOPE.heightM.max),
    footprintRadiusM: clamp(
      p.footprintRadiusM,
      ENVELOPE.footprintRadiusM.min,
      ENVELOPE.footprintRadiusM.max,
    ),
    latticeDensity: clamp(p.latticeDensity, ENVELOPE.latticeDensity.min, ENVELOPE.latticeDensity.max),
    openingOrientationDeg: ((p.openingOrientationDeg % 360) + 360) % 360,
    siteOrientationDeg: ((p.siteOrientationDeg % 360) + 360) % 360,
    siteLatitudeDeg: clamp(p.siteLatitudeDeg, ENVELOPE.siteLatitudeDeg.min, ENVELOPE.siteLatitudeDeg.max),
  };
}

/** Dome rib profile at height parameter t (0 = ground, 1 = oculus). */
export function ribProfile(t: number, R: number, H: number): { radius: number; y: number } {
  // radius sweeps from R at the base to a small open oculus at the top.
  const radius = R * (1 - 0.82 * Math.pow(t, 1.7));
  // y rises fast then flattens into a dome shoulder.
  const y = H * Math.pow(t, 0.72);
  return { radius, y };
}

function pointOnRib(angleRad: number, t: number, R: number, H: number): Vec3 {
  const { radius, y } = ribProfile(t, R, H);
  return [radius * Math.sin(angleRad), y, radius * Math.cos(angleRad)];
}

/**
 * Sample the lattice surface at parametric (u,v): u = across the built arc
 * (0..1), v = up the arch (0..1). Returns the world point plus the compass
 * bearing (deg) that facet faces. Used by the strut optimiser + overlays so the
 * living layer keys off coordinates, never off the structural members.
 */
export function surfacePoint(
  params: DesignParams,
  u: number,
  v: number,
): { point: Vec3; bearingDeg: number } {
  const p = clampParams(params);
  const arcSpan = (p.enclosurePct / 100) * 2 * Math.PI;
  const builtCentre = (p.openingOrientationDeg + 180) * DEG;
  const angle = builtCentre - arcSpan / 2 + u * arcSpan;
  return {
    point: pointOnRib(angle, v, p.footprintRadiusM, p.heightM),
    bearingDeg: ((angle / DEG) % 360 + 360) % 360,
  };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function generateGeometry(rawParams: DesignParams): EdenGeometry {
  const params = clampParams(rawParams);
  const { enclosurePct, heightM: H, footprintRadiusM: R, latticeDensity: d } = params;

  // Rib / ring / segment counts scale with the lattice-density slider.
  const ribCount = Math.round(lerp(5, 14, d));
  const ringCount = Math.round(lerp(2, 6, d));
  const segPerRib = Math.round(
    lerp(FABRICATION.minSegmentsPerRib, FABRICATION.maxSegmentsPerRib, d),
  );

  // The built arc: enclosure% of the full ring, centred OPPOSITE the opening so
  // the entrance faces openingOrientationDeg.
  const arcFraction = enclosurePct / 100;
  const arcSpan = arcFraction * 2 * Math.PI;
  const builtCentre = (params.openingOrientationDeg + 180) * DEG;
  const startAngle = builtCentre - arcSpan / 2;

  const members: Member[] = [];
  let mid = 0;

  // Precompute rib angles + their point ladders.
  const ribAngles: number[] = [];
  const ribLadders: Vec3[][] = [];
  for (let i = 0; i < ribCount; i++) {
    const u = ribCount === 1 ? 0.5 : i / (ribCount - 1);
    const angle = startAngle + u * arcSpan;
    ribAngles.push(angle);
    const ladder: Vec3[] = [];
    for (let s = 0; s <= segPerRib; s++) {
      ladder.push(pointOnRib(angle, s / segPerRib, R, H));
    }
    ribLadders.push(ladder);
  }

  // RIB members: straight cuttable segments up each arch.
  for (let i = 0; i < ribCount; i++) {
    const u = ribCount === 1 ? 0.5 : i / (ribCount - 1);
    const ladder = ribLadders[i];
    for (let s = 0; s < segPerRib; s++) {
      const start = ladder[s];
      const end = ladder[s + 1];
      members.push({
        id: `rib-${i}-${s}`,
        type: 'rib',
        start,
        end,
        lengthM: dist(start, end),
        u,
        v: (s + 0.5) / segPerRib,
      });
    }
  }

  // RING members: horizontal chords between adjacent ribs at ring heights.
  for (let k = 0; k < ringCount; k++) {
    const t = lerp(0.12, 0.86, ringCount === 1 ? 0.5 : k / (ringCount - 1));
    for (let i = 0; i < ribCount - 1; i++) {
      const start = pointOnRib(ribAngles[i], t, R, H);
      const end = pointOnRib(ribAngles[i + 1], t, R, H);
      members.push({
        id: `ring-${k}-${i}`,
        type: 'ring',
        start,
        end,
        lengthM: dist(start, end),
        u: (i + 0.5) / Math.max(1, ribCount - 1),
        v: t,
      });
    }
  }

  // BRACE members: diagonal stiffeners appear only at higher density, giving the
  // fine two-way mesh some species want. Cosmetic + cut-list realism; still not
  // FEA (validity is the clamp).
  if (d > 0.55) {
    const t0 = 0.2;
    const t1 = 0.7;
    for (let i = 0; i < ribCount - 1; i++) {
      const start = pointOnRib(ribAngles[i], t0, R, H);
      const end = pointOnRib(ribAngles[i + 1], t1, R, H);
      members.push({
        id: `brace-${i}`,
        type: 'brace',
        start,
        end,
        lengthM: dist(start, end),
        u: (i + 0.5) / Math.max(1, ribCount - 1),
        v: (t0 + t1) / 2,
      });
    }
  }

  mid = members.length;
  void mid;

  // Derived dimensions for the spec card (rule-of-thumb surface formulas).
  const spanM = round(2 * R, 0.1);
  // Dome lateral surface ~ 2*pi*R*(0.8H), scaled by the built arc fraction.
  const surfaceAreaM2 = round(arcFraction * 2 * Math.PI * R * (0.8 * H), 0.1);
  // Roof projection = footprint disc fraction (catches rain, feeds ecology).
  const roofAreaM2 = round(arcFraction * Math.PI * R * R, 0.1);

  return {
    params,
    members,
    ribCount,
    ringCount,
    footprintRadiusM: R,
    heightM: H,
    spanM,
    surfaceAreaM2,
    roofAreaM2,
  };
}
