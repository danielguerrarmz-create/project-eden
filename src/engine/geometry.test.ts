import { describe, it, expect } from 'vitest';
import { generateGeometry, canopyProfile } from './geometry';
import { memberPrism, sectionFor } from './jointGeometry';
import { GRAMMAR, ENVELOPE, JOINTS, STOCK } from '../data/config';
import type { DesignParams, JointSystem, Member, Vec3 } from './types';

const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vDot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vLen = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** The prism corners belonging to one end's cut face. */
const endFace = (verts: Vec3[], end: 'start' | 'end') =>
  end === 'start' ? verts.slice(0, 4) : verts.slice(4, 8);

const prismOf = (m: Member, jointSystem: JointSystem) => {
  const { widthM, depthM } = sectionFor(m.type, jointSystem);
  return memberPrism(m, widthM, depthM);
};

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  speciesId: 'clematis',
  year: 0,
};

const SYSTEMS: JointSystem[] = ['hub', 'lamella'];

/** Sweep a representative grid of designs × both joint systems. */
function sweep(fn: (p: DesignParams) => void) {
  for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 1.5) {
    for (const r of [1.9, 2.2, 2.5]) {
      for (const s of [0.45, 0.6, 1.05]) {
        for (const ap of [0, 90, 210]) {
          for (const jointSystem of SYSTEMS) {
            fn({ ...base, footprintM2: f, riseM: r, strutSpacingM: s, apertureDeg: ap, jointSystem });
          }
        }
      }
    }
  }
}

describe('generateGeometry: structural invariants across the whole range', () => {
  it('always roots exactly (no member dips below ground, the foot nodes sit at y=0)', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      for (const m of g.members) {
        expect(m.start[1]).toBeGreaterThanOrEqual(-1e-6);
        expect(m.end[1]).toBeGreaterThanOrEqual(-1e-6);
      }
      const groundNodes = g.nodes.filter((n) => n.kind === 'ground');
      expect(groundNodes.length).toBeGreaterThanOrEqual(g.feetCount);
      for (const n of groundNodes) expect(n.position[1]).toBe(0);
      expect(g.groundScrewCount).toBe(groundNodes.length);
    });
  });

  it('never emits a piece longer than ITS stock allows — the real buildability check', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      expect(g.maxComponentLengthM).toBeLessThanOrEqual(GRAMMAR.maxLinearPieceM + 1e-6);
      for (const piece of g.pieces) {
        const cap = piece.stock === 'sheet' ? GRAMMAR.maxComponentLengthM : GRAMMAR.maxLinearPieceM;
        expect(piece.lengthM, `${piece.kind} ${piece.id}`).toBeLessThanOrEqual(cap + 1e-6);
        expect(piece.lengthM).toBeGreaterThan(0);
      }
    });
  });

  it('produces 3 or 4 feet, a resolved diagrid, and a real major/minor ellipse', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      expect([3, 4]).toContain(g.feetCount);
      expect(g.footBearingsDeg).toHaveLength(g.feetCount);
      expect(g.ringCount).toBeGreaterThanOrEqual(4);
      expect(g.spokeCount).toBeGreaterThanOrEqual(12);
      expect(g.members.length).toBeGreaterThan(0);
      expect(g.planA).toBeGreaterThan(g.planB); // major > minor
    });
  });

  it('is deterministic: same params in, identical member count out', () => {
    expect(generateGeometry(base).members.length).toBe(generateGeometry(base).members.length);
  });
});

describe('generateGeometry: the node graph is a real, closed component model', () => {
  it('every member references two existing nodes, and those nodes know the member', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      const byId = new Map(g.nodes.map((n) => [n.id, n]));
      for (const m of g.members) {
        const a = byId.get(m.nodeStartId);
        const b = byId.get(m.nodeEndId);
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect(a!.memberIds).toContain(m.id);
        expect(b!.memberIds).toContain(m.id);
      }
    });
  });

  it('every member belongs to exactly one piece, and pieces cover all members', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      const memberToPiece = new Map<string, string>();
      for (const piece of g.pieces) {
        for (const mid of piece.memberIds) {
          expect(memberToPiece.has(mid)).toBe(false); // no double-claimed segments
          memberToPiece.set(mid, piece.id);
        }
      }
      for (const m of g.members) {
        expect(memberToPiece.get(m.id)).toBe(m.pieceId);
      }
      expect(memberToPiece.size).toBe(g.members.length);
    });
  });
});

