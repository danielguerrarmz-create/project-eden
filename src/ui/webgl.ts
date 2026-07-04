/**
 * webgl.ts — one cheap check: can this browser give us a WebGL context at all?
 *
 * Checked ONCE before mounting any <Canvas>. Old corporate laptops, remote
 * desktops and some privacy browsers can't — in that case the Scene renders a
 * quiet paper card explaining what the stage would show instead of throwing
 * inside react-three-fiber.
 */
let cached: boolean | null = null;

export function webglSupported(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cached = !!gl;
  } catch {
    cached = false;
  }
  return cached;
}
