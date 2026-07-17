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
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Inside the approved 1.75-1.8 m range. */
const HEIGHT_M = 1.78;
/** Flat, but not paper: enough to catch the key on one side and turn. */
const THICKNESS_M = 0.09;
/**
 * THE COLOUR IS A FUNCTION OF THE RIG, NOT A PREFERENCE. The spec's `#3a382f`
 * was authored against the house rig (ambient 0.8). This Canvas runs ambient
 * 0.32, because that is what lets the lattice's cast shadow read as dark, and
 * under it `#3a382f` bottoms out: the figure rendered as a pure black void, a
 * hole in the frame rather than an object, which is exactly what the spec's
 * "NOT pure black or it reads as a cutout" was written to prevent.
 *
 * This is the same mistake the soil beds made under the same rig, and it was
 * caught there and missed here. A dark object in a dimly-filled scene needs a
 * LIGHTER base colour to arrive at the same place, not the same one.
 *
 * This value renders as dark warm graphite with a visibly lit side and a
 * shadow side: a body, not a silhouette sticker.
 */
const GRAPHITE = '#87826f';

/**
 * Half the outline, as fractions of height, walked from the CROTCH down the
 * inside of the leg, round the foot, up the outside, to the crown. Mirrored to
 * close it. Canonical standing proportions (crotch 0.47, shoulder 0.82, chin
 * 0.87, head ~1/7.5 of height).
 *
 * THE TWO CUES ARE THE WHOLE THING, AND THEY MUST BE COARSE. A silhouette
 * reads as a PERSON almost entirely on the gap between the legs and the notch
 * under the jaw, and reads as a monolith without them. Two attempts failed
 * here before this one:
 *
 *   v1 merged the legs into one slab from hip to ground: an Easter Island
 *      head, unmistakably.
 *   v2 had anatomically correct legs with a ~10 cm gap and a subtle neck. At
 *      the size this actually renders on camera — roughly 200 px tall — a
 *      10 cm gap is a ONE-PIXEL hairline and a subtle neck is nothing. It
 *      read as a hooded, legless pillar. A Grim Reaper.
 *
 * So the cues here are deliberately exaggerated past anatomy: the legs splay
 * to open a ~20 cm gap and the neck is pinched to 10 cm against a 21 cm skull.
 * Correct proportions that vanish at render size are worth less than coarse
 * ones that read. This is a section-drawing convention, not a portrait.
 */
const OUTLINE: [number, number][] = [
  [0.020, 0.46], // crotch
  [0.040, 0.32], // inner thigh
  [0.052, 0.14], // inner calf — the legs SPLAY, opening the gap
  [0.058, 0.02], // inner ankle
  [0.115, 0.0], // foot
  [0.088, 0.03], // outer ankle
  [0.095, 0.15], // calf
  [0.088, 0.28], // knee
  [0.101, 0.38], // outer thigh
  [0.107, 0.47],
  [0.108, 0.56], // hip
  [0.086, 0.635], // waist
  [0.092, 0.7],
  [0.108, 0.755], // chest
  [0.121, 0.8], // deltoid
  [0.112, 0.827], // shoulder top
  [0.068, 0.845], // trapezius, sloping in hard
  [0.029, 0.858], // neck — 10 cm. The notch has to be unmissable.
  [0.028, 0.882],
  [0.050, 0.898], // jaw
  [0.058, 0.928],
  [0.054, 0.958], // skull
  [0.041, 0.980],
  [0.022, 0.995],
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

export function ScaleFigure({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  /**
   * IT TURNS TO FACE THE CAMERA. Not a cheat — this is what an architectural
   * entourage cutout has always done, and here it removes an entire class of
   * failure rather than hiding one.
   *
   * A flat extrusion has a degenerate viewing angle: seen at 90° off it is a
   * 9 cm black fencepost. Anything that orbits WILL find that angle, and the
   * turntable does, which previously forced the figure's placement into a
   * narrow band chosen to dodge it, and still let it decay after ~4 s. Facing
   * the camera means it is always broadside, so the band constraint and the
   * decay both evaporate and the figure can stand where the COMPOSITION wants
   * it instead of where the geometry tolerates it.
   *
   * The "no face turned to the lens" rule survives by construction: the
   * silhouette is left-right symmetric and has no face, so its front and its
   * back are the same shape. There is nothing to turn away.
   *
   * The rotation is imperceptible at the turntable's 13.8°/s over the two or
   * three seconds it runs in the shot.
   */
  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.y = Math.atan2(camera.position.x - position[0], camera.position.z - position[2]);
  });

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
    <mesh ref={ref} geometry={geo} position={position} castShadow>
      <meshStandardMaterial color={GRAPHITE} roughness={0.95} metalness={0} />
    </mesh>
  );
}
