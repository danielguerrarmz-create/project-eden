import { describe, it, expect } from 'vitest';
import { generateGeometry } from './geometry';
import { buildPieceSolid } from './pieceSolid';
import { runEngine } from './index';
import { GRAMMAR, STOCK } from '../data/config';
import type { DesignParams, JointSystem, Vec3 } from './types';

const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vDot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vLen = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  speciesId: 'clematis',
  year: 0,
};

/** In-plane extent of a ring: top corner to bottom corner on one face. */
const extentOf = (ring: Vec3[]) => vLen(vSub(ring[0], ring[3]));

describe('pieceSolid: every sheet piece is its own CNC-cut solid (no universal extrusions)', () => {
  for (const jointSystem of ['hub', 'lamella'] as JointSystem[]) {
    it(`${jointSystem}: rings live in the sheet plane, ends sit on the joint planes, profiles are true`, () => {
      const g = generateGeometry({ ...base, jointSystem });
      const memberById = new Map(g.members.map((m) => [m.id, m]));
      let checked = 0;
      let cambered = 0;
      for (const piece of g.pieces.filter((pc) => pc.stock === 'sheet')) {
        const segs = piece.memberIds.map((id) => memberById.get(id)!);
        const solid = buildPieceSolid(piece, segs);
        expect(solid, piece.id).not.toBeNull();
        checked++;

        // The solid is a flat piece: every ring corner sits exactly half the
        // sheet thickness off the piece plane.
        const n = piece.plane!.normal;
        const thM =
          (piece.kind === 'lamella' ? STOCK.lamella.thicknessMm : STOCK.blank.thicknessMm) / 1000;
        for (const ring of solid!.rings) {
          for (const c of ring) {
            expect(
              Math.abs(vDot(vSub(c, piece.plane!.origin), n)),
              piece.id,
            ).toBeCloseTo(thM / 2, 4);
          }
        }

        // End rings coincide with the SAME joint cut planes the prism model
        // resolved — curved solid and joint model agree at the joints.
        const startCut = segs[0].endCuts.start;
        const endCut = segs[segs.length - 1].endCuts.end;
        for (const c of solid!.rings[0]) {
          expect(Math.abs(vDot(vSub(c, startCut.point), startCut.normal))).toBeLessThan(1e-6);
        }
        for (const c of solid!.rings[solid!.rings.length - 1]) {
          expect(Math.abs(vDot(vSub(c, endCut.point), endCut.normal))).toBeLessThan(1e-6);
        }

        // Depth profile: lamellas are moment-shaped (full depth reached,
        // never outside [endDepth, depth]); blanks are constant bands.
        const interior = solid!.rings.slice(1, -1);
        if (interior.length >= 2) {
          const extents = interior.map(extentOf);
          if (piece.kind === 'lamella') {
            const midD = STOCK.lamella.depthMm / 1000;
            const endD = STOCK.lamella.endDepthMm / 1000;
            expect(Math.max(...extents)).toBeGreaterThan(midD * 0.95);
            for (const e of extents) {
              expect(e).toBeLessThanOrEqual(midD + 1e-3);
              expect(e).toBeGreaterThanOrEqual(endD - 1e-3);
            }
          } else {
            for (const e of extents) {
              expect(e).toBeCloseTo(piece.depthM, 3);
            }
          }
        }

        // Camber recorded for the BOM, genuinely present, and the profile's
        // band (depth + camber) always fits the sheet width — the REAL cap.
        expect(piece.camberM!).toBeGreaterThanOrEqual(0);
        expect(piece.depthM + piece.camberM!).toBeLessThanOrEqual(GRAMMAR.sheet.widthM - 0.05);
        if (piece.camberM! > 1e-4) cambered++;
      }
      expect(checked).toBeGreaterThan(0);
      // The shell is curved, so MOST pieces genuinely curve — if they all
      // came out straight the "universal extrusion" bug is back.
      expect(cambered).toBeGreaterThan(checked * 0.5);
    });
  }

  it('the BOM nests the curved profile: sheet cut items are wider than their section', () => {
    for (const jointSystem of ['hub', 'lamella'] as JointSystem[]) {
      const { components, nesting } = runEngine({ ...base, jointSystem });
      const sheetItems = components.items.filter((it) => it.stock === 'sheet');
      expect(sheetItems.length).toBeGreaterThan(0);
      let widened = 0;
      for (const it of sheetItems) {
        expect(it.widthM).toBeGreaterThanOrEqual(it.depthM - 1e-9);
        if (it.widthM > it.depthM + 1e-9) widened += it.count;
      }
      expect(widened).toBeGreaterThan(0); // camber really reaches the nesting
      // And the nested parts still physically fit the sheet.
      for (const sheet of nesting.sheets) {
        for (const part of sheet.parts) {
          expect(part.y + part.widthM).toBeLessThanOrEqual(nesting.sheetWidthM + 1e-9);
        }
      }
    }
  });
});
