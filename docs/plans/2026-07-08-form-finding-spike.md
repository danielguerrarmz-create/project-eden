# Spike: a form-finding core for the Bower / Eden pavilion tool

Date: 2026-07-08 · Branch: `worktree-agent-a83cf800da2651d9b` (off V3 @ 6e68446) ·
Author: Edward (claudio)

A de-risking spike. The question: can we escape the "params -> one shape" slider model
with a real-time, in-browser, **constrained-relaxation gridshell** the user SCULPTS
(pull nodes/regions) and that settles onto a BUILDABLE shell — live, at 60 fps, staying
inside the fabrication grammar? Built ALONGSIDE the existing engine, not replacing it.

- New pure module: `src/engine/formFinding.ts` (+ `formFinding.test.ts`, 26 tests).
- New route `#/sculpt`: `src/pages/SculptPage.tsx` + `src/scene/SculptShell.tsx`.
- Existing param engine (`#/shape`, `#/studio`, `#/engine`) is untouched.

No Senku form-finding brief existed at build time (`docs/research/form-finding-method.md`
absent); proceeded on the recommended XPBD-family approach and my own judgment. Reconcile
if/when the brief lands.

---

## 1. The solver + constraint model

Position-based dynamics (PBD) — the deterministic cousin of XPBD. Chosen over full XPBD
compliance for the spike because plain PBD with a **per-band rigidity law** is
deterministic, allocation-free, and trivially unit-testable; true XPBD compliance
(dt²/α, order-independent stiffness, substepping) is the production upgrade, noted below.

One `relax(shell, opts)` step:

1. **Predict** — Verlet integrate velocity `(pos − prev)·damping` + light gravity, so the
   shell *drapes and settles* rather than floating. Pinned nodes (feet, `invMass = 0`)
   contribute zero velocity.
2. **Grab** — pull each grabbed node toward its per-node desired position (see §3).
3. **Distance** — project every strut toward its buildable length (§2). Gauss–Seidel.
4. **Ground** — no node below `y = 0`; feet stay pinned at 0.
5. **Buildability projection** — grab-free distance+ground sweeps. This is the crux: it
   makes buildability the FINAL authority, so however hard the cursor pulls, the returned
   shell is buildable by construction and a grabbed node visibly RESISTS (lags the cursor)
   once its struts max out. "Project onto the nearest buildable gridshell", made literal.

`DEFAULT_OPTS`: 8 iterations, 6 projection sweeps, dt 1/60, gravity 2.4, damping 0.9,
grabStiffness 0.85, grain 0.12.

### Topology — a triangulated elliptical gridshell

`buildGridshell()` seeds nodes on a catenary-ish elliptical dome (crown oculus -> eave),
with three strut families forming a genuinely rigid, triangulated lattice:

- **radial** ties (crown -> eave) + **ring** hoops (per ring) = quads (a floppy mechanism);
- one **diagrid** diagonal per quad splits each into two triangles -> rigid;
- the **eave** ring closes the free edge; 3–4 eave nodes are pinned as ground **feet**.

(The existing `geometry.ts` renders a static *double*-diagrid and can skip the
triangulation because it never relaxes; a solver cannot — an untriangulated grid shears
flat under relaxation. This was a real bug found and fixed during the spike.)

## 2. Buildability enforcement — the whole trick (`bandTarget`)

Each strut has a rest length and a per-strut **buildable band** `[lmin, lmax]` sitting
strictly inside the grammar's HARD fab limits (`GRAMMAR.minStrutSpacingM = 0.25 m` ..
`GRAMMAR.maxComponentLengthM = 2.35 m`, from `data/config.ts`). The desired length:

```
len > lmax  -> lmax                      (rigid: snap to the upper fab edge)
len < lmin  -> lmin                      (rigid: snap to the lower fab edge)
else        -> len + grain·(rest − len)  (soft: weak pull toward rest = "clay")
```

Within the band a strut barely resists — the lattice deforms like clay and only weakly
remembers its rest length (`grain`, default 0.12). At a band edge it becomes a rigid rod.
So a pull that would stretch a strut past fabrication stops feeling like clay and starts
feeling like a rod — **the fab limit is something you feel with the cursor**, and the
settled shell is buildable by construction (the returned length is always in
`[lmin, lmax] ⊂ [0.25, 2.35]`). The struts render tinted from timber (slack) to amber
(stiffening at a limit), so the "grain" is visible.

`buildBand(rest)` = `[max(0.25, rest·0.5), min(2.35, rest·1.6)]` — a ±clay range clamped
to the hard fab limits. The HUD's **out-of-spec** counter flags any strut outside the hard
limits; on the buildable presets it holds at **0** through settling and sculpting.

## 3. The sculpt gesture(s)

