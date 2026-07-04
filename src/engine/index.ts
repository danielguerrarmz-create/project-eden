/**
 * index.ts — the engine barrel + the one function that runs the whole pipeline.
 *
 * runEngine(params) is the pure heart of the app: DesignParams in, a fully
 * recomputed EngineOutputs bundle out. The zustand store calls this on every
 * slider move; nothing else in the app does engine maths. Because it's pure and
 * typed, you can run it in a node repl to sanity-check numbers without the UI.
 */
import { decomposeComponents } from './components';
import { computeEcology } from './ecology';
import { generateGeometry } from './geometry';
import { computeGrowth } from './growth';
import { plantCountFor, priceDesign } from './pricing';
import { getSpecies } from './species';
import { computeStrutField } from './strutOptimizer';
import { computeSunPath } from './sunpath';
import type { DesignParams, EngineOutputs } from './types';

export function runEngine(params: DesignParams): EngineOutputs {
  const geometry = generateGeometry(params);
  const components = decomposeComponents(geometry);
  const species = getSpecies(params.speciesId);

  const sunPath = computeSunPath(geometry.params.siteLatitudeDeg);
  const strutField = computeStrutField(geometry.params, species, sunPath);
  const growth = computeGrowth(species, geometry.params.year);
  const ecology = computeEcology(geometry, species, growth);

  // Built-arc perimeter -> how many climbers get planted -> planting cost.
  const perimeterM = (geometry.params.enclosurePct / 100) * 2 * Math.PI * geometry.footprintRadiusM;
  const plantCount = plantCountFor(perimeterM);
  const price = priceDesign(components, species, plantCount);

  return { geometry, components, price, species, sunPath, strutField, ecology, growth };
}

export * from './types';
export { SPECIES, getSpecies, DEFAULT_SPECIES_ID } from './species';
export { ENVELOPE } from '../data/config';
