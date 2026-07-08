/**
 * HeroScene.tsx — the home hero's scroll-scrubbed 3D stage (default export, lazy).
 *
 * Reads a single `progressRef` (0..1, the pinned-hero scroll position) and drives
 * EVERYTHING off it, with NO OrbitControls and no autoRotate:
 *   - the camera tilts from straight top-down (a flat plan/rosette kin to the
 *     Oculus mark) to the oblique hero angle across [TILT_START, TILT_END];
 *   - the timber crossfades from an ink wireframe read to solid timber across
 *     [RESOLVE_START, RESOLVE_END];
 *   - the living layer (reused GrowthOverlay) mounts past PLANT_START and grows in.
 *
 * Reuses the studio geometry (engine members via the store) and the GardenContext
 * ground; nothing is re-modeled. The camera/material work happens in useFrame off
 * the ref, so scrolling never triggers React re-renders.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Member } from '../../engine/types';
import { useDesign } from '../../state/store';
import { GardenContext } from '../../scene/GardenContext';
import { GrowthOverlay } from '../../scene/overlays/GrowthOverlay';
import { segmentMatrix } from '../../scene/util';
import { isCaptureMode, captureView, captureGrown } from './heroStill';

/** Scene-internal p thresholds (kept in sync with HeroReveal.HERO_THRESHOLDS). */
export const SCENE_THRESHOLDS = {
  TILT_START: 0.2,
  TILT_END: 0.5,
  RESOLVE_START: 0.5,
  RESOLVE_END: 0.76,
  PLANT_START: 0.56,
} as const;

/** Camera keyframes: straight top-down -> oblique gallery angle (Scene's default). */
const CAM_TOP = new THREE.Vector3(0, 11.5, 0.001);
const CAM_OBLIQUE = new THREE.Vector3(6.4, 3.4, 7.2);
const TGT_TOP = new THREE.Vector3(0, 1.0, 0);
// Aim left of the pavilion at the oblique end so it sits in the RIGHT of frame,
// beside the copy (which lives bottom-left) rather than behind it.
const TGT_OBLIQUE = new THREE.Vector3(-2.6, 1.15, 0);

/** Visual gauge per component type (mirrors Folly.tsx). */
const GAUGE: Record<Member['type'], number> = { lattice: 1, eave: 1.7, foot: 1.9 };

/** Coverage the hero render shows regardless of the studio's year. Restrained so the
 *  timber structure stays the subject and the greenery reads as climbing, not a hedge. */
const HERO_COVERAGE = 0.36;

function smoothstep(a: number, b: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

type ProgressRef = MutableRefObject<number>;

/** Straight overhead capture pose (tighter than CAM_TOP so the plan fills the frame). */
const CAM_TOP_CAPTURE = new THREE.Vector3(0, 8.6, 0.001);

/** Camera rig driven purely by progress. In capture mode with `view=top` it locks to a
 *  centered overhead plan pose (the "computed" keyframe) instead of following the tilt. */
function Rig({ progressRef }: { progressRef: ProgressRef }) {
  const cam = useThree((s) => s.camera);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (isCaptureMode() && captureView() === 'top') {
      cam.position.copy(CAM_TOP_CAPTURE);
      cam.lookAt(0, 0.6, 0);
      return;
    }
    const t = smoothstep(SCENE_THRESHOLDS.TILT_START, SCENE_THRESHOLDS.TILT_END, progressRef.current);
    cam.position.lerpVectors(CAM_TOP, CAM_OBLIQUE, t);
    tgt.lerpVectors(TGT_TOP, TGT_OBLIQUE, t);
    cam.lookAt(tgt);
  });
  return null;
}

