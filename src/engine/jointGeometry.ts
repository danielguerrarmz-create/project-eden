/**
 * jointGeometry.ts — resolves WHERE each member's physical end is cut.
 *
 * FABRICATION.md §1a is the contract: every member is its rectangular section
 * extruded along its centreline and terminated by exactly TWO PLANAR CUTS —
 * the only end geometry a docking saw (square) or the CNC profile (skew) can
 * make. This module walks the node graph once and assigns each member end its
 * cut plane by the joint rules:
 *
 *   mitre      — two segments of the SAME piece meeting at a node (a two-bay
 *                lamella's through-node, blank facet-to-facet) and blank
 *                piece ends at ring nodes: both cut on the bisector plane, so
 *                the faceted representation of a curved piece closes exactly.
 *   splice     — valence-2 mid-bay splice nodes: square cuts, 1.5 mm short of
 *                the node each (fish plates carry across).
 *   standoff   — hub struts: square cut at the COMPUTED standoff where every
 *                end-face corner clears the node's Ø140 connector envelope by
 *                the stated clearance (floor: the core radius), and at ring
 *                nodes also clears the blank's inner face.
 *   butt       — lamella ends at woven interior nodes: skew cut ON the
 *                continuous piece's side-face plane (half thickness + gap).
 *   blankFace  — lamella ends at ring nodes: skew cut on the blank's
 *                inner-face plane (half blank depth + gap).
 *
 * Trims (centreline-to-plane distances) are DERIVED here and flow into the
 * physical cut lengths the BOM prices. memberPrism() then turns a member into
 * the 8-corner solid the scene draws — the section's four long edges clipped
 * against the two planes. What you see IS the cut.
 *
 * PURE data-in data-out (mutates the members it is handed, as part of
 * generateGeometry's build). No three.js.
 */
import { FOUNDATION, JOINTS, STOCK } from '../data/config';
import type { CanopyNode, EndCut, JointSystem, Member, Piece, Vec3 } from './types';
import { vAdd, vCross, vDot, vLen, vNorm, vPerp, vScale, vSub } from './vec';

const MM = 1 / 1000;

/** Section (width in-surface, depth along the normal) per member role, m. */
export function sectionFor(
  type: Member['type'],
  jointSystem: JointSystem,
): { widthM: number; depthM: number } {
  switch (type) {
    case 'eave':
    case 'crown':
      // Blank bands: 180 wide in the tangent plane, 45 thick along the normal.
      return { widthM: STOCK.blank.depthMm * MM, depthM: STOCK.blank.thicknessMm * MM };
    case 'lamella':
      return { widthM: STOCK.lamella.thicknessMm * MM, depthM: STOCK.lamella.depthMm * MM };
    case 'lattice':
      return { widthM: STOCK.strut.widthMm * MM, depthM: STOCK.strut.depthMm * MM };
    case 'foot':
      return jointSystem === 'lamella'
        ? { widthM: STOCK.lamella.thicknessMm * MM, depthM: STOCK.lamella.depthMm * MM }
        : { widthM: STOCK.strut.widthMm * MM, depthM: STOCK.strut.depthMm * MM };
  }
}

/** A member's orthonormal section frame. axis: start→end. width = axis × depth. */
export function memberFrame(m: Member): { axis: Vec3; depth: Vec3; width: Vec3 } {
  const axis = vNorm(vSub(m.end, m.start));
  const depth = m.normal;
  const width = vNorm(vCross(axis, depth));
  return { axis, depth, width };
}

// ---------------------------------------------------------------------------
// THE FLAT-PIECE RULE (FABRICATION.md §1a): a sheet piece is cut from flat
// stock, so it owns ONE plane. flatPieceFit measures how well a run of
// segments can live in a single plane; the run closers split on it, and
// resolvePieceFrames orients every section to the final piece's plane.
// ---------------------------------------------------------------------------

export interface FlatFit {
  /** The sheet plane: for a lamella the section DEPTH lies IN it (normal =
   *  the 45 mm thickness direction); for a blank the section depth (45 mm
   *  thickness) IS along the normal. */
  origin: Vec3;
  normal: Vec3;
  /** Max centreline-node deviation from the plane (m). */
  devM: number;
  /** Max section lean off the ideal surface normal (deg). */
  leanDeg: number;
}

const DEG_PER_RAD = 180 / Math.PI;

/**
 * Fit the sheet plane of a segment run: the support plane through the run's
 * endpoints and its most-offset node (exact for ≤3 nodes; a tight, simple
 * bound for longer runs). Falls back to a zero-lean construction from the
 * mean ideal normal when the centreline is straight.
 */
