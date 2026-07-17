# Vendored: nonflowers

A faithful TypeScript ES-module port of **Lingdong Huang's "nonflowers"** —
procedurally painted, Gongbi-style flowers on canvas.

- **Upstream**: <https://github.com/LingDong-/nonflowers>
- **Commit**: `03b653d220f16c6bed7ea9c7edc852f7e91846cb`
- **License**: MIT, © 2018 Lingdong Huang — see [`LICENSE`](./LICENSE)
  (verbatim upstream copy). This port is a derivative work distributed under
  the same license; the copyright notice and permission notice are retained.
- **Reference copies**: [`upstream/main.js`](./upstream/main.js),
  [`upstream/index.html`](./upstream/index.html),
  [`upstream/style.css`](./upstream/style.css) are byte-identical copies of the
  original (md5 of `main.js`: `d4e2944b9062e3dd69b67de65dc7c049`). They exist
  for diff review only and are never imported by app code (`allowJs` is off,
  so they never enter the TS program).

The port lives in **one file**, [`nonflowers.ts`](./nonflowers.ts), mirroring
upstream's structure and source order so it can be diff-reviewed against
`upstream/main.js`. Pure, rng-free helpers sit at module level in upstream
order; everything that consumes randomness or noise is scoped inside
`createFlora()`, also in upstream order.

## Determinism contract

`createFlora(seed)` is fully self-contained: two instances constructed with the
same seed (and given the same sequence of calls) produce **bit-identical
numbers and pixel-identical canvases**, on the main thread or inside a module
Web Worker. Nothing reads the clock, the DOM state, or the ambient global RNG.
Seeds are hashed with `btoa(JSON.stringify(seed))` (as upstream), so string
seeds must be Latin-1 representable; `btoa` is global in browsers, workers, and
node ≥ 16.

## Exported API

```ts
// the instance factory
function createFlora(seed: string | number): FloraInstance;

interface FloraInstance {
  random(): number;                                  // seeded PRNG in [0,1)
  noise(x: number, y?: number, z?: number): number;  // seeded Perlin (p5-derived)
  noiseDetail(lod: number, falloff: number): void;
  noiseSeed(seed: number): void;
  randGaussian(): number;                            // upstream helper (unused upstream)
  genParams(): FloraParams;                          // the plant genome
  woody(args: PlantArgs): void;                      // paint woody plant onto args.ctx
  herbal(args: PlantArgs): void;                     // paint herbaceous plant onto args.ctx
  paper(args?: PaperArgs): HTMLCanvasElement | OffscreenCanvas;  // 512×512 tile
  generate(opts?: GenerateOptions): GenerateResult;  // upstream generate()
}

interface PlantArgs   { ctx: Ctx2D; xof?: number; yof?: number; PAR?: FloraParams }
interface PaperArgs   { col?: number[]; tex?: number; spr?: number }  // defaults [0.98,0.91,0.74], 20, 1
interface GenerateOptions {
  size?: number;                        // default 600 (upstream's fixed size)
  kind?: 'auto' | 'woody' | 'herbal';   // default 'auto' = upstream's rng coin flip
  paper?: 'aged' | 'cream' | 'none';    // 'aged' = PAPER_COL1 [0.98,0.91,0.74],
                                        // 'cream' = PAPER_COL0 [1,0.99,0.9],
                                        // 'none' = transparent, no paper, no border
  border?: boolean;                     // default: paper !== 'none'
}
interface GenerateResult { canvas: HTMLCanvasElement | OffscreenCanvas; params: FloraParams; kind: 'woody' | 'herbal' }

// pure helpers (module level, deterministic, rng-free) — mainly for tests/app math
function rad(x: number): number;
function deg(x: number): number;                    // unused upstream; kept for parity
function distance(p0: Vec, p1: Vec): number;
function mapval(value, istart, istop, ostart, ostop): number;
function sigmoid(x: number, k?: number): number;
function bean(x: number): number;                   // unused upstream; kept for parity
function squircle(r: number, a: number): (th: number) => number;
function midPt(...args: Array<Vec | Vec[]>): Vec;
function bezmh(P: Vec[], w?: number): Vec[];
function tubify(args?: { pts?: Vec[]; wid?: (x: number) => number }): [Vec[], Vec[]];
function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas;
const Layer: { empty; blit; filter; border; bound };  // canvas ops (see T4/T7)
const PAPER_COL0: number[];  // [1, 0.99, 0.9]
const PAPER_COL1: number[];  // [0.98, 0.91, 0.74]

type Vec = number[];         // 3-component [x,y,z] by convention; tubify emits [x,y]
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
interface ColorRange { min: number[]; max: number[] }  // [h,s,v,a] endpoints
interface FloraParams { /* 33 genome fields, same names/distributions as upstream genParams() */ }
```

