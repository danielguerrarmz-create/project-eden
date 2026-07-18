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
import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesign } from '../../state/store';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { leafColor } from '../util';
import { toonGradient } from '../npr/toonGradient';

interface Leaf {
  pos: [number, number, number];
  maxSize: number;
  color: THREE.Color;
  threshold: number; // coverage at which this leaf starts appearing (staggered grow-in)
  phase: number; // idle-sway phase
}

export function GrowthOverlay({
  coverageOverride,
  progressRef,
  coverageRange,
}: {
  coverageOverride?: number;
  /** When set (the hero), coverage is a positional function of scroll progress,
   *  not a time-eased animation. Under frameloop="demand" the studio's dt-easing
   *  advances only on invalidated frames, so a paused scroll would freeze growth
   *  mid-ease and couple its speed to scroll velocity; reading progress directly
   *  keeps growth exactly at the position the scroll last reached. */
  progressRef?: MutableRefObject<number>;
  /** Progress range [start, end] that maps to coverage [0, coverageOverride]. */
  coverageRange?: [number, number];
} = {}) {
  const cells = useDesign((s) => s.outputs.strutField.cells);
  const storeCoverage = useDesign((s) => s.outputs.growth.coverageFraction);
  // The hero render fixes a lush coverage regardless of the studio's year; the
  // studio passes nothing and keeps its live, year-driven coverage.
  const targetCoverage = coverageOverride ?? storeCoverage;
  const reducedMotion = useReducedMotion();

  const leaves = useMemo<Leaf[]>(
    () =>
      cells.map((cell, i) => {
        const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const local = 0.4 + 0.6 * cell.density01;
        const maxSize = local * (0.6 + 0.5 * jitter) * 0.42;
        // Sit foliage ON the skin: step out along the surface normal by roughly
        // the leaf's own half-size, so it rests against the face it grows on
        // rather than being scaled radially off a doubly curved shell.
        const [x, y, z] = cell.position;
        const [nx, ny, nz] = cell.normal;
        const off = maxSize * 0.5;
        return {
          pos: [x + nx * off, y + ny * off, z + nz * off],
          maxSize,
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
    // Reduced motion: SNAP to the stage instead of animating, and hold still.
    if (progressRef && coverageRange) {
      // Positional (hero): coverage is a smoothstep of scroll progress across the
      // range, so it tracks the scroll and holds when the scroll pauses.
      const [pa, pb] = coverageRange;
      const g = THREE.MathUtils.clamp((progressRef.current - pa) / (pb - pa), 0, 1);
      current.current = g * g * (3 - 2 * g) * targetCoverage;
    } else if (reducedMotion) {
      current.current = targetCoverage;
    } else {
      current.current += (targetCoverage - current.current) * Math.min(1, dt * 3.2);
    }
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
      const sway = reducedMotion ? 1 : 1 + 0.04 * eased * Math.sin(t * 1.3 + leaf.phase);
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
          {/* Toon-banded so the living layer paints the same way the timber
              does (spec A5); the per-leaf colour carries the green. */}
          <meshToonMaterial color={leaf.color} gradientMap={toonGradient} />
        </mesh>
      ))}
    </group>
  );
}
