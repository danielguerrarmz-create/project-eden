/**
 * SurfaceMesh.tsx — the soft thing you sculpt, before it becomes a kit.
 *
 * Evaluates engine/surface.ts over a plan grid and drops triangles that fall in
 * a hole or off the edge, so excavations are real openings you see through
 * rather than dents. Vertex colours darken toward the ground so the form reads
 * without any lighting trickery.
 *
 * Deliberately NOT the finished object: it's matte, seamless and jointless.
 * The whole point of the bake is that this becomes something with nodes and a
 * cut list, so it must not pretend to be that yet.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  surfaceHeight,
  isHole,
  surfaceBounds,
  footprintHull,
  insideHullM,
  type SurfaceInput,
} from '../../engine/surface';

const RES = 76;

export function SurfaceMesh({ input, ghost = false }: { input: SurfaceInput; ghost?: boolean }) {
  const geo = useMemo(() => {
    const b = surfaceBounds(input);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const hull = footprintHull(input.arcs);
    const cellDiag = Math.hypot(w / RES, h / RES);

    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const height: number[] = [];
    const dead: boolean[] = [];

    const lo = new THREE.Color('#8f7c56');
    const hi = new THREE.Color('#d8c49a');
    const c = new THREE.Color();

    for (let j = 0; j <= RES; j++) {
      for (let i = 0; i <= RES; i++) {
        const x = b.minX + (w * i) / RES;
        const z = b.minY + (h * j) / RES;
        const p = { x, y: z };
        const y = surfaceHeight(input, p);
        pos.push(x, y, z);
        height.push(y);
        // Cut a RING OUTSIDE the footprint, not at a height threshold and not
        // exactly on the boundary.
        //
        // Culling on `y <= 0.06` cut mid-slope: every dropped quad left a tooth
        // with real height and the eave grew a sawtooth fringe. Culling exactly
        // at the hull is better but not enough — the surviving vertices sit up
        // to a cell inside, where the skirt has already climbed ~0.2 m, so the
        // teeth persist. Keeping a ring just OUTSIDE the hull works because the
        // surface is identically zero out there: the boundary quads lie flat on
        // the lawn, and grid stair-stepping in a flat rim is invisible.
        dead.push(isHole(input, p) || insideHullM(hull, p) < -(cellDiag * 1.5));
        c.copy(lo).lerp(hi, Math.min(1, y / 2.2));
        col.push(c.r, c.g, c.b);
      }
    }

    const at = (i: number, j: number) => j * (RES + 1) + i;
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const a = at(i, j);
        const bb = at(i + 1, j);
        const cc = at(i + 1, j + 1);
        const d = at(i, j + 1);
        // A quad survives only if all four corners are live: that gives holes a
        // clean edge instead of a fringe of half-triangles hanging in the air.
        if (dead[a] || dead[bb] || dead[cc] || dead[d]) continue;
        idx.push(a, bb, cc, a, cc, d);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [input]);

  if (geo.index === null || geo.index.count === 0) return null;

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.92}
        metalness={0}
        transparent={ghost}
        opacity={ghost ? 0.25 : 1}
        flatShading={false}
      />
    </mesh>
  );
}
