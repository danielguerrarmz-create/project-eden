/**
 * Folly.tsx — the dry structure, drawn as WHAT GETS BUILT.
 *
 * Members are not boxes: each renders as its rectangular section CLIPPED BY
 * ITS TWO END-CUT PLANES (engine memberPrism, FABRICATION.md §1a). A hub
 * strut stops square at its computed standoff off the steel core; a butting
 * lamella's skew end sits ON the continuous piece's side face; blank facets
 * close on shared mitre planes — the joints you see are the joints the saw
 * and CNC make. Steel comes from connectors.ts (core drums, fins, bolt
 * pairs, clamp plates, ground shoes, fish plates), one instanced mesh for
 * plates and one for cylinders.
 *
 * The living layer is drawn separately by the Growth overlay onto a
 * conceptual sacrificial armature; nothing here ever depends on the plants.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { memberPrism, sectionFor } from '../engine/jointGeometry';
import type { Vec3 } from '../engine/types';
import { useDesign } from '../state/store';
import { buildSteel, type SteelOwner } from './connectors';
import { applyExplode, explodeDistanceM, type ExplodeUniforms } from './explodeShader';
import { applyReveal, makeRevealDepthMaterial, type RevealUniforms } from './revealShader';

// Prism corners come ordered [start 0..3, end 0..3] around the section.
const FACES: [number, number, number, number][] = [
  [0, 1, 2, 3], // start cut face
  [4, 5, 6, 7], // end cut face
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];

/**
 * Merge clipped member prisms into one flat-shaded BufferGeometry.
 *
 * `explode` carries, per prism, the world-space vector that prism travels at
 * full explode and when it starts (0 = eave/ground, 1 = crown). Written as
 * per-vertex attributes the same way `position` and `normal` already are: the
 * merge throws away per-piece identity by design, so the only way a piece can
 * move on its own afterwards is if every one of its vertices already knows
 * where it is going. Baked once here, animated by one uniform — the same trade
 * `revealShader` makes. See scene/explodeShader.ts.
 */
