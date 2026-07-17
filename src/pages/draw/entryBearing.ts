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
 * The figure is a flat silhouette facing inward, so how broad it reads is a
 * function of this angle alone:
 *
 *   off ≈ 0    it faces directly away: broad, but it stands BETWEEN the lens
 *              and the building at half the camera's distance, so perspective
 *              blows it up into a looming monolith taller than the dome, and
 *              the frame (fitted to the lattice) crops it off at the knee.
 *   off ≈ 90   it faces across the view: EDGE-ON. A 9 cm extrusion seen on its
 *              edge is a black fencepost. This is the degenerate case and the
 *              reason the band below excludes it.
 *   off ≈ 150  it faces 30° off the lens: nearly broadside, standing beyond
 *              the structure at roughly the object's own depth, so it renders
 *              at the object's own scale and reads instantly as a person.
 *              THE TARGET.
 *   off ≈ 180  broadside, but directly behind the dome's centre, where a leg
 *              cuts through it and it reads as a smudge.
 *
 * The far side is where this wants to be, which is the opposite of the
 * obvious guess ("keep it in front or the lattice will hide it"). The lattice
 * is legs and air: it hides nothing at 150°, and standing beyond it is also
 * what says the pavilion is something you walk through.
 */
export const TARGET_OFF_DEG = 150;

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
 * Where the figure stands, in plan. Just outside the gravel apron, which sits
 * at plan + 0.45 (see GardenContext), so it never stands ON the apron edge.
 */
export function figurePositionM(
  bearingDeg: number,
  planA: number,
  planB: number,
  standoffM = 0.9,
): { x: number; z: number } {
  const t = (bearingDeg * Math.PI) / 180;
  const r = Math.max(planA, planB) + standoffM;
  return { x: r * Math.sin(t), z: r * Math.cos(t) };
}
