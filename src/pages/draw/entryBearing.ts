/**
 * entryBearing.ts — where a person would walk in.
 *
 * The engine has no notion of an entrance. `footBearingsDeg` is just where the
 * legs happened to land for whatever two lines got drawn, and that changes
 * with every take. So the scale figure's position is DERIVED, not authored: it
 * stands in the widest gap between adjacent legs, on the side facing camera.
 *
 * Hardcoding a spot would be less code and would work right up until Daniel
 * draws different lines than he rehearsed, at which point the figure stands
 * inside a strut on camera and there is no time to fix it. This is ~40 lines
 * to never think about it again.
 *
 * Pure, and therefore tested: no THREE, no React.
 */

/** Fold any angle into [0, 360). */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed difference a -> b, folded into (-180, 180]. */
export function angleDeltaDeg(a: number, b: number): number {
  return norm360(b - a + 180) - 180;
}

/**
 * Where the figure should stand, measured as an angle OFF the camera's own
 * bearing. Photographed across the range before being chosen; every number
 * here is a measurement, not a preference.
 *
 * The figure billboards to face the camera, so it is never edge-on and this
 * angle is now purely a question of composition:
 *
 *   off ≈ 0    it stands BETWEEN the lens and the building, nearer the camera
 *              than the structure, so perspective blows it up into a monolith
 *              taller than the dome and the frame crops it at the knee.
 *   off ≈ 110  beside the structure and a little beyond it, at essentially the
 *              object's own depth — so the two render at one scale and the eye
 *              can read the figure against the nearest leg. THE TARGET.
 *   off ≈ 180  directly behind the dome's centre, where a leg cuts through it
 *              and it reads as a smudge.
 *
 * Slightly PAST perpendicular on purpose: at exactly 90° the figure is at the
 * camera's own distance and sits near the frame edge, and the frame is fitted
 * to the lattice, not to it. A little further round pushes it inboard and
 * slightly smaller, which is where it belongs.
 */
export const TARGET_OFF_DEG = 110;

/**
 * The bearing to stand on.
 *
 * NOT "the widest gap between two feet", which was the obvious rule and is
 * wrong twice over. First, it solves a problem that does not exist: the figure
 * stands at `max(plan) + 0.9`, comfortably OUTSIDE the footprint the feet sit
 * on, so it cannot collide with a leg whatever bearing it takes — feet only
 * ever affect whether one leg happens to line up and cut across it. Second, it
 * cannot deliver: four feet at 90° spacing offer gap midpoints 90° apart, so
 * the achievable angles off the camera are a fixed set like {5, 85, 95, 175},
 * and at many camera angles NONE of them is in the readable band. A unit test
 * caught exactly that, landing the figure at 175° — the occluded case.
 *
 * So the angle is taken, not searched: `TARGET_OFF_DEG` either side. The feet
 * only break the tie, by taking whichever side has more clearance from the
 * nearest leg.
 *
 * Returns null when there is no structure to stand beside.
 */
export function entryBearingDeg(
  footBearingsDeg: number[],
  cameraAzimuthDeg: number,
): number | null {
  if (footBearingsDeg.length === 0) return null;

  const clearance = (b: number) =>
    Math.min(...footBearingsDeg.map((f) => Math.abs(angleDeltaDeg(f, b))));

  const left = norm360(cameraAzimuthDeg + TARGET_OFF_DEG);
  const right = norm360(cameraAzimuthDeg - TARGET_OFF_DEG);
  // Ties go to `left` deterministically: the choice must not depend on float
  // noise, or the figure would jump sides between two identical takes.
  return clearance(right) > clearance(left) ? right : left;
}

/**
 * Where the figure stands, in plan.
 *
 * ON THE APRON, AT THE THRESHOLD — not out on the grass beyond it, which is
 * where this used to put it (`plan + 0.9`, a clear 0.45 m outside the gravel).
 * That placement broke the only job the figure has. A viewer reads 2.5 m off
 * the pavilion by COMPARING two heights, and two objects metres apart in depth
 * cannot be compared: the figure became a lone thing standing on a lawn near a
 * building, which tells you nothing about either. Standing at the threshold,
 * a step from the nearest leg, the eye reads it against the leg directly.
 *
 * The gravel apron runs to `plan + 0.45` (GardenContext), so `plan + 0.25`
 * puts the figure on the gravel with the apron edge still visibly beyond it.
 */
export function figurePositionM(
  bearingDeg: number,
  planA: number,
  planB: number,
  standoffM = 0.25,
): { x: number; z: number } {
  const t = (bearingDeg * Math.PI) / 180;
  const r = Math.max(planA, planB) + standoffM;
  return { x: r * Math.sin(t), z: r * Math.cos(t) };
}
