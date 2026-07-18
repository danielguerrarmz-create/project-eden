/**
 * InkPass.tsx — mounts the watercolour/sketch pass over an R3F canvas.
 *
 * Owns the render loop for the frame it lives on. R3F renders the scene itself
 * on every frame UNLESS a `useFrame` callback takes a priority above 0, at which
 * point R3F hands rendering to that callback (a documented pattern, no new
 * dependency). This component takes priority 1 and renders through an
 * `EffectComposer` instead: RenderPass (scene colour) -> InkPass ShaderPass ->
 * OutputPass, all from `three/examples/jsm`. See Senku's research §2/§10.
 *
 * THE G-BUFFER MUST MATCH THE COLOUR RENDER'S VERTICES. Edges come from a
 * second render of the scene with an override `MeshNormalMaterial` (normals in
 * RGB, plus an attached depth texture). If that prepass used a plain normal
 * material, it would draw the un-revealed / un-exploded geometry while the
 * colour buffer shows it mid-bake or mid-explode, and the edge lines would trace
 * ghosts in empty space. So the SAME reveal + explode vertex injections the
 * timber materials carry are applied to the override material too, sharing the
 * same uniform objects by reference — the normal buffer moves exactly as the
 * colour buffer does. In the studio (no bake, no explode) neither is passed and
 * the override stays a plain normal material.
 */
import { useEffect, useMemo, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { makeInkShader } from './inkShader';
import { applyReveal, type RevealUniforms } from '../revealShader';
import { applyExplode, type ExplodeUniforms } from '../explodeShader';

export function InkPass({
  mode = 1,
  modeRef,
  revealUniforms,
  explodeUniforms,
}: {
  /** Constant mode when there is no soft phase (studio is always wash = 1). */
  mode?: number;
  /** When set, `uMode` tracks this every frame — the draw page threads its
   *  bake-reveal progress here so sketch (0) crossfades to wash (1) at bake. */
  modeRef?: MutableRefObject<number>;
  /** Pass the draw page's bake-reveal uniforms so the normal prepass clips at
   *  the same sweep height the timber does. Omit in the studio. */
  revealUniforms?: RevealUniforms;
  /** Pass the draw page's explode uniforms so the normal prepass travels with
   *  the pieces. Omit in the studio. */
  explodeUniforms?: ExplodeUniforms;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // The normal+depth G-buffer target. Sized to the drawing buffer in the resize
  // effect below; the 1x1 here is a placeholder until that runs.
  const normalTarget = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(1, 1);
    t.depthTexture = new THREE.DepthTexture(1, 1);
    t.depthTexture.type = THREE.UnsignedIntType;
    return t;
  }, []);

  // The override material for the normal prepass, carrying the same vertex
  // injections the real timber materials do (see the header). Applied once.
  const normalMaterial = useMemo(() => {
    const m = new THREE.MeshNormalMaterial();
    if (revealUniforms) applyReveal(m, revealUniforms);
    if (explodeUniforms) applyExplode(m, explodeUniforms);
    return m;
  }, [revealUniforms, explodeUniforms]);

  const { composer, ink } = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const inkPass = new ShaderPass(makeInkShader());
    c.addPass(inkPass);
    c.addPass(new OutputPass());
    return { composer: c, ink: inkPass };
  }, [gl, scene, camera]);

  useEffect(() => {
    return () => {
      composer.dispose();
      normalTarget.dispose();
      normalTarget.depthTexture?.dispose();
      normalMaterial.dispose();
    };
  }, [composer, normalTarget, normalMaterial]);

  // Keep every render target and the resolution uniform sized to the real
  // drawing buffer (CSS size x device pixel ratio).
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const bw = Math.max(1, Math.floor(size.width * dpr));
    const bh = Math.max(1, Math.floor(size.height * dpr));
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    normalTarget.setSize(bw, bh);
    ink.uniforms.resolution.value.set(bw, bh);
  }, [size, gl, composer, ink, normalTarget]);

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    ink.uniforms.uMode.value = modeRef ? modeRef.current : mode;
    ink.uniforms.uTime.value = state.clock.elapsedTime;
    ink.uniforms.cameraNear.value = cam.near;
    ink.uniforms.cameraFar.value = cam.far;

    // --- Normal + depth prepass. Suppress the shadow-map rebuild here; the
    // composer's RenderPass rebuilds it once for the colour render, so doing it
    // twice a frame is wasted work. ---
    const prevOverride = scene.overrideMaterial;
    const prevBg = scene.background;
    const prevAuto = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    scene.overrideMaterial = normalMaterial;
    scene.background = null;
    gl.setRenderTarget(normalTarget);
    gl.clear();
    gl.render(scene, cam);
    gl.setRenderTarget(null);
    scene.overrideMaterial = prevOverride;
    scene.background = prevBg;
    gl.shadowMap.autoUpdate = prevAuto;

    ink.uniforms.tNormal.value = normalTarget.texture;
    ink.uniforms.tDepth.value = normalTarget.depthTexture;

    composer.render();
  }, 1);

  return null;
}
