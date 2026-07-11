/**
 * pieceSolid.ts — every SHEET piece as its true CNC-cut solid.
 *
 * The thesis made geometric: the CNC cuts whatever 2D drawing sits in the
 * piece's sheet plane, so the drawing is the true one and NO TWO PIECES
 * SHARE IT. Each piece's centreline is a smooth in-plane curve through its
 * node points AND the real surface waypoints between them (Member.arcMid) —
 * its camber is its location on the shell. Lamellas get a MOMENT-SHAPED
 * depth: full depth at the node where the bolt and peak bending live,
 * tapering to the end depth at the butt ends, top edge riding the shell.
 * Blanks sweep their plan curve at constant depth. Ends are clipped onto
 * the SAME joint cut planes the prism model resolves (§1a) — the curved
 * solid and the joint model agree exactly at the joints.
 *
 * The camber feeds the BOM: a curved profile occupies depth + camber of
 * sheet width, and nesting prices that, not a wishful rectangle.
 *
 * PURE. No three.js — returns cross-section rings the scene triangulates.
 */
import { STOCK } from '../data/config';
import { memberFrame } from './jointGeometry';
import type { EndCut, Member, Piece, Vec3 } from './types';
import { vAdd, vCross, vDot, vLen, vNorm, vScale, vSub } from './vec';

export interface PieceSolid {
  /** Cross-section rings along the curve — 4 corners each, ordered
   *  (top−, top+, bottom+, bottom−) across the sheet thickness. */
  rings: Vec3[][];
  /** Max in-plane deviation of the true curve off its chord (m). */
  camberM: number;
  /** Developed length along the clipped curve (m). */
  developedM: number;
}

/** Curve samples per waypoint interval (node→arcMid counts as one). */
const SUBDIV = 5;
const MM = 1 / 1000;

const catmull = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 => {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - 3 * c + d - a) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
};

export function buildPieceSolid(piece: Piece, segs: Member[]): PieceSolid | null {
  if (piece.stock !== 'sheet' || !piece.plane || segs.length === 0) return null;
  const n = vNorm(piece.plane.normal);
  const O = piece.plane.origin;
  const proj = (p: Vec3): Vec3 => vSub(p, vScale(n, vDot(vSub(p, O), n)));

  // Waypoints: node → true surface mid-bay point → node …, in the plane.
  const pts: Vec3[] = [proj(segs[0].start)];
  for (const s of segs) pts.push(proj(s.arcMid), proj(s.end));

  // Smooth in-plane curve through all waypoints (clamped Catmull-Rom).
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  let curve: Vec3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < SUBDIV; k++) {
      curve.push(catmull(at(i - 1), at(i), at(i + 1), at(i + 2), k / SUBDIV));
    }
  }
  curve.push(pts[pts.length - 1]);

  // Clip the curve to the piece's two end-cut planes (§1a — the SAME planes
  // the joint model resolved; outward normals point out of the timber).
  const startCut = segs[0].endCuts.start;
  const endCut = segs[segs.length - 1].endCuts.end;
  const sd = (p: Vec3, cut: EndCut) => vDot(vSub(p, cut.point), cut.normal);
  const lerp = (a: Vec3, b: Vec3, f: number): Vec3 => [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
  const clipAgainst = (samples: Vec3[], cut: EndCut): Vec3[] => {
    const out: Vec3[] = [];
    for (let i = 0; i < samples.length; i++) {
      const d = sd(samples[i], cut);
      if (d <= 1e-12) {
        if (out.length === 0 && i > 0) {
          const dPrev = sd(samples[i - 1], cut);
          out.push(lerp(samples[i - 1], samples[i], dPrev / (dPrev - d)));
        }
        out.push(samples[i]);
      } else if (out.length > 0) {
        const dPrev = sd(samples[i - 1], cut);
        out.push(lerp(samples[i - 1], samples[i], dPrev / (dPrev - d)));
        break;
      }
    }
    return out;
  };
  curve = clipAgainst(curve, startCut);
  curve = clipAgainst(curve, endCut);
  if (curve.length < 2) return null; // fully consumed by trims (degenerate)

  // Arc-length parameterisation of the clipped curve.
  const s: number[] = [0];
  for (let i = 1; i < curve.length; i++) s.push(s[i - 1] + vLen(vSub(curve[i], curve[i - 1])));
  const S = s[s.length - 1];

  // Section: thickness across the plane; in-plane extent by piece kind.
  const lamella = piece.kind === 'lamella';
  const thickness = (lamella ? STOCK.lamella.thicknessMm : STOCK.blank.thicknessMm) * MM;
  const midExtent = piece.depthM;
  const endExtent = lamella ? STOCK.lamella.endDepthMm * MM : piece.depthM;
  // Lamella: top edge rides the shell (top offset constant at midDepth/2),
  // the belly tapers. Blank: symmetric constant band.
  const topOff = midExtent / 2;
  const extentAt = (si: number) =>
    endExtent + (midExtent - endExtent) * Math.sin((Math.PI * si) / Math.max(S, 1e-9));

  // In-plane "up" — consistent sign along the piece, aligned to the frame.
  const refUp = lamella ? segs[0].normal : memberFrame(segs[0]).width;
  const rings: Vec3[][] = [];
  for (let i = 0; i < curve.length; i++) {
    const tan = vNorm(
      vSub(curve[Math.min(i + 1, curve.length - 1)], curve[Math.max(i - 1, 0)]),
    );
    let up = vNorm(vCross(n, tan));
    if (vDot(up, refUp) < 0) up = vScale(up, -1);
    const eTop = topOff;
    const eBot = topOff - extentAt(s[i]);
    const c = curve[i];
    rings.push([
      vAdd(vAdd(c, vScale(up, eTop)), vScale(n, -thickness / 2)),
      vAdd(vAdd(c, vScale(up, eTop)), vScale(n, thickness / 2)),
      vAdd(vAdd(c, vScale(up, eBot)), vScale(n, thickness / 2)),
      vAdd(vAdd(c, vScale(up, eBot)), vScale(n, -thickness / 2)),
    ]);
  }

  // End rings sit exactly ON their cut planes: project the terminal rings
  // onto the planes along the local tangent (same clip as memberPrism).
  const projectRing = (ring: Vec3[], cut: EndCut, tan: Vec3) => {
    const denom = vDot(tan, cut.normal);
    if (Math.abs(denom) < 0.05) return;
    for (let k = 0; k < 4; k++) {
      const t = vDot(vSub(cut.point, ring[k]), cut.normal) / denom;
      ring[k] = vAdd(ring[k], vScale(tan, t));
    }
  };
  projectRing(rings[0], startCut, vNorm(vSub(curve[1], curve[0])));
  projectRing(
    rings[rings.length - 1],
    endCut,
    vNorm(vSub(curve[curve.length - 1], curve[curve.length - 2])),
  );

  // Camber: max in-plane deviation of the curve off its chord.
  const chordDir = vNorm(vSub(curve[curve.length - 1], curve[0]));
  let camberM = 0;
  for (const p of curve) {
    const rel = vSub(p, curve[0]);
    const off = vSub(rel, vScale(chordDir, vDot(rel, chordDir)));
    camberM = Math.max(camberM, vLen(off));
  }

  return { rings, camberM, developedM: S };
}
