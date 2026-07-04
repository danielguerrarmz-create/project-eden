/**
 * ecology.ts — habitat area, pollinator cells, rainwater L/yr, carbon.
 *
 * The readout that makes this "architecture that contributes to its ecosystem"
 * rather than a garden room (stress-test §12). Every figure is a labelled
 * RULE-OF-THUMB built from constants in data/config.ts + the chosen species'
 * traits — honest ballpark for the spec card, NOT an ecological survey.
 * TODO: replace the coefficients with a horticulturalist/ecologist's numbers
 * and tie to UK Biodiversity Net Gain units (stress-test §12.4).
 *
 * PURE.
 */
import { ECOLOGY } from '../data/config';
import type { EcologyMetrics, FollyGeometry, GrowthState, Species } from './types';

export function computeEcology(
  geometry: FollyGeometry,
  species: Species,
  growth: GrowthState,
): EcologyMetrics {
  // Habitat = clothed lattice surface at the current growth stage, capped by
  // what a mature planting of this species can actually cover.
  const potentialHabitat = geometry.surfaceAreaM2 * growth.coverageFraction;
  const habitatAreaM2 = Number(Math.min(potentialHabitat, species.matureCoverageM2 * 3).toFixed(1));

  // Pollinator "cells": flowering habitat / m²-per-cell, scaled by the species'
  // pollinator value. Rule of thumb.
  const pollinatorCells = Math.round(
    (habitatAreaM2 * species.pollinatorValue) / ECOLOGY.m2PerPollinatorCellAtFullValue,
  );

  // Rainwater harvested = roof projection × annual rainfall × runoff coeff.
  // area(m²) × mm(=L/m²) × coeff -> litres/yr.
  const rainwaterLitresPerYr = Math.round(
    geometry.roofAreaM2 * ECOLOGY.annualRainfallMm * ECOLOGY.roofRunoffCoefficient,
  );

  const carbonKgPerYr = Number(
    (habitatAreaM2 * ECOLOGY.carbonKgPerM2PerYr).toFixed(1),
  );

  return {
    habitatAreaM2,
    pollinatorCells,
    rainwaterLitresPerYr,
    carbonKgPerYr,
    floweringMonths: species.floweringMonths,
  };
}
