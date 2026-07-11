# FABRICATION.md — how a v1 pavilion is physically put together

This document is the source of truth the engine's geometry and BOM must serve.
Code follows this file, not the other way round. Where a number is a
placeholder pending a fabricator's quote or an engineer's sign-off it is
marked **[TBC]** and mirrored as a named constant in `src/data/config.ts`.

The product ships as a **kit**: every piece labelled, no site welding, no site
CNC, assembled by 2–3 people with hand tools and a torque wrench. Two joint
systems are offered (a third is a roadmap item), and two ways of meeting the
ground. All four combinations are valid designs.

---

## 0. What "standardized" means here

We do **not** force every strut to an identical length — on a doubly-curved
surface that would collapse the design space to a dome of revolution. We
standardize the things repetition actually buys:

| Standardized | Varies freely (CNC makes it free) |
|---|---|
| ONE timber section per role | piece lengths |
| ONE joint detail per system | joint angles (absorbed by the connector or the CNC profile) |
| ONE fastener set | connector plate geometry (2D laser cutting) |
| ONE end-milling program (hub system) | — |

The principle: **put the angular complexity in whichever part is cheapest to
make unique.** For the hub system that is flat steel. For the lamella system
that is the CNC sheet profile. Timber end operations stay commodity.

---

## 1. Shared geometry facts (both systems)

- Two length rules govern every piece: SHEET pieces must fit the CNC cut
  limit (2.35 m on a 2.4 m sheet); LINEAR pieces must fit the courier /
  two-person-handling cap (3.0 m — the docking stock itself is 4.8 m).
- Plan: ellipse, aspect 1.25, footprint 12–18 m² → span ≈ 4.4–5.4 m.
- Rise 1.9–2.5 m → the cap is tightly curved: local radius ≈ 2.5–4 m.
  Consequence: **nothing longer than ~1.4 m can pretend to be straight along
  the surface.** Straight members must span a single bay; anything longer is
  cut curved from sheet.
- Diagrid: rings × spokes polar net, two diagonal families, crown compression
  ring around the oculus, eave edge-beam around the free edge.
- Structural bay (node-to-node): **0.45–1.05 m** depending on system (§2, §3).
  This replaces the old 0.25–0.5 m range, which was plant-armature scale and
  would have produced ~500 joints on a 5 m span. The fine plant support is a
  separate sacrificial layer (§6) — exactly the decoupling the engine already
  claims.

## 1a. The joint-geometry model — one planar cut per member end

How members come together at a node is not decoration; it is the model. The
rule that makes it representable AND fabricable:

> **Every member is its rectangular section extruded along its centreline and
> terminated by exactly two PLANAR cuts.** A docking saw makes a square
> plane; the CNC sheet profile makes a skew plane. No other end geometry
> exists in v1. (Slots and holes are subtractions *inside* the solid — they
> never change the silhouette.)

The engine carries each end's cut plane (point + outward normal) explicitly.
The 3D solid is the section prism clipped by its two planes; the cut schedule
derives lengths from the same planes. Trims are therefore **computed**
(centreline-to-plane distances), never constants.

The full catalogue of end conditions — every member end in either system is
exactly one of these:

