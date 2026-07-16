/**
 * fromDrawing.ts — the drawing IS the design input.
 *
 * The studio's four sliders (footprint / rise / lattice / opening) are the
 * engine's PARAMETERS, not its interface. Asking a person to move four sliders
 * is asking them to think like Grasshopper: the design act becomes number
 * entry, and the tool contributes nothing but arithmetic. Here the person draws
 * badly and on purpose — a loose blob for "about this big", two strokes for
 * "it lands here, here, here and here" — and the engine READS that intent,
 * fits it to the buildable family, and says out loud what it decided and why.
 *
 * So this file is a projection, not a parser: dumb 2D linework -> DesignParams
 * the existing (tested) engine already consumes. Nothing here invents geometry;
 * generateGeometry still owns that. What it adds is INTERPRETATION plus a
 * written trail of nudges, because the whole claim of the product is that the
 * engine has an opinion.
 *
 * Pure. No React, no three.js. Testable in a plain node repl.
 */
import { ENVELOPE, GRAMMAR, SITE } from '../data/config';
import type { DesignParams, JointSystem } from './types';

/** A point in PLAN metres. Origin = the placement centre; +x east, +y north. */
export interface Pt {
  x: number;
  y: number;
}

/** One spine stroke: the user drags from one ground point to another. */
export interface Spine {
  a: Pt;
  b: Pt;
}

/** Everything the drawing surface collects. All of it is optional but outline. */
export interface Drawing {
  /** The loose, not-necessarily-closed outline scribbled for the plan extent. */
  outline: Pt[];
  /** Spine strokes. Each contributes TWO ground contacts (its endpoints). */
  spines: Spine[];
  /** How far the user pulled the crown up, in metres above the default rise. */
  crownPullM?: number;
  /** Which climber, carried through so the readout stays live. */
  speciesId?: string;
  jointSystem?: JointSystem;
}

/** One thing the engine decided FOR you, and the reason. Shown, never hidden. */
export interface Nudge {
  /** 'held' = a grammar bound bit. 'read' = an inference. 'offered' = a suggestion. */
  kind: 'held' | 'read' | 'offered';
  text: string;
}

