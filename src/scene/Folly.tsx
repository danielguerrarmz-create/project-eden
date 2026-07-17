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

// Two-tone steel by ROLE (connectors.ts tags each cylinder). Structural keeps
// the bright galvanized tone already tuned by the 2026-07-17 visual pass;
// fasteners go dark so a bolt reads as recessed against the plate it holds, the
// single cheapest move that turns "a cluster of grey boxes" into "a plate with
// bolts in it". Driven through instanceColor on ONE mesh — see the cylinder
// material's `vertexColors` + white `color` buffer, which this three version
// REQUIRES for instanceColor to reach the fragment (USE_COLOR gates it).
const STEEL_STRUCTURAL = new THREE.Color('#aab0b4');
const STEEL_FASTENER = new THREE.Color('#3a382f');

/**
 * Merge clipped member prisms into one flat-shaded BufferGeometry, with an
 * EASED ARRIS: the 4 long running edges are chamfered so the box section reads
 * as an octagon, the way a timber shop breaks the sharp corners on planed stock.
 * The two end-cap (cut) faces are NOT chamfered — those are the honest joint the
 * saw makes, and softening them would blur the "what you see IS the cut" claim.
 *
 * `chamferM` is a render bevel, not a stock dimension: it moves no BOM line. It
 * is applied purely tangentially inside each cut plane, so each cap stays planar
 * and flush on its plane — the octagon is the rectangle with its 4 corners
 * clipped, not a new bevelled surface between cap and side.
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
  chamferM: number,
  explode?: { offsets: Vec3[]; delays: number[]; pieceIndex: number[] },
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const offsets: number[] = [];
  const delays: number[] = [];
  const pieceIdx: number[] = [];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a: Vec3): Vec3 => {
    const l = len(a) || 1e-9;
    return [a[0] / l, a[1] / l, a[2] / l];
  };

  // Faces over the 16 chamfered vertices (start octagon 0..7, end octagon 8..15).
  // The 8 side quads alternate a shortened original face and a new chamfer facet.
  const SIDES: number[][] = [];
  for (let j = 0; j < 8; j++) SIDES.push([j, (j + 1) % 8, ((j + 1) % 8) + 8, j + 8]);
  const CAP_START = [0, 1, 2, 3, 4, 5, 6, 7];
  const CAP_END = [8, 9, 10, 11, 12, 13, 14, 15];

  for (const [pi, v] of prisms.entries()) {
    const off = explode?.offsets[pi] ?? ([0, 0, 0] as Vec3);
    const delay = explode?.delays[pi] ?? 0;
    const piece = explode?.pieceIndex[pi] ?? -1;

    // Build the chamfered corners. For each of the 4 rectangle corners on a
    // cap, split it into two points offset along the two incident section edges
    // by the chamfer, clamped under half the shorter edge so it can never fold.
    const cv: Vec3[] = [];
    for (const base of [0, 4]) {
      for (let k = 0; k < 4; k++) {
        const ck = v[base + k];
        const next = v[base + ((k + 1) % 4)];
        const prev = v[base + ((k + 3) % 4)];
        const cNext = Math.min(chamferM, 0.45 * len(sub(next, ck)));
        const cPrev = Math.min(chamferM, 0.45 * len(sub(prev, ck)));
        cv.push(add(ck, scale(norm(sub(prev, ck)), cPrev))); // toward prev
        cv.push(add(ck, scale(norm(sub(next, ck)), cNext))); // toward next
      }
    }

    const centroid: [number, number, number] = [0, 0, 0];
    for (const p of cv) {
      centroid[0] += p[0] / cv.length;
      centroid[1] += p[1] / cv.length;
      centroid[2] += p[2] / cv.length;
    }

    // Fan-triangulate a planar convex face with a single outward normal.
    const emit = (idx: number[]) => {
      const fc: [number, number, number] = [0, 0, 0];
      for (const i of idx) {
        fc[0] += cv[i][0] / idx.length;
        fc[1] += cv[i][1] / idx.length;
        fc[2] += cv[i][2] / idx.length;
      }
      let n = cross(sub(cv[idx[1]], cv[idx[0]]), sub(cv[idx[2]], cv[idx[0]]));
      let order = idx;
      if (dot(n, sub(fc, centroid)) < 0) {
        n = [-n[0], -n[1], -n[2]];
        order = [...idx].reverse();
      }
      const un = norm(n);
      for (let t = 1; t < order.length - 1; t++) {
        for (const i of [order[0], order[t], order[t + 1]]) {
          positions.push(cv[i][0], cv[i][1], cv[i][2]);
          normals.push(un[0], un[1], un[2]);
          offsets.push(off[0], off[1], off[2]);
          delays.push(delay);
          pieceIdx.push(piece);
        }
      }
    };

    emit(CAP_START);
    emit(CAP_END);
    for (const s of SIDES) emit(s);
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

  // Eased-arris depth by stock, a render bevel (not a config.ts stock spec):
  // the sawn C24 struts/feet break a heavier arris than the CNC-profiled LVL.
  const CHAMFER_STRUT_M = 0.004; // C24 struts/feet, 45×70
  const CHAMFER_LVL_M = 0.003; // LVL blanks (180×45) and lamella (45×120)

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
      c24Geo: prismsToGeometry(c24, CHAMFER_STRUT_M, c24Ex),
      lvlGeo: prismsToGeometry(lvl, CHAMFER_LVL_M, lvlEx),
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

  // The cylinder pool's base geometry carries an all-white `color` buffer so the
  // material's `vertexColors` is valid (no `color` attribute would render the
  // steel black under USE_COLOR); the per-instance tone then comes from
  // instanceColor below, white × instanceColor = instanceColor.
  const cylGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    const n = g.attributes.position.count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    return g;
  }, []);
  useEffect(() => () => cylGeo.dispose(), [cylGeo]);

  // Tone each cylinder by its role. Keyed on the count with the matrices, since
  // the mesh remounts when the instance count changes.
  useLayoutEffect(() => {
    const mesh = cylsRef.current;
    if (!mesh) return;
    steel.cylRoles.forEach((role, i) => {
      mesh.setColorAt(i, role === 'fastener' ? STEEL_FASTENER : STEEL_STRUCTURAL);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [steel.cylRoles, steel.cylinders.length]);

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
          geometry={cylGeo}
          args={[undefined, undefined, steel.cylinders.length]}
          castShadow
        >
          {/* Core drums (structural) + bolts, nut caps, screw stubs (fasteners);
              unit Ø1 × h1, scaled per instance, toned per instance by role.
              `vertexColors` + the white base `color` buffer let instanceColor
              reach the fragment; the base color stays white so the instance tone
              is the whole answer (white × instanceColor = instanceColor).
              Roughness/metalness stay the 0.5/0.58 the visual pass tuned, shared
              across both tones — the colour contrast carries the read. */}
          <meshStandardMaterial color="#ffffff" vertexColors roughness={0.5} metalness={0.58} />
        </instancedMesh>
      )}
    </>
  );
}
