/**
 * config.ts — THE ONE PLACE every stubbed constant lives.
 *
 * Honesty rule (demo-spec §0, §2.3): every number that is a placeholder is a
 * NAMED CONSTANT here, never a magic number buried in the engine. When a real
 * figure lands (Clay's fab quote ~Day 4–6, an install allowance from a designer
 * call) it is wired in HERE and the whole engine updates. Nothing downstream
 * invents its own numbers.
 */

// ---------------------------------------------------------------------------
// GRAMMAR — the fabrication rules the whole design space derives from.
// (demo-spec §2.2: "this IS the pitch")
// ---------------------------------------------------------------------------
/**
 * Every slider bound in the demo derives from one of these stated rules, and
 * the UI surfaces WHICH rule stopped the slider as a quiet caption. The rules
 * stand in for a real fab shop's capability sheet + a pre-engineered joint
 * family a chartered engineer has stamped once — the constraint ARCHITECTURE
 * is the invention; these numbers are its current authored bounds.
 */
export const GRAMMAR = {
  /** CNC sheet stock the curved pieces are cut from (standard 2.4 × 1.2 m). */
  sheet: { lengthM: 2.4, widthM: 1.2 },
  /** Longest SHEET piece we cut — sheet length minus clamping margin. */
  maxComponentLengthM: 2.35,
  /** Longest LINEAR piece in the kit — courier/handling cap, not the saw
   *  (docking stock is 4.8 m; nothing ships longer than this). */
  maxLinearPieceM: 3.0,
  /** Saw kerf + handling gap between nested parts on a sheet. */
  nestingKerfM: 0.012,
  /** Cut lengths round to this bucket so components collapse into a tidy cut-list. */
  cutListRoundingM: 0.05,

  /**
   * Structural bay bounds (node-to-node spacing) — FABRICATION.md §1–§3.
   * Below the min, connector hardware (hub fins / lamella bolt edge
   * distances) physically overlaps at acute diamond angles.
   */
  minStrutSpacingM: 0.45,
  /** Hub system cap: above this the unsupported armature span between
   *  struts exceeds the flat-piece curvature tolerance. */
  maxStrutSpacingM: 1.05,
  /**
   * Lamella system cap: a lamella spans TWO bays through its node, and the
   * whole curved piece must still fit the CNC sheet cut limit. Grammar
   * surfaces this the moment the user switches joint system.
   */
  maxLamellaSpacingM: 0.6,

  /** Permitted-development height cap — no planning application needed. HARD. */
  pdHeightCapM: 2.5,
  /** Minimum clear headroom under the eave — people walk beneath the canopy. */
  minHeadroomM: 1.9,
  /**
   * Crown curvature limit, expressed as max rise per metre of minor half-span.
   * Tighter than this and individual flat components would need to approximate
   * more curvature than the cutter's tolerance allows. Makes the rise bound
   * DYNAMIC: a small footprint caps rise below the 2.5 m planning cap.
   */
  maxRisePerHalfSpan: 1.28,

  /**
   * The engineer-validated structural family covers this footprint range.
   * TODO: widen with a chartered engineer's sign-off — this is the roadmap
   * ("each delivered commission widens the grammar"), stated as such.
   */
  minFootprintM2: 12,
  maxFootprintM2: 18,

  /** Plan proportion of the canopy ellipse (major/minor). Fixed, not a slider. */
  planAspect: 1.25,

  /** Crown oculus radius as a fraction of the plan — the diagrid starts here. */
  crownFraction: 0.22,

  /**
   * Eave beam blanks are curved pieces cut from sheet stock, spliced only at
   * feet and at one midpoint between feet (2 blanks per inter-foot span). The
   * engine ADDS a foot when a blank would exceed maxComponentLengthM — the
   * grammar visibly reshaping the design.
   */
  eaveBlanksPerFootSpan: 2,
  minFeet: 3,
  maxFeet: 4,
} as const;