export function flatPieceFit(segs: Member[], mode: 'lamella' | 'blank'): FlatFit {
  const points: Vec3[] = [segs[0].start, ...segs.map((s) => s.end)];
  const p0 = points[0];
  const chord = vSub(points[points.length - 1], p0);
  const chordDir = vNorm(chord);
  const meanIdeal = vNorm(
    segs.reduce<Vec3>((acc, s) => vAdd(acc, s.normal), [0, 0, 0]),
  );

  // Most-offset interior node from the chord line.
  let q: Vec3 | null = null;
  let qDist = 1e-5; // below this the centreline is straight
  for (let i = 1; i < points.length - 1; i++) {
    const rel = vSub(points[i], p0);
    const off = vLen(vPerp(rel, chordDir));
    if (off > qDist) {
      qDist = off;
      q = points[i];
    }
  }

  let normal: Vec3;
  if (q) {
    normal = vNorm(vCross(chord, vSub(q, p0)));
  } else if (mode === 'blank') {
    // Straight band: plane contains the chord, normal as close to the ideal
    // thickness direction (the surface normal) as possible.
    normal = vNorm(vPerp(meanIdeal, chordDir));
  } else {
    // Straight lamella: plane contains the chord AND the ideal depth.
    normal = vNorm(vCross(chordDir, meanIdeal));
  }

  let devM = 0;
  for (const p of points) {
    devM = Math.max(devM, Math.abs(vDot(vSub(p, p0), normal)));
  }

  let leanDeg = 0;
  for (const s of segs) {
    const axis = vNorm(vSub(s.end, s.start));
    // The section direction the flat piece FORCES, vs the surface ideal.
    const forced =
      mode === 'lamella'
        ? vNorm(vCross(normal, axis)) // depth lies in the plane
        : vNorm(vPerp(normal, axis)); // thickness along the plane normal
    const cos = Math.min(1, Math.abs(vDot(forced, s.normal)));
    leanDeg = Math.max(leanDeg, Math.acos(cos) * DEG_PER_RAD);
  }

  return { origin: p0, normal, devM, leanDeg };
}

/**
 * Orient every sheet piece's sections to its ONE plane (the run closers have
 * already guaranteed the fit is inside tolerance). After this pass a
 * two-bay lamella's two segments share their thickness direction exactly —
 * which is what makes their mitre close exactly. Runs BEFORE
 * resolveJointCuts, which consumes the frames.
 */
export function resolvePieceFrames(members: Member[], pieces: Piece[]): void {
  const byId = new Map(members.map((m) => [m.id, m]));
  for (const piece of pieces) {
    if (piece.stock !== 'sheet') continue;
    const segs = piece.memberIds.map((id) => byId.get(id)!);
    const mode = piece.kind === 'lamella' ? 'lamella' : 'blank';
    const fit = flatPieceFit(segs, mode);
    piece.plane = { origin: fit.origin, normal: fit.normal };
    piece.flatDevM = fit.devM;
    piece.leanDeg = fit.leanDeg;
    for (const m of segs) {
      const axis = vNorm(vSub(m.end, m.start));
      let d =
        mode === 'lamella'
          ? vNorm(vCross(fit.normal, axis))
          : vNorm(vPerp(fit.normal, axis));
      if (vDot(d, m.normal) < 0) d = vScale(d, -1);
      m.normal = d;
    }
  }
}

/** One member end as seen from the node it lands on. */
interface EndRef {
  m: Member;
  end: 'start' | 'end';
  /** Unit direction from the node INTO the member (toward its other end). */
  u: Vec3;
}

const setCut = (e: EndRef, cut: EndCut) => {
  e.m.endCuts[e.end] = cut;
};

/**
 * Resolve every member end's cut plane, then derive the trims.
 * Nodes/members must form the closed graph generateGeometry builds.
 */
