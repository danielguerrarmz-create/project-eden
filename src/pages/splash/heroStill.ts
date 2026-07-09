/**
 * heroStill.ts — the single pre-rendered "beauty" still the timed hero cross-fades into
 * at the end of its reveal (Option 1: free procedural three.js motion -> one Fuser render).
 *
 * The live three.js scene owns the MOTION (logo -> structure, camera + wireframe->solid).
 * This still owns the final photoreal FRAME: it fades in over the resolved render so the
 * low-poly scene dissolves into a rendered image, then three.js stops drawing.
 *
 * Replace the placeholder file with the real Fuser render — see public/hero/v1/README.md
 * and docs/hero-fuser-prompt.md. Bump the version folder (v1 -> v2) to reland a new render.
 */
export const HERO_STILL = {
  /** Public path to the beauty still that cross-fades in at the end of the reveal.
   *  v3: the Eden pavilion in an Austin neighbourhood park at golden hour, framed at
   *  3:2 (5056x3392) with sky headroom so it covers the full-bleed hero without bars. */
  src: '/hero/v3/pavilion.jpg',
  placeholder: false,
} as const;

/**
 * Dev capture mode (`?capture=1`): freezes the hero at its FINAL frame (progress = 1) and,
 * via HeroScene, exposes `window.__captureHero()` to download the exact endpoint PNG. That
 * PNG is the structure-lock conditioning image for Fuser, so the still lines up pixel-for-
 * pixel with where the three.js reveal ends and the cross-fade never pops. The still layer
 * is suppressed in capture mode so the screenshot is pure geometry.
 */
export function isCaptureMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('capture');
  } catch {
    return false;
  }
}

/** Capture camera pose: `?capture=1&view=top` for the directly-overhead plan seed,
 *  otherwise the oblique hero angle. Used to pose the engine for each keyframe seed. */
export function captureView(): 'top' | 'oblique' {
  if (typeof window === 'undefined') return 'oblique';
  try {
    return new URLSearchParams(window.location.search).get('view') === 'top' ? 'top' : 'oblique';
  } catch {
    return 'oblique';
  }
}

/** Capture growth state: `?capture=1&grown=1` clothes the lattice in plants (the "living"
 *  seed); top view is rendered bare so the computed diamond lattice reads clean. */
export function captureGrown(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('grown');
  } catch {
    return false;
  }
}

/** Record mode: `?capture=1&record=1` plays the reveal once and captures the WebGL canvas
 *  (geometry only, no DOM chrome) to a clean .webm via MediaRecorder — the input for a
 *  Higgsfield video-to-video restyle, which keeps our exact geometry + motion and only
 *  re-skins the look. */
export function captureRecord(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isCaptureMode() && new URLSearchParams(window.location.search).has('record');
  } catch {
    return false;
  }
}
