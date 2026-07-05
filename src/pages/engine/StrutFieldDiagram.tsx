/**
 * StrutFieldDiagram.tsx — D3, the thesis. Four small multiples, one per climbing
 * habit, each computed by calling the REAL computeStrutField() with that species
 * against the SAME geometry and sun path, so only the species varies. The grid of
 * StrutCells renders as habit-oriented glyphs (close verticals, fine mesh, wide
 * rails, near-solid skin) with weight + opacity from each cell's live density01.
 */
import { computeStrutField } from '../../engine/strutOptimizer';
import { getSpecies } from '../../engine/species';
import type { EngineOutputs, StrutCell } from '../../engine/types';
import { AccentMark, DiagramSvg, useInk } from './hairline';

// One representative species per habit (the catalogue has one scrambler + one clinger).
const HABIT_SPECIES = ['lonicera', 'clematis', 'rosa-newdawn', 'hedera'];

function CellGlyph({ cell, x, y, ink }: { cell: StrutCell; x: number; y: number; ink: string }) {
  const w = 0.4 + cell.density01 * 0.7;
  const o = 0.28 + cell.density01 * 0.72;
  if (cell.orientation === 'vertical') {
    return <line x1={x} y1={y - 2.3} x2={x} y2={y + 2.3} stroke={ink} strokeWidth={w} opacity={o} />;
  }
  if (cell.orientation === 'horizontal') {
    return <line x1={x - 2.6} y1={y} x2={x + 2.6} y2={y} stroke={ink} strokeWidth={w} opacity={o} />;
  }
  // mesh (tendril + clinging): a fine two-way cross
  return (
    <g stroke={ink} strokeWidth={w} opacity={o}>
      <line x1={x} y1={y - 1.9} x2={x} y2={y + 1.9} />
      <line x1={x - 1.9} y1={y} x2={x + 1.9} y2={y} />
    </g>
  );
}

function Panel({ outputs, speciesId }: { outputs: EngineOutputs; speciesId: string }) {
  const ink = useInk();
  const species = getSpecies(speciesId);
  const field = computeStrutField(outputs.geometry.params, species, outputs.sunPath);

  const x0 = 8;
  const x1 = 52;
  const y0 = 8;
  const y1 = 76;
  const xFor = (u: number) => x0 + u * (x1 - x0);
  const yFor = (v: number) => y1 - v * (y1 - y0); // v=0 ground (bottom), v=1 apex (top)

  const densest = field.cells.reduce((a, b) => (b.density01 > a.density01 ? b : a), field.cells[0]);

  return (
    <DiagramSvg viewBox="0 0 60 84" label={`Support pattern for ${species.common}`}>
      <rect x={x0 - 3} y={y0 - 3} width={x1 - x0 + 6} height={y1 - y0 + 6} fill="none" stroke={ink} strokeWidth={0.5} opacity={0.5} />
      {field.cells.map((c, i) => (
        <CellGlyph key={i} cell={c} x={xFor(c.u)} y={yFor(c.v)} ink={ink} />
      ))}
      <AccentMark cx={xFor(densest.u)} cy={yFor(densest.v)} r={1.7} />
    </DiagramSvg>
  );
}

export function StrutFieldDiagram({ outputs }: { outputs: EngineOutputs }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {HABIT_SPECIES.map((id) => {
        const species = getSpecies(id);
        const field = computeStrutField(outputs.geometry.params, species, outputs.sunPath);
        return (
          <figure key={id} className="flex flex-col">
            <div className="aspect-[3/4]">
              <Panel outputs={outputs} speciesId={id} />
            </div>
            <figcaption className="mt-3 font-mono text-[10px] uppercase leading-snug tracking-[0.08em] opacity-85">
              {field.habitStrategy}
            </figcaption>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] opacity-60">
              recommended spacing {field.recommendedSpacingM.toFixed(2)}m
            </p>
          </figure>
        );
      })}
    </div>
  );
}
