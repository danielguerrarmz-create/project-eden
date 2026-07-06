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

## 2. Joint system A — "hub": steel node hubs + straight struts

The flagship detail. Contemporary-gridshell standard (knife-plate node).

**Struts** — 45 × 70 mm planed C24 spruce/larch, factory-treated (UC3), cut
from 4.8 m linear stock on a CNC docking saw. Every strut end gets the SAME
program, only lengths differ:

1. dock cut, square to the member axis (±1 mm)
2. central slot 7 × 105 mm (takes a 6 mm fin + galv allowance)
3. 2 × Ø13 holes at 40 / 85 mm from the end

**Hubs** — S355 steel, 6 mm laser-cut parts: core disc Ø 140 mm + one fin
(60 × 100 mm, 2 × Ø13) per arriving member, welded in a parametric fixture so
each fin's azimuth/dihedral matches the member axes, then hot-dip galvanized.
Every hub is geometrically unique; uniqueness lives entirely in 2D cut files +
fixture angles. Variants:

- interior hub (valence 4)
- crown hub (2 diagonals + 2 ring-segment flanges)
- eave hub (2 diagonals + paired vertical flanges gripping the eave blank)
- ground shoe hub (fins + 200 × 200 × 8 base plate, 4 × Ø13) — sweep feet & leg bases

**Fasteners** — M12 × 70 grade 8.8 HDG bolts + dome nuts, 2 per strut end.

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
camber — you **cut** that, you don't bend it. So lamellas are CNC-profiled,
120 mm deep, from **45 mm spruce LVL sheet stock (2.4 × 1.2 m)** — same sheet
pipeline as the eave blanks. End ops are part of the same CNC profile: skew
butt cut + slotted Ø13 end hole (tolerance take-up), Ø13 mid hole.

**Bounds consequence**: a two-bay piece must fit the 2.35 m sheet cut limit →
the lamella system caps bay spacing lower (~0.8 m) than the hub system. The
grammar surfaces this when the user switches system.

## 4. Eave beam + crown ring (both systems)

- **Eave blanks**: 45 mm LVL, 180 mm deep, CNC-cut to their true plan curve;
  2 blanks per inter-foot span (existing grammar rule — feet are added when a
  blank would outgrow the sheet), and an EXTRA splice is inserted the moment
  any blank would still exceed the sheet cut limit. Where a single bay's
  chord itself outgrows the sheet (the steep eave drop beside a sweep foot),
  the beam splices MID-BAY on a valence-2 fish-plate node — no hub, standard
  edge-beam practice. Out-of-plane twist per blank stays inside the
  flat-piece tolerance the grammar already enforces. Splices: at eave hubs
  (system A) or bolted fish plates 4 mm HDG + 4 × M10 (system B); mid-bay
  splices are fish plates in both systems.
- **Crown ring**: same LVL, 2–4 curved segments around the oculus.

## 5. Meeting the ground — two strategies, user-selectable

Both foundation types are **Ø 76 × 865 mm ground screws** — no concrete,
reversible, installed with a hand impact driver. **[TBC: screw spec per
ground survey]**

- **`legs`** (default): the diagrid terminates at the eave ring everywhere.
  At each grammar-chosen foot bearing (3–4), a leg drops from an eave node to
  a ground screw: paired 45 × 70 posts (A) / paired 45 mm LVL cheeks (B)
  sandwiching a 6 mm T-plate at the head, adjustable HDG post shoe at the
  base. One screw per leg.
- **`sweep`**: the lattice itself curves to the lawn (the more dramatic
  form). The swept bays are ordinary lattice/lamella pieces; the grid node at
  each foot bearing lands EXACTLY at y = 0 on a ground-shoe connector, one
  screw per grounded node. In the lamella system, a two-bay piece that the
  plunging sweep bays would stretch past the sheet limit degrades to
  single-bay pieces, and that node is spliced with a fish plate instead of
  the plain single bolt — the hardware schedule counts both honestly.

## 6. The living armature (species layer)

6 mm stainless wire rope on stainless eye screws driven into the struts, run
at the strut-field's recommended spacing. BOM line = canopy surface area ÷
recommended spacing, plus fixings. It is sacrificial and replaceable; it never
enters the load path. (This is what the 0.25–0.5 m spacing always was.)

## 7. Assembly sequence (kit narrative, drives `BuildPlan`)

Hub system: set ground screws → assemble crown ring + ring 1 flat on
trestles → work outward ring by ring, bolts snug not torqued → hang eave
blanks → stand legs / tilt onto ground shoes → torque all → rig armature
wires → plant. Lamella system: same outside-in, one bolt per node, temporary
centre prop until the eave closes.

Piece labelling: every piece engraved/inked with its member id (`lat-3-14-a`),
every hub with its node id. The cut files ARE the instructions.

## 8. Tolerances

| Operation | Tolerance |
|---|---|
| Docking saw length/end cut | ±1.0 mm |
| CNC sheet profile | ±0.5 mm |
| Hub weld fixture | ±1.5 mm (slotted end holes absorb accumulation) |
| Ground screw plan position | ±30 mm (shoe slots + leg-head adjustability absorb it) |

## 9. Roadmap — bookmarked, not built

- **Joint system C — 5-axis all-timber joinery** (BUGA-Wood-Pavilion style
  milled timber-timber connections, no visible steel). Premium line; needs an
  industrial joinery partner (Hundegger/5-axis). Bookmarked in
  `types.ts` (`JointSystem`) and `config.ts` (`JOINTS`) — the node-graph
  representation added for A/B is exactly what C will consume.
- Chartered-engineer sign-off widening the grammar's footprint family.
- Real fabricator quotes replacing every **[TBC]** rate in `config.ts`.
