/**
 * Folly.tsx — the dry structure, drawn as WHAT GETS BUILT.
 *
 * No piping. Every member renders as its real rectangular timber section,
 * oriented by the engine's section frame (axis + surface normal, so struts
 * and lamellas stand on edge normal to the shell) and shortened by its
 * MILLED-END trims — a hub-system strut visibly stops at the hub core, a
 * butting lamella stops at the continuous piece's side face. Three instanced
 * meshes: planed C24 (linear struts), LVL (lamellas + eave/crown blanks),
 * steel (hub pucks). Grounded nodes get their shoe plates.
 *
 * The living layer is drawn separately by the Growth overlay onto a
 * conceptual sacrificial armature; nothing here ever depends on the plants.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { JOINTS, STOCK } from '../data/config';
import type { Member } from '../engine/types';
import { useDesign } from '../state/store';
import { connectorMatrix, memberMatrix } from './util';

const scratch = new THREE.Object3D();

const MM = 1 / 1000;
/** Section (width in-surface, depth along normal) per member type, metres. */
function sectionFor(type: Member['type'], lamellaSystem: boolean): [number, number] {
  switch (type) {
    case 'eave':
    case 'crown':
      // Blank bands: 180 deep in the tangent plane, 45 thick along the normal.
      return [STOCK.blank.depthMm * MM, STOCK.blank.thicknessMm * MM];
    case 'lamella':
      return [STOCK.lamella.thicknessMm * MM, STOCK.lamella.depthMm * MM];
    case 'lattice':
      return [STOCK.strut.widthMm * MM, STOCK.strut.depthMm * MM];
    case 'foot':
      return lamellaSystem
        ? [STOCK.lamella.thicknessMm * MM, STOCK.lamella.depthMm * MM]
        : [STOCK.strut.widthMm * MM, STOCK.strut.depthMm * MM];
  }
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
  const lamellaSystem = geometry.params.jointSystem === 'lamella';

  const c24Ref = useRef<THREE.InstancedMesh>(null);
  const lvlRef = useRef<THREE.InstancedMesh>(null);
  const hubsRef = useRef<THREE.InstancedMesh>(null);
  const shoesRef = useRef<THREE.InstancedMesh>(null);

  // Split members by STOCK, matching the BOM: planed C24 off the docking saw
  // vs LVL off the CNC sheets.
  const { c24Matrices, lvlMatrices } = useMemo(() => {
    const c24: THREE.Matrix4[] = [];
    const lvl: THREE.Matrix4[] = [];
    for (const m of geometry.members) {
      const [w, d] = sectionFor(m.type, lamellaSystem);
      const isLinear = !lamellaSystem && (m.type === 'lattice' || m.type === 'foot');
      (isLinear ? c24 : lvl).push(memberMatrix(m, w, d));
    }
    return { c24Matrices: c24, lvlMatrices: lvl };
  }, [geometry.members, lamellaSystem]);

  // Steel: hub pucks along each node normal (hub system only — the lamella
  // node is a single bolt, visually absorbed at this scale). Splice nodes are
  // plates, not hubs.
  const hubMatrices = useMemo(() => {
    if (lamellaSystem) return [];
    return geometry.nodes
      .filter((n) => n.kind !== 'splice')
      .map((n) =>
        connectorMatrix(n.position, n.normal, JOINTS.hub.coreDiaMm * MM, 0.06, scratch),
      );
  }, [geometry.nodes, lamellaSystem]);

  // Ground shoes: a base plate over the driven screw at every rooted node.
  const shoeMatrices = useMemo(
    () =>
      geometry.nodes
        .filter((n) => n.kind === 'ground')
        .map((n) => connectorMatrix(n.position, [0, 1, 0], 0.2, 0.012, scratch)),
    [geometry.nodes],
  );

  useInstanceMatrices(c24Ref, c24Matrices);
  useInstanceMatrices(lvlRef, lvlMatrices);
  useInstanceMatrices(hubsRef, hubMatrices);
  useInstanceMatrices(shoesRef, shoeMatrices);

  return (
    <>
      {c24Matrices.length > 0 && (
        <instancedMesh
          key={`c24-${c24Matrices.length}`}
          ref={c24Ref}
          args={[undefined, undefined, c24Matrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          {/* Planed C24 spruce/larch, UC3 treated. */}
          <meshStandardMaterial color="#9c8466" roughness={0.8} metalness={0} />
        </instancedMesh>
      )}

      {lvlMatrices.length > 0 && (
        <instancedMesh
          key={`lvl-${lvlMatrices.length}`}
          ref={lvlRef}
          args={[undefined, undefined, lvlMatrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          {/* Spruce LVL, CNC-profiled — paler than the sawn stock. */}
          <meshStandardMaterial color="#c2ab84" roughness={0.75} metalness={0} />
        </instancedMesh>
      )}

      {hubMatrices.length > 0 && (
        <instancedMesh
          key={`hubs-${hubMatrices.length}`}
          ref={hubsRef}
          args={[undefined, undefined, hubMatrices.length]}
          castShadow
        >
          {/* Hub core puck, axis along the node normal (unit Ø1 × h1, scaled). */}
          <cylinderGeometry args={[0.5, 0.5, 1, 12]} />
          <meshStandardMaterial color="#878c93" roughness={0.45} metalness={0.7} />
        </instancedMesh>
      )}

      {shoeMatrices.length > 0 && (
        <instancedMesh
          key={`shoes-${shoeMatrices.length}`}
          ref={shoesRef}
          args={[undefined, undefined, shoeMatrices.length]}
          receiveShadow
        >
          <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
          <meshStandardMaterial color="#6f747b" roughness={0.5} metalness={0.65} />
        </instancedMesh>
      )}
    </>
  );
}
