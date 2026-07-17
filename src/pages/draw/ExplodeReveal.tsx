/**
 * ExplodeReveal.tsx — the clock the explode runs on.
 *
 * Same shape as `BakeReveal`, and deliberately NOT the same clock. The bake
 * reveal is a one-shot narrative beat: the skin dissolves, the lattice sweeps
 * up, once, at bake. The explode is exploratory and repeatable — something you
 * reach for AFTER the kit exists, to go and look at it, forwards and backwards,
 * as many times as you like. Tying a toggle to a story beat would mean the story
 * beat could be replayed, which is the wrong affordance for both.
 *
 * ASYMMETRIC ON PURPOSE. Coming apart is the explanation and wants to be read,
 * so it takes its time; going back together is a return to the known state and
 * reads better snapping shut, like a magnet. This is the same reasoning that
 * tuned the bake's own fade and sweep to overlap rather than hand off. STARTING
 * NUMBERS — Sai's, reasoned from proportion, never seen animated.
 *
 * Refs, not state: this writes every frame, and a re-render per frame would
 * fight the animation it is drawing.
 */
import { useFrame } from '@react-three/fiber';
import type { ExplodeUniforms } from '../../scene/explodeShader';

export const EXPLODE_S = 2.2;
export const REASSEMBLE_S = 1.6;

export function ExplodeReveal({
  active,
  uniforms,
  progressRef,
}: {
  /** True while exploded. Toggling drives the tween either way. */
  active: boolean;
  uniforms: ExplodeUniforms;
  /**
   * 0 (assembled) -> 1 (exploded). Read by the page for the sequence readout,
   * which is why the page owns the ref rather than this component.
   */
  progressRef: React.MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    const t = progressRef.current;
    if (t === target) return;

    // A hidden tab hands back one enormous delta on return; cap it, or the
    // explode completes during the blink and there was no explode at all. The
    // same trap BakeReveal already names.
    const dt = Math.min(delta, 1 / 20);
    const step = dt / (active ? EXPLODE_S : REASSEMBLE_S);
    const next = active ? Math.min(1, t + step) : Math.max(0, t - step);

    progressRef.current = next;
    // Smoothstep, so pieces ease out of the structure and settle rather than
    // starting and stopping dead. The per-piece stagger lives in the shader —
    // this is the whole cascade's clock, not one piece's.
    uniforms.uExplodeT.value = next * next * (3 - 2 * next);
  });

  return null;
}
