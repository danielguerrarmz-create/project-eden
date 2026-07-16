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
import { generateGeometry, type ShapeField } from './geometry';
import { deriveBounds, ellipsePerimeterM } from './grammar';
import { computeGrowth } from './growth';
import { nestComponents } from './nesting';
import { plantCountFor, priceDesign } from './pricing';
import { getSpecies } from './species';
import { computeStrutField } from './strutOptimizer';
import { computeSunPath } from './sunpath';
import type { BuildPlan, CanopyGeometry, ComponentList, DesignParams, EngineOutputs } from './types';

/** Assembly step count for the spec sheet (FABRICATION.md §7): ground screws,
 *  eave blanks, ring-by-ring lifts, planting + armature tie-in.
 *  Derived from the component model. */
function planBuild(geometry: CanopyGeometry, components: ComponentList, plantCount: number): BuildPlan {
  const assemblySteps =
    geometry.groundScrewCount + // drive each ground screw
    geometry.feetCount * 2 + // splice the eave blanks between feet
    geometry.ringCount + // lift the diagrid ring by ring
    2; // plant + tie in the armature
  const leadTimeWeeks = Math.round(
    LEAD_TIME.baseWeeks + (components.totalCount / 100) * LEAD_TIME.weeksPerHundredComponents,
  );
  return { assemblySteps, leadTimeWeeks, plantCount };
}

/**
 * Run the engine. `shape` is the DRAWN design (engine/shapeFromDrawing) when
 * there is one: pass it and the generator roots at the bearings that were drawn
 * and lays the lattice on the surface that was sculpted. Omit it and the
 * parametric studio behaves exactly as it always has.
 */
export function runEngine(params: DesignParams, shape?: ShapeField): EngineOutputs {
  const bounds = deriveBounds(params);
  const geometry = generateGeometry(params, shape);
  const species = getSpecies(params.speciesId);

  const sunPath = computeSunPath(SITE.latitudeDeg);
  const strutField = computeStrutField(geometry.params, species, sunPath);
  // Components AFTER the strut field: the armature allowance (wire at the
  // species' recommended spacing) is a real BOM line now.
  const components = decomposeComponents(geometry, strutField);
  const nesting = nestComponents(components);
  const growth = computeGrowth(species, geometry.params.year);
  const ecology = computeEcology(geometry, species, growth);

  // Eave perimeter -> how many climbers get planted -> planting allowance.
  const perimeterM = ellipsePerimeterM(geometry.planA, geometry.planB);
  const plantCount = plantCountFor(perimeterM);
  const price = priceDesign(components, nesting, species, plantCount);
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
