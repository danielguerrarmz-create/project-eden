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
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Pt, Spine } from '../../engine/fromDrawing';
import { arcRiseM, type Edit, type SurfaceInput } from '../../engine/surface';
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
  const [start, setStart] = useState<Pt | null>(null);
  const [now, setNow] = useState<Pt | null>(null);
  const [amount, setAmount] = useState(0);

  const plan = useCallback((e: ThreeEvent<PointerEvent>): Pt => ({ x: e.point.x, y: e.point.z }), []);

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled) return;
    e.stopPropagation();
    if (controls) controls.enabled = false;
    const p = plan(e);
    startRef.current = p;
    nowRef.current = p;
    screenYRef.current = e.nativeEvent.clientY;
    amountRef.current = 0;
    setStart(p);
    setNow(p);
    setAmount(0);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled || !startRef.current) return;
    const p = plan(e);
    nowRef.current = p;
    setNow(p);
    if (tool === 'lift') {
      // Pull UP the screen to raise. Screen-space, because the gesture is
      // "lift this", not "set y to 1.8".
      const dy = screenYRef.current - e.nativeEvent.clientY;
      amountRef.current = Math.max(-1.2, Math.min(1.6, dy * 0.006));
      setAmount(amountRef.current);
    }
  };

  const up = () => {
    if (controls) controls.enabled = true;
    const a = startRef.current;
    const b = nowRef.current;
    const amt = amountRef.current;
    startRef.current = null;
    nowRef.current = null;
    amountRef.current = 0;
    setStart(null);
    setNow(null);
    setAmount(0);
    if (!a || !b) return;

    const drag = Math.hypot(b.x - a.x, b.y - a.y);
    if (tool === 'draw') {
      if (drag > 0.9) onArc({ a, b }); // a tap isn't a line
    } else if (tool === 'lift') {
      if (Math.abs(amt) > 0.05) {
        onEdit({ kind: 'lift', at: a, radiusM: 1.5, amountM: amt });
      }
    } else if (tool === 'hole') {
      const r = Math.max(0.35, drag);
      onEdit({ kind: 'hole', at: a, radiusM: r });
    }
  };

  const liveHoleR = tool === 'hole' && start && now ? Math.max(0.35, Math.hypot(now.x - start.x, now.y - start.y)) : 0;

  return (
    <group>
      {/* The lawn — and the drawing surface, when nothing is built yet. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {/* Sized so a natural, comfortable stroke lands NEAR the buildable
            family (12-18 m²) rather than 90 m². The lawn is the only scale cue
            in the frame, so it quietly teaches how big to draw — and the bake
            then nudges rather than shocking you with a 5x clamp. */}
        <circleGeometry args={[6.5, 64]} />
        <meshStandardMaterial color="#8fa06a" roughness={1} />
      </mesh>

      {/* The soft thing. Also a drag target, so you sculpt ON it, not near it. */}
      {!resolved && arcs.length > 0 && (
        <group
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
        >
          <SurfaceMesh input={surface} />
        </group>
      )}

      {/* The arcs you drew, riding on the surface. */}
      {!resolved &&
        arcs.map((s, i) => (
          <group key={i}>
            <ArchRibbon a={s.a} b={s.b} />
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
          {tool === 'hole' && <EditHalo at={start} radiusM={liveHoleR} kind="hole" />}
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