Rendering onto your own canvas: `flora.woody({ ctx, xof, yof, PAR })` — same
args as upstream, except `ctx` is required because the port has no page-global
`CTX` (see T5).

## Transformation log

Everything not listed below is ported verbatim: same function names, same
structure, same magic numbers, same draw order, same quirky-but-working code.

- **T1 — Array.prototype pollution removed.** Upstream defines `.x/.y/.z` and
  negative-index (`A[-1]`, `A[-2]`) getters on `Array.prototype`. Every site is
  rewritten to plain indexing: `v.x→v[0]`, `v.y→v[1]`, `v.z→v[2]` (including
  the `rot` components in `v3.roteuler` and all `v3` vector math), and
  `A[-1]→A[A.length-1]`. Full site list: `v3.roteuler/scale/copy/add/subtract/
  mag/dot/cross/lerp`; `leaf()`'s `L[-1]`, `R[-1]`, `P[-1]`; `branch()`'s
  `P[ind].x/.y` and `v.x+xof, v.y+yof, v.z`; `woody()`'s `PL[i][1][j].x/.y` and
  `P_[-1].x/.y`; `herbal()`'s `P[j].x/.y`, `P[-1].x/.y`, `P_[-1].x/.y`.
  `grot(P, ind)` is called with `ind = -1` upstream (hitting `P[-1]`/`P[-2]`);
  the port normalizes negative indices inside `grot`. `midPt` still averages
  all three components.
- **T2 — PRNG localized.** Upstream's global `Prng` singleton (and its
  `Math.random` override) becomes a per-instance object with the identical
  algorithm: `s = s*s % (p*q)`, `p=999979`, `q=999983`, the
  `btoa(JSON.stringify(x))` charCode·128^i hash, the seed-retry loop, and the
  10-draw warmup. Every internal ambient-RNG call in upstream became the
  instance rng, preserving draw order exactly: `randChoice`, `normRand`,
  `wtrand`, the Perlin lazy init, `noiseSeed`'s null fallback, `jnt` in
  `branch()` (including the rng draw in the fork-loop *condition*, evaluated
  per iteration), all scatter draws in `woody`/`herbal` (including the
  shoot-loop condition in `herbal`), `paper()`'s speckle (including the
  short-circuit `||` that skips the second draw), and `generate()`'s
  woody-vs-herbal coin flip. The global `Math.random` is never touched.
- **T3 — Noise localized.** Same p5-derived Perlin, factory-scoped per
  instance, lazily seeded from the instance rng on the first `noise()` call
  exactly like upstream (`perlin[i] = rng()`). `noiseDetail`/`noiseSeed`
  equivalents are instance-scoped. (`noiseSeed`'s unused `getSeed` accessor is
  dropped.)
- **T4 — Canvas abstraction for workers.** `createCanvas(w,h)` returns
  `new OffscreenCanvas(w,h)` when `typeof document === 'undefined'`, else a
  `document.createElement('canvas')`. `Layer.empty` and `paper()` use it (a
  small `getCtx2d()` helper does the context acquisition for both). Contexts
  are typed as `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`;
  where TS cannot unify the two overload sets (`fill`/`stroke`/`drawImage`/
  `putImageData`), a local commented cast pins one arm — runtime behaviour is
  identical on both.
