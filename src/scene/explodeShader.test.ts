/**
 * explodeShader.test.ts — the cascade's shape, pinned without a GPU.
 *
 * `explodeLocalT` is the GLSL in the vertex body, transliterated. That
 * duplication is deliberate and is the only way this is testable at all: the
 * shader runs per vertex on a device this suite cannot reach, so the rule it
 * implements is kept here as a pure function and asserted. If the two ever
 * disagree, the GLSL is wrong — this is the definition.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EXPLODE_DISTANCE_FRAC,
  EXPLODE_STAGGER,
  applyExplode,
  explodeDistanceM,
  explodeLocalT,
  makeExplodeUniforms,
} from './explodeShader';

/** v = 0 is eave/ground (goes first), v = 1 is crown (goes last). */
const GROUND = 0;
const CROWN = 1;

describe('the cascade plays the assembly order, backwards', () => {
  it('has not moved anything at t=0', () => {
    for (const v of [GROUND, 0.5, CROWN]) expect(explodeLocalT(0, v)).toBe(0);
  });

  it('has moved EVERYTHING fully at t=1', () => {
    // The property that makes it a diagram rather than a mess: every piece is
    // legibly separated at full explode. Scaling distance by v would leave the
    // ground pieces barely moved, which reads as broken.
    for (const v of [GROUND, 0.25, 0.5, 0.75, CROWN]) expect(explodeLocalT(1, v)).toBeCloseTo(1, 9);
  });

  it('starts at the ground and ends at the crown', () => {
    // Senku's finding, and the reason the sequence is the concept rather than
    // decoration: this IS the install order, run in reverse.
    const mid = 0.5;
    expect(explodeLocalT(mid, GROUND)).toBeGreaterThan(explodeLocalT(mid, CROWN));
  });

  it('holds the crown still until its turn', () => {
    // The crown starts at exactly t = stagger. Before that it has not moved.
    expect(explodeLocalT(EXPLODE_STAGGER - 1e-6, CROWN)).toBe(0);
    expect(explodeLocalT(EXPLODE_STAGGER + 0.01, CROWN)).toBeGreaterThan(0);
  });

  it('moves the ground pieces from the first instant', () => {
    expect(explodeLocalT(0.01, GROUND)).toBeGreaterThan(0);
  });

  it('never leaves the 0..1 range, at any time or any v', () => {
    // Clamped both ends: an unclamped localT sends ground pieces past their
    // travel and into the next county at t=1.
    for (let t = -0.5; t <= 1.5; t += 0.05) {
      for (const v of [GROUND, 0.3, 0.7, CROWN]) {
        const lt = explodeLocalT(t, v);
        expect(lt).toBeGreaterThanOrEqual(0);
        expect(lt).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is monotonic in time for every piece', () => {
    // Nothing ever travels backwards mid-explode.
    for (const v of [GROUND, 0.5, CROWN]) {
      let prev = -1;
      for (let t = 0; t <= 1; t += 0.02) {
        const lt = explodeLocalT(t, v);
        expect(lt).toBeGreaterThanOrEqual(prev);
        prev = lt;
      }
    }
  });
});

describe('travel distance scales with the design, not with a guess', () => {
  it('is a fraction of the plan minor semi-axis', () => {
    expect(explodeDistanceM(2)).toBeCloseTo(2 * EXPLODE_DISTANCE_FRAC, 9);
  });

  it('opens a big footprint further than a small one', () => {
    // A flat metre figure would shred the smallest buildable footprint and
    // barely open the largest, across the 12-18 m² range.
    expect(explodeDistanceM(3.4)).toBeGreaterThan(explodeDistanceM(1.9));
  });
});

describe('applyExplode composes, and does not clobber the reveal', () => {
  it('PRESERVES an existing onBeforeCompile', () => {
    // The bug this guards is silent and total: applyReveal ASSIGNS
    // onBeforeCompile, and Folly puts both passes on the same materials. If
    // this assigned too, the reveal would stop cutting, the bake would go back
    // to being a jump cut, and nothing would error.
    const m = new THREE.MeshStandardMaterial();
    let revealRan = false;
    m.onBeforeCompile = () => {
      revealRan = true;
    };
    applyExplode(m, makeExplodeUniforms());

    const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '' };
    m.onBeforeCompile!(shader as never, null as never);
    expect(revealRan).toBe(true);
    expect(shader.vertexShader).toContain('aExplodeOffset');
  });

  it('composes the cache key rather than replacing it', () => {
    // Two materials differing only in their injection silently share one
    // compiled program without a distinct key. Reveal+explode must not collide
    // with reveal-only.
    const m = new THREE.MeshStandardMaterial();
    m.customProgramCacheKey = () => 'bower-reveal';
    applyExplode(m, makeExplodeUniforms());
    expect(m.customProgramCacheKey!()).toBe('bower-reveal|bower-explode');
  });

  it('is distinct from a material that only explodes', () => {
    const m = new THREE.MeshStandardMaterial();
    applyExplode(m, makeExplodeUniforms());
    expect(m.customProgramCacheKey!()).toBe('|bower-explode');
  });

  it('applies once, so chaining cannot stack on a re-render', () => {
    // Folly's ref callbacks fire on every re-render. Without the guard, each
    // one would wrap the previous chain and the shader would grow forever.
    const m = new THREE.MeshStandardMaterial();
    applyExplode(m, makeExplodeUniforms());
    const first = m.onBeforeCompile;
    applyExplode(m, makeExplodeUniforms());
    expect(m.onBeforeCompile).toBe(first);
  });

  it('undoes the instance matrix for instanced steel', () => {
    // The bug Sai's spec would have shipped: `transformed` is instance-LOCAL,
    // and instanceMatrix carries each plate's non-uniform scale (~[0.2, 0.008,
    // 0.2]). A raw normal added here gets squashed by the plate's own shape
    // instead of moving it outward.
    const m = new THREE.MeshStandardMaterial();
    applyExplode(m, makeExplodeUniforms());
    const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '' };
    m.onBeforeCompile!(shader as never, null as never);
    expect(shader.vertexShader).toContain('#ifdef USE_INSTANCING');
    expect(shader.vertexShader).toContain('inverse( mat3( instanceMatrix ) )');
  });

  it('wires the one uniform the clock drives', () => {
    const m = new THREE.MeshStandardMaterial();
    const u = makeExplodeUniforms();
    expect(u.uExplodeT.value).toBe(0);
    applyExplode(m, u);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <begin_vertex>', fragmentShader: '' };
    m.onBeforeCompile!(shader as never, null as never);
    expect(shader.uniforms.uExplodeT).toBe(u.uExplodeT);
  });
});
