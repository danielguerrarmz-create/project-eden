# Method brief: a real-time, in-browser form-finding core for Bower / Eden

Author: Senku (Axon Research & Scholar) · Date: 2026-07-07 · Branch: V3
Status: research/recommendation only — no source touched. Written in parallel with
Edward's `docs/plans/2026-07-07-engine-adapt-direct-manip.md` spike and Sai's gesture spec.

## 0. The shift, stated precisely

Today: `DesignParams` (footprint, rise, strutSpacing, aperture) → `clampParams` (grammar) →
`generateGeometry` → one gridshell. Four scalar sliders index into a pre-authored family; the
grammar (`src/engine/grammar.ts`) clamps each slider to a bound derived from a stated
fabrication rule (cut-sheet length, curvature-per-flat-panel tolerance, joint overlap, PD height
cap). Edward's direct-manipulation spike already proves the *loop* — drag → propose param patch →
`clampParams` → controlled handle snaps to the clamped result — for the three spatial params, and
explicitly names the next step as "replace `proposeFromDrag`'s per-handle mapping with a solver
that fits an arbitrary cage deformation to the closest in-grammar params" (plan, "What is stubbed").
That solver is the form-finding core this brief specifies.

The reframe: instead of the user indexing into a 4-parameter family via sliders, the user
sculpts a control mesh or pulls nodes directly, and a constrained relaxation solver finds the
**nearest point in the same buildable family** — every frame, in the browser, at interactive
rates. The grammar does not go away; it becomes the thing the solver is finding the nearest
feasible point *inside of*, continuously, instead of the thing that silently clips slider values.
This is a change of *interface to the constraint set*, not a change of the constraint set itself.

## 1. Precedent: this is not a new idea, it is the correct old one

Form-finding is the established alternative to shape-then-check structural design, going back to
physical relaxation models:

- **Gaudí's hanging-chain models** (Colònia Güell crypt, 1898–1908): a suspended net of chains
  under gravity settles into a pure-tension funicular network; inverted, it gives a pure-compression
  vault. Note for accuracy (flagged in prior fleet evaluation, see memory line 6): the hanging-chain
  method is documented for the Colònia Güell crypt specifically — the common claim that the *Sagrada
  Família* itself was directly modelled this way is a simplification to avoid restating uncritically.
  Primary reconstruction/documentation: Tomlow, J. 1989. *Das Modell: Antoni Gaudís Hängemodell und
  seine Rekonstruktion — neue Erkenntnisse zum Entwurf für die Kirche der Colonia Güell* (IL 34,
  Institute for Lightweight Structures, Universität Stuttgart), open-access via ILEK Stuttgart.
- **Frei Otto's minimal-surface / soap-film and hanging-chain models** (IL, Stuttgart): physical
  relaxation of a membrane or net under uniform tension finds the minimal surface for given boundary
  conditions. Otto, F. and Rasch, B. 1995/96. *Finding Form: Towards an Architecture of the Minimal*.
  Edition Axel Menges.
- **Heinz Isler's draped-fabric/inverted-membrane shells** (Switzerland, ~1000 built shells): a wetted
  fabric draped under gravity and photographed, then inverted, gives a compression-only thin-shell
  surface — the same relaxation logic as Gaudí's chains, in 2D. Chilton, J. 2000. *Heinz Isler: The
  Engineer's Contribution to Contemporary Architecture*. Thomas Telford.

Digital lineage, direct descendants of the physical models above:

- **Dynamic relaxation** — Day, A.S. 1965 introduced it structurally; Barnes, M.R. 1999. "Form
  Finding and Analysis of Tension Structures by Dynamic Relaxation." *International Journal of
  Space Structures* 14(2):89–104. Damped explicit time-stepping of a mass-spring/particle system
  toward static equilibrium — a numerical hanging-chain model.