| End condition | Where it occurs | The cut plane |
|---|---|---|
| **square standoff** | hub-system strut ends, every node kind; ALL timber ends at ground nodes (both systems) | ⊥ member axis, at the smallest standoff where every corner of the end face clears the node's **connector envelope** (Ø140 cylinder about the node normal) by ≥ 10 mm, clears every NEIGHBOURING member's centreline by half-width + 10 mm (timber never touches timber, whatever the node angle), at ring nodes clears the blank's inner face by ≥ 5 mm, and at ground nodes clears the **splash plane** (§5). Floor = core radius (70 mm). The end program stays identical; only length varies. |
| **skew butt** | lamella ends at woven interior nodes | the continuous lamella's **side face**: offset half its 45 mm thickness + 2 mm assembly gap from the node centre, along its width direction. Cut as part of the CNC profile. |
| **blank-face butt** | lamella ends at crown / eave / ground ring nodes | the blank's **inner face**: 90 mm from the ring centreline + 2 mm gap. |
| **mitre** | wherever two segments of the SAME piece pass through a node (a two-bay lamella's through-node, blank facet-to-facet) and blank piece ends at ring nodes | the **bisector plane** of the two segment axes, through the node centre. Both sides cut on one plane → the faceted representation of a curved piece closes with zero gap or overlap. |
| **splice gap** | valence-2 mid-bay splice nodes; split-weave lamella nodes | ⊥ member axis, 1.5 mm short of the node (3 mm total joint gap); fish plates carry across. |

Why the hub standoff must be computed, not fixed: members meet the node at
varying angles to the node normal, so a fixed 70 mm standoff lets one corner
of a square-cut end face clip into the steel core. Solving the corner-
clearance condition per end (typically 75–85 mm) keeps timber off steel at
every approach angle while the milling program stays one program.

**The flat-piece rule.** Every SHEET piece (lamella, eave/crown blank) is cut
from flat 45 mm LVL, so each piece owns **one plane** — its sheet plane — and
its section is oriented to that plane for its whole length, not re-tilted
per segment. Two computed checks gate every sheet piece, and a run SPLITS the
moment either would fail (exactly like the length rule):

- **planarity**: every centreline node of the piece lies within ±8 mm
  **[TBC: what the slotted holes + fixture tolerance absorb]** of the piece's
  plane — a flat piece cannot bow out of its own plane;
- **lean**: the plane-derived section direction stays within 15° **[TBC]**
  of the ideal surface normal at every node — beyond that the flat piece
  visibly falls off the shell and the crossing joints misalign.

Consequences the model now shows honestly: the steeply-plunging eave beside a
sweep foot splits into short single-facet blanks (a flat piece cannot follow
that curve), and a two-bay lamella whose kink plane leaves the surface
degrades to single bays. Mitred segments of one piece close EXACTLY, because
both sections live in the same sheet plane.

## 2. Joint system A — "hub": steel node hubs + straight struts

The flagship detail. Contemporary-gridshell standard (knife-plate node).

**Struts** — 45 × 70 mm planed C24 spruce/larch, factory-treated (UC3), cut
from 4.8 m linear stock on a CNC docking saw. Every strut end gets the SAME
program, only lengths differ:

1. dock cut, square to the member axis (±1 mm)
2. central slot 7 × 185 mm (takes a 6 mm fin + galv allowance)
3. 2 × Ø13 holes at **85 / 145 mm** from the end — these are DERIVED, not
   chosen: EC5 bolt rules for M12 in timber want ≥ 5d = 60 mm spacing along
   grain and ≥ max(7d, 80) = 84 mm loaded-end distance. (The earlier
   40/85 mm draft failed the end-distance rule — an engineer's first
   redline.) **[TBC: chartered-engineer confirmation of the joint family]**

**Hubs** — S355 steel, 6 mm laser-cut parts: core disc Ø 140 mm + one fin
(60 mm deep, reaching the full 185 mm slot, 2 × Ø13) per arriving member,
welded in a parametric fixture so
each fin's azimuth/dihedral matches the member axes, then hot-dip galvanized.
Every hub is geometrically unique; uniqueness lives entirely in 2D cut files +
fixture angles. Variants:

- interior hub (valence 4)
- crown hub (2 diagonals + 2 ring-segment flanges)
- eave hub (2 diagonals + paired vertical flanges gripping the eave blank)
- ground shoe hub (fins + 200 × 200 × 8 base plate, 4 × Ø13) — the rooted feet

**Fasteners** — M12 × 70 grade 8.8 HDG bolts + dome nuts, 2 per strut end.

**Milled-end geometry** (§1a): every strut end is a square cut at a
**computed standoff** — the smallest length at which the whole end face
clears the node's Ø140 connector envelope by 10 mm (floor: the 70 mm core
radius). Struts never touch each other and never touch the core; they hang on
the fins. The standoff is subtracted into the physical cut length, the cut
schedule prices it, and the 3D view draws exactly that solid. At ring nodes
the connector is the flange variant (plates gripping the blank + fins), so
the strut end additionally clears the blank's inner face.

**Why it's legit**: struts carry axial force into fins in double shear; the
free-edge canopy sees real wind uplift and the bolted fin takes tension as
happily as compression. An engineer stamps the *joint family* once
(fin/bolt/edge-distance rules), which is exactly the grammar's claim. **[TBC:
chartered engineer sign-off of the family]**

## 3. Joint system B — "lamella" (Zollinger): CNC LVL + one bolt per node

