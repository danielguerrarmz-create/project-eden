/**
 * PlantGrowth.tsx — the living layer, growing ALONG the real lattice.
 *
 * The round-3 overlay placed one primitive per (u,v) strut-field CELL on the
 * conceptual shell, pointing OUT along the cell normal — so each plant poked
 * away from the skin on a grid that mostly missed the timber, reading as
 * floating bits. This tiles vine stations along the ACTUAL members instead
 * (`plantPlacement.placeVines`): each station rides a strut's centreline in a
 * frame whose +Y climbs the member and +Z faces outward, so a spiral twines UP
 * the strut, an arched cane rides it, a mat lies flat on it. Stations grow in by
 * height up the canopy (`climbThreshold`), so the canopy visibly clothes from
 * eave to crown as the year's coverage rises. Foliage richness reads the
 * strut-density field at each member — where the engine put the most support,
 * the plant grows thickest.
 *
 * STAYS INSTANCED, STAYS CHEAP. Two instanced pools — one stem primitive, one
 * flower primitive. The frame loop writes instance matrices, never React state,
 * so the growth animation never re-renders the tree (the same ref-not-state rule
 * BakeReveal/ExplodeReveal hold).
 *
 * The timing math lives in `growthTiming.ts` (pure, tested) and placement in
 * `plantPlacement.ts` (pure, tested); this file is that math plus three.js.
 * Mounted bake-only and hidden while exploded or dissolving (DrawPage), because
 * foliage anchored to the pre-explode members would hang over scattered pieces.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesign } from '../../state/store';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { visualFor, type PetalForm, type StemForm } from './speciesVisual';
import { plantGradient } from '../../scene/npr/toonGradient';
import { cellFlowers, cellJitter, climbThreshold, easeCoverage, leafProgress } from './growthTiming';
import { placeVines, type VineOptions } from './plantPlacement';

// A clearer foliage green than the old near-black #4a5b34, which the wash read as
// tan; this stays above the shadow-shift band so stems paint green (live QA).
const STEM_COLOR = new THREE.Color('#6c7e48');

/**
 * A small stem/leaf primitive in the vine frame: +Y runs ALONG the member
 * (the climb axis), +Z faces outward off the timber.
 */
function makeStemGeometry(form: StemForm): THREE.BufferGeometry {
  switch (form) {
    case 'spiral': {
      // A helix winding around the climb axis: it twines UP the strut
      // (wisteria / jasmine / honeysuckle).
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const a = t * Math.PI * 4;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.03, (t - 0.5) * 0.18, Math.sin(a) * 0.03));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.011, 5, false);
    }
    case 'arch': {
      // A cane running along the member (+Y) and bowing outward (+Z): the
      // scrambler read (the rose).
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -0.09, 0),
        new THREE.Vector3(0, 0, 0.14),
        new THREE.Vector3(0, 0.09, 0),
      );
      return new THREE.TubeGeometry(curve, 14, 0.018, 6, false);
    }
    case 'mat': {
      // A flat leaf patch lying tangent to the timber (thin in +Z = outward):
      // the clinging read (ivy).
      const g = new THREE.IcosahedronGeometry(0.12, 0);
      g.scale(1, 1, 0.35);
      return g;
    }
    case 'net':
    default:
      // A fine stem tick centred on the member; many tile into a mesh
      // (clematis, sweet pea).
      return new THREE.BoxGeometry(0.016, 0.16, 0.016);
  }
}

/** A small flower primitive at the station, or null where the plant barely flowers. */
function makeFlowerGeometry(form: PetalForm): THREE.BufferGeometry | null {
  switch (form) {
    case 'star': {
      // A five-point star, thin-extruded, facing outward: clematis/jasmine.
      const shape = new THREE.Shape();
      const outer = 0.08;
      const inner = 0.032;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false });
      g.center();
      return g;
    }
    case 'raceme': {
      // A drooping cluster hanging below the tip: wisteria's signature.
      const g = new THREE.ConeGeometry(0.065, 0.22, 6);
      g.translate(0, -0.11, 0); // hang down from its anchor
      return g;
    }
    case 'bloom': {
      // A rounded bloom: rose / honeysuckle cluster / sweet pea.
      return new THREE.DodecahedronGeometry(0.075, 0);
    }
    case 'none':
    default:
      return null;
  }
}

/** Placement tuning per habit family: finer mesh -> denser tiling; scramblers
 *  stand their canes further off the timber; clingers hug it. */
function placementFor(form: StemForm): VineOptions {
  switch (form) {
    case 'spiral': // twining — close stations spiralling the strut
      return { segSpacingM: 0.18, maxPerMember: 6, standoffM: 0.035 };
    case 'arch': // scrambler — sparser canes, stood further off
      return { segSpacingM: 0.28, maxPerMember: 4, standoffM: 0.05 };
    case 'mat': // clinging — dense flat patches hugging the timber
      return { segSpacingM: 0.12, maxPerMember: 7, standoffM: 0.02 };
    case 'net':
    default: // tendril — the finest mesh of stations
      return { segSpacingM: 0.14, maxPerMember: 7, standoffM: 0.03 };
  }
}

interface Placed {
  pos: THREE.Vector3;
  /** Flower anchor, stood a touch further off the timber, precomputed so the
   *  frame loop allocates nothing. */
  tip: THREE.Vector3;
  quat: THREE.Quaternion;
  maxSize: number;
  threshold: number;
  phase: number;
}

