/**
 * GardenContext.tsx — the mapped plot the Eden sits on.
 *
 * v2: the ground is the rectangle the user drew in Step 1 (width x depth in
 * metres), centred on the Eden, with a compass north marker rotated to the
 * orientation they set. The Eden is clamped to fit inside it, so you can see it
 * belongs to the site. Planting beds ring the built base where the climbers root.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useDesign } from '../state/store';

export function GardenContext() {
  const geo = useDesign((s) => s.outputs.geometry);
  const plot = useDesign((s) => s.plot);

  const beds = useMemo(() => {
    const R = geo.footprintRadiusM;
    const arc = (geo.params.enclosurePct / 100) * Math.PI * 2;
    const centre = ((geo.params.openingOrientationDeg + 180) * Math.PI) / 180;
    const n = 10;
    const pts: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = centre - arc / 2 + (arc * i) / (n - 1);
      pts.push([R * Math.sin(a), 0.02, R * Math.cos(a)]);
    }
    return pts;
  }, [geo]);

  const outline = useMemo(() => {
    const g = new THREE.PlaneGeometry(plot.widthM, plot.depthM);
    g.rotateX(-Math.PI / 2);
    return new THREE.EdgesGeometry(g);
  }, [plot.widthM, plot.depthM]);

  // Interior 1m drawing-sheet grid (secondary linework). WebGL line width isn't
  // reliably controllable, so primary-vs-secondary weight is expressed as opacity:
  // full-opacity boundary (outline) above, 0.10 interior grid here.
  const grid = useMemo(() => {
    const w = plot.widthM;
    const d = plot.depthM;
    const y = 0.006;
    const pts: number[] = [];
    for (let x = Math.ceil(-w / 2 + 1e-3); x <= Math.floor(w / 2 - 1e-3); x++) {
      pts.push(x, y, -d / 2, x, y, d / 2);
    }
    for (let z = Math.ceil(-d / 2 + 1e-3); z <= Math.floor(d / 2 - 1e-3); z++) {
      pts.push(-w / 2, y, z, w / 2, y, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [plot.widthM, plot.depthM]);

  const northRad = (plot.northDeg * Math.PI) / 180;
  const markerDist = Math.max(plot.widthM, plot.depthM) / 2 + 0.7;

  return (
    <group>
      {/* Soft surrounding ground, cooled toward the vellum family */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#EFEBDD" roughness={1} />
      </mesh>

      {/* The mapped plot: a near-neutral drawing sheet, a whisper of ink over the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[plot.widthM, plot.depthM]} />
        <meshStandardMaterial color="#17160F" transparent opacity={0.03} roughness={1} />
      </mesh>
      {/* Secondary linework: interior 1m grid */}
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#17160F" transparent opacity={0.1} />
      </lineSegments>
      {/* Primary linework: the plot boundary */}
      <lineSegments geometry={outline} position={[0, 0.006, 0]}>
        <lineBasicMaterial color="#17160F" />
      </lineSegments>

      {/* Gravel apron under the Eden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
        <circleGeometry args={[geo.footprintRadiusM + 0.45, 40]} />
        <meshStandardMaterial color="#E5DFC9" roughness={1} />
      </mesh>

      {/* Planting beds at the base, a soil material that recedes into the ink family */}
      {beds.map((p, i) => (
        <mesh key={i} position={[p[0], 0.014, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#2A2419" roughness={1} />
        </mesh>
      ))}

      {/* North marker: the one functional highlight, accent olive, rotated to orientation */}
      <group rotation={[0, -northRad, 0]}>
        <mesh position={[0, 0.02, -markerDist]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.28, 0.6, 3]} />
          <meshStandardMaterial color="#ACC13A" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