- **T5 — Demo chrome not ported**: `parseArgs`, `vizParams`, `makeDownload`,
  `toggle`, `makeBG`, `load`, `reloadWSeed`, the DOM/summary/share code, all
  `console.log`s, the url-seed logic (`SEED` global), `Math.oldRandom`, the
  page globals `CTX`/`BGCANV` (so `ctx` is a required arg throughout), and
  `Prng.test` (a benchmark). `Prng.seed`'s current-time fallback for an
  undefined seed is likewise not ported — `createFlora` always supplies a seed.
- **T6 — ES5 warts fixed only where strictness forces it**:
  - `tubify`: undeclared `vtxlist0`/`vtxlist1` (accidental globals) → locals;
    the third `vtxlist` is assigned once and never read → dropped.
  - `v3.normalize`: upstream references an undefined global `mag()` and leaks
    a global `p`; it would throw if called and never is → **omitted**.
  - `Layer.empty`: undeclared `context` global → local.
  - `v3.toeuler`: write-only `cnt` debug counter → dropped.
  - `Layer.border`: the dead per-pixel `pix.slice()` destructure (values never
    used) → dropped.
  - `var`-redeclarations inside branches (`paper`'s speckle `r/g/b`, `leaf`'s
    `lt`) → single `let` declarations, identical control flow.
- **T7 — Output-identical perf only**: `Layer.filter` and `Layer.bound` index
  the pixel typed-array directly instead of allocating `pix.slice(i, i+4)` per
  pixel; `Layer.bound` reads only the alpha channel (and computes `x`/`y` only
  for opaque pixels). No other perf changes: noise is not memoized, `bezmh`
  keeps `pl = 20`, the filters still call `ctx.canvas.width` per pixel, and
  `toeuler` keeps its brute-force 72×36 sweep.
- **T8 — Strict TypeScript accommodations** (behaviour-preserving):
  - `genParams()` builds the same fields as `const` locals **in upstream
    assignment order** (rng order preserved) and returns them as one literal —
    upstream assigns onto a bare `PAR` object.
  - Upstream draws for **dead** values are kept as `void` expressions so the
    rng stream stays aligned: `leafShapeNoiseSeed`, `curveCoeff1`,
    `curveCoeff3` (all drawn upstream, never read).
  - `branch()`'s `wfun` drops the unused second element of the `jntdist`
    destructure; unused lambda params are `_x`-prefixed.
  - `pl + (j == P.length-3)` boolean arithmetic in `bezmh` → explicit ternary;
    loose `==`/`!=` → strict where operands are always numbers.
- **`generate(opts)` extends upstream `generate()`** (defaults reproduce it
  exactly): white fill, tiled `paper({col: PAPER_COL1})`, 50/50 coin flip from
  the instance rng, plant at upstream's offsets (`xof: size/2`,
  `yof: 550/600·size` woody / `size` herbal; upstream is fixed at 600), and
  the `squircle(0.98, 3)` border filter. It calls `genParams()` itself —
  immediately before `woody`/`herbal`, the same rng position where upstream's
  default-arg evaluation ran — so it can return the genome. Option deviations
  from the upstream stream: `kind` forced ⇒ the coin-flip draw is skipped;
  `paper:'none'` ⇒ `paper()`'s ~66k draws are skipped (`'cream'` consumes the
  identical stream as `'aged'`, only the colour multipliers differ). All
  variants remain fully deterministic per (seed, opts).

### Preserved quirks worth knowing about

- **`ble: "normal"` is not a valid `globalCompositeOperation`.** The canvas
  spec ignores invalid assignments, so in `woody`/`herbal` the flower layer's
  `"normal"` blit actually inherits the `"multiply"` set by the preceding
  blit on the same ctx. This accident is load-bearing for the look and is
  preserved (via a commented cast in `Layer.blit`). Consequently the ctx you
  pass in — and the canvas `generate()` returns — is left with
  `globalCompositeOperation = "multiply"`; reset it before drawing more.
- **`leafShape` reuses `flowerShapeNoiseSeed`** even though a dedicated
  `leafShapeNoiseSeed` is drawn (upstream bug, preserved; the draw still
  happens).
