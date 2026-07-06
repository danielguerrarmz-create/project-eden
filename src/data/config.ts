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
  /** CNC sheet stock the components are cut from (standard 2.4 × 1.2 m). */
  sheet: { lengthM: 2.4, widthM: 1.2 },
  /** Longest single blank we cut — sheet length minus clamping margin. */
  maxComponentLengthM: 2.35,
  /** Saw kerf + handling gap between nested parts on a sheet. */
  nestingKerfM: 0.012,
  /** Nominal timber cross-section (mm) of a strut blank as nested on sheet. */
  memberSectionMm: { width: 60, depth: 90 },
  /** Cut lengths round to this bucket so components collapse into a tidy cut-list. */
  cutListRoundingM: 0.05,

  /** Below this node-to-node spacing the joint hardware overlaps — cuttability. */
  minStrutSpacingM: 0.25,
  /** Above this unsupported span the flat-piece approximation of the curved
   *  surface exceeds cutting tolerance (max curvature per component). */
  maxStrutSpacingM: 0.5,

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
// ENVELOPE — slider ranges + defaults (bounds justified by GRAMMAR rules;
// the live per-design bounds come from engine/grammar.ts deriveBounds()).
// ---------------------------------------------------------------------------
export const ENVELOPE = {
  footprintM2: { min: GRAMMAR.minFootprintM2, max: GRAMMAR.maxFootprintM2, default: 15 },
  riseM: { min: GRAMMAR.minHeadroomM, max: GRAMMAR.pdHeightCapM, default: 2.3 },
  strutSpacingM: { min: GRAMMAR.minStrutSpacingM, max: GRAMMAR.maxStrutSpacingM, default: 0.35 },
  apertureDeg: { min: 0, max: 359, default: 90 }, // 90 = opens east, toward morning light
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
   * TODO: wire real fab quote (Clay, Day 4–6).
   * This £/component rate is the single load-bearing placeholder in the whole
   * demo. It is a guess until a CNC-timber fab shop returns an itemised quote
   * against the demo's ACTUAL cut geometry. Until then the price MOVES
   * correctly; it is not yet TRUE.
   */
  ratePerComponentGBP: 42,

  /** TODO: wire real fab quote — per-metre cutting/finishing of timber stock. */
  cutCostPerMetreGBP: 9,

  /** TODO: confirm with installer — fixed mobilisation (crew, delivery). */
  installBaseGBP: 3800,

  /** TODO: confirm with installer — marginal install labour per member. */
  installPerComponentGBP: 6.5,

  /** TODO: confirm — ground screws + base prep allowance per foot. */
  groundworkPerFootGBP: 420,

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
