/**
 * SurfaceMesh.tsx — the soft thing you sculpt, before it becomes a kit.
 *
 * Built on the SAME POLAR NET the generator uses (rings × spokes over the
 * faired plan radius), for one reason: the soft surface and the baked lattice
 * must be the same surface. If the preview is a square grid clipped to a hull
 * and the kit is a polar net over a faired plan, they disagree at exactly the
 * place people look — the eave — and baking becomes a jump-cut instead of a
 * resolution.
 *
 * It also fixes the edge. A square grid can only cut the boundary along cell
 * lines, so the eave came out ragged; earlier attempts to hide that culled at a
 * height threshold (which left a sawtooth of teeth) and then kept a ring of
 * zero-height vertices outside the hull (which, once the surface grew a real
 * eave, turned into a one-cell vertical CLIFF and made the thing read as a tent
 * with walls). In polar the boundary IS the last ring, so there is no cut to
 * make and nothing to hide.
 *
 * Deliberately NOT the finished object: matte, seamless, jointless. The whole
 * point of the bake is that this becomes something with nodes and a cut list.
 *
 * The wash is vertex colours (`lo`/`hi` by height); the INK on top of it is two
 * shader injections, `scene/skinShader.ts` — contour rings every 0.25 m and a
 * grazing-angle rim. Both write the albedo, so the rig lights them like
 * material. That pair is what makes the canopy legible from directly above,
 * where a smooth gradient reads as nothing, and it makes the skin read MORE like
 * a study drawing rather than less, which is the constraint.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { surfaceHeight, isHole, footprintHull, planCentre, type SurfaceInput } from '../../engine/surface';
import { fairedRadius } from '../../engine/shapeFromDrawing';
import { applySkinInk } from '../../scene/skinShader';

const RINGS = 34;
const SPOKES = 96;

export function SurfaceMesh({
  input,
  ghost = false,
  fadeRef,
}: {
  input: SurfaceInput;
  ghost?: boolean;
  /**
   * 1 = solid, 0 = gone. Driven per frame during the bake dissolve, so it is
   * a ref rather than a prop: a React re-render per frame for 800 ms of
   * animation would fight the very moment it exists to smooth.
   */
  fadeRef?: React.RefObject<number>;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);
  useFrame(() => {
    const m = matRef.current;
    if (!m || !fadeRef || fadeRef.current === null) return;
    m.opacity = ghost ? 0.25 * fadeRef.current : fadeRef.current;
  });

  /**
   * A callback ref rather than a plain one: the material has to be INKED as
   * well as remembered, and this is the only moment we hold the instance.
   * Mirrors how `Folly` applies the reveal. `applySkinInk` is idempotent, so a
   * re-render cannot force a shader recompile.
   */
  const setMat = useCallback((m: THREE.MeshStandardMaterial | null) => {
    matRef.current = m;
    if (m) applySkinInk(m);
  }, []);

  const geo = useMemo(() => {
    if (input.arcs.length < 2) return null;

    const centre = planCentre(input.arcs);
    const hull = footprintHull(input.arcs);
    const radiusAt = fairedRadius(hull, centre);

    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const dead: boolean[] = [];

    const lo = new THREE.Color('#8f7c56');
    const hi = new THREE.Color('#d8c49a');
    const c = new THREE.Color();

    for (let i = 0; i <= RINGS; i++) {
      const r = i / RINGS;
      for (let j = 0; j < SPOKES; j++) {
        const theta = (j / SPOKES) * Math.PI * 2;
        const R = radiusAt(theta);
        // Engine bearing convention: 0 = north = +z, 90 = east = +x.
        const x = centre.x + r * R * Math.sin(theta);
        const z = centre.y + r * R * Math.cos(theta);
        const p = { x, y: z };
        const y = surfaceHeight(input, p);
        // DRAWN coords, not re-centred: the arcs are drawn where you put them,
        // and a skin that doesn't sit on its own ribs is worse than no skin.
        // (The bake re-centres on the plan centroid; that's the generator's
        // frame, and the swap is the moment the soft thing hands over.)
        pos.push(x, y, z);
        dead.push(isHole(input, p));
        c.copy(lo).lerp(hi, Math.min(1, y / 2.2));
        col.push(c.r, c.g, c.b);
      }
    }

    const at = (i: number, j: number) => i * SPOKES + (j % SPOKES);
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SPOKES; j++) {
        const a = at(i, j);
        const b = at(i, j + 1);
        const cc = at(i + 1, j + 1);
        const d = at(i + 1, j);
        // A quad survives only if all four corners are live: that gives a hole
        // a clean edge instead of a fringe of half-triangles in mid-air.
        if (dead[a] || dead[b] || dead[cc] || dead[d]) continue;
        idx.push(a, b, cc, a, cc, d);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [input]);

  if (!geo || geo.index === null || geo.index.count === 0) return null;

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        ref={setMat}
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.92}
        metalness={0}
        // `transparent` must be true for the whole dissolve, not just when
        // ghosting: a material flipped to transparent mid-fade recompiles and
        // the skin blinks at exactly the wrong moment.
        transparent={ghost || !!fadeRef}
        opacity={ghost ? 0.25 : 1}
      />
    </mesh>
  );
}