The all-timber-plus-bolts budget line; system proven in hundreds of
1920s–30s Zollinger roofs and revived in CNC plywood pavilions.

**Lamellas** — each piece spans TWO bays and passes through an intermediate
node; at every node exactly one lamella runs continuous and two butt into its
side faces, all joined by **one M12 × 180 HDG bolt + 50 mm washers** through
the continuous piece's mid-hole. Continuity alternates by ring parity, giving
the classic woven diamond.

Because the surface radius is ~3 m, a two-bay piece needs up to ~80 mm of
camber — you **cut** that, you don't bend it. So lamellas are CNC-profiled
from **45 mm spruce LVL sheet stock (2.4 × 1.2 m)** — same sheet pipeline as
the eave blanks. End ops are part of the same CNC profile: skew butt cut +
slotted Ø13 end hole (tolerance take-up), Ø13 mid hole.

**Every lamella is ITS OWN piece — the profile is the point.** The CNC cuts
whatever 2D drawing is in the sheet plane, so the drawing is the true one:
the top edge rides the shell (its camber follows THIS piece's location on
the surface), and the depth is **moment-shaped** — 120 mm at the node where
a two-bay piece takes its bolt and its peak bending, tapering to 100 mm at
the butt ends (never below the Ø13 end-hole's 3d edge distances). No two
lamellas share a profile unless the surface says so; uniqueness costs
nothing because it lives entirely in the cut file. The model computes and
carries each piece's developed curve and CAMBER — and the camber goes into
the piece's nested width on the sheet, so the sheet count prices the true
curved profile, not a wishful rectangle.

**Honest caveat**: the classic Zollinger end hole sits closer to the piece's
end than EC5's 7d loaded-end distance — the joint is compression-dominant
and clamped, which is how the historic roofs stand, but this is exactly the
detail a chartered engineer must sign, not the model. **[TBC: engineer
sign-off of the lamella node]**

**OPEN ISSUE — net torsion vs flat lamellas.** Measured on the current polar
net, a two-bay flat lamella's plane leans **38–70°** off the shell normal:
the diagonal chains curve hard in-plan (spokes converge toward the crown),
and a flat on-edge piece cannot follow both that plan curvature and the
surface camber. Zollinger's historic domain is barrel vaults and nets
designed for low geodesic torsion — not this net. The model now applies the
flat-piece rule honestly: pieces beyond the interim 45° lean cap **[TBC:
engineer's structural limit]** degrade to single bays with fish plates, so
MOST of the weave currently degrades. Restoring the true woven system is
owned by the net re-parameterization roadmap item (§9); until then the
lamella system is priced as what it actually is.

**Milled-end geometry** (§1a): a butting lamella end is a **skew cut ON the
continuous piece's side-face plane** — half its 45 mm thickness plus a 2 mm
assembly gap from the node centre, along the continuous piece's width
direction. The cut is NOT square to the butting piece's own axis; it is part
of the CNC profile, which is why it costs nothing extra. Ends at the
crown/eave rings are skew cuts on the blank's inner-face plane (90 mm + 2 mm
gap). A two-bay piece's through-node is a mitre in the faceted model (the
real piece is continuous and curved there). All trims derive from the planes
and flow into the cut length.

**Bounds consequence**: a two-bay piece must fit the 2.35 m sheet cut limit →
the lamella system caps bay spacing lower (~0.8 m) than the hub system. The
grammar surfaces this when the user switches system.

## 4. Eave beam + crown ring (both systems)

- **Eave blanks**: 45 mm LVL, 180 mm deep, CNC-cut to their true plan curve —
  and modelled that way: each blank is a smooth arc in its own sheet plane
  (the node polyline is only the joint graph), its camber carried into its
  nested sheet width like every other sheet piece;
  2 blanks per inter-foot span (existing grammar rule — feet are added when a
  blank would outgrow the sheet), and an EXTRA splice is inserted the moment
  any blank would still exceed the sheet cut limit. Where a single bay's
  chord itself outgrows the sheet (the steep eave drop beside a sweep foot),
  the beam splices MID-BAY on a valence-2 fish-plate node — no hub, standard
  edge-beam practice. Out-of-plane twist per blank stays inside the
  flat-piece tolerance the grammar already enforces. Splices: at eave hubs
  (system A) or bolted fish plates 4 mm HDG + 4 × M10 (system B); mid-bay
  splices are fish plates in both systems.
