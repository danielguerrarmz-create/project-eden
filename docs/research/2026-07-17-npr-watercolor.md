# NPR watercolor + pencil-sketch rendering — research for the beauty pass

Gates item 3 of `docs/handoffs/2026-07-17-round-3-brief.md`. Written for Sai to spec and
Edward to build without further research. Stack verified in this worktree: `three` ^0.169.0,
`@react-three/fiber` ^8.17.10, `@react-three/drei` ^9.114.0, Vite build, no postprocessing
library installed. `three` vendor chunk measured at ~1058 kB against a 1100 kB ceiling
(~41 kB headroom). Scene uses `InstancedMesh` for 200+ pieces with animated explode/reassemble
that must stay smooth at 1440x900.

## 1. What Enscape's artistic mode actually does (decomposed from the two references)

From Chaos's own engineer walkthrough (blog.chaos.com) and the ArchDaily product page, Enscape's
watercolor and sketch modes are built from a small set of independently-tunable parameters, not
one monolithic filter:

- **Watercolor**: a "Color Gradient" control that washes/desaturates and shifts hue in shadow
  (the engineer's own example: "that sweet blue hue in the shadows"); a "Surface Detail" control
  that ranges from smooth cel-shaded blocks of color (0%) to visible painterly brushwork (89%+);
  a "Bleeding" effect where color visibly seeps across surface borders, softening the boundary
  between adjacent materials; an "Outlines" control (off/thin/normal/thick) — the engineer notes
  turning outlines off and pushing bleeding up gives the roughest, most paint-like read; glass
  renders lighter/more translucent than other objects.
- **Sketch (pen/pencil/colored pencil)**: line "Outlines" thickness plus a "Jitter" control that
  adds irregularity to line placement (the hand-tremor read); "Hatched Shadows" for cross-hatched
  tonal fill instead of flat shading; three tonal variants (B&W pen, grayscale pencil, colored
  pencil); reduced detail overall, explicitly described as a "maquette" or sciagraphic
  presentation style.

Translated into shader primitives, that's: (a) a paint-filtering/smoothing operator for the
brushwork-vs-smooth axis, (b) a wash/desaturation + shadow color-shift pass, (c) edge/contour
lines driven off geometry not texture (so they read as drawn strokes, not material boundaries),
(d) a jitter/wobble term for the hand-drawn read, (e) hatching as a distinct mode for the
pencil/sketch read. Paper granulation and texture are implied by the "brushwork" language but
not named as a distinct Enscape control — that's the one piece to source from the wider NPR
literature rather than the references themselves.

## 2. Post-processing infrastructure: cost is near-zero, it's already inside `three`

`EffectComposer`, `RenderPass`, `ShaderPass`, `OutputPass`, and `SobelOperatorShader` all live at
`three/examples/jsm/...` inside the already-installed `three` package (verified: present in this
worktree's `node_modules/three/examples/jsm/postprocessing/` and `.../shaders/`). They are **not**
a new dependency — importing them only pulls their own module code into the bundle, since the
`three` core classes they depend on (`WebGLRenderTarget`, `ShaderMaterial`, `Vector2`, `Clock`,
etc.) are already in the vendor chunk today.

I read the actual source files to ground the estimate rather than guess:

| File | Lines | Approx. raw size |
|---|---|---|
| `EffectComposer.js` | 232 | ~5.5 KB |
| `Pass.js` (+`FullScreenQuad`) | 96 | ~2.0 KB |
| `RenderPass.js` | 100 | ~2.3 KB |
| `ShaderPass.js` | 78 | ~1.8 KB |
| `OutputPass.js` | 98 | ~2.7 KB |
| `SobelOperatorShader.js` | 93 | ~2.6 KB |

That's ~17 KB of raw source for the whole chain (composer + render + shader pass + output +
one edge shader), almost entirely boilerplate class bodies with a handful of GLSL string
literals. Minified+gzipped this class of code typically lands well under 30% of raw size — a
realistic estimate is **5–9 KB gzipped for the entire pipeline**, comfortably inside the 41 KB
headroom even before adding the custom watercolor/sketch fragment shader (a single extra GLSL
string, on the order of 1–3 KB more). I could not run the actual Vite build from this research
pass (no shell access in this role) — **Edward should confirm with the real `vite build` output
or `rollup-plugin-visualizer` before treating this as locked**, but the file-level evidence says
this is not where the bundle risk lives.

## 3. Rejected comparison: `@react-three/postprocessing` + `postprocessing`

`@react-three/postprocessing` wraps the standalone `postprocessing` npm package (pmndrs/
react-postprocessing on GitHub), which ships its own effect composer, its own pass/effect class
hierarchy, and dozens of built-in effects — it duplicates almost everything `three/examples/jsm`
already provides, as a net-new dependency. I was not able to pull a live Bundlephobia number for
`postprocessing` in this session (the fetch didn't return the size panel) — **do not treat any
specific KB figure for it as sourced; get the real number from bundlephobia.com/package/
postprocessing before citing one.** The structural argument holds regardless of the exact figure:
there is no capability this task needs (a single custom Kuwahara/Sobel/wash `ShaderPass`) that
requires the extra library, and adding a second, parallel effects framework on top of the one
already inside `three` is the wrong shape for a 41 KB budget. Recommendation: don't install it.

## 4. Edge/contour lines: use screen-space Sobel-on-G-buffer, not OutlinePass or per-mesh outlines

Three candidate techniques, ranked by fit for 200+ animated `InstancedMesh` pieces:

- **`OutlinePass`** (three/examples/jsm/postprocessing/OutlinePass.js): reject. Confirmed via a
  real, still-open three.js issue that `OutlinePass` does not support `InstancedMesh` — mixing
  instanced and regular meshes throws, or hovering one instance outlines the entire instance set
  ([mrdoob/three.js#18533](https://github.com/mrdoob/three.js/issues/18533)). It's also
  independently documented as expensive on complex geometry and got measurably slower starting
  at three.js r116 ([mrdoob/three.js#20401](https://github.com/mrdoob/three.js/issues/20401),
  [#20660](https://github.com/mrdoob/three.js/issues/20660)). Wrong tool for this scene twice
  over.
- **drei `<Outlines>`** (inverted-hull per mesh): partial fit, not recommended as primary. Drei's
  own docs list `<instancedMesh>` as a supported parent and describe the technique as extracting
  the parent's geometry and rendering an inverted hull — but the documentation does not specify
  per-instance color/width control or confirm the hull itself is instanced alongside the source
  mesh, and community discussion around instanced outlining
  ([pmndrs/react-three-fiber#1410](https://github.com/pmndrs/react-three-fiber/discussions/1410))
  shows people working around exactly this uncertainty with duplicate-geometry tricks. Even in
  the best case it doubles per-instance draw cost during the explode animation. Worth a spike if
  Edward wants per-piece contour control later, not the gating path now.
- **Screen-space Sobel edge detection on a normal+depth G-buffer, as a `ShaderPass`**: recommended.
  Cost is a function of screen resolution, not instance count or geometry complexity — this is
  the property that makes it survive 200+ instanced, animated pieces without any per-object
  bookkeeping. `three/examples/jsm/shaders/SobelOperatorShader.js` is the reference 3x3-kernel
  implementation already in the installed package (verified by reading it directly, see above).
  Run it against normals+depth rather than the diffuse buffer specifically so contours trace
  silhouettes and creases, not shadow boundaries or material edges — this is explicitly the
  three.js forum's own recommended refinement over diffuse-only Sobel
  ([discourse.threejs.org/t/edge-detection-with-normal-and-depth/7929](https://discourse.threejs.org/t/edge-detection-with-normal-and-depth/7929)).
  A second, independently reusable proof of this exact technique working end-to-end in three.js
  is `mayacoda/pencil-lines` (Codrops tutorial, "Sketchy Pencil Effect with Three.js
  Post-Processing," tympanus.net/codrops/2022/11/29/) — it renders the scene twice (color +
  `MeshNormalMaterial` normal buffer), Sobel-detects both, blends diffuse-edges at low weight
  (~0.6 in their write-up terms) with normal-edges at higher weight, and distorts the sampling UVs
  with a noise field for the hand-tremor line wobble. That is close to a drop-in reference for
  both watercolor contours and sketch-mode hatching in this codebase, and the GitHub source is
  real and citable, not paraphrased secondhand.

## 5. Paint-filtering (the "brushwork/wash" look): Kuwahara filter, single pass

The generalized Kuwahara filter is the standard real-time technique for the "smoothed into flat
color regions with preserved edges" painterly look — it divides a kernel around each pixel into
sectors, computes each sector's mean and variance, and outputs the mean of the lowest-variance
sector, which flattens noise while keeping sharp transitions intact. Two real, citable
implementations ground this:

- **Maxime Heckel, "On Crafting Painterly Shaders"** (blog.maximeheckel.com/posts/
  on-crafting-painterly-shaders/): full technical progression from the basic 4-sector box-kernel
  Kuwahara (visibly "boxy" artifacts) through the Papari extension (8-sector circular kernel with
  Gaussian sector weighting for smoother falloff) to the anisotropic version (Sobel-derived
  structure tensor rotates and stretches the kernel to follow local edge direction, multi-pass).
  Explicitly reports replacing the Gaussian weighting with a cheaper polynomial approximation to
  hit real-time budgets, and states the target is "close to 60fps."
- **"Susurrus" (Codrops, April 2026)**: a shipped three.js/WebGL project whose *entire* visual
  style is carried by one Kuwahara-based pass — the author's own words, "the only post-processing
  pass in the project." They deliberately simplified further than Heckel's anisotropic version
  (skipped the tensor pass, simplified the vertex stage) specifically to keep per-frame cost down,
  trading some effect strength at close camera distance for headroom. That's the right trade for
  this scene too.

**Recommendation for this codebase**: implement a simplified (non-anisotropic) Kuwahara —
4-sector box or Papari 8-sector circular kernel, small radius (radius 3–4 px is the common
real-time-safe range in both sources above) — as one stage inside the same custom `ShaderPass`
that does the wash/color work, not as a separate composer pass. Skip the anisotropic
structure-tensor variant; it needs an extra Sobel pre-pass on top of the one already needed for
edges, doubles shader complexity, and neither reference source treats it as necessary for a
real-time watercolor read. If profiling at 1440x900 shows the Kuwahara sampling is the actual
bottleneck (it's the one part of this pipeline with a real per-pixel sample-count cost, unlike
the O(1)-per-pixel Sobel and wash math), first move is shrinking the kernel radius before cutting
the technique entirely.

## 6. Paper granulation: procedural noise, not a texture asset

Prefer procedural value/gradient noise generated in-shader over a tiled paper texture image:
zero additional bytes in the network/bundle budget (a texture asset would need to ship as a
static file and be loaded, outside the JS bundle ceiling but still a real cost against the
"filmable, load-fast" bar), inherently tileable with no seams to manage, and easy to animate
(subtle grain drift) if wanted later. The pencil-lines project (§4 above) already demonstrates
the adjacent technique — Inigo Quilez's gradient noise function, a small, well-known, easily
reproduced GLSL snippet — used there to modulate normal contribution; the same noise function is
the natural source for both paper grain (sampled at a fixed low frequency, modulating a
granulation-darkening term mostly in shadow regions, echoing Enscape's "Surface Detail") and the
hand-tremor UV wobble (sampled at a different frequency, offsetting the UVs fed into the Kuwahara
and Sobel taps, echoing Enscape's sketch-mode "Jitter"). One noise function, two uses, no texture
fetch.

## 7. Shading: `MeshToonMaterial` + gradient map, keep it out of the post pass

Rather than doing all shading work in the post-process pass, put the "washed"/banded light-to-
shadow read into the per-material shading itself: three's built-in `MeshToonMaterial` with a
custom `gradientMap` (a tiny `DataTexture`, effectively free against the budget — a handful of
texels, not a real texture asset) produces stepped tonal bands instead of a smooth PBR falloff,
which is the core of the Gooch/cel-shading family of NPR techniques and reads as "painted light"
rather than "rendered light." `MeshToonMaterial` is core three (not `examples/jsm`), so this adds
effectively zero bundle cost beyond the material class already being part of the base library.
It also plays cleanly with `InstancedMesh` — instancing constrains per-instance transform/color,
not material type, so there's no compatibility risk here the way there is with `OutlinePass`.
Recommendation: swap the explode/reassemble pieces' material to `MeshToonMaterial` with a 3–4
step gradient map tuned toward Enscape's "sweet blue hue in the shadows" (bias the darkest band
toward a cool desaturated blue rather than a neutral dark), and let the post pass focus on
granulation, wobble, edges, and wash rather than also carrying the light/shadow banding. This
splits the NPR look across two cheap layers instead of one expensive one.

## 8. Soft shadows within budget

Two real options exist inside core `three` (both zero additional bundle cost, since shadow map
types are configured on the renderer, not imported as separate modules):

- **`VSMShadowMap`**: set `renderer.shadowMap.type = THREE.VSMShadowMap` and raise
  `light.shadow.radius`/blur sample count for a soft-edged, painterly shadow — this is the
  pragmatic default recommendation, since it's a renderer flag with no additional shader code to
  write or maintain, and Enscape's own soft-shadow read doesn't need PCSS-grade physical
  correctness to sell the watercolor illusion.
- **PCSS (percentage-closer soft shadows)**: three.js ships a reference example
  (`webgl_shadowmap_pcss.html`) implementing variable-penumbra shadows via Poisson-disk sampling,
  where penumbra width scales with `(distanceToReceiver − distanceToBlocker) × lightRadius /
  distanceToBlocker` — physically-motivated soft shadows where objects further from their
  occluder get a wider, softer penumbra. This is not a drop-in `examples/jsm` module the way
  `SobelOperatorShader` is; the reference example patches shader chunks directly, which is more
  integration work and more shader-maintenance surface. Treat as an upgrade path only if VSM's
  softness reads too uniform/flat once the rest of the NPR pass is in.

Recommendation: ship VSM first: it is strictly less code, strictly less risk, and the difference
between VSM-soft and PCSS-soft is likely to read as noise once granulation and the wash pass are
sitting on top of it.

## 9. Sketch mode (pre-bake) shares infrastructure with watercolor (post-bake)

The brief's request — pencil-sketch during the draw/explode phase, watercolor arriving at bake —
maps cleanly onto the pipeline above without needing a second composer or a second render of the
scene:

- Both modes need the **same normal+depth G-buffer render** (one extra `RenderPass` with an
  override `MeshNormalMaterial`, or a `WebGLRenderTarget` with a depth texture attached).
- Both modes need the **same Sobel edge pass** over that G-buffer.
- Both modes want the **same noise function** for wobble (sketch: line jitter; watercolor: paper
  grain + hand-tremor).
- They diverge only in the **final composite stage**: sketch mode outputs grayscale hatched lines
  (edges + a screen-space hatching/Tonal-Art-Map-style tonal fill, no color, no Kuwahara) —
  Tonal Art Maps as a named real-time hatching technique are documented in Alastair Aitchison's
  "Hand-Drawn Shaders and creating Tonal Art Maps" (alastaira.wordpress.com/2013/11/01/); watercolor
  mode adds the Kuwahara wash, color desaturation/gradient, and granulation on top of the same
  edge/noise inputs, in color.

**Concrete build shape for Edward**: one `InkPass` (custom `ShaderPass`) reading from two shared
render targets (scene color, normal+depth), parameterized by a `mode` uniform or shader `#define`
(`SKETCH` vs `WASH`) so the two visual states are two branches of one shader program, not two
maintained pipelines. The transition at bake time (sketch → watercolor) becomes a uniform
crossfade or defines-swap on the same composer rather than swapping composers, which is also the
cheapest way to keep it smooth against the explode/reassemble animation already running.

## 10. Ranked recommendation

**Primary approach** (build this):
1. `EffectComposer` + `RenderPass` (scene color) + a second normal+depth `RenderPass`
   (override `MeshNormalMaterial`) + one custom `InkPass` `ShaderPass` + `OutputPass`, all from
   `three/examples/jsm`, no new npm dependency.
2. `InkPass` fragment shader, single pass, composed of: Sobel edges on the normal+depth buffer
   (contours); simplified (non-anisotropic) Kuwahara filter, radius 3–4px, for paint-flattening
   (watercolor mode only); procedural gradient-noise for paper grain + hand-tremor UV wobble
   (both modes); desaturation/color-gradient wash + posterize-lite banding (watercolor mode
   only); grayscale hatching/tonal fill (sketch mode only) — one shader, mode-switched by
   `#define`.
3. `MeshToonMaterial` + small custom gradient map on the instanced timber pieces for banded
   toon/Gooch shading, replacing standard PBR materials — keeps shading cost off the post pass.
4. `VSMShadowMap` with a wider shadow radius for soft shadows.
5. Shared G-buffer + shared noise between sketch (pre-bake) and watercolor (post-bake) modes,
   switched by uniform/define on one `InkPass`, not two composers.

**Fallback if the full pass is too expensive at 1440x900** (unlikely given all components are
either O(pixels) or O(1) per instance, but the Kuwahara sampling is the one true per-pixel-cost
unknown): drop the Kuwahara stage first (shrink radius, then cut), keep Sobel edges + toon
gradient-map shading + procedural grain + VSM shadows. Still reads as NPR/hand-rendered, loses
the "painterly smoothing" layer specifically.

**Estimated bundle delta**: roughly 6–12 KB gzipped total (5–9 KB for the composer/pass/shader
scaffolding measured from real source files, +1–3 KB for the custom `InkPass` GLSL), against
~41 KB of headroom — verify against the real Vite build before treating as final, but nothing in
this plan requires a new npm dependency, which is the actual risk this budget exists to guard
against.

**Rejected**: `@react-three/postprocessing` / `postprocessing` npm package (duplicate
functionality as a net-new dependency; see §3), `OutlinePass` (broken with `InstancedMesh`, see
§4), full anisotropic Kuwahara (extra structure-tensor pass not needed for this scene's read, see
§5), tiled paper texture image (procedural noise is free and seamless, see §6), PCSS as the
default (more integration work than VSM for a difference likely invisible under the rest of the
pass, see §8).

## Sources (all fetched or read directly this session)

- Chaos, "Enscape Artistic Mode: styles & tips" — blog.chaos.com/enscape-artistic-mode-styles-tips-rendering-engineer
- ArchDaily product catalog, "How to express design ideas with artistic visual modes" — archdaily.com/catalog/us/products/36329/how-to-express-design-ideas-with-artistic-visual-modes-enscape
- three.js source, read directly from this worktree's `node_modules/three/examples/jsm/`:
  `postprocessing/EffectComposer.js`, `Pass.js`, `RenderPass.js`, `ShaderPass.js`, `OutputPass.js`,
  `shaders/SobelOperatorShader.js`
- mrdoob/three.js GitHub issues: [#18533](https://github.com/mrdoob/three.js/issues/18533)
  (OutlinePass + InstancedMesh), [#20401](https://github.com/mrdoob/three.js/issues/20401),
  [#20660](https://github.com/mrdoob/three.js/issues/20660) (OutlinePass performance)
- drei docs, Outlines — drei.docs.pmnd.rs/abstractions/outlines
- pmndrs/react-three-fiber discussion #1410 (instanced outlining workarounds)
- three.js forum, "Edge detection with Normal and depth" — discourse.threejs.org/t/edge-detection-with-normal-and-depth/7929
- Maxime Heckel, "On Crafting Painterly Shaders" — blog.maximeheckel.com/posts/on-crafting-painterly-shaders/
- Codrops, "Susurrus: Crafting a Cozy Watercolor World with Three.js and Shaders" (April 2026) — tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/
- Codrops, "Sketchy Pencil Effect with Three.js Post-Processing" (2022) — tympanus.net/codrops/2022/11/29/sketchy-pencil-effect-with-three-js-post-processing/, source at github.com/mayacoda/pencil-lines
- three.js official example, PCSS — threejs.org/examples/webgl_shadowmap_pcss.html
- Alastair Aitchison, "Hand-Drawn Shaders and creating Tonal Art Maps" — alastaira.wordpress.com/2013/11/01/hand-drawn-shaders-and-creating-tonal-art-maps/
- mattatz/THREE.Watercolor (github.com/mattatz/THREE.Watercolor) — noted as a real prior-art repo
  (EffectComposer + custom `WatercolorPass` + paper texture) but flagged as dormant (2 commits,
  no releases, unclear three.js version target) — cited for the concept, not recommended to
  depend on directly.

Not independently verified this session and should not be cited as sourced numbers: exact
`postprocessing`/`@react-three/postprocessing` Bundlephobia figures (fetch didn't return the
size panel — get the real number before quoting one); exact minified+gzipped byte count for the
`InkPass` scaffolding (estimated from raw source line counts, not from an actual build output).