export function PlantGrowth() {
  const cells = useDesign((s) => s.outputs.strutField.cells);
  const members = useDesign((s) => s.outputs.geometry.members);
  const coverage = useDesign((s) => s.outputs.growth.coverageFraction);
  const speciesId = useDesign((s) => s.params.speciesId);
  const reducedMotion = useReducedMotion();

  const visual = visualFor(speciesId);
  const petalColor = useMemo(() => new THREE.Color(visual.petalColor), [visual.petalColor]);

  const stemGeo = useMemo(() => makeStemGeometry(visual.stemForm), [visual.stemForm]);
  const flowerGeo = useMemo(() => makeFlowerGeometry(visual.petalForm), [visual.petalForm]);
  useEffect(() => () => stemGeo.dispose(), [stemGeo]);
  useEffect(() => () => flowerGeo?.dispose(), [flowerGeo]);

  const opts = useMemo<VineOptions>(() => placementFor(visual.stemForm), [visual.stemForm]);

  // Sample the strut-density field at any (u,v) by nearest cell (u wraps 0..1).
  const densityAt = useMemo(() => {
    return (u: number, v: number) => {
      let best = Infinity;
      let d = 0.5;
      for (const c of cells) {
        let du = Math.abs(c.u - u);
        if (du > 0.5) du = 1 - du;
        const dv = c.v - v;
        const dd = du * du + dv * dv;
        if (dd < best) {
          best = dd;
          d = c.density01;
        }
      }
      return d;
    };
  }, [cells]);

  // Vines tiled along the real members, solved once. Orientation is a per-station
  // basis (+Y climb axis, +Z outward), so the primitive runs along the timber.
  const placed = useMemo<Placed[]>(() => {
    const side = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const out = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    return placeVines(members, densityAt, opts).map((seg, i) => {
      const jitter = cellJitter(i);
      axis.set(seg.axis[0], seg.axis[1], seg.axis[2]);
      out.set(seg.out[0], seg.out[1], seg.out[2]);
      side.crossVectors(axis, out).normalize();
      const quat = new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(side, axis, out));
      const pos = new THREE.Vector3(seg.pos[0], seg.pos[1], seg.pos[2]);
      const maxSize = (0.6 + 0.5 * seg.density01) * (0.78 + 0.44 * jitter);
      const tip = pos.clone().addScaledVector(out, 0.05);
      return {
        pos,
        tip,
        quat,
        maxSize,
        threshold: climbThreshold(seg.climb01, jitter),
        phase: i * 1.7,
      };
    });
  }, [members, densityAt, opts]);

  // Which stations carry a flower — the flower pool indexes into these.
  const flowerPlaced = useMemo(
    () => placed.filter((_, i) => cellFlowers(i, visual.flowerDensity01)),
    [placed, visual.flowerDensity01],
  );

  const stemRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const cover = useRef(0);
  const scratchM = useMemo(() => new THREE.Matrix4(), []);
  const scratchS = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    cover.current = reducedMotion ? coverage : easeCoverage(cover.current, coverage, dt);
    const cov = cover.current;
    const t = state.clock.elapsedTime;

    const stems = stemRef.current;
    if (stems) {
      for (let i = 0; i < placed.length; i++) {
        const c = placed[i];
        const prog = leafProgress(cov, c.threshold, 0.35);
        const sway = reducedMotion ? 1 : 1 + 0.04 * prog * Math.sin(t * 1.3 + c.phase);
        const size = Math.max(0, prog * c.maxSize * sway);
        scratchS.setScalar(size < 0.02 ? 0 : size);
        scratchM.compose(c.pos, c.quat, scratchS);
        stems.setMatrixAt(i, scratchM);
      }
      stems.instanceMatrix.needsUpdate = true;
    }

    const flowers = flowerRef.current;
    if (flowers) {
      for (let i = 0; i < flowerPlaced.length; i++) {
        const c = flowerPlaced[i];
        // Flowers arrive a touch after their stem and a touch larger, so the
        // bloom reads as opening on established growth rather than with it.
        const prog = leafProgress(cov, c.threshold + 0.06, 0.35);
        const sway = reducedMotion ? 1 : 1 + 0.05 * prog * Math.sin(t * 1.1 + c.phase);
        const size = Math.max(0, prog * c.maxSize * 1.15 * sway);
        scratchS.setScalar(size < 0.02 ? 0 : size);
        scratchM.compose(c.tip, c.quat, scratchS);
        flowers.setMatrixAt(i, scratchM);
      }
      flowers.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {placed.length > 0 && (
        <instancedMesh
          key={`stems-${placed.length}-${visual.stemForm}`}
          ref={stemRef}
          args={[stemGeo, undefined, placed.length]}
          castShadow
        >
          <meshToonMaterial color={STEM_COLOR} gradientMap={plantGradient} />
        </instancedMesh>
      )}
      {flowerGeo && flowerPlaced.length > 0 && (
        <instancedMesh
          key={`flowers-${flowerPlaced.length}-${visual.petalForm}`}
          ref={flowerRef}
          args={[flowerGeo, undefined, flowerPlaced.length]}
          castShadow
        >
          <meshToonMaterial color={petalColor} gradientMap={plantGradient} />
        </instancedMesh>
      )}
    </group>
  );
}
