/**
 * SkyGradient.tsx — a soft vertical sky behind the watercolour stage.
 *
 * Round 4 (Daniel: "think Enscape"): the stage sat on flat paper; he wants the
 * beautiful default Enscape sky instead. This paints a subtle vertical gradient
 * from a DESATURATED AZURE at the zenith down to a PALE NEAR-WHITE horizon, set
 * as `scene.background` so it renders first (behind everything) and then — for
 * free — flows through the same Kuwahara + grain wash the timber does, so it
 * reads as a softly granulated watercolour sky, not a photoreal HDRI.
 *
 * WHY A BACKGROUND TEXTURE, NOT A SKY DOME. A dome is geometry: it would feed
 * the normal/depth G-buffer and the Sobel pass could ink a horizon seam or dome
 * edges. A `scene.background` texture writes no depth and no normals, so it adds
 * ZERO ink edges — the object silhouette still reads (object depth vs the far
 * plane the sky leaves behind). `InkPass` nulls `scene.background` during its
 * normal prepass and restores it, so the sky never pollutes the edge buffer.
 *
 * The colours are eyeball constants for live QA, like every other tone here.
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Desaturated azure at the zenith (top of frame). */
export const SKY_ZENITH = '#9cc0dd';
/** Pale near-white with a faint cool cast at the horizon (bottom of frame). */
export const SKY_HORIZON = '#eaf1f5';

/**
 * A 1xN vertical gradient. `DataTexture` (flipY defaults false) maps row 0 to
 * screen v=0 (bottom → horizon) and the last row to v=1 (top → zenith); the
 * background plane samples full-height regardless of aspect, so the gradient
 * always runs top-to-bottom. sRGB so it linearises correctly before tone-map.
 */
export function makeSkyGradientTexture(height = 64): THREE.DataTexture {
  const zenith = new THREE.Color(SKY_ZENITH);
  const horizon = new THREE.Color(SKY_HORIZON);
  const data = new Uint8Array(height * 4);
  const scratch = new THREE.Color();
  for (let i = 0; i < height; i++) {
    const t = i / (height - 1); // 0 at bottom (horizon) -> 1 at top (zenith)
    // Bias the transition so most of the frame is open sky and the pale band
    // hugs the horizon, the way an Enscape sky does.
    const eased = t * t * (3 - 2 * t);
    scratch.copy(horizon).lerp(zenith, eased);
    const o = i * 4;
    data[o] = Math.round(scratch.r * 255);
    data[o + 1] = Math.round(scratch.g * 255);
    data[o + 2] = Math.round(scratch.b * 255);
    data[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Mount inside a `<Canvas>` in place of a `<color attach="background">`. Owns
 * its texture (disposed on unmount) and restores whatever background was there
 * before, so it is safe to add or remove without leaking.
 */
export function SkyGradient() {
  const scene = useThree((s) => s.scene);
  const texture = useMemo(() => makeSkyGradientTexture(), []);
  useEffect(() => {
    const prev = scene.background;
    scene.background = texture;
    return () => {
      scene.background = prev;
      texture.dispose();
    };
  }, [scene, texture]);
  return null;
}
