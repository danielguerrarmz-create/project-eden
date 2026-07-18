/**
 * PlantGrowth.tsx — the living layer, in the draw flow, botanically per species.
 *
 * The round-2 growth overlay clothed the lattice in one icosahedron blob per
 * strut-field cell. This keeps everything that was right about it — placement
 * follows the strut density and normal, size eases toward the year's coverage,
 * staggered per-cell thresholds give a natural fill, idle sway reads alive — and
 * changes only WHAT gets placed at each cell, driven by the selected species'
 * habit (`speciesVisual.ts`): a fine flowering net for clematis, a spiralled
 * twiner with hanging racemes for wisteria, arched canes with sparse blooms for
 * the rose, a dense flat mat for ivy (round-3 brief item 2).
 *
 * STAYS INSTANCED, STAYS CHEAP. Two instanced pools — one stem primitive, one
 * flower primitive — replace the round-2 per-leaf meshes, so the draw call count
 * drops even as the read gets richer. The frame loop writes instance matrices,
 * never React state, so the growth animation never re-renders the tree (the same
 * ref-not-state rule BakeReveal/ExplodeReveal hold).
 *
 * The timing math lives in `growthTiming.ts` (pure, tested); this file is that
 * math plus three.js placement. Mounted bake-only and hidden while exploded or
 * dissolving (DrawPage), because foliage anchored to the pre-explode strut field
 * would hang in space over scattered pieces.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesign } from '../../state/store';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { visualFor, type PetalForm, type StemForm } from './speciesVisual';
import { toonGradient } from '../../scene/npr/toonGradient';
import {
  cellFlowers,
  cellJitter,
  easeCoverage,
  leafProgress,
  leafThreshold,
} from './growthTiming';

const UP = new THREE.Vector3(0, 1, 0);
const STEM_COLOR = new THREE.Color('#4a5b34'); // deep foliage stem/leaf green

/** A small stem primitive, main axis +Y, rooted at the origin. */
function makeStemGeometry(form: StemForm): THREE.BufferGeometry {
  switch (form) {
    case 'spiral': {
      // A short helical wrap: the twining read (wisteria/jasmine/honeysuckle).
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const a = t * Math.PI * 4;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.03, t * 0.17, Math.sin(a) * 0.03));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.011, 5, false);
    }
    case 'arch': {
      // An arched cane bowing off the surface: the scrambler read (the rose).
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.09, 0, 0),
        new THREE.Vector3(0, 0.16, 0),
        new THREE.Vector3(0.09, 0, 0),
      );
      return new THREE.TubeGeometry(curve, 16, 0.02, 6, false);
    }
    case 'mat': {
      // A dense flat leaf mat lying tangent to the skin: the clinging read (ivy).
      const g = new THREE.IcosahedronGeometry(0.13, 0);
      g.scale(1, 0.4, 1);
      g.translate(0, 0.02, 0);
      return g;
    }
    case 'net':
    default:
      // A fine thin stem tick: many of them read as the tendril net (clematis,
      // sweet pea).
      return new THREE.BoxGeometry(0.016, 0.15, 0.016).translate(0, 0.075, 0);
  }
}

/** A small flower primitive at the stem tip, or null where the plant barely flowers. */
function makeFlowerGeometry(form: PetalForm): THREE.BufferGeometry | null {
  switch (form) {
    case 'star': {
      // A five-point star, thin-extruded, facing outward: clematis/jasmine.
      const shape = new THREE.Shape();
      const outer = 0.055;
      const inner = 0.022;
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
      const g = new THREE.ConeGeometry(0.045, 0.17, 6);
      g.translate(0, -0.085, 0); // hang down from its anchor
      return g;
    }
    case 'bloom': {
      // A rounded bloom: rose / honeysuckle cluster / sweet pea.
      return new THREE.DodecahedronGeometry(0.052, 0);
    }
    case 'none':
    default:
      return null;
  }
}

interface Placed {
  pos: THREE.Vector3;
  /** Stem-tip anchor for a flower, precomputed so the frame loop allocates nothing. */
  tip: THREE.Vector3;
  quat: THREE.Quaternion;
  maxSize: number;
  threshold: number;
  phase: number;
}

export function PlantGrowth() {
  const cells = useDesign((s) => s.outputs.strutField.cells);
  const coverage = useDesign((s) => s.outputs.growth.coverageFraction);
  const speciesId = useDesign((s) => s.params.speciesId);
  const reducedMotion = useReducedMotion();

  const visual = visualFor(speciesId);
  const petalColor = useMemo(() => new THREE.Color(visual.petalColor), [visual.petalColor]);

  const stemGeo = useMemo(() => makeStemGeometry(visual.stemForm), [visual.stemForm]);
  const flowerGeo = useMemo(() => makeFlowerGeometry(visual.petalForm), [visual.petalForm]);
  useEffect(() => () => stemGeo.dispose(), [stemGeo]);
  useEffect(() => () => flowerGeo?.dispose(), [flowerGeo]);

  // Placement + orientation per cell, solved once (like the round-2 overlay).
  const placed = useMemo<Placed[]>(
    () =>
      cells.map((cell, i) => {
        const jitter = cellJitter(i);
        const local = 0.4 + 0.6 * cell.density01;
        const maxSize = local * (0.7 + 0.5 * jitter);
        const p = new THREE.Vector3(...cell.position);
        const n = new THREE.Vector3(...cell.normal);
        p.addScaledVector(n, 0.02); // root on the skin
        const quat = new THREE.Quaternion().setFromUnitVectors(UP, n);
        const tip = p.clone().addScaledVector(n, 0.14 * maxSize);
        return {
          pos: p,
          tip,
          quat,
          maxSize,
          threshold: leafThreshold(cell.density01, jitter),
          phase: i * 1.7,
        };
      }),
    [cells],
  );

  // Which cells carry a flower — the flower pool indexes into these.
  const flowerCells = useMemo(
    () => placed.filter((_, i) => cellFlowers(i, visual.flowerDensity01)),
    [placed, visual.flowerDensity01],
  );

  const stemRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const cover = useRef(0);
  const scratchM = useMemo(() => new THREE.Matrix4(), []);
  const scratchS = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    cover.current = reducedMotion
      ? coverage
      : easeCoverage(cover.current, coverage, dt);
    const cov = cover.current;
    const t = state.clock.elapsedTime;

    const stems = stemRef.current;
    if (stems) {
      for (let i = 0; i < placed.length; i++) {
        const c = placed[i];
        const prog = leafProgress(cov, c.threshold);
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
      for (let i = 0; i < flowerCells.length; i++) {
        const c = flowerCells[i];
        // Flowers arrive a touch after their stem and a touch smaller, so the
        // bloom reads as opening on established growth rather than with it.
        const prog = leafProgress(cov, c.threshold + 0.06);
        const sway = reducedMotion ? 1 : 1 + 0.05 * prog * Math.sin(t * 1.1 + c.phase);
        const size = Math.max(0, prog * c.maxSize * 0.9 * sway);
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
          <meshToonMaterial color={STEM_COLOR} gradientMap={toonGradient} />
        </instancedMesh>
      )}
      {flowerGeo && flowerCells.length > 0 && (
        <instancedMesh
          key={`flowers-${flowerCells.length}-${visual.petalForm}`}
          ref={flowerRef}
          args={[flowerGeo, undefined, flowerCells.length]}
          castShadow
        >
          <meshToonMaterial color={petalColor} gradientMap={toonGradient} />
        </instancedMesh>
      )}
    </group>
  );
}
