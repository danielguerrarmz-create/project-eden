/**
 * types.ts — shared, engine-wide types.
 * The engine is a pipeline of PURE functions:
 *   DesignParams -> geometry -> components -> pricing
 *                            \-> sunpath  -> strutOptimizer
 *                            \-> ecology
 *                            \-> growth
 * Nothing here touches React or three.js. It is testable in a plain node repl.
 */
import type { Year } from '../data/config';
export type { Year };

export type Vec3 = readonly [number, number, number];

/** Every knob the user can turn. All are clamped to ENVELOPE before use. */
export interface DesignParams {
  enclosurePct: number;
  heightM: number;
  footprintRadiusM: number;
  latticeDensity: number; // 0..1 normalised
  openingOrientationDeg: number;
  siteOrientationDeg: number;
  siteLatitudeDeg: number;
  speciesId: string;
  year: Year;
}

/** A single straight, cuttable timber member. Curved ribs are discretised into these. */
export interface Member {
  id: string;
  type: 'rib' | 'ring' | 'brace';
  start: Vec3;
  end: Vec3;
  lengthM: number;
  /**
   * Parametric coords used ONLY by overlays (heatmap / growth), never by the
   * load path. u = around the ring (0..1), v = up the arch (0..1 ground->apex).
   * This is how the LIVING layer attaches — to a coordinate on a sacrificial
   * lattice — without ever entering structural reasoning. (stress-test §12: keep
   * plants off the load path.)
   */
  u: number;
  v: number;
}

export interface FollyGeometry {
  params: DesignParams; // the CLAMPED params actually used
  members: Member[];
  ribCount: number;
  ringCount: number;
  /** Bounding dimensions for the spec card. */
  footprintRadiusM: number;
  heightM: number;
  spanM: number;
  /** Total exterior lattice surface (m²) a plant could clothe. */
  surfaceAreaM2: number;
  /** Horizontal roof projection (m²) that catches rain. */
  roofAreaM2: number;
}

/** One line in the cut-list: "N pieces of length L". */
export interface CutItem {
  lengthM: number;
  type: Member['type'];
  count: number;
}

export interface ComponentList {
  items: CutItem[];
  totalCount: number;
  totalLengthM: number;
}

export interface PriceBreakdown {
  componentsGBP: number;
  cuttingGBP: number;
  installGBP: number;
  plantingGBP: number;
  /** Subtotal before the mandatory designer channel fee + VAT. */
  buildSubtotalGBP: number;
  designerFeeGBP: number;
  exVatGBP: number;
  vatGBP: number;
  incVatGBP: number;
  /** Human-readable line items for the spec card. */
  lines: { label: string; valueGBP: number; note?: string }[];
}

export type ClimbingHabit = 'twining' | 'tendril' | 'scrambler' | 'clinging';
export type SunNeed = 'full' | 'partial' | 'shade';

export interface Species {
  id: string;
  common: string;
  latin: string;
  habit: ClimbingHabit;
  /** Metres of new growth per year (establishment vigour). */
  growthRateMPerYr: number;
  /** m² a mature plant can clothe. */
  matureCoverageM2: number;
  /** Ideal centre-to-centre support spacing (m) this habit wants. */
  supportSpacingM: number;
  sunNeed: SunNeed;
  /** 0..1 value to pollinators (bees/hoverflies/moths). */
  pollinatorValue: number;
  floweringMonths: string;
  evergreen: boolean;
  note: string;
}

/** One sun sample through the modelled day. */
export interface SunSample {
  hour: number;
  altitudeDeg: number; // above horizon; <0 = below (skipped for lighting)
  azimuthDeg: number; // 0 = north, 90 = east, 180 = south, 270 = west
  direction: Vec3; // unit vector FROM the folly TOWARD the sun
}

export interface SunPath {
  latitudeDeg: number;
  dayOfYear: number;
  samples: SunSample[];
  /** Peak sun altitude (solar noon) — drives how much light reaches the lattice. */
  peakAltitudeDeg: number;
  /**
   * Solar exposure per compass sector (8 sectors, index 0 = N, clockwise).
   * 0..1. This is the field the strut optimiser reads to bias density.
   */
  exposureBySector: number[];
}

/** One cell of the strut-density field — the engine's headline output. */
export interface StrutCell {
  u: number; // around the ring 0..1
  v: number; // up the arch 0..1
  density01: number; // 0..1 -> heatmap colour + real strut spacing
  orientation: 'vertical' | 'horizontal' | 'diagonal' | 'mesh';
  position: Vec3;
}

export interface StrutField {
  cells: StrutCell[];
  /** Recommended real centre-to-centre spacing after species + sun adjustment. */
  recommendedSpacingM: number;
  /** Plain-English strategy the engine chose, shown in the readout. */
  habitStrategy: string;
  /** Which compass sector got densified for sun (for the readout copy). */
  sunwardSector: string;
  meanDensity01: number;
}

export interface EcologyMetrics {
  habitatAreaM2: number;
  pollinatorCells: number;
  rainwaterLitresPerYr: number;
  carbonKgPerYr: number;
  floweringMonths: string;
}

export interface GrowthState {
  year: Year;
  coverageFraction: number; // 0..1 of lattice clothed
  leafDensity01: number; // visual density of foliage
  label: string;
}

/** The full recomputed bundle the store hands to the scene + UI. */
export interface EngineOutputs {
  geometry: FollyGeometry;
  components: ComponentList;
  price: PriceBreakdown;
  species: Species;
  sunPath: SunPath;
  strutField: StrutField;
  ecology: EcologyMetrics;
  growth: GrowthState;
}
