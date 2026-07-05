/**
 * types.ts — shared, engine-wide types.
 * The engine is a pipeline of PURE functions:
 *   DesignParams -> grammar (bounds) -> geometry -> components -> pricing
 *                                    \-> nesting (CNC sheets)
 *                                    \-> sunpath -> strutOptimizer
 *                                    \-> ecology
 *                                    \-> growth
 * Nothing here touches React or three.js. It is testable in a plain node repl.
 */
import type { Year } from '../data/config';
export type { Year };

export type Vec3 = readonly [number, number, number];

/**
 * The four user parameters (demo-spec §2.1 — no more), plus the living-layer
 * choices. All are clamped to the grammar-derived bounds before use.
 */
export interface DesignParams {
  /** Footprint area of the canopy plan, m² (12–18). */
  footprintM2: number;
  /** Rise: crown height above ground, m (1.9–2.5, PD-capped). */
  riseM: number;
  /** Lattice density as node-to-node strut spacing, m (0.25–0.5). */
  strutSpacingM: number;
  /** Where the canopy opens/lifts — compass bearing, deg (0=N, 90=E). */
  apertureDeg: number;

  speciesId: string;
  year: Year;
}

/**
 * A single flat, cuttable component. Curved runs are discretised into these.
 * 'lattice' = diagrid strut, 'eave' = edge-beam blank segment, 'foot' = the
 * grounded leg sweep members.
 */
export interface Member {
  id: string;
  type: 'lattice' | 'eave' | 'foot';
  start: Vec3;
  end: Vec3;
  lengthM: number;
  /**
   * Parametric coords used ONLY by overlays (heatmap / growth), never by the
   * load path. u = around the plan (0..1 from north, clockwise), v = up the
   * canopy (0 = eave/ground edge, 1 = crown). This is how the LIVING layer
   * attaches — to a coordinate on a sacrificial armature — without ever
   * entering structural reasoning.
   */
  u: number;
  v: number;
}

/** One reason-carrying bound for one slider (the grammar surfaced). */
export interface ParamBound {
  min: number;
  max: number;
  /** One-line caption shown when the slider stops at min. */
  minRule: string;
  /** One-line caption shown when the slider stops at max. */
  maxRule: string;
}

/** Live, per-design bounds for every slider — some depend on other params. */
export interface GrammarBounds {
  footprintM2: ParamBound;
  riseM: ParamBound;
  strutSpacingM: ParamBound;
  /** Aperture wraps 360° — no bounds, present for completeness. */
  apertureDeg: ParamBound;
  /** Engine notes: grammar decisions worth narrating (e.g. a foot added). */
  notes: string[];
}

export interface CanopyGeometry {
  params: DesignParams; // the CLAMPED params actually used
  members: Member[];
  /** Feet the canopy sweeps down to. 3 or 4 — chosen by the grammar. */
  feetCount: number;
  footBearingsDeg: number[];
  /** Diagrid resolution actually generated. */
  ringCount: number;
  spokeCount: number;
  /** Plan semi-axes (m): a = major (across the aperture axis), b = minor. */
  planA: number;
  planB: number;
  /** Bounding dimensions for the spec card. */
  footprintM2: number;
  riseM: number;
  spanM: number;
  /** Total exterior lattice surface (m²) a plant could clothe. */
  surfaceAreaM2: number;
  /** Horizontal roof projection (m²) that catches rain. */
  roofAreaM2: number;
  /** Longest single component (m) — checked against the sheet rule. */
  maxComponentLengthM: number;
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

/** One rectangle placed on a CNC sheet in the nesting preview. */
export interface NestedPart {
  x: number; // m from sheet left
  y: number; // m from sheet top
  lengthM: number;
  widthM: number;
  type: Member['type'];
}

export interface NestedSheet {
  parts: NestedPart[];
  /** Fraction of sheet area used (for the utilisation readout). */
  utilisation: number;
}

export interface NestingResult {
  sheets: NestedSheet[];
  sheetLengthM: number;
  sheetWidthM: number;
  totalParts: number;
}

/**
 * Price = Σ components × rate + fabrication + install + groundwork + planting
 * + margin, presented as ONE fixed figure (demo-spec §2.3). Decomposition
 * shown for credibility — including the margin, plainly.
 */
export interface PriceBreakdown {
  componentsGBP: number;
  fabricationGBP: number;
  installGBP: number;
  plantingGBP: number;
  subtotalGBP: number;
  marginGBP: number;
  /** The fixed figure on screen, rounded to a commitment-shaped number. */
  fixedTotalGBP: number;
  /** Human-readable decomposition lines for the price panel + spec sheet. */
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
  /**
   * Mature stem load class 0..1 — how heavy the plant gets. Drives the
   * "wisteria needs heavier struts" beat: the armature densifies for load.
   */
  stemLoad01: number;
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
  direction: Vec3; // unit vector FROM the canopy TOWARD the sun
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

/** One cell of the strut-density field — the living layer's armature spec. */
export interface StrutCell {
  u: number; // around the plan 0..1
  v: number; // up the canopy 0..1
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

/** Commission-sheet numbers derived from the component model. */
export interface BuildPlan {
  assemblySteps: number;
  leadTimeWeeks: number;
  plantCount: number;
}

/** The full recomputed bundle the store hands to the scene + UI. */
export interface EngineOutputs {
  bounds: GrammarBounds;
  geometry: CanopyGeometry;
  components: ComponentList;
  nesting: NestingResult;
  price: PriceBreakdown;
  buildPlan: BuildPlan;
  species: Species;
  sunPath: SunPath;
  strutField: StrutField;
  ecology: EcologyMetrics;
  growth: GrowthState;
}
