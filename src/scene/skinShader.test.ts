/**
 * skinShader.test.ts — pins the injections against three's REAL shader source.
 *
 * three is pure JS and imports fine in the bare node env this suite runs in, so
 * these tests do not simulate three's chunk order from memory: they run the real
 * `onBeforeCompile` over `THREE.ShaderLib.physical.fragmentShader` and assert
 * where the injected GLSL lands.
 *
 * That is the whole point. The one bug this shader could plausibly have —
 * referencing `normal` before three declares it — is invisible to tsc, invisible
 * to a reviewer, and only shows up as a shader compile failure in a browser
 * nobody in this harness can open. Here it is a failing unit test.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CONTOUR_COLOR,
  CONTOUR_STEP_M,
  COLOR_CHUNK,
  LIGHTS_CHUNK,
  NORMAL_BEGIN_CHUNK,
  NORMAL_MAPS_CHUNK,
  applySkinInk,
  glslFloat,
  glslVec3,
} from './skinShader';

/** Run a material's onBeforeCompile over three's own physical shader. */
function compiled() {
  const material = new THREE.MeshStandardMaterial();
  applySkinInk(material);
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  } as unknown as THREE.WebGLProgramParametersWithUniforms;
  material.onBeforeCompile!(shader, null as never);
  return { material, ...shader };
}

describe('three@0.169 still has the chunk order this shader is built on', () => {
  const frag = THREE.ShaderLib.physical.fragmentShader;

  it('runs color_fragment BEFORE the normal chunks — Sai was right', () => {
    // The pre-emptive catch, pinned. If a future three ever reorders these, the
    // fresnel injection point becomes wrong and this says so in one line rather
    // than as a blank canvas in a browser.
    expect(frag.indexOf(COLOR_CHUNK)).toBeGreaterThan(-1);
    expect(frag.indexOf(COLOR_CHUNK)).toBeLessThan(frag.indexOf(NORMAL_BEGIN_CHUNK));
    expect(frag.indexOf(NORMAL_BEGIN_CHUNK)).toBeLessThan(frag.indexOf(NORMAL_MAPS_CHUNK));
  });

  it('declares `normal` inside normal_fragment_begin, so an early read cannot compile', () => {
    // Why the injection MUST be split rather than merely preferring to be: this
    // is a declaration, not an assignment to something already in scope.
    expect(THREE.ShaderChunk.normal_fragment_begin).toContain('vec3 normal');
  });

  it('still finalises normals BEFORE lighting consumes the albedo', () => {
    // What makes the ink lit material instead of paint on the lens.
    expect(frag.indexOf(NORMAL_MAPS_CHUNK)).toBeLessThan(frag.indexOf(LIGHTS_CHUNK));
  });

  it('declares vViewPosition, which the fresnel reads', () => {
    expect(frag).toContain('varying vec3 vViewPosition;');
  });
});

