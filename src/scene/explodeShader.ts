/**
 * explodeShader.ts — take the kit apart along its own normals, in install order.
 *
 * Built to Sai's spec, docs/design/2026-07-17-explode-spec.md.
 *
 * THE PROBLEM IT SOLVES. `Folly` merges every timber member into ONE flat
 * BufferGeometry per stock — positions and normals only, no per-piece identity.
 * Perfect for a static render, useless for an explode: there is nothing to move
 * independently. This is the same shape of problem `revealShader.ts` already
 * solved for the bake dissolve, and the same answer: bake per-vertex data in at
 * BUILD time from data the engine already has, animate it with one uniform per
 * frame. **Second use of a proven pattern, not a new mechanism.**
 *
 * WHAT MOVES, AND ALONG WHAT. Each piece travels along its own already-computed
 * outward normal (`Member.normal` / `CanopyNode.normal`). Nothing invents a
 * radial-vs-vertical rule, because a dome's normal field already encodes one:
 * crown pieces lift, eave pieces spread, for free and exactly.
 *
 * WHEN IT MOVES. `v` (0 = eave/ground, 1 = crown) staggers the start, so the
 * cascade plays the real install order BACKWARDS — ground up first, crown last —
 * which is the standard exploded-assembly convention. Magnitude is uniform once
 * a piece starts: scaling distance by `v` too would leave ground pieces barely
 * moved at full explode, which reads as broken rather than as a diagram.
 *
 * ---------------------------------------------------------------------------
 * TWO THINGS THE SPEC GOT WRONG, FOUND BY BUILDING IT. Both are recorded here
 * because both are invisible until the exact moment they are catastrophic.
 *
 * 1. **THE INSTANCED OFFSET CANNOT BE THE RAW NORMAL.** `transformed` is in
 *    INSTANCE-LOCAL space: three's `project_vertex` applies `instanceMatrix`
 *    AFTER this injection. The steel instances carry non-uniform scale (a clamp
 *    plate is something like [0.2, 0.008, 0.2]), so a unit normal added to
 *    `transformed` gets that scale applied to it and the piece slides 8 mm on
 *    one axis and 200 mm on another instead of moving along its normal. The
 *    offset has to be pre-divided by the instance's own linear part so that
 *    `instanceMatrix` puts it back — hence `inverse(mat3(instanceMatrix))`
 *    under `USE_INSTANCING`. Timber is a plain mesh at the origin with world
 *    coordinates already baked into its vertices, so it needs none of this.
 *
 * 2. **IT MUST CHAIN, NOT ASSIGN.** `applyReveal` ASSIGNS `onBeforeCompile`,
 *    and `Folly` puts both passes on the SAME materials. A second assignment
 *    silently destroys the first — the reveal would stop cutting and the bake
 *    would go back to being a jump cut, with nothing to show it had happened.
 *    So this composes with whatever is already there, and the cache key
 *    composes too. The WeakSet is not decoration: chaining is only safe if it
 *    happens exactly once per material, and `Folly`'s ref callbacks fire on
 *    every re-render.
 * ---------------------------------------------------------------------------
 */
import * as THREE from 'three';

/** 0 = assembled, 1 = fully exploded. One uniform, driven per frame. */
export interface ExplodeUniforms {
  uExplodeT: { value: number };
}

export function makeExplodeUniforms(): ExplodeUniforms {
  return { uExplodeT: { value: 0 } };
}

/**
 * How much of the timeline is spent staggering starts versus travelling.
 *
 * Baked as a GLSL constant rather than a uniform because it never changes at
 * runtime: `revealShader` has a uniform because `uRevealY` animates; this does
 * not. At 0.45, the crown starts moving a little under halfway through and
 * everything still lands together at t=1 — the cascade reads as a sequence
 * rather than as a slow start followed by a rush.
 */
export const EXPLODE_STAGGER = 0.45;

/**
 * How far a piece travels at full explode, as a fraction of the plan's minor
 * semi-axis. Size-relative on purpose: a flat metre figure would shred the
 * smallest buildable footprint and barely open the largest, across a 12-18 m²
 * range. STARTING NUMBER — Sai's, reasoned from proportion, never seen animated.
 */