- The PRNG squares numbers near 10^12, losing low bits to double rounding —
  identical in upstream and port, so results match exactly.

## Parity evidence

Upstream's `Prng` + `Noise` were extracted verbatim from `main.js` and run in
an isolated node child process (upstream overrides the global RNG, so it is
quarantined from the test process). Protocol: seed → 5 rng draws → 5 noise
samples at `(0.5)`, `(1.5,2.5)`, `(10,20)`, `(0.1,0.2,0.3)`,
`(3.14,1.59,2.65)` (the first noise call lazily seeds the 4096-entry perlin
table from the rng). The port reproduces these **exactly** (bit-identical
doubles, asserted with strict equality in `nonflowers.test.ts`):

| seed | first 5 rng draws | 5 noise samples |
|---|---|---|
| `'bower'` | 0.18445638093062444, 0.22454515653178558, 0.8459875819190954, 0.2483238762876473, 0.1307645504702349 | 0.8165253030716422, 0.42219623717203847, 0.5584803221138629, 0.5669470006574456, 0.6227454475723682 |
| `12345` (number) | 0.8740068725741373, 0.026774613658760497, 0.39422036536614724, 0.434049865231923, 0.25976579893362306 | 0.4752763497703676, 0.51109954460467, 0.5780722907913032, 0.457150677013076, 0.595759248497404 |

Beyond the PRNG/noise goldens, upstream's **whole `genParams()`** (verbatim,
with only `console.log`/`vizParams` stripped) was run in the same quarantined
harness for seed `'bower'`, and the port reproduces the complete 33-field
genome **exactly** — every numeric field bit-identical and every
function-valued field identical at x ∈ {0, 0.25, 0.5, 0.75, 1} (op = 0.3 for
`flowerOpenCurve`). The full golden fingerprint is hard-coded in
`nonflowers.test.ts` (`GOLDEN_GENOME_BOWER`); sample values:
`flowerChance = 0.006736354695953567`, `leafType = [2, 6, 3]`,
`stemLength = 338.05843800625735`, `flowerPetal = 8`,
`branchColor.min = [32.20638391451107, 0.24776477857823392, 0.7238283822258178, 1]`.
This exercises `randChoice`/`normRand` ordering, the dead draws
(`leafShapeNoiseSeed`, `curveCoeff1`, `curveCoeff3`), and the noise-backed
shape closures end to end.

`nonflowers.test.ts` additionally verifies: same-seed instances draw identical
rng sequences and deeply-equal genomes (function-valued params sampled at
x ∈ {0, 0.25, 0.5, 0.75, 1}, `flowerOpenCurve` at `op = 0.3`); different seeds
diverge; `bezmh` point counts (21 / 41 / 21 for 3 / 4 / 2 control points);
`tubify` symmetric offsets on a straight polyline; `midPt` componentwise
averaging in both calling styles. Tests are node-env-safe: no canvas or DOM
API is touched.

## Performance notes for renderers

A full plant is **seconds, not milliseconds** — budget accordingly and prefer
a module Web Worker (the whole module is OffscreenCanvas-ready):

- `woody()`/`herbal()` each allocate two 1200×1200 offscreen layers and run
  **three full-image `Layer.filter` passes** (~4.3M pixel-filter calls, each
  sampling Perlin noise once or twice — tens of millions of noise calls; this
  is the dominant cost, faithful to upstream), plus two `Layer.bound` scans.
- `paper()` issues ~264k 1×1 `fillRect`s on a 512×512 tile; `generate()`'s
  border is another full-image pass.
- `grot()` calls `v3.toeuler`, a brute-force sweep over 72×36 candidate
  rotations per call (upstream's approach, kept per T7).
- Layer size is fixed at 1200 regardless of `generate({size})`; very large
  `size` values mostly cost paper tiling + border, but the plant itself won't
  exceed the 1200px working layer (upstream behaviour).
- `wtrand` is rejection sampling with unbounded (astronomically unlikely)
  retries; `woody` with a high `flowerChance` genome paints hundreds of petal
  leaves — timings vary seed to seed by design.