export function resolveJointCuts(
  nodes: CanopyNode[],
  members: Member[],
  jointSystem: JointSystem,
): void {
  const lamella = jointSystem === 'lamella';
  const memberById = new Map(members.map((m) => [m.id, m]));
  const halfGap = JOINTS.spliceGapM / 2;
  const buttOffsetM = STOCK.lamella.thicknessMm * MM * 0.5 + JOINTS.lamella.assemblyGapMm * MM;
  const blankHalfM = STOCK.blank.depthMm * MM * 0.5;
  const blankFaceOffsetM = blankHalfM + JOINTS.lamella.assemblyGapMm * MM;
  const envelopeR = JOINTS.hub.coreDiaMm * MM * 0.5 + JOINTS.hub.envelopeClearanceMm * MM;
  const blankClearM = JOINTS.hub.blankFaceClearanceMm * MM;

  // Default every end to a plain square cut through the node (kind 'square');
  // the rules below overwrite all of them — the default survives only as a
  // degenerate-case fallback.
  for (const m of members) {
    const { axis } = memberFrame(m);
    m.endCuts = {
      start: { point: m.start, normal: vScale(axis, -1), kind: 'square' },
      end: { point: m.end, normal: axis, kind: 'square' },
    };
  }

  const isRing = (t: Member['type']) => t === 'eave' || t === 'crown';
  const isDiagrid = (t: Member['type']) => !isRing(t);

  for (const node of nodes) {
    const P = node.position;
    const ends: EndRef[] = [];
    for (const id of node.memberIds) {
      const m = memberById.get(id)!;
      const { axis } = memberFrame(m);
      if (m.nodeStartId === node.id) ends.push({ m, end: 'start', u: axis });
      if (m.nodeEndId === node.id) ends.push({ m, end: 'end', u: vScale(axis, -1) });
    }

    // --- SPLICE NODES: square cuts, half the joint gap each side. ----------
    if (node.kind === 'splice') {
      for (const e of ends) {
        setCut(e, {
          point: vAdd(P, vScale(e.u, halfGap)),
          normal: vScale(e.u, -1),
          kind: 'splice',
        });
      }
      continue;
    }

    // --- GROUND NODES (FABRICATION.md §5): every timber end — swept lattice,
    // lamella and eave band alike — is square-cut clear of the SPLASH PLANE;
    // the shoe's welded upstand bridges the gap. No timber sits at grade.
    if (node.kind === 'ground') {
      const diagridEnds = ends.filter((e) => isDiagrid(e.m.type));
      for (const e of ends) {
        const neighbours = diagridEnds.filter((o) => o !== e).map((o) => o.u);
        const t = standoffM(e, node, neighbours, null, lamella ? 0 : envelopeR, 0, true);
        setCut(e, {
          point: vAdd(P, vScale(e.u, t)),
          normal: vScale(e.u, -1),
          kind: 'standoff',
        });
      }
      continue;
    }

    const assigned = new Set<EndRef>();

    /** Cut both ends of a pair on their shared bisector plane. */
    const mitrePair = (a: EndRef, b: EndRef) => {
      const n = vSub(a.u, b.u);
      if (vDot(n, n) < 1e-6) return; // parallel — leave the square default
      const nn = vNorm(n);
      // Outward normal points out of each member's timber: n·u < 0.
      setCut(a, { point: P, normal: vScale(nn, -1), kind: 'mitre' });
      setCut(b, { point: P, normal: nn, kind: 'mitre' });
      assigned.add(a);
      assigned.add(b);
    };

    // --- MITRES: two segments of one piece passing through this node. ------
    const byPiece = new Map<string, EndRef[]>();
    for (const e of ends) {
      const list = byPiece.get(e.m.pieceId) ?? [];
      list.push(e);
      byPiece.set(e.m.pieceId, list);
    }
    for (const pair of byPiece.values()) {
      if (pair.length === 2) mitrePair(pair[0], pair[1]);
    }

    // --- MITRES: blank piece-to-piece ends at a ring node. The splice
    // hardware (eave-hub flange / fish plate) carries across the same plane.
    const ringEnds = ends.filter((e) => isRing(e.m.type) && !assigned.has(e));
    if (ringEnds.length === 2) mitrePair(ringEnds[0], ringEnds[1]);

    const open = ends.filter((e) => !assigned.has(e) && isDiagrid(e.m.type));
    if (open.length === 0) continue;

    // Ring frame at ring nodes: the blank band's true face direction — the
    // averaged in-plane width dir of the two facets (their piece planes are
    // resolved by now). Blank-face planes and strut clearances measure
    // along it.
    const ringMembers = ends.filter((e) => isRing(e.m.type));
    let ringWidthDir: Vec3 | null = null;
    if (ringMembers.length >= 2) {
      const w0 = memberFrame(ringMembers[0].m).width;
      let w1 = memberFrame(ringMembers[1].m).width;
      if (vDot(w0, w1) < 0) w1 = vScale(w1, -1);
      ringWidthDir = vNorm(vAdd(w0, w1));
    }

    if (!lamella) {
      // --- HUB: square cut at the computed standoff (FABRICATION.md §2). ---
      for (const e of open) {
        const neighbours = open.filter((o) => o !== e).map((o) => o.u);
        const t = standoffM(
          e,
          node,
          neighbours,
          ringWidthDir,
          envelopeR,
          blankHalfM + blankClearM,
          false,
        );
        setCut(e, {
          point: vAdd(P, vScale(e.u, t)),
          normal: vScale(e.u, -1),
          kind: 'standoff',
        });
      }
      continue;
    }

    // --- LAMELLA at ring nodes: skew cut on the blank's inner face. --------
    if (ringWidthDir) {
      for (const e of open) {
        const s = Math.sign(vDot(e.u, ringWidthDir)) || 1;
        const n = vScale(ringWidthDir, s); // toward the lamella's side
        if (Math.abs(vDot(e.u, n)) < 0.05) continue; // degenerate: keep square
        setCut(e, {
          point: vAdd(P, vScale(n, blankFaceOffsetM)),
          normal: vScale(n, -1),
          kind: 'blankFace',
        });
      }
      continue;
    }

    // --- LAMELLA at interior nodes: the Zollinger joint. --------------------
    // The continuous piece (found via the mitre pass) lends its side faces;
    // the two butting ends are skew-cut ON those planes.
    let through = [...byPiece.values()].find((pair) => pair.length === 2);
    if (!through) {
      // Split-weave node (sheet limit degraded the weave): the straighter
      // family is fish-plated end-to-end with the splice gap and acts as the
      // continuous piece; the other family butts against its side faces.
      const pairKey = (a: EndRef, b: EndRef) => -vDot(a.u, b.u); // 1 = collinear
      if (open.length === 4) {
        let best: [EndRef, EndRef] | null = null;
        let bestC = -2;
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            const c = pairKey(open[i], open[j]);
            if (c > bestC) {
              bestC = c;
              best = [open[i], open[j]];
            }
          }
        }
        if (best) {
          for (const e of best) {
            setCut(e, {
              point: vAdd(P, vScale(e.u, halfGap)),
              normal: vScale(e.u, -1),
              kind: 'splice',
            });
            assigned.add(e);
          }
          through = best;
        }
      }
    }
    if (!through) continue; // valence anomaly: leave square defaults

    // Averaged side-face frame of the continuous run at this node.
    const dTravel = vNorm(vSub(through[0].u, through[1].u));
    const nAvg = vNorm(
      vAdd(memberFrame(through[0].m).depth, memberFrame(through[1].m).depth),
    );
    const sideDir = vNorm(vCross(dTravel, vPerp(nAvg, dTravel)));
    for (const e of open) {
      if (assigned.has(e)) continue;
      const s = Math.sign(vDot(e.u, sideDir)) || 1;
      const n = vScale(sideDir, s); // toward the butting member's side
      if (Math.abs(vDot(e.u, n)) < 0.05) continue; // degenerate: keep square
      setCut(e, {
        point: vAdd(P, vScale(n, buttOffsetM)),
        normal: vScale(n, -1),
        kind: 'butt',
      });
    }
  }

  // --- DERIVE the trims: centreline distance from node to cut plane. -------
  for (const m of members) {
    const { axis } = memberFrame(m);
    m.startTrimM = trimAlong(m.start, axis, m.endCuts.start);
    m.endTrimM = trimAlong(m.end, vScale(axis, -1), m.endCuts.end);
  }
}

