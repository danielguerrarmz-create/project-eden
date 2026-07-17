/**
 * DrawStage.tsx — draw, lift, excavate. Three gestures, no numbers.
 *
 * All three are the same shape of move: press somewhere on the thing, drag,
 * release. What changes is what the drag MEANS.
 *
 *   DRAW      drag across the lawn -> an arc, its ends are feet.
 *   LIFT      press on the surface and pull up -> it rises under your hand.
 *   EXCAVATE  press on the surface and drag out -> a hole opens.
 *
 * This is the 2D-logic-on-a-3D-surface hybrid on purpose. Every gesture is
 * "here, this big" — a point and a radius — which people can reason about on a
 * picture. Nobody can reason about a trivariate control lattice, and asking
 * them to is how you end up with Grasshopper.
 *
 * Nothing here bakes. The surface stays soft until you say otherwise.
 *
 * WHAT THIS DOES NOT OWN: the camera. A left drag with no space held is the
 * tool's; everything else belongs to OrbitControls and must pass through here
 * untouched. This file used to claim EVERY pointerdown — every button, always
 * — which is why right-drag drew a line instead of orbiting, and why there was
 * no way to turn the object at all. See `gesture.ts` for the rule; it is one
 * function, and it is pure so it can be tested.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Pt, Spine } from '../../engine/fromDrawing';
import { arcRiseM, type Edit, type SurfaceInput } from '../../engine/surface';
import {
  MIN_HOLE_RADIUS_M,
  commitGesture,
  holeRadiusM,
  liftAmountM,
  toolClaimsPointer,
} from './gesture';
import { SurfaceMesh } from './SurfaceMesh';

export type Tool = 'draw' | 'lift' | 'hole';

/** Sample a drawn arc as a 3D curve. Agrees with surface.ts's tent by design. */
export function archPoints(a: Pt, b: Pt, segments = 32): THREE.Vector3[] {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const rise = arcRiseM(span);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    out.push(
      new THREE.Vector3(
        a.x + (b.x - a.x) * t,
        Math.sin(t * Math.PI) ** 0.82 * rise,
        a.y + (b.y - a.y) * t,
      ),
    );
  }
  return out;
}

function ArchRibbon({ a, b, ghost = false }: { a: Pt; b: Pt; ghost?: boolean }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(archPoints(a, b));
    return new THREE.TubeGeometry(curve, 40, ghost ? 0.03 : 0.05, 8, false);
  }, [a, b, ghost]);
  return (
    <mesh geometry={geo} castShadow={!ghost}>
      <meshStandardMaterial
        color={ghost ? '#6f6a5c' : '#a9834f'}
        roughness={0.7}
        transparent={ghost}
        opacity={ghost ? 0.5 : 1}
      />
    </mesh>
  );
}

/** The live footprint of a lift or a hole, drawn on the ground as you size it. */
function EditHalo({ at, radiusM, kind }: { at: Pt; radiusM: number; kind: 'lift' | 'hole' }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[at.x, 0.03, at.y]}>
      <ringGeometry args={[Math.max(0.02, radiusM - 0.04), radiusM, 48]} />
      <meshBasicMaterial color={kind === 'hole' ? '#b8402f' : '#7d8e5b'} transparent opacity={0.85} />
    </mesh>
  );
}