describe('generateGeometry: section frames — solid timber, not piping', () => {
  const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

  it('every node carries a unit, upward surface normal', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      for (const n of g.nodes) {
        expect(len(n.normal)).toBeCloseTo(1, 6);
        expect(n.normal[1]).toBeGreaterThan(0); // outward = upward on a cap
      }
    });
  });

  it('every member frame is unit and perpendicular to the member axis', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      for (const m of g.members) {
        expect(len(m.normal)).toBeCloseTo(1, 6);
        const axis: Vec3 = [
          (m.end[0] - m.start[0]) / m.lengthM,
          (m.end[1] - m.start[1]) / m.lengthM,
          (m.end[2] - m.start[2]) / m.lengthM,
        ];
        const dot = axis[0] * m.normal[0] + axis[1] * m.normal[1] + axis[2] * m.normal[2];
        expect(Math.abs(dot)).toBeLessThan(1e-6);
      }
    });
  });
});

describe('generateGeometry: joint geometry — one planar cut per member end (§1a)', () => {
  it('every member is a valid solid: unit outward cut normals, positive edge lengths, cut faces ON their planes', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      for (const m of g.members) {
        const axis = vSub(m.end, m.start).map((x) => x / m.lengthM) as unknown as Vec3;
        // Outward normals: out of the timber at each end.
        expect(vLen(m.endCuts.start.normal)).toBeCloseTo(1, 6);
        expect(vLen(m.endCuts.end.normal)).toBeCloseTo(1, 6);
        expect(vDot(m.endCuts.start.normal, axis)).toBeLessThanOrEqual(1e-9);
        expect(vDot(m.endCuts.end.normal, axis)).toBeGreaterThanOrEqual(-1e-9);
        // The clipped prism never inverts: all four long edges run forward.
        const verts = prismOf(m, p.jointSystem);
        for (let k = 0; k < 4; k++) {
          expect(vDot(vSub(verts[k + 4], verts[k]), axis), `${m.id} edge ${k}`).toBeGreaterThan(
            1e-3,
          );
        }
        // Cut-face corners lie exactly on their planes.
        for (const end of ['start', 'end'] as const) {
          const cut = m.endCuts[end];
          for (const v of endFace(verts, end)) {
            expect(Math.abs(vDot(vSub(v, cut.point), cut.normal))).toBeLessThan(1e-6);
          }
        }
      }
    });
  });

  it('hub system: struts are square-cut at a COMPUTED standoff — every end-face corner clears the connector envelope', () => {
    const g = generateGeometry({ ...base, jointSystem: 'hub' });
    const memberById = new Map(g.members.map((m) => [m.id, m]));
    const nodeById = new Map(g.nodes.map((n) => [n.id, n]));
    const envelopeR =
      JOINTS.hub.coreDiaMm / 2000 + JOINTS.hub.envelopeClearanceMm / 1000;
    const struts = g.pieces.filter((pc) => pc.kind === 'strut');
    expect(struts.length).toBeGreaterThan(0);
    for (const piece of struts) {
      const m = memberById.get(piece.memberIds[0])!;
      // Standoff floor = the core radius; the computed value prices the cut.
      expect(m.startTrimM).toBeGreaterThanOrEqual(JOINTS.hub.strutStandoffM - 1e-9);
      expect(m.endTrimM).toBeGreaterThanOrEqual(JOINTS.hub.strutStandoffM - 1e-9);
      expect(m.endCuts.start.kind).toBe('standoff');
      expect(m.endCuts.end.kind).toBe('standoff');
      expect(piece.lengthM).toBeCloseTo(m.lengthM - m.startTrimM - m.endTrimM, 9);
      expect(piece.lengthM).toBeGreaterThan(0.1); // still a millable piece
      // Timber never touches steel: every corner of the square end face sits
      // ≥ envelope radius from the node's normal axis.
      const verts = prismOf(m, 'hub');
      for (const end of ['start', 'end'] as const) {
        const node = nodeById.get(end === 'start' ? m.nodeStartId : m.nodeEndId)!;
        for (const v of endFace(verts, end)) {
          const rel = vSub(v, node.position);
          const axial = vDot(rel, node.normal);
          const radial = vLen(vSub(rel, [
            node.normal[0] * axial,
            node.normal[1] * axial,
            node.normal[2] * axial,
          ]));
          expect(radial, `${m.id} @ ${node.id}`).toBeGreaterThanOrEqual(envelopeR - 1e-6);
        }
      }
    }
  });

  it('lamella system: butting ends are skew-cut ON the continuous side face; through-nodes mitre with zero trim', () => {
    const g = generateGeometry({ ...base, jointSystem: 'lamella' });
    const memberById = new Map(g.members.map((m) => [m.id, m]));
    const nodeById = new Map(g.nodes.map((n) => [n.id, n]));
    const buttOffsetM =
      STOCK.lamella.thicknessMm / 2000 + JOINTS.lamella.assemblyGapMm / 1000;
    const blankFaceOffsetM =
      STOCK.blank.depthMm / 2000 + JOINTS.lamella.assemblyGapMm / 1000;
    let butts = 0;
    let blankFaces = 0;
    for (const m of g.members.filter((mm) => mm.type === 'lamella' || mm.type === 'foot')) {
      for (const end of ['start', 'end'] as const) {
        const cut = m.endCuts[end];
        const node = nodeById.get(end === 'start' ? m.nodeStartId : m.nodeEndId)!;
        const planeDist = Math.abs(vDot(vSub(cut.point, node.position), cut.normal));
        if (cut.kind === 'butt') {
          butts++;
          // The plane IS the continuous piece's side face: half thickness + gap.
          expect(planeDist).toBeCloseTo(buttOffsetM, 6);
        }
        if (cut.kind === 'blankFace') {
          blankFaces++;
          // The plane IS the ring blank's inner face: half depth + gap.
          expect(planeDist).toBeCloseTo(blankFaceOffsetM, 6);
        }
      }
    }
    expect(butts).toBeGreaterThan(0); // the weave exists
    expect(blankFaces).toBeGreaterThan(0); // the rings receive the lamellas
    // Two-bay through-nodes: both segments cut on the shared bisector plane.
    for (const piece of g.pieces.filter((pc) => pc.kind === 'lamella')) {
      const segs = piece.memberIds.map((id) => memberById.get(id)!);
      if (segs.length === 2) {
        expect(segs[0].endCuts.end.kind).toBe('mitre');
        expect(segs[1].endCuts.start.kind).toBe('mitre');
        expect(segs[0].endTrimM).toBeCloseTo(0, 9);
        expect(segs[1].startTrimM).toBeCloseTo(0, 9);
      }
      const developed = segs.reduce((s, m) => s + m.lengthM, 0);
      expect(piece.lengthM).toBeCloseTo(
        developed - segs[0].startTrimM - segs[segs.length - 1].endTrimM,
        9,
      );
    }
  });

  it('blanks close the ring: adjacent facets share one mitre plane at every ring node; splices keep the joint gap', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      const memberById = new Map(g.members.map((m) => [m.id, m]));
      for (const node of g.nodes) {
        const ringEnds = node.memberIds
          .map((id) => memberById.get(id)!)
          .filter((m) => m.type === 'eave' || m.type === 'crown')
          .map((m) => ({
            m,
            end: (m.nodeStartId === node.id ? 'start' : 'end') as 'start' | 'end',
          }));
        if (node.kind === 'splice') {
          // Mid-bay splice: square cuts, half the fish-plate joint gap each.
          for (const { m, end } of ringEnds) {
            expect(m.endCuts[end].kind).toBe('splice');
            expect(end === 'start' ? m.startTrimM : m.endTrimM).toBeCloseTo(
              JOINTS.spliceGapM / 2,
              9,
            );
          }
          continue;
        }
        if (ringEnds.length !== 2) continue;
        // Both facets cut on the SAME plane through the node (opposed
        // normals) — the faceted ring closes with no corner gap or overlap.
        const [a, b] = ringEnds;
        const ca = a.m.endCuts[a.end];
        const cb = b.m.endCuts[b.end];
        expect(ca.kind).toBe('mitre');
        expect(cb.kind).toBe('mitre');
        expect(vDot(ca.normal, cb.normal)).toBeCloseTo(-1, 6);
        expect(Math.abs(vDot(vSub(node.position, ca.point), ca.normal))).toBeLessThan(1e-9);
        expect(Math.abs(vDot(vSub(node.position, cb.point), cb.normal))).toBeLessThan(1e-9);
      }
    });
  });
});