export const EXPLODE_DISTANCE_FRAC = 0.5;

/** The travel distance in metres for a given design. */
export function explodeDistanceM(planB: number): number {
  return EXPLODE_DISTANCE_FRAC * planB;
}

/**
 * Where a piece is at time t, given its own stagger. Pure and exported so the
 * cascade's shape is testable without a GPU — the GLSL below is this function,
 * transliterated, and the test pins the properties that matter: nothing moves
 * before its turn, everything arrives together, ground leads crown.
 */
export function explodeLocalT(t: number, delay: number, stagger = EXPLODE_STAGGER): number {
  const started = t - delay * stagger;
  return Math.min(1, Math.max(0, started / Math.max(1e-4, 1 - stagger)));
}

const VERTEX_HEAD = `attribute vec3 aExplodeOffset;
attribute float aExplodeDelay;
uniform float uExplodeT;
`;

/**
 * `aExplodeOffset` already carries direction TIMES distance in metres, baked at
 * build time. One less uniform, and the distance is per-design — which is
 * exactly when the geometry is rebuilt anyway.
 */
const VERTEX_BODY = `#include <begin_vertex>
  float aeStarted = uExplodeT - aExplodeDelay * ${EXPLODE_STAGGER.toFixed(3)};
  float aeT = clamp( aeStarted / ${(1 - EXPLODE_STAGGER).toFixed(3)}, 0.0, 1.0 );
  #ifdef USE_INSTANCING
    // instanceMatrix is applied to the vertex AFTER this, and it carries the
    // instance's non-uniform scale. Undo that linear part here so the piece
    // travels along its normal instead of being squashed by its own shape.
    transformed += inverse( mat3( instanceMatrix ) ) * ( aExplodeOffset * aeT );
  #else
    transformed += aExplodeOffset * aeT;
  #endif`;

/** Applied once per material: chaining is only safe if it happens once. */
const exploded = new WeakSet<THREE.Material>();

/**
 * Add the explode to a material, PRESERVING whatever is already injected.
 *
 * Chains rather than assigns — see the header. `Folly`'s materials already
 * carry the reveal, and clobbering it would break the bake with no error.
 *
 * Ordering note: this injection runs BEFORE the reveal's body (both replace the
 * same `#include <begin_vertex>`, and the reveal's own body re-emits that
 * include, so this lands inside it). That means the reveal reads the EXPLODED
 * `transformed` when computing its cut height. Harmless by construction: the
 * reveal only runs during the bake dissolve, and the explode is gated until
 * after it, so `uExplodeT` is 0 for every frame the reveal is alive.
 */
export function applyExplode(material: THREE.Material, uniforms: ExplodeUniforms): void {
  if (exploded.has(material)) return;
  exploded.add(material);

  const prevCompile = material.onBeforeCompile;
  /**
   * ONLY an EXPLICITLY set key counts. `customProgramCacheKey` is never
   * undefined: three defines it on Material.prototype and the default returns
   * `this.onBeforeCompile.toString()`. Chaining that would splice this
   * function's own source into its own key — and, worse, would hide whether
   * anyone had actually set one. An own property is the only honest signal that
   * a previous pass declared a key.
   *
   * (That default is also exactly WHY the explicit key is mandatory here rather
   * than merely tidy: every material `applyReveal` touches gets an
   * `onBeforeCompile` with IDENTICAL source, so the default key is identical
   * too, and materials that differ only in their closed-over uniforms would
   * silently share one compiled program.)
   */
  const prevKeyFn = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey')
    ? (material.customProgramCacheKey as () => string)
    : undefined;

  material.onBeforeCompile = (shader, renderer) => {
    prevCompile?.call(material, shader, renderer);
    shader.uniforms.uExplodeT = uniforms.uExplodeT;
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', VERTEX_BODY);
  };
  material.customProgramCacheKey = () => `${prevKeyFn ? prevKeyFn.call(material) : ''}|bower-explode`;
  material.needsUpdate = true;
}