- **Force density method (FDM)** — Schek, H.J. 1974. "The Force Density Method for Form Finding and
  Computation of General Networks." *Computer Methods in Applied Mechanics and Engineering* 3:115–134.
  A single **linear** solve (fixing force/length ratios per edge) that gives cable-net equilibrium
  directly, no iteration.
- **Particle-spring systems for architecture specifically**, including live user interaction while
  the solver runs — Kilian, A. and Ochsendorf, J. 2005. "Particle-Spring Systems for Structural Form
  Finding." *Journal of the International Association for Shell and Spatial Structures* 46(2):77–84.
  This is the closest precedent in the literature to "the user perturbs the model while a solver
  keeps it near equilibrium in real time," predating Kangaroo.
- **Thrust Network Analysis** — Block, P. and Ochsendorf, J. 2007. "Thrust Network Analysis: A New
  Methodology for Three-Dimensional Equilibrium." *Journal of the IASS* 48(3):167–173. Formalizes
  compression-only funicular network-finding as a linear/graphic-statics problem with an explicit
  feasible envelope — directly relevant to encoding "must stay compression-only within a thickness
  envelope" as a hard constraint set rather than a post-hoc check.
- **Position-Based Dynamics (PBD)** — Müller, M., Heidelberger, B., Hennix, M., and Ratcliff, J. 2007.
  "Position Based Dynamics." *Journal of Visual Communication and Image Representation* 18(2):109–118.
  **XPBD** — Macklin, M., Müller, M., and Chentanez, N. 2016. "XPBD: Position-Based Simulation of
  Compliant Constrained Dynamics." *Proceedings of the 9th International Conference on Motion in
  Games (MIG '16)*. The real-time-graphics-and-games branch of the same lineage; unconditionally
  stable, iteration-count- and timestep-independent stiffness (XPBD's specific fix over PBD).
- **Verlet + iterative constraint relaxation for real-time interactive use** — Jakobsen, T. 2001.
  "Advanced Character Physics." *Game Developers Conference 2001 Proceedings*. The commonly-cited
  origin of "Verlet integration + Gauss–Seidel-style constraint relaxation" as a real-time-games
  technique; PBD is its direct generalization.
- **Grasshopper/Kangaroo** — Piker, D. 2013. "Kangaroo: Form Finding with Computational Physics."
  *Architectural Design* 83(2):136–137. The design-practice-facing instance of exactly this lineage
  (particle-spring / PBD-family solver, live-draggable in a 3D viewport) — the direct tool precedent
  for "drag a point, watch a structural mesh relax," already standard in AEC practice, just not
  real-time-in-browser or fabrication-constrained the way Bower needs.
- **Constraint-as-projection frameworks for discrete architectural geometry** — Bouaziz, S., Deuss, M.,
  Schwartzburg, Y., Weise, T., and Pauly, M. 2012. "Shape-Up: Shaping Discrete Geometry with
  Projections." *Computer Graphics Forum* 31(5):1657–1667. A unifying framework (closely related to
  PBD/projective dynamics) where each fabrication rule — planarity, edge length, angle — is expressed
  as a local shape-projection operator, which is the direct mathematical vocabulary for §2 below.
  Also: Pottmann, H., Liu, Y., Wallner, J., Bobenko, A., and Wang, W. 2007. "Geometry of Multi-Layer
  Freeform Structures for Architecture." *ACM Transactions on Graphics* 26(3), Article 65 (SIGGRAPH
  2007) — the standard reference for planar-panel/beam-offset constraints on freeform architectural
  meshes, i.e. the geometric grammar of "flat, cuttable components" at scale.
- Textbook synthesis of the whole structural side: Adriaenssens, S., Block, P., Veenendaal, D., and
  Williams, C., eds. 2014. *Shell Structures for Architecture: Form Finding and Optimization*.
  Routledge.

**The thesis is real and well-grounded**: parametric sliders are a late, narrower descendant of a
design tradition that was originally physical, continuous, and manipulation-driven. Committing to
form-finding is a return to the authentic method, executed digitally and in real time — not a new
gimmick layered on top of the pavilion typology.