/** The timber: two instanced meshes (ink wireframe + solid timber) crossfaded. */
function HeroFolly({ progressRef }: { progressRef: ProgressRef }) {
  const members = useDesign((s) => s.outputs.geometry.members);
  const solidRef = useRef<THREE.InstancedMesh>(null);
  const wireRef = useRef<THREE.InstancedMesh>(null);
  const solidMat = useRef<THREE.MeshStandardMaterial>(null);
  const wireMat = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  const matrices = useMemo(
    () => members.map((m) => segmentMatrix(m.start, m.end, scratch, GAUGE[m.type])),
    [members, scratch],
  );

  useLayoutEffect(() => {
    for (const mesh of [solidRef.current, wireRef.current]) {
      if (!mesh) continue;
      matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [matrices]);

  useFrame(() => {
    const r = smoothstep(SCENE_THRESHOLDS.RESOLVE_START, SCENE_THRESHOLDS.RESOLVE_END, progressRef.current);
    if (solidMat.current) solidMat.current.opacity = r;
    // Keep a faint ink lattice even once resolved: it defines the timber's edges so the
    // structure reads off the warm ground instead of dissolving into it.
    if (wireMat.current) wireMat.current.opacity = Math.max(0.16, 1 - r);
  });

  return (
    <group>
      <instancedMesh
        key={`solid-${members.length}`}
        ref={solidRef}
        args={[undefined, undefined, members.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.026, 0.026, 1, 6]} />
        <meshStandardMaterial ref={solidMat} color="#6f5334" roughness={0.72} metalness={0} transparent opacity={0} />
      </instancedMesh>
      <instancedMesh key={`wire-${members.length}`} ref={wireRef} args={[undefined, undefined, members.length]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 4]} />
        <meshBasicMaterial ref={wireMat} color="#17160F" wireframe transparent opacity={1} />
      </instancedMesh>
    </group>
  );
}

/** Mounts the living layer once resolve passes PLANT_START; it then grows itself in.
 *  Capture seeds override this: `view=top` renders BARE (clean lattice for the plan
 *  keyframe); `grown=1` clothes it heavily (the "living" keyframe). */
function HeroPlants({ progressRef }: { progressRef: ProgressRef }) {
  const capture = isCaptureMode();
  const bare = capture && captureView() === 'top';
  const grown = capture && captureGrown();
  const [on, setOn] = useState(false);
  useFrame(() => {
    if (bare) {
      if (on) setOn(false);
      return;
    }
    const p = progressRef.current;
    // Hysteresis so scrubbing back up retracts the greenery cleanly.
    if (!on && (grown || p >= SCENE_THRESHOLDS.PLANT_START)) setOn(true);
    else if (on && !grown && p < SCENE_THRESHOLDS.PLANT_START - 0.04) setOn(false);
  });
  if (bare) return null;
  return on ? (
    <GrowthOverlay
      coverageOverride={grown ? 0.9 : HERO_COVERAGE}
      progressRef={progressRef}
      coverageRange={[SCENE_THRESHOLDS.PLANT_START, SCENE_THRESHOLDS.RESOLVE_END]}
    />
  ) : null;
}

/** Exposes r3f's `invalidate` so the DOM scroll handler can request frames on demand. */
function Invalidator({ invalidateRef }: { invalidateRef?: MutableRefObject<(() => void) | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!invalidateRef) return;
    invalidateRef.current = invalidate;
    invalidate();
    return () => {
      invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);
  return null;
}

/**
 * Phase-A capture rig (dev only, `?capture=1`). Exposes `window.__captureHero()` which
 * renders the current frame and downloads it as a PNG — the exact endpoint image that
 * conditions the Fuser render so the cross-fade still lines up. Requires the Canvas's
 * `preserveDrawingBuffer` (set below when in capture mode). Usage: open the home with
 * `?capture=1`, wait for the scene to settle, then run `__captureHero()` in the console.
 */
function CaptureRig() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!isCaptureMode()) return;
    invalidate();
    (window as unknown as { __captureHero?: () => void }).__captureHero = () => {
      gl.render(scene, camera);
      const a = document.createElement('a');
      a.href = gl.domElement.toDataURL('image/png');
      a.download = 'hero-endpoint.png';
      a.click();
    };
    return () => {
      delete (window as unknown as { __captureHero?: () => void }).__captureHero;
    };
  }, [gl, scene, camera, invalidate]);
  return null;
}

type HeroSceneProps = {
  progressRef: ProgressRef;
  invalidateRef?: MutableRefObject<(() => void) | null>;
};

export default function HeroScene({ progressRef, invalidateRef }: HeroSceneProps) {
  return (
    // frameloop="demand": the canvas only renders when the scroll handler calls
    // invalidate(). Zero GPU cost when idle or scrolled past. dpr capped, dynamic
    // shadows dropped (ContactShadows baked once) — this is a lightweight intent
    // render, to be replaced by the Fuser frame-by-frame animation.
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      // preserveDrawingBuffer only in capture mode so __captureHero()'s toDataURL is not
      // blank; off normally (it costs a little memory bandwidth per frame).
      gl={{ preserveDrawingBuffer: isCaptureMode() }}
      camera={{ position: [0, 11.5, 0.001], fov: 42 }}
      className="!absolute inset-0"
    >
      <color attach="background" args={['#efe9dc']} />
      <fog attach="fog" args={['#efe9dc', 22, 48]} />

      <ambientLight intensity={0.74} />
      <directionalLight position={[6, 10, 5]} intensity={1.55} />
      <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />

      <GardenContext showNorthMarker={false} />
      <HeroFolly progressRef={progressRef} />
      <HeroPlants progressRef={progressRef} />

      <ContactShadows position={[0, 0.015, 0]} opacity={0.24} scale={18} blur={2.8} far={7} frames={1} color="#5a5443" />

      <Rig progressRef={progressRef} />
      <Invalidator invalidateRef={invalidateRef} />
      <CaptureRig />
    </Canvas>
  );
}
