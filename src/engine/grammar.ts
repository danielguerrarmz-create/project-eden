/**
 * grammar.ts — the fabrication grammar as a live constraint layer.
 *
 * ****  THIS IS THE PITCH (demo-spec §2.2).  ****
 * Every slider bound DERIVES from a stated fabrication rule in GRAMMAR, and
 * deriveBounds() recomputes those bounds for the CURRENT design — so a bound
 * can move when another parameter moves (a small footprint caps the rise below
 * the planning cap, because crown curvature governs before permitted
 * development does). The UI shows the governing rule as a one-line caption the
 * moment a slider stops. The constraint being VISIBLE is what separates the
 * engine from a render toy.
 *
 * No FEA. Validity is "certainty inside a designed family": the bounds stand
 * in for a joint library + span family an engineer stamps once. Honest, and
 * stated as such.
 *
 * PURE. Also owns the shared plan maths (ellipse dims, perimeter, feet count)
 * so grammar and geometry can never disagree about them.
 */
import { ENVELOPE, GRAMMAR } from '../data/config';
import type { DesignParams, GrammarBounds, ParamBound } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Canopy plan semi-axes (m) for a footprint area, at the fixed aspect. */
export function planDims(footprintM2: number): { a: number; b: number } {
  const a = Math.sqrt((footprintM2 * GRAMMAR.planAspect) / Math.PI);
  return { a, b: a / GRAMMAR.planAspect };
}

/** Ellipse perimeter, Ramanujan's approximation — plenty for blank sizing. */
export function ellipsePerimeterM(a: number, b: number): number {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * How many grounded feet this footprint needs: the eave beam is spliced into
 * curved blanks (eaveBlanksPerFootSpan per inter-foot span), each cut from
 * sheet stock — so blanks must fit maxComponentLengthM. The engine adds a
 * foot the moment a blank would exceed the sheet. Grammar reshaping form.
 */
export function feetCountFor(footprintM2: number): number {
  const { a, b } = planDims(footprintM2);
  const perimeter = ellipsePerimeterM(a, b);
  for (let n = GRAMMAR.minFeet; n <= GRAMMAR.maxFeet; n++) {
    if (perimeter / (n * GRAMMAR.eaveBlanksPerFootSpan) <= GRAMMAR.maxComponentLengthM) {
      return n;
    }
  }
  return GRAMMAR.maxFeet;
}

/** Eave blank length (m) at a given footprint with its grammar-chosen feet. */
export function eaveBlankLengthM(footprintM2: number): number {
  const { a, b } = planDims(footprintM2);
  return ellipsePerimeterM(a, b) / (feetCountFor(footprintM2) * GRAMMAR.eaveBlanksPerFootSpan);
}

/** The rise cap for a footprint: planning OR crown curvature, whichever bites. */
export function riseCapM(footprintM2: number): { cap: number; rule: string } {
  const { b } = planDims(footprintM2);
  const curvatureCap = round2(GRAMMAR.maxRisePerHalfSpan * b);
  if (curvatureCap < GRAMMAR.pdHeightCapM) {
    return {
      cap: curvatureCap,
      rule: `crown curvature would exceed the flat-piece cutting tolerance at this footprint`,
    };
  }
  return {
    cap: GRAMMAR.pdHeightCapM,
    rule: `${GRAMMAR.pdHeightCapM} m permitted-development cap — no planning application needed`,
  };
}

/**
 * Live bounds + captions for every slider, derived from the grammar for the
 * design as it currently stands.
 */
export function deriveBounds(params: DesignParams): GrammarBounds {
  const footprintM2 = clamp(params.footprintM2, ENVELOPE.footprintM2.min, ENVELOPE.footprintM2.max);

  const footprint: ParamBound = {
    min: ENVELOPE.footprintM2.min,
    max: ENVELOPE.footprintM2.max,
    minRule: `below the structural family's tested minimum span`,
    maxRule: `the engineer-validated span family covers up to ${GRAMMAR.maxFootprintM2} m² — each build widens it`,
  };

  const rise = riseCapM(footprintM2);
  const riseM: ParamBound = {
    min: GRAMMAR.minHeadroomM,
    max: rise.cap,
    minRule: `minimum clear headroom under the eave`,
    maxRule: rise.rule,
  };

  const strutSpacingM: ParamBound = {
    min: GRAMMAR.minStrutSpacingM,
    max: GRAMMAR.maxStrutSpacingM,
    minRule: `node joints would overlap below ${Math.round(GRAMMAR.minStrutSpacingM * 1000)} mm — cuttability limit`,
    maxRule: `unsupported panel span would exceed the flat-piece curvature tolerance`,
  };

  const apertureDeg: ParamBound = {
    min: 0,
    max: 359,
    minRule: '',
    maxRule: '',
  };

  const feet = feetCountFor(footprintM2);
  const blank = eaveBlankLengthM(footprintM2);
  const notes: string[] = [
    `${feet} feet — eave blanks at ${blank.toFixed(2)} m fit the ${GRAMMAR.sheet.lengthM} m sheet`,
  ];
  // Narrate the moment the grammar added a foot (within ~0.4 m² of the switch).
  if (feet > GRAMMAR.minFeet) {
    const prevFeetBlank =
      ellipsePerimeterM(planDims(footprintM2).a, planDims(footprintM2).b) /
      ((feet - 1) * GRAMMAR.eaveBlanksPerFootSpan);
    if (prevFeetBlank <= GRAMMAR.maxComponentLengthM + 0.15) {
      notes.push(
        `foot ${feet} added — with ${feet - 1} feet an eave blank would run ${prevFeetBlank.toFixed(2)} m, over the ${GRAMMAR.maxComponentLengthM} m cut limit`,
      );
    }
  }

  return { footprintM2: footprint, riseM, strutSpacingM, apertureDeg, notes };
}

/** Force every design parameter inside its grammar-derived bound. */
export function clampParams(p: DesignParams): DesignParams {
  const footprintM2 = clamp(p.footprintM2, ENVELOPE.footprintM2.min, ENVELOPE.footprintM2.max);
  const rise = riseCapM(footprintM2);
  return {
    ...p,
    footprintM2,
    riseM: clamp(p.riseM, GRAMMAR.minHeadroomM, rise.cap),
    strutSpacingM: clamp(p.strutSpacingM, GRAMMAR.minStrutSpacingM, GRAMMAR.maxStrutSpacingM),
    apertureDeg: ((p.apertureDeg % 360) + 360) % 360,
  };
}
