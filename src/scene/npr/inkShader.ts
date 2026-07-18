/**
 * inkShader.ts — the watercolour + pencil-sketch fragment pass.
 *
 * One `ShaderPass`-shaped object (uniforms + vertex + fragment, the same shape
 * `three/examples/jsm/shaders/SobelOperatorShader.js` has), run over the scene
 * colour buffer plus a normal+depth G-buffer. Senku's research §10 is the spec:
 * Sobel edges off geometry (not diffuse), a simplified Kuwahara wash, procedural
 * paper grain, a warm shadow shift, and a grayscale hatched sketch read for the
 * pre-bake phase — all one shader, the two modes crossfaded by `uMode` rather
 * than two programs.
 *
 * WHY uMode IS A UNIFORM, NOT A #define (deviation from spec A1's wording). Spec
 * A2 wants the sketch→wash transition to CROSSFADE across the bake window off
 * `revealProgressRef`. A `#define` branch cannot crossfade — it is compiled one
 * way or the other — so the two reads are computed and `mix`ed by a float. The
 * expensive half (the Kuwahara) sits behind a `uMode > eps` uniform branch,
 * which is coherent across the whole frame (every fragment reads the same
 * `uMode`), so there is no warp divergence cost for it; a fragment in pure
 * sketch never pays for the wash and vice versa.
 *
 * Every threshold/weight below is an eyeball constant, set against a real render
 * and flagged for live QA the same way the chamfer and dome-nut sizes are.
 */
import * as THREE from 'three';

/**
 * The warm umber-charcoal the wash darkens toward in shadow (spec A4, the
 * deliberate override of Enscape's blue shadow shift). Near `#3a3226`, close kin
 * to the house `ink`/`bark` tones. SWITCHABLE IN ONE LINE: to ship the
 * reference's cool blue instead, change this constant (Daniel's open question 1).
 */
