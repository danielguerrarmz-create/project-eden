/**
 * Eden.tsx — the dry structure.
 *
 * Renders the engine's structural members as timber cylinders (one instanced
 * mesh, one draw call). This is the LOAD PATH and it is deliberately plain
 * timber: the living layer is drawn separately by the Growth overlay onto a
 * conceptual sacrificial armature, so nothing here ever depends on the plants
 * (stress-test §12: structure stays dry).
 *
 * Moving the form sliders changes geometry.members, which visibly reshapes this
 * mesh; the member count keys the instancedMesh so it rebuilds cleanly.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDesign } from '../state/store';
import { segmentMatrix } from './util';

const scratch = new THREE.Object3D();

export function Eden() {
  const members = useDesign((s) => s.outputs.geometry.members);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(
    () => members.map((m) => segmentMatrix(m.start, m.end, scratch)),
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
      {/* Unit cylinder (r=0.03, h=1) — scaled per member by the instance matrix. */}
      <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
      <meshStandardMaterial color="#9c8466" roughness={0.8} metalness={0} />
    </instancedMesh>
  );
}