export interface ReadDrawing {
  params: DesignParams;
  /** Ground contacts the engine read out of the spines, as compass bearings. */
  footBearingsDeg: number[];
  /** Plan area the outline actually enclosed, BEFORE grammar clamping (m²). */
  drawnAreaM2: number;
  /** What the engine decided and why — the "it has an opinion" surface. */
  nudges: Nudge[];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Signed area of a polygon (shoelace). Sign tells winding; we only want size. */
export function polygonAreaM2(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Centroid of a point cloud — the placement centre the structure sits on. */
export function centroid(pts: Pt[]): Pt {
  if (pts.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * Compass bearing of a point about a centre, in the engine's convention:
 * 0° = north = +y, 90° = east = +x (matches sunpath.ts and canopyPoint).
 */
export function bearingDeg(from: Pt, to: Pt): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * The widest angular gap between consecutive feet — where the canopy has no
 * leg, so that is where it naturally OPENS. This is the inference that earns
 * the aperture slider's keep: the user never states an opening, they draw legs,
 * and the opening is what is left over.
 */
export function apertureFromFeet(bearings: number[]): number {
  if (bearings.length === 0) return ENVELOPE.apertureDeg.default;
  if (bearings.length === 1) return (bearings[0] + 180) % 360;
  const sorted = [...bearings].sort((p, q) => p - q);
  let best = -1;
  let mid = ENVELOPE.apertureDeg.default;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const gap = i === sorted.length - 1 ? next + 360 - cur : next - cur;
    if (gap > best) {
      best = gap;
      mid = (cur + gap / 2) % 360;
    }
  }
  return Math.round(mid);
}

/** Austin's best planting sun is the southern arc; used only to OFFER, never to force. */
const SUNWARD_DEG = 180;

function angularDistance(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Read a drawing into buildable parameters.
 *
 * Everything the grammar changes is recorded as a Nudge, so the UI can say
 * "you drew 21 m², the validated family stops at 18" rather than silently
 * snapping the number and letting the person wonder why their line moved.
 */
export function readDrawing(d: Drawing): ReadDrawing {
  const nudges: Nudge[] = [];

  // --- Footprint: the blob's enclosed area, eased into the validated family.
  const drawnAreaM2 = polygonAreaM2(d.outline);
  const footprintM2 = clamp(
    drawnAreaM2 > 0 ? drawnAreaM2 : ENVELOPE.footprintM2.default,
    ENVELOPE.footprintM2.min,
    ENVELOPE.footprintM2.max,
  );
  if (drawnAreaM2 > 0 && Math.abs(drawnAreaM2 - footprintM2) > 0.05) {
    nudges.push({
      kind: 'held',
      text:
        drawnAreaM2 > footprintM2
          ? `You drew ${drawnAreaM2.toFixed(1)} m². The engineer-validated family stops at ${ENVELOPE.footprintM2.max} m², so it eased in to ${footprintM2.toFixed(1)}.`
          : `You drew ${drawnAreaM2.toFixed(1)} m². Below ${ENVELOPE.footprintM2.min} m² the canopy can't clear headroom, so it eased out to ${footprintM2.toFixed(1)}.`,
    });
  } else if (drawnAreaM2 > 0) {
    // Speak even when nothing was overridden. An engine that only talks when
    // it overrules you reads as a validator; the point is that it READ your
    // line and took it — that's the thing worth showing.
    nudges.push({
      kind: 'read',
      text: `Your outline encloses ${drawnAreaM2.toFixed(1)} m². That's inside the validated family, so it stands exactly as drawn.`,
    });
  }

  // --- Feet: every spine endpoint is a ground contact.
  const centre = centroid(d.spines.length > 0 ? d.spines.flatMap((s) => [s.a, s.b]) : d.outline);
  const footBearingsDeg = d.spines
    .flatMap((s) => [s.a, s.b])
    .map((p) => Math.round(bearingDeg(centre, p)))
    .sort((a, b) => a - b);

  if (d.spines.length > 0) {
    nudges.push({
      kind: 'read',
      text: `${d.spines.length} ${d.spines.length === 1 ? 'spine' : 'spines'} → ${footBearingsDeg.length} ground contacts. The lattice is generated between them; each contact lands on a driven screw.`,
    });
  }

  // The grammar only certifies 3 or 4 feet. More strokes = a held decision.
  if (footBearingsDeg.length > GRAMMAR.maxFeet) {
    nudges.push({
      kind: 'held',
      text: `${footBearingsDeg.length} contacts drawn; the validated family roots on ${GRAMMAR.minFeet}–${GRAMMAR.maxFeet}. The extra contacts are read as shaping intent, not legs.`,
    });
  }

  // --- Opening: the widest gap between legs. The user never states this.
  const apertureDeg = apertureFromFeet(footBearingsDeg);
  if (footBearingsDeg.length >= 2) {
    nudges.push({
      kind: 'read',
      text: `Widest gap between contacts faces ${apertureDeg}° — the canopy opens there. You didn't set this; it fell out of where you put the legs.`,
    });
  }

  // --- The one genuine OFFER: sun. Advisory only; never silently applied.
  const offSun = angularDistance(apertureDeg, SUNWARD_DEG);
  if (footBearingsDeg.length >= 2 && offSun > 45) {
    nudges.push({
      kind: 'offered',
      text: `That opening faces ${offSun.toFixed(0)}° away from the southern sun. Rotating it toward ${SUNWARD_DEG}° would put more light on the climber. Your call — it's your garden.`,
    });
  }

  // --- Rise: default, plus however far the crown was pulled.
  const riseM = clamp(
    ENVELOPE.riseM.default + (d.crownPullM ?? 0),
    ENVELOPE.riseM.min,
    ENVELOPE.riseM.max,
  );
  if ((d.crownPullM ?? 0) !== 0 && Math.abs(ENVELOPE.riseM.default + (d.crownPullM ?? 0) - riseM) > 0.01) {
    nudges.push({
      kind: 'held',
      text:
        riseM >= ENVELOPE.riseM.max
          ? `Held at ${ENVELOPE.riseM.max} m — above that you'd need a planning application, not a delivery.`
          : `Held at ${ENVELOPE.riseM.min} m — below that people stop being able to walk under it.`,
    });
  }

  const params: DesignParams = {
    footprintM2: Number(footprintM2.toFixed(2)),
    riseM: Number(riseM.toFixed(2)),
    strutSpacingM: ENVELOPE.strutSpacingM.default,
    apertureDeg,
    jointSystem: d.jointSystem ?? (ENVELOPE.jointSystem as JointSystem),
    speciesId: d.speciesId ?? 'clematis',
    year: 0,
  };

  return { params, footBearingsDeg, drawnAreaM2, nudges };
}

/** Re-exported so the drawing surface and the site step agree on north. */
export const NORTH_DEG = SITE.northDeg;
