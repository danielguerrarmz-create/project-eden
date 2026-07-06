/**
 * NestingPreview.tsx — the kit's stock plan, drawn (demo-spec §2.5).
 *
 * The credibility kicker on the spec sheet: the actual CURVED pieces of THIS
 * design (lamellas, eave + crown blanks) shelf-nested onto 2.4 × 1.2 m LVL
 * sheet stock, drawn to scale as SVG — plus the linear-stock line for the
 * docking-saw pieces (hub struts), which honestly do NOT come from
 * sheets. Rectangles-on-sheets photographs like the real pipeline because it
 * is the real pipeline, one abstraction earlier.
 */
import { STOCK } from '../data/config';
import { useDesign } from '../state/store';
import type { Piece } from '../engine/types';

const PART_FILL: Record<Piece['kind'], string> = {
  strut: '#b39a77', // (linear stock — only ever nested if data goes wrong)
  lamella: '#a98e68',
  eaveBlank: '#8a7355',
  crownBlank: '#75603f',
};

const MAX_SHEETS_SHOWN = 6;

export function NestingPreview() {
  const nesting = useDesign((s) => s.outputs.nesting);
  const shown = nesting.sheets.slice(0, MAX_SHEETS_SHOWN);
  const hidden = nesting.sheets.length - shown.length;
  const { stockPlan } = nesting;

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
                  fill={PART_FILL[p.kind]}
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
      {stockPlan.pieceCount > 0 && (
        <p className="mt-2 text-[11px] text-inkSoft">
          + linear stock: {stockPlan.pieceCount} docking-saw pieces from{' '}
          <span className="font-medium">
            {stockPlan.lengthsNeeded}× {stockPlan.stockLengthM} m
          </span>{' '}
          lengths of {STOCK.strut.widthMm}×{STOCK.strut.depthMm} {STOCK.strut.grade} (
          {Math.round(stockPlan.utilisation * 100)}% into pieces, offcuts counted)
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-inkFaint">
        <LegendSwatch color={PART_FILL.lamella} label="lamellas" />
        <LegendSwatch color={PART_FILL.eaveBlank} label="eave blanks" />
        <LegendSwatch color={PART_FILL.crownBlank} label="crown blanks" />
        <span>
          sheet stock: {nesting.sheetLengthM} × {nesting.sheetWidthM} m · {STOCK.blank.thicknessMm} mm LVL
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
