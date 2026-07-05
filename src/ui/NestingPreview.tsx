/**
 * NestingPreview.tsx — components laid out on CNC sheets (demo-spec §2.5).
 *
 * The credibility kicker on the spec sheet: the actual cut blanks of THIS
 * design, shelf-nested onto 2.4 × 1.2 m sheet stock, drawn to scale as SVG.
 * Rectangles-on-sheets photographs like the real pipeline because it is the
 * real pipeline, one abstraction earlier.
 */
import { useDesign } from '../state/store';
import type { Member } from '../engine/types';

const PART_FILL: Record<Member['type'], string> = {
  lattice: '#b39a77',
  eave: '#8a7355',
  foot: '#5b4632',
};

const MAX_SHEETS_SHOWN = 6;

export function NestingPreview() {
  const nesting = useDesign((s) => s.outputs.nesting);
  const shown = nesting.sheets.slice(0, MAX_SHEETS_SHOWN);
  const hidden = nesting.sheets.length - shown.length;

  // Draw in cm so the numbers stay friendly.
  const W = nesting.sheetLengthM * 100;
  const H = nesting.sheetWidthM * 100;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((sheet, i) => (
          <figure key={i}>
            <svg
              viewBox={`-1 -1 ${W + 2} ${H + 2}`}
              className="w-full rounded-md border border-line bg-paperDeep/60"
              role="img"
              aria-label={`CNC sheet ${i + 1}: ${sheet.parts.length} parts`}
            >
              <rect x={0} y={0} width={W} height={H} fill="#f1ede2" stroke="#c9c2b2" strokeWidth={0.8} />
              {sheet.parts.map((p, j) => (
                <rect
                  key={j}
                  x={p.x * 100}
                  y={p.y * 100}
                  width={p.lengthM * 100}
                  height={p.widthM * 100}
                  rx={0.8}
                  fill={PART_FILL[p.type]}
                  stroke="#f6f4ee"
                  strokeWidth={0.35}
                />
              ))}
            </svg>
            <figcaption className="mt-1 text-[10px] text-inkFaint">
              sheet {i + 1} of {nesting.sheets.length} · {sheet.parts.length} parts ·{' '}
              {Math.round(sheet.utilisation * 100)}% used
            </figcaption>
          </figure>
        ))}
      </div>
      {hidden > 0 && (
        <p className="mt-2 text-[11px] text-inkFaint">+ {hidden} more sheets, same stock</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-inkFaint">
        <LegendSwatch color={PART_FILL.lattice} label="lattice struts" />
        <LegendSwatch color={PART_FILL.eave} label="eave + crown blanks" />
        <LegendSwatch color={PART_FILL.foot} label="foot sweeps" />
        <span>
          stock: {nesting.sheetLengthM} × {nesting.sheetWidthM} m CNC sheet
        </span>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px]" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}
