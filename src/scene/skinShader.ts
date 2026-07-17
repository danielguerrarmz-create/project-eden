/**
 * skinShader.ts — contour ink and a grazing-angle rim, injected into the soft
 * skin's own albedo. Built to Sai's spec, docs/design/2026-07-17-guidance-and-skin-spec.md.
 *
 * WHY THIS IS NOT A TENSION TO MANAGE. The brief is "better looking" against a
 * standing rule that the soft phase must stay UNFINISHED (the CHI '96 citation
 * in the redlining doc: sketch-style reads as open to revision, polished reads
 * as final, and the product's loop is "keep working it, bake last"). Contour
 * hachure over a wash IS the architect's study-sketch vocabulary, so this makes
 * the skin more legible and MORE obviously a drawing at the same time. It is an
 * NPR technique, which is what the citation is about.
 *
 * TWO PASSES, BOTH ON diffuseColor.rgb — the material's own albedo, shaded by
 * the rig's key light like any other surface detail. Never emissive, never a
 * screen-space overlay, never a HUD. It is ink on vellum under the same light,
 * which is the whole point: more legible, not more electronic.
 *
 *   CONTOUR  a thin dark line every 0.25 m of world height. This is the direct
 *            fix for "the canopy is illegible from above" (the draw-visual-impact
 *            handoff's own "texture on the skin would be the real fix"). A smooth
 *            vertex-colour gradient reads as nothing from directly overhead;
 *            contour rings read as elevation from ANY angle, straight down
 *            included, because that is what a topographic map is for.
 *   FRESNEL  a grazing-angle darkening, strongest where the normal turns away
 *            from the camera. It inverts the eave's liability: the edge-on
 *            condition that makes the eave vanish is exactly what a Fresnel term
 *            detects, so the one region the shading gives up on is the one region
 *            this marks darkest.
 *
 * ZERO BUNDLE COST. A few hundred bytes of GLSL string. That is the only reason
 * this fits: a texture dependency would have spent the 42 kB of headroom the
 * `three` chunk has against its 1100 kB ceiling.
 *
 * Pattern mirrors `revealShader.ts`, which is the proven onBeforeCompile in this
 * codebase. Scoped to `SurfaceMesh`, which `DrawStage` alone renders — `#/studio`
 * mounts `Folly`, not this, so the shared scene cannot be touched from here.
 *
 * ---------------------------------------------------------------------------
 * FOUR THINGS VERIFIED AGAINST three@0.169.0 RATHER THAN ASSUMED. Sai flagged
 * the first and could not run the build; the rest fell out of checking it.
 *
 * 1. CHUNK ORDER: `color_fragment` (index 2505) really does run BEFORE
 *    `normal_fragment_maps` (2726) in ShaderLib.physical.fragmentShader. Sai's
 *    catch was RIGHT, and the failure is louder than predicted: `vec3 normal` is
 *    DECLARED inside `normal_fragment_begin`, so a fresnel injected after
 *    `color_fragment` does not read a stale normal, it fails to COMPILE on an
 *    undeclared identifier. Hence two injection points, not one.
 * 2. `normal_fragment_maps` (2726) still precedes `lights_physical_fragment`
 *    (2879), so both passes land before lighting consumes the albedo. That is
 *    what keeps the ink lit rather than pasted on.
 * 3. `varying vec3 vViewPosition` is declared unconditionally in the physical
 *    fragment shader, and points FROM the fragment TOWARD the camera in view
 *    space — the same space as `normal`, so the dot product is meaningful.
 * 4. NO `extensions.derivatives` — deliberately omitted against the spec. three
 *    r169 is WebGL2-only (no `getContext('webgl')` path anywhere in the build, it
 *    emits `#version 300 es`, and the string `OES_standard_derivatives` does not
 *    appear at all). `fwidth` is core in GLSL ES 3.00. Setting
 *    `material.extensions` would have been dead code.
 * ---------------------------------------------------------------------------
 */
import * as THREE from 'three';

/**
 * The architect's site-plan contour interval, and not an arbitrary one: against
 * this engine's practical height field (roughly 0-3 m) it lands 8-12 rings
 * across the whole model — dense enough to read as texture, sparse enough to
 * stay quiet.
 */
export const CONTOUR_STEP_M = 0.25;
/**
 * Line width in SCREEN pixels, via `fwidth`. Screen-constant on purpose:
 * a world-width line thickens on a pulled-back shot and vanishes on a close
 * orbit, which reads as a broken texture rather than as a drawn line.
 */
export const CONTOUR_LINE_PX = 1.1;
export const CONTOUR_OPACITY = 0.3;
/** A darkened version of the skin's own `lo` (#8f7c56): ink, not a new hue. */
export const CONTOUR_COLOR = '#4a3d29';

export const FRESNEL_COLOR = '#3a2f1d';
export const FRESNEL_OPACITY = 0.45;
export const FRESNEL_POWER = 2.5;