describe('the injections land in the right places', () => {
  it('puts the contour after color_fragment, where diffuseColor exists', () => {
    const { fragmentShader } = compiled();
    expect(fragmentShader.indexOf('skinPh')).toBeGreaterThan(fragmentShader.indexOf(COLOR_CHUNK));
  });

  it('puts the fresnel AFTER normal is declared and final', () => {
    // THE test. An injection that reads `normal` before normal_fragment_begin
    // is an undeclared identifier and the whole material fails to compile.
    const { fragmentShader } = compiled();
    const fresnel = fragmentShader.indexOf('skinFres');
    expect(fresnel).toBeGreaterThan(fragmentShader.indexOf(NORMAL_BEGIN_CHUNK));
    expect(fresnel).toBeGreaterThan(fragmentShader.indexOf(NORMAL_MAPS_CHUNK));
  });

  it('puts BOTH passes before the lighting chunk', () => {
    // Both write diffuseColor; after lighting they would do nothing at all.
    const { fragmentShader } = compiled();
    const lights = fragmentShader.indexOf(LIGHTS_CHUNK);
    expect(fragmentShader.indexOf('skinPh')).toBeLessThan(lights);
    expect(fragmentShader.indexOf('skinFres')).toBeLessThan(lights);
  });

  it('carries world Y from the vertex shader', () => {
    const { vertexShader, fragmentShader } = compiled();
    expect(vertexShader).toContain('varying float vSkinWorldY;');
    expect(vertexShader).toContain('vSkinWorldY = skinWp.y;');
    expect(fragmentShader).toContain('varying float vSkinWorldY;');
  });

  it('keeps the chunks it injects around, rather than replacing them', () => {
    // The injection appends to the chunk; dropping the chunk itself would
    // silently delete three's own colour/normal work.
    const { fragmentShader } = compiled();
    expect(fragmentShader).toContain(COLOR_CHUNK);
    expect(fragmentShader).toContain(NORMAL_MAPS_CHUNK);
  });

  it('writes only the albedo: never emissive, never a HUD', () => {
    // The anti-Jarvis rule, as an assertion. Both passes mix into diffuseColor
    // and nothing else.
    const { fragmentShader } = compiled();
    const injected = fragmentShader.slice(0, fragmentShader.indexOf(LIGHTS_CHUNK));
    expect(injected).not.toContain('emissive +=');
    expect(injected).not.toContain('gl_FragColor =');
    expect((fragmentShader.match(/diffuseColor\.rgb = mix/g) ?? []).length).toBe(2);
  });

  it('sets a distinct program cache key', () => {
    // Mandatory with onBeforeCompile: two materials differing only in their
    // injection silently share one compiled program otherwise, and the ink
    // would leak onto Folly (which carries the reveal) or never appear here.
    const { material } = compiled();
    expect(material.customProgramCacheKey!()).toBe('bower-skin-ink');
    expect(material.customProgramCacheKey!()).not.toBe('bower-reveal');
  });

  it('applies once per material, so a re-render cannot force a recompile', () => {
    const m = new THREE.MeshStandardMaterial();
    applySkinInk(m);
    const first = m.onBeforeCompile;
    applySkinInk(m);
    expect(m.onBeforeCompile).toBe(first);
  });
});

describe('the GLSL is emittable GLSL', () => {
  it('never emits a bare int where a float is required', () => {
    // `pow(x, 2)` does not compile in GLSL: there is no int->float promotion,
    // so an integer-valued constant is a build break, not a rounding bug.
    expect(glslFloat(2)).toBe('2.0');
    expect(glslFloat(2.5)).toBe('2.5');
    expect(glslFloat(0.3)).toBe('0.3');
  });

  it('emits every tunable as a float', () => {
    const { fragmentShader } = compiled();
    const block = fragmentShader.slice(
      fragmentShader.indexOf('skinPh'),
      fragmentShader.indexOf(LIGHTS_CHUNK),
    );
    // No `/ 0` or `, 2)` style bare ints anywhere in what we generated.
    expect(block).not.toMatch(/\/\s*\d+\s*;/);
    expect(block).toContain(glslFloat(CONTOUR_STEP_M));
  });

  it('emits LINEAR colour, not raw sRGB — the invisible four-times-too-light bug', () => {
    // ColorManagement is on, so SurfaceMesh's vertex colours are linear and the
    // albedo this mixes into is linear. Interpolating 0x4a/255 = 0.29 instead of
    // the true 0.068 would look merely "a bit washed out" and be very hard to
    // trace back to a colour-space mistake.
    const c = new THREE.Color(CONTOUR_COLOR);
    const emitted = glslVec3(CONTOUR_COLOR);
    expect(emitted).toContain(c.r.toFixed(5));
    expect(emitted).not.toContain((0x4a / 255).toFixed(5));
    expect(c.r).toBeLessThan(0x4a / 255); // linear is darker than naive sRGB
  });

  it('guards fwidth against the flat crown', () => {
    // smoothstep(a, a, x) is undefined and fwidth is 0 on any horizontal run —
    // which is exactly the crown, the flattest and most-looked-at surface here.
    const { fragmentShader } = compiled();
    expect(fragmentShader).toContain('max( fwidth( skinPh )');
  });
});
