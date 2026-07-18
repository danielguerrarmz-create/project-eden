/**
 * DimensionCallout.tsx — turn the scale figure into a measurement device.
 *
 * Part E, Option A of the round-3 spec. Round 1 settled that the figure itself
 * must not move, gain a face, or get costumed — the kitsch line is the whole
 * risk — so this adds NOTHING to the figure. It draws a slim architectural
 * dimension beside it (a vertical line with end ticks and the real height in the
 * house mono register), the same graphic language the rest of the product's
 * readouts already speak. The figure stops being a passive size comparison and
 * becomes an active measurement, with no motion or personality added to it.
 *
 * A SELF-HEIGHT DIMENSION, a small deviation from the spec's "line to the
 * nearest eave datum": the figure's own 0 -> 1.78 m height, labelled, reads as
 * an unambiguous measuring stick, where a crown-to-eave gap labelled with the
 * figure's height would pair two unrelated distances. Same intent, clearer read.
 *
 * ARRIVES WITH THE OBJECT, then available on demand: it fades in on bake settle
 * and holds a few seconds (like the commission count-up), then fades out; hover
 * the figure to bring it back for a re-check. The dimension geometry is 3D so it
 * stays zoom- and perspective-correct; the label is a DOM node in the panel
 * register, positioned by drei's Html.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { HEIGHT_M } from './ScaleFigure';

/** How long the callout holds after bake before fading, unless hovered. */
const AUTO_HOLD_MS = 4500;

export function DimensionCallout({ figurePos }: { figurePos: [number, number, number] }) {
  const [revealed, setRevealed] = useState(true);
  const lineRef = useRef<THREE.LineSegments>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const opacity = useRef(0);

  // Arrives with the object, then hides itself so it does not sit on every
  // filmed frame; hover re-reveals it (the hitbox below).
  useEffect(() => {
    const t = setTimeout(() => setRevealed(false), AUTO_HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  const { positions, labelPos } = useMemo(() => {
    const [fx, , fz] = figurePos;
    const rlen = Math.hypot(fx, fz) || 1;
    const rx = fx / rlen;
    const rz = fz / rlen; // radially outward from plan centre
    const tx = -rz;
    const tz = rx; // tangent, for the end ticks
    const ox = fx + rx * 0.28; // stand the dimension line just outside the figure
    const oz = fz + rz * 0.28;
    const tick = 0.06;
    const pts = [
      ox, 0, oz, ox, HEIGHT_M, oz, // the vertical run
      ox - tx * tick, 0, oz - tz * tick, ox + tx * tick, 0, oz + tz * tick, // foot tick
      ox - tx * tick, HEIGHT_M, oz - tz * tick, ox + tx * tick, HEIGHT_M, oz + tz * tick, // crown tick
    ];
    return {
      positions: new Float32Array(pts),
      labelPos: [ox + rx * 0.06, HEIGHT_M * 0.55, oz + rz * 0.06] as [number, number, number],
    };
  }, [figurePos]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    const target = revealed ? 1 : 0;
    opacity.current += (target - opacity.current) * Math.min(1, dt * 6);
    const mat = lineRef.current?.material as THREE.LineBasicMaterial | undefined;
    if (mat) mat.opacity = opacity.current;
    if (labelRef.current) labelRef.current.style.opacity = String(opacity.current);
  });

  return (
    <group>
      {/* An invisible hitbox around the figure. visible=false so it never draws
          (nor pollutes the ink pass's normal buffer) but still receives pointer
          events, so hovering the figure re-reveals the dimension. */}
      <mesh
        position={[figurePos[0], HEIGHT_M / 2, figurePos[2]]}
        visible={false}
        onPointerOver={() => setRevealed(true)}
        onPointerOut={() => setRevealed(false)}
      >
        <boxGeometry args={[0.7, HEIGHT_M, 0.7]} />
      </mesh>

      <lineSegments ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#2f2a1f" transparent opacity={0} />
      </lineSegments>

      {/* One label node. Legibility at filming distance (live QA) comes from a
          vellum chip in the panel register rather than a hairline of tiny text;
          `labelRef` fades the whole chip in step with the line. */}
      <Html position={labelPos} center zIndexRange={[20, 0]}>
        <div
          ref={labelRef}
          style={{ opacity: 0, pointerEvents: 'none' }}
          className="whitespace-nowrap rounded border border-inkBlack/15 bg-paperVellum/90 px-1.5 py-0.5 font-mono text-[13px] uppercase tracking-[0.1em] text-inkBlack/80 shadow-sm"
        >
          {HEIGHT_M.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
