/**
 * Folly.tsx — the dry structure, drawn as WHAT GETS BUILT.
 *
 * Members are not boxes: each renders as its rectangular section CLIPPED BY
 * ITS TWO END-CUT PLANES (engine memberPrism, FABRICATION.md §1a). A hub
 * strut stops square at its computed standoff off the steel core; a butting
 * lamella's skew end sits ON the continuous piece's side face; blank facets
 * close on shared mitre planes — the joints you see are the joints the saw
 * and CNC make. Steel comes from connectors.ts (core drums, fins, bolt
 * pairs, clamp plates, ground shoes, fish plates), one instanced mesh for
 * plates and one for cylinders.
 *
 * The living layer is drawn separately by the Growth overlay onto a
 * conceptual sacrificial armature; nothing here ever depends on the plants.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { memberPrism, sectionFor } from '../engine/jointGeometry';
import { buildPieceSolid } from '../engine/pieceSolid';
import type { Vec3 } from '../engine/types';
import { useDesign } from '../state/store';
import { buildSteel } from './connectors';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Flat-shaded quad emitter: winds (a,b,c,d) so the face points along `out`. */
function emitQuad(
  positions: number[],
  normals: number[],
  va: Vec3,
  vb: Vec3,
  vc: Vec3,
  vd: Vec3,
  out: Vec3,
) {
  let n = cross(sub(vc, va), sub(vd, vb)); // planar-quad normal (diagonals)
  let [a, b, c, d] = [va, vb, vc, vd];
  if (dot(n, out) < 0) {
    [b, d] = [d, b];
    n = [-n[0], -n[1], -n[2]];
  }
  const l = Math.hypot(n[0], n[1], n[2]) || 1e-9;
  const un: Vec3 = [n[0] / l, n[1] / l, n[2] / l];
  for (const tri of [
    [a, b, c],
    [a, c, d],
  ]) {
    for (const p of tri) {
      positions.push(p[0], p[1], p[2]);
      normals.push(un[0], un[1], un[2]);
    }
  }
}

const mid4 = (a: Vec3, b: Vec3, c: Vec3, d: Vec3): Vec3 => [
  (a[0] + b[0] + c[0] + d[0]) / 4,
  (a[1] + b[1] + c[1] + d[1]) / 4,
  (a[2] + b[2] + c[2] + d[2]) / 4,
];

// Prism corners come ordered [start 0..3, end 0..3] around the section.
const FACES: [number, number, number, number][] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];

