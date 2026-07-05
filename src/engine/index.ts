/**
 * index.ts — the engine barrel + the one function that runs the whole pipeline.
 *
 * runEngine(params) is the pure heart of the app: DesignParams in, a fully
 * recomputed EngineOutputs bundle out — grammar bounds, component model,
 * nesting, fixed price, living layer. The zustand store calls this on every
 * slider move; nothing else in the app does engine maths. Because it's pure
 * and typed, you can run it in a plain node repl to sanity-check numbers
 * without the UI.
 */
import { LEAD_TIME, SITE } from '../data/config';
import { decomposeComponents } from './components';
import { computeEcology } from './ecology';
import { generateGeometry } from './geometry';
import { deriveBounds, ellipsePerimeterM } from './grammar';
import { computeGrowth } from './growth';
import { nestComponents } from './nesting';
import { plantCountFor, priceDesign } from './pricing';
import { getSpecies } from './species';
import { computeStrutField } from './strutOptimizer';
import { computeSunPath } from './sunpath';
import type { BuildPlan, CanopyGeometry, ComponentList, DesignParams, EngineOutputs } from './types';

/** Assembly step count for the spec sheet: feet, eave blanks, then ring-by-ring
 *  diagrid lifts, then planting + tie-in. Derived from the component model. */
function planBuild(geometry: CanopyGeometry, components: ComponentList, plantCount: number): BuildPlan {
  const assemblySteps =
    geometry.feetCount + // set each foot
    geometry.feetCount * 2 + // splice the eave blanks between them
    geometry.ringCount + // lift the diagrid ring by ring
    2; // plant + tie in the armature
  const leadTimeWeeks = Math.round(
    LEAD_TIME.baseWeeks + (components.totalCount / 100) * LEAD_TIME.weeksPerHundredComponents,
  );
  return { assemblySteps, leadTimeWeeks, plantCount };
}

export function runEngine(params: DesignParams): EngineOutputs {
  const bounds = deriveBounds(params);
  const geometry = generateGeometry(params);
  const components = decomposeComponents(geometry);
  const nesting = nestComponents(components);
  const species = getSpecies(params.speciesId);

  const sunPath = computeSunPath(SITE.latitudeDeg);
  const strutField = computeStrutField(geometry.params, species, sunPath);
  const growth = computeGrowth(species, geometry.params.year);
  const ecology = computeEcology(geometry, species, growth);

  // Eave perimeter -> how many climbers get planted -> planting allowance.
  const perimeterM = ellipsePerimeterM(geometry.planA, geometry.planB);
  const plantCount = plantCountFor(perimeterM);
  const price = priceDesign(geometry, components, species, plantCount);
  const buildPlan = planBuild(geometry, components, plantCount);

  return {
    bounds,
    geometry,
    components,
    nesting,
    price,
    buildPlan,
    species,
    sunPath,
    strutField,
    ecology,
    growth,
  };
}

export * from './types';
export { SPECIES, getSpecies, DEFAULT_SPECIES_ID } from './species';
export { deriveBounds, clampParams } from './grammar';
export { ENVELOPE, GRAMMAR } from '../data/config';