function prismsToGeometry(
  prisms: Vec3[][],
  explode?: { offsets: Vec3[]; delays: number[]; pieceIndex: number[] },
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const offsets: number[] = [];
  const delays: number[] = [];
  const pieceIdx: number[] = [];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  for (const [pi, v] of prisms.entries()) {
    const off = explode?.offsets[pi] ?? ([0, 0, 0] as Vec3);
    const delay = explode?.delays[pi] ?? 0;
    const piece = explode?.pieceIndex[pi] ?? -1;
    const centroid: [number, number, number] = [0, 0, 0];
    for (const p of v) {
      centroid[0] += p[0] / 8;
      centroid[1] += p[1] / 8;
      centroid[2] += p[2] / 8;
    }
    for (const face of FACES) {
      const fc: [number, number, number] = [0, 0, 0];
      for (const i of face) {
        fc[0] += v[i][0] / 4;
        fc[1] += v[i][1] / 4;
        fc[2] += v[i][2] / 4;
      }
      // Planar-quad normal from the diagonals, oriented outward (away from
      // the prism centroid), winding fixed to match.
      let [a, b, c, d] = face;
      let n = cross(sub(v[c], v[a]), sub(v[d], v[b]));
      if (dot(n, sub(fc, centroid)) < 0) {
        [b, d] = [d, b];
        n = [-n[0], -n[1], -n[2]];
      }
      const l = Math.hypot(n[0], n[1], n[2]) || 1e-9;
      const un: Vec3 = [n[0] / l, n[1] / l, n[2] / l];
      for (const tri of [
        [a, b, c],
        [a, c, d],
      ]) {
        for (const i of tri) {
          positions.push(v[i][0], v[i][1], v[i][2]);
          normals.push(un[0], un[1], un[2]);
          offsets.push(off[0], off[1], off[2]);
          delays.push(delay);
          pieceIdx.push(piece);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (explode) {
    geo.setAttribute('aExplodeOffset', new THREE.Float32BufferAttribute(offsets, 3));
    geo.setAttribute('aExplodeDelay', new THREE.Float32BufferAttribute(delays, 1));
    // Not read by any shader — this one exists so a RAYCAST can name what it
    // hit. The merge destroys per-piece identity; this is the only thread back
    // from a triangle on screen to a row in the cut list.
    geo.setAttribute('aPieceIndex', new THREE.Float32BufferAttribute(pieceIdx, 1));
  }
  return geo;
}

function useInstanceMatrices(
  ref: React.RefObject<THREE.InstancedMesh>,
  matrices: THREE.Matrix4[],
  owners: SteelOwner[],
  distM: number,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    // One value per INSTANCE rather than per vertex — `instanceId` is what the
    // shader indexes these by, for free. The offset stays in world space here;
    // the shader undoes `instanceMatrix`'s linear part, because that matrix
    // carries each plate's non-uniform scale and would otherwise squash the
    // travel. See scene/explodeShader.ts.
    const offsets = new Float32Array(matrices.length * 3);
    const delays = new Float32Array(matrices.length);
    owners.forEach((o, i) => {
      offsets[i * 3] = o.normal[0] * distM;
      offsets[i * 3 + 1] = o.normal[1] * distM;
      offsets[i * 3 + 2] = o.normal[2] * distM;
      delays[i] = o.v;
    });
    mesh.geometry.setAttribute('aExplodeOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    mesh.geometry.setAttribute('aExplodeDelay', new THREE.InstancedBufferAttribute(delays, 1));
  }, [ref, matrices, owners, distM]);
}

/**
 * Give every material the bottom-up reveal, and give every caster a matching
 * depth material so the shadow map is cut at the same height as the thing
 * casting it. A no-op unless `revealUniforms` is passed, so HeroScene and the
 * studio compile exactly the shaders they always did.
 */
function useReveal(revealUniforms?: RevealUniforms, explodeUniforms?: ExplodeUniforms) {
  const depth = useMemo(
    () => (revealUniforms ? makeRevealDepthMaterial(revealUniforms) : undefined),
    [revealUniforms],
  );
  useEffect(() => () => depth?.dispose(), [depth]);

  return useCallback(
    (mesh: THREE.Mesh | THREE.InstancedMesh | null) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.Material;
      if (revealUniforms) {
        applyReveal(mat, revealUniforms);
        mesh.customDepthMaterial = depth;
      }
      // AFTER the reveal, and it must be: `applyReveal` ASSIGNS
      // `onBeforeCompile`, `applyExplode` CHAINS onto it. Reversing these two
      // lines silently deletes the explode and nothing errors.
      //
      // The depth material deliberately does NOT get the explode. It carries
      // the reveal's cut so the shadow map matches the structure mid-sweep, and
      // the reveal and the explode never run at once (the explode is gated
      // until the dissolve is done). An exploded shadow is a problem for the
      // day someone wants both, not today.
      if (explodeUniforms) applyExplode(mat, explodeUniforms);
    },
    [revealUniforms, explodeUniforms, depth],
  );
}

export function Folly({
  revealUniforms,
  explodeUniforms,
  onSelectPiece,
}: {
  revealUniforms?: RevealUniforms;
  explodeUniforms?: ExplodeUniforms;
  /**
   * Index into `geometry.pieces` for the piece a click landed on, or null for a
   * click that hit nothing. OPTIONAL, and the gate that keeps `#/studio` exactly
   * as it was: R3F only raycasts objects that actually carry a handler, so
   * without this prop these meshes are not interactive at all.
   */
  onSelectPiece?: (pieceIndex: number | null) => void;
} = {}) {
  const geometry = useDesign((s) => s.outputs.geometry);
  const system = geometry.params.jointSystem;
  const lamellaSystem = system === 'lamella';

  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const cylsRef = useRef<THREE.InstancedMesh>(null);
  const reveal = useReveal(revealUniforms, explodeUniforms);

  // Timber split by STOCK, matching the BOM: planed C24 off the docking saw
  // vs LVL off the CNC sheets. Each member is its plane-clipped solid.
  const { c24Geo, lvlGeo, c24Count, lvlCount } = useMemo(() => {
    const c24: Vec3[][] = [];
    const lvl: Vec3[][] = [];
    // Parallel to the prisms: each member's own outward normal times the travel
    // distance, and its own `v`. The engine already computed both.
    const c24Ex = { offsets: [] as Vec3[], delays: [] as number[], pieceIndex: [] as number[] };
    const lvlEx = { offsets: [] as Vec3[], delays: [] as number[], pieceIndex: [] as number[] };
    const distM = explodeDistanceM(geometry.planB);
    // A prism is a MEMBER; the cut list is PIECES, and one piece can be several
    // members. This is the join, resolved once here rather than per click.
    const pieceIndexById = new Map(geometry.pieces.map((p, i) => [p.id, i]));
    for (const m of geometry.members) {
      const { widthM, depthM } = sectionFor(m.type, system);
      const isLinear = !lamellaSystem && (m.type === 'lattice' || m.type === 'foot');
      (isLinear ? c24 : lvl).push(memberPrism(m, widthM, depthM));
      const ex = isLinear ? c24Ex : lvlEx;
      ex.offsets.push([m.normal[0] * distM, m.normal[1] * distM, m.normal[2] * distM]);
      ex.delays.push(m.v);
      ex.pieceIndex.push(pieceIndexById.get(m.pieceId) ?? -1);
    }
    return {
      c24Geo: prismsToGeometry(c24, c24Ex),
      lvlGeo: prismsToGeometry(lvl, lvlEx),
      c24Count: c24.length,
      lvlCount: lvl.length,
    };
  }, [geometry.members, geometry.pieces, geometry.planB, system, lamellaSystem]);

  /**
   * Which piece a click hit. The geometry is NON-INDEXED (the merge writes three
   * fresh vertices per triangle for flat shading), so the first vertex of face
   * `f` is at `f * 3` and `aPieceIndex` is constant across the prism anyway.
   */
  const pick = useCallback(
    (e: { faceIndex?: number | null; object: THREE.Object3D; stopPropagation: () => void }) => {
      if (!onSelectPiece || e.faceIndex == null) return;
      e.stopPropagation();
      const attr = (e.object as THREE.Mesh).geometry.getAttribute('aPieceIndex');
      if (!attr) return;
      const idx = attr.getX(e.faceIndex * 3);
      onSelectPiece(idx >= 0 ? idx : null);
    },
    [onSelectPiece],
  );
  useEffect(
    () => () => {
      c24Geo.dispose();
      lvlGeo.dispose();
    },
    [c24Geo, lvlGeo],
  );

  // The steel of the joints (connectors.ts) — plates + cylinders.
  const steel = useMemo(() => buildSteel(geometry), [geometry]);

  const steelDistM = explodeDistanceM(geometry.planB);
  useInstanceMatrices(boxesRef, steel.boxes, steel.boxOwners, steelDistM);
  useInstanceMatrices(cylsRef, steel.cylinders, steel.cylOwners, steelDistM);

  // The steel already owns its refs for the instance matrices, so it takes the
  // reveal here rather than through a ref callback. Keyed on the counts because
  // the instanced meshes remount when those change (see their `key`).
  useLayoutEffect(() => {
    reveal(boxesRef.current);
    reveal(cylsRef.current);
  }, [reveal, steel.boxes.length, steel.cylinders.length]);

  return (
    <>
      {c24Count > 0 && (
        <mesh
          geometry={c24Geo}
          castShadow
          receiveShadow
          ref={reveal}
          {...(onSelectPiece ? { onClick: pick } : {})}
        >
          {/* Planed C24 spruce/larch, UC3 treated. */}
          <meshStandardMaterial color="#9c8466" roughness={0.8} metalness={0} />
        </mesh>
      )}

      {lvlCount > 0 && (
        <mesh
          geometry={lvlGeo}
          castShadow
          receiveShadow
          ref={reveal}
          {...(onSelectPiece ? { onClick: pick } : {})}
        >
          {/* Spruce LVL, CNC-profiled — paler than the sawn stock. */}
          <meshStandardMaterial color="#c2ab84" roughness={0.75} metalness={0} />
        </mesh>
      )}

      {steel.boxes.length > 0 && (
        <instancedMesh
          key={`steel-boxes-${steel.boxes.length}`}
          ref={boxesRef}
          args={[undefined, undefined, steel.boxes.length]}
          castShadow
        >
          {/* Fins, clamp plates, base plates, fish plates — S355 HDG. */}
          <boxGeometry args={[1, 1, 1]} />
          {/* Crisper than the old 0.62/0.45: with something in the environment
              to reflect, a lower roughness and higher metalness turn the hubs
              from flat grey discs into galvanized zinc that catches the light
              as the turntable brings it round. Without an env map this trade
              is a downgrade, so the two changes ship together. */}
          <meshStandardMaterial color="#aab0b4" roughness={0.5} metalness={0.58} />
        </instancedMesh>
      )}

      {steel.cylinders.length > 0 && (
        <instancedMesh
          key={`steel-cyls-${steel.cylinders.length}`}
          ref={cylsRef}
          args={[undefined, undefined, steel.cylinders.length]}
          castShadow
        >
          {/* Core drums + bolts (unit Ø1 × h1, scaled per instance). */}
          <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
          {/* Crisper than the old 0.62/0.45: with something in the environment
              to reflect, a lower roughness and higher metalness turn the hubs
              from flat grey discs into galvanized zinc that catches the light
              as the turntable brings it round. Without an env map this trade
              is a downgrade, so the two changes ship together. */}
          <meshStandardMaterial color="#aab0b4" roughness={0.5} metalness={0.58} />
        </instancedMesh>
      )}
    </>
  );
}