describe('generateGeometry: joint systems', () => {
  it('hub system: every diagrid piece is a single straight strut', () => {
    const g = generateGeometry({ ...base, jointSystem: 'hub' });
    for (const piece of g.pieces.filter((pc) => pc.kind === 'strut')) {
      expect(piece.memberIds).toHaveLength(1);
      expect(piece.stock).toBe('linear');
    }
  });

  it('lamella system: the Zollinger weave holds at interior nodes (degrading only as documented)', () => {
    const g = generateGeometry({ ...base, jointSystem: 'lamella' });
    const interior = g.nodes.filter((n) => n.kind === 'interior');
    expect(interior.length).toBeGreaterThan(0);
    const memberPiece = new Map(g.members.map((m) => [m.id, m.pieceId]));
    const memberType = new Map(g.members.map((m) => [m.id, m.type]));
    let woven = 0;
    for (const n of interior) {
      const diagrid = n.memberIds.filter((id) => {
        const t = memberType.get(id);
        return t === 'lamella' || t === 'foot';
      });
      expect(diagrid).toHaveLength(4); // two families through every interior node
      const counts = new Map<string, number>();
      for (const id of diagrid) {
        const pid = memberPiece.get(id)!;
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
      if (counts.size === 3) {
        // The weave: one lamella passes through, two butt into it.
        expect([...counts.values()].filter((c) => c === 2)).toHaveLength(1);
        woven++;
      } else {
        // Sheet cut limit degraded this node (rooted foot zone) — allowed,
        // but ONLY as documented: no piece runs continuous here; joints.ts
        // splices it with a fish plate.
        expect(counts.size).toBe(4);
      }
    }
    expect(woven).toBeGreaterThan(interior.length * 0.6); // the weave is the norm
  });

  it('lamella pieces are cut from sheet; their spacing is capped tighter by the grammar', () => {
    const g = generateGeometry({ ...base, jointSystem: 'lamella', strutSpacingM: 9 });
    expect(g.params.strutSpacingM).toBeLessThanOrEqual(GRAMMAR.maxLamellaSpacingM + 1e-9);
    for (const piece of g.pieces.filter((pc) => pc.kind === 'lamella')) {
      expect(piece.stock).toBe('sheet');
      expect(piece.memberIds.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('canopyProfile: the elevation silhouette the diagrams draw', () => {
  it('runs edge (v=0) up to the crown (v=1) with the crown highest', () => {
    const prof = canopyProfile(base, base.apertureDeg);
    expect(prof.length).toBeGreaterThan(2);
    const edge = prof[0];
    const crown = prof[prof.length - 1];
    expect(crown.y).toBeGreaterThan(edge.y);
    expect(crown.radius).toBeLessThan(edge.radius); // narrows toward the crown
  });

  it('lifts the aperture side above its opposite side', () => {
    const front = canopyProfile(base, base.apertureDeg);
    const back = canopyProfile(base, base.apertureDeg + 180);
    // Eave (edge) height is higher on the aperture side.
    expect(front[0].y).toBeGreaterThanOrEqual(back[0].y - 1e-9);
  });
});
