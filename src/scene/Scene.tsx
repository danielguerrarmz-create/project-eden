/**
 * Scene.tsx — the react-three-fiber canvas.
 *
 * A clean, bright, gallery stage on warm paper. Composes the garden ground,
 * the dry timber canopy, and the two overlays the studio uses: the
 * strut-density heatmap (proves the species re-weights the armature) and the
 * animated growth layer (the year 0/1/3 beat).
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { webglSupported } from '../ui/webgl';
import { Folly } from './Folly';
import { GardenContext } from './GardenContext';
import { StrutHeatmap } from './overlays/StrutHeatmap';
import { GrowthOverlay } from './overlays/GrowthOverlay';
import { CageHandles } from './CageHandles';

/**
 * `manipulate` turns the stage into the direct-manipulation cage: draggable
 * handles reshape the pavilion (routed through the grammar), overlays are hidden
 * for a clean cage view, and auto-rotate stops so shaping never fights the camera.
 */
export function Scene({ manipulate = false }: { manipulate?: boolean }) {
  const overlays = useDesign((s) => s.overlays);
  const reducedMotion = useReducedMotion();

  if (!webglSupported()) return <NoWebGL />;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [6.4, 3.4, 7.2], fov: 42 }}
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

      {!manipulate && overlays.strutHeatmap && <StrutHeatmap />}
      {!manipulate && overlays.growth && <GrowthOverlay />}
      {manipulate && <CageHandles />}

      <ContactShadows position={[0, 0.015, 0]} opacity={0.28} scale={18} blur={2.6} far={7} color="#5a5443" />

      <OrbitControls
        makeDefault
        target={[0, 1.15, 0]}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.05}
        enablePan={false}
        autoRotate={!reducedMotion && !manipulate}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}

/** Paper fallback when the browser can't give us a WebGL context. */
function NoWebGL() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6" role="status">
      <div className="max-w-sm text-center">
        <div className="mb-2 text-3xl" aria-hidden>
          🌿
        </div>
        <p className="text-sm font-medium text-ink">this browser can't render the 3D stage</p>
        <p className="mt-1 text-[13px] leading-relaxed text-inkSoft">
          The folly preview needs WebGL. Try a current Chrome, Edge, Firefox or Safari, or
          another device. All the numbers on this page still update live.
        </p>
      </div>
    </div>
  );
}
