/**
 * GardenContext.tsx — the ground the pavilion sits on.
 *
 * One quiet environment (demo-spec §3 polish pass): a soft paper-sand ground,
 * a lawn disc, a gravel apron under the canopy, planting beds at each FOOT
 * (where the climbers root — the sacrificial armature starts here), and a
 * coral north marker so the aperture bearing reads on camera.
 *
 * The north marker is wayfinding for the STUDIO's aperture-bearing slider; it is
 * meaningless in the passive hero render, so `showNorthMarker` (default true)
 * lets HeroScene opt out of it.
 */
import { useMemo } from 'react';
import { useDesign } from '../state/store';

const DEG = Math.PI / 180;

export function GardenContext({
  showNorthMarker = true,
  bedColor = '#5b4632',
}: {
  showNorthMarker?: boolean;
  /**
   * Tilled earth at each foot. A prop, and defaulted to the original, because
   * how dark this reads is a function of the RIG it is lit by, and there are
   * now two. Under the house rig (HeroScene, ambient 0.74) `#5b4632` is soil.
   * Under `/draw`'s retuned rig (ambient 0.32, so the lattice's cast shadow
   * can read as dark) the same colour bottoms out near black and the beds
   * stop looking like planting and start looking like craters punched in the
   * lawn — the darkest thing in frame, pulling the eye to the ground and off
   * the object. `/draw` passes a lighter one. Do not "fix" this by changing
   * the default: that would drag HeroScene along with it.
   */
  bedColor?: string;
} = {}) {
  const geo = useDesign((s) => s.outputs.geometry);

  // A planting bed just outside the eave at each foot bearing.
  const beds = useMemo(
    () =>
      geo.footBearingsDeg.map((deg) => {
        const t = deg * DEG;
        return [(geo.planA + 0.35) * Math.sin(t), 0.014, (geo.planB + 0.35) * Math.cos(t)] as const;
      }),
    [geo.footBearingsDeg, geo.planA, geo.planB],
  );

  const lawnRadius = Math.max(geo.planA, geo.planB) + 2.6;

  return (
    <group>
      {/* Soft surrounding ground (paper-sand) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#e7e1d1" roughness={1} />
      </mesh>

      {/* Lawn the pavilion belongs to */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[lawnRadius, 48]} />
        <meshStandardMaterial color="#8ea060" roughness={1} />
      </mesh>

      {/* Gravel apron under the canopy, matched to the plan ellipse */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        scale={[geo.planA + 0.45, geo.planB + 0.45, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#d9d0b8" roughness={1} />
      </mesh>

      {/* Planting beds at the feet — where the sacrificial armature is rooted */}
      {beds.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.34, 16]} />
          <meshStandardMaterial color={bedColor} roughness={1} />
        </mesh>
      ))}

      {/* North marker: a small coral arrow on the ground at +Z (scene north).
          Studio-only wayfinding; the hero render passes showNorthMarker={false}. */}
      {showNorthMarker && (
        <mesh position={[0, 0.02, lawnRadius + 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.18, 0.42, 3]} />
          <meshStandardMaterial color="#E06A4E" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}
