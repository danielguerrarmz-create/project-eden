/**
 * config.ts — THE ONE PLACE every stubbed constant lives.
 *
 * Honesty rule (mvp-spec §"Real vs stubbed", stress-test §4, §9.2):
 * every number that is a placeholder is a NAMED CONSTANT here, never a magic
 * number buried in the engine. When a real figure lands (a fab quote, a
 * rainfall dataset, a horticultural spacing table) it is wired in HERE and the
 * whole engine updates. Nothing downstream invents its own numbers.
 */

// ---------------------------------------------------------------------------
// PRICING  — count × rate + install + planting
// ---------------------------------------------------------------------------
export const PRICING = {
  /**
   * TODO: wire real fab quote.
   * This £/component rate is the single load-bearing placeholder in the whole
   * demo (stress-test §4: "the one number that gates everything"). It is a
   * guess until a CNC-timber fab shop returns an itemised quote against the
   * demo's ACTUAL cut geometry (stress-test §9.2). Do not trust the price on
   * screen as a real quote — trust that it moves correctly when the form moves.
   */
  ratePerComponentGBP: 42,

  /** TODO: wire real fab quote — per-metre cutting/finishing cost of timber stock. */
  cutCostPerMetreGBP: 9,

  /** TODO: confirm with installer — fixed mobilisation (ground screws, crew, delivery). */
  installBaseGBP: 3800,

  /** TODO: confirm with installer — marginal install labour per structural member. */
  installPerComponentGBP: 6.5,

  /** TODO: confirm with horticultural partner — supply + plant one climber incl. root prep. */
  plantingPerPlantGBP: 55,

  /**
   * Mandatory garden-designer channel fee (stress-test §4: this is COGS, not
   * optional — "you cannot get the commission without the designer"). Shown so
   * the price on screen is not quietly optimistic.
   */
  designerChannelFeeRate: 0.12,

  /** VAT is shown separately so we never quote inc/ex ambiguously (stress-test §4). */
  vatRate: 0.2,
} as const;

// ---------------------------------------------------------------------------
// ENVELOPE  — the pre-engineered validity box (stress-test §5, §8.4)
// ---------------------------------------------------------------------------
/**
 * Structural validity in this MVP is guaranteed by CLAMPING every slider to
 * this envelope — NOT by live FEA. See engine/geometry.ts clampParams(). The
 * honest claim is "certainty inside a designed family," not "any form is
 * valid." These bounds stand in for a real pre-engineered joint/typology
 * library (AUAR / ICD-ITKE style) that an engineer has stamped once.
 *
 * TODO: replace these bounds with the actual engineered envelope once a
 * chartered structural engineer signs off the joint family (stress-test §9.3).
 */
export const ENVELOPE = {
  enclosurePct: { min: 25, max: 85, default: 55 }, // % of the ring that is built (100 would be a sealed dome — excluded)
  heightM: { min: 2.4, max: 3.6, default: 3.0 },
  footprintRadiusM: { min: 1.8, max: 3.2, default: 2.4 },
  latticeDensity: { min: 0.2, max: 1.0, default: 0.55 }, // 0..1 normalised; drives rib + ring counts
  openingOrientationDeg: { min: 0, max: 359, default: 180 },
  siteOrientationDeg: { min: 0, max: 359, default: 180 },
  siteLatitudeDeg: { min: 35, max: 60, default: 51.5 }, // London-ish default
} as const;

/** Discretisation of a curved rib into straight cuttable timber segments. */
export const FABRICATION = {
  minSegmentsPerRib: 5,
  maxSegmentsPerRib: 9,
  /** Cut lengths are rounded to this bucket so components collapse into a tidy cut-list. */
  cutListRoundingM: 0.05,
  /** Nominal timber cross-section (mm) — cosmetic in the demo, real in the quote. */
  memberSectionMm: { width: 60, depth: 90 },
} as const;

// ---------------------------------------------------------------------------
// ECOLOGY  — rule-of-thumb formulas (mvp-spec §"Real vs stubbed")
// ---------------------------------------------------------------------------
export const ECOLOGY = {
  /**
   * TODO: replace with a site-specific rainfall figure (Met Office 1991-2020
   * averages). UK mean annual rainfall ~= 1150mm; SE England ~= 600-700mm.
   */
  annualRainfallMm: 690,

  /** Runoff coefficient for a slatted/lattice roof capturing to beds. Rule of thumb. */
  roofRunoffCoefficient: 0.55,

  /**
   * Pollinator "cells": a coarse habitat unit = 1 per this many m² of flowering
   * coverage, scaled by the species' pollinator value. Rule of thumb for the
   * readout, NOT an ecological survey.
   * TODO: replace with a horticulturalist/ecologist figure (stress-test §12.4,
   * ties to UK Biodiversity Net Gain as the real "why now").
   */
  m2PerPollinatorCellAtFullValue: 1.4,

  /** Carbon rough proxy: kg CO2e sequestered per m² of mature leaf coverage per year. */
  carbonKgPerM2PerYr: 1.1,
} as const;

// ---------------------------------------------------------------------------
// GROWTH  — visual approximation of establishment (mvp-spec §"Real vs stubbed")
// ---------------------------------------------------------------------------
export const GROWTH = {
  /** Years the slider can show. Year 3 = the "it's finished in year three" promise. */
  years: [0, 1, 3] as const,
  /** Coverage saturates as growth approaches this fraction of the lattice. */
  maxCoverageFraction: 0.92,
  /** Year-0 establishment: what a freshly-planted climber covers on day one. */
  year0CoverageFraction: 0.04,
} as const;

export type Year = (typeof GROWTH.years)[number];

// ---------------------------------------------------------------------------
// LEAD TIME  — quoted build lead time (stubbed)
// ---------------------------------------------------------------------------
/**
 * TODO: confirm with fab shop + installer once real capacity is known
 * (stress-test §6 flags first-build execution risk — these are optimistic).
 */
export const LEAD_TIME = {
  baseWeeks: 6,
  weeksPerHundredComponents: 2,
} as const;
