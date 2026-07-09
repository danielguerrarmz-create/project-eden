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
import type { Vec3 } from '../engine/types';
import { useDesign } from '../state/store';
import { buildSteel } from './connectors';

// Prism corners come ordered [start 0..3, end 0..3] around the section.
const FACES: [number, number, number, number][] = [
  [0, 1, 2, 3], // start cut face
  [4, 5, 6, 7], // end cut face
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];

/** Merge clipped member prisms into one flat-shaded BufferGeometry. */
function prismsToGeometry(prisms: Vec3[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  for (const v of prisms) {
    const centroid: [number, number, number] = [0, 0, 0];
    for (const p of v) {
      centroid[0] += p[0] / 8;
      centroid[1] += p[1] / 8;
      centroid[2] += p[2] / 8;
    }
    for (const face of FACES) {
      const fc: [number, number, number] = [0, 0, 0];
      for (const i of face) {
        fc[0] += v[i][0] / 4;
        fc[1] += v[i][1] / 4;
        fc[2] += v[i][2] / 4;
      }
      // Planar-quad normal from the diagonals, oriented outward (away from
      // the prism centroid), winding fixed to match.
      let [a, b, c, d] = face;
      let n = cross(sub(v[c], v[a]), sub(v[d], v[b]));
      if (dot(n, sub(fc, centroid)) < 0) {
        [b, d] = [d, b];
        n = [-n[0], -n[1], -n[2]];
      }
      const l = Math.hypot(n[0], n[1], n[2]) || 1e-9;
      const un: Vec3 = [n[0] / l, n[1] / l, n[2] / l];
      for (const tri of [
        [a, b, c],
        [a, c, d],
      ]) {
        for (const i of tri) {
          positions.push(v[i][0], v[i][1], v[i][2]);
          normals.push(un[0], un[1], un[2]);
        }
      }
    }
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
  const lamellaSystem = system === 'lamella';

  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const cylsRef = useRef<THREE.InstancedMesh>(null);

  // Timber split by STOCK, matching the BOM: planed C24 off the docking saw
  // vs LVL off the CNC sheets. Each member is its plane-clipped solid.
  const { c24Geo, lvlGeo, c24Count, lvlCount } = useMemo(() => {
    const c24: Vec3[][] = [];
    const lvl: Vec3[][] = [];
    for (const m of geometry.members) {
      const { widthM, depthM } = sectionFor(m.type, system);
      const isLinear = !lamellaSystem && (m.type === 'lattice' || m.type === 'foot');
      (isLinear ? c24 : lvl).push(memberPrism(m, widthM, depthM));
    }
    return {
      c24Geo: prismsToGeometry(c24),
      lvlGeo: prismsToGeometry(lvl),
      c24Count: c24.length,
      lvlCount: lvl.length,
    };
  }, [geometry.members, system, lamellaSystem]);
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
          {/* Planed C24 spruce/larch, UC3 treated. */}
          <meshStandardMaterial color="#9c8466" roughness={0.8} metalness={0} />
        </mesh>
      )}

      {lvlCount > 0 && (
        <mesh geometry={lvlGeo} castShadow receiveShadow>
          {/* Spruce LVL, CNC-profiled — paler than the sawn stock. */}
          <meshStandardMaterial color="#c2ab84" roughness={0.75} metalness={0} />
        </mesh>
      )}

      {steel.boxes.length > 0 && (
        <instancedMesh
          key={`steel-boxes-${steel.boxes.length}`}
          ref={boxesRef}
          args={[undefined, undefined, steel.boxes.length]}
          castShadow
        >
          {/* Fins, clamp plates, base plates, fish plates — S355 HDG. */}
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#878c93" roughness={0.45} metalness={0.7} />
        </instancedMesh>
      )}

      {steel.cylinders.length > 0 && (
        <instancedMesh
          key={`steel-cyls-${steel.cylinders.length}`}
          ref={cylsRef}
          args={[undefined, undefined, steel.cylinders.length]}
          castShadow
        >
          {/* Core drums + bolts (unit Ø1 × h1, scaled per instance). */}
          <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
          <meshStandardMaterial color="#878c93" roughness={0.45} metalness={0.7} />
        </instancedMesh>
      )}
    </>
  );
}
