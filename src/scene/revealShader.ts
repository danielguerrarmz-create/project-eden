/**
 * revealShader.ts — reveal a merged mesh from the ground up.
 *
 * The bake is the moment the whole product argues its thesis: a gesture became
 * a real kit. It was a jump-cut — the soft skin unmounted and the lattice
 * appeared, one frame apart — which is the one edit that says "these are two
 * different things" when the entire claim is that they are the same thing
 * resolving.
 *
 * WHY A SHADER DISCARD AND NOT A FADE OR A SCALE. `Folly` merges every member
 * of a stock into ONE BufferGeometry with world-space coordinates, so there is
 * no per-member object to animate and no per-member attribute to key off. What
 * there IS, for free, is the world Y of every fragment. A discard above a
 * moving plane costs one varying and one compare, needs no new geometry, no
 * new dependency, and no change to the merge that makes the scene fast.
 *
 * The cut is per-FRAGMENT, so a diagonal strut crossing the plane is sliced
 * exactly at the plane rather than popping in whole. That was the predicted
 * failure mode and it does not happen: the plane moves a few centimetres per
 * frame, far below the eye's threshold for a step.
 *
 * WHY THE DEPTH MATERIAL IS NOT OPTIONAL. `castShadow` does not render this
 * material at all — it renders three's own MeshDepthMaterial into the shadow
 * map. Inject the discard only into the visible material and the shadow map
 * still holds the ENTIRE lattice from the first frame, so the finished
 * structure's shadow lies on the gravel while the structure itself is still
 * a stump growing out of the ground. The reveal reads as broken in exactly
 * the place the eye is most likely to check. Both materials get the discard.
 */
import * as THREE from 'three';

/** Above this world height, nothing is drawn. Metres. */
export interface RevealUniforms {
  uRevealY: { value: number };
}

/** Nothing hidden. The value a non-revealing mesh sits at forever. */
export const REVEAL_OFF = 1e6;

export function makeRevealUniforms(): RevealUniforms {
  return { uRevealY: { value: REVEAL_OFF } };
}

/**
 * World Y of the fragment, computed the same way three's own `project_vertex`
 * builds its position — including the instance transform, or every steel hub
 * (an InstancedMesh) would test the UNTRANSFORMED corner of a unit box and
 * reveal at the wrong height.
 */
const VERTEX_HEAD = 'varying float vRevealWorldY;\n';
const VERTEX_BODY = `#include <begin_vertex>
  vec4 revealWp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    revealWp = instanceMatrix * revealWp;
  #endif
  revealWp = modelMatrix * revealWp;
  vRevealWorldY = revealWp.y;`;

const FRAGMENT_HEAD = 'uniform float uRevealY;\nvarying float vRevealWorldY;\n';
const FRAGMENT_BODY = `if ( vRevealWorldY > uRevealY ) discard;
  #include <clipping_planes_fragment>`;

/**
 * Inject the reveal into any material three compiles from its own chunks
 * (MeshStandardMaterial and MeshDepthMaterial both qualify).
 *
 * `customProgramCacheKey` is required, not decorative: three caches compiled
 * programs by material type + defines, and two materials with identical
 * settings but different `onBeforeCompile` would otherwise silently share one
 * program. Without it the reveal either leaks onto meshes that never asked for
 * it or fails to appear on the ones that did, depending on compile order.
 */
export function applyReveal(material: THREE.Material, uniforms: RevealUniforms): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRevealY = uniforms.uRevealY;
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader =
      FRAGMENT_HEAD + shader.fragmentShader.replace('#include <clipping_planes_fragment>', FRAGMENT_BODY);
  };
  material.customProgramCacheKey = () => 'bower-reveal';
  material.needsUpdate = true;
}

/**
 * A depth material carrying the same cut, for the shadow pass. Assign to a
 * mesh's `customDepthMaterial`.
 */
export function makeRevealDepthMaterial(uniforms: RevealUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  applyReveal(m, uniforms);
  return m;
}

/**
 * Ease the sweep. Starts quick and settles, so the structure arrives rather
 * than slams: the last few rings are where the eye is, and a linear sweep
 * spends the same time on the crown as on the feet.
 */
export function revealHeightM(progress: number, peakM: number): number {
  const t = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - t) * (1 - t);
  // A margin past the peak so the final ring is unambiguously complete rather
  // than ending on a fragment that rounds the wrong way.
  return eased * (peakM + 0.35);
}