// ---------------------------------------------------------------------------
// STOCK — the standardized material palette (FABRICATION.md §0–§4).
// ONE section per role; lengths vary freely because CNC makes that free.
// ---------------------------------------------------------------------------
export const STOCK = {
  /** Hub-system struts: planed C24 spruce/larch, UC3 treated. */
  strut: { widthMm: 45, depthMm: 70, grade: 'C24', stockLengthM: 4.8 },
  /** Lamella pieces: CNC-profiled from 45 mm spruce LVL sheet (curved, so cut not bent). */
  lamella: { thicknessMm: 45, depthMm: 120 },
  /** Eave + crown blanks: 45 mm LVL, cut to their true plan curve. */
  blank: { thicknessMm: 45, depthMm: 180 },
} as const;

// ---------------------------------------------------------------------------
// JOINTS — the two v1 joint systems (FABRICATION.md §2–§3).
// TODO(roadmap): third system 'timberJoinery' — 5-axis all-timber milled
// connections (BUGA-style, no visible steel). The node-graph representation
// the geometry now emits is exactly what it will consume. FABRICATION.md §9.
// ---------------------------------------------------------------------------
export const JOINTS = {
  hub: {
    /** S355 laser-cut fin thickness (mm); strut end slot = fin + galv allowance. */
    finThicknessMm: 6,
    slotMm: { width: 7, depth: 105 },
    /** Fin plate the strut slots onto: 60 mm tall (inside the 70 mm depth). */
    finHeightMm: 60,
    /** M12×70 8.8 HDG through-bolts per strut end into the fin. */
    boltsPerStrutEnd: 2,
    boltSpec: 'M12×70 8.8 HDG + dome nut',
    /** Bolt hole centres from the strut end face (mm) — FABRICATION.md §2. */
    boltInsetsMm: [40, 85],
    boltDiaMm: 12,
    /** Hub core drum diameter / height (mm). The core claims a cylindrical
     *  CONNECTOR ENVELOPE about the node normal at EVERY node (interior core,
     *  ring flange assembly, ground shoe alike) — timber stays out of it. */
    coreDiaMm: 140,
    coreHeightMm: 80,
    /**
     * MILLED-END STANDOFF (FABRICATION.md §1a): every strut end is a square
     * cut at a COMPUTED standoff — the smallest length where the whole end
     * face clears the connector envelope by `envelopeClearanceMm`, whatever
     * the approach angle. This is the FLOOR (the core radius); the computed
     * value is typically 75–85 mm and is subtracted into the CUT length.
     */
    strutStandoffM: 0.07,
    /** Timber-to-steel clearance at the envelope (mm). */
    envelopeClearanceMm: 10,
    /** At ring nodes the strut end also clears the blank's inner face (mm). */
    blankFaceClearanceMm: 5,
  },
  lamella: {
    /** One through-bolt per node: continuous lamella mid-hole + two butting ends. */
    boltsPerNode: 1,
    boltSpec: 'M12×180 8.8 HDG + 50 mm washers',
    boltDiaMm: 12,
    /**
     * MILLED-END GEOMETRY (FABRICATION.md §1a): a butting end is a SKEW cut
     * on the continuous piece's side-face plane — half its thickness plus
     * this assembly gap from the node centre. Ends at the rings are skew cuts
     * on the blank's inner-face plane (half the blank depth + the same gap).
     * The trims are DERIVED from those planes, not constants.
     */
    assemblyGapMm: 2,
  },
  /** Mid-bay splice + split-weave nodes: square cuts leaving this total
   *  joint gap under the fish plates (half each side). */
  spliceGapM: 0.003,
} as const;

// ---------------------------------------------------------------------------
// FOUNDATION — both foot strategies land on ground screws; no concrete.
// ---------------------------------------------------------------------------
export const FOUNDATION = {
  /** TODO: confirm screw spec per ground survey (FABRICATION.md §5). */
  groundScrewSpec: 'Ø76 × 865 mm HDG ground screw',
} as const;