/** Chunk markers, exported so the test can assert WHERE the injections land. */
export const COLOR_CHUNK = '#include <color_fragment>';
export const NORMAL_BEGIN_CHUNK = '#include <normal_fragment_begin>';
export const NORMAL_MAPS_CHUNK = '#include <normal_fragment_maps>';
export const LIGHTS_CHUNK = '#include <lights_physical_fragment>';
const BEGIN_VERTEX = '#include <begin_vertex>';

/**
 * GLSL has no implicit int-to-float promotion: `pow(x, 2)` does not compile, and
 * a bare `2` interpolated into a float expression is a build break rather than a
 * rounding bug. Everything numeric goes through here.
 */
export function glslFloat(n: number): string {
  const s = String(n);
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
}

/**
 * A hex colour as a LINEAR vec3, which is the only correct thing to mix into
 * `diffuseColor`.
 *
 * three's ColorManagement is on by default, so `new THREE.Color('#4a3d29')`
 * treats the hex as sRGB and stores linear components, and `SurfaceMesh`'s
 * vertex colours are written the same way — so the albedo this mixes into is
 * linear. Interpolating the naive `0x4a/255` instead would be visibly wrong
 * (0.29 against the true 0.068: an ink four times too light).
 */
export function glslVec3(hex: string): string {
  const c = new THREE.Color(hex);
  return `vec3( ${c.r.toFixed(5)}, ${c.g.toFixed(5)}, ${c.b.toFixed(5)} )`;
}

const VERTEX_HEAD = 'varying float vSkinWorldY;\n';
/** Mirrors revealShader's world-Y derivation, instancing guard included. */
const VERTEX_BODY = `${BEGIN_VERTEX}
  vec4 skinWp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    skinWp = instanceMatrix * skinWp;
  #endif
  skinWp = modelMatrix * skinWp;
  vSkinWorldY = skinWp.y;`;

const FRAGMENT_HEAD = 'varying float vSkinWorldY;\n';

/**
 * Contour, injected after `color_fragment` — where `diffuseColor` has just been
 * set from the vertex-colour gradient, so this composites ink ON TOP of the
 * wash and lighting still shades both.
 *
 * The `max(..., 1e-5)` is not defensive noise: `smoothstep(a, a, x)` is
 * undefined, and `fwidth` goes to zero on any horizontal run — which is
 * precisely the CROWN, the flattest and most-looked-at part of the canopy.
 */
const CONTOUR_BODY = `${COLOR_CHUNK}
  {
    float skinPh = vSkinWorldY / ${glslFloat(CONTOUR_STEP_M)};
    float skinBand = abs( fract( skinPh ) - 0.5 ) * 2.0;
    float skinW = max( fwidth( skinPh ) * ${glslFloat(CONTOUR_LINE_PX)}, 1e-5 );
    float skinLine = 1.0 - smoothstep( 0.0, skinW, skinBand );
    diffuseColor.rgb = mix( diffuseColor.rgb, ${glslVec3(CONTOUR_COLOR)}, skinLine * ${glslFloat(CONTOUR_OPACITY)} );
  }`;

/**
 * Fresnel, injected after `normal_fragment_maps` — the earliest point `normal`
 * is both declared and final, and still ahead of the lighting chunks. See the
 * header: putting this after `color_fragment` is a compile error, not a glitch.
 *
 * `SurfaceMesh` is DoubleSide, so `normal_fragment_begin` has already flipped
 * `normal` by `faceDirection` and the rim reads correctly from underneath too.
 */
const FRESNEL_BODY = `${NORMAL_MAPS_CHUNK}
  {
    vec3 skinViewDir = normalize( vViewPosition );
    float skinFres = pow( 1.0 - max( dot( normalize( normal ), skinViewDir ), 0.0 ), ${glslFloat(FRESNEL_POWER)} );
    diffuseColor.rgb = mix( diffuseColor.rgb, ${glslVec3(FRESNEL_COLOR)}, skinFres * ${glslFloat(FRESNEL_OPACITY)} );
  }`;

/** Applied once per material instance; a second call would force a recompile. */
const inked = new WeakSet<THREE.Material>();

/**
 * Inject both passes into a material three compiles from its own chunks.
 *
 * `customProgramCacheKey` is mandatory, not decorative: three caches programs by
 * type + defines, so two MeshStandardMaterials differing ONLY in their
 * `onBeforeCompile` silently share one compiled program, and which one wins
 * depends on compile order. Without a distinct key the ink would leak onto
 * `Folly` (which carries the reveal injection) or fail to appear here.
 */
export function applySkinInk(material: THREE.Material): void {
  if (inked.has(material)) return;
  inked.add(material);

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace(BEGIN_VERTEX, VERTEX_BODY);
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader.replace(COLOR_CHUNK, CONTOUR_BODY).replace(NORMAL_MAPS_CHUNK, FRESNEL_BODY);
  };
  material.customProgramCacheKey = () => 'bower-skin-ink';
  material.needsUpdate = true;
}
