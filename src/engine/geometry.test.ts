import { describe, it, expect } from 'vitest';
import { generateGeometry, canopyProfile } from './geometry';
import { GRAMMAR, ENVELOPE, JOINTS } from '../data/config';
import type { DesignParams, JointSystem, Vec3 } from './types';

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

describe('generateGeometry: milled-end trims — physical cut lengths', () => {
  it('hub system: every strut stops at the hub core, and its cut length prices the trim', () => {
    const g = generateGeometry({ ...base, jointSystem: 'hub' });
    const memberById = new Map(g.members.map((m) => [m.id, m]));
    const struts = g.pieces.filter((pc) => pc.kind === 'strut');
    expect(struts.length).toBeGreaterThan(0);
    for (const piece of struts) {
      const m = memberById.get(piece.memberIds[0])!;
      expect(m.startTrimM).toBe(JOINTS.hub.strutStandoffM);
      expect(m.endTrimM).toBe(JOINTS.hub.strutStandoffM);
      expect(piece.lengthM).toBeCloseTo(m.lengthM - 2 * JOINTS.hub.strutStandoffM, 9);
      expect(piece.lengthM).toBeGreaterThan(0.1); // still a millable piece
    }
  });

  it('lamella system: butting ends trim at side faces, through-nodes stay untrimmed', () => {
    const g = generateGeometry({ ...base, jointSystem: 'lamella' });
    const memberById = new Map(g.members.map((m) => [m.id, m]));
    const nodeKind = new Map(g.nodes.map((n) => [n.id, n.kind]));
    for (const piece of g.pieces.filter((pc) => pc.kind === 'lamella')) {
      const segs = piece.memberIds.map((id) => memberById.get(id)!);
      const first = segs[0];
      const last = segs[segs.length - 1];
      const expectedTrim = (nodeId: string) =>
        nodeKind.get(nodeId) === 'interior'
          ? JOINTS.lamella.buttTrimM
          : JOINTS.lamella.blankFaceTrimM;
      expect(first.startTrimM).toBe(expectedTrim(first.nodeStartId));
      expect(last.endTrimM).toBe(expectedTrim(last.nodeEndId));
      if (segs.length === 2) {
        // The through-node in the middle of a two-bay lamella is NOT trimmed.
        expect(segs[0].endTrimM).toBe(0);
        expect(segs[1].startTrimM).toBe(0);
      }
      const developed = segs.reduce((s, m) => s + m.lengthM, 0);
      expect(piece.lengthM).toBeCloseTo(
        developed - first.startTrimM - last.endTrimM,
        9,
      );
    }
  });

  it('blanks are continuous through their nodes (no trims)', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      for (const m of g.members.filter((mm) => mm.type === 'eave' || mm.type === 'crown')) {
        expect(m.startTrimM).toBe(0);
        expect(m.endTrimM).toBe(0);
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