// ---------------------------------------------------------------------------
// ENVELOPE — slider ranges + defaults (bounds justified by GRAMMAR rules;
// the live per-design bounds come from engine/grammar.ts deriveBounds()).
// ---------------------------------------------------------------------------
export const ENVELOPE = {
  footprintM2: { min: GRAMMAR.minFootprintM2, max: GRAMMAR.maxFootprintM2, default: 15 },
  riseM: { min: GRAMMAR.minHeadroomM, max: GRAMMAR.pdHeightCapM, default: 2.3 },
  strutSpacingM: { min: GRAMMAR.minStrutSpacingM, max: GRAMMAR.maxStrutSpacingM, default: 0.55 },
  apertureDeg: { min: 0, max: 359, default: 90 }, // 90 = opens east, toward morning light
  /** Default joint system (FABRICATION.md §2–§3). */
  jointSystem: 'hub',
} as const;

// ---------------------------------------------------------------------------
// SITE — fixed site assumptions (no site import in this demo, spec §2.6).
// The sun-path still runs for real so "opens toward morning light" and the
// sunward strut bias are astronomy, not copy.
// ---------------------------------------------------------------------------
export const SITE = {
  latitudeDeg: 51.5, // London-ish
  /** World north: scene +Z. Kept as a constant so a site step could return. */
  northDeg: 0,
} as const;

// ---------------------------------------------------------------------------
// PRICING — price = Σ components × rate + install + groundwork + planting
//           + margin, shown as ONE fixed figure (demo-spec §2.3).
// ---------------------------------------------------------------------------
export const PRICING = {
  /**
   * TODO: wire real fab quotes (Clay, Day 4–6). Every unit rate below is a
   * PLACEHOLDER until a fabricator returns an itemised quote against the
   * demo's ACTUAL cut geometry + hardware schedule. Until then the price
   * MOVES correctly (it is built from the real BOM); it is not yet TRUE.
   */

  /** £/m — 45×70 planed C24, UC3 treated, delivered (hub struts). */
  timberPerMetreGBP: 7,
  /** £/sheet — 45 mm spruce LVL 2.4 × 1.2 m (lamellas, eave + crown blanks). */
  lvlSheetGBP: 215,
  /** £/sheet — CNC profiling one full sheet (lamellas / blanks). */
  sheetCncGBP: 65,
  /** £/piece — docking-saw end program on a linear piece (2 ends: dock+slot+drill). */
  dockingPerPieceGBP: 5,

  /** Steel + fixings unit rates, keyed by the hardware ids joints.ts emits. */
  hardwareGBP: {
    /** Welded + HDG steel node hub (per fin averaged in). */
    hub: 32,
    /** Ground-shoe hub: hub + 200×200×8 base plate (the rooted touchdowns). */
    hubGroundShoe: 48,
    /** Bent-plate ground shoe for lamella touchdowns. */
    plateGroundShoe: 24,
    /** M12 bolt set (bolt + nut + washers), either system. */
    boltSet: 1.4,
    /** 4 mm HDG fish-plate pair + M10 sets (blank splices, lamella system). */
    fishPlate: 9,
    /** Ø76 × 865 ground screw, supplied AND driven (no concrete). */
    groundScrew: 175,
    /** Living armature: 6 mm stainless wire + eye screws, per metre run. */
    armatureWirePerM: 3.2,
  } as Record<string, number>,

  /** TODO: confirm with installer — fixed mobilisation (crew, delivery). */
  installBaseGBP: 3800,

  /** TODO: confirm with installer — marginal install labour per timber piece. */
  installPerComponentGBP: 6.5,

  /** TODO: confirm with horticultural partner — supply + plant one climber. */
  plantingPerPlantGBP: 55,

  /**
   * Margin + fixed-price guarantee. Covers the designer channel fee, VAT
   * treatment and contingency in one stated line so the on-screen figure can
   * honestly read "fixed", not "estimate". Shown in the decomposition — hiding
   * it would be the overclaim the application warns against.
   */
  marginRate: 0.28,

  /** The fixed figure is rounded to this so it reads as a commitment. */
  roundTotalToGBP: 100,
} as const;

