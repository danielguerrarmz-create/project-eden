/**
 * DrawStage.tsx — draw the thing in the space it will stand in.
 *
 * The plan-view version of this asked people to decode a projection: you drew
 * a flat squiggle and then had to believe a dome came out of it. Nobody thinks
 * in plan except architects, and even they don't want to. So the drawing
 * surface IS the 3D view. You drag across the lawn, an arch rises under the
 * cursor as you go, and the moment a second arch lands the lattice interpolates
 * between them. Draw, and it becomes the thing.
 *
 * The move is deliberately one gesture: press on the ground, drag, release.
 * A stroke's two ends are its feet, the arch between them is assumed (rise
 * scales with span, capped by the grammar), and every further stroke re-reads
 * the whole set. No modes, no handles, no numbers.
 *
 * DEMO SCOPE: the arches you draw are drawn as arches; the lattice between them
 * is the real engine's gridshell placed on the same footprint the strokes
 * imply. Wiring generateGeometry to honour arbitrary drawn foot bearings is the
 * next real engine step — see the handoff. What's here IMPLIES that pipeline
 * honestly rather than faking numbers: everything in the readout is computed.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Pt, Spine } from '../../engine/fromDrawing';

/** Rise of a drawn arch: proportional to span, but never a silly lollipop. */
export function archRiseM(span: number): number {
  return Math.min(2.5, Math.max(1.2, span * 0.42));
}

/** Sample a drawn arch as a 3D curve — a catenary-ish hump over the chord. */
export function archPoints(a: Pt, b: Pt, segments = 32): THREE.Vector3[] {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const rise = archRiseM(span);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = a.x + (b.x - a.x) * t;
    const z = a.y + (b.y - a.y) * t;
    // sin gives a clean spring at the feet and a flat crown — reads as built,
    // not as a parabola someone plotted.
    const y = Math.sin(t * Math.PI) ** 0.82 * rise;
    out.push(new THREE.Vector3(x, y, z));
  }
  return out;
}

function ArchRibbon({ a, b, ghost = false }: { a: Pt; b: Pt; ghost?: boolean }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(archPoints(a, b));
    return new THREE.TubeGeometry(curve, 40, ghost ? 0.028 : 0.045, 8, false);
  }, [a, b, ghost]);
  return (
    <mesh geometry={geo} castShadow={!ghost}>
      <meshStandardMaterial
        color={ghost ? '#6f6a5c' : '#b99a6b'}
        roughness={0.75}
        transparent={ghost}
        opacity={ghost ? 0.45 : 1}
      />
    </mesh>
  );
}

/** The two feet of a stroke, as the shoes they'll actually be. */
function Feet({ a, b, ghost = false }: { a: Pt; b: Pt; ghost?: boolean }) {
  return (
    <>
      {[a, b].map((p, i) => (
        <mesh key={i} position={[p.x, 0.02, p.y]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[ghost ? 0.1 : 0.14, 20]} />
          <meshStandardMaterial color="#1b1b18" transparent opacity={ghost ? 0.35 : 0.8} />
        </mesh>
      ))}
    </>
  );
}

export function DrawStage({
  spines,
  clearRadiusM,
  enabled,
  resolved,
  onSpine,
}: {
  spines: Spine[];
  clearRadiusM: number;
  /** Off once the structure is built, so orbiting doesn't scribble. */
  enabled: boolean;
  /**
   * True once the lattice has taken over. The drawn arches then STOP being
   * drawn: they were the input, and the structure is the answer to them.
   *
   * Keeping both on screen is worse than either. generateGeometry still roots
   * the canopy on its own grammar-derived feet rather than the bearings you
   * drew (that's the next engine step), so the raw arches stand exactly where
   * you put them while the dome builds on the origin — and the eye reads two
   * unrelated objects sharing a lawn rather than one thing that came from your
   * line. Until the engine honours drawn feet, the lines resolve INTO the
   * result instead of arguing with it.
   */
  resolved: boolean;
  onSpine: (s: Spine) => void;
}) {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;

  // Refs are the truth; state only mirrors for painting. A drag is a burst of
  // events and React batches them — reading the STATE on pointerup reads the
  // value the drag started from, and the stroke vanishes.
  const startRef = useRef<Pt | null>(null);
  const nowRef = useRef<Pt | null>(null);
  const [start, setStart] = useState<Pt | null>(null);
  const [now, setNow] = useState<Pt | null>(null);

  const toPlan = useCallback((e: ThreeEvent<PointerEvent>): Pt => {
    return { x: e.point.x, y: e.point.z };
  }, []);

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled) return;
    e.stopPropagation();
    if (controls) controls.enabled = false;
    const p = toPlan(e);
    startRef.current = p;
    nowRef.current = p;
    setStart(p);
    setNow(p);
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!enabled || !startRef.current) return;
    const p = toPlan(e);
    nowRef.current = p;
    setNow(p);
  };

  const up = () => {
    if (controls) controls.enabled = true;
    const a = startRef.current;
    const b = nowRef.current;
    startRef.current = null;
    nowRef.current = null;
    setStart(null);
    setNow(null);
    if (!a || !b) return;
    // A tap isn't a line. Below this it's a misclick, not an arch.
    if (Math.hypot(b.x - a.x, b.y - a.y) > 0.9) onSpine({ a, b });
  };

  return (
    <group>
      {/* The lawn — and the drawing surface. Sized to the room the site found. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        <circleGeometry args={[Math.max(3, clearRadiusM), 64]} />
        <meshStandardMaterial color="#93a06a" roughness={1} />
      </mesh>

      {/* Beyond the clear radius: still lawn, but not yours to build on. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <circleGeometry args={[Math.max(3, clearRadiusM) * 2.4, 64]} />
        <meshStandardMaterial color="#8a9663" roughness={1} />
      </mesh>

      {/* Committed strokes — until the lattice resolves them. */}
      {!resolved &&
        spines.map((s, i) => (
          <group key={i}>
            <ArchRibbon a={s.a} b={s.b} />
            <Feet a={s.a} b={s.b} />
          </group>
        ))}

      {/* The stroke under the cursor, rising as you drag */}
      {enabled && start && now && Math.hypot(now.x - start.x, now.y - start.y) > 0.2 && (
        <group>
          <ArchRibbon a={start} b={now} ghost />
          <Feet a={start} b={now} ghost />
        </group>
      )}
    </group>
  );
}
