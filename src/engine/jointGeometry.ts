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
import { JOINTS, STOCK } from '../data/config';
import type { CanopyNode, EndCut, JointSystem, Member, Vec3 } from './types';
import { vAdd, vCross, vDot, vNorm, vPerp, vScale, vSub } from './vec';

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

    // Ring frame at ring nodes: the blank band's averaged width direction —
    // in-surface, ⊥ the ring tangent. Blank-face planes and strut clearances
    // are both measured along it.
    const ringMembers = ends.filter((e) => isRing(e.m.type));
    let ringWidthDir: Vec3 | null = null;
    if (ringMembers.length >= 2) {
      // Travel direction around the ring: the two ring ends point away from
      // the node in opposite senses, so flip one before averaging.
      const t = vNorm(vSub(ringMembers[0].u, ringMembers[1].u));
      ringWidthDir = vNorm(vCross(t, node.normal));
    }

    if (!lamella) {
      // --- HUB: square cut at the computed standoff (FABRICATION.md §2). ---
      for (const e of open) {
        const t = hubStandoffM(e, node, ringWidthDir, envelopeR, blankHalfM + blankClearM);
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
 * The computed hub standoff (FABRICATION.md §1a/§2): smallest square-cut
 * length where every corner of the end face clears the node's connector
 * envelope (radius already includes the clearance), and — at ring nodes —
 * sits clear of the blank's inner face. Floor: the core radius.
 */
function hubStandoffM(
  e: EndRef,
  node: CanopyNode,
  ringWidthDir: Vec3 | null,
  envelopeR: number,
  blankFaceOffsetM: number,
): number {
  const { widthM, depthM } = sectionFor(e.m.type, 'hub');
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
  if (a > 1e-8) {
    for (const o of corners) {
      const oT = vPerp(o, node.normal);
      const b = 2 * vDot(uT, oT);
      const c = vDot(oT, oT) - envelopeR * envelopeR;
      const disc = b * b - 4 * a * c;
      if (disc > 0) t = Math.max(t, (-b + Math.sqrt(disc)) / (2 * a));
    }
  }

  // Ring nodes: the end face also clears the blank's inner face plane.
  if (ringWidthDir) {
    const s = Math.sign(vDot(e.u, ringWidthDir)) || 1;
    const n = vScale(ringWidthDir, s);
    const un = vDot(e.u, n);
    if (un > 0.05) {
      for (const o of corners) {
        t = Math.max(t, (blankFaceOffsetM - vDot(o, n)) / un);
      }
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
