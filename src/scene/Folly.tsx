/**
 * Folly.tsx — the dry structure.
 *
 * Renders the engine's component model as timber members (one instanced mesh,
 * one draw call). Lattice struts are slender; eave blanks and foot sweeps are
 * up-gauged so the canopy reads as buildable pieces with a real hierarchy, not
 * a wireframe. This is the LOAD PATH and it is deliberately plain timber: the
 * living layer is drawn separately by the Growth overlay onto a conceptual
 * sacrificial armature, so nothing here ever depends on the plants.
 *
 * Moving the form sliders changes geometry.members, which visibly reshapes
 * this mesh; the member count keys the instancedMesh so it rebuilds cleanly.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Member } from '../engine/types';
import { useDesign } from '../state/store';
import { segmentMatrix } from './util';

const scratch = new THREE.Object3D();

/** Visual gauge per component type (× the base strut radius). */
const GAUGE: Record<Member['type'], number> = {
  lattice: 1,
  eave: 1.7,
  foot: 1.9,
};

export function Folly() {
  const members = useDesign((s) => s.outputs.geometry.members);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(
    () => members.map((m) => segmentMatrix(m.start, m.end, scratch, GAUGE[m.type])),
    [members],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  return (
    <instancedMesh
      key={members.length}
      ref={meshRef}
      args={[undefined, undefined, members.length]}
      castShadow
      receiveShadow
    >
      {/* Unit cylinder (r=0.022, h=1) — scaled per member by the instance matrix. */}
      <cylinderGeometry args={[0.022, 0.022, 1, 6]} />
      <meshStandardMaterial color="#9c8466" roughness={0.8} metalness={0} />
    </instancedMesh>
  );
}
