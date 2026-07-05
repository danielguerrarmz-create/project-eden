/**
 * StrutHeatmap.tsx — visualises the STAR output: the strut-density field.
 *
 * Each cell of engine strutField is drawn as a node on the lattice surface,
 * dark and near-invisible where support is sparse, glowing to the one accent
 * olive where it is dense. Switch the species and this whole field visibly
 * re-weights, the on-camera proof that the engine is doing ecological work a
 * catalogue can't (mvp-spec success bar).
 *
 * This is an OVERLAY on the dry structure, not the structure itself: it depicts
 * the planting-support pattern the sacrificial armature should present.
 */
import { useDesign } from '../../state/store';
import { heatColor } from '../util';

export function StrutHeatmap() {
  const cells = useDesign((s) => s.outputs.strutField.cells);

  return (
    <group>
      {cells.map((cell, i) => {
        const c = heatColor(cell.density01);
        const r = 0.05 + 0.11 * cell.density01;
        // Nudge nodes slightly outward from the centre so they sit on the skin.
        const [x, y, z] = cell.position;
        const outward = 1.04;
        return (
          <mesh key={i} position={[x * outward, y, z * outward]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial color={c} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
