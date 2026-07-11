/**
 * SculptShell.tsx — the interactive form-finding gridshell (SPIKE).
 *
 * Owns a mutable GridShell (engine/formFinding), steps the relaxation solver once
 * per frame in useFrame, and renders the struts as one instanced timber mesh + the
 * nodes as pickable handles. Grabbing a node begins a falloff region; dragging it
 * on a camera-facing plane pulls the region while the solver projects the whole
 * lattice back onto the nearest BUILDABLE gridshell every frame — you feel it
 * settle, and stiffen at the fabrication limits.
 *
 * Rendering is decoupled from React state: the solver mutates Float64Arrays and we
 * write instance matrices straight from them (no per-frame React re-render, no
 * allocation in the hot loop). Live stats are pushed up ~6×/s via onStats for the
 * HUD, so buildability + fps are visible without driving the render.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildGridshell,
  beginGrab,
  moveGrab,
  endGrab,
  relax,
  shellStats,
  getPos,
  FAB_MIN_M,
  FAB_MAX_M,
  DEFAULT_OPTS,
  type GridShell,
  type ShellStats,
} from '../engine/formFinding';

const UP = new THREE.Vector3(0, 1, 0);
const STRUT_R = 0.03;
const NODE_R = 0.07;

/** Non-allocating segment matrix: write a start->end cylinder transform into `out`. */
function writeSegment(
  out: THREE.Matrix4,
  obj: THREE.Object3D,
  q: THREE.Quaternion,
  sx: number,
  sy: number,
  sz: number,
  ex: number,
  ey: number,
  ez: number,
): void {
  const dx = ex - sx;
  const dy = ey - sy;
  const dz = ez - sz;
  const len = Math.hypot(dx, dy, dz) || 1e-6;
  obj.position.set((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2);
  q.setFromUnitVectors(UP, obj.up.set(dx / len, dy / len, dz / len));
  obj.quaternion.copy(q);
  obj.scale.set(1, len, 1);
  obj.updateMatrix();
  out.copy(obj.matrix);
}

/** Strut colour: cool timber mid-band -> hot amber as it nears a fab limit (the "grain"). */
function grainColor(out: THREE.Color, len: number, lmin: number, lmax: number): void {
  const mid = (lmin + lmax) / 2;
  const half = (lmax - lmin) / 2 || 1e-6;
  const t = Math.min(1, Math.abs(len - mid) / half); // 0 slack .. 1 at a limit
  // hue 32° (warm timber) -> 12° (amber) as it stiffens; darken the slack ones.
  out.setHSL((32 - 20 * t) / 360, 0.35 + 0.35 * t, 0.42 + 0.06 * t);
}

export interface SculptShellProps {
  /** Rebuild key: bump to regenerate at a new density (perf stress). */
  spokes: number;
  rings: number;
  /** Crown oculus fraction — scales with density to keep the crown ring buildable. */
  oculus: number;
  /** Grab falloff radius (m). */
  radius: number;
  /** Push stats + fps to the HUD (throttled). */
  onStats: (s: ShellStats, fps: number) => void;
  /** Nonce: changing it rebuilds/resets the shell. */
  resetNonce: number;
}

export function SculptShell({ spokes, rings, oculus, radius, onStats, resetNonce }: SculptShellProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;

  const strutRef = useRef<THREE.InstancedMesh>(null);
  const nodeRef = useRef<THREE.InstancedMesh>(null);

  // The mutable solver state — rebuilt when density/reset changes.
  const shell = useRef<GridShell>(buildGridshell({ spokes, rings, oculus }));
  useEffect(() => {
    shell.current = buildGridshell({ spokes, rings, oculus });
  }, [spokes, rings, oculus, resetNonce]);

  // Reusable scratch (no per-frame allocation).
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.Matrix4(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const col = useMemo(() => new THREE.Color(), []);

  // Drag state.
  const dragging = useRef(false);
  const seed = useRef(-1);
  const plane = useRef(new THREE.Plane());
  const ray = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const hit = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());

  // FPS + throttled stats.
  const fps = useRef(60);
  const statsClock = useRef(0);

  const strutCount = shell.current.struts.length;
  const nodeCount = shell.current.n;

  useFrame((_, delta) => {
    const s = shell.current;
    relax(s, DEFAULT_OPTS);

    // Write strut instance matrices + grain colours straight from the solver arrays.
    const sm = strutRef.current;
    if (sm) {
      for (let i = 0; i < s.struts.length; i++) {
        const st = s.struts[i];
        const ka = st.a * 3;
        const kb = st.b * 3;
        writeSegment(mat, scratch, quat, s.pos[ka], s.pos[ka + 1], s.pos[ka + 2], s.pos[kb], s.pos[kb + 1], s.pos[kb + 2]);
        sm.setMatrixAt(i, mat);
        const len = Math.hypot(s.pos[kb] - s.pos[ka], s.pos[kb + 1] - s.pos[ka + 1], s.pos[kb + 2] - s.pos[ka + 2]);
        const bad = len < FAB_MIN_M - 1e-4 || len > FAB_MAX_M + 1e-4;
        if (bad) col.set('#b8402f');
        else grainColor(col, len, st.lmin, st.lmax);
        sm.setColorAt(i, col);
      }
      sm.instanceMatrix.needsUpdate = true;
      if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
    }

    // Node handles: translation only.
    const nm = nodeRef.current;
    if (nm) {
      for (let i = 0; i < s.n; i++) {
        scratch.position.set(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
        scratch.quaternion.identity();
        scratch.scale.setScalar(s.invMass[i] === 0 ? 1.5 : 1); // feet read a touch bigger
        scratch.updateMatrix();
        nm.setMatrixAt(i, scratch.matrix);
      }
      nm.instanceMatrix.needsUpdate = true;
    }

    // Drag: keep pulling the region toward the pointer's plane hit.
    if (dragging.current && seed.current >= 0) {
      moveGrab(s, seed.current, [hit.current.x, hit.current.y, hit.current.z]);
    }

    // FPS (smoothed) + throttled stats push.
    const inst = 1 / Math.max(delta, 1e-4);
    fps.current += (inst - fps.current) * 0.1;
    statsClock.current += delta;
    if (statsClock.current > 0.16) {
      statsClock.current = 0;
      onStats(shellStats(s), fps.current);
    }
  });

  const toPlane = useCallback(
    (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.current.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.current.setFromCamera(ndc.current, camera);
      ray.current.ray.intersectPlane(plane.current, hit.current);
    },
    [camera, gl],
  );

  const onMove = useCallback((ev: PointerEvent) => {
    if (!dragging.current) return;
    toPlane(ev);
  }, [toPlane]);

  const onUp = useCallback(() => {
    dragging.current = false;
    seed.current = -1;
    endGrab(shell.current);
    if (controls) controls.enabled = true;
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [controls, onMove]);

  const onNodeDown = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      if (e.instanceId == null) return;
      const s = shell.current;
      if (s.invMass[e.instanceId] === 0) return; // don't grab a pinned foot
      e.stopPropagation();
      seed.current = e.instanceId;
      const p = getPos(s, e.instanceId);
      shell.current = beginGrab(s, e.instanceId, radius);
      // Camera-facing drag plane through the grabbed node: pull in screen space.
      camera.getWorldDirection(camDir.current);
      plane.current.setFromNormalAndCoplanarPoint(camDir.current, new THREE.Vector3(p[0], p[1], p[2]));
      dragging.current = true;
      if (controls) controls.enabled = false;
      document.body.style.cursor = 'grabbing';
      toPlane(e.nativeEvent);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [camera, controls, radius, onMove, onUp, toPlane],
  );

  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [onMove, onUp]);

  return (
    <group>
      <instancedMesh
        key={`struts-${strutCount}`}
        ref={strutRef}
        args={[undefined, undefined, strutCount]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[STRUT_R, STRUT_R, 1, 6]} />
        <meshStandardMaterial roughness={0.7} metalness={0} />
      </instancedMesh>

      <instancedMesh
        key={`nodes-${nodeCount}`}
        ref={nodeRef}
        args={[undefined, undefined, nodeCount]}
        onPointerDown={onNodeDown}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => {
          if (!dragging.current) document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[NODE_R, 10, 10]} />
        <meshStandardMaterial color="#2f3a1c" roughness={0.5} metalness={0} />
      </instancedMesh>
    </group>
  );
}
