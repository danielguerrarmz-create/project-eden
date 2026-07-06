/**
 * Folly.tsx — the dry structure.
 *
 * Renders the engine's component model as timber members (one instanced mesh,
 * one draw call) plus — for the hub joint system — one instanced mesh of
 * steel node connectors, so the thing on screen shows its joints the way the
 * BOM counts them. Lattice struts are slender; lamellas read deeper; eave
 * blanks, legs and foot sweeps are up-gauged so the canopy reads as buildable
 * pieces with a real hierarchy, not a wireframe. This is the LOAD PATH and it
 * is deliberately plain timber: the living layer is drawn separately by the
 * Growth overlay onto a conceptual sacrificial armature, so nothing here ever
 * depends on the plants.
 *
 * Moving the sliders (or switching joint system / foot strategy) changes
 * geometry.members + geometry.nodes, which visibly reshapes these meshes; the
 * counts key the instancedMeshes so they rebuild cleanly.
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
  lamella: 1.5,
  eave: 1.7,
  crown: 1.6,
  foot: 1.9,
  leg: 2.2,
};

export function Folly() {
  const members = useDesign((s) => s.outputs.geometry.members);
  const nodes = useDesign((s) => s.outputs.geometry.nodes);
  const jointSystem = useDesign((s) => s.params.jointSystem);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hubsRef = useRef<THREE.InstancedMesh>(null);

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

  const showHubs = jointSystem === 'hub';
  useLayoutEffect(() => {
    const mesh = hubsRef.current;
    if (!mesh || !showHubs) return;
    nodes.forEach((n, i) => {
      scratch.position.set(...n.position);
      scratch.quaternion.identity();
      scratch.scale.setScalar(1);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [nodes, showHubs]);

  return (
    <>
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

      {/* Steel node hubs — the joint system made visible (one per graph node). */}
      {showHubs && (
        <instancedMesh key={`hubs-${nodes.length}`} ref={hubsRef} args={[undefined, undefined, nodes.length]} castShadow>
          <sphereGeometry args={[0.048, 10, 8]} />
          <meshStandardMaterial color="#8d9299" roughness={0.45} metalness={0.7} />
        </instancedMesh>
      )}
    </>
  );
}