/** Merge clipped member prisms into one flat-shaded BufferGeometry. */
function prismsToGeometry(prisms: Vec3[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const v of prisms) {
    const centre: Vec3 = [
      v.reduce((s, p) => s + p[0], 0) / 8,
      v.reduce((s, p) => s + p[1], 0) / 8,
      v.reduce((s, p) => s + p[2], 0) / 8,
    ];
    for (const [a, b, c, d] of FACES) {
      const fc = mid4(v[a], v[b], v[c], v[d]);
      emitQuad(positions, normals, v[a], v[b], v[c], v[d], sub(fc, centre));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

/**
 * Merge curved piece solids (pieceSolid.ts rings) into one BufferGeometry:
 * side quads between consecutive rings + the two end caps. Each sheet piece
 * renders as its true CNC-cut curve — camber, fish-belly taper and all.
 */
function ringsToGeometry(solids: Vec3[][][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const rings of solids) {
    for (let i = 0; i + 1 < rings.length; i++) {
      const r0 = rings[i];
      const r1 = rings[i + 1];
      const centre = mid4(
        mid4(r0[0], r0[1], r0[2], r0[3]),
        mid4(r1[0], r1[1], r1[2], r1[3]),
        mid4(r0[0], r0[1], r0[2], r0[3]),
        mid4(r1[0], r1[1], r1[2], r1[3]),
      );
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        const fc = mid4(r0[k], r0[k2], r1[k2], r1[k]);
        emitQuad(positions, normals, r0[k], r0[k2], r1[k2], r1[k], sub(fc, centre));
      }
    }
    // End caps, facing away from the body of the piece.
    const first = rings[0];
    const second = rings[1];
    emitQuad(
      positions, normals, first[0], first[1], first[2], first[3],
      sub(mid4(first[0], first[1], first[2], first[3]), mid4(second[0], second[1], second[2], second[3])),
    );
    const last = rings[rings.length - 1];
    const prev = rings[rings.length - 2];
    emitQuad(
      positions, normals, last[0], last[1], last[2], last[3],
      sub(mid4(last[0], last[1], last[2], last[3]), mid4(prev[0], prev[1], prev[2], prev[3])),
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function useInstanceMatrices(
  ref: React.RefObject<THREE.InstancedMesh>,
  matrices: THREE.Matrix4[],
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, matrices]);
}

export function Folly() {
  const geometry = useDesign((s) => s.outputs.geometry);
  const system = geometry.params.jointSystem;

  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const cylsRef = useRef<THREE.InstancedMesh>(null);

  // Timber split by STOCK, matching the BOM: LINEAR pieces (planed C24 off
  // the docking saw) draw as straight plane-clipped prisms — that IS their
  // fabrication; SHEET pieces (CNC LVL) draw as their true cut solids —
  // cambered, fish-bellied, no two alike (pieceSolid.ts).
  const { c24Geo, lvlGeo, c24Count, lvlCount } = useMemo(() => {
    const prisms: Vec3[][] = [];
    const solids: Vec3[][][] = [];
    const memberById = new Map(geometry.members.map((m) => [m.id, m]));
    for (const piece of geometry.pieces) {
      if (piece.stock === 'sheet') {
        const solid = buildPieceSolid(
          piece,
          piece.memberIds.map((id) => memberById.get(id)!),
        );
        if (solid) solids.push(solid.rings);
      } else {
        for (const id of piece.memberIds) {
          const m = memberById.get(id)!;
          const { widthM, depthM } = sectionFor(m.type, system);
          prisms.push(memberPrism(m, widthM, depthM));
        }
      }
    }
    return {
      c24Geo: prismsToGeometry(prisms),
      lvlGeo: ringsToGeometry(solids),
      c24Count: prisms.length,
      lvlCount: solids.length,
    };
  }, [geometry.pieces, geometry.members, system]);
  useEffect(
    () => () => {
      c24Geo.dispose();
      lvlGeo.dispose();
    },
    [c24Geo, lvlGeo],
  );

  // The steel of the joints (connectors.ts) — plates + cylinders.
  const steel = useMemo(() => buildSteel(geometry), [geometry]);

  useInstanceMatrices(boxesRef, steel.boxes);
  useInstanceMatrices(cylsRef, steel.cylinders);

  return (
    <>
      {c24Count > 0 && (
        <mesh geometry={c24Geo} castShadow receiveShadow>
          {/* Planed C24 spruce/larch, UC3 treated — pale honey, not muddy. */}
          <meshStandardMaterial color="#b39672" roughness={0.72} metalness={0} />
        </mesh>
      )}

      {lvlCount > 0 && (
        <mesh geometry={lvlGeo} castShadow receiveShadow>
          {/* Spruce LVL, CNC-profiled — paler + yellower than sawn stock. */}
          <meshStandardMaterial color="#d2bd94" roughness={0.68} metalness={0} />
        </mesh>
      )}

      {steel.boxes.length > 0 && (
        <instancedMesh
          key={`steel-boxes-${steel.boxes.length}`}
          ref={boxesRef}
          args={[undefined, undefined, steel.boxes.length]}
          castShadow
        >
          {/* Fins, clamp plates, base plates, fish plates — hot-dip galv:
              light matte zinc grey, QUIET against the timber. */}
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#aab0b4" roughness={0.5} metalness={0.45} />
        </instancedMesh>
      )}

      {steel.cylinders.length > 0 && (
        <instancedMesh
          key={`steel-cyls-${steel.cylinders.length}`}
          ref={cylsRef}
          args={[undefined, undefined, steel.cylinders.length]}
          castShadow
        >
          {/* Core discs + bolts (unit Ø1 × h1, scaled per instance). */}
          <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
          <meshStandardMaterial color="#aab0b4" roughness={0.5} metalness={0.45} />
        </instancedMesh>
      )}
    </>
  );
}
