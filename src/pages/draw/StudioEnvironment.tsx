/**
 * StudioEnvironment.tsx — something for the steel to reflect. Built here, in
 * geometry, and never fetched.
 *
 * WHY THE HUBS LOOKED LIKE GREY DISCS. A metal lit only by a directional key
 * gets one small specular hotspot and nothing else. What reads as galvanized
 * zinc is the CONTINUOUS reflected gradient across the drum as it turns, and
 * a gradient needs a surrounding to reflect. There wasn't one.
 *
 * WHY NOT `<Environment preset="studio" />`. That does not bundle anything: it
 * FETCHES an HDR from a third-party CDN (the pmndrs assets repo) at runtime.
 * Free of bundle cost and not free of risk — it needs a network round trip to
 * someone else's host while the shot is being filmed. If it's slow the scene
 * visibly pops mid-take when the HDR lands; if it fails, or the machine is
 * offline, the hubs render wrong and nobody notices until the footage is
 * reviewed. Several of those presets also carry a blue sky dome, and
 * blue-tinted steel would fight the warm vellum and timber badly.
 *
 * So: drei's `<Environment>` renders its CHILDREN into a cube target instead.
 * Same reflections, no fetch, no host, no bundle. `frames={1}` renders it once
 * and never again — the cost is one 128px cube render at mount, then nothing.
 *
 * WHAT IT IS. A warm off-white shell (the vellum the scene actually sits in),
 * one bright panel up and to the key's side so the drums carry a highlight
 * that travels as they rotate, and a dimmer warm panel opposite so the shadow
 * side reflects something rather than going dead. Deliberately colourless: its
 * whole job is a value gradient, and any hue here would tint every metal in
 * the frame.
 */
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Low on purpose. `scene.environment` lights EVERYTHING with a standard
 * material, not just the steel — the timber and the ground drink it too — so
 * this is set to flatter the hubs without undoing the ambient drop that lets
 * the cast shadow read as dark. Raising it washes the whole rig back out.
 */
const ENV_INTENSITY = 0.35;

export function StudioEnvironment() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={ENV_INTENSITY}>
      {/* The room: seen from inside, so the shell is BackSide. */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#efe9db" side={THREE.BackSide} />
      </mesh>
      {/* Key-side panel, high: the travelling highlight. */}
      <mesh position={[14, 16, -6]} rotation={[0, -0.6, 0]} scale={[18, 14, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Fill-side panel, dimmer: keeps the shadow side of a drum alive. */}
      <mesh position={[-14, 8, 10]} rotation={[0, 2.4, 0]} scale={[16, 10, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#cfc7b4" />
      </mesh>
      {/* Ground bounce, warm and low. */}
      <mesh position={[0, -10, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[40, 40, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#8a8368" />
      </mesh>
    </Environment>
  );
}
