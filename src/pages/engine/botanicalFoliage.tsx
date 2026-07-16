/**
 * botanicalFoliage.tsx — shared placement of the procedural botanical generator's
 * foliage onto the growth-phase diagrams (D2 splash strip + D4 engine phases).
 *
 * The generator (`src/engine/botanical/`) is the single source of the forms; this
 * module only PLACES its leaf/flower sprites onto a diagram's own deterministic
 * scatter points. Foliage renders in `INK_BLUE` (the approved botanical colour);
 * the diagram's structural linework keeps its own ink. Nothing here is random:
 * the sprite palette is generated once from fixed seeds, and each scatter index
 * picks a palette member + a deterministic rotation, so the look is stable.
 */
import { leafSprite, flowerSprite, INK_BLUE, type PlantSprite } from '../../engine/botanical';

/** Eight fixed leaf variants (the procedural analogue of the old LEAF_VARIANTS).
 *  Veins are dropped at this size: the midrib alone reads cleanly, extra veins
 *  just muddy a ~4px blade. Slightly larger + wider so each blade is legible. */
const LEAF_SPRITES: readonly PlantSprite[] = [
  leafSprite('foliage-leaf-0', { profile: 'lanceolate', veins: 0, length: 4.4, halfWidth: 1.35 }),
  leafSprite('foliage-leaf-1', { profile: 'ovate', veins: 0, length: 4.0, halfWidth: 1.7 }),
  leafSprite('foliage-leaf-2', { profile: 'lanceolate', veins: 0, length: 4.7, halfWidth: 1.2 }),
  leafSprite('foliage-leaf-3', { profile: 'ovate', veins: 0, length: 3.9, halfWidth: 1.75 }),
  leafSprite('foliage-leaf-4', { profile: 'lanceolate', veins: 0, length: 4.3, halfWidth: 1.4 }),
  leafSprite('foliage-leaf-5', { profile: 'ovate', veins: 0, length: 4.1, halfWidth: 1.6 }),
  leafSprite('foliage-leaf-6', { profile: 'obovate', veins: 0, length: 4.2, halfWidth: 1.55 }),
  leafSprite('foliage-leaf-7', { profile: 'lanceolate', veins: 0, length: 4.6, halfWidth: 1.25 }),
];

/** One fixed flower head for the crown accent. */
const CROWN_FLOWER: PlantSprite = flowerSprite('foliage-crown-0', {
  petals: 5,
  length: 3,
  width: 1.5,
  profile: 'obovate',
  open: 0.9,
});

/** Deterministic small rotation jitter (deg) per scatter index — organic, no noise. */
const jitterRotation = (i: number): number => ((i * 37) % 31) - 15;

const center = (s: PlantSprite): [number, number] => [
  (s.bbox.minX + s.bbox.maxX) / 2,
  (s.bbox.minY + s.bbox.maxY) / 2,
];

function SpritePaths({ sprite, ink }: { sprite: PlantSprite; ink: string }) {
  return (
    <>
      {sprite.paths.map((p, j) => (
        <path
          key={j}
          d={p.d}
          stroke={ink}
          strokeWidth={p.strokeWidth}
          fill={p.fill === 'none' ? 'none' : ink}
          fillOpacity={p.fillOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

/**
 * Place generated leaves at `dots`, each centered on its scatter point and
 * oriented to radiate outward from `origin` (the canopy base center) plus a
 * deterministic tilt — so foliage fans over the dome instead of piling parallel
 * at the crown. `sizeScale` ramps with the panel's leaf density.
 */
export function FoliageLeaves({
  dots,
  origin,
  sizeScale,
  ink = INK_BLUE,
}: {
  dots: readonly { x: number; y: number }[];
  origin: { x: number; y: number };
  sizeScale: number;
  ink?: string;
}) {
  return (
    <>
      {dots.map((d, i) => {
        const sprite = LEAF_SPRITES[i % LEAF_SPRITES.length];
        const [bcx, bcy] = center(sprite);
        // Outward direction from the base center (up (0,-1) maps via rotate(R)).
        let ox = d.x - origin.x;
        let oy = d.y - origin.y;
        const ol = Math.hypot(ox, oy) || 1;
        ox /= ol;
        oy /= ol;
        // De-stack: the scatter over-samples the small-radius apex, so leaves pile
        // there. Nudge each leaf TANGENTIALLY (along the silhouette) by a
        // deterministic amount, spreading the crown without leaving the dome.
        const spread = (((i * 0.6180339887 + 0.5) % 1) - 0.5) * 6 * sizeScale;
        const px = -oy * spread;
        const py = ox * spread;
        const dx = d.x + px;
        const dy = d.y + py;
        const rot = (Math.atan2(ox, -oy) * 180) / Math.PI + jitterRotation(i);
        return (
          <g
            key={i}
            transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sizeScale.toFixed(3)}) translate(${(-bcx).toFixed(2)} ${(-bcy).toFixed(2)})`}
          >
            <SpritePaths sprite={sprite} ink={ink} />
          </g>
        );
      })}
    </>
  );
}

/** One generated flower head centered at (cx, cy). Panel-3 / year-3 crown accent. */
export function CrownFlower({
  cx,
  cy,
  sizeScale = 1,
  ink = INK_BLUE,
}: {
  cx: number;
  cy: number;
  sizeScale?: number;
  ink?: string;
}) {
  const [bcx, bcy] = center(CROWN_FLOWER);
  return (
    <g
      transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${sizeScale.toFixed(3)}) translate(${(-bcx).toFixed(2)} ${(-bcy).toFixed(2)})`}
    >
      <SpritePaths sprite={CROWN_FLOWER} ink={ink} />
    </g>
  );
}
