# Discrete / modular timber structural assembly — literature review for the configurator

Prepared by Senku (Research & Scholar) for the Bower / project-eden configurator, 2026-07-17.
Read-only research task — no source files in this repo were edited.

Scope: real, verifiable sources on discrete/modular timber structural assembly geometry,
compared against what `src/engine/geometry.ts`, `grammar.ts`, `joints.ts`, and `surface.ts`
currently do; a pressure-test of the "compiles ANY form to a certified structure and a
guaranteed price" claim; and what the literature says a credible exploded-assembly drawing
needs to show. Structured per the team lead's request: **what the literature says** /
**what I recommend** / **what needs Daniel**, kept separate throughout.

A verification note up front, in the spirit of "mark what you couldn't verify": this
environment could not render PDFs locally (`pdftoppm`/poppler is not installed), and two of
the primary-source PDFs (Retsin's FABRICATE paper, the Block & Ochsendorf IASS paper) came
back as unparseable binary through the web-fetch tool. Where I only have bibliographic
metadata plus an abstract or press summary — not a close read of the method section — I say
so explicitly next to the citation. I did not fabricate any detail I couldn't source.

---

## 1. What the literature says

### 1.1 Discrete assembly logic — Retsin, Discrete, AUAR

**Gilles Retsin, "Discrete Timber Assembly," in *Fabricate 2020: Making Resilient
Architecture* (London: UCL Press, 2020), pp. 264–271.** Open-access PDF via UCL Discovery
(discovery.ucl.ac.uk/10117333). *Verification: confirmed via UCL Discovery record, the
official Fabricate.org portfolio page, and Academia.edu's abstract page — the abstract and
metadata are solid; I could not close-read the full method section because the PDF didn't
render as text in this environment.*

What the abstract and portfolio description state: the method treats timber components as
"generic and versatile building block[s]" cut from standard sheet stock, whose behaviour
emerges from combinatorial aggregation rather than fixed hierarchical part-types (contrasted
explicitly against 20th-century modernist prefabrication, where a part is a strict type —
e.g. "this is a wall panel"). Complexity comes from repeating a small number of similar
parts with one sequential assembly logic, not from bespoke, one-off components. I could not
find, in what I could read, any stated numeric constraint (member length band, joint angle
limit, node valency) — the paper is programmatic/design-methodological, not a structural
engineering paper, and does not claim FEA-verified structural validity for the demonstrators.

Related, same author group: **Mollie Claypool, Manuel Jimenez Garcia, Gilles Retsin, Vicente
Soler, and colleagues, "Discrete Automation," ACADIA 2020** — confirmed to exist via search
(co-authorship, venue, year), but I did not retrieve or read the paper itself; treat the
title/venue as verified, the content as unread.

**AUAR / Automated Architecture Ltd** (Mollie Claypool and Gilles Retsin, founded 2019) is
Retsin's practice translating the *Discrete* research into a housing product: robotic
"micro-factories" that assemble modular timber-frame wall/floor/roof panels, marketed as
buildable in under 12 hours per home. *Verification: this is practice/press coverage
(housingcoop.eu, techfundingnews.com, CNN, designboom, archello — all consistent with each
other), not a peer-reviewed paper.* I could not find a published academic paper describing
AUAR's actual joint typology or module dimensions — searches for one came up empty. **This
matters for how you can cite it**: AUAR is a strong, real, name-checkable precedent for "a
practice that ships discrete modular timber housing at scale," but it is not itself a source
for a specific geometric constraint. Don't cite it as if it were an engineering paper — cite
it as the applied precedent that the Retsin FABRICATE paper is the design-methodology source
for.

### 1.2 Topological interlocking — Dyskin & Estrin; Wang et al.

**A. V. Dyskin, Y. Estrin, A. J. Kanel-Belov, and E. Pasternak, "Topological interlocking of
platonic solids: A way to new materials and structures," *Philosophical Magazine Letters*
83, no. 3 (2003): 197–203.** *Verification: bibliographic details confirmed via
ResearchGate and Semantic Scholar records; I read the abstract/summary, not the full paper.*
This is the foundational paper (with related 2001 work by the same group) introducing
topological interlocking assembly (TIA) to materials science: identical blocks, geometrically
shaped so that each block is kinematically locked in place by its neighbours plus a
peripheral frame or key — no adhesive, no separate connector. Demonstrated on tessellations
derived from the five Platonic solids.

**Ziqi Wang, Peng Song, Florin Isvoranu, and Mark Pauly, "Design and Structural Optimization
of Topological Interlocking Assemblies," *ACM Transactions on Graphics* 38, no. 6, article
193 (SIGGRAPH Asia 2019). DOI: 10.1145/3355089.3356489.** *Verification: full bibliographic
record confirmed (ACM DL, ArXiv, author's own publication page); I obtained a partial
extraction of the PDF, not a full close read.* This is the relevant, more recent
computational-design paper. Two things from what I could extract are directly load-bearing
for the pressure-test in §3 below:

- The paper's own definition of "structurally valid" in this line of work is primarily
  **kinematic interlocking** — geometric resistance to disassembly by rigid-body motion —
  which is a distinct question from load-bearing capacity under gravity. Where load capacity
  is addressed, it's as an added analysis on top of a specific assembly, not a guarantee that
  falls out of the geometry alone.
- The paper's contribution is a **design and optimization** method: it takes a target
  assembly/topology and optimizes it toward validity. That is a materially different claim
  from "any input form is automatically valid" — the optimization step exists precisely
  because arbitrary block arrangements are *not* automatically interlocking-valid.

### 1.3 EPFL IBOIS — integral timber-plate joinery (Weinand, Robeller)

**Yves Weinand, *Design of Integrally-Attached Timber Plate Structures* (Abingdon:
Routledge, 2021).** *Verification: publisher record confirmed (Routledge/Taylor & Francis,
Amazon, Barnes & Noble listings agree on title/author/year); I have not read the book, only
publisher-supplied description.* IBOIS (Laboratoire de constructions en bois), directed by
Weinand at EPFL, is the standing lab for timber-plate structural joinery — the correct
"EPFL" hit the team lead asked for.

**Christopher Robeller, PhD thesis on integral mechanical attachment for timber folded-plate
structures, EPFL (supervised by Yves Weinand)** — referenced from the IBOIS lab page
(epfl.ch/labs/ibois/research/previousresearch/integral-mechanical-attachment), Infoscience
EPFL record 205759. *Verification: confirmed via the official IBOIS page; I have not read
the thesis itself, only the lab's own summary of it.* What the lab page states directly: the
joint connects thin timber panels edge-to-edge purely through the geometry of the cut
(no fasteners, no adhesive) — a "form-fitting integral joint" that must accommodate
*variable dihedral angles* between panels, must be "sufficiently rigid and stiff," and must
allow "simple, fast and precise assembly on site." Fabrication is 5-axis CNC, with
tool-radius and feed-rate parameters baked into the joint's own geometry generation (the
joint literally has to be re-derived per cutting-tool geometry) — i.e. the geometric family
is bounded by what the CNC tool can physically cut, the same category of constraint (not the
same rule) as this engine's `maxComponentLengthM` sheet limit.

**Related, not fully verified:** a 2020 *Journal of Structural Engineering* paper,
"Macroscopic Model for Spatial Timber Plate Structures with Integral Mechanical
Attachments," vol. 146, no. 10 (2020), DOI 10.1061/(ASCE)ST.1943-541X.0002726, appears in
IBOIS's publication list — I confirmed the DOI and venue exist but could not retrieve the
author list beyond "associated with Weinand's lab." Don't cite named authors for this one
without a direct check.

### 1.4 The Zollinger / lamella system — the joints.ts code's own stated precedent

The `lamella` joint branch in `joints.ts` names itself after this system directly ("classic
Zollinger weave with ONE bolt per node" — `geometry.ts:386`), so it is worth grounding for
real rather than taking the code comment's word for it.

A lamella roof (Zollinger roof, patented by Friedrich Zollinger in 1921, popular in interwar
Germany when steel was scarce) is a timber lattice shell built from short, identical,
diagonally-crossing members ("lamellae") in a diamond pattern, historically fixed with a
**single bolt per node** connecting one continuous member through two offset, butting
members — which is exactly what `JOINTS.lamella` in `config.ts` encodes
(`boltsPerNode: 1`). *This is a genuinely faithful correspondence*, not an invented detail.

Two more recent papers give the actual geometric constraints, and both matter for §2:

**Milica Petrović, Isidora Ilić, Svetislav Mijatović, and Nenad Šekularac, "The Geometry of
Timber Lamella Vaults: Prototype Analysis," *Buildings* 12, no. 10 (2022): 1653. DOI:
10.3390/buildings12101653.** University of Belgrade, Faculty of Architecture. Open access.
*Verification: confirmed via MDPI/DOAJ records and search-result abstract; not a full close
read.* The key finding for our purposes: **their geometric design method is worked out for
lamellae applied to a circular-cylinder surface**, where all lamella axes intersect exactly
at the nodes on that single-curvature surface. Geometrical design proceeds "from the whole
to the lamella" — i.e., the base surface (cylinder) is chosen first, and the lamella pattern
is derived to fit it, not the other way around.

**Hannes Löschke, Alexander Stahr, Tim Henrik Schröder, Felix Schmidt-Kleespies, and Ryan
Hallahan, "Segmentation and Assembly Strategy for Lamella Roof Shell Structures," in
*Proceedings of the IASS Annual Symposium 2020/21 and the 7th International Conference on
Spatial Structures* (Guildford: University of Surrey, 2021).** *Verification: authors and
venue confirmed via IngentaConnect record and the proceedings' own front matter; paywalled,
abstract-level only.* Addresses segmentation of lamella pieces against a maximum cuttable
length and an assembly sequence for shell (not just single-curvature vault) lamella
structures — closer to our doubly curved dome case, but I could not extract its numeric
constraints (length bands, angle tolerances) from the paywalled abstract.

### 1.5 Funicular / compression form-finding — the "guaranteed structure" precedent

**Philippe Block and John Ochsendorf, "Thrust Network Analysis: A New Methodology for
Three-Dimensional Equilibrium," *Journal of the International Association for Shell and
Spatial Structures* 48, no. 3 (2007): 167–173.** *Verification: bibliographic record
confirmed via IngentaConnect, MIT, and ETH Zürich (Block Research Group) hosting the same
PDF; I could not render the PDF as text in this environment, so this is metadata plus the
paper's own stated abstract, not a full method-section read.* The abstract states plainly:
the method "finds possible funicular solutions **under gravitational loading within a
defined envelope**" for a given problem — i.e., you specify a horizontal thrust network,
loads, and a bounding envelope, and TNA finds *a* compression-only equilibrium shape that
fits. This is form-*finding*: an optimization run per geometry/load case, producing one valid
shape (or a small explored set via re-running with different parameters) — it is not a
closed-form parametrization where every point of some continuous parameter range is
automatically in equilibrium. RhinoVAULT, the design tool built on TNA by the same group
(Matthias Rippmann, Block Research Group, ETH Zürich), is explicitly an interactive
form-*finding* tool for that reason — the designer pulls control points and re-solves; the
tool doesn't hand you a slider that stays valid at every position by construction.

---

## 2. What I recommend — comparing the literature's constraints to the current engine

This maps §1's actual constraints onto `geometry.ts`, `grammar.ts`, and `joints.ts` as read
today (constants below are read directly from `src/data/config.ts`, not estimated).

**Faithful — real correspondence to the literature:**

- The lamella system's `boltsPerNode: 1` (`config.ts:143`) with one continuous member
  through-bolted to two offset, butting members (`geometry.ts:388-441`, `joints.ts:66-98`)
  is a correct match to the historic Zollinger single-bolt node (§1.4). This is the
  strongest, most literally-grounded piece of the current joint model.
- `GRAMMAR.maxComponentLengthM = 2.35` (sheet 2.4 × 1.2 m minus clamping margin,
  `config.ts:23-26`) driving where lamella runs and eave/crown blanks must splice
  (`geometry.ts:419-441`, `509-534`) is the same *category* of constraint IBOIS's integral
  joints and Robeller's CNC toolpath work are bounded by: what the stock sheet and the
  cutting tool can physically produce. The rule is legitimate DfMA logic, correctly applied.
- `GRAMMAR.minStrutSpacingM = 0.45` justified as "connector hardware would overlap ... joint
  clearance limit" (`config.ts:40`, `grammar.ts:105`) is the right *kind* of bound — bay
  spacing constrained by physical hardware envelope — even though I have no source that
  verifies the specific 0.45 m figure (that number is presumably from Clay/a fabricator, not
  from a paper, and shouldn't be attributed to one).

**Arbitrary — authored for the render, not derived from any cited rule:**

- `capProfile()` (`geometry.ts:60-63`) — the canopy's crown-to-eave height profile — is a
  `cosh` formula the code's own comment calls "Catenary-ish" and explains was chosen because
  it "reads as built rather than as a plotted parabola" (`surface.ts:100-101`). That is an
  honest admission that it is a *lookalike*, not a computed compression form. Nothing in
  §1.5 was used to derive it — no thrust network, no hanging-chain/funicular check. This is
  the single biggest gap between "looks like Gaudí/a vault" and "is one."
  `eaveHeightAtM()` (`geometry.ts:151-155`) and `footPullAt()` (`geometry.ts:158-166`) are
  the same category: authored shape functions tuned for a good silhouette, not derived from
  a structural rule.
- `GRAMMAR.crownFraction = 0.22` and `GRAMMAR.planAspect = 1.25` (`config.ts:71-75`) are
  fixed, un-sourced aesthetic/proportion choices — reasonable, but not literature-derived,
  and the file header itself says every number here is a placeholder pending a real figure.
- The `apertureDeg` slider has **no grammar rule at all**: `deriveBounds()` returns
  `{ min: 0, max: 359, minRule: '', maxRule: '' }` (`grammar.ts:111-116`), and
  `ENVELOPE.apertureDeg` in `config.ts:176` confirms the same 0–359° range with no
  fabrication or structural rule attached. Aperture controls how much of the eave perimeter
  is open versus grounded — structurally, this is exactly the kind of parameter that would
  govern unsupported cantilever span in a real funicular/compression reading, and it is the
  one slider in the whole grammar that isn't constrained by anything. This is worth fixing
  before it's worth citing a paper over — right now it's the most honest evidence that the
  engine's claim is fabrication-grammar-guaranteed, not structure-guaranteed: a fabrication
  grammar would still let you open 358° of the eave, because nothing here checks whether
  that's still standing up.

**Wrong, or at least unvalidated for the case actually being generated:**

- The lamella/diagrid geometry (§1.4's real precedent) is validated in the literature on
  **single-curvature (developable) surfaces** — Petrović et al.'s cylinder, historically
  Zollinger vaults on barrel-vault geometry. This engine applies the same lamella typology
  over the canopy's **doubly curved** polar cap surface (`canopyPoint()`,
  `geometry.ts:183-203`, with independent radial (`capProfile`) and angular
  (`eaveHeightAtM`/`footPullAt`) curvature) — a genuinely harder geometric case than what I
  found validated. The sheet-cut-length rule (`maxComponentLengthM`) protects against pieces
  that are too *long*; nothing in the code checks that a lamella piece bending across double
  curvature doesn't also need to *twist* out of its own sheet's plane by more than a 45 mm
  LVL sheet (`STOCK.lamella.thicknessMm`, `config.ts:96`) can take without splitting. That's
  a real, checkable geometric quantity (dihedral/torsion angle between successive segment
  planes) that the current grammar doesn't compute or bound anywhere I read — it's the
  timber-lamella analogue of the "variable dihedral angle" constraint that IBOIS's integral
  joints (§1.3) *do* explicitly track and bound.
- No FEA and no funicular/thrust-network check appears anywhere in `geometry.ts` or
  `grammar.ts` — the code says so itself ("STRUCTURAL VALIDITY IS GUARANTEED BY THE GRAMMAR,
  NOT BY FEA," `geometry.ts:15-19`; "No FEA. Validity is 'certainty inside a designed
  family,'" `grammar.ts:13-15`). Given §1.5, that's the honest framing, not an
  overstatement — the risk is only in how it gets described downstream (§3).

---

## 3. The critical one — pressure-testing "compiles ANY form to a CERTIFIED structure and a GUARANTEED price"

**The prior finding holds up against this literature; it is not overturned.** Everything in
§1 that speaks to the question points the same direction:

- Real interlocking-geometry papers, including the most recent computational one (Wang et
  al. 2019, §1.2), *optimize a given topology toward validity* — they don't certify
  arbitrary input geometry. The optimization step exists because most arrangements aren't
  automatically valid.
- Real timber-plate integral joinery (Weinand/Robeller, §1.3) explicitly tracks and bounds
  the one parameter that changes as the target form changes — dihedral angle — precisely
  because a joint valid at one angle isn't automatically valid at another. Validity is
  per-joint-family, not per-arbitrary-shape.
- Real lamella/Zollinger geometry (§1.4) is derived from a specific base surface family
  (developable, in the paper I could verify), not generated freely and then checked.
- Funicular form-finding (Block & Ochsendorf, §1.5) — the closest real precedent to "a
  slider that stays structurally valid as you move it" — produces *one* equilibrium shape
  per solve, for a stated load case and envelope. It is not a continuous family where every
  point is automatically in equilibrium; RhinoVAULT's own workflow is iterative re-solving,
  not a free slider.

So the honest reading, cross-checked against real prior art rather than just this engine's
own comments: what `clampParams()` guarantees is that every parameter combination inside its
bounds can be **cut, jointed, and assembled from the stated stock and hardware** — a
fabrication-grammar guarantee, which is real and is exactly the category of guarantee the
IBOIS/Robeller CNC-tool-bounded joint geometry and the sheet-cut-limit logic in §1.3/§2 also
give. It is not a **structural equilibrium** guarantee in the sense Block & Ochsendorf or a
stamped FEA model would give one, and the literature gives no support for a claim that a
slider-driven family of doubly-curved forms is uniformly structure-valid the way a single
funicular solve is validated for its one shape. The aperture-slider gap in §2 is the concrete
evidence that this isn't fabrication-only pedantry: it's a real, currently-open hole between
what's claimed and what's checked.

**The honest sentence Daniel can say** — the strongest true claim, not the weakest:

> "Every canopy the configurator generates is compiled from a fabrication grammar, not a
> free-form render: every member length, joint angle, and sheet size is checked against the
> real limits of the stock and the hardware before it's shown to you, so what you see is what
> a fabricator can actually cut and bolt together — priced off the same computed geometry,
> piece by piece, not estimated."

That claim is fully supported by what's actually in `geometry.ts`/`grammar.ts`/`joints.ts`
today (explicit node graph, real joint-plane resolution, real sheet-nesting-driven splicing,
a priced BOM off the same data) and by the fabrication-grammar category of guarantee that
§1.3's IBOIS work and §1.4's lamella-splicing literature both actually support. "Certified
structure," "guaranteed price," or "any form" are the words to drop — none of the sourced
literature supports certifying arbitrary form, and "guaranteed" price/structure implies an
engineering sign-off this system doesn't have and doesn't claim to have in its own code
comments.

---

## 4. The explode — what a credible exploded assembly drawing needs to show

General DfMA / exploded-axonometric convention (drawn from architecture-practice and
fabrication-documentation sources — this is craft convention rather than a single citable
paper, flagged as such) converges with what §1.3's IBOIS/Robeller CNC workflow actually
outputs before cutting, on the same short list:

1. **Component taxonomy** — every discrete piece labelled with a stable ID that matches the
   cut list / BOM exactly, grouped by kind (strut, lamella, blank, hub, bolt set). This
   engine already has it: `pieces[].id` and `HardwareItem[].id` in `geometry.ts`/`joints.ts`
   are the real, computed identifiers — an explode view driven off these would be showing
   real data, not inventing a diagram.
2. **Real joint geometry, not centrelines** — the literature (§1.1, §1.3) is emphatic that
   discrete/integral-joint systems are legible *because* the cut face itself carries the
   joint logic. `resolveJointCuts()` already computes real end-cut planes per member
   (`geometry.ts:591`, `endCuts` in `Member`) — an explode that shows the milled/skew end
   faces (not square centreline stubs) is showing the literature's actual credibility signal,
   and the data for it already exists.
3. **Hardware call-outs at each joint** — bolt/plate quantities and specs tied to the node,
   not just totalled in a BOM. `joints.ts` already computes this per system (`boltSpec`,
   `boltsPerNode`/`boltsPerStrutEnd`, fish-plate counts) but keyed to node *kind*, not
   individual node IDs — worth surfacing per-node in the explode rather than only as a kit
   total, since that's the level a fabricator actually checks against a drawing.
4. **Assembly sequence, not just a blow-apart.** This is the piece I did not find any
   equivalent of in the four files reviewed, and it's the one §1.1 treats as load-bearing to
   credibility: Retsin's paper frames discreteness explicitly as "a sequential logic," and
   AUAR's single-axis robotic assembly nodes only make sense as an *ordered* process. A
   static blow-apart with no order reads as decorative; a numbered or animated sequence
   (ground shoes and screws first, then hub/lamella nodes ring by ring from eave to crown,
   struts or lamella pieces last per ring) reads as a real method statement. The node graph
   already carries what's needed to derive this for free — nodes are generated ring by ring
   (`grid[i][j]` in `geometry.ts:302-319`, with `kind: 'ground' | 'eave' | 'interior' |
   'crown'`) — an assembly order is a sort over data the engine already computes, not new
   invented geometry. I'd flag this as the highest-value, lowest-risk addition for "the
   money" shot the team lead described: it turns a real dataset into a sequence claim
   without fabricating anything.

**What would make an architect or fabricator believe it rather than smile at it,** per the
above: the explode has to be traceable — every part in the drawing has to resolve to a row in
the BOM and a real cut plane, and the order has to match how the hardware (screws, then
hubs/bolts, then struts) would actually go together on site. A pretty blow-apart with
generic arrows and no ID correspondence to the priced list is exactly the "smile at it"
outcome; a numbered sequence keyed to real piece IDs and real joint planes is the "believe
it" outcome, and this engine already computes enough of the latter to build it without
inventing data.

---

## What needs Daniel

- **Sign off on the honest claim in §3.** It's a real downgrade from "any form, certified,
  guaranteed" to "every form inside the grammar, fabrication-checked, priced off real
  geometry" — worth confirming that's the sentence you want to say publicly before it goes
  anywhere near copy.
- **Whether to close the aperture-slider gap (§2)** before or after the explode ships. Follow-up
  research (`docs/research/2026-07-17-eave-cantilever-bound.md`) found no citable literature
  bound for it — dihedral-angle research answers fabricability, not load capacity — and
  confirmed directly against the code that the suspended-eave condition it creates is routine
  at every aperture value, not a rare tail. Closing it needs a real EC5 calculation against a
  real load case, i.e. an engineer, not a citation.
- **Whether the doubly-curved-surface gap for the lamella system (§2) is worth a real
  torsion/twist check**, or whether it's an acceptable known limitation for a v1 kit. I don't
  have a sourced numeric bound for LVL sheet twist tolerance to hand — that would need either
  a timber engineer's number or a literature search I haven't done (Weinand/Robeller's thesis
  likely has the real number; I only have the lab's summary, not the thesis itself).
- **Whether to pursue the IBOIS integral-joint (`timberJoinery`) branch already stubbed as a
  TODO in `joints.ts`.** It's the one system in the whole review with a directly-matching,
  well-documented academic precedent (§1.3) — if a third joint system ships, that's the
  strongest literature grounding available of the three.
