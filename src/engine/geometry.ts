/**
 * geometry.ts — the parametric canopy generator.
 *
 * ONE typology (demo-spec §1): an open garden pavilion — a curved timber
 * gridshell canopy that SWEEPS to the lawn and roots at its feet on driven
 * ground screws. Four form parameters shape it (footprint, rise, bay
 * spacing, aperture) plus one CONSTRUCTION choice the kit is fabricated for:
 * the joint system ('hub' steel nodes / 'lamella' Zollinger weave).
 * Physical details: docs/FABRICATION.md — code follows that file.
 *
 * Members carry a full SECTION FRAME (axis + surface normal) and MILLED-END
 * TRIMS, so what renders and what the BOM prices is solid oriented timber
 * with real cut lengths — never centreline "piping".
 *
 * STRUCTURAL VALIDITY IS GUARANTEED BY THE GRAMMAR, NOT BY FEA.
 * clampParams() (engine/grammar.ts) forces every parameter inside bounds that
 * each derive from a stated fabrication rule. We do NOT run a live
 * finite-element check — the honest claim is "certainty inside a designed
 * family".
 *
 * The output is a MANUFACTURABLE component model, not a mesh:
 *   nodes    — explicit joints (a connector lives at each one)
 *   members  — straight centreline segments between nodes (render/analysis)
 *   pieces   — the physical things a fabricator cuts (a two-bay lamella is
 *              2 segments; an eave blank is several; a hub strut is 1)
 *
 * The living layer never enters this file — plants attach later to a
 * sacrificial armature keyed off (u,v) coords, keeping the structure dry.
 */
import { GRAMMAR, STOCK } from '../data/config';
import {
  clampParams,
  ellipsePerimeterM,
  feetCountFor,
  planDims,
} from './grammar';
import { resolveJointCuts } from './jointGeometry';
import { vCross, vDot, vNorm, vSub } from './vec';
import type {
  CanopyGeometry,
  CanopyNode,
  DesignParams,
  Member,
  Piece,
  Vec3,
} from './types';

export { clampParams };

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const round = (x: number, step: number) => Math.round(x / step) * step;

/**
 * Catenary-ish cap profile: 1 at the crown (r=0), 0 at the edge (r=1).
 * Exported (with eaveHeightAtM / footPullAt) because the soft drawn surface
 * (surface.ts) raises the SAME canopy over the drawn plan — one rule, two
 * resolutions, so bake is a resolution rather than a jump-cut.
 */