- **Blank end geometry** (§1a): facet-to-facet inside a blank AND blank-to-
  blank at a ring node are **mitres** — both segments cut on the shared
  bisector plane, so the ring closes with no corner gap or overlap (the real
  piece is CNC-cut smooth to its plan curve; the mitred facets are its exact
  faceted representation). Mid-bay splice nodes are square cuts with a 3 mm
  joint gap under the fish plates.
- **Crown ring**: same LVL, 2–4 curved segments around the oculus.

## 5. Meeting the ground — the sweep roots itself

There is ONE way this pavilion meets the lawn, and it IS the typology: the
lattice sweeps down and **roots at its feet**. The swept bays are ordinary
lattice/lamella pieces; the grid node at each grammar-chosen foot bearing
(3–4) lands EXACTLY at y = 0 on a ground-shoe connector over a driven
**Ø 76 × 865 mm ground screw** — no concrete, reversible, installed with a
hand impact driver. One screw per grounded node. **[TBC: screw spec per
ground survey]**

**The splash plane — timber never sits at grade.** Durability (UC3 treated
timber, end grain) demands the timber stop ABOVE the splash zone: every
member end arriving at a ground node — swept lattice, lamella and the eave
band alike — is square-cut so its whole end face clears **y = 150 mm**
**[TBC: splash clearance per exposure]**. The steel bridges the gap: the
ground shoe is the base plate over the screw plus a welded **upstand** (hub
system: upstand fin the strut slots onto, same end program as every other
end; lamella system: bent-plate stirrup gripping the piece's side faces —
side bolts, no end slot, because a swept foot bay is too short to carry two
full slots). The bearing NODE stays at y = 0 — that is the screw — but no
timber does.

In the lamella system, a two-bay piece that the plunging sweep bays would
stretch past the sheet limit degrades to single-bay pieces, and that node is
spliced with a fish plate instead of the plain single bolt — the hardware
schedule counts both honestly.

## 6. The living armature (species layer)

6 mm stainless wire rope on stainless eye screws driven into the struts, run
at the strut-field's recommended spacing. BOM line = canopy surface area ÷
recommended spacing, plus fixings. It is sacrificial and replaceable; it never
enters the load path. (This is what the 0.25–0.5 m spacing always was.)

## 7. Assembly sequence (kit narrative, drives `BuildPlan`)

Hub system: set ground screws → assemble crown ring + ring 1 flat on
trestles → work outward ring by ring, bolts snug not torqued → hang eave
blanks → tilt the swept feet onto their ground shoes → torque all → rig
armature wires → plant. Lamella system: same outside-in, one bolt per node,
temporary centre prop until the eave closes.

Piece labelling: every piece engraved/inked with its member id (`lat-3-14-a`),
every hub with its node id. The cut files ARE the instructions.

## 8. Tolerances

| Operation | Tolerance |
|---|---|
| Docking saw length/end cut | ±1.0 mm |
| CNC sheet profile | ±0.5 mm |
| Hub weld fixture | ±1.5 mm (slotted end holes absorb accumulation) |
| Ground screw plan position | ±30 mm (slotted shoe plates absorb it) |

## 9. Roadmap — bookmarked, not built

- **Net re-parameterization (fairness).** The polar net crowds bays toward
  the crown, twists the diagonal chains, and the foot sweep compresses the
  last bay above each shoe. Three quantified debts now hang on it:
  `subMillableStrutCount` (crown-zone + foot-zone struts too short for two
  EC5-length slots, counted per design), the §3 net-torsion issue (lamella
  lean 38–70° → the weave degrades), and the §5 foot detail where the
  splash standoff consumes most of the last bay (taller engineered upstand
  **[TBC]**). A re-meshed net with near-uniform bays and low-torsion lamella
  paths drives all three down and is the single highest-leverage geometry
  improvement left.
- **Joint system C — 5-axis all-timber joinery** (BUGA-Wood-Pavilion style
  milled timber-timber connections, no visible steel). Premium line; needs an
  industrial joinery partner (Hundegger/5-axis). Bookmarked in
  `types.ts` (`JointSystem`) and `config.ts` (`JOINTS`) — the node-graph
  representation added for A/B is exactly what C will consume.
- Chartered-engineer sign-off widening the grammar's footprint family.
- Real fabricator quotes replacing every **[TBC]** rate in `config.ts`.