## 2. Recommended algorithm: XPBD, not dynamic relaxation, not FDM

### 2.1 The three candidates, judged on Bower's three criteria

| Criterion | Dynamic relaxation (Verlet+damping) | Force density method (FDM) | PBD / XPBD |
|---|---|---|---|
| **60fps under continuous mouse-drag** | Good — explicit, cheap per step, but needs enough damped sub-steps to settle after each drag delta; tuning damping/mass for stiffness *and* stability is the classic pain point (Barnes 1999 devotes substantial space to kinetic-damping tuning). | Excellent *per solve* (one linear system) but wrong shape for continuous dragging: each drag delta means re-forming and re-solving a linear system (or doing a matrix update), and FDM is fundamentally a **cable-net/tension** formulation — it does not natively express compression, bending, panel planarity, or inequality bounds (min/max strut length) without leaving the linear-FDM formulation entirely. | Excellent — designed exactly for this: a handful of Jacobi/Gauss–Seidel constraint-projection iterations per frame, unconditionally stable regardless of stiffness (no exploding springs), and both academically (Macklin et al. 2016) and practically (Müller's public browser XPBD demos, "Ten Minute Physics," run interactive constraint solves in plain JS/WebGL) proven real-time-in-browser at far larger node counts than Bower needs. |
| **Stability under large, fast, or adversarial drags** | Can blow up or oscillate if damping/mass ratios are off; requires careful re-tuning whenever geometry or spacing changes (exactly what a live-editable lattice does constantly). | Not applicable in the same sense — FDM *is* the equilibrium solve, not an incremental update; stability isn't the issue, expressivity is. | Unconditionally stable by construction (positions are directly projected onto constraint manifolds, not integrated through stiff forces) — this is XPBD's specific, published advance over both classic PBD and force-based methods (Macklin et al. 2016). |
| **Expressing fabrication constraints as *hard* constraints** | Fabrication rules (max/min strut length, planarity, ground anchoring) have to be bolted on as extra penalty forces or post-hoc clamps — not native to the formulation. | Fundamentally a **linear, unconstrained** equilibrium method; hard inequality bounds (a strut length capped at the CNC sheet limit) are outside what a single linear force-density solve expresses without extra QP/optimization machinery layered on top. | **Constraints are the primitive.** Every fabrication rule — length bounds, planarity, joint angle, ground anchoring — is literally one more constraint in the same solve, with its own compliance (stiffness) value. This is exactly the vocabulary Bouaziz et al.'s Shape-Up (2012) and Pottmann et al.'s freeform-architecture geometry (2007) already use for discrete-architecture fabrication constraints — XPBD generalizes their local-projection idea to a real-time, unconditionally-stable iterative solver. |

### 2.2 Recommendation

**Use XPBD (Extended Position-Based Dynamics)** as the form-finding core, not dynamic relaxation
and not FDM, for three reasons that compound:

1. It is the only one of the three where "buildability" and "shape it wants to settle into" are
   the *same kind of object* (a constraint with a compliance value) rather than two separate
   systems (a physics sim plus a post-hoc clamp, or a linear solve plus an external bounds check).
   This matches the codebase's existing philosophy almost exactly — `grammar.ts`'s own docstring
   says "the constraint being VISIBLE is what separates the engine from a render toy" — XPBD makes
   the constraint not just *visible* but *felt*, as resistance under the cursor.
2. It is unconditionally stable, which matters specifically because Bower's target user is not a
   simulation engineer — Sai's gesture spec will have users grab-and-fling nodes, and the solver
   must never visibly explode regardless of drag speed, exactly the failure dynamic-relaxation is
   most prone to when someone yanks a handle instead of dragging it smoothly.
3. It already has a public, verifiable browser-real-time precedent at node counts an order of
   magnitude above what Bower needs (see §4), lowering the risk that "real-time in browser" is
   itself the thing that fails.

FDM is not recommended as the primary solver, but it is worth keeping as a documented fallback for
a **narrower** sub-problem: if Edward's spike finds XPBD's iterative convergence too slow to feel
crisp on a specific hardware target, FDM could form-find the compression-only backbone once (a
single linear solve, e.g. on drag-release rather than every frame) while XPBD or a cheaper
positional smoothing handles the continuous drag itself. Flag this as a fallback, not a default —
it adds a second solver and a hand-off boundary, which is complexity the honest MVP does not need
until proven necessary (see §5).

### 2.3 Note the codebase's own current honesty framing carries over unchanged

`geometry.ts`'s comment — "STRUCTURAL VALIDITY IS GUARANTEED BY THE GRAMMAR, NOT BY FEA... the
honest claim is 'certainty inside a designed family'" — is exactly as true under form-finding as
under sliders. XPBD relaxes toward a constraint set; it does not run finite-element analysis. The
pitch does not change: "every shape you can find by pulling is inside the same engineer-validated
family," not "every shape is engineered." This should be stated explicitly wherever the form-finding
core is documented downstream, so the shift in *interaction model* is never conflated with a claim
of new *structural rigor* the engine does not actually have.

## 3. Encoding Bower's fabrication grammar as solver constraints

Map each existing `GRAMMAR` rule (`src/data/config.ts`) and each `deriveBounds`/`clampParams` rule
(`src/engine/grammar.ts`) onto an XPBD constraint. XPBD constraints are typed by **compliance** α
(inverse stiffness; α = 0 is a fully rigid/hard constraint, α > 0 is a soft spring-like constraint
that yields under load) — this maps directly onto Bower's own existing hard/soft split, it does not
need to be invented:

| Grammar rule (existing) | Solver constraint | Hard or soft | Why |
|---|---|---|---|
| `minStrutSpacingM` / `maxStrutSpacingM` (0.25–0.5 m, cuttability + curvature tolerance) | **Distance constraint** on each lattice edge, clamped to `[min, max]` (a two-sided inequality distance constraint, standard in PBD literature) | **Hard** (α≈0, or an inequality projection that only activates outside the band) | This is a literal manufacturing limit (CNC joint-overlap and cut-curvature tolerance) with no design merit to violating it even slightly — same status it has today as a slider clamp. |
| `maxComponentLengthM` (2.35 m, sheet-stock limit) | **Max-length inequality constraint** per member/blank | **Hard** | A component that will not fit the 2.4×1.2 m sheet cannot be cut, full stop — this is the constraint `feetCountFor` currently satisfies by adding a foot; under form-finding the solver must be able to do the *same* move (see §3.1). |
| Flat/planar cut components (every member is a straight blank; `capProfile`/diagrid is discretised into straight struts) | **Per-member rigidity is implicit** (a strut is one edge = trivially straight); planarity becomes relevant at **crown-ring and eave-ring polygons**, and at any future panel infill: a **planarity constraint** (Bouaziz et al. 2012 §4; Pottmann et al. 2007) projects a set of face vertices onto their best-fit plane each iteration | **Hard** for structural members (a strut *is* a line, nothing to constrain); **soft-then-hard** for any panel/infill geometry added later — start soft while iterating on the aesthetic, promote to hard once the fab shop confirms flat-cut panels are load-bearing. |
| Valid joint angles (implicit today — the diagrid's bay geometry keeps incidence angles in a workable range, not explicitly bounded) | **Dihedral/angle constraint** at each node between incident struts, bounding the angle to the pre-engineered joint hardware's valid range | **Hard**, but **currently unmodeled** — this is the single fabrication rule the current codebase does not yet state explicitly as a number (no `minJointAngleDeg`/`maxJointAngleDeg` exists in `GRAMMAR` today). Flag as a real gap: someone (Clay's fab shop) needs to supply the joint hardware's valid angular range before this constraint can be written with a real number, mirroring the `PRICING` block's own "TODO: wire real fab quote" pattern. |
| Ground-anchored feet (`feetCountFor`, `footPull`, foot bearings snap to spokes) | **Positional (pin) constraint**: feet nodes are constrained to `y = 0` (ground plane) and to a valid bearing set; `feetCountFor`'s "does this eave blank fit the sheet" logic becomes a **discrete/combinatorial constraint** — see §3.1, the one part of the grammar that is not a smooth constraint at all. | **Hard** | A foot floating above the lawn is the exact "is it real" failure `geometry.ts`'s own comments call out; this cannot be a soft preference. |
| Aperture / opening (`apertureDeg`, `eaveHeightM`'s lift toward the aperture bearing) | **No hard constraint** — this is a *shape preference*, not a fabrication limit. Encode as a **soft directional bias**: a low-compliance spring pulling the eave-lift profile toward whatever bearing the user's last aperture-region drag implied. | **Soft** | Nothing about manufacturability requires the opening to face any particular way — this is exactly the kind of "material grain" preference described in §3.2, not a hard rule, and should stay editable/overridable the way it is today. |
| PD height cap / min headroom (`pdHeightCapM`, `minHeadroomM`) | **Positional bound constraint** on the crown-apex node's height and on the eave-height field | **Hard** (regulatory + safety, not fabrication, but equally non-negotiable) | Same status as today — planning law and headroom are not "soft" by any reasonable reading. |
| Crown curvature cap (`maxRisePerHalfSpan`, dynamically shrinks the rise bound with smaller footprints) | **Coupled inequality**: rather than one static bound, this is a *relationship* between two other constrained quantities (plan radius and rise) — express as a constraint on local curvature/bending at each strut relative to its span, not a single scalar bound | **Hard**, but **structurally the hardest one to port** — see §5 risks. This is the one existing rule that is not a per-edge or per-node constraint but a *derived relationship*, and naively porting it risks either being too loose (curvature only checked after the fact) or requiring a genuinely new constraint type (discrete curvature/bending-energy constraint, well precedented in Bouaziz et al. 2012 §5 and the isogeometric/dynamic-relaxation bending-active literature, e.g. Rombouts, Lombaert, De Laet, and Schevenels 2019, *Structures*, "A fast and accurate dynamic relaxation approach for form-finding and analysis of bending-active structures") — flagged as the spike's hardest single constraint to get right, not a trivial port. |

### 3.1 The one non-smooth part: feet count and blank splicing are discrete, not continuous

`feetCountFor` is a **combinatorial** decision (3 vs 4 feet, chosen by a discrete search over `n`)
sitting inside an otherwise continuous, differentiable grammar. XPBD constraints are smooth
projections; they do not natively "decide to add a foot." The honest architecture is: XPBD relaxes
the *continuous* shape every frame; a cheap, non-physical **post-solve grammar pass** (reusing
`feetCountFor`/`eaveBlankLengthM` largely as-is) runs once per settle (not once per iteration) to
check whether the current continuous shape's eave perimeter now needs a different foot count, and
if so, re-seeds the constraint graph with the new foot count and lets XPBD relax again. This is a
direct continuation of the existing pipeline shape (`clampParams` already runs after every param
change) — it is not a new architectural pattern, just relocated to sit after the solver instead of
before geometry generation. This hybrid (continuous solve + discrete grammar re-seed) should be
named explicitly in Edward's spike plan so it is not mistaken for a solver bug when a foot silently
appears or disappears mid-drag.

### 3.2 "The shell resists toward buildable" — what that means mechanically

This is not a metaphor to hand-wave; in an XPBD solve it is literally each constraint's **compliance**
(α) value. A hard fabrication limit (max component length, ground anchor) has α≈0 — the solver
allows essentially zero deviation, so the geometry visibly "hits a wall" and stops yielding under the
cursor exactly where it does today when a slider hits a grammar bound. A soft aesthetic preference
(aperture bias, an even-spacing regularization term, a smoothness/fairness term on the surface) has a
larger α — the solver lets the user push past it, but the shape springs back toward the preferred
configuration once the drag releases, the same way a Kangaroo goal or a Shape-Up soft constraint
behaves (Piker 2013; Bouaziz et al. 2012). This is the "material grain" the brief's prompt names: it
is real, well-precedented iterative behavior, not a UX metaphor invented for the pitch — it is the
same relaxation-toward-equilibrium behavior a physical hanging-chain model exhibits when you nudge one
of the weights and let it resettle.

## 4. Manipulation coupling: how a "pull" enters the solver

Edward's existing loop —
`drag handle → proposeFromDrag(kind, worldPoint) → Partial<DesignParams> → setParam → runEngine() →
clampParams() → outputs.geometry.params (CLAMPED) → handleAnchors(params) re-positions the handle` —
generalizes directly, replacing the single global `DesignParams` patch with a **per-node external
position target**:

```
grab node/region (with falloff)
  → pointer raycasts to a constraint plane/surface (as CageHandles already does)
  → world-space target position for the grabbed node, attenuated by a falloff kernel
    over nearby nodes (grabbing one node moves its neighbors partially, like grabbing
    real chain-mail or a stretched net — NOT a rigid single-point pin)
  → each frame: XPBD adds ONE MORE constraint temporarily — "this node/region is
    pulled toward the drag target" — with its own (fairly stiff but not infinite)
    compliance, so it behaves as an added external force, not a teleport
  → solver runs its N constraint-projection iterations (fabrication constraints +
    the temporary drag constraint, together, in the same pass — buildability and
    the user's pull are literally competing/cooperating terms in the same solve)
  → settled positions ARE the shape, every frame — no separate "propose then clamp"
    step; the fabrication grammar and the user's gesture are resolved simultaneously
  → on release, the drag constraint is removed; the shape may creep slightly as it
    relaxes the last of the way toward the nearest fully-buildable equilibrium
```

Two properties this preserves from the current architecture, worth stating explicitly because they
are exactly what makes this on-thesis rather than a generic "let people drag stuff" feature:

1. **The user literally cannot produce an unbuildable shape**, for the same reason sliders cannot
   today — the fabrication constraints are *in the same solve*, not a downstream filter. A drag that
   asks for an over-length strut does not get "corrected after the fact"; the solver's own iteration
   refuses to let that edge lengthen past its bound, so the shape resists the finger in real time,
   the direct-manip plan's "the fabrication limit becomes something you can feel with the cursor"
   made literal at node/region resolution instead of only at the four handle points.
2. **Falloff-region grabs are the natural generalization of the current cage handles** — Sai's
   gesture spec can treat "grab one node, feel the whole lattice around it" as a continuously
   tunable falloff radius/kernel rather than a hard choice between "the four discrete handles today"
   and "every single node is independently draggable" (which would fight the aesthetic and be
   punishing to grab precisely on a real lattice with hundreds of nodes).

## 5. Feasibility and performance budget

### 5.1 Realistic node/constraint counts, computed from the ACTUAL grammar bounds

Running the existing `spokeCount`/`ringCount` formulas (`geometry.ts`) across the grammar's own
envelope (`footprintM2` 12–18, `strutSpacingM` 0.25–0.5, `riseM` up to the 2.5 m PD cap):

- **Default design** (footprint 15 m², strut spacing 0.35 m, rise 2.3 m): spokeCount≈30,
  ringCount≈7 → **≈240 nodes**, **≈450–500 members** (diagrid + crown + eave).
- **Densest buildable design** (footprint 18 m², strut spacing at its 0.25 m minimum): spokeCount≈44,
  ringCount≈11 → **≈530 nodes**, **≈1,000–1,050 members**.

This is a small graph by the standards of the real-time-physics literature this brief cites. For
context: Müller's own public browser XPBD demos ("Ten Minute Physics") run interactive constraint
solves in plain JS/WebGL at far larger scales than this, and a recent WebGPU cloth-simulation
benchmark (Sung, Ma, Kim, Choi, and Hong. 2025. "Real-Time Cloth Simulation Using WebGPU: Evaluating
Limits of High-Resolution Cloth Model." arXiv:2507.11794) reports **60fps maintained up to 640,000
mass-spring nodes on WebGPU**, and notes plain WebGL (Bower's current stack — `three.js`/R3F, not
WebGPU) becomes real-time-constrained only **beyond roughly 10,000 nodes** for a comparable
mass-spring cloth model. Bower's ≈500-node worst case is roughly 20× below even the conservative
WebGL ceiling that paper reports — the node count itself is not a credible source of risk.

**Iteration budget**: XPBD's standard recommendation is a handful of constraint-projection
sub-steps per frame (commonly 4–10, per Macklin et al. 2016) rather than one global stiff solve;
at Bower's scale (≈1,000 constraints, worst case) even 10 sub-steps × 1,000 constraint projections
= 10,000 simple arithmetic operations per frame is trivial for a 16.6ms (60fps) budget on any
device that can already run the existing R3F/three.js scene.

### 5.2 Where it actually breaks — honest risks, not the node count

The node count is not the risk. The risks worth Edward's spike explicitly retiring, ranked:

1. **The curvature/bending coupling (`maxRisePerHalfSpan`) is a derived relationship, not a
   primitive constraint** (§3, last row). Naively encoding it as "check curvature after the solve
   and reject" reintroduces the exact "propose-then-clamp" pattern the form-finding core is meant
   to replace with something felt continuously. Getting this into the constraint graph itself
   (rather than as a post-hoc rejection) is the single hardest, least precedented piece of this
   spec — the bending-active dynamic-relaxation literature (Rombouts et al. 2019) is the closest
   documented treatment and should be the first thing Edward reads if this constraint fights the
   solver.
2. **Non-convergence / local-minima "popping" during large discrete grammar re-seeds** (§3.1): when
   a drag pushes the eave perimeter across a foot-count threshold (3→4 feet), the constraint graph
   itself changes shape mid-interaction. If the re-seed is not handled carefully (e.g. blending the
   new foot's ground-anchor constraint in over a few frames rather than snapping it), the visible
   shape can "pop" — a real risk to validate, not a hypothetical one, since it is baked into the
   existing grammar's own behavior (the "foot added" note already exists in `deriveBounds` for the
   slider case).
3. **Asymmetry limits under one-sided grabs**: the current diagrid generation assumes reasonably
   even ring/spoke structure; a form-finding solver that lets a user pull one region hard while
   leaving the rest untouched can produce local mesh distortion (very short or very long edges
   clustering near the grab point) that the *global* strut-spacing bounds don't catch if they are
   only checked on average rather than per-edge. Confirm the per-edge distance constraint (§3, row 1)
   is genuinely per-edge, not a global mean, before trusting the buildability guarantee under
   asymmetric drags.
4. **Falloff-region tuning is a UX/perf trade, not purely Sai's problem**: a wide falloff radius
   means more nodes get a temporary drag constraint added simultaneously, which is more constraints
   in the per-frame solve — still nowhere near the ≈10,000-node WebGL ceiling at Bower's scale, but
   worth Edward and Sai agreeing the falloff kernel together rather than Sai speccing gesture feel
   in isolation from what the solver can cheaply re-target every frame.

### 5.3 What a minimal viable spike should prove

In priority order, cheapest-to-build-first:

1. **A single param's worth of XPBD, ported 1:1 against the existing grammar bound it replaces** —
   e.g. take just the `strutSpacingM` min/max as a distance-constraint band on one diagrid ring, and
   confirm dragging a node in that ring resists exactly at the bound the slider already enforces
   today, with a visibly smooth "stop" rather than a snap. This directly tests whether XPBD's
   resistance *feels* like the existing grammar's captioned slider-stop, which is the entire
   interaction thesis.
2. **The discrete foot re-seed handled without a visible pop** (§5.2 risk 2) — the single most
   likely thing to look broken in a demo even if the underlying math is correct.
3. **The curvature/bending constraint** (§5.2 risk 1) on a reduced-resolution mesh, checked against
   `maxRisePerHalfSpan`'s existing values as ground truth — if this alone proves intractable inside
   the spike's timebox, that is the point at which the FDM fallback (§2.2) or a simplified "check
   curvature, blend back toward the nearest valid rise on release" compromise should be considered,
   and documented honestly as a compromise rather than silently shipped as if it were the full
   continuous-constraint version.
4. Only after 1–3 hold: scale to the full ≈500-node worst-case mesh and confirm frame time stays
   inside budget on representative hardware (a mid-range laptop, not just a dev machine) — per §5.1
   this is expected to be comfortable, but should be measured, not assumed.

## 6. Summary for the fleet record

**Algorithm**: XPBD (Extended Position-Based Dynamics; Macklin, Müller, and Chentanez 2016,
building on Müller, Heidelberger, Hennix, and Ratcliff 2007), not dynamic relaxation and not the
force density method — because it is the only candidate where a fabrication rule and a "shape it
wants to settle into" are the same primitive (a constraint with a compliance value), it is
unconditionally stable under arbitrary drag speed, and it has public browser-real-time precedent at
node counts far above what Bower needs.

**Buildability enforcement**: every existing `GRAMMAR` rule becomes an XPBD constraint with a
compliance value — hard (α≈0) for true fabrication/regulatory limits (strut length bounds, sheet
length, ground anchoring, PD height cap), soft (α>0) for aesthetic preferences (aperture bearing,
fairness). The user's drag enters as one more temporary constraint in the *same* solve, so the
mesh resists toward buildable exactly the way a hanging-chain model resists toward its equilibrium
when nudged — this is a real, well-precedented mechanism (Bouaziz et al. 2012; Piker 2013), not a
metaphor invented for the pitch. The one genuinely hard piece: the crown-curvature/rise coupling
(`maxRisePerHalfSpan`) is a derived relationship rather than a smooth per-edge constraint, and the
foot-count decision is discrete, not continuous — both need explicit handling, not a naive port.

**Top feasibility risk for Edward's spike to retire**: not node count (≈240–530 nodes / ≈500–1,050
constraints in the full grammar envelope is comfortably inside even conservative WebGL real-time
budgets) — it is getting the **curvature/bending constraint into the solve itself** (rather than as
a post-hoc rejection that reintroduces the propose-then-clamp pattern the whole feature exists to
replace), and handling the **discrete foot-count re-seed** without a visible "pop" when a drag
crosses the 3-vs-4-feet threshold.

---
*Verified references used in this brief (author, year, venue, checked via direct web search this
session, none fabricated): Tomlow 1989 (IL 34); Otto and Rasch 1995/96; Chilton 2000; Barnes 1999
(Int. J. Space Structures 14(2)); Schek 1974 (CMAME 3); Kilian and Ochsendorf 2005 (J. IASS 46(2));
Block and Ochsendorf 2007 (J. IASS 48(3)); Müller, Heidelberger, Hennix, and Ratcliff 2007 (JVCIR
18(2)); Macklin, Müller, and Chentanez 2016 (MIG '16); Jakobsen 2001 (GDC 2001); Piker 2013
(Architectural Design 83(2)); Bouaziz, Deuss, Schwartzburg, Weise, and Pauly 2012 (CGF 31(5));
Pottmann, Liu, Wallner, Bobenko, and Wang 2007 (ACM TOG 26(3)/SIGGRAPH 2007); Adriaenssens, Block,
Veenendaal, and Williams, eds., 2014 (Routledge); Rombouts, Lombaert, De Laet, and Schevenels 2019
(Structures); Sung, Ma, Kim, Choi, and Hong 2025 (arXiv:2507.11794).*
