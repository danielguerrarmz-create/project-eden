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

  const northRad = (plot.northDeg * Math.PI) / 180;
  const markerDist = Math.max(plot.widthM, plot.depthM) / 2 + 0.7;

  return (
    <group>
      {/* Soft surrounding ground (paper-sand) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#e7e1d1" roughness={1} />
      </mesh>

      {/* The mapped plot: a muted lawn rectangle, width x depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[plot.widthM, plot.depthM]} />
        <meshStandardMaterial color="#8ea060" roughness={1} />
      </mesh>
      <lineSegments geometry={outline} position={[0, 0.006, 0]}>
        <lineBasicMaterial color="#5E6E2B" />
      </lineSegments>

      {/* Gravel apron under the Eden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
        <circleGeometry args={[geo.footprintRadiusM + 0.45, 40]} />
        <meshStandardMaterial color="#d9d0b8" roughness={1} />
      </mesh>

      {/* Planting beds at the base — where the sacrificial armature is rooted */}
      {beds.map((p, i) => (
        <mesh key={i} position={[p[0], 0.014, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#5b4632" roughness={1} />
        </mesh>
      ))}

      {/* North marker: a coral arrow on the ground, rotated to the set orientation */}
      <group rotation={[0, -northRad, 0]}>
        <mesh position={[0, 0.02, -markerDist]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.28, 0.6, 3]} />
          <meshStandardMaterial color="#E06A4E" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
