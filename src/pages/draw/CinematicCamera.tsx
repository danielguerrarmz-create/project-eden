/**
 * CinematicCamera.tsx — the camera moves itself, slowly, and gets out of the way.
 *
 * Two jobs, both for the eye and neither for the engine:
 *
 *   FRAME    when the canopy appears, and again when it bakes, glide to a
 *            distance that actually fills the frame. Never cut. The baked
 *            lattice is a different size from the soft skin it replaces, so the
 *            second move is not optional.
 *   TURNTABLE once baked, orbit slowly and forever, until the person touches
 *            the pointer. A still lattice on a still background reads as a
 *            picture of a drawing; the same lattice turning reads as an object.
 *
 * WHY THE MOVE KEEPS YOUR DIRECTION. A framing move re-solves the DISTANCE and
 * the TARGET only, and reuses whatever azimuth you were already looking from.
 * Moving the eye to a "correct" pose would yank the object round under the
 * hand of someone who just chose their view, which is the jump-cut this exists
 * to avoid.
 *
 * WHY THE TURNTABLE IS NOT OrbitControls' autoRotate. autoRotate advances by a
 * FIXED ANGLE PER FRAME when update() is called without a delta, which is what
 * drei does. So its speed is refresh-rate dependent: a turntable tuned to 26 s
 * on a 60 Hz laptop becomes 13 s on a 120 Hz monitor. This is for a filmed
 * shot, so seconds-per-revolution has to be a real number of seconds. Rotating
 * against the frame delta ourselves costs three lines and is honest at any
 * refresh rate.
 *
 * Ordering: drei's OrbitControls calls controls.update() at frame priority -1,
 * so it always runs before this component. Anything written here therefore
 * survives to the render. Do not give this a positive priority: in R3F that
 * takes over the render loop and the canvas goes black.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitCamera, type Framing } from './framing';

/** Long enough to read as a camera move, short enough not to stall a 10 s shot. */
const TWEEN_S = 1.6;
/** Seconds per revolution. Slow: a 4 s clip should show drift, not a spin. */
const TURNTABLE_PERIOD_S = 26;

const UP = new THREE.Vector3(0, 1, 0);

/** Minimal shape of what drei hands us via `state.controls`. */
interface OrbitLike {
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
}

interface Tween {
  t: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export function CinematicCamera({
  framing,
  turntable,
}: {
  /** Where the camera should be. A NEW object means "go there now". */
  framing: Framing;
  /** Orbit once settled. The page turns this off the moment a pointer lands. */
  turntable: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitLike | null;
  const size = useThree((s) => s.size);
  const tween = useRef<Tween | null>(null);

  // Aspect matters to a fit (a wide object needs less room in a wide frame), so
  // a resize mid-shot must re-solve. `size` is in the deps for exactly that.
  useEffect(() => {
    if (!controls) return; // OrbitControls has not registered yet; rerun when it does.

    const toTarget = new THREE.Vector3();
    const toPos = new THREE.Vector3();

    if (framing.kind === 'pose') {
      toTarget.set(...framing.target);
      toPos.set(...framing.position);
    } else {
      // Keep the current viewing direction; the distance and the aim are ours.
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(5.6, 2.6, 6.6);
      dir.normalize();
      const fit = fitCamera(
        framing.points,
        [dir.x, dir.y, dir.z],
        (camera.fov * Math.PI) / 180,
        size.width / size.height,
        framing.margin,
      );
      toTarget.set(...fit.target);
      // The rig's own limits still win: better a slightly loose frame than a
      // camera inside the canopy or a dolly that fights the user's next scroll.
      const clamped = Math.min(Math.max(fit.distance, controls.minDistance), controls.maxDistance);
      toPos.copy(toTarget).addScaledVector(dir, clamped);
    }

    tween.current = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget,
    };
  }, [framing, controls, camera, size]);

  useFrame((_, delta) => {
    if (!controls) return;
    // A hidden tab hands back one enormous delta on return. Cap it, or the
    // turntable teleports and the tween completes during the blink.
    const dt = Math.min(delta, 1 / 20);

    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / TWEEN_S);
      // Smoothstep: leaves and arrives at zero speed, so there is no lurch at
      // either end. This is the whole difference between a move and a cut.
      const e = tw.t * tw.t * (3 - 2 * tw.t);
      camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
      controls.target.lerpVectors(tw.fromTarget, tw.toTarget, e);
      controls.update();
      if (tw.t >= 1) tween.current = null;
      return; // Never turn and dolly at once; it reads as a drift, not a move.
    }

    if (turntable) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(UP, (dt * Math.PI * 2) / TURNTABLE_PERIOD_S);
      camera.position.copy(controls.target).add(offset);
      controls.update(); // re-aims at the target and re-syncs the rig's internals
    }
  });

  return null;
}
