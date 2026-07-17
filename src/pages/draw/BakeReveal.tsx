/**
 * BakeReveal.tsx — the one clock the bake runs on.
 *
 * The skin's fade and the lattice's sweep are the same event seen from two
 * sides, so they read as one move only if they share a clock. Two independent
 * tweens drift by a frame or two and the moment turns into two events: a thing
 * disappearing, then a thing appearing. That is the jump-cut this exists to
 * remove, just slower.
 *
 * Runs CONCURRENT with the camera's zoom-to-fit (CinematicCamera, 1.6 s, fired
 * by the same bake). Deliberately not sequenced behind it: the skin dissolving
 * while the camera glides to the new frame reads as one continuous confident
 * move. Staggering them would read as a checklist.
 *
 * Refs, not state: this writes every frame, and a re-render per frame would
 * fight the animation it is drawing.
 */
import { useFrame } from '@react-three/fiber';
import { REVEAL_OFF, revealHeightM, type RevealUniforms } from '../../scene/revealShader';

/**
 * Slightly longer than the skin's fade, so the lattice is still arriving as
 * the skin finishes leaving: they overlap rather than hand off.
 */
export const REVEAL_S = 1.15;
export const SKIN_FADE_S = 0.8;

export function BakeReveal({
  active,
  peakM,
  uniforms,
  fadeRef,
  progressRef,
}: {
  /** True from the moment bake is pressed. */
  active: boolean;
  /** Structure height, so the sweep knows where to stop. */
  peakM: number;
  uniforms: RevealUniforms;
  /** Skin opacity, 1 -> 0. */
  fadeRef: React.MutableRefObject<number>;
  /** 0 -> 1 across the reveal. The page reads it to unmount the skin. */
  progressRef: React.MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    if (!active) {
      progressRef.current = 0;
      fadeRef.current = 1;
      uniforms.uRevealY.value = REVEAL_OFF;
      return;
    }
    // A hidden tab hands back one enormous delta on return; cap it or the
    // reveal completes during the blink and there was no reveal at all.
    const dt = Math.min(delta, 1 / 20);
    progressRef.current = Math.min(1, progressRef.current + dt / REVEAL_S);

    uniforms.uRevealY.value = revealHeightM(progressRef.current, peakM);
    const skin = Math.min(1, (progressRef.current * REVEAL_S) / SKIN_FADE_S);
    fadeRef.current = 1 - skin * skin * (3 - 2 * skin); // smoothstep out
  });

  return null;
}
