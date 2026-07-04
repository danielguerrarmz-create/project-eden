/**
 * GrowthOverlay.tsx — the living layer, animated. THE signature moment.
 *
 * Foliage clusters clothe the lattice. Their placement follows the strut-density
 * field (plants thickest where the engine put the most support) and their SIZE
 * scales with an ANIMATED coverage value that eases toward the current growth
 * stage. Toggle Year 0 -> 1 -> 3 and the canopy visibly grows in over ~1s, leaf
 * by leaf, with a gentle idle sway so it reads alive on camera.
 *
 * Conceptually these sit on a SACRIFICIAL ARMATURE keyed off the (u,v) cells,
 * never on the structural timber (stress-test §12). Visual approximation, not a
 * biological warranty.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesign } from '../../state/store';
import { leafColor } from '../util';

interface Leaf {
  pos: [number, number, number];
  maxSize: number;
  color: THREE.Color;
  threshold: number; // coverage at which this leaf starts appearing (staggered grow-in)
  phase: number; // idle-sway phase
}

export function GrowthOverlay() {
  const cells = useDesign((s) => s.outputs.strutField.cells);
  const targetCoverage = useDesign((s) => s.outputs.growth.coverageFraction);

  const leaves = useMemo<Leaf[]>(
    () =>
      cells.map((cell, i) => {
        const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const local = 0.4 + 0.6 * cell.density01;
        const outward = 1.03;
        const [x, y, z] = cell.position;
        return {
          pos: [x * outward, y, z * outward],
          maxSize: local * (0.6 + 0.5 * jitter) * 0.42,
          color: leafColor(cell.density01),
          // Lower cells (v small) grow in first, denser cells lead: a natural fill.
          threshold: 0.05 + 0.5 * (1 - cell.density01) * jitter,
          phase: i * 1.7,
        };
      }),
    [cells],
  );

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const current = useRef(0);

  useFrame((state, dt) => {
    // Ease the visible coverage toward the target growth stage.
    current.current += (targetCoverage - current.current) * Math.min(1, dt * 3.2);
    const cov = current.current;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < leaves.length; i++) {
      const m = meshRefs.current[i];
      if (!m) continue;
      const leaf = leaves[i];
      // Progress of this leaf: 0 until coverage passes its threshold, then ramps.
      const p = THREE.MathUtils.clamp((cov - leaf.threshold) / 0.4, 0, 1);
      const eased = p * p * (3 - 2 * p); // smoothstep
      const size = eased * leaf.maxSize;
      if (size < 0.012) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      // Gentle breathing sway proportional to how grown-in it is.
      const sway = 1 + 0.04 * eased * Math.sin(t * 1.3 + leaf.phase);
      m.scale.setScalar(size * sway);
    }
  });

  return (
    <group>
      {leaves.map((leaf, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          position={leaf.pos}
          visible={false}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={leaf.color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}