export const WASH_SHADOW_WARM = new THREE.Color('#3a3226');
/** The Enscape-style cool blue, kept here so the switch is a one-word edit. */
export const WASH_SHADOW_COOL = new THREE.Color('#3d4657');

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;   // scene colour (composer read buffer)
  uniform sampler2D tNormal;    // view-space normals (MeshNormalMaterial prepass)
  uniform sampler2D tDepth;     // depth attached to the normal target
  uniform vec2 resolution;      // drawing-buffer size, px
  uniform float uMode;          // 0 = pencil sketch, 1 = watercolour wash
  uniform float uTime;
  uniform vec3 uShadowTint;     // warm umber-charcoal (A4)
  uniform float cameraNear;
  uniform float cameraFar;
  varying vec2 vUv;

  // Edge-line ink and Sobel thresholds are MODE-DEPENDENT (round 4). Sketch
  // (uMode -> 0, pre-bake) keeps the heavier round-3 read so the lawn stays
  // legible; wash (uMode -> 1) keeps the thin round-4 read Daniel likes. Both
  // sets are declared here and mix()ed by clamp(uMode) in main() — the same
  // reason uMode is a uniform not a #define (see the header): a crossfade needs
  // both reads live in one program.
  const vec3 INK_WASH   = vec3( 0.243, 0.224, 0.176 ); // ~#3e3a2d, thin round 4
  const vec3 INK_SKETCH = vec3( 0.184, 0.165, 0.122 ); // ~#2f2a1f, heavy round 3
  // Sobel magnitude mapped to a line through these two thresholds. Wash raises
  // the onset + narrows the band (only the strongest edges read); sketch lowers
  // both so more of the drawing carries a line.
  const float EDGE_LO_WASH   = 0.30;
  const float EDGE_HI_WASH   = 0.62;
  const float EDGE_LO_SKETCH = 0.16;
  const float EDGE_HI_SKETCH = 0.42;

  // --- Inigo Quilez gradient noise (one function, two uses: grain + wobble) ---
  vec2 hash2( vec2 p ) {
    p = vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) );
    return -1.0 + 2.0 * fract( sin( p ) * 43758.5453123 );
  }
  float gnoise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
    vec2 u = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( dot( hash2( i + vec2( 0.0, 0.0 ) ), f - vec2( 0.0, 0.0 ) ),
                     dot( hash2( i + vec2( 1.0, 0.0 ) ), f - vec2( 1.0, 0.0 ) ), u.x ),
                mix( dot( hash2( i + vec2( 0.0, 1.0 ) ), f - vec2( 0.0, 1.0 ) ),
                     dot( hash2( i + vec2( 1.0, 1.0 ) ), f - vec2( 1.0, 1.0 ) ), u.x ), u.y );
  }

  float luma( vec3 c ) { return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }

  // Non-linear depth -> metres, so a crease reads the same near and far.
  float linDepth( vec2 uv ) {
    float z = texture2D( tDepth, uv ).x;
    float ndc = z * 2.0 - 1.0;
    return ( 2.0 * cameraNear * cameraFar ) /
           ( cameraFar + cameraNear - ndc * ( cameraFar - cameraNear ) );
  }

  vec3 nrm( vec2 uv ) { return texture2D( tNormal, uv ).rgb; }

  // Sobel over the view-space normal buffer: catches creases the colour buffer
  // has no signal for (Senku's finding that diffuse-only Sobel is wrong).
  float normalSobel( vec2 uv, vec2 texel ) {
    vec3 h = -1.0 * nrm( uv + texel * vec2( -1.0, -1.0 ) )
             - 2.0 * nrm( uv + texel * vec2( -1.0,  0.0 ) )
             - 1.0 * nrm( uv + texel * vec2( -1.0,  1.0 ) )
             + 1.0 * nrm( uv + texel * vec2(  1.0, -1.0 ) )
             + 2.0 * nrm( uv + texel * vec2(  1.0,  0.0 ) )
             + 1.0 * nrm( uv + texel * vec2(  1.0,  1.0 ) );
    vec3 v = -1.0 * nrm( uv + texel * vec2( -1.0, -1.0 ) )
             - 2.0 * nrm( uv + texel * vec2(  0.0, -1.0 ) )
             - 1.0 * nrm( uv + texel * vec2(  1.0, -1.0 ) )
             + 1.0 * nrm( uv + texel * vec2( -1.0,  1.0 ) )
             + 2.0 * nrm( uv + texel * vec2(  0.0,  1.0 ) )
             + 1.0 * nrm( uv + texel * vec2(  1.0,  1.0 ) );
    return sqrt( dot( h, h ) + dot( v, v ) );
  }

  // Relative depth gradient — silhouettes jump hard, creases softly. Scale-
  // invariant (divided by depth) so a far edge is not weaker than a near one.
  float depthSobel( vec2 uv, vec2 texel ) {
    float c = linDepth( uv );
    float l = linDepth( uv - vec2( texel.x, 0.0 ) );
    float r = linDepth( uv + vec2( texel.x, 0.0 ) );
    float d = linDepth( uv - vec2( 0.0, texel.y ) );
    float u = linDepth( uv + vec2( 0.0, texel.y ) );
    return ( abs( r - l ) + abs( u - d ) ) / max( c, 0.001 );
  }

  // One Kuwahara sector: mean + summed-variance over a (R+1)x(R+1) quadrant.
  void sector( vec2 uv, vec2 texel, vec2 dir, out vec3 m, out float variance ) {
    vec3 sum = vec3( 0.0 );
    vec3 sum2 = vec3( 0.0 );
    float n = 0.0;
    for ( int x = 0; x <= 3; x++ ) {
      for ( int y = 0; y <= 3; y++ ) {
        vec2 o = vec2( float( x ) * dir.x, float( y ) * dir.y );
        vec3 col = texture2D( tDiffuse, uv + texel * o ).rgb;
        sum += col;
        sum2 += col * col;
        n += 1.0;
      }
    }
    m = sum / n;
    vec3 var3 = sum2 / n - m * m;
    variance = var3.r + var3.g + var3.b;
  }

  // Simplified 4-sector Kuwahara, radius 3px (Senku's §5 real-time-safe range):
  // output the mean of the lowest-variance quadrant, which flattens into colour
  // regions while keeping the region boundaries sharp — the brushwork read.
  vec3 kuwahara( vec2 uv, vec2 texel ) {
    vec3 m0, m1, m2, m3;
    float v0, v1, v2, v3;
    sector( uv, texel, vec2( -1.0, -1.0 ), m0, v0 );
    sector( uv, texel, vec2(  1.0, -1.0 ), m1, v1 );
    sector( uv, texel, vec2( -1.0,  1.0 ), m2, v2 );
    sector( uv, texel, vec2(  1.0,  1.0 ), m3, v3 );
    vec3 best = m0;
    float bv = v0;
    if ( v1 < bv ) { bv = v1; best = m1; }
    if ( v2 < bv ) { bv = v2; best = m2; }
    if ( v3 < bv ) { bv = v3; best = m3; }
    return best;
  }

  void main() {
    vec2 texel = 1.0 / resolution;

    // Hand-tremor wobble (both modes): offset the sample UVs by a low-frequency
    // noise field so edges and fills waver like a drawn line (Enscape "Jitter").
    vec2 nCoord = vUv * resolution * 0.06;
    vec2 wobble = vec2( gnoise( nCoord ), gnoise( nCoord + 41.7 ) ) * texel * 1.6;
    vec2 wuv = vUv + wobble;

    vec3 base = texture2D( tDiffuse, wuv ).rgb;

    // Edges: geometry Sobel on normals (creases) + relative depth (silhouettes).
    // Mode-dependent (round 4): sketch (uMode -> 0) uses the heavier round-3
    // weights + lower onset so the pre-bake lawn keeps its line; wash (uMode ->
    // 1) uses the thinner round-4 weights so the texture carries the read.
    // clamp(uMode) is per-frame-coherent, so this mix costs no warp divergence.
    float m = clamp( uMode, 0.0, 1.0 );
    float nWeight = mix( 0.55, 0.42, m );
    float dWeight = mix( 3.2, 2.4, m );
    float edge = normalSobel( wuv, texel ) * nWeight + depthSobel( wuv, texel ) * dWeight;
    float line = smoothstep(
      mix( EDGE_LO_SKETCH, EDGE_LO_WASH, m ),
      mix( EDGE_HI_SKETCH, EDGE_HI_WASH, m ),
      edge
    );

    // Paper grain, sampled low-frequency, biased into shadow (Enscape "Surface
    // Detail") — one gradient-noise tap at a fixed screen frequency.
    float grain = gnoise( vUv * resolution * 0.4 );
    float shadowBias = 1.0 - luma( base );
    float grainAmt = 0.05 + 0.11 * shadowBias;

    // ---- WATERCOLOUR WASH (uMode -> 1) ----
    vec3 wash = base;
    if ( uMode > 0.001 ) {
      wash = kuwahara( wuv, texel );
      float l = luma( wash );
      wash = mix( vec3( l ), wash, 0.9 );                  // gentle desaturation
      // Confine the warm shadow shift to genuinely DARK pixels. The old 0.55
      // onset treated every mid-tone as shadow and dragged saturated plant
      // colours to umber-tan (live QA); 0.40 leaves coloured materials alone and
      // still warms the true shadows (spec A4).
      float shadow = smoothstep( 0.40, 0.08, l );
      wash = mix( wash, uShadowTint, shadow * 0.42 );      // warm shadow shift (A4)
      wash *= 1.0 - grainAmt * ( grain * 0.5 + 0.5 );      // granulation
    }

    // ---- PENCIL SKETCH (uMode -> 0) ----
    vec3 sketch = vec3( 1.0 );
    if ( uMode < 0.999 ) {
      float l = luma( base );
      float dark = 1.0 - smoothstep( 0.18, 0.92, l );      // tonal fill strength
      // The sketch phase draws on paper: background pixels sit at the far plane
      // (cleared depth), so they never hatch. Without this the round-4 sky's
      // mid luma reads as "dark" and the whole sky cross-hatches into grey
      // plaid; with it the blue sky arrives WITH the wash as the bake paints.
      dark *= 1.0 - step( cameraFar * 0.85, linDepth( wuv ) );
      // Cross-hatch: two gratings at ~45 deg, thresholded, added where dark.
      float g1 = sin( ( wuv.x + wuv.y ) * resolution.y * 0.16 );
      float g2 = sin( ( wuv.x - wuv.y ) * resolution.y * 0.16 );
      float h1 = step( 0.55, g1 ) * step( 0.35, dark );
      float h2 = step( 0.7, g2 ) * step( 0.6, dark );
      float paper = 0.97 - grainAmt * grain;
      sketch = vec3( paper ) - vec3( 0.34 ) * h1 - vec3( 0.24 ) * h2;
      sketch = clamp( sketch, 0.0, 1.0 );
    }

    vec3 col = mix( sketch, wash, m );

    // Drawn ink line on top, both modes. Sketch (round 3) draws it at full
    // opacity in the darker ink; wash (round 4) softens to 0.8 in the lighter
    // ink so it reads as a light pencil edge, not a heavy contour.
    vec3 ink = mix( INK_SKETCH, INK_WASH, m );
    col = mix( col, ink, line * mix( 1.0, 0.8, m ) );

    gl_FragColor = vec4( col, 1.0 );
  }
`;

/**
 * The ShaderPass descriptor. `tDiffuse` is filled by `ShaderPass` from the
 * composer read buffer automatically; `tNormal`/`tDepth`/uniforms are set each
 * frame by `InkPass`. A fresh object per call so two composers never share one
 * uniform bag (the same reason `revealShader` warns about the program cache).
 */
export function makeInkShader() {
  return {
    name: 'InkShader',
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      tNormal: { value: null as THREE.Texture | null },
      tDepth: { value: null as THREE.Texture | null },
      resolution: { value: new THREE.Vector2(1, 1) },
      uMode: { value: 1 },
      uTime: { value: 0 },
      uShadowTint: { value: WASH_SHADOW_WARM.clone() },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 100 },
    },
    vertexShader,
    fragmentShader,
  };
}