export function capProfile(r: number): number {
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

/**
 * A DRAWN shape the generator should obey instead of inventing one.
 *
 * Without this the generator answers every question from the grammar: feet get
 * spread evenly around an ellipse, and the canopy is an analytic cap. That is
 * right for a parametric studio and WRONG the moment somebody draws, because
 * their lines then change nothing but a footprint number — the tool quietly
 * throws the drawing away and builds its own generic dome on top of it.
 *
 * Every field is optional and every default reproduces the old behaviour
 * exactly, so the parametric path (and its tests) is untouched.
 */
export interface ShapeField {
  /** Where the canopy roots, as compass bearings. Replaces even spacing. */
  footBearingsDeg?: number[];
  /** Plan radius at a bearing (m). Replaces the grammar's ellipse. */
  planRadiusAtM?: (bearingRad: number) => number;
  /** Canopy height at a world plan point (m). Replaces the analytic cap. */
  heightAtM?: (x: number, z: number) => number;
  /** True where the canopy has been excavated away. */
  isHoleAt?: (x: number, z: number) => boolean;
}

interface SurfaceCtx {
  a: number;
  b: number;
  H: number;
  apertureRad: number;
  footAnglesRad: number[];
  shape?: ShapeField;
}

function surfaceCtx(p: DesignParams, snapToSpokes?: number, shape?: ShapeField): SurfaceCtx {
  const { a, b } = planDims(p.footprintM2);
  const H = p.riseM;
  const apertureRad = p.apertureDeg * DEG;

  // Feet: the DRAWN bearings when there are any, else the grammar's even
  // spread offset half a bay from the aperture so the opening is always clear
  // of a leg. Either way each foot snaps to the nearest diagrid spoke so a leg
  // lands EXACTLY on a node column — a foot hovering a few cm off the lawn
  // would undo the whole "is it real" answer.
  const snap = (raw: number) => {
    if (!snapToSpokes) return raw;
    const spokeStep = TWO_PI / snapToSpokes;
    return Math.round(raw / spokeStep) * spokeStep;
  };

  let footAnglesRad: number[];
  const drawn = shape?.footBearingsDeg;
  if (drawn && drawn.length > 0) {
    // Snap first, THEN dedupe: two drawn feet inside one bay are one node, and
    // emitting both would put two shoes on the same screw.
    const seen = new Set<number>();
    footAnglesRad = [];
    for (const deg of drawn) {
      const s = ((snap(deg * DEG) % TWO_PI) + TWO_PI) % TWO_PI;
      const key = Math.round(s * 1e6);
      if (seen.has(key)) continue;
      seen.add(key);
      footAnglesRad.push(s);
    }
    footAnglesRad.sort((x, y) => x - y);
  } else {
    const feet = feetCountFor(p.footprintM2);
    footAnglesRad = Array.from({ length: feet }, (_, i) =>
      snap(apertureRad + (TWO_PI / feet) * (i + 0.5)),
    );
  }

  return { a, b, H, apertureRad, footAnglesRad, shape };
}

/**
 * Free-edge (eave) height at bearing θ: stays UP between the legs and lifts
 * toward the aperture. This — with footPullAt — is what makes an Eden read as
 * a canopy with an eave and open sides rather than a tent.
 */
export function eaveHeightAtM(H: number, apertureRad: number, thetaRad: number): number {
  const toward = Math.max(0, Math.cos(angDiff(thetaRad, apertureRad)));
  const lifted = 0.62 * H * (1 + 0.5 * Math.pow(toward, 1.5));
  return Math.min(lifted, H - 0.25);
}

/** How strongly bearing θ is pulled to ground by the nearest foot (0..1). */
export function footPullAt(footAnglesRad: number[], thetaRad: number): number {
  const sigma = 0.32; // angular half-width of a foot sweep (rad)
  let w = 0;
  for (const f of footAnglesRad) {
    const d = angDiff(thetaRad, f);
    w += Math.exp(-(d * d) / (sigma * sigma));
  }
  return Math.min(1, w);
}

function eaveHeightM(ctx: SurfaceCtx, thetaRad: number): number {
  return eaveHeightAtM(ctx.H, ctx.apertureRad, thetaRad);
}

function footPull(ctx: SurfaceCtx, thetaRad: number): number {
  return footPullAt(ctx.footAnglesRad, thetaRad);
}

/**
 * World point of the canopy surface at polar-parametric (r 0..1, θ bearing rad).
 *
 * With a drawn ShapeField the plan radius and the height BOTH come from the
 * drawing: the net fills the footprint the lines enclosed and lies on the
 * surface that was sculpted. Without one, the analytic cap below — unchanged.
 */
function canopyPoint(ctx: SurfaceCtx, r: number, thetaRad: number): Vec3 {
  // Bearing convention: 0 = north = +Z, 90° = east = +X (matches sunpath.ts).
  const sin = Math.sin(thetaRad);
  const cos = Math.cos(thetaRad);

  if (ctx.shape?.planRadiusAtM && ctx.shape?.heightAtM) {
    const R = ctx.shape.planRadiusAtM(thetaRad);
    const x = r * R * sin;
    const z = r * R * cos;
    // The drawn surface already dives to the lawn at the feet and stays up
    // between them — the eave is a property of the drawing, not of a rule.
    return [x, Math.max(0, ctx.shape.heightAtM(x, z)), z];
  }

  const E = eaveHeightM(ctx, thetaRad);
  let y = E + (ctx.H - E) * capProfile(r);
  // The ONE typology: near the edge, the surface sweeps down and roots at
  // the feet (FABRICATION.md §5).
  y *= 1 - footPull(ctx, thetaRad) * Math.pow(r, 5);
  return [ctx.a * r * sin, y, ctx.b * r * cos];
}

/** Outward (upward) unit surface normal at (r, θ), by central differences. */
function surfaceNormal(ctx: SurfaceCtx, r: number, thetaRad: number): Vec3 {
  const e = 1e-4;
  const tR = vSub(
    canopyPoint(ctx, Math.min(1, r + e), thetaRad),
    canopyPoint(ctx, Math.max(1e-6, r - e), thetaRad),
  );
  const tT = vSub(canopyPoint(ctx, r, thetaRad + e), canopyPoint(ctx, r, thetaRad - e));
  let n = vCross(tT, tR);
  if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
  return vNorm(n);
}

/**
 * Sample the canopy at parametric (u,v): u = around the plan (0..1 from north,
 * clockwise), v = up the canopy (0 = edge, 1 = crown). Returns the world point,
 * the outward unit surface normal there, and the compass bearing (deg) that
 * facet faces. Used by the strut optimiser + overlays so the living layer keys
 * off coordinates, never off members.
 *
 * The normal matters: overlays sit ON the skin by stepping along it. Offsetting
 * radially about Y instead (the old `p * 1.04` trick) only holds for a vertical
 * cylinder — on a dome it collapses to zero at the crown and shoves cells off
 * the face near the eave, where the normal points outward AND down.
 */
export function surfacePoint(
  params: DesignParams,
  u: number,
  v: number,
): { point: Vec3; normal: Vec3; bearingDeg: number } {
  const p = clampParams(params);
  const ctx = surfaceCtx(p);
  const theta = u * TWO_PI;
  const r = 1 - v;
  return {
    point: canopyPoint(ctx, r, theta),
    normal: surfaceNormal(ctx, r, theta),
    bearingDeg: ((theta / DEG) % 360 + 360) % 360,
  };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** One point on an elevation section: in-plan radius (m) + height (m). */
export interface ProfileSample {
  radius: number;
  y: number;
}

/**
 * The real elevation silhouette of the canopy along a radial section at a
 * compass bearing, sampled edge (v=0) to crown (v=1) from the SAME surface
 * function the members are built on. Pure; used by the documentation-layer
 * diagrams so they draw live engine geometry, never a freehand dome.
 */
export function canopyProfile(params: DesignParams, bearingDeg: number, samples = 24): ProfileSample[] {
  const u = ((((bearingDeg % 360) + 360) % 360) / 360) % 1;
  return Array.from({ length: samples }, (_, i) => {
    const v = i / (samples - 1);
    const { point } = surfacePoint(params, u, v);
    return { radius: Math.hypot(point[0], point[2]), y: point[1] };
  });
}

const STRUT_DEPTH_M = STOCK.strut.depthMm / 1000;
const LAMELLA_DEPTH_M = STOCK.lamella.depthMm / 1000;
const BLANK_DEPTH_M = STOCK.blank.depthMm / 1000;

export function generateGeometry(rawParams: DesignParams, shape?: ShapeField): CanopyGeometry {
  const params = clampParams(rawParams);
  const lamella = params.jointSystem === 'lamella';
  const { a: planAM, b: planBM } = planDims(params.footprintM2);
  const perimeterM = ellipsePerimeterM(planAM, planBM);

  // Diagrid resolution from the bay-spacing parameter: node-to-node spacing
  // along a diagonal ≈ strutSpacingM × the diamond diagonal factor.
  const bayM = params.strutSpacingM * 1.35;
  const spokeCount = Math.max(12, 2 * Math.round(perimeterM / bayM / 2));

  const ctx = surfaceCtx(params, spokeCount, shape);
  const { a, b, H } = ctx;
  const feetCount = ctx.footAnglesRad.length;
  const meanR = (a + b) / 2;
  const radialRunM = Math.hypot(meanR, H) * 1.05;
  const ringCount = Math.max(4, Math.round(radialRunM / bayM));

  const r0 = GRAMMAR.crownFraction; // crown oculus radius — diagrid starts here
  const rAt = (i: number) => r0 + (1 - r0) * (i / ringCount);
  const thetaAt = (j: number) => (j / spokeCount) * TWO_PI;
  const spokeStep = TWO_PI / spokeCount;
  const wrap = (j: number) => ((j % spokeCount) + spokeCount) % spokeCount;

  // -------------------------------------------------------------------------
  // NODE GRID — every joint is explicit; a connector lives at each node.
  // -------------------------------------------------------------------------
  const grid: CanopyNode[][] = [];
  for (let i = 0; i <= ringCount; i++) {
    const ring: CanopyNode[] = [];
    for (let j = 0; j < spokeCount; j++) {
      const pos = canopyPoint(ctx, rAt(i), thetaAt(j));
      // Touchdown: the grid node at each foot bearing lands EXACTLY at y = 0
      // (footPull → 1 there) and roots on a ground-shoe + driven screw.
      const grounded = i === ringCount && footPull(ctx, thetaAt(j)) >= 0.999;
      ring.push({
        id: `n-${i}-${j}`,
        position: grounded ? [pos[0], 0, pos[2]] : pos,
        normal: surfaceNormal(ctx, rAt(i), thetaAt(j)),
        // Same sense as Member.v (see uv() below): 0 = eave/ground, 1 = crown.
        v: 1 - i / ringCount,
        kind: grounded ? 'ground' : i === 0 ? 'crown' : i === ringCount ? 'eave' : 'interior',
        memberIds: [],
      });
    }
    grid.push(ring);
  }
  const nodes: CanopyNode[] = grid.flat();

  const members: Member[] = [];
  const pieces: Piece[] = [];

  const uv = (i: number, j: number) => ({
    u: wrap(j) / spokeCount,
    v: 1 - i / ringCount,
  });

  const addMember = (
    m: Omit<Member, 'lengthM' | 'normal' | 'endCuts' | 'startTrimM' | 'endTrimM'>,
    from: CanopyNode,
    to: CanopyNode,
  ): Member => {
    // Section frame: mean of the end-node surface normals, orthogonalized
    // against the member axis — the timber stands on edge along this.
    const axis = vNorm(vSub(to.position, from.position));
    const nSum: Vec3 = [
      from.normal[0] + to.normal[0],
      from.normal[1] + to.normal[1],
      from.normal[2] + to.normal[2],
    ];
    const d = vDot(nSum, axis);
    const normal = vNorm([nSum[0] - d * axis[0], nSum[1] - d * axis[1], nSum[2] - d * axis[2]]);
    const member: Member = {
      ...m,
      lengthM: dist(from.position, to.position),
      normal,
      // Placeholder square cuts — the joint-resolution pass (below) assigns
      // every end its real plane per FABRICATION.md §1a.
      endCuts: {
        start: { point: from.position, normal: [-axis[0], -axis[1], -axis[2]], kind: 'square' },
        end: { point: to.position, normal: axis, kind: 'square' },
      },
      startTrimM: 0,
      endTrimM: 0,
    };
    members.push(member);
    from.memberIds.push(member.id);
    to.memberIds.push(member.id);
    return member;
  };

  /** Physical cut length is filled AFTER joint resolution (planes → trims). */
  const addPiece = (kind: Piece['kind'], id: string, segs: Member[], stock: Piece['stock'], depthM: number) => {
    pieces.push({
      id,
      kind,
      memberIds: segs.map((s) => s.id),
      lengthM: 0,
      stock,
      depthM,
    });
  };

  /** Edge members inside a foot's pull are 'foot' parts (the rooted sweep). */
  const sweptType = (i: number, jMid: number, fallback: Member['type']): Member['type'] =>
    i >= ringCount - 2 && footPull(ctx, thetaAt(jMid)) > 0.45 ? 'foot' : fallback;

  // -------------------------------------------------------------------------
  // DIAGRID — two diagonal families, generated as chains so both joint
  // systems share one topology:
  //   hub:     every segment is its own straight strut (piece = 1 segment)
  //   lamella: pieces span TWO bays; at each interior ring exactly one family
  //            runs continuous (family a at even rings, family b at odd),
  //            giving the classic Zollinger weave with ONE bolt per node.
  // -------------------------------------------------------------------------
  const lamellaContinuesAt = (ring: number, family: 'a' | 'b'): boolean =>
    lamella && ring > 0 && ring < ringCount && (family === 'a' ? ring % 2 === 0 : ring % 2 === 1);

  for (const family of ['a', 'b'] as const) {
    const dj = family === 'a' ? 1 : -1;
    for (let j0 = 0; j0 < spokeCount; j0++) {
      let run: Member[] = [];
      for (let i = 0; i < ringCount; i++) {
        const jFrom = wrap(j0 + dj * i);
        const jTo = wrap(j0 + dj * (i + 1));
        const from = grid[i][jFrom];
        const to = grid[i + 1][jTo];
        const { u, v } = uv(i, jFrom);
        const type = sweptType(i, jFrom + dj * 0.5, lamella ? 'lamella' : 'lattice');
        run.push(
          addMember(
            {
              id: `lat-${family}-${i}-${jFrom}`,
              type,
              start: from.position,
              end: to.position,
              nodeStartId: from.id,
              nodeEndId: to.id,
              pieceId: '', // patched when the run closes
              u,
              v: v - 0.5 / ringCount,
            },
            from,
            to,
          ),
        );
        if (!lamellaContinuesAt(i + 1, family)) {
          // If a two-bay lamella would outgrow the sheet cut limit (it can in
          // the foot-sweep zone, where bays plunge to ground), the weave
          // degrades to single-bay pieces there and joints.ts counts a
          // fish-plate splice at the node instead of a plain bolt.
          const runLengthM = run.reduce((s, m) => s + m.lengthM, 0);
          const groups =
            runLengthM > GRAMMAR.maxComponentLengthM ? run.map((s) => [s]) : [run];
          for (const group of groups) {
            const startRing = i + 1 - run.length + run.indexOf(group[0]);
            const pieceId = `${lamella ? 'lam' : 'strut'}-${family}-${j0}-${startRing}`;
            group.forEach((s) => (s.pieceId = pieceId));
            addPiece(
              lamella ? 'lamella' : 'strut',
              pieceId,
              group,
              lamella ? 'sheet' : 'linear',
              lamella ? LAMELLA_DEPTH_M : STRUT_DEPTH_M,
            );
          }
          run = [];
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // CROWN RING — the compression ring around the oculus: per-spoke chord
  // segments grouped into curved LVL blanks that respect the sheet cut limit.
  // -------------------------------------------------------------------------
  const ringPieces = (
    ringIdx: number,
    idPrefix: string,
    kind: Piece['kind'],
    type: Member['type'],
    boundaries: number[], // spoke indices where a new piece must start; [] = length-driven
  ) => {
    // One or two segments per spoke bay: a single facet can outgrow the sheet
    // where the eave drops steeply to a sweep foot — the beam then splices
    // MID-BAY on a valence-2 fish-plate node (no hub), standard edge-beam
    // practice; joints.ts counts the plate.
    const bySpoke: Member[][] = [];
    for (let j = 0; j < spokeCount; j++) {
      const from = grid[ringIdx][j];
      const to = grid[ringIdx][wrap(j + 1)];
      const { u, v } = uv(ringIdx, j);
      const chordM = dist(from.position, to.position);
      if (chordM > GRAMMAR.maxComponentLengthM) {
        const mid: Vec3 = [
          (from.position[0] + to.position[0]) / 2,
          (from.position[1] + to.position[1]) / 2,
          (from.position[2] + to.position[2]) / 2,
        ];
        const splice: CanopyNode = {
          id: `${idPrefix}-sp-${j}`,
          position: mid,
          normal: vNorm([
            from.normal[0] + to.normal[0],
            from.normal[1] + to.normal[1],
            from.normal[2] + to.normal[2],
          ]),
          // A splice sits mid-bay on its own ring, so it shares that ring's v.
          v,
          kind: 'splice',
          memberIds: [],
        };
        nodes.push(splice);
        bySpoke.push([
          addMember(
            { id: `${idPrefix}-${j}a`, type, start: from.position, end: mid, nodeStartId: from.id, nodeEndId: splice.id, pieceId: '', u, v },
            from,
            splice,
          ),
          addMember(
            { id: `${idPrefix}-${j}b`, type, start: mid, end: to.position, nodeStartId: splice.id, nodeEndId: to.id, pieceId: '', u, v },
            splice,
            to,
          ),
        ]);
      } else {
        bySpoke.push([
          addMember(
            { id: `${idPrefix}-${j}`, type, start: from.position, end: to.position, nodeStartId: from.id, nodeEndId: to.id, pieceId: '', u, v },
            from,
            to,
          ),
        ]);
      }
    }

    // Split the cyclic chord run into pieces: at declared splice boundaries
    // (eave rule: feet + midspans), and ALWAYS the moment a blank would
    // outgrow the sheet cut limit.
    const startJ = boundaries.length ? boundaries[0] : 0;
    let run: Member[] = [];
    let runLen = 0;
    let pieceN = 0;
    const close = () => {
      if (!run.length) return;
      const pieceId = `${idPrefix}-blank-${pieceN++}`;
      run.forEach((s) => (s.pieceId = pieceId));
      addPiece(kind, pieceId, run, 'sheet', BLANK_DEPTH_M);
      run = [];
      runLen = 0;
    };
    for (let k = 0; k < spokeCount; k++) {
      const j = wrap(startJ + k);
      const boundarySpoke = boundaries.length > 0 && boundaries.includes(j);
      let firstInBay = true;
      for (const seg of bySpoke[j]) {
        const overCap = runLen + seg.lengthM > GRAMMAR.maxComponentLengthM;
        if ((boundarySpoke && firstInBay) || overCap) close(); // no-op on an empty run
        run.push(seg);
        runLen += seg.lengthM;
        firstInBay = false;
      }
    }
    close();
  };

  // Eave splice boundaries: at each foot spoke and once mid-way between feet
  // (GRAMMAR.eaveBlanksPerFootSpan = 2) — splices land where a connector
  // already lives, per FABRICATION.md §4.
  const footSpokes = [...new Set(ctx.footAnglesRad.map((f) => wrap(Math.round(f / spokeStep))))].sort(
    (x, y) => x - y,
  );
  const eaveBoundaries = [...footSpokes];
  for (let k = 0; k < footSpokes.length; k++) {
    const f1 = footSpokes[k];
    const f2 = k + 1 < footSpokes.length ? footSpokes[k + 1] : footSpokes[0] + spokeCount;
    eaveBoundaries.push(wrap(f1 + Math.round((f2 - f1) / 2)));
  }
  const uniqueEaveBoundaries = [...new Set(eaveBoundaries)].sort((x, y) => x - y);

  ringPieces(0, 'crown', 'crownBlank', 'crown', []);
  ringPieces(ringCount, 'eave', 'eaveBlank', 'eave', uniqueEaveBoundaries);

  // -------------------------------------------------------------------------
  // CROWN CAP — close the oculus into a solid crown boss so the DEFAULT build
  // reads as a COMPLETE dome. The r < r0 region was a literal ~1 m hole at the
  // top; Daniel wants holes to come ONLY from the excavate tool. A polar
  // diagrid converges toward the crown, so rather than run the net to a
  // degenerate point across many rings, ONE fan of short radial ribs springs
  // from the innermost diagrid ring (ring 0) up to a single apex node — a
  // bespoke machined crown boss, the summit cousin of the eave hubs.
  //
  // The ribs are ordinary diagrid members (the same type/stock the rest of the
  // net uses), so they inherit the hub standoff / blank-face joint resolution,
  // the prism render and the BOM line with no new machinery. Crucially they are
  // added BEFORE the excavation prune below, so an excavation over the crown
  // removes them by midpoint exactly like any member and reopens the crown right
  // where the user asked — excavate stays the ONLY source of holes.
  //
  // FAB FLOOR: these are the shortest members in the kit (~0.4-0.5 m centreline).
  // That is under the 0.45 m connector-overlap floor, but that floor governs
  // FIELD diamonds (fin overlap at acute diagrid angles); the crown region is
  // already floor-exempt (the ring-0 compression chords run ~0.17 m as blanks).
  // The apex is a single purpose-made boss, not a field diamond, and the
  // standoff solver still clears every rib end off the boss envelope.
  const apex: CanopyNode = {
    id: 'n-crown-apex',
    // surfaceNormal() is degenerate at r=0 (the θ-tangent collapses to zero, so
    // the cross product is 0 → NaN); the summit simply points straight up.
    position: canopyPoint(ctx, 0, 0),
    normal: [0, 1, 0],
    v: 1,
    kind: 'crown',
    memberIds: [],
  };
  nodes.push(apex);
  const capType: Member['type'] = lamella ? 'lamella' : 'lattice';
  for (let j = 0; j < spokeCount; j++) {
    const from = grid[0][j];
    const { u, v } = uv(0, j);
    const rib = addMember(
      {
        id: `crowncap-${j}`,
        type: capType,
        start: from.position,
        end: apex.position,
        nodeStartId: from.id,
        nodeEndId: apex.id,
        pieceId: '', // patched immediately below
        u,
        v,
      },
      from,
      apex,
    );
    const pieceId = `crowncap-${lamella ? 'lam' : 'strut'}-${j}`;
    rib.pieceId = pieceId;
    addPiece(
      lamella ? 'lamella' : 'strut',
      pieceId,
      [rib],
      lamella ? 'sheet' : 'linear',
      lamella ? LAMELLA_DEPTH_M : STRUT_DEPTH_M,
    );
  }

  // ---------------------------------------------------------------------------
  // JOINT RESOLUTION (FABRICATION.md §1a) — assign every member end its ONE
  // planar cut (mitres, skew butts, blank faces, computed hub standoffs),
  // derive the trims from the planes, then fill the PHYSICAL cut lengths the
  // BOM prices. The scene draws the same clipped solids.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // EXCAVATION. A hole has to remove real members, or "excavate" is a lie the
  // soft surface tells and the cut list contradicts: the opening shows on
  // screen, then the kit arrives solid and priced as solid.
  //
  // Pruned BEFORE joint resolution on purpose. The members that survive are the
  // ones whose ends must be cut and whose lengths get priced — resolving joints
  // first would compute planes against neighbours that are about to vanish, and
  // the BOM would quietly bill for them.
  // ---------------------------------------------------------------------------
  if (shape?.isHoleAt) {
    const holed = (m: Member) =>
      shape.isHoleAt!((m.start[0] + m.end[0]) / 2, (m.start[2] + m.end[2]) / 2);
    const gone = new Set(members.filter(holed).map((m) => m.id));
    if (gone.size > 0) {
      for (let k = members.length - 1; k >= 0; k--) {
        if (gone.has(members[k].id)) members.splice(k, 1);
      }
      for (const n of nodes) n.memberIds = n.memberIds.filter((id) => !gone.has(id));
      for (const pc of pieces) pc.memberIds = pc.memberIds.filter((id) => !gone.has(id));
      // A piece with nothing left is not a piece; it must not reach the BOM.
      for (let k = pieces.length - 1; k >= 0; k--) {
        if (pieces[k].memberIds.length === 0) pieces.splice(k, 1);
      }
      // A node nothing arrives at is not a joint; it must not get a connector.
      for (let k = nodes.length - 1; k >= 0; k--) {
        if (nodes[k].memberIds.length === 0) nodes.splice(k, 1);
      }
    }
  }

  resolveJointCuts(nodes, members, params.jointSystem);
  const memberById = new Map(members.map((m) => [m.id, m]));
  for (const piece of pieces) {
    piece.lengthM = piece.memberIds.reduce((sum, id) => {
      const m = memberById.get(id)!;
      return sum + m.lengthM - m.startTrimM - m.endTrimM;
    }, 0);
  }

  const groundScrewCount = nodes.filter((n) => n.kind === 'ground').length;

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
      const j2 = wrap(j + 1);
      surfaceAreaM2 +=
        tri(grid[i][j].position, grid[i + 1][j].position, grid[i + 1][j2].position) +
        tri(grid[i][j].position, grid[i + 1][j2].position, grid[i][j2].position);
    }
  }

  // The buildability check runs on PIECES against THEIR stock: sheet pieces
  // against the CNC cut limit, linear pieces against the courier/handling
  // cap. The grammar guarantees both; shout if that ever stops being true.
  const maxComponentLengthM = pieces.reduce((mx, p) => Math.max(mx, p.lengthM), 0);
  for (const p of pieces) {
    const cap = p.stock === 'sheet' ? GRAMMAR.maxComponentLengthM : GRAMMAR.maxLinearPieceM;
    if (p.lengthM > cap + 1e-6) {
      // eslint-disable-next-line no-console
      console.warn(
        `[grammar] ${p.kind} ${p.id} at ${p.lengthM.toFixed(2)} m exceeds the ${cap} m ${
          p.stock === 'sheet' ? 'sheet cut' : 'linear handling'
        } rule`,
      );
    }
  }

  return {
    params,
    nodes,
    members,
    pieces,
    groundScrewCount,
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
