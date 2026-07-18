/**
 * toonGradient.ts — the banded light-to-shadow ramp every painted surface shares.
 *
 * `MeshToonMaterial` reads a `gradientMap`: a 1-D texture that remaps N·L (the
 * smooth PBR light falloff) into a few hard steps, so light reads as PAINTED
 * rather than rendered (the Gooch/cel-shading family, Senku's §7). Nearest
 * filtering keeps the band edges crisp — linear would smear them back into a
 * gradient and defeat the point.
 *
 * ONE ramp, shared by timber, steel and foliage, so the banding logic lives in
 * exactly one place (spec A5). The ramp is colour-agnostic: it only decides
 * WHERE the bands fall; each material's own colour rides on top, so the same
 * texture paints a brown strut and a green leaf. The warm umber shadow SHIFT
 * itself is not here — it lives as one switchable term in the InkPass wash
 * (spec A4) — this only lifts the darkest band off pure black so a toon shadow
 * reads as a painted dark, not a hole.
 */
import * as THREE from 'three';

/**
 * Four steps. The floor sits at 0.30, not 0, so shadow bands stay warm-paintable
 * rather than crushing to black under this page's low-ambient rig. Eyeball-tunable
 * against a real render, same discipline as every unsourced number in this repo.
 */
export const TOON_STEPS = [0.3, 0.55, 0.78, 1.0] as const;

/** Build a nearest-filtered N-step grayscale gradient map. */
export function makeToonGradient(steps: readonly number[] = TOON_STEPS): THREE.DataTexture {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((s, i) => {
    const v = Math.round(THREE.MathUtils.clamp(s, 0, 1) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The shared singleton. Imported by every `MeshToonMaterial` in the scene so
 * they band identically. Module-scoped and never disposed on purpose: it is a
 * handful of texels that lives for the life of the page, like a font.
 */
export const toonGradient = /* @__PURE__ */ makeToonGradient();

/**
 * A higher-floored ramp for the LIVING layer (stems + blooms). Live QA found the
 * plants' saturated colours crushing to umber-tan: the toon shadow bands dropped
 * their luma below the wash's shadow-shift threshold, so a pink flower painted as
 * brown timber. A 0.62 floor keeps foliage and blooms luminous enough to hold
 * their hue through the wash. Timber and steel keep the deeper `toonGradient`.
 */
export const PLANT_STEPS = [0.62, 0.76, 0.9, 1.0] as const;
export const plantGradient = /* @__PURE__ */ makeToonGradient(PLANT_STEPS);
