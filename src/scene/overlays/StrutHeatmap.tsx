/**
 * StrutHeatmap.tsx — visualises the STAR output: the strut-density field.
 *
 * Each cell of engine strutField is drawn as a coloured node on the lattice
 * surface (green = sparse support, red = dense). Switch the species and this
 * whole field visibly recolours + re-weights — the on-camera proof that the
 * engine is doing ecological work a catalogue can't (mvp-spec success bar).
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
        // Small nodes so the timber stays legible; taper toward the crown where
        // the (u,v) cells converge, or they'd pile into a pom-pom up top.
        const r = (0.028 + 0.055 * cell.density01) * (0.45 + 0.55 * (1 - cell.v));
        // Sit on the skin: step out along the surface normal by the node's own
        // radius, so a cell touches the face it marks wherever it is on the
        // shell — crown, flank or eave.
        const [x, y, z] = cell.position;
        const [nx, ny, nz] = cell.normal;
        return (
          <mesh key={i} position={[x + nx * r, y + ny * r, z + nz * r]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}
