/**
 * connectors.ts — the STEEL of the joints, derived from the node graph.
 *
 * Every part here is a real component of the joint system (FABRICATION.md
 * §2–§5), placed from the same member frames and cut planes the timber is
 * cut on — never sprinkled decoration:
 *
 *   hub system:  core drum (interior nodes) / clamp-plate pairs gripping the
 *                blank (ring nodes) / base plates (ground shoes); one fin per
 *                arriving strut spanning connector → slot; 2 bolts per strut
 *                end at the FABRICATION.md hole insets.
 *   lamella:     ONE through-bolt per woven interior node, aligned to the
 *                butt cut's plane normal (the bolt axis IS that normal);
 *                fish-plate pairs at split-weave + mid-bay splice nodes;
 *                bent-plate shoes at grounded nodes.
 *
 * Output is two instanced-matrix pools: BOXES (plates, fins) and CYLINDERS
 * (drums, bolts) — each matrix orients + scales a unit primitive.
 */
import * as THREE from 'three';
import { JOINTS, STOCK } from '../data/config';
import { memberFrame } from '../engine/jointGeometry';
import type { CanopyGeometry, Member, Vec3 } from '../engine/types';

const MM = 1 / 1000;
const UP = new THREE.Vector3(0, 1, 0);
const scratch = new THREE.Object3D();

export interface SteelParts {
  /** Unit-box instances: fins, clamp plates, base plates, fish plates. */
  boxes: THREE.Matrix4[];
  /** Unit-cylinder (Ø1 × h1, axis Y) instances: core drums, bolts. */
  cylinders: THREE.Matrix4[];
}

/** Oriented box: basis columns = the three edge directions × dimensions. */
function boxMat(center: Vec3, x: Vec3, xLen: number, y: Vec3, yLen: number, zLen: number): THREE.Matrix4 {
  const xv = new THREE.Vector3(...x);
  const yv = new THREE.Vector3(...y);
  const zv = new THREE.Vector3().crossVectors(xv, yv).normalize();
  const mat = new THREE.Matrix4();
  mat.makeBasis(xv.multiplyScalar(xLen), yv.multiplyScalar(yLen), zv.multiplyScalar(zLen));
  mat.setPosition(new THREE.Vector3(...center));
  return mat;
}

/** Cylinder of Ø `diaM` × `lenM`, axis along `dir`, centred at `center`. */
function cylMat(center: Vec3, dir: Vec3, diaM: number, lenM: number): THREE.Matrix4 {
  scratch.position.set(...center);
  scratch.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize());
  scratch.scale.set(diaM, lenM, diaM);
  scratch.updateMatrix();
  return scratch.matrix.clone();
}

const v3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  norm: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1e-9;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

const BLANK_THICK_M = STOCK.blank.thicknessMm * MM;
const LAMELLA_THICK_M = STOCK.lamella.thicknessMm * MM;
const STRUT_WIDTH_M = STOCK.strut.widthMm * MM;

