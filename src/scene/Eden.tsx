/**
 * Eden.tsx — the dry structure.
 *
 * Renders the engine's structural members as thin ink cylinders (one instanced
 * mesh, one draw call). This is the LOAD PATH and it is deliberately plain: the
 * living layer is drawn separately by the Growth overlay onto a conceptual
 * sacrificial armature, so nothing here ever depends on the plants (SE §12).
 *
 * Motion (spec §7): on entering Step 2 and on a size-preset change, the members
 * build upward from the ground (a per-member stagger keyed on height v) over
 * ~700ms. The continuous openness slider changes member count but must NOT
 * re-trigger the build, so we draw into a fixed-capacity instanced mesh (setting
 * `count` per frame) instead of re-keying on members.length, which would remount
 * and replay the animation. Reduced motion snaps to the fully built state.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { segmentMatrix } from './util';
import type { Vec3 } from '../engine/types';

const scratch = new THREE.Object3D();
const CAPACITY = 260; // > max members at full density (~217)
const BUILD_SECONDS = 0.7;
const STAGGER_WINDOW = 0.55; // fraction of the build each member takes to fill

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export function Eden() {
  const members = useDesign((s) => s.outputs.geometry.members);
  const step = useDesign((s) => s.step);
  const sizePreset = useDesign((s) => s.sizePreset);
  const reduced = useReducedMotion();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const progress = useRef(!reduced && step === 2 ? 0 : 1);

  const segs = useMemo(
    () => members.map((m) => ({ start: m.start, end: m.end, v: m.v })),
    [members],
  );

  const write = (p: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = segs.length;
    for (let i = 0; i < segs.length; i++) {
      const { start, end, v } = segs[i];
      const delay = v * (1 - STAGGER_WINDOW);
      const tm = smoothstep((p - delay) / STAGGER_WINDOW);
      const grown: Vec3 = [
        start[0] + (end[0] - start[0]) * tm,
        start[1] + (end[1] - start[1]) * tm,
        start[2] + (end[2] - start[2]) * tm,
      ];
      mesh.setMatrixAt(i, segmentMatrix(start, grown, scratch));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  // Geometry-only changes (e.g. the openness slider) redraw at the CURRENT
  // progress: they update the shape without resetting or replaying the build.
  useLayoutEffect(() => {
    write(progress.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs]);

  // Discrete triggers reset and replay the build; anything but Step 2 is settled.
  // A layout effect (before paint) so a size change never flashes the built form
  // before collapsing to rebuild. Runs after the segs effect above, so it wins.
  useLayoutEffect(() => {
    progress.current = !reduced && step === 2 ? 0 : 1;
    write(progress.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sizePreset, reduced]);

  useFrame((_, dt) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + dt / BUILD_SECONDS);
    write(progress.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CAPACITY]}
      castShadow
      receiveShadow
    >
      {/* Unit cylinder (r=0.024, h=1), scaled per member by the instance matrix. */}
      <cylinderGeometry args={[0.024, 0.024, 1, 6]} />
      <meshStandardMaterial color="#17160F" roughness={0.62} metalness={0} />
    </instancedMesh>
  );
}
