import { describe, it, expect } from 'vitest';
import { generateGeometry, canopyProfile } from './geometry';
import { GRAMMAR, ENVELOPE } from '../data/config';
import type { DesignParams, FootStrategy, JointSystem } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  footStrategy: 'legs',
  speciesId: 'clematis',
  year: 0,
};

const SYSTEMS: JointSystem[] = ['hub', 'lamella'];
const FEET: FootStrategy[] = ['legs', 'sweep'];

/** Sweep a representative grid of designs × ALL system/feet combinations. */
function sweep(fn: (p: DesignParams) => void) {
  for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 1.5) {
    for (const r of [1.9, 2.2, 2.5]) {
      for (const s of [0.45, 0.6, 1.05]) {
        for (const ap of [0, 90, 210]) {
          for (const jointSystem of SYSTEMS) {
            for (const footStrategy of FEET) {
              fn({
                ...base,
                footprintM2: f,
                riseM: r,
                strutSpacingM: s,
                apertureDeg: ap,
                jointSystem,
                footStrategy,
              });
            }
          }
        }
      }
    }
  }
}

describe('generateGeometry: structural invariants across the whole range', () => {
  it('always reaches the ground exactly (no member dips below, some node at y=0)', () => {
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

describe('generateGeometry: joint systems', () => {
  it('hub system: every diagrid piece is a single straight strut', () => {
    const g = generateGeometry({ ...base, jointSystem: 'hub' });
    for (const piece of g.pieces.filter((pc) => pc.kind === 'strut')) {
      expect(piece.memberIds).toHaveLength(1);
      expect(piece.stock).toBe('linear');
    }
  });

  it('lamella system: at every interior node exactly ONE piece runs continuous (the Zollinger weave)', () => {
    for (const footStrategy of FEET) {
      const g = generateGeometry({ ...base, jointSystem: 'lamella', strutSpacingM: 0.55, footStrategy });
      const interior = g.nodes.filter((n) => n.kind === 'interior');
      expect(interior.length).toBeGreaterThan(0);
      const memberPiece = new Map(g.members.map((m) => [m.id, m.pieceId]));
      const memberType = new Map(g.members.map((m) => [m.id, m.type]));
      const pieceById = new Map(g.pieces.map((pc) => [pc.id, pc]));
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
          // Sheet cut limit degraded this node (foot sweep zone) — allowed,
          // but ONLY as documented: NO piece runs continuous here (four
          // distinct pieces butt), and joints.ts splices it with a fish
          // plate. The over-long family was split into single-bay pieces.
          expect(counts.size).toBe(4);
          const singleBay = [...counts.keys()].filter(
            (pid) => pieceById.get(pid)!.memberIds.length === 1,
          );
          expect(singleBay.length).toBeGreaterThanOrEqual(2);
        }
      }
      expect(woven).toBeGreaterThan(interior.length * 0.6); // the weave is the norm, not the exception
      if (footStrategy === 'legs') expect(woven).toBe(interior.length); // no sweep distortion → fully woven
    }
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

describe('generateGeometry: foot strategies', () => {
  it('legs: one leg piece per foot, dropping from an eave node to a ground node at y=0', () => {
    sweep((p) => {
      if (p.footStrategy !== 'legs') return;
      const g = generateGeometry(p);
      const legPieces = g.pieces.filter((pc) => pc.kind === 'leg');
      expect(legPieces).toHaveLength(g.feetCount);
      expect(g.groundScrewCount).toBe(g.feetCount);
      const byId = new Map(g.nodes.map((n) => [n.id, n]));
      for (const m of g.members.filter((mm) => mm.type === 'leg')) {
        expect(byId.get(m.nodeStartId)!.kind).toBe('eave');
        expect(byId.get(m.nodeEndId)!.kind).toBe('ground');
        expect(m.end[1]).toBe(0);
      }
    });
  });

  it('legs: the canopy surface itself stays clear of the lawn (no sweep morph)', () => {
    const g = generateGeometry({ ...base, footStrategy: 'legs' });
    const canopyNodes = g.nodes.filter((n) => n.kind !== 'ground');
    for (const n of canopyNodes) expect(n.position[1]).toBeGreaterThan(0.5);
  });

  it('sweep: the lattice itself touches down on grid ground nodes, no leg pieces', () => {
    sweep((p) => {
      if (p.footStrategy !== 'sweep') return;
      const g = generateGeometry(p);
      expect(g.pieces.filter((pc) => pc.kind === 'leg')).toHaveLength(0);
      const grounded = g.nodes.filter((n) => n.kind === 'ground');
      expect(grounded.length).toBeGreaterThanOrEqual(g.feetCount);
      for (const n of grounded) expect(n.id.startsWith('n-')).toBe(true); // grid nodes, not appended ones
    });
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
