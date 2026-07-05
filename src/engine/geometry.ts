/**
 * geometry.ts — the parametric canopy generator.
 *
 * ONE typology (demo-spec §1): an open garden pavilion — a curved timber
 * gridshell canopy on 3–4 grounded feet. No glazing, no doors, no services.
 * Four parameters shape it: footprint, rise, strut spacing, aperture.
 *
 * STRUCTURAL VALIDITY IS GUARANTEED BY THE GRAMMAR, NOT BY FEA.
 * clampParams() (engine/grammar.ts) forces every parameter inside bounds that
 * each derive from a stated fabrication rule. We do NOT run a live
 * finite-element check — the honest claim is "certainty inside a designed
 * family". Push a slider to an extreme and the shape still reads as buildable
 * because it cannot leave the grammar. That is the whole trick, stated plainly.
 *
 * The canopy surface is an elevated catenary-ish cap over an elliptical plan,
 * lifted at the APERTURE bearing (where it "opens toward morning light") and
 * swept to the ground at the grammar-chosen FEET. It is discretised into a
 * DIAGRID of straight members — the output is a component model, not a mesh
 * (demo-spec §2.1: buildable pieces).
 *
 * The living layer never enters this file — plants attach later to a
 * sacrificial armature keyed off (u,v) coords, keeping the structure dry.
 */
import { GRAMMAR } from '../data/config';
import {
  clampParams,
  eaveBlankLengthM,
  ellipsePerimeterM,
  feetCountFor,
  planDims,
} from './grammar';
import type { CanopyGeometry, DesignParams, Member, Vec3 } from './types';

export { clampParams };

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const round = (x: number, step: number) => Math.round(x / step) * step;

/** Catenary-ish cap profile: 1 at the crown (r=0), 0 at the edge (r=1). */
function capProfile(r: number): number {
  const k = 1.1;
  return (Math.cosh(k) - Math.cosh(k * r)) / (Math.cosh(k) - 1);
}

