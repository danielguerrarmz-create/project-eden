/**
 * CageHandles.tsx — the direct-manipulation control cage (prototype).
 *
 * Replaces the four sliders with draggable 3D handles. Dragging a handle raycasts
 * the pointer onto a constraint plane, maps the hit to a proposed DesignParam via
 * the pure directManip layer, and calls store.setParam — the SAME path the sliders
 * drove. The engine reclamps to the fabrication grammar and the handle, whose
 * position is derived from the clamped design, snaps to the buildable limit. So a
 * gesture can never leave the buildable family: you feel the grammar as resistance.
 *
 * OrbitControls is paused for the duration of a drag so shaping never fights the
 * camera. This is a feasibility spike; Sai's interaction spec refines the visuals.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useDesign, type SliderKey } from '../state/store';
import {
  HANDLE_KINDS,
  HANDLE_PARAM,
  handleAnchors,
  proposeFromDrag,
  type HandleKind,
} from '../engine/directManip';
import type { Vec3 } from '../engine/types';

/** Vertical-drag handle (rise) vs horizontal-plane handles (footprint, aperture). */
const CONSTRAINT: Record<HandleKind, 'vertical' | 'horizontal'> = {
  rise: 'vertical',
  footprintEast: 'horizontal',
  footprintWest: 'horizontal',
  aperture: 'horizontal',
};

/** Aperture handle reads as the "opening"; give it the one chroma accent. */
const COLOR: Record<HandleKind, string> = {
  rise: '#232C5E',
  footprintEast: '#232C5E',
  footprintWest: '#232C5E',
  aperture: '#ACC13A',
};

const HANDLE_R = 0.13;

export function CageHandles() {
  const params = useDesign((s) => s.params);
  const setParam = useDesign((s) => s.setParam);
  const anchors = useMemo(() => handleAnchors(params), [params]);

  return (
    <group>
      {/* Faint hairline guides so the cage reads as a structure, not stray dots. */}
      <GuideLine from={[0, 0, 0]} to={anchors.footprintEast} />
      <GuideLine from={[0, 0, 0]} to={anchors.footprintWest} />
      <GuideLine from={[0, 0, 0]} to={anchors.rise} />
      {HANDLE_KINDS.map((kind) => (
        <DragHandle
          key={kind}
          kind={kind}
          position={anchors[kind]}
          color={COLOR[kind]}
          setParam={setParam}
        />
      ))}
    </group>
  );
}

function GuideLine({ from, to }: { from: Vec3; to: Vec3 }) {
  return (
    <Line
      points={[from as [number, number, number], to as [number, number, number]]}
      color="#232C5E"
      transparent
      opacity={0.28}
      lineWidth={1}
      dashed
      dashSize={0.08}
      gapSize={0.06}
    />
  );
}

function DragHandle({
  kind,
  position,
  color,
  setParam,
}: {
  kind: HandleKind;
  position: Vec3;
  color: string;
  setParam: (key: SliderKey, value: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;

  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);

  // Reusable scratch so a drag allocates nothing per pointermove.
  const plane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const hit = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());

  const apply = useCallback(
    (p: THREE.Vector3) => {
      const patch = proposeFromDrag(kind, [p.x, p.y, p.z]);
      setParam(HANDLE_PARAM[kind] as SliderKey, Object.values(patch)[0] as number);
    },
    [kind, setParam],
  );

  const onMove = useCallback(
    (ev: PointerEvent) => {
      if (!dragging.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.current.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc.current, camera);
      if (raycaster.current.ray.intersectPlane(plane.current, hit.current)) {
        apply(hit.current);
      }
    },
    [apply, camera, gl],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
    if (controls) controls.enabled = true;
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [controls, onMove]);

  const onDown = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      dragging.current = true;
      if (controls) controls.enabled = false;
      document.body.style.cursor = 'grabbing';

      if (CONSTRAINT[kind] === 'horizontal') {
        // Drag in the horizontal plane through the handle's current height.
        plane.current.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(position[0], position[1], position[2]),
        );
      } else {
        // Vertical: a camera-facing plane through the Y axis, so up/down tracks.
        camera.getWorldDirection(camDir.current);
        camDir.current.y = 0;
        camDir.current.normalize();
        plane.current.setFromNormalAndCoplanarPoint(
          camDir.current,
          new THREE.Vector3(0, position[1], 0),
        );
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [kind, position, controls, camera, onMove, onUp],
  );

  const r = HANDLE_R * (hovered ? 1.25 : 1);

  return (
    <mesh
      position={position as [number, number, number]}
      onPointerDown={onDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (!dragging.current) document.body.style.cursor = '';
      }}
      renderOrder={10}
    >
      <sphereGeometry args={[r, 24, 24]} />
      <meshStandardMaterial
        color={color}
        roughness={0.35}
        metalness={0}
        emissive={color}
        emissiveIntensity={hovered ? 0.45 : 0.15}
        depthTest={false}
        transparent
      />
    </mesh>
  );
}
