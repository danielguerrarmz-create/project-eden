/**
 * Scene.tsx — the react-three-fiber canvas.
 *
 * v2 surface: a clean, bright, gallery stage on warm paper (not the old dark
 * room). Composes the mapped plot, the dry timber folly, and the two overlays
 * the guided flow actually uses: the strut-density heatmap (proves the species
 * re-weights the field, step 2) and the animated growth layer (step 3). The
 * sun-path / water overlays stay in the tree but are never toggled on in the
 * flow (water used a blue line; the no-blue rule keeps it off screen).
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useDesign } from '../state/store';
import { Folly } from './Folly';
import { GardenContext } from './GardenContext';
import { StrutHeatmap } from './overlays/StrutHeatmap';
import { GrowthOverlay } from './overlays/GrowthOverlay';

export function Scene() {
  const overlays = useDesign((s) => s.overlays);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [7, 4.6, 8], fov: 42 }}
      className="!absolute inset-0"
    >
      <color attach="background" args={['#F6F4EE']} />
      <fog attach="fog" args={['#F6F4EE', 20, 46]} />

      <ambientLight intensity={0.85} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />

      <GardenContext />
      <Folly />

      {overlays.strutHeatmap && <StrutHeatmap />}
      {overlays.growth && <GrowthOverlay />}

      <ContactShadows position={[0, 0.015, 0]} opacity={0.28} scale={18} blur={2.6} far={7} color="#5a5443" />

      <OrbitControls
        makeDefault
        target={[0, 1.3, 0]}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.05}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