/** Smallest signed angular difference a-b, in radians (-π..π]. */
function angDiff(a: number, b: number): number {
  let d = (a - b) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

interface SurfaceCtx {
  a: number;
  b: number;
  H: number;
  eaveBaseM: number;
  apertureRad: number;
  footAnglesRad: number[];
}

function surfaceCtx(p: DesignParams, snapToSpokes?: number): SurfaceCtx {
  const { a, b } = planDims(p.footprintM2);
  const H = p.riseM;
  const feet = feetCountFor(p.footprintM2);
  const apertureRad = p.apertureDeg * DEG;
  // Feet sit evenly spaced, offset half a bay from the aperture so the opening
  // is always clear of a leg. When generating members, each foot snaps to the
  // nearest diagrid spoke so the foot sweep lands EXACTLY on ground (a foot
  // hovering a few cm off the lawn would undo the whole "is it real" answer).
  const footAnglesRad = Array.from({ length: feet }, (_, i) => {
    const raw = apertureRad + (TWO_PI / feet) * (i + 0.5);
    if (!snapToSpokes) return raw;
    const spokeStep = TWO_PI / snapToSpokes;
    return Math.round(raw / spokeStep) * spokeStep;
  });
  return { a, b, H, eaveBaseM: 0.62 * H, apertureRad, footAnglesRad };
}

/** Free-edge (eave) height at bearing θ: lifts toward the aperture. */
function eaveHeightM(ctx: SurfaceCtx, thetaRad: number): number {
  const toward = Math.max(0, Math.cos(angDiff(thetaRad, ctx.apertureRad)));
  const lifted = ctx.eaveBaseM * (1 + 0.5 * Math.pow(toward, 1.5));
  return Math.min(lifted, ctx.H - 0.25);
}

/** How strongly bearing θ is pulled to ground by the nearest foot (0..1). */
function footPull(ctx: SurfaceCtx, thetaRad: number): number {
  const sigma = 0.32; // angular half-width of a foot sweep (rad)
  let w = 0;
  for (const f of ctx.footAnglesRad) {
    const d = angDiff(thetaRad, f);
    w += Math.exp(-(d * d) / (sigma * sigma));
  }
  return Math.min(1, w);
}

/** World point of the canopy surface at polar-parametric (r 0..1, θ bearing rad). */
function canopyPoint(ctx: SurfaceCtx, r: number, thetaRad: number): Vec3 {
  const E = eaveHeightM(ctx, thetaRad);
  let y = E + (ctx.H - E) * capProfile(r);
  // Feet: near the edge, the surface sweeps down to the ground.
  y *= 1 - footPull(ctx, thetaRad) * Math.pow(r, 5);
  // Bearing convention: 0 = north = +Z, 90° = east = +X (matches sunpath.ts).
  return [ctx.a * r * Math.sin(thetaRad), y, ctx.b * r * Math.cos(thetaRad)];
}

/**
 * Sample the canopy at parametric (u,v): u = around the plan (0..1 from north,
 * clockwise), v = up the canopy (0 = edge, 1 = crown). Returns the world point
 * plus the compass bearing (deg) that facet faces. Used by the strut optimiser
 * + overlays so the living layer keys off coordinates, never off members.
 */
export function surfacePoint(
  params: DesignParams,
  u: number,
  v: number,
): { point: Vec3; bearingDeg: number } {
  const p = clampParams(params);
  const ctx = surfaceCtx(p);
  const theta = u * TWO_PI;
  const r = 1 - v;
  return {
    point: canopyPoint(ctx, r, theta),
    bearingDeg: ((theta / DEG) % 360 + 360) % 360,
  };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function generateGeometry(rawParams: DesignParams): CanopyGeometry {
  const params = clampParams(rawParams);
  const { a: planAM, b: planBM } = planDims(params.footprintM2);
  const perimeterM = ellipsePerimeterM(planAM, planBM);

  // Diagrid resolution from the strut-spacing parameter: node-to-node spacing
  // along a diagonal ≈ strutSpacingM × the diamond diagonal factor.
  const bayM = params.strutSpacingM * 1.35;
  const spokeCount = Math.max(12, 2 * Math.round(perimeterM / bayM / 2));

  const ctx = surfaceCtx(params, spokeCount);
  const { a, b, H } = ctx;
  const feetCount = ctx.footAnglesRad.length;
  const meanR = (a + b) / 2;
  const radialRunM = Math.hypot(meanR, H) * 1.05;
  const ringCount = Math.max(4, Math.round(radialRunM / bayM));

  const r0 = 0.22; // crown oculus radius fraction — diagrid starts here

  // Node grid: rings i=0 (crown) .. ringCount (edge), spokes j around.
  const nodes: Vec3[][] = [];
  const rAt = (i: number) => r0 + (1 - r0) * (i / ringCount);
  const thetaAt = (j: number) => (j / spokeCount) * TWO_PI;
  for (let i = 0; i <= ringCount; i++) {
    const ring: Vec3[] = [];
    for (let j = 0; j < spokeCount; j++) {
      ring.push(canopyPoint(ctx, rAt(i), thetaAt(j)));
    }
    nodes.push(ring);
  }

  const members: Member[] = [];
  const uv = (i: number, j: number) => ({
    u: (j % spokeCount) / spokeCount,
    v: 1 - i / ringCount,
  });

  /** A member near the edge inside a foot's sweep is a 'foot' component. */
  const memberType = (i: number, j: number, fallback: Member['type']): Member['type'] => {
    if (fallback !== 'lattice') return fallback;
    const midTheta = thetaAt(j + 0.5);
    return i >= ringCount - 2 && footPull(ctx, midTheta) > 0.45 ? 'foot' : 'lattice';
  };

  // DIAGRID: two diagonal families between consecutive rings.
  for (let i = 0; i < ringCount; i++) {
    for (let j = 0; j < spokeCount; j++) {
      const start = nodes[i][j];
      for (const dj of [1, -1]) {
        const j2 = (j + dj + spokeCount) % spokeCount;
        const end = nodes[i + 1][j2];
        const { u, v } = uv(i, j);
        members.push({
          id: `lat-${i}-${j}-${dj > 0 ? 'a' : 'b'}`,
          type: memberType(i, j, 'lattice'),
          start,
          end,
          lengthM: dist(start, end),
          u,
          v: v - 0.5 / ringCount,
        });
      }
    }
  }

  // CROWN RING: the compression ring around the oculus. Chords are struck
  // across several spokes if a single-spoke chord would be an unbuildably
  // short offcut (nothing in the BOM below ~150 mm).
  const crownCircM = ellipsePerimeterM(a * r0, b * r0);
  let crownStride = 1;
  for (const s of [1, 2, 3, 4, 6]) {
    if (spokeCount % s === 0 && (crownCircM / spokeCount) * s >= 0.15) {
      crownStride = s;
      break;
    }
    crownStride = s;
  }
  for (let j = 0; j < spokeCount; j += crownStride) {
    const start = nodes[0][j];
    const end = nodes[0][(j + crownStride) % spokeCount];
    const { u, v } = uv(0, j);
    members.push({ id: `crown-${j}`, type: 'eave', start, end, lengthM: dist(start, end), u, v });
  }

  // EAVE RING: the edge beam around the free edge + feet sweeps.
  for (let j = 0; j < spokeCount; j++) {
    const start = nodes[ringCount][j];
    const end = nodes[ringCount][(j + 1) % spokeCount];
    const { u, v } = uv(ringCount, j);
    members.push({ id: `eave-${j}`, type: 'eave', start, end, lengthM: dist(start, end), u, v });
  }

  // Lattice surface area: sum of the diagrid quad areas (honest numeric sum,
  // not a formula guess). Each quad (i,j) split into two triangles.
  let surfaceAreaM2 = 0;
  const tri = (p1: Vec3, p2: Vec3, p3: Vec3) => {
    const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0], vy = p3[1] - p1[1], vz = p3[2] - p1[2];
    return (
      0.5 *
      Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
    );
  };
  for (let i = 0; i < ringCount; i++) {
    for (let j = 0; j < spokeCount; j++) {
      const j2 = (j + 1) % spokeCount;
      surfaceAreaM2 +=
        tri(nodes[i][j], nodes[i + 1][j], nodes[i + 1][j2]) +
        tri(nodes[i][j], nodes[i + 1][j2], nodes[i][j2]);
    }
  }

  const maxMemberLengthM = members.reduce((mx, m) => Math.max(mx, m.lengthM), 0);
  const maxComponentLengthM = Math.max(maxMemberLengthM, eaveBlankLengthM(params.footprintM2));
  // The grammar guarantees this; shout if it ever stops being true.
  if (maxComponentLengthM > GRAMMAR.maxComponentLengthM + 1e-6) {
    // eslint-disable-next-line no-console
    console.warn(
      `[grammar] component ${maxComponentLengthM.toFixed(2)} m exceeds the ${GRAMMAR.maxComponentLengthM} m sheet rule`,
    );
  }

  return {
    params,
    members,
    feetCount,
    footBearingsDeg: ctx.footAnglesRad.map((f) => (((f / DEG) % 360) + 360) % 360),
    ringCount,
    spokeCount,
    planA: a,
    planB: b,
    footprintM2: round(params.footprintM2, 0.1),
    riseM: params.riseM,
    spanM: round(2 * a, 0.1),
    surfaceAreaM2: round(surfaceAreaM2, 0.1),
    roofAreaM2: round(params.footprintM2, 0.1),
    maxComponentLengthM: round(maxComponentLengthM, 0.01),
  };
}