// ---------------------------------------------------------------------------
// ECOLOGY — rule-of-thumb formulas (kept: the living layer is the reframe)
// ---------------------------------------------------------------------------
export const ECOLOGY = {
  /** TODO: site-specific rainfall (Met Office 1991-2020). SE England ballpark. */
  annualRainfallMm: 690,

  /** Runoff coefficient for a slatted lattice canopy captured to beds. */
  roofRunoffCoefficient: 0.55,

  /**
   * Pollinator "cells": a coarse habitat unit = 1 per this many m² of flowering
   * coverage, scaled by the species' pollinator value. Rule of thumb for the
   * readout, NOT an ecological survey.
   */
  m2PerPollinatorCellAtFullValue: 1.4,

  /** Carbon rough proxy: kg CO2e sequestered per m² of mature leaf coverage/yr. */
  carbonKgPerM2PerYr: 1.1,
} as const;

// ---------------------------------------------------------------------------
// GROWTH — visual approximation of establishment
// ---------------------------------------------------------------------------
export const GROWTH = {
  /** Years the toggle can show. Year 3 = "finished in year three". */
  years: [0, 1, 3] as const,
  /** Coverage saturates as growth approaches this fraction of the lattice. */
  maxCoverageFraction: 0.92,
  /** Year-0 establishment: what a freshly-planted climber covers on day one. */
  year0CoverageFraction: 0.04,
  /** Characteristic climb length (m) from bed to crown of the canopy. */
  characteristicLengthM: 2.6,
} as const;

export type Year = (typeof GROWTH.years)[number];

// ---------------------------------------------------------------------------
// LEAD TIME — quoted build lead time (stubbed)
// ---------------------------------------------------------------------------
/** TODO: confirm with fab shop + installer once real capacity is known. */
export const LEAD_TIME = {
  baseWeeks: 6,
  weeksPerHundredComponents: 2,
} as const;

// ---------------------------------------------------------------------------
// NAMING — two distinct proper nouns, both correct (confirmed 2026-07-05):
//   WORDMARK ("Bower")  = the COMPANY / studio / brand behind the work. Used in
//                         all brand chrome (headers, nav, commission-sheet mark).
//   PRODUCT  ("Eden")   = the thing a client commissions (the object itself).
//                         Used in product copy, e.g. "Commission a living Eden".
// The common noun "bower" (a garden structure, like pavilion/arbor) may still be
// used lowercase in generic prose; only the COMPANY brand is the proper noun.
// ---------------------------------------------------------------------------
export const WORDMARK = 'Bower';
export const PRODUCT = 'Eden';

/**
 * ENGINE_NAME — the generative engine's proper noun. NOT YET DECIDED: Daniel and
 * Clay have an open call (candidates floated: Espalier / Trellis / Grammar /
 * Understory). Until it lands, the engine is named with the lowercase generic
 * "the engine", and every splash/engine chrome reference reads it from HERE, so
 * locking the name is a one-line swap.
 */
export const ENGINE_NAME = 'the engine';

/**
 * PRIMARY CTA labels — one filled action on the splash, audience-dependent. Until
 * the Jul 17 evaluator deadline the filled action sends to the proof (the engine
 * page); after it, the buyer action (the studio) leads. Both labels live here so
 * the swap is one line. Do NOT swap without the call.
 */
export const CTA_PRIMARY_EVALUATOR = 'See how the engine works';
export const CTA_PRIMARY_BUYER = 'Shape your Eden';

/**
 * CONTACT — the one address every "door" on the site writes to (mailto). These are
 * real, working doors (no backend needed), so the studio, the close, and the advisor
 * path all reach a human today. TODO: swap to a Bower inbox when it exists; this is
 * the single place to change it.
 */
export const CONTACT_EMAIL = 'danielguerrarmz@utexas.edu';

