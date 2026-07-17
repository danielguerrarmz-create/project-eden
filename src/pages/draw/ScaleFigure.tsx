/**
 * ScaleFigure.tsx — one person, 1.78 m, so the lattice has a size.
 *
 * A dome renders identically at 3 m and at 30 m. Nothing else in the frame
 * says which, and "14.3 M²" in the corner is a number, not a sensation. One
 * figure and the whole thing snaps to human scale instantly.
 *
 * BAKE ONLY. The soft phase's ground stays bare on purpose (loose ground
 * invites editing), and a person standing beside a still-editable blob asserts
 * a commitment the design has not made. The figure is a "this is real now"
 * signal: it belongs to the resolved moment.
 *
 * THE KITSCH LINE, WHICH IS THE ENTIRE RISK HERE. Any hint of catalog
 * entourage — a walking gait, a bag, a face, a recognizable stock pose — is
 * instant SketchUp and loses an architecturally fluent audience in one frame.
 * So: a FLAT extruded silhouette, the blocked-out kind drawn into a section,
 * not a person. Deliberately:
 *
 *   - No face, no facial plane, no clothing seams, no hands.
 *   - No idle motion. It is static. A breathing entourage figure is worse
 *     than none.
 *   - Standing square, feet together, arms down. A gait pose is the single
 *     loudest stock-asset tell.
 *   - Facing INWARD, into the structure — you see its back or a
 *     three-quarter, never a figure turned to the lens. This is also what
 *     buys the no-face rule its cover: nobody looks for a face on a back.
 *   - NOT pure black. A pure black silhouette reads as a cutout pasted over
 *     the render, too graphic next to real materials. A soft warm graphite
 *     catches the rim light and reads as a body.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

/** Inside the approved 1.75-1.8 m range. */
const HEIGHT_M = 1.78;
/** Flat, but not paper: enough to catch the key on one side and turn. */
const THICKNESS_M = 0.09;
/** Close kin to inkBlack (#17160F) but soft enough to take light. */
const GRAPHITE = '#3a382f';

/**
 * Half the outline, as fractions of height, walked from the CROTCH down the
 * inside of the leg, round the foot, up the outside, to the crown. Mirrored to
 * close it. Canonical standing proportions (crotch 0.47, shoulder 0.82, chin
 * 0.87, head ~1/7.5 of height).
 *
 * THE LEG GAP IS THE WHOLE THING. The first version of this ran a single
 * outline straight from hip to ground with the legs merged into one slab, and
 * the result was unmistakably an Easter Island head: a monolith with a small
 * blocky skull. A silhouette reads as a PERSON almost entirely on two cues —
 * the gap between the legs and the notch under the jaw — and it reads as a
 * tombstone without them. Everything else is refinement.
 */
const OUTLINE: [number, number][] = [
  [0.011, 0.47], // crotch
  [0.026, 0.3], // inner thigh
  [0.03, 0.1], // inner calf
  [0.031, 0.015], // inner ankle
  [0.076, 0.0], // foot, forward
  [0.05, 0.028], // outer ankle
  [0.063, 0.14], // calf
  [0.055, 0.27], // knee
  [0.083, 0.37], // outer thigh
  [0.095, 0.47],
  [0.1, 0.56], // hip
  [0.081, 0.635], // waist
  [0.087, 0.7],
  [0.104, 0.755], // chest
  [0.119, 0.8], // deltoid
  [0.111, 0.826], // shoulder top
  [0.072, 0.843], // trapezius, sloping in
  [0.035, 0.856], // neck
  [0.033, 0.879],
  [0.051, 0.896], // jaw — the second cue that says "person"
  [0.058, 0.925],
  [0.055, 0.955], // skull
  [0.043, 0.978],
  [0.024, 0.994],
  [0.0, 1.0], // crown
];

function silhouette(): THREE.Shape {
  const h = HEIGHT_M;
  const s = new THREE.Shape();
  // Up the right side: crotch -> foot -> hip -> shoulder -> crown.
  s.moveTo(OUTLINE[0][0] * h, OUTLINE[0][1] * h);
  for (const [x, y] of OUTLINE.slice(1)) s.lineTo(x * h, y * h);
  // Down the left: crown -> shoulder -> hip -> foot -> crotch. Both ends of
  // OUTLINE sit on the centreline, so neither is mirrored twice.
  for (let i = OUTLINE.length - 2; i >= 1; i--) {
    s.lineTo(-OUTLINE[i][0] * h, OUTLINE[i][1] * h);
  }
  s.closePath();
  return s;
}

export function ScaleFigure({
  position,
  /** Radians. The figure faces INTO the structure. */
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(silhouette(), {
      depth: THICKNESS_M,
      bevelEnabled: false,
      curveSegments: 6,
    });
    // Extrude builds along +Z from the shape's plane; centre it so the figure
    // stands ON its bearing rather than 9 cm off it.
    g.translate(0, 0, -THICKNESS_M / 2);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geo} position={position} rotation={[0, rotationY, 0]} castShadow>
      <meshStandardMaterial color={GRAPHITE} roughness={0.95} metalness={0} />
    </mesh>
  );
}