export function buildSteel(g: CanopyGeometry): SteelParts {
  const lamella = g.params.jointSystem === 'lamella';
  const boxes: THREE.Matrix4[] = [];
  const cylinders: THREE.Matrix4[] = [];
  const memberById = new Map(g.members.map((m) => [m.id, m]));

  /** Incident ends: member + the unit dir from this node into it + its trim. */
  const endsAt = (nodeId: string, ids: string[]) =>
    ids.map((id) => {
      const m = memberById.get(id)!;
      const f = memberFrame(m);
      const atStart = m.nodeStartId === nodeId;
      return {
        m,
        f,
        u: atStart ? f.axis : v3.scale(f.axis, -1),
        trim: atStart ? m.startTrimM : m.endTrimM,
        cut: atStart ? m.endCuts.start : m.endCuts.end,
      };
    });

  const isRing = (m: Member) => m.type === 'eave' || m.type === 'crown';

  for (const node of g.nodes) {
    const P = node.position;
    const ends = endsAt(node.id, node.memberIds);
    const ringEnds = ends.filter((e) => isRing(e.m));
    const strutEnds = ends.filter((e) => !isRing(e.m));

    // Ring frame (tangent + in-surface width) where a blank runs through.
    let ringT: Vec3 | null = null;
    let ringW: Vec3 | null = null;
    if (ringEnds.length >= 2) {
      ringT = v3.norm(v3.sub(ringEnds[0].u, ringEnds[1].u));
      ringW = v3.norm(v3.cross(ringT, node.normal));
    }

    // --- MID-BAY SPLICES (both systems): fish-plate pair on the blank faces.
    if (node.kind === 'splice') {
      if (ringT) {
        for (const s of [-1, 1]) {
          boxes.push(
            boxMat(
              v3.add(P, v3.scale(node.normal, s * (BLANK_THICK_M / 2 + 0.004))),
              ringT, 0.24,
              ringW!, 0.12,
              0.004,
            ),
          );
        }
      }
      continue;
    }

    if (!lamella) {
      // ================= HUB SYSTEM =================
      // Connector body by node kind (FABRICATION.md §2 variants).
      if (node.kind === 'interior') {
        cylinders.push(
          cylMat(P, node.normal, JOINTS.hub.coreDiaMm * MM, JOINTS.hub.coreHeightMm * MM),
        );
      } else if (node.kind === 'ground') {
        // Ground shoe: 200×200×8 base plate over the driven screw.
        boxes.push(boxMat([P[0], 0.004, P[2]], [1, 0, 0], 0.2, [0, 1, 0], 0.008, 0.2));
      } else if (ringT && ringW) {
        // Crown/eave hub: paired flanges gripping the blank band.
        for (const s of [-1, 1]) {
          boxes.push(
            boxMat(
              v3.add(P, v3.scale(node.normal, s * (BLANK_THICK_M / 2 + 0.004))),
              ringT, 0.12,
              ringW, 0.12,
              0.006,
            ),
          );
        }
      }

      // One fin per arriving strut: connector body → 105 mm into the slot.
      // At ring nodes the fin starts at the blank's inner face (it welds to
      // the flange assembly there), elsewhere inside the core drum.
      const slotM = JOINTS.hub.slotMm.depth * MM;
      const finStart = node.kind === 'crown' || node.kind === 'eave' ? 0.075 : 0.04;
      for (const e of strutEnds) {
        const finEnd = e.trim + slotM;
        if (finEnd <= finStart + 0.01) continue;
        const mid = v3.add(P, v3.scale(e.u, (finStart + finEnd) / 2));
        boxes.push(
          boxMat(
            mid,
            e.u, finEnd - finStart,
            e.f.depth, JOINTS.hub.finHeightMm * MM,
            JOINTS.hub.finThicknessMm * MM,
          ),
        );
        // The 2 through-bolts per strut end, at the §2 hole insets.
        for (const insetMm of JOINTS.hub.boltInsetsMm) {
          cylinders.push(
            cylMat(
              v3.add(P, v3.scale(e.u, e.trim + insetMm * MM)),
              e.f.width,
              JOINTS.hub.boltDiaMm * MM,
              STRUT_WIDTH_M + 0.024,
            ),
          );
        }
      }
    } else {
      // ================= LAMELLA SYSTEM =================
      if (node.kind === 'ground') {
        // Bent-plate shoe: base plate over the screw.
        boxes.push(boxMat([P[0], 0.003, P[2]], [1, 0, 0], 0.15, [0, 1, 0], 0.006, 0.15));
      }
      if (node.kind === 'interior') {
        const butt = strutEnds.find((e) => e.cut.kind === 'butt');
        if (butt) {
          // The Zollinger joint: ONE through-bolt along the butt plane normal
          // (continuous piece mid-hole + both butting ends' slotted holes).
          cylinders.push(
            cylMat(
              P,
              butt.cut.normal,
              JOINTS.lamella.boltDiaMm * MM,
              LAMELLA_THICK_M * 3 + 0.03,
            ),
          );
        } else {
          // Split-weave node: fish-plate pair sandwiching the spliced family.
          const spliced = strutEnds.filter((e) => e.cut.kind === 'splice');
          if (spliced.length === 2) {
            const t = v3.norm(v3.sub(spliced[0].u, spliced[1].u));
            const w = v3.norm(v3.cross(t, spliced[0].f.depth));
            for (const s of [-1, 1]) {
              boxes.push(
                boxMat(
                  v3.add(P, v3.scale(w, s * (LAMELLA_THICK_M / 2 + 0.003))),
                  t, 0.24,
                  spliced[0].f.depth, 0.1,
                  0.004,
                ),
              );
            }
          }
        }
      }
    }
  }

  return { boxes, cylinders };
}