- **Grab-pull with falloff** (primary). Pick a node; `beginGrab` builds a smooth region
  of a chosen radius (weight = `smoothstep(1 − d/radius)`, seed = 1.0, feet excluded so a
  foot never lifts). `moveGrab` drags the region on a camera-facing plane; the solver
  projects it buildable every frame. Falloff radius is a live control (0.4–2.4 m).
- **Pull-an-edge-to-extend** is covered by the same gesture with a wide falloff on an eave
  node (lifts/extends that edge). True topology-changing *extend* (adding nodes/struts as
  you drag past the buildable envelope) is NOT in the spike — noted as production work.

Rendering is decoupled from React: the solver mutates `Float64Array`s and the instance
matrices/colours are written straight from them in `useFrame` — no per-frame React render,
no allocation in the hot loop. Stats are pushed to the HUD ~6×/s only.

---

## 4. FEASIBILITY VERDICT

**YES — real-time constrained relaxation holds up in-browser, comfortably. The open risk
is topology, not the solver.**

### Perf (Node, single thread; browser will be similar — solver is the dominant cost)

Measured `relax()` step time, warm, averaged over 400 steps (16.7 ms = one 60 fps frame):

| preset  | nodes | struts | ms/step | headroom vs 60 fps | buildable (out-of-spec) |
|---------|------:|-------:|--------:|-------------------:|-------------------------|
| coarse  |    84 |    224 |   0.12  | ~144×              | yes (0)                 |
| default |   126 |    342 |   0.18  |  ~93×              | yes (0)                 |
| fine    |   168 |    448 |  ~0.25  |  ~60×              | yes (0)                 |
| perf    |   600 |   1720 |   1.00  |  ~16×              | no — topology ceiling   |
| stress  |  1260 |   3660 |   2.19  |   ~7×              | no — topology ceiling   |
| xl      |  2790 |   8190 |   4.91  |   ~3×              | no — topology ceiling   |

The solver scales roughly linearly in strut count and stays real-time to **~2,800 nodes /
~8,200 struts** on one thread — one to two orders of magnitude above what a pavilion needs.
Real-time constrained relaxation in the browser is **not in question**.

### The actual ceiling: buildable topology, not solver speed

A naive polar grid converges toward the crown, so past **~170 nodes** the crown-ring
struts fall below the 0.25 m fab minimum and the seed is no longer buildable (scaling the
oculus up buys a little, but then radial struts starve — the polar grid can't win both).
The `perf`/`stress` presets deliberately cross this ceiling to make it visible: the solver
stays smooth while the out-of-spec counter goes red. **So the production risk is the mesh
representation, not the physics.**

### Biggest open risks (in priority order)

1. **Density-adaptive / buildable topology.** A polar grid caps buildable resolution at
   ~170 nodes. Production needs a gridshell whose density stays roughly uniform — a
   geodesic/subdividing grid (reducing spoke count toward the crown) or a remeshed
   quad/tri dominant mesh — so you get fine resolution AND buildability together.
2. **Sculpt <-> grammar reconciliation.** This spike enforces a generic per-strut band. The
   real product must project onto the SAME grammar the param engine uses (joint library,
   span family, feet-splicing rule, eave-blank sheet fit, PD height cap) and drive the
   existing cut-list / nesting / price off the sculpted result. Today the sculpt shell and
   the param engine are two separate worlds.
3. **Topology-changing gestures** (extend/retract by adding or removing nodes/struts as you
   pull past the envelope) — the spike only deforms a fixed lattice.
4. **Solver polish** — true XPBD compliance + substepping for framerate-independent
   stiffness and less limit-cycle jitter; constraint "sleeping" when settled; a lower-bound
   *inequality* strut solve to fully kill local crushing under pathological yanks (a known
   PBD weakness — the spike's projection sweeps keep the buildable presets at 0 but a naive
   over-dense grid can locally jam).

### What a production form-finding core would need next

- A buildable, density-adaptive mesh (risk 1) — the single most important next step.
- Grammar-true projection wired to cut-list/nesting/pricing (risk 2), so a sculpted shell
  produces a real quote and BOM, like the slider path does.
- XPBD substepping + sleeping (risk 4) for rock-steady feel and battery/perf on mobile.
- Interaction design pass (Sai): handle affordances, snapping feedback, symmetry lock,
  undo, multi-touch, and a "grain" readout that teaches the fab limits as you hit them.

---

## 5. Quality gates

`npx tsc --noEmit` clean · `npm run test` 111 passing (85 prior + 26 new) · `npm run build`
green. The pure solver/constraint logic is unit-tested (the buildability law, band
clamping, strut projection, feet anchoring, ground, grab falloff, determinism, and that
relaxation keeps the shell buildable including under an absurd 5 m yank).

**Verification honesty:** solver logic is unit-tested and benchmarked; the `#/sculpt` route
builds and serves (Vite transforms all modules, HTTP 200). The in-browser click-drag feel
was NOT confirmed with browser automation in this environment — that live pass is the one
open verification item for a reviewer at `http://localhost:5344/#/sculpt`.