/** Distance from `node` along unit `u` to the cut plane (0 if parallel). */
function trimAlong(node: Vec3, u: Vec3, cut: EndCut): number {
  const denom = vDot(u, cut.normal);
  if (Math.abs(denom) < 1e-6) return 0;
  return Math.max(0, vDot(vSub(cut.point, node), cut.normal) / denom);
}

/**
 * The computed standoff (FABRICATION.md §1a): smallest square-cut length
 * where the whole end face clears every constraint that lives at this node —
 * the connector envelope (radius includes the clearance; 0 disables), every
 * NEIGHBOURING member's face (timber never touches timber, whatever the node
 * angle), the blank's inner face at ring nodes, and the SPLASH PLANE at
 * ground nodes. Floor: the hub core radius.
 */
function standoffM(
  e: EndRef,
  node: CanopyNode,
  neighbourDirs: Vec3[],
  ringWidthDir: Vec3 | null,
  envelopeR: number,
  blankFaceOffsetM: number,
  splash: boolean,
): number {
  const system: JointSystem = envelopeR > 0 ? 'hub' : 'lamella';
  const { widthM, depthM } = sectionFor(e.m.type, system);
  const frame = memberFrame(e.m);
  const corners: Vec3[] = [];
  for (const sw of [-0.5, 0.5]) {
    for (const sd of [-0.5, 0.5]) {
      corners.push(vAdd(vScale(frame.width, sw * widthM), vScale(frame.depth, sd * depthM)));
    }
  }

  let t: number = JOINTS.hub.strutStandoffM;

  // Envelope: |tangential(t·u + o)| ≥ R for all four corners — a quadratic
  // in t whose larger root is the exit distance from the envelope cylinder.
  const uT = vPerp(e.u, node.normal);
  const a = vDot(uT, uT);
  if (a > 1e-8 && envelopeR > 0) {
    for (const o of corners) {
      const oT = vPerp(o, node.normal);
      const b = 2 * vDot(uT, oT);
      const c = vDot(oT, oT) - envelopeR * envelopeR;
      const disc = b * b - 4 * a * c;
      if (disc > 0) t = Math.max(t, (-b + Math.sqrt(disc)) / (2 * a));
    }
  }

  // Neighbours: my end-face centre keeps half-widths + clearance from every
  // other member's centreline ray. dist(t·u, ray v) = t·sin δ while the
  // closest point is ahead of the node, else simply t.
  const clearM = widthM / 2 + JOINTS.memberClearanceMm * MM; // + their w/2 below
  for (const v of neighbourDirs) {
    const need = clearM + STOCK.strut.widthMm * MM * 0.5;
    const cos = vDot(e.u, v);
    if (cos <= 0) {
      t = Math.max(t, need);
    } else {
      const sin = Math.sqrt(Math.max(1e-6, 1 - cos * cos));
      t = Math.max(t, need / sin);
    }
  }

  // Ring nodes: the end face also clears the blank's inner face plane.
  if (ringWidthDir && blankFaceOffsetM > 0) {
    const s = Math.sign(vDot(e.u, ringWidthDir)) || 1;
    const n = vScale(ringWidthDir, s);
    const un = vDot(e.u, n);
    if (un > 0.05) {
      for (const o of corners) {
        t = Math.max(t, (blankFaceOffsetM - vDot(o, n)) / un);
      }
    }
  }

  // Ground nodes: no corner of the end face below the splash plane (§5).
  if (splash) {
    const uy = e.u[1];
    if (uy > 0.02) {
      for (const o of corners) {
        t = Math.max(t, (FOUNDATION.splashClearM - node.position[1] - o[1]) / uy);
      }
    } else {
      // Near-horizontal arrival at grade: conservative fallback.
      t = Math.max(t, FOUNDATION.splashClearM + depthM);
    }
  }

  return t;
}

