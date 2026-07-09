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
 * The two v1 joint systems (FABRICATION.md §2–§3).
 * TODO(roadmap): 'timberJoinery' — 5-axis all-timber milled connections
 * (BUGA-style). The node graph below is exactly what it will consume; add the
 * literal here + a joints.ts branch when an industrial joinery partner lands.
 */
export type JointSystem = 'hub' | 'lamella';

/**
 * The four form parameters (demo-spec §2.1), the joint-system choice, plus
 * the living-layer choices. All clamped to grammar bounds before use.
 *
 * There is ONE way the pavilion meets the ground (FABRICATION.md §5): the
 * lattice sweeps to the lawn and roots there — each grounded node lands on a
 * shoe over a driven ground screw. Not a parameter; it IS the typology.
 */
export interface DesignParams {
  /** Footprint area of the canopy plan, m² (12–18). */
  footprintM2: number;
  /** Rise: crown height above ground, m (1.9–2.5, PD-capped). */
  riseM: number;
  /** Structural bay: node-to-node spacing of the diagrid, m (system-capped). */
  strutSpacingM: number;
  /** Where the canopy opens/lifts — compass bearing, deg (0=N, 90=E). */
  apertureDeg: number;

  /** Which joint family the kit is fabricated for. */
  jointSystem: JointSystem;

  speciesId: string;
  year: Year;
}

/**
 * A NODE of the structural graph — where members meet and a connector lives.
 * This is what makes the model manufacturable: every joint is an explicit,
 * addressable thing (hub / lamella bolt / ground shoe), not a coincidence of
 * member endpoints.
 */
export interface CanopyNode {
  id: string;
  position: Vec3;
  /** Outward (upward) unit surface normal — the connector's axis: the hub
   *  core and every member's section depth align to this. */
  normal: Vec3;
  /** 'ground' nodes sit EXACTLY at y=0 on a ground screw. 'splice' nodes are
   *  valence-2 mid-bay beam splices (fish plate, no hub) — inserted where a
   *  single eave facet would outgrow the sheet (steep sweep drops). */
  kind: 'crown' | 'interior' | 'eave' | 'ground' | 'splice';
  /** Members arriving here — the connector's valence and angles derive from these. */
  memberIds: string[];
}

/**
 * One PLANAR end cut (FABRICATION.md §1a): the plane a member's physical end
 * is cut on. Every member end is exactly one planar cut — that is what a
 * docking saw (square) or the CNC profile (skew) can make, and it is the ONLY
 * end geometry that exists in v1. The member's solid is its section prism
 * clipped by its two end planes; the cut schedule derives lengths from the
 * same planes.
 */
export interface EndCut {
  /** A point on the cut plane (world). */
  point: Vec3;
  /** OUTWARD unit plane normal — points out of the timber. */
  normal: Vec3;
  /** Which joint rule produced this plane (diagnostic + tests):
   *  'standoff'  — hub strut square cut clearing the connector envelope
   *  'butt'      — lamella skew cut on the continuous piece's side face
   *  'blankFace' — lamella skew cut on the ring blank's inner face
   *  'mitre'     — bisector plane where two segments of one piece meet
   *  'splice'    — square cut with a joint gap under fish plates
   *  'square'    — plain square cut (default / degenerate fallback) */
  kind: 'standoff' | 'butt' | 'blankFace' | 'mitre' | 'splice' | 'square';
}

/**
 * One straight centreline SEGMENT between two nodes. Segments are the render
 * + analysis unit; the PURCHASABLE unit is the Piece a segment belongs to (a
 * two-bay lamella is 2 segments, an eave blank is several).
 */
export interface Member {
  id: string;
  type: 'lattice' | 'lamella' | 'eave' | 'crown' | 'foot';
  /** Node-to-node centreline endpoints (the joint graph truth). */
  start: Vec3;
  end: Vec3;
  /** Node-to-node centreline length. Physical cut length subtracts the trims. */
  lengthM: number;
  nodeStartId: string;
  nodeEndId: string;
  /** The physical piece this segment is part of. */
  pieceId: string;
  /**
   * Unit section-depth direction: the local surface normal orthogonalized
   * against the member axis. Timber stands on edge along this — the 3D view
   * and (later) the milling schedule both derive the section frame from it.
   */
  normal: Vec3;
  /**
   * MILLED-END reality (FABRICATION.md §1a): the planar cut each physical end
   * is made on, resolved per node by the joint rules. The solid the scene
   * draws and the length the BOM prices both derive from these planes.
   */
  endCuts: { start: EndCut; end: EndCut };
  /**
   * DERIVED: centreline distance from each node to that end's cut plane
   * (0 at a mitred through-node). Subtracted into the piece's cut length.
   */
  startTrimM: number;
  endTrimM: number;
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

/**
 * A PIECE: one physical thing a fabricator cuts and a courier ships.
 * 'strut' comes off linear stock (docking saw); 'lamella' and the blanks
 * are CNC-profiled from LVL sheet (curved, so cut not bent).
 */
export interface Piece {
  id: string;
  kind: 'strut' | 'lamella' | 'eaveBlank' | 'crownBlank';
  memberIds: string[];
  /** PHYSICAL cut length, m: developed length along the piece's segments
   *  minus the milled-end trims. This is what the saw/CNC cuts. */
  lengthM: number;
  stock: 'linear' | 'sheet';
  /** Nested width on sheet (sheet pieces) — the piece's structural depth. */
  depthM: number;
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
  /** The structural graph: explicit nodes... */
  nodes: CanopyNode[];
  /** ...straight segments between them... */
  members: Member[];
  /** ...grouped into the physical pieces a fabricator cuts. */
  pieces: Piece[];
  /** Ground screws this design needs (one per rooted/grounded node). */
  groundScrewCount: number;
  /** Feet the canopy stands on. 3 or 4 — chosen by the grammar. */
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
  /** Longest single piece (m) — every piece is also checked against its own
   *  stock rule (sheet cut limit / linear handling cap) at generation. */
  maxComponentLengthM: number;
}

/** One line in the cut-list: "N pieces of kind K at length L". */
export interface CutItem {
  lengthM: number;
  kind: Piece['kind'];
  stock: Piece['stock'];
  /** Nested width for sheet pieces (their structural depth). */
  depthM: number;
  count: number;
}

/** One hardware line: connectors, fasteners, screws, armature. */
export interface HardwareItem {
  /** Rate key into PRICING.hardwareGBP. */
  id: string;
  label: string;
  qty: number;
  /** Unit for display; default 'pcs' (armature wire is metres). */
  unit?: string;
}

export interface ComponentList {
  /** Timber piece schedule, grouped by kind + rounded length. */
  items: CutItem[];
  /** Connectors + fasteners + foundations + armature — the other half of the kit. */
  hardware: HardwareItem[];
  /** Timber pieces total (what a courier ships, not segment count). */
  totalCount: number;
  totalLengthM: number;
}

/** One rectangle placed on a CNC sheet in the nesting preview. */
export interface NestedPart {
  x: number; // m from sheet left
  y: number; // m from sheet top
  lengthM: number;
  widthM: number;
  kind: Piece['kind'];
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
  /** Linear-stock plan for docking-saw pieces (hub struts): how many
   *  standard stock lengths the unique cut lengths pack into. */
  stockPlan: {
    stockLengthM: number;
    lengthsNeeded: number;
    pieceCount: number;
    /** Fraction of purchased linear stock actually in pieces. */
    utilisation: number;
  };
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
