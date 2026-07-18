/**
 * GradientSky.tsx — a watercolour blue sky behind the scene (round-4).
 *
 * Daniel's round-4 note: the flat paper background reads dead; he wants what
 * Enscape does by default, a soft blue sky. A sky is CONTENT, not a decorative
 * UI mark, so it is exempt from the house no-blue rule (round-4 brief item 3).
 *
 * The gradient lives IN the scene (set as `scene.background`) rather than as a
 * DOM layer, specifically so the InkPass wash paints it too: the sky gets the
 * same Kuwahara/grain treatment as everything else and reads as a painted sky,
 * and the building silhouettes against it get a clean ink edge from the depth
 * discontinuity. A tiny canvas gradient texture, effectively free against the
 * bundle (no asset fetch).
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Zenith -> horizon, tuned to read as a soft Enscape sky once the wash desaturates it. */
const SKY_ZENITH = '#6f9fd0';
const SKY_MID = '#a9c9e6';
const SKY_HORIZON = '#dde9ef';

/** The horizon tone, exported so each canvas can match its fog to it. */
export const SKY_HORIZON_COLOR = SKY_HORIZON;

/** Build the vertical gradient sky as a small CanvasTexture (browser only). */
export function makeSkyTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, SKY_ZENITH);
  g.addColorStop(0.55, SKY_MID);
  g.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Set the gradient as the scene background for the life of the canvas. A
 * component with an effect rather than `<color attach="background">` so nothing
 * reconciles the texture away on re-render, and it restores the prior background
 * on unmount.
 */
export function GradientSky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const tex = makeSkyTexture();
    const prev = scene.background;
    scene.background = tex;
    return () => {
      scene.background = prev;
      tex.dispose();
    };
  }, [scene]);
  return null;
}