/**
 * The member's physical solid: its four section corner edges clipped against
 * the two end planes — an 8-corner convex prism whose faces are all planar
 * (the long edges are parallel, the end faces lie on the cut planes).
 *
 * Corner order: [start 0..3, end 0..3], corners wound (w−,d−) (w+,d−)
 * (w+,d+) (w−,d+) around the section. Falls back to the square trim if a cut
 * plane is degenerate (near-parallel to the axis).
 */
export function memberPrism(m: Member, widthM: number, depthM: number): Vec3[] {
  const { axis, depth, width } = memberFrame(m);
  const L = Math.hypot(m.end[0] - m.start[0], m.end[1] - m.start[1], m.end[2] - m.start[2]);
  const offsets: Vec3[] = [
    vAdd(vScale(width, -0.5 * widthM), vScale(depth, -0.5 * depthM)),
    vAdd(vScale(width, 0.5 * widthM), vScale(depth, -0.5 * depthM)),
    vAdd(vScale(width, 0.5 * widthM), vScale(depth, 0.5 * depthM)),
    vAdd(vScale(width, -0.5 * widthM), vScale(depth, 0.5 * depthM)),
  ];
  const clip = (o: Vec3, cut: EndCut, fallbackT: number): number => {
    const denom = vDot(axis, cut.normal);
    if (Math.abs(denom) < 0.02) return fallbackT;
    return vDot(vSub(cut.point, vAdd(m.start, o)), cut.normal) / denom;
  };
  const verts: Vec3[] = [];
  for (const o of offsets) {
    verts.push(vAdd(vAdd(m.start, o), vScale(axis, clip(o, m.endCuts.start, m.startTrimM))));
  }
  for (const o of offsets) {
    verts.push(vAdd(vAdd(m.start, o), vScale(axis, clip(o, m.endCuts.end, L - m.endTrimM))));
  }
  return verts;
}