export function DrawStage({
  arcs,
  edits,
  tool,
  enabled,
  resolved,
  spaceHeldRef,
  onArc,
  onEdit,
}: {
  arcs: Spine[];
  edits: Edit[];
  tool: Tool;
  /** Off once baked — orbiting a cut list shouldn't scribble on it. */
  enabled: boolean;
  /** Baked: the surface steps aside for the real structure. */
  resolved: boolean;
  /** Space down = the camera has the pointer. A ref, so `down` reads NOW. */
  spaceHeldRef: React.RefObject<boolean>;
  onArc: (s: Spine) => void;
  onEdit: (e: Edit) => void;
}) {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const surface: SurfaceInput = useMemo(() => ({ arcs, edits }), [arcs, edits]);

  // Refs are the truth; state only mirrors for painting. A drag is a burst of
  // events and React batches them — reading STATE on pointerup reads the value
  // the drag started from, and the gesture is silently thrown away.
  const startRef = useRef<Pt | null>(null);
  const nowRef = useRef<Pt | null>(null);
  const screenYRef = useRef(0);
  const amountRef = useRef(0);
  // What the press landed on. A move over anything else is not this gesture.
  const downObjRef = useRef<THREE.Object3D | null>(null);
  const [start, setStart] = useState<Pt | null>(null);
  const [now, setNow] = useState<Pt | null>(null);
  const [amount, setAmount] = useState(0);

  const plan = useCallback((e: ThreeEvent<PointerEvent>): Pt => ({ x: e.point.x, y: e.point.z }), []);

  const clear = useCallback(() => {
    startRef.current = null;
    nowRef.current = null;
    amountRef.current = 0;
    downObjRef.current = null;
    setStart(null);
    setNow(null);
    setAmount(0);
    if (controls) controls.enabled = true;
  }, [controls]);

  const down = (e: ThreeEvent<PointerEvent>) => {
    // The camera's drag. Do not stopPropagation, do not disable controls, do
    // not arm anything: OrbitControls must see this exactly as it would have.
    if (!toolClaimsPointer({ button: e.nativeEvent.button, spaceHeld: !!spaceHeldRef.current, enabled }))
      return;
    e.stopPropagation();
    if (controls) controls.enabled = false;
    const p = plan(e);
    startRef.current = p;
    nowRef.current = p;
    screenYRef.current = e.nativeEvent.clientY;
    amountRef.current = 0;
    downObjRef.current = e.eventObject;
    setStart(p);
    setNow(p);
    setAmount(0);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled || !startRef.current) return;
    // Off-surface guard. R3F reports the hit point on whatever the ray struck,
    // so a sculpt drag that wanders off the canopy onto the lawn gets handed
    // the LAWN's point: a jump of metres in plan space, and one excavate
    // gesture eats the whole canopy. The lawn sits behind the canopy and R3F
    // walks every intersection, so both handlers fire on the same move —
    // taking only the one we pressed on keeps the last good point instead.
    if (e.eventObject !== downObjRef.current) return;
    const p = plan(e);
    nowRef.current = p;
    setNow(p);
    if (tool === 'lift') {
      // Pull UP the screen to raise. Screen-space, because the gesture is
      // "lift this", not "set y to 1.8".
      amountRef.current = liftAmountM(screenYRef.current - e.nativeEvent.clientY);
      setAmount(amountRef.current);
    }
  };

  const up = useCallback(() => {
    const a = startRef.current;
    if (!a) return; // not our drag; the camera just finished orbiting
    const c = commitGesture({ tool, from: a, to: nowRef.current, amountM: amountRef.current });
    clear();
    if (!c) return; // a click is a click, and a click changes nothing
    if (c.kind === 'arc') onArc(c.spine);
    else onEdit(c.edit);
  }, [tool, clear, onArc, onEdit]);

  // WHY THE WINDOW HEARS THE RELEASE, NOT THE MESH. R3F only delivers
  // pointerup to an object the ray still hits, so letting go anywhere off the
  // canopy — which is most of the frame, and exactly where a lift's pull ENDS,
  // since pulling up drags the cursor off the top of the thing — never
  // reached the mesh at all. The lift was silently lost and the refs stayed
  // armed until the next press. The window always hears it.
  useEffect(() => {
    const onCancel = () => clear(); // interrupted is not decided: discard
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
    };
  }, [up, clear]);

  const liveHoleR = tool === 'hole' && start && now ? holeRadiusM(start, now) : 0;

  return (
    <group>
      {/* The lawn — and the drawing surface, when nothing is built yet. */}
      {/* GATED ON !resolved, and it must stay that way. At bake the page
          mounts GardenContext, whose own lawn disc sits at this same y=0.
          Two opaque coplanar discs in two near-identical greens z-fight for
          every pixel they share, which on a slow turntable is a crawling
          flicker across the whole ground — about the worst thing that can
          happen to a hero frame. Baked, the garden is the only ground.

          No onPointerUp/onPointerLeave: the window owns the release (above).
          onPointerLeave in particular used to COMMIT the gesture the instant
          the cursor crossed the lawn's edge, so a stroke drawn to the far side
          landed short, at the rim. */}
      {!resolved && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={down} onPointerMove={move}>
          {/* Sized so a natural, comfortable stroke lands NEAR the buildable
              family (12-18 m²) rather than 90 m². The lawn is the only scale
              cue in the frame, so it quietly teaches how big to draw — and the
              bake then nudges rather than shocking you with a 5x clamp. */}
          <circleGeometry args={[6.5, 64]} />
          <meshStandardMaterial color="#8fa06a" roughness={1} />
        </mesh>
      )}

      {/* The soft thing. Also a drag target, so you sculpt ON it, not near it. */}
      {!resolved && arcs.length > 0 && (
        <group onPointerDown={down} onPointerMove={move}>
          <SurfaceMesh input={surface} />
        </group>
      )}

      {/* The arcs you drew. Full-weight while they are the only thing standing;
          once the canopy rises from them they GHOST — the arcs are the gesture,
          not the ribs, and a solid ribbon buried in the skin pokes through it
          in random tips and reads as debris. */}
      {!resolved &&
        arcs.map((s, i) => (
          <group key={i}>
            <ArchRibbon a={s.a} b={s.b} ghost={arcs.length >= 2} />
            {[s.a, s.b].map((p, j) => (
              <mesh key={j} position={[p.x, 0.02, p.y]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.14, 20]} />
                <meshStandardMaterial color="#1b1b18" transparent opacity={0.75} />
              </mesh>
            ))}
          </group>
        ))}

      {/* The gesture in flight */}
      {enabled && start && now && (
        <>
          {tool === 'draw' && Math.hypot(now.x - start.x, now.y - start.y) > 0.2 && (
            <ArchRibbon a={start} b={now} ghost />
          )}
          {/* The ring appears exactly when the drag becomes a hole, and it is
              the size of the hole. Below the threshold there is no ring,
              because there would be no hole: a halo under a gesture that is
              going to commit nothing is the same lie the 0.35 m floor told. */}
          {tool === 'hole' && liveHoleR >= MIN_HOLE_RADIUS_M && (
            <EditHalo at={start} radiusM={liveHoleR} kind="hole" />
          )}
          {tool === 'lift' && (
            <>
              <EditHalo at={start} radiusM={1.5} kind="lift" />
              {Math.abs(amount) > 0.02 && (
                <mesh position={[start.x, Math.max(0.1, amount) + 0.1, start.y]}>
                  <sphereGeometry args={[0.09, 12, 10]} />
                  <meshBasicMaterial color="#7d8e5b" />
                </mesh>
              )}
            </>
          )}
        </>
      )}
    </group>
  );
}
